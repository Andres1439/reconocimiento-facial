import { fullSyncFromDb, getSyncStatus } from "../services/aws-sync.js";

export function registerSyncRoutes(app, db, auth) {
  app.get("/api/sync/status", auth, (_req, res) => {
    res.json(getSyncStatus());
  });

  app.post("/api/sync/aws", auth, async (_req, res) => {
    try {
      const result = await fullSyncFromDb(db);
      if (result.skipped) {
        return res.status(503).json({
          error: "AWS no configurado. Revisa las variables en .env",
        });
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });
}
