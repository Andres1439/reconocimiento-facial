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
