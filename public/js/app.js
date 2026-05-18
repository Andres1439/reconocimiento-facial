import { initAuth, setupLogout } from "./auth-client.js";
import { initCamera } from "./camera.js";
import { loadModels, getDescriptor, isModelsReady } from "./face-models.js";
import { initNavigation } from "./navigation.js";
import { loadPeople, setupEnroll } from "./people.js";
import { loadAttendance, setupEventTypeSegmented, setupMark } from "./attendance.js";

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

function guardedGetDescriptor(v) {
  if (!isModelsReady()) return Promise.resolve(null);
  return getDescriptor(v);
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

setupMark({
  video,
  markMsg,
  btnMark,
  getDescriptor: guardedGetDescriptor,
  getEventType,
});

document.getElementById("btnRefreshPeople").onclick = loadPeople;
document.getElementById("btnRefreshAtt").onclick = loadAttendance;

initAuth().then((ok) => {
  if (!ok) return;
  loadModels({ modelStatus, modelStatusPill, btnEnroll, btnMark });
});
