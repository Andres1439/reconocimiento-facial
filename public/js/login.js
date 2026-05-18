const form = document.getElementById("loginForm");
const errEl = document.getElementById("loginErr");
const btn = document.getElementById("btnSubmit");

fetch("/api/auth/me")
  .then((r) => {
    if (r.ok) location.href = "/";
  })
  .catch(() => {});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.textContent = "";
  btn.disabled = true;
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      errEl.textContent = j.error || "No se pudo iniciar sesión";
      return;
    }
    location.href = "/";
  } catch {
    errEl.textContent = "Error de conexión con el servidor";
  } finally {
    btn.disabled = false;
  }
});
