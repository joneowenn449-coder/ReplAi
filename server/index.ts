import express from "express";
import path from "path";
import { router } from "./routes";
import { setupVite } from "./vite";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(router);

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
  });
})();
