import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function migratePeopleTable(db) {
  const cols = db.prepare("PRAGMA table_info(people)").all().map((c) => c.name);
  const additions = [
    ["dni", "TEXT"],
    ["age", "INTEGER"],
    ["gender", "TEXT"],
    ["department", "TEXT"],
    ["email", "TEXT"],
    ["notes", "TEXT"],
  ];
  for (const [name, type] of additions) {
    if (!cols.includes(name)) {
      db.exec(`ALTER TABLE people ADD COLUMN ${name} ${type}`);
    }
  }
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_people_dni ON people(dni)`);
  } catch {
    /* BD antigua con DNIs duplicados o nulos */
  }
}

export function createDatabase() {
  const dbPath =
    process.env.DB_PATH || path.join(ROOT, "data", "app.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dni TEXT UNIQUE,
      age INTEGER,
      gender TEXT,
      department TEXT,
      email TEXT,
      notes TEXT,
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

  migratePeopleTable(db);

  return db;
}
