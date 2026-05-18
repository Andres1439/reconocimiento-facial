import { initAuth, setupLogout } from "./auth-client.js";
import { initCamera } from "./camera.js";
import { loadModels, getSecureDescriptor, isModelsReady } from "./face-models.js";
import { initAwsSyncUi } from "./aws-sync-client.js";
import { initNavigation } from "./navigation.js";
import { loadPeople, setupEditPerson, setupEnroll } from "./people.js";
import { loadAttendance, setupEventTypeSegmented, setupMark } from "./attendance.js";
import { exportAttendanceToExcel } from "./export-excel.js";
import { setButtonLoading, showToast, withTableRefresh } from "./ui.js";

const video = document.getElementById("video");
const modelStatus = document.getElementById("modelStatus");
const modelStatusPill = document.getElementById("modelStatusPill");
const btnCam = document.getElementById("btnCam");
const btnStop = document.getElementById("btnStop");
const btnEnroll = document.getElementById("btnEnroll");
const btnMark = document.getElementById("btnMark");
const camMsg = document.getElementById("camMsg");
const enrollMsg = document.getElementById("enrollMsg");
const markMsg = document.getElementById("markMsg");

function guardedGetDescriptor(v, onProgress) {
  if (!isModelsReady()) return Promise.resolve({ error: "models" });
  return getSecureDescriptor(v, onProgress);
}

initCamera({ video, btnCam, btnStop, camMsg });

initNavigation({
  onViewChange(viewId) {
    if (viewId === "viewPeople") loadPeople();
    if (viewId === "viewAttendance") loadAttendance();
  },
});

setupLogout();
const getEventType = setupEventTypeSegmented();

setupEnroll({
  video,
  enrollMsg,
  btnEnroll,
  getDescriptor: guardedGetDescriptor,
});
setupEditPerson();

setupMark({
  video,
  markMsg,
  btnMark,
  getDescriptor: guardedGetDescriptor,
  getEventType,
});

const btnRefreshPeople = document.getElementById("btnRefreshPeople");
const btnRefreshAtt = document.getElementById("btnRefreshAtt");
const peopleTableOverlay = document.getElementById("peopleTableOverlay");
const attTableOverlay = document.getElementById("attTableOverlay");

btnRefreshPeople.onclick = () =>
  withTableRefresh({
    btn: btnRefreshPeople,
    overlay: peopleTableOverlay,
    loadFn: loadPeople,
  });

btnRefreshAtt.onclick = () =>
  withTableRefresh({
    btn: btnRefreshAtt,
    overlay: attTableOverlay,
    loadFn: loadAttendance,
  });

const btnExportAtt = document.getElementById("btnExportAtt");
btnExportAtt.onclick = async () => {
  try {
    setButtonLoading(btnExportAtt, true, "Exportando…");
    await exportAttendanceToExcel();
  } catch (e) {
    showToast("Error al exportar", e.message || "No se pudo generar el archivo.", "error");
  } finally {
    setButtonLoading(btnExportAtt, false);
  }
};

initAuth().then((ok) => {
  if (!ok) return;
  loadModels({ modelStatus, modelStatusPill, btnEnroll, btnMark });
  initAwsSyncUi();
});
