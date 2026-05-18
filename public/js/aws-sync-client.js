import { apiFetch } from "./api.js";
import { setButtonLoading, showToast } from "./ui.js";

function formatAwsStatus(data) {
  if (!data.enabled) {
    return "Nube: no configurada (.env)";
  }
  if (data.lastAt == null) {
    return "Nube: lista (sin sync aún)";
  }
  if (data.lastOk) {
    const c = data.lastCounts;
    const extra = c ? ` · ${c.people} personas, ${c.attendance} fichajes` : "";
    return "Nube: sincronizado" + extra;
  }
  return "Nube: error — " + (data.lastError || "desconocido");
}

export async function refreshAwsStatus() {
  const pill = document.getElementById("awsSyncPill");
  const text = document.getElementById("awsSyncStatus");
  if (!pill || !text) return;

  try {
    const r = await apiFetch("/api/sync/status");
    const data = await r.json();
    text.textContent = formatAwsStatus(data);
    pill.hidden = false;
    pill.setAttribute("data-ready", data.enabled && data.lastOk !== false ? "true" : "false");
  } catch {
    text.textContent = "Nube: sin conexión";
    pill.hidden = false;
    pill.setAttribute("data-ready", "false");
  }
}

export function initAwsSyncUi() {
  refreshAwsStatus();
  setInterval(refreshAwsStatus, 30_000);

  const btn = document.getElementById("btnSyncAws");
  if (!btn) return;

  btn.onclick = async () => {
    try {
      setButtonLoading(btn, true, "Sincronizando…");
      const r = await apiFetch("/api/sync/aws", { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        showToast("Sync AWS", j.error || "No se pudo sincronizar", "error");
        return;
      }
      showToast(
        "Sincronización AWS",
        `Subidos ${j.people} empleados y ${j.attendance} registros de asistencia.`,
        "success"
      );
      refreshAwsStatus();
    } catch (e) {
      showToast("Sync AWS", e.message || "Error de red", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  };
}
