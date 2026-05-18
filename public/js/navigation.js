const cameraModule = document.getElementById("cameraModule");
const slotRegister = document.getElementById("slotRegister");
const slotMark = document.getElementById("slotMark");
const navButtons = document.querySelectorAll(".nav-item[data-view]");

const views = {
  viewRegister: document.getElementById("viewRegister"),
  viewPeople: document.getElementById("viewPeople"),
  viewAttendance: document.getElementById("viewAttendance"),
  viewMark: document.getElementById("viewMark"),
};

function mountCamera(viewId) {
  const slot =
    viewId === "viewRegister" ? slotRegister : viewId === "viewMark" ? slotMark : null;
  if (slot) {
    slot.appendChild(cameraModule);
    cameraModule.hidden = false;
  } else {
    cameraModule.hidden = true;
  }
}

export function initNavigation({ onViewChange }) {
  function showView(viewId) {
    navButtons.forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-view") === viewId);
    });
    Object.entries(views).forEach(([id, el]) => {
      const on = id === viewId;
      el.classList.toggle("active", on);
      el.hidden = !on;
    });
    mountCamera(viewId);
    onViewChange?.(viewId);
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.getAttribute("data-view")));
  });

  showView("viewRegister");
  return { showView };
}
