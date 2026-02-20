import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UAParser } from "ua-parser-js";
import {
  syncReviews, syncChats, sendReply, generateReply,
  validateApiKey, sendChatMessage, aiAssistant,
  createPayment, robokassaWebhook, fetchArchive,
} from "./functions";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";

export const router = Router();

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = value instanceof Date ? value.toISOString() : toSnakeCase(value);
    }
    return result;
  }
  return obj;
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[snakeToCamel(key)] = toCamelCase(value);
    }
    return result;
  }
  return obj;
}

function parseToken(authHeader: string | undefined): { userId: string; email: string | null } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (!payload.sub) return null;
    return { userId: payload.sub, email: payload.email || null };
  } catch {
    return null;
  }
}

const provisionedUsers = new Set<string>();
const provisioningInProgress = new Map<string, Promise<void>>();

async function ensureUserProvisioned(userId: string, email?: string | null): Promise<void> {
  if (provisionedUsers.has(userId)) {
    if (email) {
      storage.updateProfileEmail(userId, email).catch(() => {});
    }
    return;
  }

  const existing = provisioningInProgress.get(userId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const profile = await storage.getProfile(userId);
      const isNewUser = !profile;
      if (isNewUser) {
        await storage.upsertProfile({ id: userId, email: email || undefined });
        console.log(`[auto-provision] Created profile for user ${userId}`);
      } else if (email && !profile.email) {
        await storage.updateProfileEmail(userId, email);
      }

      const userSettings = await storage.getSettings(userId);
      if (!userSettings) {
        await storage.insertSettings({ userId });
        console.log(`[auto-provision] Created settings for user ${userId}`);
      }

      const cabinets = await storage.getCabinets(userId);
      if (!cabinets || cabinets.length === 0) {
        await storage.createCabinet({ userId, name: "Основной кабинет", isActive: true });
        console.log(`[auto-provision] Created default cabinet for user ${userId}`);
      }

      await storage.upsertAiRequestBalance(userId, await storage.getAiRequestBalance(userId));

      if (isNewUser) {
        const WELCOME_TOKENS = 50;
        await storage.upsertTokenBalance(userId, WELCOME_TOKENS);
        await storage.insertTokenTransaction({
          userId,
          amount: WELCOME_TOKENS,
          type: "welcome_bonus",
          description: "Приветственные токены",
        });
        console.log(`[auto-provision] Credited ${WELCOME_TOKENS} welcome tokens to user ${userId}`);
      } else {
        await storage.upsertTokenBalance(userId, await storage.getTokenBalance(userId));
      }

      provisionedUsers.add(userId);
    } catch (err) {
      console.error(`[auto-provision] Failed for user ${userId}:`, err);
    } finally {
      provisioningInProgress.delete(userId);
    }
  })();

  provisioningInProgress.set(userId, promise);
  return promise;
}

const lastSeenCache = new Map<string, number>();
const LAST_SEEN_THROTTLE = 5 * 60 * 1000;
const sessionCache = new Map<string, number>();
const SESSION_THROTTLE = 30 * 60 * 1000;

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const parsed = parseToken(req.headers.authorization);
  if (!parsed) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { userId, email } = parsed;
  console.log(`[auth] userId=${userId} path=${req.path}`);
  (req as any).userId = userId;
  (req as any).userEmail = email;

  const now = Date.now();
  const lastSeen = lastSeenCache.get(userId) || 0;
  if (now - lastSeen > LAST_SEEN_THROTTLE) {
    lastSeenCache.set(userId, now);
    storage.updateLastSeen(userId).catch(() => {});
  }

  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "";
  const sessionKey = `${userId}:${ip}:${ua}`;
  const lastSession = sessionCache.get(sessionKey) || 0;
  if (now - lastSession > SESSION_THROTTLE) {
    sessionCache.set(sessionKey, now);
    const parser = new UAParser(ua);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    storage.insertUserSession({
      userId,
      ipAddress: ip,
      userAgent: ua,
      browser: browser.name || null,
      browserVersion: browser.version || null,
      os: os.name || null,
      osVersion: os.version || null,
      device: device.model || null,
      deviceType: device.type || "desktop",
    }).catch((err) => console.error("[session-log]", err));
  }

  ensureUserProvisioned(userId, email).then(() => next()).catch((err) => {
    console.error("[auto-provision] Error:", err);
    next();
  });
}

router.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email и пароль обязательны" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
      return;
    }

    const existing = await storage.getAuthUserByEmail(email.toLowerCase().trim());
    if (existing) {
      res.status(409).json({ error: "Пользователь с таким email уже существует" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createAuthUser({
      email: email.toLowerCase().trim(),
      passwordHash,
      displayName: displayName || null,
    });

    await ensureUserProvisioned(user.id, user.email);

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (e: any) {
    console.error("[auth/register] Error:", e);
    res.status(500).json({ error: "Ошибка регистрации" });
  }
});

router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email и пароль обязательны" });
      return;
    }

    const user = await storage.getAuthUserByEmail(email.toLowerCase().trim());
    if (!user) {
      res.status(401).json({ error: "Неверный email или пароль" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Неверный email или пароль" });
      return;
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (e: any) {
    console.error("[auth/login] Error:", e);
    res.status(500).json({ error: "Ошибка входа" });
  }
});

router.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await storage.getAuthUser(userId);
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json({ id: user.id, email: user.email, displayName: user.displayName });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/api/auth/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { displayName } = req.body;
    const updated = await storage.updateAuthUserProfile(userId, { displayName: displayName || null });
    if (!updated) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json({ id: updated.id, email: updated.email, displayName: updated.displayName });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Текущий и новый пароль обязательны" });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "Новый пароль должен быть не менее 6 символов" });
      return;
    }

    const user = await storage.getAuthUser(userId);
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Неверный текущий пароль" });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await storage.updateAuthUserPassword(userId, newHash);
    res.json({ success: true });
  } catch (e: any) {
    console.error("[auth/change-password] Error:", e);
    res.status(500).json({ error: "Ошибка смены пароля" });
  }
});

router.delete("/api/auth/account", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: "Необходимо ввести пароль" });
      return;
    }

    const user = await storage.getAuthUser(userId);
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Неверный пароль" });
      return;
    }

    await storage.deleteUser(userId);
    res.json({ success: true });
  } catch (e: any) {
    console.error("[auth/delete-account] Error:", e);
    res.status(500).json({ error: "Ошибка удаления аккаунта" });
  }
});

router.get("/api/reviews", requireAuth, async (req: Request, res: Response) => {
  try {
    const cabinetId = req.query.cabinet_id as string;
    if (!cabinetId) {
      res.status(400).json({ error: "cabinet_id is required" });
      return;
    }
    const data = await storage.getReviews(cabinetId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/reviews/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await storage.getReviewById(req.params.id);
    if (!data) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/api/reviews/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await storage.updateReview(req.params.id, toCamelCase(req.body));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/product-articles", requireAuth, async (req: Request, res: Response) => {
  try {
    const cabinetId = req.query.cabinet_id as string;
    if (!cabinetId) {
      res.status(400).json({ error: "cabinet_id is required" });
      return;
    }
    const data = await storage.getProductArticles(cabinetId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/chats", requireAuth, async (req: Request, res: Response) => {
  try {
    const cabinetId = req.query.cabinet_id as string;
    if (!cabinetId) {
      res.status(400).json({ error: "cabinet_id is required" });
      return;
    }
    const data = await storage.getChats(cabinetId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/chat-messages", requireAuth, async (req: Request, res: Response) => {
  try {
    const chatId = req.query.chat_id as string;
    if (!chatId) {
      res.status(400).json({ error: "chat_id is required" });
      return;
    }
    const data = await storage.getChatMessages(chatId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/api/chats/:chatId/read", requireAuth, async (req: Request, res: Response) => {
  try {
    await storage.markChatRead(req.params.chatId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/cabinets", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = await storage.getCabinets(userId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/cabinets", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = await storage.createCabinet({ ...toCamelCase(req.body), userId });
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/api/cabinets/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await storage.updateCabinet(req.params.id, toCamelCase(req.body));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/api/cabinets/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await storage.deleteCabinet(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = await storage.getSettings(userId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/api/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const existing = await storage.getSettings(userId);
    if (!existing) {
      res.status(404).json({ error: "Settings not found" });
      return;
    }
    await storage.updateSettings(existing.id, toCamelCase(req.body));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/payments/latest", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const payment = await storage.getLatestPayment(userId);
    res.json(payment || { status: "none" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/balance/tokens", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const balance = await storage.getTokenBalance(userId);
    res.json({ balance });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/balance/ai", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const balance = await storage.getAiRequestBalance(userId);
    res.json({ balance });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/admin/balance/tokens", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, amount, type, description } = req.body;
    if (!userId || !amount || !type) {
      res.status(400).json({ error: "userId, amount, type are required" });
      return;
    }

    const currentBalance = await storage.getTokenBalance(userId);
    const delta = type === "admin_topup" ? amount : -amount;
    const newBalance = currentBalance + delta;

    if (newBalance < 0) {
      res.status(400).json({ error: "Balance cannot be negative" });
      return;
    }

    await storage.upsertTokenBalance(userId, newBalance);
    await storage.insertTokenTransaction({
      userId,
      amount: delta,
      type,
      description: description || (type === "admin_topup" ? "Admin top-up" : "Admin deduction"),
    });

    res.json({ success: true, newBalance });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/admin/balance/ai", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, amount, type, description } = req.body;
    if (!userId || !amount || !type) {
      res.status(400).json({ error: "userId, amount, type are required" });
      return;
    }

    const currentBalance = await storage.getAiRequestBalance(userId);
    const delta = type === "admin_topup" ? amount : -amount;
    const newBalance = currentBalance + delta;

    if (newBalance < 0) {
      res.status(400).json({ error: "Balance cannot be negative" });
      return;
    }

    await storage.upsertAiRequestBalance(userId, newBalance);
    await storage.insertAiRequestTransaction({
      userId,
      amount: delta,
      type,
      description: description || (type === "admin_topup" ? "Admin AI top-up" : "Admin AI deduction"),
    });

    res.json({ success: true, newBalance });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/users", requireAuth, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId;
    const adminRole = await storage.getUserRole(adminId);
    if (adminRole !== "admin") {
      res.status(403).json({ error: "Доступ запрещён" });
      return;
    }

    const [allProfiles, tokenBals, aiBals, roles, allCabinets, allAuthUsers, allPayments] = await Promise.all([
      storage.getAllProfiles(),
      storage.getAllTokenBalances(),
      storage.getAllAiRequestBalances(),
      storage.getAllUserRoles(),
      storage.getAllCabinets(),
      storage.getAllAuthUsers(),
      storage.getAllPayments(),
    ]);

    const balanceMap = new Map(tokenBals.map((b) => [b.userId, b.balance]));
    const aiBalanceMap = new Map(aiBals.map((b) => [b.userId, b.balance]));
    const roleMap = new Map(roles.map((r) => [r.userId, r.role]));
    const authUserMap = new Map(allAuthUsers.map((u) => [u.id, u]));

    const paymentsMap = new Map<string, typeof allPayments>();
    for (const pay of allPayments) {
      const arr = paymentsMap.get(pay.userId) || [];
      arr.push(pay);
      paymentsMap.set(pay.userId, arr);
    }

    const telegramMap = new Map<string, { username: string | null; firstName: string | null; chatId: string | null }>();
    for (const cab of allCabinets) {
      if (cab.telegramChatId && !telegramMap.has(cab.userId)) {
        telegramMap.set(cab.userId, {
          username: cab.telegramUsername,
          firstName: cab.telegramFirstName,
          chatId: cab.telegramChatId,
        });
      }
    }

    const cabinetsCountMap = new Map<string, number>();
    for (const cab of allCabinets) {
      cabinetsCountMap.set(cab.userId, (cabinetsCountMap.get(cab.userId) || 0) + 1);
    }

    const users = allProfiles.map((p) => {
      const authUser = authUserMap.get(p.id);
      const balance = balanceMap.get(p.id) ?? 0;
      const userPayments = paymentsMap.get(p.id) || [];
      const completedPayments = userPayments.filter(pay => pay.status === "completed");
      const totalPaid = completedPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);

      let status: "active" | "trial" | "expired" = "trial";
      if (completedPayments.length > 0) {
        status = balance > 0 ? "active" : "expired";
      } else if (balance > 0) {
        status = "trial";
      } else {
        status = "expired";
      }

      return {
        id: p.id,
        email: (p.email && p.email.trim()) || authUser?.email || "",
        display_name: p.displayName,
        phone: p.phone,
        created_at: p.createdAt || authUser?.createdAt,
        last_seen_at: p.lastSeenAt,
        admin_notes: p.adminNotes,
        balance,
        aiBalance: aiBalanceMap.get(p.id) ?? 0,
        role: roleMap.get(p.id) ?? "user",
        status,
        totalPaid,
        paymentsCount: completedPayments.length,
        cabinetsCount: cabinetsCountMap.get(p.id) || 0,
        telegram: telegramMap.get(p.id) || null,
        payments: userPayments.map(pay => ({
          id: pay.id,
          amount: pay.amount,
          tokens: pay.tokens,
          status: pay.status,
          created_at: pay.createdAt,
        })),
      };
    });

    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/api/admin/users/:id/notes", requireAuth, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId;
    const role = await storage.getUserRole(adminId);
    if (role !== "admin") {
      res.status(403).json({ error: "Доступ запрещён" });
      return;
    }
    const { notes } = req.body;
    await storage.updateAdminNotes(req.params.id, notes || "");
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/api/admin/users/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId;
    const role = await storage.getUserRole(adminId);
    if (role !== "admin") {
      res.status(403).json({ error: "Доступ запрещён" });
      return;
    }

    const targetId = req.params.id;
    if (targetId === adminId) {
      res.status(400).json({ error: "Нельзя удалить собственный аккаунт" });
      return;
    }

    const profile = await storage.getProfile(targetId);
    if (!profile) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    await storage.deleteUser(targetId);
    res.json({ success: true });
  } catch (e: any) {
    console.error("[admin/delete-user] Error:", e);
    res.status(500).json({ error: "Ошибка удаления пользователя" });
  }
});

router.get("/api/admin/overview", requireAuth, async (req: Request, res: Response) => {
  try {
    const adminRole = await storage.getUserRole((req as any).userId);
    if (adminRole !== "admin") { res.status(403).json({ error: "Доступ запрещён" }); return; }

    const [totalUsers, totalReviews, tokenBals, aiBals, totalTransactions, todayTransactions] = await Promise.all([
      storage.countProfiles(),
      storage.countReviews(),
      storage.getAllTokenBalances(),
      storage.getAllAiRequestBalances(),
      storage.countTokenTransactions(),
      storage.countTodayTokenTransactions(),
    ]);

    const totalBalance = tokenBals.reduce((sum, b) => sum + b.balance, 0);
    const totalAiBalance = aiBals.reduce((sum, b) => sum + b.balance, 0);

    res.json({
      totalUsers,
      totalBalance,
      totalAiBalance,
      todayTransactions,
      totalReviews,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/transactions", requireAuth, async (req: Request, res: Response) => {
  try {
    const adminRole = await storage.getUserRole((req as any).userId);
    if (adminRole !== "admin") { res.status(403).json({ error: "Доступ запрещён" }); return; }
    const typeFilter = req.query.type as string | undefined;
    const data = await storage.getTokenTransactions(typeFilter);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/ai-transactions", requireAuth, async (req: Request, res: Response) => {
  try {
    const adminRole = await storage.getUserRole((req as any).userId);
    if (adminRole !== "admin") { res.status(403).json({ error: "Доступ запрещён" }); return; }
    const typeFilter = req.query.type as string | undefined;
    const data = await storage.getAiRequestTransactions(typeFilter);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const adminRole = await storage.getUserRole((req as any).userId);
    if (adminRole !== "admin") { res.status(403).json({ error: "Доступ запрещён" }); return; }
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await storage.getAllRecentSessions(limit);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/users/:id/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const adminRole = await storage.getUserRole((req as any).userId);
    if (adminRole !== "admin") { res.status(403).json({ error: "Доступ запрещён" }); return; }
    const data = await storage.getUserSessions(req.params.id);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/role", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const role = await storage.getUserRole(userId);
    res.json({ role: role || "user", isAdmin: role === "admin" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/global-settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const role = await storage.getUserRole(userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const data = await storage.getAllGlobalSettings();
    const result: Record<string, string> = {};
    for (const row of data) {
      result[row.key] = row.value || "";
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/admin/global-settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const role = await storage.getUserRole(userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const { settings: settingsData } = req.body;
    if (!settingsData || typeof settingsData !== "object") {
      res.status(400).json({ error: "Invalid settings data" });
      return;
    }
    for (const [key, value] of Object.entries(settingsData)) {
      await storage.upsertGlobalSetting(key, String(value));
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/survey", async (req: Request, res: Response) => {
  try {
    const { respondent_name, answers } = req.body;
    if (!answers || typeof answers !== "object") {
      res.status(400).json({ error: "Invalid survey data" });
      return;
    }
    await storage.createSurveyResponse(respondent_name || "", answers);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/survey-responses", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const role = await storage.getUserRole(userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const data = await storage.getAllSurveyResponses();
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/conversations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = await storage.getConversations(userId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/conversations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = await storage.createConversation({ ...toCamelCase(req.body), userId });
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/api/conversations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await storage.updateConversation(req.params.id, toCamelCase(req.body));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/api/conversations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await storage.deleteConversation(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/ai-messages", requireAuth, async (req: Request, res: Response) => {
  try {
    const conversationId = req.query.conversation_id as string;
    if (!conversationId) {
      res.status(400).json({ error: "conversation_id is required" });
      return;
    }
    const data = await storage.getAiMessages(conversationId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/ai-messages", requireAuth, async (req: Request, res: Response) => {
  try {
    await storage.insertAiMessage(toCamelCase(req.body));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/recommendations", requireAuth, async (req: Request, res: Response) => {
  try {
    const sourceArticle = req.query.source_article as string;
    const cabinetId = req.query.cabinet_id as string;
    if (!sourceArticle || !cabinetId) {
      res.status(400).json({ error: "source_article and cabinet_id are required" });
      return;
    }
    const data = await storage.getRecommendations(sourceArticle, cabinetId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/recommendations/summary", requireAuth, async (req: Request, res: Response) => {
  try {
    const cabinetId = req.query.cabinet_id as string;
    if (!cabinetId) {
      res.status(400).json({ error: "cabinet_id is required" });
      return;
    }
    const data = await storage.getRecommendationsSummary(cabinetId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/recommendations/all", requireAuth, async (req: Request, res: Response) => {
  try {
    const cabinetId = req.query.cabinet_id as string;
    if (!cabinetId) {
      res.status(400).json({ error: "cabinet_id is required" });
      return;
    }
    const recs = await storage.getAllRecommendationsGrouped(cabinetId);
    const articles = await storage.getProductArticles(cabinetId);
    const nameMap = new Map(articles.map((a) => [a.article, a.name]));
    const grouped: Record<string, { source_article: string; source_name: string; items: any[] }> = {};
    for (const rec of recs) {
      if (!grouped[rec.sourceArticle]) {
        grouped[rec.sourceArticle] = {
          source_article: rec.sourceArticle,
          source_name: nameMap.get(rec.sourceArticle) || "",
          items: [],
        };
      }
      grouped[rec.sourceArticle].items.push({
        id: rec.id,
        target_article: rec.targetArticle,
        target_name: rec.targetName || nameMap.get(rec.targetArticle) || "",
      });
    }
    res.json(Object.values(grouped));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/recommendations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    await storage.insertRecommendation({ ...toCamelCase(req.body), userId });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/api/recommendations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await storage.deleteRecommendation(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/profiles/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = await storage.getProfile(userId);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/profiles", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    await storage.upsertProfile({ ...toCamelCase(req.body), id: userId });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/functions/sync-reviews", requireAuth, syncReviews);

router.post("/api/functions/sync-chats", requireAuth, syncChats);

router.post("/api/functions/send-reply", requireAuth, sendReply);

router.post("/api/functions/generate-reply", requireAuth, generateReply);

router.post("/api/functions/validate-api-key", requireAuth, validateApiKey);

router.post("/api/functions/send-chat-message", requireAuth, sendChatMessage);

router.post("/api/functions/ai-assistant", requireAuth, aiAssistant);

router.post("/api/functions/create-payment", requireAuth, createPayment);

router.post("/api/functions/robokassa-webhook", robokassaWebhook);

router.post("/api/functions/fetch-archive", requireAuth, fetchArchive);

router.post("/api/functions/telegram-link", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { cabinetId } = req.body;
    if (!cabinetId) {
      res.status(400).json({ error: "cabinetId required" });
      return;
    }

    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet || cabinet.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const crypto = await import("crypto");
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await storage.createTelegramAuthToken(token, userId, cabinetId, expiresAt);

    const { getTelegramBot } = await import("./telegram");
    const bot = getTelegramBot();
    let botUsername = "YourBot";
    if (bot) {
      try {
        const me = await bot.getMe();
        botUsername = me.username || "YourBot";
      } catch {}
    }

    const link = `https://t.me/${botUsername}?start=auth_${token}`;
    res.json({ link, token, expiresIn: 600 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/functions/telegram-unlink", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { cabinetId } = req.body;
    if (!cabinetId) {
      res.status(400).json({ error: "cabinetId required" });
      return;
    }

    const cabinet = await storage.getCabinetById(cabinetId);
    if (!cabinet || cabinet.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await storage.updateCabinet(cabinetId, { telegramChatId: null } as any);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/export/:table", requireAuth, async (req: Request, res: Response) => {
  try {
    const table = req.params.table;
    const columns = req.query.columns ? (req.query.columns as string).split(",") : [];
    const data = await storage.getTableData(table, columns);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
