import { showToast } from "./ui.js";

let stream = null;

export function initCamera({ video, btnCam, btnStop, camMsg }) {
  btnCam.onclick = async () => {
    camMsg.textContent = "";
    camMsg.className = "msg";
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      video.srcObject = stream;
    } catch (e) {
      camMsg.textContent = "No se pudo abrir la cámara: " + e.message;
      camMsg.className = "msg err";
      showToast("Cámara no disponible", e.message, "error");
    }
  };

  btnStop.onclick = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
    }
  };

  return { getVideo: () => video };
}
