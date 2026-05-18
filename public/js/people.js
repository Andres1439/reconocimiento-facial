import { apiFetch } from "./api.js";
import { isModelsReady } from "./face-models.js";
import { showToast } from "./ui.js";
import { escapeHtml } from "./utils.js";

export async function loadPeople() {
  const r = await apiFetch("/api/people");
  const list = await r.json();
  const tb = document.getElementById("peopleBody");
  tb.innerHTML = "";
  if (!list.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="4" style="color:var(--muted)">Nadie registrado. Usa Registro en el menú.</td>';
    tb.appendChild(tr);
    return;
  }
  for (const p of list) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" +
      p.id +
      "</td><td>" +
      escapeHtml(p.name) +
      "</td><td>" +
      escapeHtml(p.created_at || "") +
      "</td>";
    const td = document.createElement("td");
    const del = document.createElement("button");
    del.className = "secondary btn-table-del";
    del.textContent = "Eliminar";
    del.onclick = async () => {
      if (!confirm("¿Eliminar " + p.name + "?")) return;
      await apiFetch("/api/people/" + encodeURIComponent(p.name), { method: "DELETE" });
      showToast("Persona eliminada", p.name + " se ha quitado del sistema.", "success");
      loadPeople();
    };
    td.appendChild(del);
    tr.appendChild(td);
    tb.appendChild(tr);
  }
}

export function setupEnroll({ video, enrollMsg, btnEnroll, getDescriptor }) {
  btnEnroll.onclick = async () => {
    enrollMsg.textContent = "";
    enrollMsg.className = "msg";
    if (!isModelsReady()) return;
    const name = document.getElementById("enrollName").value.trim();
    if (!name) {
      enrollMsg.textContent = "Escribe un nombre.";
      enrollMsg.className = "msg err";
      showToast("Falta el nombre", "Introduce el nombre de la persona antes de guardar.", "error");
      return;
    }
    const desc = await getDescriptor(video);
    if (!desc) {
      enrollMsg.textContent = "No se detectó un rostro. Ajusta luz y posición.";
      enrollMsg.className = "msg err";
      showToast(
        "Sin rostro detectado",
        "Centra el rostro frente a la cámara e inténtalo de nuevo.",
        "error"
      );
      return;
    }
    const r = await apiFetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, descriptor: desc }),
    });
    const j = await r.json();
    if (!r.ok) {
      enrollMsg.textContent = j.error || "Error";
      enrollMsg.className = "msg err";
      showToast("No se pudo guardar", j.error || "Error del servidor", "error");
      return;
    }
    enrollMsg.textContent = "Guardado: " + name;
    enrollMsg.className = "msg ok";
    showToast("Persona registrada", name + " se ha añadido correctamente.", "success");
    loadPeople();
  };
}
