import { apiFetch } from "./api.js";
import { isModelsReady } from "./face-models.js";
import { hideEnrollSuccess, setButtonLoading, showEnrollSuccess, showToast } from "./ui.js";
import { escapeHtml, formatRegDate, personInitials } from "./utils.js";

const ICON_EDIT =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
const ICON_DELETE =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

function readPersonForm(prefix) {
  return {
    name: document.getElementById(prefix + "Name").value.trim(),
    dni: document.getElementById(prefix + "Dni").value.trim(),
    age: Number(document.getElementById(prefix + "Age").value),
    gender: document.getElementById(prefix + "Gender").value,
    department: document.getElementById(prefix + "Department").value.trim(),
    email: document.getElementById(prefix + "Email").value.trim(),
    notes: document.getElementById(prefix + "Notes").value.trim() || null,
  };
}

function validatePersonClient(payload) {
  if (!payload.name) return "Nombre completo requerido";
  if (!payload.dni) return "DNI requerido";
  if (!/^\d{6,12}$/.test(payload.dni)) return "DNI inválido (6 a 12 dígitos)";
  if (!Number.isInteger(payload.age) || payload.age < 1 || payload.age > 120) {
    return "Edad inválida (1–120)";
  }
  if (!payload.gender) return "Selecciona un género";
  if (!payload.department) return "Área / Departamento requerido";
  if (!payload.email) return "Correo electrónico requerido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return "Correo electrónico inválido";
  }
  return null;
}

function getEnrollPayload() {
  return readPersonForm("enroll");
}

async function deletePerson(p) {
  if (!confirm("¿Eliminar a " + (p.name || p.dni) + "?")) return;
  await apiFetch("/api/people/" + p.id, { method: "DELETE" });
  showToast("Persona eliminada", (p.name || p.dni) + " se ha quitado del sistema.", "success");
  loadPeople();
}

export async function loadPeople() {
  const r = await apiFetch("/api/people");
  const list = await r.json();
  const tb = document.getElementById("peopleBody");
  tb.innerHTML = "";
  if (!list.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="5" style="color:var(--muted)">Nadie registrado. Usa Registro en el menú.</td>';
    tb.appendChild(tr);
    return;
  }
  for (const p of list) {
    const tr = document.createElement("tr");
    const ini = escapeHtml(personInitials(p.name));
    tr.innerHTML =
      '<td class="col-id">' +
      '<div class="person-cell">' +
      '<span class="person-avatar" aria-hidden="true">' +
      ini +
      "</span>" +
      '<span class="person-id-num">' +
      p.id +
      "</span>" +
      "</div>" +
      "</td><td class=\"col-name\">" +
      escapeHtml(p.name || "—") +
      "</td><td>" +
      escapeHtml(p.dni || "—") +
      "</td><td class=\"col-date\">" +
      escapeHtml(formatRegDate(p.created_at)) +
      '</td><td class="col-actions"></td>';

    const actions = tr.querySelector(".col-actions");
    const btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className = "btn-icon-action btn-icon-edit";
    btnEdit.title = "Editar";
    btnEdit.setAttribute("aria-label", "Editar " + (p.name || ""));
    btnEdit.innerHTML = ICON_EDIT;
    btnEdit.onclick = () => openEditModal(p);

    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn-icon-action btn-icon-delete";
    btnDel.title = "Eliminar";
    btnDel.setAttribute("aria-label", "Eliminar " + (p.name || ""));
    btnDel.innerHTML = ICON_DELETE;
    btnDel.onclick = () => deletePerson(p);

    actions.append(btnEdit, btnDel);
    tb.appendChild(tr);
  }
}

function openEditModal(p) {
  const modal = document.getElementById("editPersonModal");
  document.getElementById("editPersonId").value = p.id;
  document.getElementById("editName").value = p.name || "";
  document.getElementById("editDni").value = p.dni || "";
  document.getElementById("editAge").value = p.age ?? "";
  document.getElementById("editGender").value = p.gender || "";
  document.getElementById("editDepartment").value = p.department || "";
  document.getElementById("editEmail").value = p.email || "";
  document.getElementById("editNotes").value = p.notes || "";
  document.getElementById("editPersonMsg").textContent = "";
  document.getElementById("editPersonMsg").className = "msg";
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeEditModal() {
  const modal = document.getElementById("editPersonModal");
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

export function setupEditPerson() {
  const modal = document.getElementById("editPersonModal");
  const btnSave = document.getElementById("btnSaveEdit");
  const msg = document.getElementById("editPersonMsg");

  modal.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", closeEditModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeEditModal();
  });

  btnSave.onclick = async () => {
    msg.textContent = "";
    msg.className = "msg";
    const id = document.getElementById("editPersonId").value;
    const payload = readPersonForm("edit");
    const validationErr = validatePersonClient(payload);
    if (validationErr) {
      msg.textContent = validationErr;
      msg.className = "msg err";
      showToast("Datos incompletos", validationErr, "error");
      return;
    }

    try {
      setButtonLoading(btnSave, true, "Guardando…");
      const r = await apiFetch("/api/people/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) {
        msg.textContent = j.error || "Error";
        msg.className = "msg err";
        showToast("No se pudo guardar", j.error || "Error del servidor", "error");
        return;
      }
      showToast("Cambios guardados", payload.name + " se actualizó correctamente.", "success");
      closeEditModal();
      loadPeople();
    } finally {
      setButtonLoading(btnSave, false);
    }
  };
}

export function setupEnroll({ video, enrollMsg, btnEnroll, getDescriptor: getDescriptorSecure }) {
  btnEnroll.onclick = async () => {
    enrollMsg.textContent = "";
    enrollMsg.className = "msg";
    hideEnrollSuccess();

    if (!isModelsReady()) return;

    const payload = getEnrollPayload();
    const validationErr = validatePersonClient(payload);
    if (validationErr) {
      enrollMsg.textContent = validationErr;
      enrollMsg.className = "msg err";
      showToast("Datos incompletos", validationErr, "error");
      return;
    }

    try {
      setEnrollLoading(true, "Verificando detección de vida…");
      const secure = await getDescriptorSecure(video, (msg) => setEnrollLoading(true, msg));
      if (secure?.error === "liveness") {
        enrollMsg.textContent = "No se detectó rostro vivo. Parpadea frente a la cámara.";
        enrollMsg.className = "msg err";
        showToast(
          "Detección de vida fallida",
          "No uses fotos o pantallas. Parpadea o mueve levemente la cabeza.",
          "error"
        );
        return;
      }
      const desc = secure?.descriptor;
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

      setEnrollLoading(true, "Guardando en el servidor…");
      const r = await apiFetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, descriptor: desc }),
      });
      const j = await r.json();
      if (!r.ok) {
        enrollMsg.textContent = j.error || "Error";
        enrollMsg.className = "msg err";
        showToast("No se pudo guardar", j.error || "Error del servidor", "error");
        return;
      }

      enrollMsg.textContent = "";
      enrollMsg.className = "msg";
      showEnrollSuccess(payload.name);
      showToast(
        "Registro finalizado",
        payload.name + " se ha registrado correctamente en el sistema.",
        "success"
      );
      document.getElementById("enrollForm").reset();
      loadPeople();
    } finally {
      setEnrollLoading(false);
      if (isModelsReady()) btnEnroll.disabled = false;
    }
  };
}
