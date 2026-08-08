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

/* Solve an n x n linear system by Gauss-Jordan elimination with partial
   pivoting. Every column is cleared from every other row, so the matrix ends
   diagonal and x[i] = m[i][n] / m[i][i]. Returns null if (near) singular. */
function solveLinear(A, b) {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-9) return null;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/* Feature rows for the two calibration models. Affine (3 terms) is a plane;
   quadratic (6 terms) can bend to correct the curvature a webcam gaze
   estimate has toward the edges of the screen, which is where a linear fit is
   worst. */
const featAffine = (g) => [1, g.x, g.y];
const featQuad = (g) => [1, g.x, g.y, g.x * g.x, g.y * g.y, g.x * g.y];

function fitModel(samples, quad) {
  const feat = quad ? featQuad : featAffine;
  const P = quad ? 6 : 3;
  const fitAxis = (axis) => {
    const S = Array.from({ length: P }, () => new Array(P).fill(0));
    const rhs = new Array(P).fill(0);
    for (const s of samples) {
      const row = feat(s.g);
      const y = s.t[axis];
      for (let i = 0; i < P; i++) { rhs[i] += row[i] * y; for (let j = 0; j < P; j++) S[i][j] += row[i] * row[j]; }
    }
    return solveLinear(S, rhs);
  };
  const cx = fitAxis("x");
  const cy = fitAxis("y");
  if (!cx || !cy) return null;
  return { quad, cx, cy };
}

/* Least-squares fit of the raw gaze estimate to the true on-screen target,
   one independent map per axis. With enough calibration points a quadratic
   fit is used for a tighter, less distorted mapping; with only a handful it
   falls back to affine, and to null when there are too few to fit at all.
   Pass model "affine" or "quad" to force one; the default picks by count.
   samples: [{ g:{x,y}, t:{x,y} }]. */
export function fitCalibration(samples, model = "auto") {
  if (!samples || samples.length < 3) return null;
  let cal;
  if (model === "affine") cal = fitModel(samples, false);
  else if (model === "quad") cal = samples.length >= 6 ? fitModel(samples, true) : null;
  else {
    cal = samples.length >= 8 ? fitModel(samples, true) : null;
    if (!cal) cal = fitModel(samples, false);
  }
  if (!cal) return null;
  /* Record the sampled input range. mapGaze refuses to extrapolate beyond it,
     which is what stops a quadratic map from flying off when the raw gaze
     wanders past the calibrated area (the "dot jumping around" problem). */
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const s of samples) {
    if (s.g.x < xmin) xmin = s.g.x; if (s.g.x > xmax) xmax = s.g.x;
    if (s.g.y < ymin) ymin = s.g.y; if (s.g.y > ymax) ymax = s.g.y;
  }
  cal.range = { xmin, xmax, ymin, ymax };
  return cal;
}

/* Apply a fitted calibration to a raw gaze estimate. */
export function mapGaze(cal, g) {
  if (!cal || !g) return null;
  let gx = g.x, gy = g.y;
  if (cal.range) {
    const r = cal.range;
    const mx = Math.max(0.06, (r.xmax - r.xmin) * 0.2);
    const my = Math.max(0.06, (r.ymax - r.ymin) * 0.2);
    gx = Math.min(r.xmax + mx, Math.max(r.xmin - mx, gx));
    gy = Math.min(r.ymax + my, Math.max(r.ymin - my, gy));
  }
  if (!Number.isFinite(gx) || !Number.isFinite(gy)) return null;
  const row = (cal.quad ? featQuad : featAffine)({ x: gx, y: gy });
  let x = 0, y = 0;
  for (let i = 0; i < row.length; i++) { x += cal.cx[i] * row[i]; y += cal.cy[i] * row[i]; }
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: clamp01(x), y: clamp01(y) };
}

/* ---- Head-pose-aware gaze regression --------------------------------- */
/* The plain 2D map above ties eye position straight to the screen, so any
   head movement drifts it. This model adds head pose and viewing distance to
   the inputs and lets the calibration learn how they couple, which is what
   keeps the estimate steady when the reader shifts, leans or turns a little.
   Sample shape: { ex, ey, yaw, pitch, dist, t:{x,y} }. */
export function gazeFeatures(s) {
  const ex = s.ex || 0, ey = s.ey || 0, yaw = s.yaw || 0, pitch = s.pitch || 0, d = s.dist || 0;
  return [1, ex, ey, ex * ex, ey * ey, yaw, pitch, d];
}

/* Ridge-regularised least squares per axis. Ridge keeps the extra pose terms
   from overfitting the handful of calibration points. Needs >= 8 samples. */
export function fitGaze(samples, lambda = 2e-3) {
  if (!samples || samples.length < 8) return null;
  const rows = samples.map(gazeFeatures);
  const P = rows[0].length;
  const fitAxis = (axis) => {
    const S = Array.from({ length: P }, () => new Array(P).fill(0));
    const rhs = new Array(P).fill(0);
    for (let n = 0; n < samples.length; n++) {
      const row = rows[n], y = samples[n].t[axis];
      for (let i = 0; i < P; i++) { rhs[i] += row[i] * y; for (let j = 0; j < P; j++) S[i][j] += row[i] * row[j]; }
    }
    for (let i = 1; i < P; i++) S[i][i] += lambda; // ridge, never on the bias
    return solveLinear(S, rhs);
  };
  const cx = fitAxis("x"), cy = fitAxis("y");
  if (!cx || !cy) return null;
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const s of samples) {
    if (s.ex < xmin) xmin = s.ex; if (s.ex > xmax) xmax = s.ex;
    if (s.ey < ymin) ymin = s.ey; if (s.ey > ymax) ymax = s.ey;
  }
  return { pose: true, cx, cy, range: { xmin, xmax, ymin, ymax } };
}

/* Apply the head-pose model. The eye-signal part is clamped to the calibrated
   range (as with mapGaze) so it cannot extrapolate and fly off. Returns null
   on any non-finite input or output so the caller can hold the previous gaze
   rather than send the crosshair flying. */
export function mapGazeFeat(model, s) {
  if (!model || !s) return null;
  let ex = s.ex, ey = s.ey;
  if (!Number.isFinite(ex) || !Number.isFinite(ey)) return null;
  if (model.range) {
    const r = model.range;
    const mx = Math.max(0.04, (r.xmax - r.xmin) * 0.25), my = Math.max(0.04, (r.ymax - r.ymin) * 0.25);
    ex = Math.min(r.xmax + mx, Math.max(r.xmin - mx, ex));
    ey = Math.min(r.ymax + my, Math.max(r.ymin - my, ey));
  }
  const f = gazeFeatures({ ...s, ex, ey });
  let x = 0, y = 0;
  for (let i = 0; i < f.length; i++) { x += model.cx[i] * f[i]; y += model.cy[i] * f[i]; }
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: clamp01(x), y: clamp01(y) };
}

/* Median prediction error of a model on held-out feature samples, in screen
   fractions. Used to accept or reject a fresh calibration. */
export function gazeError(model, samples) {
  if (!model || !samples || !samples.length) return Infinity;
  const errs = [];
  for (const s of samples) {
    const m = model.pose ? mapGazeFeat(model, s) : mapGaze(model, { x: s.ex, y: s.ey });
    if (!m) continue;
    errs.push(Math.hypot(m.x - s.t.x, m.y - s.t.y));
  }
  if (!errs.length) return Infinity;
  errs.sort((a, b) => a - b);
  return errs[Math.floor(errs.length / 2)];
}

/* ---- Calibration persistence (versioned, validated) ------------------ */
/* A fitted calibration is a persistent artifact, not transient state: it is
   saved so a returning reader is not asked to recalibrate on every reload or
   new drill. Bump the feature version whenever the tracker's features change,
   so a model made by an older tracker is discarded rather than trusted. */
export const GAZE_FEATURE_VERSION = 3;
export const GAZE_CAL_KEY = "ucat:gazecal";

export function makeCalDoc(model, quality, viewport) {
  return {
    schemaVersion: 1,
    featureVersion: GAZE_FEATURE_VERSION,
    createdAt: Date.now(),
    model,
    quality: quality || {},
    display: viewport ? { width: viewport.width, height: viewport.height } : null,
  };
}

/* Reject anything that is corrupt, from an older tracker, or made for a very
   different screen. Never throws. */
export function isCalibrationUsable(doc, viewport) {
  if (!doc || typeof doc !== "object") return false;
  if (doc.featureVersion !== GAZE_FEATURE_VERSION) return false;
  const m = doc.model;
  if (!m || typeof m !== "object") return false;
  const coeffs = [].concat(m.cx || [], m.cy || []);
  if (!coeffs.length || !coeffs.every((v) => Number.isFinite(v))) return false;
  if (viewport && doc.display && doc.display.width && doc.display.height) {
    const wr = viewport.width / doc.display.width, hr = viewport.height / doc.display.height;
    if (!(wr > 0.75 && wr < 1.34 && hr > 0.75 && hr < 1.34)) return false;
  }
  return true;
}

/* Mean residual of a calibration on its own samples, in screen fractions.
   A rough quality read: below ~0.06 is good, above ~0.12 is loose. */
export function calibrationError(cal, samples) {
  if (!cal || !samples || !samples.length) return 1;
  let sum = 0;
  for (const s of samples) {
    const m = mapGaze(cal, s.g);
    sum += Math.hypot(m.x - s.t.x, m.y - s.t.y);
  }
  return sum / samples.length;
}

/* One-euro filter: smooths the live gaze so a resting eye gives a still dot,
   while a real saccade still moves quickly. Far better than a fixed average,
   which either jitters or lags. Coordinates are 0..1 screen fractions, time in
   milliseconds. Returns an object with filter(point, tMs). */
export function makeSmoother(minCutoff = 0.7, beta = 0.8, dCutoff = 1.0) {
  const alpha = (cutoff, dt) => { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); };
  let xp = null, yp = null, dxp = 0, dyp = 0, tp = null;
  return {
    filter(p, t) {
      if (xp === null) { xp = p.x; yp = p.y; tp = t; return { x: xp, y: yp }; }
      let dt = (t - tp) / 1000; if (!(dt > 0)) dt = 1 / 30; tp = t;
      const ad = alpha(dCutoff, dt);
      const dx = (p.x - xp) / dt, dy = (p.y - yp) / dt;
      dxp += ad * (dx - dxp); dyp += ad * (dy - dyp);
      const ax = alpha(minCutoff + beta * Math.abs(dxp), dt);
      const ay = alpha(minCutoff + beta * Math.abs(dyp), dt);
      xp += ax * (p.x - xp); yp += ay * (p.y - yp);
      return { x: xp, y: yp };
    },
  };
}

/* A per-passage accumulator: a coarse heat grid plus the fixation path,
   both in normalised passage coordinates (0..1). */
export function makeReadLog(cols = 16, rows = 12) {
  return {
    cols, rows,
    grid: new Float32Array(cols * rows),
    path: [],
    add(nx, ny, t) {
      nx = clamp01(nx); ny = clamp01(ny);
      const cx = Math.min(cols - 1, Math.floor(nx * cols));
      const cy = Math.min(rows - 1, Math.floor(ny * rows));
      this.grid[cy * cols + cx] += 1;
      this.path.push({ x: nx, y: ny, t });
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

/* Resample a fixation path to n points evenly spaced along its length, so
   paths of different lengths can be averaged point for point. */
export function resamplePath(pts, n = 24) {
  if (!pts || pts.length < 2) return null;
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = d[d.length - 1];
  if (total <= 1e-6) return null;
  const out = [];
  for (let k = 0; k < n; k++) {
    const target = (k / (n - 1)) * total;
    let i = 1; while (i < d.length && d[i] < target) i++;
    const i0 = i - 1, i1 = Math.min(i, pts.length - 1);
    const seg = d[i1] - d[i0] || 1e-6;
    const t = (target - d[i0]) / seg;
    out.push({ x: pts[i0].x + (pts[i1].x - pts[i0].x) * t, y: pts[i0].y + (pts[i1].y - pts[i0].y) * t });
  }
  return out;
}

/* Running average of resampled paths: the crowd path grows as more
   correct-in-time attempts fold in. Stored as { path, n }. */
export function blendPath(stored, freshResampled) {
  if (!freshResampled) return stored || null;
  if (!stored || !stored.path || stored.path.length !== freshResampled.length) return { path: freshResampled, n: 1 };
  const n = stored.n + 1;
  const path = stored.path.map((p, i) => ({ x: (p.x * stored.n + freshResampled[i].x) / n, y: (p.y * stored.n + freshResampled[i].y) / n }));
  return { path, n };
}

/* The seed "ideal" reading techniques used until enough real correct-in-time
   attempts have been recorded for a passage. Each drill has a small library
   of genuinely different techniques, and a passage picks one by a stable seed
   so different questions coach different approaches (adaptive), not the same
   zig-zag every time. Each has a name and a one-line coaching cue. */
const SCAN_TECH = [
  {
    name: "descending zig-zag",
    cue: "Sweep left to right across a band, drop a line, sweep back. A steady zig-zag down the passage.",
    path: [{ x: 0.08, y: 0.12 }, { x: 0.92, y: 0.2 }, { x: 0.08, y: 0.42 }, { x: 0.92, y: 0.52 }, { x: 0.08, y: 0.74 }, { x: 0.92, y: 0.84 }],
  },
  {
    name: "numbers-first hop",
    cue: "Hunt the figures first: jump down the right of the passage where dates and quantities sit, then read the words around the one that matters.",
    path: [{ x: 0.5, y: 0.1 }, { x: 0.85, y: 0.18 }, { x: 0.8, y: 0.36 }, { x: 0.88, y: 0.54 }, { x: 0.3, y: 0.6 }, { x: 0.82, y: 0.78 }, { x: 0.5, y: 0.9 }],
  },
  {
    name: "column skim",
    cue: "Run your eyes straight down the left edge to catch the opener of every line, then dip right only where a line looks promising.",
    path: [{ x: 0.12, y: 0.1 }, { x: 0.14, y: 0.34 }, { x: 0.6, y: 0.4 }, { x: 0.13, y: 0.58 }, { x: 0.7, y: 0.66 }, { x: 0.13, y: 0.86 }],
  },
  {
    name: "edges-then-middle",
    cue: "Anchor on the first and last lines for the gist, then close in on the middle where the detail usually hides.",
    path: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.14 }, { x: 0.1, y: 0.9 }, { x: 0.9, y: 0.86 }, { x: 0.12, y: 0.48 }, { x: 0.88, y: 0.52 }],
  },
];
const READ_TECH = [
  {
    name: "line-by-line",
    cue: "Read in order, one line at a time, so no claim gets imported from the wrong place.",
    path: [{ x: 0.06, y: 0.12 }, { x: 0.94, y: 0.17 }, { x: 0.06, y: 0.32 }, { x: 0.94, y: 0.37 }, { x: 0.06, y: 0.52 }, { x: 0.94, y: 0.57 }, { x: 0.06, y: 0.72 }, { x: 0.94, y: 0.77 }, { x: 0.06, y: 0.9 }],
  },
  {
    name: "question-anchored",
    cue: "Read the question first, then go to the band of the passage it points at and read those lines closely before deciding.",
    path: [{ x: 0.1, y: 0.08 }, { x: 0.9, y: 0.12 }, { x: 0.5, y: 0.4 }, { x: 0.1, y: 0.46 }, { x: 0.9, y: 0.52 }, { x: 0.1, y: 0.6 }, { x: 0.9, y: 0.64 }, { x: 0.4, y: 0.9 }],
  },
  {
    name: "skim then deep-read",
    cue: "Take one fast pass top to bottom for the shape of the argument, then a careful second pass on the load-bearing sentences.",
    path: [{ x: 0.1, y: 0.1 }, { x: 0.8, y: 0.3 }, { x: 0.2, y: 0.55 }, { x: 0.85, y: 0.85 }, { x: 0.06, y: 0.14 }, { x: 0.94, y: 0.2 }, { x: 0.06, y: 0.5 }, { x: 0.94, y: 0.56 }, { x: 0.06, y: 0.88 }],
  },
];

/* Pick the technique for a drill and seed. The seed makes the choice stable
   per passage while varying across passages. */
export function idealTechnique(drill, seed = 0) {
  const lib = drill === "scan" ? SCAN_TECH : READ_TECH;
  const i = ((Math.trunc(seed) % lib.length) + lib.length) % lib.length;
  const t = lib[i];
  return { name: t.name, cue: t.cue, path: resamplePath(t.path, 24) };
}

/* Back-compatible: just the resampled seed path. */
export function idealPath(drill, seed = 0) {
  return idealTechnique(drill, seed).path;
}

/* Stable numeric seed for a passage, from its text. */
export function seedFromText(text) {
  let h = 0;
  const s = (text || "").slice(0, 400);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/* Stable local-storage key for a passage, from its text. */
export function pathKey(text) {
  return "rgpath:" + seedFromText(text).toString(36);
}

/* ---- Locating the line that actually answers the question ---------- */
/* So the review can highlight the relevant line and time when the reader's
   eyes reached it. Precise when the question carries an explicit evidence
   quote (inference) or the literal answer appears in the passage (scanning),
   otherwise the sentence with the most word overlap with the question. */
const STOP = new Set("the a an of to in on at and or but for with as is are was were be been being by that this these those it its it's from than then so which who whom whose into over under about above below between after before during it their they them he she his her our your not no".split(" "));
const wordsOf = (s) => (String(s || "").toLowerCase().match(/[a-z0-9]+/g) || []);
const splitSentences = (t) => (String(t || "").match(/[^.!?]+[.!?]+/g) || [String(t || "")]).map((s) => s.trim()).filter(Boolean);

function expandToSentence(text, start, end) {
  let a = start, b = end;
  while (a > 0 && !/[.!?]/.test(text[a - 1])) a--;
  while (a < text.length && /\s/.test(text[a])) a++;
  while (b < text.length && !/[.!?]/.test(text[b - 1])) b++;
  return { start: a, end: b };
}

function findLiteral(text, needle) {
  const n = String(needle || "").trim();
  if (!n) return null;
  const i = text.toLowerCase().indexOf(n.toLowerCase());
  return i < 0 ? null : { start: i, end: i + n.length };
}

/* Returns { start, end } char offsets into passageText, or null. */
export function locateEvidence(passageText, q) {
  const text = String(passageText || "");
  if (!text || !q) return null;
  let span = findLiteral(text, q.evidence);
  if (span) return expandToSentence(text, span.start, span.end);
  if (typeof q.answer === "string") {
    span = findLiteral(text, q.answer);
    if (span) return expandToSentence(text, span.start, span.end);
  }
  const key = new Set(wordsOf(q.stem || q.prompt).concat(typeof q.answer === "string" ? wordsOf(q.answer) : []).filter((w) => w.length > 2 && !STOP.has(w)));
  if (!key.size) return null;
  const sentences = splitSentences(text);
  let best = null, bestScore = 0, pos = 0;
  for (const s of sentences) {
    const start = text.indexOf(s, pos); if (start < 0) continue; pos = start + s.length;
    let score = 0; for (const w of new Set(wordsOf(s))) if (key.has(w)) score++;
    if (score > bestScore) { bestScore = score; best = { start, end: start + s.length }; }
  }
  return bestScore > 0 ? best : null;
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
    if (drill === "infer" || drill === "reading") {
      tips.push("For an inference question, read the first and last sentence before anything else: the passage usually sets up its claim at the start and resolves it at the end, so the two together often frame the answer.");
    }
    if (a.sweepRatio > 2.2) tips.push("Your eyes jumped around the passage. For comprehension, read in order, line by line, so you do not import a claim from the wrong place.");
  }
  if (tips.length < 3) tips.push(`Your gaze was lightest on the ${weak} of the passage, so that is where to slow down next time.`);
  return tips.slice(0, 3);
}
