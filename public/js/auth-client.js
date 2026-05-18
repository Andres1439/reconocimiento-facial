export async function initAuth() {
  const r = await fetch("/api/auth/me");
  if (!r.ok) {
    location.href = "/login.html";
    return false;
  }
  const { user } = await r.json();
  document.getElementById("userName").textContent = user.username;
  document.getElementById("userPill").hidden = false;
  document.getElementById("btnLogout").hidden = false;
  return true;
}

export function setupLogout() {
  document.getElementById("btnLogout").onclick = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login.html";
  };
}
