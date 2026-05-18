import { syncAttendanceToAws } from "../services/aws-sync.js";

export function registerAttendanceRoutes(app, db, auth) {
  app.post("/api/attendance", auth, (req, res) => {
    const { person_name, event_type } = req.body || {};
    if (!person_name || !["in", "out"].includes(event_type)) {
      return res
        .status(400)
        .json({ error: "person_name y event_type ('in'|'out') requeridos" });
    }
    const info = db
      .prepare(
        "INSERT INTO attendance (person_name, event_type) VALUES (?, ?)"
      )
      .run(person_name, event_type);
    const id = info.lastInsertRowid;
    const row = db
      .prepare(
        "SELECT id, person_name, event_type, created_at FROM attendance WHERE id = ?"
      )
      .get(id);
    syncAttendanceToAws(row);
    res.json({ ok: true, id });
  });

  app.get("/api/attendance", auth, (_req, res) => {
    const rows = db
      .prepare(
        `SELECT id, person_name, event_type, created_at
         FROM attendance ORDER BY id DESC LIMIT 500`
      )
      .all();
    res.json(rows);
  });
}
