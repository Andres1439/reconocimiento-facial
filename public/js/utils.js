export function personInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function formatRegDate(iso) {
  if (!iso) return "—";
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, "0");
  return (
    p(d.getDate()) +
    "/" +
    p(d.getMonth() + 1) +
    "/" +
    d.getFullYear() +
    " " +
    p(d.getHours()) +
    ":" +
    p(d.getMinutes()) +
    ":" +
    p(d.getSeconds())
  );
}

export function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

export function badgeForType(t) {
  if (t === "in") return '<span class="badge-in">Entrada</span>';
  if (t === "out") return '<span class="badge-out">Salida</span>';
  return escapeHtml(t);
}
