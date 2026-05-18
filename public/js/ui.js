const toastHost = document.getElementById("toastHost");

export function setButtonLoading(btn, loading, loadingLabel = "Cargando…") {
  if (!btn) return;
  const labelEl = btn.querySelector(".btn-label");
  if (!btn.dataset.idleLabel) {
    btn.dataset.idleLabel = labelEl
      ? labelEl.textContent.trim()
      : btn.textContent.trim();
  }
  btn.classList.toggle("is-loading", loading);
  btn.disabled = loading;
  if (labelEl) {
    labelEl.textContent = loading ? loadingLabel : btn.dataset.idleLabel;
  }
}

export function setTableOverlay(overlay, loading, message) {
  if (!overlay) return;
  overlay.hidden = !loading;
  overlay.setAttribute("aria-busy", loading ? "true" : "false");
  const text = overlay.querySelector(".table-overlay-text");
  if (text && message) text.textContent = message;
}

export async function withTableRefresh({
  btn,
  overlay,
  loadFn,
  loadingLabel = "Actualizando…",
}) {
  try {
    setButtonLoading(btn, true, loadingLabel);
    setTableOverlay(overlay, true, loadingLabel);
    await loadFn();
  } finally {
    setButtonLoading(btn, false);
    setTableOverlay(overlay, false);
  }
}

export function setEnrollLoading(loading, message) {
  const overlay = document.getElementById("enrollOverlay");
  const overlayText = document.getElementById("enrollOverlayText");
  const btn = document.getElementById("btnEnroll");
  const enrollForm = document.getElementById("enrollForm");
  const result = document.getElementById("enrollResult");

  if (overlay) {
    overlay.hidden = !loading;
    overlay.setAttribute("aria-busy", loading ? "true" : "false");
  }
  if (overlayText && message) overlayText.textContent = message;
  setButtonLoading(btn, loading, "Guardando…");
  if (enrollForm) {
    enrollForm.querySelectorAll("input, select, textarea").forEach((el) => {
      el.disabled = loading;
    });
  }
  if (loading && result) result.hidden = true;
}

export function showEnrollSuccess(name) {
  const result = document.getElementById("enrollResult");
  const resultName = document.getElementById("enrollResultName");
  if (resultName) resultName.textContent = name;
  if (result) result.hidden = false;
}

export function hideEnrollSuccess() {
  const result = document.getElementById("enrollResult");
  if (result) result.hidden = true;
}

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
