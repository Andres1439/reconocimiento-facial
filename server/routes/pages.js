import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "..", "public");

export function registerPageRoutes(app, authPage) {
  app.get("/", authPage, (_req, res) => {
    res.sendFile(path.join(PUBLIC, "index.html"));
  });

  app.get("/index.html", authPage, (_req, res) => {
    res.sendFile(path.join(PUBLIC, "index.html"));
  });
}
