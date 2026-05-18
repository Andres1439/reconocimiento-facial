import { apiFetch } from "./api.js";
import { isModelsReady } from "./face-models.js";
import { setButtonLoading, showToast } from "./ui.js";
import { escapeHtml, badgeForType } from "./utils.js";

export async function loadAttendance() {
  const r = await apiFetch("/api/attendance");
  const rows = await r.json();
  const tb = document.getElementById("attBody");
  tb.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" +
      row.id +
      "</td><td>" +
      escapeHtml(row.person_name) +
      "</td><td>" +
      badgeForType(row.event_type) +
      "</td><td>" +
      escapeHtml(row.created_at) +
      "</td>";
    tb.appendChild(tr);
  }
}

export function setupEventTypeSegmented() {
  const evtTypeInput = document.getElementById("evtType");
  const evtSegButtons = document.querySelectorAll(".evt-seg");

  evtSegButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-value");
      evtTypeInput.value = v;
      evtSegButtons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
    });
  });

  return () => evtTypeInput.value;
}

export function setupMark({ video, markMsg, btnMark, getDescriptor, getEventType }) {
  btnMark.onclick = async () => {
    markMsg.textContent = "";
    markMsg.className = "msg";
    if (!isModelsReady()) return;

    try {
      setButtonLoading(btnMark, true, "Verificando vida…");
      const secure = await getDescriptor(video, (msg) => setButtonLoading(btnMark, true, msg));
      if (secure?.error === "liveness") {
        markMsg.textContent = "Rostro no vivo detectado. Parpadea o mueve la cabeza.";
        markMsg.className = "msg err";
        showToast(
          "Detección de vida fallida",
          "No uses fotos. Parpadea frente a la cámara e inténtalo de nuevo.",
          "error"
        );
        return;
      }
      const desc = secure?.descriptor;
      if (!desc) {
        markMsg.textContent = "No se detectó un rostro.";
        markMsg.className = "msg err";
        showToast("Sin rostro detectado", "No hay una cara clara en cámara.", "error");
        return;
      }

      const r = await apiFetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: desc }),
      });
      const j = await r.json();
      if (!j.match) {
        markMsg.textContent =
          "Sin coincidencia (distancia " + (j.distance?.toFixed?.(3) ?? "?") + ").";
        markMsg.className = "msg err";
        showToast(
          "Sin coincidencia",
          "No hay una persona registrada que coincida con este rostro.",
          "error"
        );
        return;
      }
      const event_type = getEventType();
      const ar = await apiFetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_name: j.name, event_type }),
      });
      const aj = await ar.json();
      if (!ar.ok) {
        markMsg.textContent = aj.error || "Error al registrar";
        markMsg.className = "msg err";
        showToast("Error al registrar", aj.error || "No se pudo guardar el evento.", "error");
        return;
      }
      const tipoLabel = event_type === "in" ? "Entrada" : "Salida";
      markMsg.textContent = "Registrado: " + j.name + " (" + event_type + ")";
      markMsg.className = "msg ok";
      showToast(
        tipoLabel + " registrada",
        j.name + " — " + tipoLabel.toLowerCase() + " guardada correctamente.",
        "success"
      );
      loadAttendance();
    } finally {
      setButtonLoading(btnMark, false);
    }
  };
}
