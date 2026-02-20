import express from "express";
import path from "path";
import { router } from "./routes";
import { setupVite } from "./vite";
import { storage } from "./storage";
import { runAutoSync } from "./functions";
import { db } from "./db";
import { userRoles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { startTelegramBot } from "./telegram";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(router);

const ARCHIVE_INTERVAL_MS = 60 * 60 * 1000;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;


async function runAutoArchive() {
  try {
    const archived = await storage.archiveOldAnsweredReviews(7);
    if (archived > 0) {
      console.log(`[auto-archive] Moved ${archived} answered reviews to archive`);
    }
  } catch (err) {
    console.error("[auto-archive] Error:", err);
  }
}

async function runPeriodicSync() {
  try {
    await runAutoSync();
  } catch (err) {
    console.error("[auto-sync] Error:", err);
  }
}

(async () => {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    await setupVite(app);
  } else {
    app.use(express.static(path.resolve(process.cwd(), "dist")));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  try {
    const { pool } = await import("./db");
    await pool.query(`ALTER TABLE replai.wb_cabinets ADD COLUMN IF NOT EXISTS photo_analysis BOOLEAN DEFAULT false`);
    console.log("[migration] photo_analysis column ensured");
  } catch (migErr: any) {
    console.warn("[migration] photo_analysis:", migErr.message);
  }

  app.listen(5000, "0.0.0.0", () => {
    console.log("Server running on port 5000");
    (async () => {
      try {
        const adminUserId = "5339ed4d-37c9-4fc1-bed9-dc4604bdffe6";
        const existing = await db.select().from(userRoles).where(eq(userRoles.userId, adminUserId)).limit(1);
        if (existing.length === 0) {
          await db.insert(userRoles).values({ userId: adminUserId, role: "admin" });
          console.log(`[admin] Granted admin role to user ${adminUserId}`);
        }
      } catch (err) {
        console.error("[admin] Error granting admin role:", err);
      }
    })();
    if (process.env.NODE_ENV === "production" || process.env.REPL_DEPLOYMENT) {
      startTelegramBot().catch(err => console.error("[telegram] Failed to start bot:", err));
    } else {
      console.log("[telegram] Skipping bot in dev mode (runs in production only)");
    }
    runAutoArchive();
    setInterval(runAutoArchive, ARCHIVE_INTERVAL_MS);
    setTimeout(() => runPeriodicSync(), 10000);
    setInterval(runPeriodicSync, SYNC_INTERVAL_MS);
  });
})();
