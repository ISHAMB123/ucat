/* ================================================================== */
/*  ON-DEVICE READING GAZE ANALYSIS (Verbal Reasoning drills)          */
/*                                                                     */
/*  eyetrax (github.com/ck-zhang/eyetrax) is a Python library and      */
/*  cannot run in a browser, so this reuses the same idea in the       */
/*  browser: the MediaPipe face tracker from eyetrack.js gives a raw   */
/*  gaze estimate, a short dot calibration fits it to the screen, and  */
/*  we accumulate a heat grid + fixation path over the passage box.    */
/*  At the end we score the reading pattern and turn it into tips.     */
/*                                                                     */
/*  Precision note: a webcam gaze estimate is accurate to roughly a    */
/*  centimetre or two, far coarser than a single word. Everything here */
/*  is deliberately region-level (thirds of the passage), never a      */
/*  claim about an individual word. Nothing leaves the device.         */
/* ================================================================== */

import { loadTracker, analyse } from "./eyetrack.js";
export { loadTracker, analyse };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Solve a 3x3 linear system by Gaussian elimination with partial
   pivoting. Returns null if the system is (near) singular. */
function solve3(A, b) {
  const m = [[A[0][0], A[0][1], A[0][2], b[0]], [A[1][0], A[1][1], A[1][2], b[1]], [A[2][0], A[2][1], A[2][2], b[2]]];
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-9) return null;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k];
    }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}

/* Least-squares affine fit of the raw gaze estimate (0..1) to the true
   on-screen target (0..1), one independent 3-parameter map per axis:
   sx = a*gx + b*gy + c. samples: [{ g:{x,y}, t:{x,y} }]. */
export function fitCalibration(samples) {
  if (!samples || samples.length < 3) return null;
  const normal = (axis) => {
    const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const rhs = [0, 0, 0];
    for (const s of samples) {
      const row = [s.g.x, s.g.y, 1];
      const y = s.t[axis];
      for (let i = 0; i < 3; i++) { rhs[i] += row[i] * y; for (let j = 0; j < 3; j++) S[i][j] += row[i] * row[j]; }
    }
    return solve3(S, rhs);
  };
  const ax = normal("x");
  const ay = normal("y");
  if (!ax || !ay) return null;
  return { ax, ay };
}

/* Apply a fitted calibration to a raw gaze estimate. */
export function mapGaze(cal, g) {
  if (!cal || !g) return null;
  const x = cal.ax[0] * g.x + cal.ax[1] * g.y + cal.ax[2];
  const y = cal.ay[0] * g.x + cal.ay[1] * g.y + cal.ay[2];
  return { x: clamp01(x), y: clamp01(y) };
}

/* A per-passage accumulator: a coarse heat grid plus the fixation path,
   both in normalised passage coordinates (0..1). */
export function makeReadLog(cols = 16, rows = 12) {
  return {
    cols, rows,
    grid: new Float32Array(cols * rows),
    path: [],
    add(nx, ny) {
      nx = clamp01(nx); ny = clamp01(ny);
      const cx = Math.min(cols - 1, Math.floor(nx * cols));
      const cy = Math.min(rows - 1, Math.floor(ny * rows));
      this.grid[cy * cols + cx] += 1;
      this.path.push({ x: nx, y: ny });
    },
  };
}

/* Turn a read log into coarse, honest metrics. Returns null when too
   little gaze landed on the passage to say anything. */
export function analyseReading(logObj) {
  if (!logObj) return null;
  const { cols, rows, grid, path } = logObj;
  let total = 0;
  for (let k = 0; k < grid.length; k++) total += grid[k];
  if (total < 8 || path.length < 8) return null;

  let visited = 0;
  for (let k = 0; k < grid.length; k++) if (grid[k] > 0) visited++;
  const coverage = visited / grid.length;

  /* Dwell in each vertical third of the passage. */
  const bands = [0, 0, 0];
  for (let y = 0; y < rows; y++) {
    const band = Math.min(2, Math.floor((y / rows) * 3));
    for (let x = 0; x < cols; x++) bands[band] += grid[y * cols + x];
  }
  for (let i = 0; i < 3; i++) bands[i] /= total;
  let weakBandIdx = 0;
  for (let i = 1; i < 3; i++) if (bands[i] < bands[weakBandIdx]) weakBandIdx = i;

  /* Horizontal sweep vs vertical travel. A high ratio means broad
     left-right scanning (good for the Scanning drill); a low ratio means
     the eyes crawled straight down word by word. */
  let sdx = 0, sdy = 0, reversals = 0, lastDir = 0;
  for (let k = 1; k < path.length; k++) {
    const dx = path[k].x - path[k - 1].x;
    const dy = path[k].y - path[k - 1].y;
    sdx += Math.abs(dx); sdy += Math.abs(dy);
    const dir = Math.sign(dx);
    if (dir && lastDir && dir !== lastDir) reversals++;
    if (dir) lastDir = dir;
  }
  const sweepRatio = sdx / (sdy + 1e-6);
  const downward = path[path.length - 1].y - path[0].y;
  return { coverage, bands, weakBandIdx, sweepRatio, reversals, downward, total, points: path.length };
}

const BAND = ["top", "middle", "bottom"];

/* Coach the reading pattern. Region-level only. `drill` is the drill id
   (scan / tfc / reading / infer). Returns up to three tips. */
export function readingTips(a, drill) {
  if (!a) return ["Not enough gaze landed on the passage to read your pattern. Sit square to the camera, keep your whole face in frame, and try the calibration again."];
  const weak = BAND[a.weakBandIdx];
  const tips = [];
  if (drill === "scan") {
    tips.push(a.sweepRatio > 1.4
      ? "Good. Your eyes swept across the lines rather than crawling word by word. Keep that broad zig-zag going."
      : "Scan in a zig-zag: sweep left to right across a band, drop down, sweep back. You moved too straight down the page, which is slow reading, not scanning.");
    tips.push("Read the question first and hunt for the shape of the answer, a number or a name, before a single word of prose. Go for numbers before words.");
    if (a.coverage < 0.45) tips.push(`You reached only part of the passage and barely touched the ${weak}. The one fact you are hunting often sits in the region you skipped.`);
  } else {
    tips.push(a.coverage < 0.5
      ? `You concentrated on part of the passage and gave little to the ${weak}. True, false and can't tell answers hide in the exact lines that get skimmed.`
      : "Solid coverage of the passage. Now slow the load-bearing sentences: can't tell is missed when a skimmed line is assumed rather than actually read.");
    if (a.sweepRatio > 2.2) tips.push("Your eyes jumped around the passage. For comprehension, read in order, line by line, so you do not import a claim from the wrong place.");
  }
  if (tips.length < 3) tips.push(`Your gaze was lightest on the ${weak} of the passage, so that is where to slow down next time.`);
  return tips.slice(0, 3);
}
