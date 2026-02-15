import express from "express";
import path from "path";
import { router } from "./routes";
import { setupVite } from "./vite";
import { storage } from "./storage";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(router);

const ARCHIVE_INTERVAL_MS = 60 * 60 * 1000;

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

  app.listen(5000, "0.0.0.0", () => {
    console.log("Server running on port 5000");
    runAutoArchive();
    setInterval(runAutoArchive, ARCHIVE_INTERVAL_MS);
  });
})();
