import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initAuth, registerAuthRoutes, requireAuth, requireAuthPage } from "./auth.js";
import { registerPeopleRoutes } from "./routes/people.js";
import { registerAttendanceRoutes } from "./routes/attendance.js";
import { registerPageRoutes } from "./routes/pages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");

export function createApp(db) {
  const app = express();

  initAuth(db);
  app.use(express.json({ limit: "2mb" }));

  registerAuthRoutes(app, db);

  const auth = requireAuth(db);
  const authPage = requireAuthPage(db);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  registerPageRoutes(app, authPage);
  app.use(express.static(PUBLIC, { index: false }));

  registerPeopleRoutes(app, db, auth);
  registerAttendanceRoutes(app, db, auth);

  return app;
}
