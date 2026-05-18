export async function apiFetch(url, options = {}) {
  const r = await fetch(url, options);
  if (r.status === 401) {
    location.href = "/login.html";
    throw new Error("No autenticado");
  }
  return r;
}
