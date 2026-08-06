/* ================================================================== */
/*  ON-DEVICE WEBCAM EYE TRACKING                                      */
/*                                                                     */
/*  Uses MediaPipe FaceLandmarker (478 landmarks incl. irises) with a  */
/*  self-hosted model + wasm under /mediapipe, so it runs entirely in  */
/*  the browser under a same-origin security policy. No video frame or */
/*  landmark ever leaves the device. The heavy module is lazy-loaded   */
/*  the first time a candidate turns eye tracking on.                  */
/* ================================================================== */

let loader = null;

export function loadTracker() {
  if (loader) return loader;
  loader = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    /* GPU inference is far lower latency, so the mesh keeps up with the face.
       Fall back to CPU where WebGL is unavailable. */
    try { return await FaceLandmarker.createFromOptions(fileset, opts("GPU")); }
    catch (e) { return await FaceLandmarker.createFromOptions(fileset, opts("CPU")); }
  })().catch((e) => { loader = null; throw e; });
  return loader;
}

/* MediaPipe FaceMesh landmark indices used here. */
const IDX = {
  irisL: 468, irisR: 473,
  lIn: 133, lOut: 33, lTop: 159, lBot: 145,
  rIn: 362, rOut: 263, rTop: 386, rBot: 374,
  /* a light outline for the drawn mesh (eyes + face oval subset) */
  ring: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  eyeL: [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
  eyeR: [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382],
};

/* Turn a raw landmark result into gaze + drawable geometry. All coordinates
   are normalised 0..1 in the video's own (un-mirrored) space. gaze.x/gaze.y
   are board coordinates, already flipped to match a mirrored preview so that
   looking to your right moves the marker to your right. */
export function analyse(result) {
  const faces = result && result.faceLandmarks;
  if (!faces || !faces.length) return null;
  const p = faces[0];
  const irisL = { x: p[IDX.irisL].x, y: p[IDX.irisL].y };
  const irisR = { x: p[IDX.irisR].x, y: p[IDX.irisR].y };

  /* Signed iris offset from each eye's midpoint, in eye-width units. Image
     space, so both eyes share a sign. */
  const off = (iris, inner, outer, top, bot) => {
    const midX = (p[inner].x + p[outer].x) / 2;
    const midY = (p[top].y + p[bot].y) / 2;
    const w = Math.abs(p[outer].x - p[inner].x) || 1e-6;
    const h = Math.abs(p[bot].y - p[top].y) || 1e-6;
    return { x: (iris.x - midX) / w, y: (iris.y - midY) / h };
  };
  const oL = off(irisL, IDX.lIn, IDX.lOut, IDX.lTop, IDX.lBot);
  const oR = off(irisR, IDX.rIn, IDX.rOut, IDX.rTop, IDX.rBot);
  const ox = (oL.x + oR.x) / 2;
  const oy = (oL.y + oR.y) / 2;

  /* Map to a board. Amplify (eye movement is small), clamp, and flip x so it
     reads like a mirror. */
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const gaze = { x: clamp(0.5 - ox * 2.6), y: clamp(0.5 + oy * 2.2) };
  const contact = Math.abs(ox) < 0.09 && Math.abs(oy) < 0.16;

  const box = (ids) => {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const i of ids) { const q = p[i]; if (q.x < x0) x0 = q.x; if (q.y < y0) y0 = q.y; if (q.x > x1) x1 = q.x; if (q.y > y1) y1 = q.y; }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  return {
    pts: p,
    irisL, irisR,
    eyeL: box(IDX.eyeL), eyeR: box(IDX.eyeR),
    ring: IDX.ring.map((i) => p[i]),
    gaze, contact,
  };
}
