import { apiFetch } from "./api.js";
import { showToast } from "./ui.js";

function eventTypeLabel(t) {
  if (t === "in") return "Entrada";
  if (t === "out") return "Salida";
  return t;
}

function todayFileSuffix() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function exportAttendanceToExcel() {
  const r = await apiFetch("/api/attendance");
  const rows = await r.json();

  if (!rows.length) {
    showToast("Sin datos", "No hay registros de asistencia para exportar.", "error");
    return;
  }

  const sheetRows = rows.map((row) => ({
    ID: row.id,
    Persona: row.person_name,
    Tipo: eventTypeLabel(row.event_type),
    Fecha: row.created_at,
  }));

  const XLSX = await import(
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm"
  );

  const ws = XLSX.utils.json_to_sheet(sheetRows);
  ws["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 12 }, { wch: 22 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
  XLSX.writeFile(wb, `asistencia_${todayFileSuffix()}.xlsx`);

  showToast(
    "Excel exportado",
    `Se descargó el archivo con ${rows.length} registro(s).`,
    "success"
  );
}
