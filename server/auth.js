import crypto from "crypto";

const SESSION_COOKIE = "session";
const SESSION_DAYS = 7;
const SCRYPT_KEYLEN = 64;

export function initAuth(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (count === 0) {
    const username = process.env.ADMIN_USER || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(
      username,
      hashPassword(password)
    );
    console.log(
      `[auth] Usuario inicial: "${username}" / contraseña por defecto. Cambia ADMIN_PASSWORD en .env en producción.`
    );
  }

  purgeExpiredSessions(db);
}

function purgeExpiredSessions(db) {
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"));
  } catch {
    return false;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

function sessionExpiryIso() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export function getSessionUser(db, req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at >= datetime('now')`
    )
    .get(token);
  return row || null;
}

export function requireAuth(db) {
  return (req, res, next) => {
    const user = getSessionUser(db, req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    req.user = user;
    next();
  };
}

export function requireAuthPage(db) {
  return (req, res, next) => {
    const user = getSessionUser(db, req);
    if (!user) {
      return res.redirect(302, "/login.html");
    }
    req.user = user;
    next();
  };
}

export function registerAuthRoutes(app, db) {
  const require = requireAuth(db);

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password || typeof username !== "string") {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }
    const user = db
      .prepare("SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE")
      .get(username.trim());
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    purgeExpiredSessions(db);
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
      token,
      user.id,
      sessionExpiryIso()
    );
    setSessionCookie(res, token);
    res.json({ ok: true, user: { id: user.id, username: user.username } });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", require, (req, res) => {
    res.json({ user: { id: req.user.id, username: req.user.username } });
  });
}
