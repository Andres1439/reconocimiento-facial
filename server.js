import { createDatabase } from "./server/db.js";
import { createApp } from "./server/app.js";

const PORT = process.env.PORT || 3000;
const db = createDatabase();
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Servidor http://127.0.0.1:${PORT}`);
});
