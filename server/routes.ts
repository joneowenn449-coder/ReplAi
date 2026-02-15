import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import {
  syncReviews, syncChats, sendReply, generateReply,
  validateApiKey, sendChatMessage, aiAssistant,
  createPayment, robokassaWebhook, fetchArchive,
} from "./functions";

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

function getUserIdFromToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

const provisionedUsers = new Set<string>();

async function ensureUserProvisioned(userId: string): Promise<void> {
  if (provisionedUsers.has(userId)) return;

  try {
    const profile = await storage.getProfile(userId);
    if (!profile) {
      await storage.upsertProfile({ id: userId });
      console.log(`[auto-provision] Created profile for user ${userId}`);
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

    await storage.upsertTokenBalance(userId, await storage.getTokenBalance(userId));
    await storage.upsertAiRequestBalance(userId, await storage.getAiRequestBalance(userId));

    provisionedUsers.add(userId);
  } catch (err) {
    console.error(`[auto-provision] Failed for user ${userId}:`, err);
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;
  ensureUserProvisioned(userId).then(() => next()).catch((err) => {
    console.error("[auto-provision] Error:", err);
    next();
  });
}

router.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
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

router.get("/api/admin/users", requireAuth, async (_req: Request, res: Response) => {
  try {
    const [allProfiles, tokenBals, aiBals, roles] = await Promise.all([
      storage.getAllProfiles(),
      storage.getAllTokenBalances(),
      storage.getAllAiRequestBalances(),
      storage.getAllUserRoles(),
    ]);

    const balanceMap = new Map(tokenBals.map((b) => [b.userId, b.balance]));
    const aiBalanceMap = new Map(aiBals.map((b) => [b.userId, b.balance]));
    const roleMap = new Map(roles.map((r) => [r.userId, r.role]));

    const users = allProfiles.map((p) => ({
      id: p.id,
      email: "",
      display_name: p.displayName,
      phone: p.phone,
      created_at: p.createdAt,
      balance: balanceMap.get(p.id) ?? 0,
      aiBalance: aiBalanceMap.get(p.id) ?? 0,
      role: roleMap.get(p.id) ?? "user",
    }));

    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/overview", requireAuth, async (_req: Request, res: Response) => {
  try {
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
    const typeFilter = req.query.type as string | undefined;
    const data = await storage.getTokenTransactions(typeFilter);
    res.json(toSnakeCase(data));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/admin/ai-transactions", requireAuth, async (req: Request, res: Response) => {
  try {
    const typeFilter = req.query.type as string | undefined;
    const data = await storage.getAiRequestTransactions(typeFilter);
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
