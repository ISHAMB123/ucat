import { describe, it, expect } from "vitest";
import { fitCalibration, mapGaze, fitGaze, mapGazeFeat, gazeFeatures, gazeError, calibrationError, makeSmoother, makeReadLog, analyseReading, readingTips, resamplePath, blendPath, idealPath, idealTechnique, seedFromText, pathKey, locateEvidence, makeCalDoc, isCalibrationUsable, GAZE_FEATURE_VERSION } from "../eyeread.js";

describe("fitCalibration recovers a linear gaze-to-screen map", () => {
  it("recovers an identity map from clean samples", () => {
    const pts = [
      { g: { x: 0.1, y: 0.1 }, t: { x: 0.1, y: 0.1 } },
      { g: { x: 0.9, y: 0.1 }, t: { x: 0.9, y: 0.1 } },
      { g: { x: 0.5, y: 0.5 }, t: { x: 0.5, y: 0.5 } },
      { g: { x: 0.1, y: 0.9 }, t: { x: 0.1, y: 0.9 } },
      { g: { x: 0.9, y: 0.9 }, t: { x: 0.9, y: 0.9 } },
    ];
    const cal = fitCalibration(pts);
    expect(cal).not.toBeNull();
    const m = mapGaze(cal, { x: 0.5, y: 0.5 });
    expect(m.x).toBeCloseTo(0.5, 2);
    expect(m.y).toBeCloseTo(0.5, 2);
  });

  it("corrects a compressed, offset raw estimate", () => {
    /* Raw gaze only spans 0.3..0.7 but the true target spans 0..1. */
    const f = (v) => 0.3 + v * 0.4;
    const pts = [
      { g: { x: f(0), y: f(0) }, t: { x: 0, y: 0 } },
      { g: { x: f(1), y: f(0) }, t: { x: 1, y: 0 } },
      { g: { x: f(0), y: f(1) }, t: { x: 0, y: 1 } },
      { g: { x: f(1), y: f(1) }, t: { x: 1, y: 1 } },
    ];
    const cal = fitCalibration(pts);
    const m = mapGaze(cal, { x: f(0.5), y: f(0.25) });
    expect(m.x).toBeCloseTo(0.5, 1);
    expect(m.y).toBeCloseTo(0.25, 1);
  });

  it("returns null with too few points", () => {
    expect(fitCalibration([{ g: { x: 0, y: 0 }, t: { x: 0, y: 0 } }])).toBeNull();
    expect(fitCalibration([])).toBeNull();
  });

  it("clamps mapped output to the unit square", () => {
    const cal = fitCalibration([
      { g: { x: 0, y: 0 }, t: { x: 0, y: 0 } },
      { g: { x: 1, y: 0 }, t: { x: 1, y: 0 } },
      { g: { x: 0, y: 1 }, t: { x: 0, y: 1 } },
    ]);
    const m = mapGaze(cal, { x: 5, y: -5 });
    expect(m.x).toBe(1);
    expect(m.y).toBe(0);
  });

  it("fits a quadratic map from a 9-point grid and beats affine on a curved signal", () => {
    /* A curved raw->true relationship a plane cannot represent, kept inside
       the unit square so nothing is lost to the output clamp. */
    const warp = (v) => 0.3 * v * v + 0.7 * v;
    const grid = [0, 0.5, 1];
    const samples = [];
    for (const gx of grid) for (const gy of grid) samples.push({ g: { x: gx, y: gy }, t: { x: warp(gx), y: warp(gy) } });
    const quad = fitCalibration(samples);
    expect(quad.quad).toBe(true);
    const affine = fitCalibration(samples, "affine");
    /* On a held-out point the quadratic should be markedly closer to truth. */
    const held = { x: 0.25, y: 0.75 };
    const truth = { x: warp(0.25), y: warp(0.75) };
    const qm = mapGaze(quad, held), am = mapGaze(affine, held);
    const qErr = Math.hypot(qm.x - truth.x, qm.y - truth.y);
    const aErr = Math.hypot(am.x - truth.x, am.y - truth.y);
    expect(qErr).toBeLessThan(aErr);
    expect(qErr).toBeLessThan(0.02);
    expect(calibrationError(quad, samples)).toBeLessThan(0.01);
  });
});

describe("locateEvidence finds the answer line", () => {
  const passage = "The reservoir was completed in 1934. At its opening it held 6.2 million cubic metres. A survey published in 2011 found the wall had shifted. The reservoir is not used for recreation.";

  it("uses an explicit evidence quote", () => {
    const span = locateEvidence(passage, { evidence: "held 6.2 million cubic metres" });
    expect(span).not.toBeNull();
    const found = passage.slice(span.start, span.end);
    expect(found).toContain("6.2 million cubic metres");
    /* Expanded to the whole sentence. */
    expect(found).toContain("At its opening");
  });

  it("falls back to the literal answer when present", () => {
    const span = locateEvidence(passage, { answer: "2011" });
    expect(passage.slice(span.start, span.end)).toContain("2011");
  });

  it("falls back to keyword overlap when neither is present", () => {
    const span = locateEvidence(passage, { stem: "Is the reservoir used for recreation?" });
    expect(passage.slice(span.start, span.end).toLowerCase()).toContain("recreation");
  });

  it("returns null when nothing matches", () => {
    expect(locateEvidence("", { evidence: "x" })).toBeNull();
    expect(locateEvidence(passage, {})).toBeNull();
  });
});

describe("makeReadLog records timestamps", () => {
  it("stores the time passed to add", () => {
    const log = makeReadLog();
    log.add(0.5, 0.5, 1200);
    expect(log.path[0].t).toBe(1200);
  });
});

describe("fitGaze uses head pose to stay steady", () => {
  /* A ground-truth mapping where the SAME eye position lands on a different
     screen point once the head turns: screen depends on eye signal AND yaw.
     A pose-blind fit cannot represent that; fitGaze can. */
  const trueX = (ex, yaw) => 0.5 + 0.8 * ex + 0.5 * yaw;
  const trueY = (ey, pitch) => 0.5 + 0.8 * ey + 0.5 * pitch;

  it("recovers a mapping that depends on head pose", () => {
    /* Pose varies independently of eye position, so the fit must genuinely
       separate the two to recover the mapping. */
    const samples = [];
    const grid = [-0.2, 0, 0.2];
    const poses = [-0.2, 0.2];
    for (const ex of grid) for (const ey of grid) for (const yaw of poses) {
      const pitch = -yaw;
      samples.push({ ex, ey, yaw, pitch, dist: 0.3, t: { x: trueX(ex, yaw), y: trueY(ey, pitch) } });
    }
    const model = fitGaze(samples, 1e-6);
    expect(model).not.toBeNull();
    expect(model.pose).toBe(true);
    /* A held-out reading: same eye position, head turned differently. */
    const held = { ex: 0.1, ey: -0.1, yaw: 0.15, pitch: -0.1, dist: 0.3 };
    const m = mapGazeFeat(model, held);
    expect(m.x).toBeCloseTo(trueX(0.1, 0.15), 1);
    expect(m.y).toBeCloseTo(trueY(-0.1, -0.1), 1);
  });

  it("gazeFeatures has a stable length and fitGaze needs enough points", () => {
    expect(gazeFeatures({ ex: 0.1, ey: 0.2, yaw: 0, pitch: 0, dist: 0.3 })).toHaveLength(8);
    expect(fitGaze([{ ex: 0, ey: 0, t: { x: 0, y: 0 } }])).toBeNull();
  });

  it("mapGazeFeat clamps the eye signal so it cannot fly off", () => {
    const samples = [];
    const grid = [-0.2, 0, 0.2];
    for (const ex of grid) for (const ey of grid) samples.push({ ex, ey, yaw: 0, pitch: 0, dist: 0.3, t: { x: 0.5 + ex, y: 0.5 + ey } });
    const model = fitGaze(samples);
    const wild = mapGazeFeat(model, { ex: 9, ey: -9, yaw: 0, pitch: 0, dist: 0.3 });
    expect(wild.x).toBeGreaterThanOrEqual(0);
    expect(wild.x).toBeLessThanOrEqual(1);
    expect(wild.y).toBeGreaterThanOrEqual(0);
    expect(wild.y).toBeLessThanOrEqual(1);
  });
});

describe("calibration is a persistent, validated artifact", () => {
  const model = { pose: true, cx: [0.5, 0.8, 0, 0, 0, 0, 0, 0], cy: [0.5, 0, 0.8, 0, 0, 0, 0, 0], range: { xmin: -0.2, xmax: 0.2, ymin: -0.2, ymax: 0.2 } };
  const vp = { width: 1280, height: 800 };

  it("accepts a fresh, matching document", () => {
    const doc = makeCalDoc(model, { heldErr: 0.05, n: 13 }, vp);
    expect(doc.featureVersion).toBe(GAZE_FEATURE_VERSION);
    expect(isCalibrationUsable(doc, vp)).toBe(true);
  });

  it("rejects an older tracker version", () => {
    const doc = makeCalDoc(model, {}, vp);
    doc.featureVersion = GAZE_FEATURE_VERSION - 1;
    expect(isCalibrationUsable(doc, vp)).toBe(false);
  });

  it("rejects corrupt or non-finite coefficients", () => {
    expect(isCalibrationUsable(null, vp)).toBe(false);
    expect(isCalibrationUsable({ featureVersion: GAZE_FEATURE_VERSION, model: { cx: [NaN], cy: [1] } }, vp)).toBe(false);
    expect(isCalibrationUsable({ featureVersion: GAZE_FEATURE_VERSION, model: {} }, vp)).toBe(false);
  });

  it("rejects a wildly different screen", () => {
    const doc = makeCalDoc(model, {}, { width: 400, height: 900 });
    expect(isCalibrationUsable(doc, vp)).toBe(false);
  });

  it("gazeError falls to Infinity with no samples and is finite otherwise", () => {
    expect(gazeError(model, [])).toBe(Infinity);
    const e = gazeError(model, [{ ex: 0.1, ey: 0.1, yaw: 0, pitch: 0, dist: 0.3, t: { x: 0.58, y: 0.58 } }]);
    expect(Number.isFinite(e)).toBe(true);
  });
});

describe("makeSmoother steadies the live gaze", () => {
  it("converges to a held point and reduces jitter", () => {
    const s = makeSmoother();
    let t = 0, out;
    for (let i = 0; i < 20; i++) { out = s.filter({ x: 0.5, y: 0.5 }, (t += 33)); }
    expect(out.x).toBeCloseTo(0.5, 2);
    expect(out.y).toBeCloseTo(0.5, 2);
  });

  it("lags a sudden jump rather than teleporting", () => {
    const s = makeSmoother();
    let t = 0;
    for (let i = 0; i < 10; i++) s.filter({ x: 0.2, y: 0.2 }, (t += 33));
    const out = s.filter({ x: 0.8, y: 0.2 }, (t += 33));
    /* First frame after the jump should be between the old and new position. */
    expect(out.x).toBeGreaterThan(0.2);
    expect(out.x).toBeLessThan(0.8);
  });
});

describe("analyseReading scores coverage and pattern", () => {
  it("returns null with too little data", () => {
    const log = makeReadLog();
    log.add(0.5, 0.5);
    expect(analyseReading(log)).toBeNull();
  });

  it("detects a broad zig-zag scan (high sweep ratio)", () => {
    const log = makeReadLog();
    for (let row = 0; row < 6; row++) {
      const y = (row + 0.5) / 6;
      for (let x = 0; x <= 1.0001; x += 0.1) log.add(row % 2 ? 1 - x : x, y);
    }
    const a = analyseReading(log);
    expect(a).not.toBeNull();
    expect(a.sweepRatio).toBeGreaterThan(1.4);
    expect(a.coverage).toBeGreaterThan(0.3);
    const tips = readingTips(a, "scan");
    expect(tips[0]).toMatch(/zig-zag|swept/i);
  });

  it("flags a straight vertical crawl (low sweep ratio) and a skipped bottom", () => {
    const log = makeReadLog();
    /* Gaze crawls down the same column across the top and middle only, so
       the bottom third is uniquely the least-dwelt band. */
    for (let k = 0; k < 40; k++) log.add(0.5 + (k % 2) * 0.01, (k / 40) * 0.6);
    const a = analyseReading(log);
    expect(a.sweepRatio).toBeLessThan(1.4);
    expect(a.weakBandIdx).toBe(2); // bottom got no dwell
    const tips = readingTips(a, "scan");
    expect(tips.join(" ")).toMatch(/zig-zag|numbers before words/i);
  });

  it("gives comprehension-specific tips for tfc", () => {
    const log = makeReadLog();
    for (let k = 0; k < 30; k++) log.add(0.4 + (k % 3) * 0.05, 0.1 + (k % 4) * 0.05);
    const tips = readingTips(analyseReading(log), "tfc");
    expect(tips.join(" ")).toMatch(/can't tell|coverage|passage/i);
  });
});

describe("path resampling and crowd averaging", () => {
  it("resamples to a fixed length along a diagonal", () => {
    const r = resamplePath([{ x: 0, y: 0 }, { x: 1, y: 1 }], 5);
    expect(r).toHaveLength(5);
    expect(r[0]).toEqual({ x: 0, y: 0 });
    expect(r[4].x).toBeCloseTo(1, 6);
    expect(r[2].x).toBeCloseTo(0.5, 6);
  });

  it("returns null for degenerate paths", () => {
    expect(resamplePath([{ x: 0.5, y: 0.5 }], 4)).toBeNull();
    expect(resamplePath([{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }], 4)).toBeNull();
  });

  it("blendPath averages two runs and counts them", () => {
    const a = resamplePath([{ x: 0, y: 0 }, { x: 1, y: 0 }], 4);
    const b = resamplePath([{ x: 0, y: 1 }, { x: 1, y: 1 }], 4);
    const s1 = blendPath(null, a);
    expect(s1.n).toBe(1);
    const s2 = blendPath(s1, b);
    expect(s2.n).toBe(2);
    expect(s2.path[0].y).toBeCloseTo(0.5, 6); // mean of y=0 and y=1
  });

  it("idealPath gives a resampled seed and pathKey is stable", () => {
    expect(idealPath("scan")).toHaveLength(24);
    expect(idealPath("tfc")).toHaveLength(24);
    expect(pathKey("A passage")).toBe(pathKey("A passage"));
    expect(pathKey("A passage")).not.toBe(pathKey("Different"));
  });

  it("idealTechnique is adaptive: different seeds pick different techniques", () => {
    const t = idealTechnique("scan", 0);
    expect(t.path).toHaveLength(24);
    expect(typeof t.name).toBe("string");
    expect(typeof t.cue).toBe("string");
    /* Across a run of seeds the scan library should yield more than one
       distinct technique, so different questions coach different approaches. */
    const names = new Set();
    for (let s = 0; s < 8; s++) names.add(idealTechnique("scan", s).name);
    expect(names.size).toBeGreaterThan(1);
    /* Comprehension drills draw from their own library, not the scan one. */
    expect(idealTechnique("tfc", 1).name).not.toBe("");
  });

  it("seedFromText is stable per text and the same seed is reproducible", () => {
    expect(seedFromText("A passage")).toBe(seedFromText("A passage"));
    expect(seedFromText("A passage")).not.toBe(seedFromText("Different"));
    const s = seedFromText("A passage");
    expect(idealTechnique("scan", s).name).toBe(idealTechnique("scan", s).name);
  });
});
