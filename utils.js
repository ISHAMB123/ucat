/* ================================================================== */
/*  SHARED UTILITIES: seeded RNG, pickers, option builders, levels.   */
/*  RAND is a module-private mutable binding that seeded() swaps for   */
/*  a deterministic generator and restores; only the helpers here      */
/*  read it, so it never leaks across modules.                        */
/* ================================================================== */

let RAND = Math.random;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function seeded(seed, fn) { RAND = mulberry32(seed); const out = fn(); RAND = Math.random; return out; }
export const rnd = (min, max) => Math.floor(RAND() * (max - min + 1)) + min;
export const pick = (arr) => arr[Math.floor(RAND() * arr.length)];
export const shuffle = (a) => { const s = [...a]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(RAND() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; };
export const fmt = (ms) => (ms / 1000).toFixed(1) + "s";
export function median(nums) { if (!nums.length) return 0; const s = [...nums].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
export function weightedPick(items, weak, prefix) {
  const weights = items.map((it) => 1 + (weak[prefix + it] || 0) * 1.6);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = RAND() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

/* Two levels only. Hard is the default and runs at real UCAT pace with
   terse, exam-style working. Easy gives more time and leads with the
   strategy so the technique can be learned before it is timed. */
export const LEVELS = {
  hard: { label: "Hard (exam pace)", fMin: 6, fMax: 15, budget: 1.0, spread: 0.1, round: false },
  easy: { label: "Easy (learn the method)", fMin: 2, fMax: 12, budget: 1.5, spread: 0.32, round: true },
};

export function fiveOptions(correct, spread, unit) {
  const seen = new Set();
  const dress = (v) => {
    const n = Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(1));
    return unit ? `${unit.pre || ""}${n.toLocaleString()}${unit.post || ""}` : String(n.toLocaleString());
  };
  const opts = [dress(correct)];
  seen.add(dress(correct));
  const push = (v) => { const s = dress(v); if (!seen.has(s)) { seen.add(s); opts.push(s); return true; } return false; };
  const nudges = [1 + spread, 1 - spread, 1 + spread * 2.1, 1 - spread * 2.1, 1 + spread * 3.4, 1 - spread * 3.4, 1.12, 0.88];
  for (const k of nudges) { if (opts.length >= 5) break; push(correct * k); }
  /* Additive fallback. Multiplicative nudges collapse to one value when
     correct is zero or tiny, which used to loop here forever. Stepping
     by a fixed amount always yields distinct options and terminates. */
  const step = Math.abs(correct) >= 100 ? Math.max(1, Math.round(Math.abs(correct) * 0.05)) : Math.abs(correct) >= 1 ? 1 : 0.1;
  for (let i = 1; opts.length < 5 && i <= 200; i++) {
    if (!push(correct + i * step)) push(correct - i * step);
  }
  return { options: shuffle(opts), answer: dress(correct) };
}

/* Count words in a block of user text. */
export function wordCount(t) { return (t || "").trim().split(/\s+/).filter(Boolean).length; }
