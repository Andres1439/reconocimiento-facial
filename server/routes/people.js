import { findBestMatch } from "../services/face-match.js";

const DEFAULT_THRESHOLD = Number(process.env.MATCH_THRESHOLD || 0.55);

export function registerPeopleRoutes(app, db, auth) {
  app.get("/api/people", auth, (_req, res) => {
    const rows = db
      .prepare(
        "SELECT id, name, created_at FROM people ORDER BY name COLLATE NOCASE"
      )
      .all();
    res.json(rows);
  });

  app.post("/api/people", auth, (req, res) => {
    const { name, descriptor } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name requerido" });
    }
    if (!Array.isArray(descriptor) || descriptor.length < 64) {
      return res
        .status(400)
        .json({ error: "descriptor debe ser array numérico (128 floats típico)" });
    }
    try {
      const info = db
        .prepare(
          `INSERT INTO people (name, descriptor_json) VALUES (?, ?)
           ON CONFLICT(name) DO UPDATE SET descriptor_json = excluded.descriptor_json`
        )
        .run(name.trim(), JSON.stringify(descriptor));
      res.json({ ok: true, id: info.lastInsertRowid || null });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.delete("/api/people/:name", auth, (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const r = db.prepare("DELETE FROM people WHERE name = ?").run(name);
    res.json({ ok: true, deleted: r.changes });
  });

  app.post("/api/match", auth, (req, res) => {
    const { descriptor, threshold } = req.body || {};
    if (!Array.isArray(descriptor) || descriptor.length < 64) {
      return res.status(400).json({ error: "descriptor inválido" });
    }
    const thr =
      typeof threshold === "number" && threshold > 0 ? threshold : DEFAULT_THRESHOLD;
    res.json(findBestMatch(db, descriptor, thr));
  });
}
