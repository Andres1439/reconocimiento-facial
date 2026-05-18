const toastHost = document.getElementById("toastHost");

export function showToast(title, body, variant) {
  const el = document.createElement("div");
  el.className = "toast " + (variant === "error" ? "error" : "success");
  el.setAttribute("role", "alert");
  const icon = variant === "error" ? "✕" : "✓";
  el.innerHTML =
    '<div class="toast-icon">' +
    icon +
    '</div><div><p class="toast-title"></p><p class="toast-body"></p></div>';
  el.querySelector(".toast-title").textContent = title;
  el.querySelector(".toast-body").textContent = body || "";
  toastHost.appendChild(el);
  const t = setTimeout(() => {
    el.style.animation = "toastOut 0.25s ease forwards";
    setTimeout(() => el.remove(), 250);
  }, 4200);
  el.addEventListener("click", () => {
    clearTimeout(t);
    el.remove();
  });
}
