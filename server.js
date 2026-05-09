import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "app.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    descriptor_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** face-api.js descriptor ~0.6 es umbral típico; más bajo = más estricto */
const DEFAULT_THRESHOLD = Number(process.env.MATCH_THRESHOLD || 0.55);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/people", (_req, res) => {
  const rows = db
    .prepare(
      "SELECT id, name, created_at FROM people ORDER BY name COLLATE NOCASE"
    )
    .all();
  res.json(rows);
});

app.post("/api/people", (req, res) => {
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

app.delete("/api/people/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const r = db.prepare("DELETE FROM people WHERE name = ?").run(name);
  res.json({ ok: true, deleted: r.changes });
});

app.post("/api/attendance", (req, res) => {
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
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.get("/api/attendance", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, person_name, event_type, created_at
       FROM attendance ORDER BY id DESC LIMIT 500`
    )
    .all();
  res.json(rows);
});

app.post("/api/match", (req, res) => {
  const { descriptor, threshold } = req.body || {};
  if (!Array.isArray(descriptor) || descriptor.length < 64) {
    return res.status(400).json({ error: "descriptor inválido" });
  }
  const thr =
    typeof threshold === "number" && threshold > 0 ? threshold : DEFAULT_THRESHOLD;
  const people = db
    .prepare("SELECT name, descriptor_json FROM people")
    .all();
  let best = null;
  let bestDist = Infinity;
  for (const p of people) {
    const ref = JSON.parse(p.descriptor_json);
    const d = euclideanDistance(descriptor, ref);
    if (d < bestDist) {
      bestDist = d;
      best = p.name;
    }
  }
  if (!best || bestDist > thr) {
    return res.json({ match: false, distance: bestDist, threshold: thr });
  }
  res.json({ match: true, name: best, distance: bestDist, threshold: thr });
});

app.listen(PORT, () => {
  console.log(`Servidor http://127.0.0.1:${PORT}`);
});
