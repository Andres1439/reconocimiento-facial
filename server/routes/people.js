import { findBestMatch } from "../services/face-match.js";
import {
  deletePersonFromAws,
  syncPersonToAws,
} from "../services/aws-sync.js";

const DEFAULT_THRESHOLD = Number(process.env.MATCH_THRESHOLD || 0.55);

const PEOPLE_SELECT = `
  id, name, dni, age, gender, department, email, notes, created_at
`;

const PEOPLE_FULL = `
  id, name, dni, age, gender, department, email, notes, descriptor_json, created_at
`;

function fetchPersonFull(db, id) {
  return db.prepare(`SELECT ${PEOPLE_FULL} FROM people WHERE id = ?`).get(id);
}

function validatePersonBody(body, requireDescriptor) {
  const {
    name,
    dni,
    age,
    gender,
    department,
    email,
    notes,
    descriptor,
  } = body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return "Nombre completo requerido";
  }
  if (!dni || typeof dni !== "string" || !dni.trim()) {
    return "DNI requerido";
  }
  if (!/^\d{6,12}$/.test(dni.trim())) {
    return "DNI inválido (6 a 12 dígitos)";
  }
  const ageNum = Number(age);
  if (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120) {
    return "Edad inválida (1–120)";
  }
  if (!gender || typeof gender !== "string") {
    return "Género requerido";
  }
  const allowedGender = ["Masculino", "Femenino", "Otro", "Prefiero no decir"];
  if (!allowedGender.includes(gender)) {
    return "Género no válido";
  }
  if (!department || typeof department !== "string" || !department.trim()) {
    return "Área / Departamento requerido";
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    return "Correo electrónico requerido";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Correo electrónico inválido";
  }
  if (notes != null && typeof notes !== "string") {
    return "Observaciones inválidas";
  }
  if (requireDescriptor) {
    if (!Array.isArray(descriptor) || descriptor.length < 64) {
      return "descriptor debe ser array numérico (128 floats típico)";
    }
  }
  return null;
}

export function registerPeopleRoutes(app, db, auth) {
  app.get("/api/people", auth, (_req, res) => {
    const rows = db
      .prepare(
        `SELECT ${PEOPLE_SELECT} FROM people ORDER BY name COLLATE NOCASE`
      )
      .all();
    res.json(rows);
  });

  app.post("/api/people", auth, (req, res) => {
    const err = validatePersonBody(req.body, true);
    if (err) return res.status(400).json({ error: err });

    const {
      name,
      dni,
      age,
      gender,
      department,
      email,
      notes,
      descriptor,
    } = req.body;

    try {
      const dniVal = dni.trim();
      const row = {
        name: name.trim(),
        age: Number(age),
        gender,
        department: department.trim(),
        email: email.trim(),
        notes: notes?.trim() || null,
        descriptor_json: JSON.stringify(descriptor),
      };
      const existing = db.prepare("SELECT id FROM people WHERE dni = ?").get(dniVal);
      let id;
      if (existing) {
        db.prepare(
          `UPDATE people SET name = ?, age = ?, gender = ?, department = ?, email = ?, notes = ?, descriptor_json = ?
           WHERE dni = ?`
        ).run(
          row.name,
          row.age,
          row.gender,
          row.department,
          row.email,
          row.notes,
          row.descriptor_json,
          dniVal
        );
        id = existing.id;
      } else {
        const info = db
          .prepare(
            `INSERT INTO people (name, dni, age, gender, department, email, notes, descriptor_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            row.name,
            dniVal,
            row.age,
            row.gender,
            row.department,
            row.email,
            row.notes,
            row.descriptor_json
          );
        id = info.lastInsertRowid;
      }
      const saved = fetchPersonFull(db, id);
      syncPersonToAws(saved);
      res.json({ ok: true, id });
    } catch (e) {
      if (String(e.message || e).includes("UNIQUE")) {
        return res.status(409).json({ error: "Ya existe una persona con ese DNI o nombre" });
      }
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.get("/api/people/:id", auth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const row = db
      .prepare(`SELECT ${PEOPLE_SELECT} FROM people WHERE id = ?`)
      .get(id);
    if (!row) return res.status(404).json({ error: "Persona no encontrada" });
    res.json(row);
  });

  app.put("/api/people/:id", auth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const err = validatePersonBody(req.body, false);
    if (err) return res.status(400).json({ error: err });

    const exists = db.prepare("SELECT id FROM people WHERE id = ?").get(id);
    if (!exists) return res.status(404).json({ error: "Persona no encontrada" });

    const { name, dni, age, gender, department, email, notes, descriptor } = req.body;
    const dniVal = dni.trim();
    const conflict = db
      .prepare("SELECT id FROM people WHERE dni = ? AND id != ?")
      .get(dniVal, id);
    if (conflict) {
      return res.status(409).json({ error: "Ya existe otra persona con ese DNI" });
    }

    try {
      if (Array.isArray(descriptor) && descriptor.length >= 64) {
        db.prepare(
          `UPDATE people SET name = ?, dni = ?, age = ?, gender = ?, department = ?, email = ?, notes = ?, descriptor_json = ?
           WHERE id = ?`
        ).run(
          name.trim(),
          dniVal,
          Number(age),
          gender,
          department.trim(),
          email.trim(),
          notes?.trim() || null,
          JSON.stringify(descriptor),
          id
        );
      } else {
        db.prepare(
          `UPDATE people SET name = ?, dni = ?, age = ?, gender = ?, department = ?, email = ?, notes = ?
           WHERE id = ?`
        ).run(
          name.trim(),
          dniVal,
          Number(age),
          gender,
          department.trim(),
          email.trim(),
          notes?.trim() || null,
          id
        );
      }
      syncPersonToAws(fetchPersonFull(db, id));
      res.json({ ok: true, id });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.delete("/api/people/:id", auth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const row = db.prepare("SELECT dni FROM people WHERE id = ?").get(id);
    const r = db.prepare("DELETE FROM people WHERE id = ?").run(id);
    if (row?.dni) deletePersonFromAws(row.dni);
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
