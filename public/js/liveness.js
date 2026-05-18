const EAR_OPEN = 0.26;
const EAR_CLOSED = 0.2;
const SAMPLES = 28;
const INTERVAL_MS = 120;
const MIN_NOSE_MOVE = 0.012;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(eye) {
  const v1 = dist(eye[1], eye[5]);
  const v2 = dist(eye[2], eye[4]);
  const h = dist(eye[0], eye[3]);
  if (h === 0) return EAR_OPEN;
  return (v1 + v2) / (2 * h);
}

function meanEar(det) {
  const p = det.landmarks.positions;
  const left = [36, 37, 38, 39, 40, 41].map((i) => p[i]);
  const right = [42, 43, 44, 45, 46, 47].map((i) => p[i]);
  return (eyeAspectRatio(left) + eyeAspectRatio(right)) / 2;
}

function nosePoint(det) {
  return det.landmarks.positions[30];
}

/**
 * Detección de vida básica: parpadeo o micro-movimiento del rostro (anti-foto estática).
 */
export async function verifyLiveness(video, onProgress) {
  if (typeof faceapi === "undefined") return false;

  let hadOpenEyes = false;
  let blinkDetected = false;
  const noseSamples = [];

  for (let i = 0; i < SAMPLES; i++) {
    onProgress?.(
      i < SAMPLES * 0.4
        ? "Verificando vida… mira a la cámara"
        : "Parpadea o mueve levemente la cabeza"
    );

    const det = await faceapi
      .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks();

    if (det) {
      const ear = meanEar(det);
      if (ear >= EAR_OPEN) hadOpenEyes = true;
      if (hadOpenEyes && ear <= EAR_CLOSED) blinkDetected = true;

      const n = nosePoint(det);
      if (video.videoWidth > 0) {
        noseSamples.push({ x: n.x / video.videoWidth, y: n.y / video.videoHeight });
      }
    }

    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }

  let noseMovement = false;
  if (noseSamples.length >= 4) {
    const xs = noseSamples.map((s) => s.x);
    const ys = noseSamples.map((s) => s.y);
    const rangeX = Math.max(...xs) - Math.min(...xs);
    const rangeY = Math.max(...ys) - Math.min(...ys);
    noseMovement = rangeX + rangeY >= MIN_NOSE_MOVE;
  }

  return blinkDetected || noseMovement;
}
