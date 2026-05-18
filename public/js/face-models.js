import { MODEL_URL, MODEL_LOAD_TIMEOUT_MS } from "./config.js";
import { verifyLiveness } from "./liveness.js";
import { showToast } from "./ui.js";

let modelsReady = false;

export function isModelsReady() {
  return modelsReady;
}

function modelLoadTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            "Tiempo agotado. Comprueba la conexión a internet."
          )
        ),
      ms
    );
  });
}

export async function loadModels({ modelStatus, modelStatusPill, btnEnroll, btnMark }) {
  try {
    if (typeof faceapi === "undefined") {
      throw new Error("face-api.js no cargó. Revisa la consola (F12) o tu conexión.");
    }
    modelStatus.textContent = "Cargando modelos (1/3)…";
    await Promise.race([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL), // Detectar caras en el video
      modelLoadTimeout(MODEL_LOAD_TIMEOUT_MS),
    ]);
    modelStatus.textContent = "Cargando modelos (2/3)…";
    await Promise.race([
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL), // Detectar landmarks
      modelLoadTimeout(MODEL_LOAD_TIMEOUT_MS),
    ]);
    modelStatus.textContent = "Cargando modelos (3/3)…";
    await Promise.race([
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL), // Convertir caras en vectores
      modelLoadTimeout(MODEL_LOAD_TIMEOUT_MS),
    ]);
    modelsReady = true;
    modelStatus.textContent = "Modelos listos";
    modelStatusPill.setAttribute("data-ready", "true");
    btnEnroll.disabled = false;
    btnMark.disabled = false;
  } catch (e) {
    modelsReady = false;
    modelStatus.textContent = "Error modelos: " + e.message;
    modelStatusPill.setAttribute("data-ready", "false");
    showToast(
      "Modelos no cargados",
      "Puedes usar las tablas del menú. Registro y fichaje necesitan los modelos.",
      "error"
    );
  }
}

export async function getDescriptor(video) {
  const det = await faceapi
    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!det) return null;
  return Array.from(det.descriptor);
}

/** Anti-spoofing: parpadeo o movimiento antes de extraer el descriptor. */
export async function getSecureDescriptor(video, onProgress) {
  const live = await verifyLiveness(video, onProgress);
  if (!live) return { error: "liveness" };
  const descriptor = await getDescriptor(video);
  if (!descriptor) return { error: "face" };
  return { descriptor };
}
