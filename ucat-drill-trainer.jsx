import React, { useState, useEffect, useRef, useCallback } from "react";
import { getJSON, setJSON, getSharedJSON, setSharedJSON, sharedIsGlobal, exportLocalData, deleteLocalData } from "./storage.js";
import { supabase, supabaseEnabled } from "./supabaseClient.js";
import {
  PRIVACY, TERMS, DISCLAIMER, STORAGE_NOTICE, CONSENT,
  MARKING_DISCLOSURE, fillLegal, legalPlaceholdersPending,
} from "./legalContent.js";
import { CSS } from "./styles.js";
import { seeded, rnd, pick, shuffle, fmt, median, weightedPick, LEVELS, fiveOptions, wordCount, cleanName } from "./utils.js";
import { PASSAGES, TFC, TFC_SETS } from "./data/vr.js";
import { APPROP, IMPORT, SJT_THEMES, SJT_TYPES, SJT_SCENARIOS, SJT_LESSONS } from "./data/sjt.js";
import { DM_QUESTIONS, VCTX, SYLL_SETS } from "./data/dm.js";
import { DATA_CHECKED, UNIS, GRAD_ENTRY, INTL, AU_DENT, AU_MED, AU_BANDS, MED_UNIS } from "./data/universities.js";
import { MED_SCHOOLS, MED_CHECKED } from "./data/medicine.js";
import { IV_THEMES, MED_IV, UNI_IV, IV_SAMPLES } from "./data/interview.js";
import { PS_TOTAL, PS_SECTIONS, PS_FRAMES, PS_HOWTO, PS_ROUTER } from "./data/statement.js";
import { GUIDE, GUIDE_META, GUIDE_ORDER, EXAM_FORMAT } from "./data/guide.js";
import { markAnswer, analyseAnswer, analyseDelivery, fillerAdvice, checkGeneric, MODEL_SKELETON, STARR_STEPS } from "./engine/marking.js";
import { WorkDiagram, BrandMark, ExitGuard, LastChecked, MarkingNotice, SiteDisclaimer, Monogram, Locked } from "./components/ui.jsx";

/* ================================================================== */
/*  TEMPO, a UCAT trainer.                                             */
/*  Exam format facts follow the UCAT Consortium's published spec.     */
/*  Every passage, scenario, question and explanation is original,     */
/*  reasoned from GMC Good Medical Practice principles.                */
/* ================================================================== */

/* ------------------------------ VR PASSAGES ----------------------- */


/* ------------------------------ VR: TRUE / FALSE / CAN'T TELL ------ */
/* The signature VR format: 11 passages, 4 statements each, three     */
/* options. All statements original, written against our own          */
/* passages. Can't Tell is the most-missed answer in the real exam.   */


/* Strict no-repeat. Every item in a finite bank carries a stable key.
   Serve only keys the learner has not seen; a question shown once is not
   shown again. Only when the whole bank is exhausted does it cycle, and
   the caller then resets that bank's seen set so a fresh cycle begins.
   `cycled` on the returned batch flags that the bank had run out. */
function pickUnseen(all, seen, n) {
  const unseen = all.filter((x) => !seen || !seen[x.key]);
  if (unseen.length >= n) return { chosen: shuffle(unseen).slice(0, n), cycled: false };
  const rest = shuffle(all.filter((x) => seen && seen[x.key]));
  return { chosen: shuffle(unseen).concat(rest).slice(0, n), cycled: true };
}

function makeTfc(n, weak, seen) {
  const all = [];
  Object.keys(TFC_SETS).forEach((pid) => {
    const p2 = PASSAGES.find((x) => x.id === pid);
    if (!p2) return;
    TFC_SETS[pid].forEach((item, idx) => all.push({ key: `vr:${pid}#${idx}`, pid, p2, item }));
  });
  if (!all.length) return [];
  const { chosen, cycled } = pickUnseen(all, seen, n);
  const out = chosen.map(({ key, pid, p2, item }) => ({
    kind: "scale", scenarioText: null, passageText: p2.text, passageTitle: p2.title,
    stem: item.t, options: TFC, answer: item.a, typeName: "True, false, can't tell",
    tag: "t" + pid, pid, seenKey: key, section: "VR", drill: "tfc",
    why: item.w,
    diagram: { type: "tfc" },
    improve: "Ask only one question: does the passage itself settle this? True means it says so, False means it contradicts it, Can't tell means it is silent. Watch for swapped absolutes (always, never, sole), invented causes between two true facts, and outside knowledge creeping in.",
  }));
  out.cycled = cycled;
  return out;
}

/* ------------------------------ SJT ------------------------------- */


function sjtBand(pct) {
  if (pct >= 85) return 1;
  if (pct >= 68) return 2;
  if (pct >= 48) return 3;
  return 4;
}

/* ------------------------------ SJT LESSONS ----------------------- */
/* Interactive course. Facts follow the UCAT Consortium's published   */
/* format; all wording and examples are original.                     */


/* ------------------------------ DECISION MAKING ------------------- */
/* Original questions matching the DM families: syllogisms, Venn      */
/* diagrams and probability. Real pacing is roughly a minute each.    */


/* ---- Venn generators: seven real question shapes, endless numbers ---- */


function vTwoText(L) {
  const c = pick(VCTX);
  const onlyA = L.round ? rnd(2, 8) * 5 : rnd(9, 44);
  const both = L.round ? rnd(1, 5) * 5 : rnd(4, 22);
  const onlyB = L.round ? rnd(2, 8) * 5 : rnd(7, 39);
  const neither = L.round ? rnd(1, 5) * 5 : rnd(3, 24);
  const T = onlyA + both + onlyB + neither;
  const ask = pick(["totalA", "onlyB", "neither"]);
  const stem = `${T} ${c.unit} were surveyed. ${onlyA} ${c.verb} only ${c.la.toLowerCase()}. ${both} ${c.verb} both ${c.la.toLowerCase()} and ${c.lb.toLowerCase()}. ${ask === "onlyB" ? `${neither} ${c.verb} neither.` : `${onlyB} ${c.verb} only ${c.lb.toLowerCase()}.`} How many ${ask === "totalA" ? `${c.verb} ${c.la.toLowerCase()} in total` : ask === "onlyB" ? `${c.verb} only ${c.lb.toLowerCase()}` : `${c.verb} neither`}?`;
  const correct = ask === "totalA" ? onlyA + both : ask === "onlyB" ? onlyB : neither;
  const working = ask === "totalA"
    ? `A circle's total includes its overlap: ${onlyA} + ${both} = ${correct}.`
    : `Everything must sum to ${T}. Known regions: ${onlyA} + ${both} + ${ask === "onlyB" ? neither : onlyB} = ${onlyA + both + (ask === "onlyB" ? neither : onlyB)}. Remainder: ${T} − ${onlyA + both + (ask === "onlyB" ? neither : onlyB)} = ${correct}.`;
  return { stem, correct, working,
    improve: "Sketch two circles, drop each number into its exact region as you read, then either add up a circle (including the overlap) or subtract everything known from the total. All sections plus the outside must equal the total; if they do not, you have double counted." };
}

function vTwoAlgebra(L) {
  const c = pick(VCTX);
  const A = L.round ? rnd(4, 12) : rnd(5, 16);
  const extra = L.round ? pick([4, 6, 10]) : rnd(3, 11);
  const total = 8 * A + extra;
  const ask = pick(["B", "Aall", "neither"]);
  const correct = ask === "B" ? 3 * A : ask === "Aall" ? 5 * A : A + extra;
  const stem = `In a club, twice as many ${c.unit} ${c.verb} only ${c.lb.toLowerCase()} as ${c.verb} both ${c.la.toLowerCase()} and ${c.lb.toLowerCase()}, and twice as many ${c.verb} only ${c.la.toLowerCase()} as ${c.verb} only ${c.lb.toLowerCase()}. ${extra} more ${c.verb} neither than ${c.verb} both. If there are ${total} ${c.unit} altogether, how many ${c.verb} ${ask === "B" ? `${c.lb.toLowerCase()} in total` : ask === "Aall" ? `${c.la.toLowerCase()} in total` : "neither"}?`;
  const working = `Let x = both. Only ${c.lb.toLowerCase()} = 2x, only ${c.la.toLowerCase()} = 4x, neither = x + ${extra}. Sum: 4x + x + 2x + x + ${extra} = 8x + ${extra} = ${total}, so x = ${A}. ${ask === "B" ? `${c.lb} total = x + 2x = 3x = ${correct}.` : ask === "Aall" ? `${c.la} total = 4x + x = 5x = ${correct}.` : `Neither = x + ${extra} = ${correct}.`}`;
  return { stem, correct, working,
    improve: "When every region is described relative to one unknown, name that unknown x, write each region in terms of it, and sum to the total. One equation, one solve. The wrong options are always the other regions, so read exactly which group the question asks for." };
}

function vTwoPct(L) {
  const c = pick(VCTX);
  const T = L.round ? rnd(10, 30) * 10 : rnd(120, 340);
  const bp = pick([10, 15, 20, 25]);
  const both = Math.round((T * bp) / 100);
  const neither = L.round ? rnd(2, 6) * 5 : rnd(8, 40);
  const onlyB = rnd(Math.round(T * 0.1), Math.round(T * 0.3));
  const onlyA = T - both - neither - onlyB;
  if (onlyA < 5) return vTwoPct(L);
  const dA = onlyB + neither;
  const dB = onlyA + neither;
  const stem = `There are ${T} ${c.unit} in a group. ${bp}% of them ${c.verb} both ${c.la.toLowerCase()} and ${c.lb.toLowerCase()}. ${dA} do not ${c.verb} ${c.la.toLowerCase()}, and ${dB} do not ${c.verb} ${c.lb.toLowerCase()}. How many ${c.verb} neither?`;
  const working = `Both = ${bp}% of ${T} = ${both}. 'Do not ${c.verb} ${c.la.toLowerCase()}' covers only-${c.lb.toLowerCase()} plus neither (${dA}); 'do not ${c.verb} ${c.lb.toLowerCase()}' covers only-${c.la.toLowerCase()} plus neither (${dB}). Adding those double counts neither once and covers everything except both: ${dA} + ${dB} + ${both} = ${dA + dB + both}, which exceeds ${T} by exactly neither. Neither = ${dA + dB + both} − ${T} = ${neither}.`;
  return { stem, correct: neither, working,
    improve: "'Don't do X' is a compound region: the other circle's only-section plus the outside. Write both 'don't' statements as region sums, then use the grand total to squeeze out the unknown. Rushing these as single regions is where the marks go." };
}

function vExactlyOne(L) {
  const c = pick(VCTX);
  const both = L.round ? rnd(3, 10) * 2 : rnd(7, 26);
  const k = L.round ? pick([2, 4, 6]) : rnd(2, 9);
  const eOne = L.round ? rnd(8, 20) * 2 : rnd(18, 52);
  const T = eOne + 2 * both + k;
  const ask = pick(["both", "neither"]);
  const correct = ask === "both" ? both : both + k;
  const stem = `A group of ${T} ${c.unit} were asked whether they ${c.verb} ${c.la.toLowerCase()} or ${c.lb.toLowerCase()}. ${eOne} said they ${c.verb} exactly one of the two. The number who ${c.verb} neither was ${k} more than the number who ${c.verb} both. How many ${c.verb} ${ask}?`;
  const working = `Let n = both, so neither = n + ${k}. Regions: exactly-one (${eOne}) + both (n) + neither (n + ${k}) = ${T}. So 2n = ${T} − ${eOne} − ${k} = ${2 * both}, n = ${both}. ${ask === "neither" ? `Neither = ${both} + ${k} = ${correct}.` : `Both = ${both}.`}`;
  return { stem, correct, working,
    improve: "'Exactly one' is the two only-regions combined; do not split it. One unknown, one equation against the total. The classic wrong option is the other of both/neither, so check which one the question wants before answering." };
}

function vThreeOnly(L) {
  const c = pick(VCTX);
  const ab = L.round ? rnd(2, 6) * 2 : rnd(5, 14);
  const ac = 2 * ab;
  const aOnly = L.round ? rnd(3, 9) * 2 : rnd(6, 19);
  const bOnly = L.round ? rnd(4, 10) * 2 : rnd(8, 24);
  const cOnly = L.round ? rnd(5, 12) * 2 : rnd(9, 30);
  const T = aOnly + bOnly + cOnly + ab + ac;
  const totalB = bOnly + ab;
  const totalC = cOnly + ac;
  const stem = `${T} ${c.unit} were asked which of ${c.la.toLowerCase()}, ${c.lb.toLowerCase()} and ${c.lc.toLowerCase()} they ${c.verb}. Everybody ${c.verb} at least one. Nobody ${c.verb} both ${c.lb.toLowerCase()} and ${c.lc.toLowerCase()}. ${ab} only ${c.verb} ${c.la.toLowerCase()} and ${c.lb.toLowerCase()}; twice as many only ${c.verb} ${c.la.toLowerCase()} and ${c.lc.toLowerCase()}. ${aOnly} only ${c.verb} ${c.la.toLowerCase()}, and ${bOnly} only ${c.verb} ${c.lb.toLowerCase()}. How many more ${c.verb} ${c.lc.toLowerCase()} than ${c.lb.toLowerCase()}?`;
  const correct = totalC - totalB;
  const working = `Nobody in ${c.lb.toLowerCase()}-and-${c.lc.toLowerCase()} means those overlaps (including the triple) are zero. ${c.la}-${c.lc} overlap = 2 × ${ab} = ${ac}. Only ${c.lc.toLowerCase()} = ${T} − (${aOnly} + ${bOnly} + ${ab} + ${ac}) = ${cOnly}. ${c.lc} total = ${cOnly} + ${ac} = ${totalC}; ${c.lb} total = ${bOnly} + ${ab} = ${totalB}. Difference = ${correct}.`;
  return { stem, correct, working,
    improve: "Statements like 'nobody did both X and Y' zero out regions, including the triple overlap, and that is usually the unlock. Fill the zeros first, chain the relational clue, find the missing only-region from the total, then compare circle totals, overlaps included." };
}

function vMust(L) {
  const c = pick(VCTX);
  const T = L.round ? rnd(8, 16) * 5 : rnd(47, 96);
  const a = rnd(Math.round(T * 0.4), Math.round(T * 0.75));
  const b = rnd(Math.round(T * 0.12), Math.round(T * 0.35));
  const minBoth = Math.max(0, a + b - T);
  const maxBoth = Math.min(a, b);
  const minN = T - a - b + minBoth;
  const maxN = T - a - b + maxBoth;
  const trueS = `The number who ${c.verb} neither is between ${minN} and ${maxN} inclusive.`;
  const falses = shuffle([
    `Exactly ${maxBoth} ${c.unit} ${c.verb} both.`,
    `Exactly ${a + b > T ? T : a + b} ${c.unit} ${c.verb} at least one of the two.`,
    `More than ${maxN} ${c.unit} ${c.verb} neither.`,
  ]);
  const options = shuffle([trueS, ...falses]);
  return {
    stem: `A group of ${T} ${c.unit} are asked what they ${c.verb}. ${a} say they ${c.verb} ${c.la.toLowerCase()}, and ${b} say they ${c.verb} ${c.lb.toLowerCase()}. Which one of the following MUST be true?`,
    options, answer: trueS,
    working: `Test the extremes. If the ${b} ${c.lb.toLowerCase()} group sits entirely inside the ${c.la.toLowerCase()} group, both = ${maxBoth} and neither = ${maxN}. If the two groups overlap as little as possible, both = ${minBoth} and neither = ${minN}. Anything claiming an exact figure could be true but does not have to be; only the range statement holds in every scenario.`,
    improve: "For MUST-be-true questions, build the two extreme diagrams, maximum overlap and minimum overlap, and read the range off them. Any option asserting one exact value is almost never the answer.",
  };
}

function vRead3(L) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = pick(VCTX);
    const r = {
      a: rnd(3, 14), b: rnd(3, 14), c: rnd(3, 14),
      ab: rnd(1, 8), ac: rnd(1, 8), bc: rnd(1, 8), abc: rnd(1, 6),
      none: rnd(2, 12),
    };
    const totalA = r.a + r.ab + r.ac + r.abc;
    const totalB = r.b + r.ab + r.bc + r.abc;
    const trueTpl = pick([
      { t: `In total, ${totalA} ${c.unit} ${c.verb} ${c.la.toLowerCase()}.`, v: totalA },
      { t: `${r.ab + r.abc} ${c.unit} ${c.verb} both ${c.la.toLowerCase()} and ${c.lb.toLowerCase()}.`, v: r.ab + r.abc },
      { t: `${Math.abs(r.a - r.c)} more ${c.unit} ${c.verb} only ${r.a > r.c ? c.la.toLowerCase() : c.lc.toLowerCase()} than only ${r.a > r.c ? c.lc.toLowerCase() : c.la.toLowerCase()}.`, v: Math.abs(r.a - r.c) },
    ]);
    if (r.a === r.c) continue;
    const falses = [
      `In total, ${r.a} ${c.unit} ${c.verb} ${c.la.toLowerCase()}.`,
      `${r.ab} ${c.unit} ${c.verb} both ${c.la.toLowerCase()} and ${c.lb.toLowerCase()}.`,
      `In total, ${totalB + r.none} ${c.unit} ${c.verb} ${c.lb.toLowerCase()}.`,
    ];
    if (falses.includes(trueTpl.t)) continue;
    return {
      stem: "Based on the diagram, which one of the following statements is true?",
      options: shuffle([trueTpl.t, ...falses]), answer: trueTpl.t,
      venn3: { la: c.la, lb: c.lb, lc: c.lc, ...r },
      working: `Totals include every overlap: ${c.la.toLowerCase()} in total = ${r.a} + ${r.ab} + ${r.ac} + ${r.abc} = ${totalA}, and 'both ${c.la.toLowerCase()} and ${c.lb.toLowerCase()}' = ${r.ab} + ${r.abc} = ${r.ab + r.abc}, because the triple overlap belongs to both. The false options quote a single region as if it were a total, the commonest diagram-reading error.`,
      improve: "Before judging any statement, write a key for the shapes, then ask whether the statement wants one region or a total. 'Both A and B' always includes the middle triple section. Check statements against the diagram one at a time; do not trust your first glance.",
    };
  }
  return vTwoText(L);
}

const VENN_GENS = [vTwoText, vTwoAlgebra, vTwoPct, vExactlyOne, vThreeOnly, vMust, vRead3];

function makeVenn(n, lvl) {
  const L = LEVELS[lvl];
  const out = [];
  for (let i = 0; i < n; i++) {
    const g = pick(VENN_GENS)(L);
    let options, answer;
    if (g.options) { options = g.options; answer = g.answer; }
    else {
      const built = fiveOptions(g.correct, Math.max(L.spread, 0.12), null);
      options = built.options.slice(0, 4);
      if (!options.includes(built.answer)) options[rnd(0, 3)] = built.answer;
      answer = built.answer;
    }
    out.push({ kind: "mcq", stem: g.stem, options, answer, venn3: g.venn3 || null,
      tag: "dvenn", section: "DM", drill: "dm", why: g.working, working: g.working, improve: g.improve });
  }
  return out;
}

/* ---- Syllogism sets: the real format, five conclusions, Yes or No each ---- */


function makeSyllSets() {
  return shuffle(SYLL_SETS).map((set) => ({
    kind: "syllset", section: "DM", drill: "dm", tag: "dsyll",
    scenarioText: set.premises.join(" "),
    stem: "For each conclusion, decide whether it definitely follows from the statements above.",
    statements: set.statements.map((st) => ({ t: st.t, yes: st.yes, why: st.why })),
    improve: "Work statement by statement and ask one question each time: could the premises all be true while this conclusion is false? If you can build that world, answer No. Watch the three classic traps: converse ('all A are B' flipped), some-to-all inflation, and plausible links the premises never actually make.",
  }));
}

/* ---- Probability: generated fresh, answers as reduced fractions ---- */
/* The distractors are the real UCAT traps: comparing one group with the */
/* other, forgetting the box shrinks (with replacement), and giving the  */
/* complement instead of the event. Fractions are always fully reduced.  */

function gcdInt(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
function asFrac(num, den) {
  if (num <= 0) return "0";
  if (num >= den) return "1";
  const g = gcdInt(num, den);
  return `${num / g}/${den / g}`;
}
function fourOpts(correct, distractors) {
  const seen = new Set([correct]);
  const opts = [correct];
  const pad = ["1/2", "1/3", "1/4", "2/3", "3/4", "1/5", "2/5", "3/8", "5/8"];
  for (const d of [...distractors, ...pad]) {
    if (opts.length >= 4) break;
    if (d && !seen.has(d)) { seen.add(d); opts.push(d); }
  }
  return { options: shuffle(opts), answer: correct };
}

const PROB_CTX = [
  { where: "A tray", plural: "swabs", a: "sterile", b: "non-sterile" },
  { where: "A bag", plural: "counters", a: "red", b: "blue" },
  { where: "A rack", plural: "samples", a: "labelled", b: "unlabelled" },
  { where: "A box", plural: "cards", a: "appointment", b: "blank" },
  { where: "A drawer", plural: "vials", a: "full", b: "empty" },
];

function makeProb(n, weak, lvl) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = pick(PROB_CTX);
    const ka = rnd(2, 5), kb = rnd(3, 6), total = ka + kb;
    const kind = lvl === "easy" ? pick(["single", "single", "both"])
      : lvl === "hard" ? pick(["both", "atleast", "atleast"])
        : pick(["single", "both", "atleast"]);
    const den2 = total * (total - 1);
    if (kind === "single") {
      const answer = asFrac(ka, total);
      const built = fourOpts(answer, [asFrac(kb, total), asFrac(ka, total - 1), asFrac(ka - 1, total)]);
      out.push({ kind: "mcq", section: "DM", drill: "dm", tag: "dprob", options: built.options, answer: built.answer,
        stem: `${c.where} holds ${ka} ${c.a} and ${kb} ${c.b} ${c.plural}, identical to the touch. One is taken at random. What is the probability it is ${c.a}?`,
        why: `Favourable over total. There are ${ka} ${c.a} out of ${total} ${c.plural} altogether, so the probability is ${ka}/${total} = ${answer}. The tempting ${asFrac(kb, total)} counts the other group by mistake, and dividing by ${total - 1} forgets to include the drawn item in the total.`,
        improve: "Probability is favourable over total, and the total is every item present, not just the other group. If your denominator is not the whole set, start again." });
    } else if (kind === "both") {
      const answer = asFrac(ka * (ka - 1), den2);
      const built = fourOpts(answer, [asFrac(ka * ka, total * total), asFrac(ka, total), asFrac(ka * (ka - 1), total * total)]);
      out.push({ kind: "mcq", section: "DM", drill: "dm", tag: "dprob", options: built.options, answer: built.answer,
        stem: `${c.where} holds ${ka} ${c.a} and ${kb} ${c.b} ${c.plural}, identical to the touch. Two are drawn at random without replacement. What is the probability that both are ${c.a}?`,
        why: `The draws are dependent. First ${c.a}: ${ka}/${total}. One ${c.a} is now gone, leaving ${ka - 1} of ${total - 1}, so the second is ${ka - 1}/${total - 1}. Multiply: ${ka * (ka - 1)}/${den2} = ${answer}. Treating the draws as independent, ${ka}/${total} twice, is the with-replacement trap.`,
        improve: "Without replacement means the denominator falls by one and the matching count falls too. Multiplying the same fraction twice is the with-replacement error." });
    } else {
      const answer = asFrac(den2 - kb * (kb - 1), den2);
      const built = fourOpts(answer, [asFrac(kb * (kb - 1), den2), asFrac(ka, total), asFrac(total * total - kb * kb, total * total)]);
      out.push({ kind: "mcq", section: "DM", drill: "dm", tag: "dprob", options: built.options, answer: built.answer,
        stem: `${c.where} holds ${ka} ${c.a} and ${kb} ${c.b} ${c.plural}, identical to the touch. Two are drawn at random without replacement. What is the probability that at least one is ${c.a}?`,
        why: `Use the complement. Probability that neither is ${c.a}: first non-${c.a} ${kb}/${total}, then ${kb - 1}/${total - 1}, giving ${kb * (kb - 1)}/${den2}. At least one ${c.a} is one minus that: ${answer}. Counting the favourable pairs directly is slower and where most slips happen.`,
        improve: "For any 'at least one' question, work out the probability of none and subtract from 1. It is nearly always faster than listing the winning cases." });
    }
  }
  return out;
}

/* ---- Logic puzzles: generated, then a brute-force solver keeps only   */
/* the ones with exactly one provable arrangement. A random puzzle can   */
/* come out with zero or several valid answers, so every candidate is    */
/* checked against all 24 orderings before it is ever shown.             */

const SEAT_NAMES = ["Ade", "Bea", "Cai", "Deb", "Eve", "Fin", "Gus", "Hana", "Ivo", "Jo", "Kit", "Lena", "Mo", "Nia"];
function permsOf(nP) {
  const res = [], a = Array.from({ length: nP }, (_, i) => i);
  const rec = (k) => { if (k === nP) { res.push(a.slice()); return; } for (let i = k; i < nP; i++) { [a[k], a[i]] = [a[i], a[k]]; rec(k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
  rec(0);
  return res;
}
const PERMS4 = permsOf(4);

/* Greedily add clues drawn from a known-true arrangement until exactly
   one ordering survives. Returns the surviving clues, or null if the
   attempt did not pin it down tidily. truth[person] = position. */
function pinDown(truth, candidates) {
  const shuffled = shuffle(candidates);
  const used = [];
  let sols = PERMS4;
  for (const cl of shuffled) {
    if (sols.length === 1) break;
    const next = sols.filter(cl.pred);
    if (next.length >= 1 && next.length < sols.length) { used.push(cl); sols = next; }
  }
  if (sols.length === 1 && used.length >= 2 && used.length <= 5) return { sol: sols[0], used };
  return null;
}

function makeSeatPuzzle() {
  const N = 4;
  for (let attempt = 0; attempt < 60; attempt++) {
    const people = shuffle(SEAT_NAMES).slice(0, N);
    const truth = shuffle([0, 1, 2, 3]);
    const cand = [];
    for (let p = 0; p < N; p++) {
      if (truth[p] === 0 || truth[p] === N - 1) cand.push({ txt: `${people[p]} sits at one end of the row.`, pred: (P) => P[p] === 0 || P[p] === N - 1 });
      else cand.push({ txt: `${people[p]} does not sit at either end.`, pred: (P) => P[p] !== 0 && P[p] !== N - 1 });
    }
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (x !== y) {
      if (truth[x] + 1 === truth[y]) cand.push({ txt: `${people[x]} sits immediately to the left of ${people[y]}.`, pred: (P) => P[x] + 1 === P[y] });
      else if (truth[x] < truth[y]) cand.push({ txt: `${people[x]} sits somewhere to the left of ${people[y]}.`, pred: (P) => P[x] < P[y] });
    }
    const pinned = pinDown(truth, cand);
    if (!pinned) continue;
    const sol = pinned.sol;
    const j = rnd(0, N - 1);
    const answer = people[sol.indexOf(j)];
    const order = [0, 1, 2, 3].map((s) => people[sol.indexOf(s)]);
    const clues = shuffle(pinned.used.map((c) => c.txt)).join(" ");
    return { kind: "mcq", section: "DM", drill: "dm", tag: "dlogic", options: shuffle(people), answer,
      stem: `Four colleagues, ${people.join(", ")}, sit in a row of four seats numbered 1 to 4 from left to right. ${clues} Who sits in seat ${j + 1}?`,
      why: `Only one arrangement satisfies every clue. Starting from the most restrictive statement and chaining outward, seats 1 to 4 must be ${order.join(", ")}. That puts ${answer} in seat ${j + 1}.`,
      improve: "Start with the most restrictive clue, usually a fixed seat or an end, and chain outward. Reading the clues in the order given wastes time." };
  }
  return null;
}

function makeHeightPuzzle() {
  const N = 4;
  for (let attempt = 0; attempt < 60; attempt++) {
    const people = shuffle(SEAT_NAMES).slice(0, N);
    const truth = shuffle([0, 1, 2, 3]); /* rank, 0 = tallest */
    const cand = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (x !== y && truth[x] < truth[y]) cand.push({ txt: `${people[x]} is taller than ${people[y]}.`, pred: (P) => P[x] < P[y] });
    const pinned = pinDown(truth, cand);
    if (!pinned) continue;
    const sol = pinned.sol;
    const rankAsked = pick([1, 2]);
    const label = ["tallest", "second tallest", "third tallest", "shortest"][rankAsked];
    const answer = people[sol.indexOf(rankAsked)];
    const order = [0, 1, 2, 3].map((r) => people[sol.indexOf(r)]);
    const clues = shuffle(pinned.used.map((c) => c.txt)).join(" ");
    return { kind: "mcq", section: "DM", drill: "dm", tag: "dlogic", options: shuffle(people), answer,
      stem: `Four students are compared by height, all different. ${clues} Who is the ${label}?`,
      why: `Chain the comparisons into one order, tallest to shortest: ${order.join(", ")}. The ${label} is therefore ${answer}.`,
      improve: "Turn every comparison into a single chain before reading the options. A taller than B and B taller than C becomes one line, and the ranks fall out at a glance." };
  }
  return null;
}

function makeLogic(n, weak, lvl) {
  const statics = shuffle(DM_QUESTIONS.filter((q) => q.tag === "dlogic")).map((q) => ({
    kind: "mcq", stem: q.stem, options: q.options, answer: q.options[q.a], tag: q.tag, section: "DM", drill: "dm", why: q.why, improve: q.improve,
  }));
  const out = [];
  let si = 0, guard = 0;
  while (out.length < n && guard < n * 8) {
    guard++;
    const r = rnd(1, 10);
    let q = r <= 5 ? makeSeatPuzzle() : r <= 9 ? makeHeightPuzzle() : null;
    if (!q && si < statics.length) q = statics[si++];
    if (q) out.push(q);
  }
  while (out.length < n && si < statics.length) out.push(statics[si++]);
  return out.slice(0, n);
}

function makeDm(n, weak, sub, lvl) {
  const L = lvl || "hard";
  const mapStatic = (q) => ({ kind: "mcq", stem: q.stem, options: q.options, answer: q.options[q.a], venn: q.venn || null, tag: q.tag, section: "DM", drill: "dm", why: q.why, improve: q.improve });
  if (sub === "dvenn") return makeVenn(n, L);
  if (sub === "dprob") {
    const stat = shuffle(DM_QUESTIONS.filter((q) => q.tag === "dprob")).map(mapStatic);
    return shuffle([...makeProb(n, weak, L), ...stat]).slice(0, n);
  }
  if (sub === "dlogic") {
    const stat = shuffle(DM_QUESTIONS.filter((q) => q.tag === "dlogic")).map(mapStatic);
    return shuffle([...makeLogic(n, weak, L), ...stat]).slice(0, n);
  }
  if (sub === "dsyll") {
    const sets = makeSyllSets();
    const easy = shuffle(DM_QUESTIONS.filter((q) => q.tag === "dsyll")).map(mapStatic);
    const pool = L === "easy" ? [...easy, ...sets] : L === "hard" ? sets : shuffle([...sets, ...easy.slice(0, 2)]);
    return pool.slice(0, Math.min(n, pool.length));
  }
  const src = sub && sub !== "mixed" ? DM_QUESTIONS.filter((q) => q.tag === sub) : DM_QUESTIONS;
  const statics = shuffle(src).map(mapStatic);
  /* Only short-circuit on a recognised sub that actually matched questions.
     An unrecognised sub (for example the drill's own "dm" tag) filters to
     nothing, so fall through to the mixed blend rather than return empty. */
  if (sub && sub !== "mixed" && statics.length) return statics.slice(0, Math.min(n, statics.length));
  const blend = shuffle([
    ...statics,
    ...makeVenn(Math.ceil(n / 3), L),
    ...makeProb(Math.ceil(n / 4), weak, L),
    ...makeLogic(Math.ceil(n / 4), weak, L),
    ...makeSyllSets().slice(0, 2),
  ]);
  return blend.slice(0, Math.min(n, blend.length));
}

/* ------------------------------ VR MOCKS -------------------------- */
/* Three original mocks. One is featured each week on rotation, and   */
/* its leaderboard resets when the week rolls over. Timing matches    */
/* the real section's pace of roughly thirty seconds per question.    */

const MOCK_PASSAGES = {
  lighthouse: {
    title: "The Godrevy light",
    text: `The Godrevy light was automated in 1939, decades before most of its counterparts, after a storm made the keepers' cottage uninhabitable. Automation initially relied on an acetylene burner regulated by a sun valve, which shut the gas off in daylight. Electrification followed in 1995, when solar panels replaced the gas system entirely. The light's character, one white flash every ten seconds, has not changed since 1934, although its range fell from twelve nautical miles to eight when the lamp was downgraded. Trinity House retains responsibility for the structure, while the surrounding island passed to the National Trust in 1939. Proposals to open the tower to visitors have been rejected three times, most recently in 2018, on grounds of access rather than conservation.`,
  },
  canal: {
    title: "Freight on the Weaver",
    text: `Freight on the Weaver Navigation peaked in 1907 at just over one million tonnes, almost all of it salt and chemicals bound for Liverpool. Decline set in not with the railways, which the waterway had survived comfortably, but with the 1958 decision to route new chemical pipelines along the valley. Tonnage halved within six years and commercial traffic ceased altogether in 1998. The navigation's locks, built oversized in the 1870s to take coastal steamers, proved an unexpected asset: their scale now accommodates the widest leisure craft on the connected network. British Waterways classified the Weaver as a cruising waterway in 2004, and annual boat movements have roughly tripled since, though they remain a fraction of the numbers recorded on narrower, better-connected canals.`,
  },
  glass: {
    title: "The colour problem",
    text: `Container glass can be remelted indefinitely without loss of quality, yet UK recycling rates for it stalled near 74 per cent for most of the last decade. The obstacle is not collection but colour. Green glass, much of it imported as wine bottles, arrives in quantities far exceeding domestic demand for green containers, while clear glass, the most valuable stream, is easily contaminated by mixed collection. A single green bottle can tint a tonne of clear cullet beyond use. Furnaces accept at most small proportions of mixed-colour cullet, so the surplus is crushed for aggregate, a use that recovers material but not the energy saved by remelting. Trials of optical sorting in 2021 raised clear-glass purity above 99 per cent, though at a cost that only the largest plants have absorbed.`,
  },
  railway: {
    title: "Railway time",
    text: `Before the railways, every British town kept its own solar time, with Bristol running roughly ten minutes behind London. Timetables made the differences intolerable, and the Great Western adopted London time across its network in 1840, with most companies following within a decade. Public clocks lagged behind the trains: several towns displayed two minute hands, one for local and one for railway time, and Exeter's cathedral clock kept both until 1852. Legal time was another matter entirely, and courts continued to interpret contracts by local mean time until statute settled the question in 1880. The change owed less to principle than to the telegraph, which allowed Greenwich time to be distributed nationally at almost no cost.`,
  },
  honey: {
    title: "Testing honey",
    text: `Honey is among the most frequently adulterated foods traded internationally, typically by dilution with cheap rice or beet syrups. The standard laboratory test compares carbon isotope ratios, which readily exposes cane and corn syrups but cannot distinguish rice syrup from honey, since both derive from plants sharing the same photosynthetic pathway. Nuclear magnetic resonance profiling closes that gap by matching a sample against a database of authentic honeys, though the databases are proprietary and results from different providers sometimes disagree. A 2023 European survey using combined methods flagged 46 per cent of imported samples as suspicious, a figure the trade disputes on the grounds that suspicion is not proof.`,
  },
  groynes: {
    title: "Redistributing the beach",
    text: `Groynes trap sand moved along a beach by longshore drift, widening the shore on their updrift side while starving the coast beyond. The starvation is not incidental but arithmetic: sediment held in one parish is sediment denied to the next, and disputes between neighbouring authorities over new groyne fields date back to the 1890s. Timber remains the commonest material because failures are gradual and repairs cheap, although rock now dominates schemes with design lives beyond thirty years. Modern practice pairs any new field with periodic beach nourishment downdrift, an obligation first written into an English planning consent in 1994. Even so, most coastal engineers describe groynes as a means of redistributing erosion rather than preventing it.`,
  },
};

const VR_MOCKS = [
  {
    id: "m1", title: "Mock 1: Reservoir and lighthouse",
    sets: [
      { pid: "reservoir", questions: [
        { stem: "How often is maintenance scheduled?", options: ["Every five years", "Every seven years", "Every ten years", "Annually"], a: 1,
          evidence: "Maintenance is scheduled every seven years", why: "The passage states the interval directly. The other options are invented; when a number is asked for, hunt the passage for that number rather than reasoning it out." },
        { stem: "What was the reservoir's capacity at its opening?", options: ["5.1 million cubic metres", "6.2 million cubic metres", "7.4 million cubic metres", "The passage does not say"], a: 1,
          evidence: "At its opening it held 6.2 million cubic metres", why: "Two capacities appear in the passage: the original 6.2 million and today's 5.1 million after silting. The question asks about the opening, so the earlier figure is the answer. Paired numbers like this are the classic VR trap." },
        { stem: "According to the passage, recreation on the reservoir itself is:", options: ["Permitted by licence", "Restricted to anglers", "Not carried out", "Under consideration"], a: 2,
          evidence: "The reservoir is not used for recreation", why: "The anglers hold permits for the feeder stream below the outflow, not the reservoir. The distinction between the reservoir and the stream is exactly the kind of detail the options are built to blur." },
        { stem: "In which year was the dam wall survey published?", options: ["1996", "2004", "2011", "2018"], a: 2,
          evidence: "A survey published in 2011 found", why: "The passage contains several years doing different jobs: 1934, 1978, 1996 and 2011. Match the year to its event rather than grabbing the first one you spot." },
      ]},
      { pid: "lighthouse", questions: [
        { stem: "When was the light electrified?", options: ["1934", "1939", "1995", "2018"], a: 2,
          evidence: "Electrification followed in 1995, when solar panels replaced the gas system entirely", why: "Automation in 1939 and electrification in 1995 are different events. The wrong options are the passage's other years, placed to punish skim-matching." },
        { stem: "After the lamp was downgraded, the light's range was:", options: ["Twelve nautical miles", "Ten nautical miles", "Eight nautical miles", "Six nautical miles"], a: 2,
          evidence: "its range fell from twelve nautical miles to eight when the lamp was downgraded", why: "The sentence gives both the before and after. The question asks for after, so eight. Read which side of a change the question wants before answering." },
        { stem: "Visitor proposals were most recently rejected on grounds of:", options: ["Conservation", "Cost", "Access", "Safety"], a: 2,
          evidence: "rejected three times, most recently in 2018, on grounds of access rather than conservation", why: "The passage explicitly rules conservation out with 'rather than'. Contrast phrases like that usually contain both the answer and the trap option." },
        { stem: "Who retains responsibility for the lighthouse structure?", options: ["The National Trust", "Trinity House", "The local council", "A private owner"], a: 1,
          evidence: "Trinity House retains responsibility for the structure", why: "Two organisations appear: Trinity House holds the structure and the National Trust holds the island. Questions about split ownership almost always test whether you kept the two halves apart." },
      ]},
    ],
  },
  {
    id: "m2", title: "Mock 2: The press and the canal",
    sets: [
      { pid: "printing", questions: [
        { stem: "How many competing weeklies did Bristol support by 1750?", options: ["One", "Two", "Three", "Four"], a: 2,
          evidence: "Bristol supported three competing weeklies by 1750", why: "Norwich's single paper is in the same sentence to tempt anyone matching numbers to the wrong city." },
        { stem: "Ledger evidence suggests the Bristol titles' income was mostly from:", options: ["Subscriptions", "Advertising", "Government notices", "Cover sales"], a: 1,
          evidence: "advertising revenue, which accounted for over half the income of the Bristol titles", why: "Subscription is the old explanation the passage explicitly overturns. When a passage says historians once thought X but evidence suggests Y, the answer is Y and X becomes the distractor." },
        { stem: "Circulation figures from the period are described as:", options: ["Precise", "Unreliable", "Lost entirely", "Officially audited"], a: 1,
          evidence: "Circulation figures from the period are unreliable", why: "The passage also explains why: printers inflated them for advertisers. Unreliable does not mean lost, which is what the third option counts on." },
        { stem: "A town without a post road rarely sustained a paper for more than:", options: ["Six months", "Two years", "Five years", "A decade"], a: 1,
          evidence: "rarely sustained a paper for more than two years", why: "A direct fact-retrieval question. The skill is locating 'post road' fast and reading the number beside it, not reading the paragraph from the top." },
      ]},
      { pid: "canal", questions: [
        { stem: "In which year did freight on the Weaver peak?", options: ["1870", "1907", "1958", "1998"], a: 1,
          evidence: "peaked in 1907 at just over one million tonnes", why: "The passage's other years mark the pipeline decision and the end of traffic. Each year has a job; the question names the job, you find the year." },
        { stem: "The passage attributes the navigation's decline mainly to:", options: ["The railways", "Chemical pipelines", "Silting", "Larger ships"], a: 1,
          evidence: "but with the 1958 decision to route new chemical pipelines along the valley", why: "The railways are explicitly dismissed with 'not with the railways, which the waterway had survived comfortably'. The sentence structure hands you both the trap and the answer." },
        { stem: "Commercial traffic on the Weaver ceased in:", options: ["1958", "1964", "1998", "2004"], a: 2,
          evidence: "commercial traffic ceased altogether in 1998", why: "1964 is implied by 'halved within six years' of 1958 and is exactly the sort of computed distractor that punishes guessing from arithmetic instead of finding the stated year." },
        { stem: "The locks were built oversized in the 1870s in order to:", options: ["Take coastal steamers", "Speed up freight", "Reduce flooding", "Attract leisure craft"], a: 0,
          evidence: "built oversized in the 1870s to take coastal steamers", why: "Leisure craft benefit today, but that is a consequence, not the purpose. Purpose questions ask why it was done at the time, and the passage gives that directly." },
      ]},
    ],
  },
  {
    id: "m3", title: "Mock 3: Alloys and glass",
    sets: [
      { pid: "alloy", questions: [
        { stem: "Below roughly what proportion of tensile strength may a steel bracket survive unlimited cycles?", options: ["20 per cent", "40 per cent", "60 per cent", "80 per cent"], a: 1,
          evidence: "loaded below roughly 40 per cent of its tensile strength", why: "One number, stated once. The skill being tested is pure location speed: find 'tensile strength', read the figure attached to it." },
        { stem: "The Comet failures originated:", options: ["In the alloy itself", "At window cut-outs", "In the engines", "At the wing roots"], a: 1,
          evidence: "the failures there originated at window cut-outs rather than in the alloy itself", why: "The passage raises the alloy explanation only to reject it with 'rather than'. If you answered 'the alloy', you matched the topic of the paragraph instead of its claim." },
        { stem: "For aluminium components, design practice specifies:", options: ["A safety threshold", "An endurance limit", "A service life", "A maximum load"], a: 2,
          evidence: "Design practice therefore specifies a service life rather than a safety threshold", why: "Endurance limits belong to steel in this passage; aluminium has none, which is the whole point of the contrast being drawn." },
        { stem: "Inspection intervals for aircraft are set by:", options: ["Calendar time", "Flight hours", "Cycle counts", "Manufacturer discretion"], a: 1,
          evidence: "are set by flight hours rather than calendar time", why: "Another 'rather than' construction: the sentence contains the rejected option beside the correct one. Train your eye to treat those pairs as answer plus trap." },
      ]},
      { pid: "glass", questions: [
        { stem: "UK container-glass recycling rates stalled near:", options: ["64 per cent", "74 per cent", "84 per cent", "99 per cent"], a: 1,
          evidence: "stalled near 74 per cent for most of the last decade", why: "The 99 per cent figure later in the passage is a purity result from sorting trials, not a recycling rate. Same-looking numbers doing different jobs is the trap." },
        { stem: "The passage identifies the main obstacle to glass recycling as:", options: ["Collection", "Colour", "Cost", "Contamination by food waste"], a: 1,
          evidence: "The obstacle is not collection but colour", why: "The sentence names and dismisses the trap in the same breath. Six words, both the wrong answer and the right one." },
        { stem: "According to the passage, a single green bottle can:", options: ["Break a furnace", "Tint a tonne of clear cullet beyond use", "Be sorted optically at any plant", "Be remelted only once"], a: 1,
          evidence: "A single green bottle can tint a tonne of clear cullet beyond use", why: "A direct claim, dramatic enough to be quotable, which is exactly why it becomes a question. The other options twist nearby facts." },
        { stem: "The 2021 optical sorting trials raised clear-glass purity above:", options: ["74 per cent", "90 per cent", "95 per cent", "99 per cent"], a: 3,
          evidence: "raised clear-glass purity above 99 per cent", why: "The passage adds that only the largest plants have absorbed the cost, a qualifier that would fuel a follow-up question. Note qualifiers as you read; they are question fuel." },
      ]},
    ],
  },
];

const weekNumber = () => Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
const mockPassage = (pid) => MOCK_PASSAGES[pid] || { title: PASSAGES.find((p) => p.id === pid).title, text: PASSAGES.find((p) => p.id === pid).text };

/* Every passage set in one bank; three new sets below join the six from the mocks above. */
const MOCK_BANK = [];
VR_MOCKS.forEach((m) => m.sets.forEach((set) => MOCK_BANK.push(set)));
MOCK_BANK.push(
  { pid: "railway", questions: [
    { stem: "Before the railways, Bristol's local time ran roughly how far behind London?", options: ["Two minutes", "Ten minutes", "Twenty minutes", "An hour"], a: 1,
      evidence: "Bristol running roughly ten minutes behind London", why: "A single stated figure. The wrong options are plausible-sounding inventions, which is why locating beats estimating in VR." },
    { stem: "The Great Western adopted London time across its network in:", options: ["1840", "1852", "1880", "1890"], a: 0,
      evidence: "the Great Western adopted London time across its network in 1840", why: "Three years appear in the passage doing three jobs: adoption, the Exeter clock, and the statute. Match the year to its event." },
    { stem: "Exeter's cathedral clock displayed both times until:", options: ["1840", "1852", "1880", "The passage does not say"], a: 1,
      evidence: "Exeter's cathedral clock kept both until 1852", why: "The two-minute-hands detail is the passage's most memorable image, which makes it prime question material. Memorable details attract questions." },
    { stem: "The passage attributes the national spread of Greenwich time chiefly to:", options: ["Principle", "The courts", "The telegraph", "The Great Western"], a: 2,
      evidence: "owed less to principle than to the telegraph", why: "The 'less to X than to Y' construction hands you the rejected cause and the real one in a single clause. Train your eye on those pairings." },
  ]},
  { pid: "honey", questions: [
    { stem: "Honey is typically adulterated by dilution with:", options: ["Cane sugar", "Rice or beet syrups", "Corn oil", "Glucose tablets"], a: 1,
      evidence: "typically by dilution with cheap rice or beet syrups", why: "Cane and corn appear later as syrups the isotope test does catch, which is exactly why they make convincing wrong options here." },
    { stem: "The carbon isotope test cannot distinguish honey from:", options: ["Cane syrup", "Corn syrup", "Rice syrup", "Beet syrup"], a: 2,
      evidence: "cannot distinguish rice syrup from honey", why: "The passage names what the test exposes and what it misses in the same sentence. Both halves become options; only one answers the question asked." },
    { stem: "NMR profiling works by matching a sample against:", options: ["An isotope ratio", "A database of authentic honeys", "A government register", "Imported samples"], a: 1,
      evidence: "matching a sample against a database of authentic honeys", why: "The qualifier that follows, that databases are proprietary and providers disagree, is a separate fact. Answer only what the stem asks." },
    { stem: "The 2023 European survey flagged what proportion of imported samples as suspicious?", options: ["23 per cent", "46 per cent", "64 per cent", "99 per cent"], a: 1,
      evidence: "flagged 46 per cent of imported samples as suspicious", why: "Note the trade's objection that suspicion is not proof: the passage flags its own uncertainty, and a follow-up question could test whether you noticed." },
  ]},
  { pid: "groynes", questions: [
    { stem: "Disputes between neighbouring authorities over groyne fields date back to:", options: ["The 1890s", "The 1930s", "1994", "The last decade"], a: 0,
      evidence: "date back to the 1890s", why: "1994 appears later attached to a different event, the nourishment obligation. Two dates, two jobs; the question names the job." },
    { stem: "Timber remains the commonest groyne material because:", options: ["It is strongest", "Failures are gradual and repairs cheap", "It traps more sand", "Rock is unavailable"], a: 1,
      evidence: "because failures are gradual and repairs cheap", why: "The word 'because' in a passage is a beacon: reasons get asked about. Rock dominating longer-life schemes is the contrast, not the cause." },
    { stem: "Pairing new groyne fields with beach nourishment was first written into an English planning consent in:", options: ["The 1890s", "1974", "1994", "2014"], a: 2,
      evidence: "first written into an English planning consent in 1994", why: "A precise institutional fact of the kind VR loves, because it can only be found, never reasoned out." },
    { stem: "Most coastal engineers describe groynes as a means of:", options: ["Preventing erosion", "Redistributing erosion", "Reversing longshore drift", "Replacing nourishment"], a: 1,
      evidence: "redistributing erosion rather than preventing it", why: "Another 'rather than' pairing: the passage's final sentence contains both the trap and the answer, as closing sentences often do." },
  ]},
  { pid: "lido", questions: [
    { stem: "How many open-air lidos does the passage say Britain built between the wars?", options: ["More than 60", "More than 160", "More than 260", "Around 40"], a: 1,
      evidence: "more than 160 open-air lidos between the wars", why: "The forty figure belongs to 1990 and is planted as the trap. Two counts, two dates; match them before answering." },
    { stem: "By 1990, how many lidos remained open?", options: ["More than 160", "Around a hundred", "Fewer than forty", "None"], a: 2,
      evidence: "By 1990 fewer than forty remained open", why: "Direct retrieval: find the year, read the number beside it. The 160 is the earlier count doing distractor duty." },
    { stem: "The Jubilee Pool returned to use in:", options: ["2014", "2016", "2020", "The 1990s"], a: 1,
      evidence: "returned in 2016", why: "2014 is the storm damage and 2020 is implied by 'four years later' for the heated section. Three dates around one pool; the question names which event it wants." },
    { stem: "Operators note that enthusiasm for cold-water swimming vanishes by:", options: ["August", "September", "November", "January"], a: 2,
      evidence: "vanishes by November", why: "August is in the same sentence as the peak, which is exactly why it makes the tempting wrong answer." },
  ]},
  { pid: "owls", questions: [
    { stem: "Second-generation rodenticides are found in what proportion of British barn owls?", options: ["Over 20 per cent", "About half", "Over 80 per cent", "Nearly all"], a: 2,
      evidence: "in over 80 per cent of British barn owls", why: "A single stated figure. 'Nearly all' overstates it and 'about half' invents a middle; VR rewards the exact claim, no more." },
    { stem: "The passage identifies the main concern as:", options: ["Lethal doses", "Sublethal exposure", "Loss of hearing", "Nest-box decline"], a: 1,
      evidence: "the concern is sublethal exposure", why: "The sentence explicitly sets lethal doses aside as rare before naming the real concern. Contrast structures carry both trap and answer." },
    { stem: "Amateur outdoor use of these poisons has been restricted since:", options: ["2006", "2014", "2016", "2020"], a: 2,
      evidence: "restricting amateur outdoor use since 2016", why: "One date attached to one policy. The neighbouring passages use 2014 and 2020, so keep your years attached to their passages." },
    { stem: "The rise in owl numbers is credited partly to:", options: ["Milder winters", "Nest-box campaigns", "A poison ban", "Fewer roads"], a: 1,
      evidence: "aided by nest-box campaigns", why: "The passage names one aid explicitly. The others are plausible ecology but never appear, and plausible-but-absent is the core VR trap." },
  ]},
  { pid: "container", questions: [
    { stem: "The ISO standard that fixed container corner castings dates from:", options: ["1948", "1958", "1968", "1978"], a: 2,
      evidence: "a 1968 ISO standard", why: "Pure location speed: one year, stated once, with lookalike options built by shifting the decade." },
    { stem: "Within two decades of containerisation, London dock employment fell by:", options: ["Over 40 per cent", "About half", "Over 70 per cent", "Over 90 per cent"], a: 3,
      evidence: "fell by over 90 per cent", why: "The passage's most dramatic number, which makes it question fuel. The graded wrong options punish anyone answering from vague memory of 'a big fall'." },
    { stem: "The port of London shifted downstream to Tilbury by roughly:", options: ["Four kilometres", "Fourteen kilometres", "Forty kilometres", "Four hundred kilometres"], a: 2,
      evidence: "forty kilometres downstream to Tilbury", why: "Written as a word, not a digit, which defeats candidates scanning only for numerals. Scan for the shape 'kilometres' instead." },
    { stem: "According to the passage, a modern vessel turns around in:", options: ["Half its life", "A week", "Under a day", "An hour"], a: 2,
      evidence: "turns around in under a day", why: "The before-and-after contrast supplies both the answer and the trap: 'half its life' is the pre-standardisation figure sitting one clause earlier." },
  ]},
  { pid: "saffron", questions: [
    { stem: "How many crimson stigmas does each crocus flower yield?", options: ["One", "Three", "Five", "Ten"], a: 1,
      evidence: "each crocus flower yields three crimson stigmas", why: "A precise stated number. The distractors are round and plausible, which is exactly why locating beats guessing." },
    { stem: "Roughly how many flowers go into a kilogram of dried saffron?", options: ["1,500", "15,000", "150,000", "1.5 million"], a: 2,
      evidence: "Roughly 150,000 flowers go into a kilogram", why: "Order-of-magnitude distractors punish anyone who half-remembers 'a lot'. Read the figure, count the zeros." },
    { stem: "Which country supplies the large majority of world saffron?", options: ["Kashmir", "Spain", "Iran", "Peru"], a: 2,
      evidence: "Iran supplies the large majority of world production", why: "Kashmir appears in the next clause for its premium colour, and Spain features in a different passage entirely: classic same-topic traps." },
    { stem: "Breeding a higher-yielding crocus has failed because the plant is:", options: ["Slow-growing", "Sterile", "Disease-prone", "Frost-sensitive"], a: 1,
      evidence: "because the plant is sterile", why: "The passage gives one reason explicitly. The others are agriculturally plausible but never stated, and plausible-but-absent is the core VR trap." },
  ]},
  { pid: "tides", questions: [
    { stem: "In which year did a surge overwhelm east coast defences?", options: ["1936", "1953", "1982", "2013"], a: 1,
      evidence: "a surge that in 1953 overwhelmed defences", why: "1982 belongs to the barrier's completion, planted to catch anyone matching the wrong date to the wrong event." },
    { stem: "The Thames barrier was completed in:", options: ["1953", "1974", "1982", "1996"], a: 2,
      evidence: "The Thames barrier was completed in 1982", why: "Two dates, two events. Keep each year attached to its own clause rather than grabbing the first one you see." },
    { stem: "According to engineers, more frequent barrier closures are:", options: ["Proof of a rising threat", "Not proof, since the closing rules changed", "Unrelated to sea level", "A sign of failure"], a: 1,
      evidence: "not proof of a rising threat, because the rules for closing it have themselves changed", why: "The passage explicitly disarms the obvious inference. When a passage says 'not proof', that qualifier is the answer." },
    { stem: "A deep depression over a shallow sea can raise water above prediction by about:", options: ["A centimetre", "A metre", "Ten metres", "It cannot", ], a: 1,
      evidence: "raise water a metre above the predicted height", why: "A stated figure written as a word. Scan for 'metre', not for a numeral, or you will miss it entirely." },
  ]},
  { pid: "cochineal", questions: [
    { stem: "Cochineal is derived from:", options: ["A cactus flower", "A scale insect", "A tree bark", "A root"], a: 1,
      evidence: "came from a scale insect farmed on cacti", why: "The cacti are where it is farmed, not what it comes from: the passage separates the two, and so must you." },
    { stem: "Synthetic reds displaced cochineal after:", options: ["1768", "1868", "1908", "1968"], a: 1,
      evidence: "Synthetic reds displaced it after 1868", why: "One date, stated once, with lookalike options built by shifting the century. Location speed is the whole skill here." },
    { stem: "Cochineal's modern revival was driven by:", options: ["Falling prices", "Concern over synthetic food colourings", "Better farming methods", "New shades of red"], a: 1,
      evidence: "concern over synthetic food colourings returned cochineal", why: "The passage names one cause. The distractors are commercially plausible but unsupported, the standard VR trap." },
    { stem: "Which country now supplies most cochineal?", options: ["Spain", "Mexico", "Peru", "Chile"], a: 2,
      evidence: "Producers in Peru now supply most of the world's supply", why: "Spain features earlier for its historical monopoly, planted to mislead anyone skimming for a country name." },
  ]},
  { pid: "peat", questions: [
    { stem: "A healthy peat bog grows by roughly:", options: ["A millimetre a year", "A centimetre a year", "A metre a year", "It does not grow"], a: 0,
      evidence: "grows by around a millimetre a year", why: "A precise rate stated as words. The centimetre option is the tempting near-miss for a fast reader." },
    { stem: "Britain's uplands hold more carbon in peat than its forests hold in:", options: ["Soil", "Leaves", "Wood", "Roots"], a: 2,
      evidence: "more carbon in peat than its forests hold in wood", why: "The comparison is precise: peat versus wood, not peat versus forests generally. Read the exact terms being compared." },
    { stem: "Peatland restoration often amounts to:", options: ["Planting new moss", "Blocking old drainage ditches", "Adding fertiliser", "Removing grazing animals"], a: 1,
      evidence: "blocking the drainage ditches cut decades ago", why: "The passage names the actual method. The others are plausible conservation actions that never appear." },
    { stem: "Rewetting a bog, the passage says, first achieves:", options: ["Full restoration", "Reduced further carbon loss", "Faster moss growth than before", "New grazing land"], a: 1,
      evidence: "rewetting reduces further loss long before it restores any meaningful store", why: "The passage carefully separates stopping loss from rebuilding store. That distinction is the whole point, and the trap." },
  ]},
  { pid: "quinine", questions: [
    { stem: "Quinine is drawn from the bark of which tree?", options: ["Cinchona", "Cacao", "Eucalyptus", "Willow"], a: 0,
      evidence: "drawn from the bark of the cinchona tree", why: "Willow, source of a different famous drug, is the trap for anyone half-remembering bark medicines." },
    { stem: "Seeds were taken to Asian plantations in the:", options: ["1760s", "1810s", "1860s", "1910s"], a: 2,
      evidence: "seeds taken to plantations in Asia in the 1860s", why: "One decade, stated once, with distractors built by shifting fifty years each way." },
    { stem: "Quinine returns to prominence whenever:", options: ["Bark supply grows", "The parasite resists newer drugs", "Prices collapse", "Plantations expand"], a: 1,
      evidence: "quinine returned to prominence whenever the parasite evolved resistance", why: "The passage gives the exact trigger. The distractors are economically plausible but unstated." },
    { stem: "The South American quinine monopoly ended through:", options: ["A trade treaty", "Smuggling of seeds", "Synthetic substitutes", "Colonial war"], a: 1,
      evidence: "That monopoly ended through smuggling", why: "Synthetics appear later in the passage doing a different job, planted to mislead a skim-reader." },
  ]},
  { pid: "grid", questions: [
    { stem: "The electricity grid's target frequency is:", options: ["Five cycles a second", "Fifty cycles a second", "Five hundred cycles a second", "Fifty per minute"], a: 1,
      evidence: "its target of fifty cycles a second", why: "A precise figure; the distractors shift the magnitude to catch a careless reader." },
    { stem: "A generator's momentum-based resistance to sudden change is called:", options: ["Frequency", "Inertia", "Capacity", "Load"], a: 1,
      evidence: "a property engineers call inertia", why: "The passage names the term explicitly. The distractors are all real grid words used elsewhere, which is what makes them tempting." },
    { stem: "A shortage of supply relative to demand makes the frequency:", options: ["Rise above target", "Drop below target", "Stay exactly fixed", "Reverse direction"], a: 1,
      evidence: "too much demand and the whole system slows fractionally below its target", why: "The passage states the direction directly. Reversing it is the natural error under time pressure, so read which way the drift goes." },
    { stem: "Flywheels are installed in modern grids in order to:", options: ["Store energy for hours", "Mimic the inertia of retired plants", "Replace all batteries", "Generate extra power"], a: 1,
      evidence: "flywheels installed for no purpose other than to mimic the inertia", why: "The passage states the sole purpose. 'Store energy' and 'generate power' are what a reader assumes a spinning wheel does, which is exactly the trap." },
  ]},
);

const VR_MOCK_QCOUNT = 44;             /* full length: 44 Qs in 22:00 */
const VR_MOCK_SECONDS = VR_MOCK_QCOUNT * 30;   /* the real section's pace: 44 Qs in 22:00 = 30s each */
const QR_MOCK_QCOUNT = 36;
const QR_MOCK_SECONDS = 26 * 60;       /* full length: 36 Qs in 26:00, matching the exam */

function buildVrMock(week, slot, mini) {
  /* The real section mixes true/false/can't tell sets with inference sets,
     so evidence sets plus TFC sets reproduce the same texture. A full paper
     is eight evidence sets and three TFC sets, forty-four questions at the
     exam's 30-second pace. Mini is one of each for a quick eight-question run. */
  const nSets = mini ? 1 : 8;   /* evidence sets, 4 questions each */
  const nTfc = mini ? 1 : 3;    /* TFC sets, 4 statements each */
  const sets = seeded(week * 97 + slot * 13 + 7 + (mini ? 500 : 0), () => shuffle(MOCK_BANK)).slice(0, nSets);
  const flat = [];
  sets.forEach((set) => set.questions.forEach((q) => flat.push({ ...q, kindm: "vr", passage: mockPassage(set.pid) })));
  const tfcIds = seeded(week * 41 + slot * 7 + 5 + (mini ? 500 : 0), () => shuffle(Object.keys(TFC_SETS))).slice(0, nTfc);
  tfcIds.forEach((tfcId) => {
    const tp = PASSAGES.find((x) => x.id === tfcId);
    TFC_SETS[tfcId].forEach((item) => flat.push({
      kindm: "vr", stem: item.t, options: TFC, a: item.a, tfc: true,
      why: item.w, diagram: { type: "tfc" }, tag: "t" + tfcId,
      passage: { title: tp.title, text: tp.text },
    }));
  });
  return { title: mini ? `VR Mini ${slot + 1}` : `VR Mock ${"ABC"[slot]}`, flat, secs: flat.length * 30, perQ: 30 };
}

function buildQrMock(week, slot, mini) {
  /* Real QR runs mostly as sets of four questions sharing one table. Mini
     is two tables' worth plus a couple of standalone items.                */
  const setQ = mini ? 8 : 28;
  const singleQ = mini ? 2 : QR_MOCK_QCOUNT - 28;
  const flat = seeded(week * 131 + slot * 17 + 3 + (mini ? 500 : 0), () => {
    const sets = makeQrSets(setQ, "hard");
    const singles = makeEstimate(singleQ, {}, "hard", null);
    return [...sets, ...singles];
  }).map((q) => ({ ...q, kindm: "qr" }));
  return { title: mini ? `QR Mini ${slot + 1}` : `QR Mock ${"ABC"[slot]}`, flat, secs: flat.length * 43, perQ: 43 };
}

const SJT_PERQ = Math.round((26 * 60) / 69);   /* 69 questions in 26:00 */
function buildSjtMock(week, slot, mini) {
  /* Full paper: 69 appropriateness and importance items in 26 minutes,
     the real section's length. Ranking items are left to the practice
     bank; the mock is single-scale so it scores cleanly on a leaderboard. */
  const items = [];
  SJT_SCENARIOS.forEach((sc) => (sc.items || []).forEach((it) => {
    if (it.type === "appropriateness" || it.type === "importance") items.push({ sc, it });
  }));
  const flat = seeded(week * 173 + slot * 23 + 9 + (mini ? 500 : 0), () => shuffle(items)).slice(0, mini ? 5 : 69).map(({ sc, it }) => ({
    kindm: "sjt", sjt: true, scenarioText: sc.text,
    framing: it.type === "importance"
      ? "How important is the following consideration for the student when deciding how to respond to the situation?"
      : "How appropriate is the following response by the student to the situation?",
    stem: it.stem, options: it.type === "importance" ? IMPORT : APPROP, a: it.answer, why: it.why,
  }));
  return { title: mini ? `SJT Mini ${slot + 1}` : `SJT Mock ${"ABC"[slot]}`, flat, secs: mini ? flat.length * SJT_PERQ : 26 * 60, perQ: SJT_PERQ };
}

/* ------------------------------ DRILLS ---------------------------- */

const DRILLS = [
  { id: "tables", section: "QR", name: "Times tables to 15", blurb: "The foundation. Hesitate on 13 × 7 and the question is already lost.", free: true, max: 25, def: 15, budget: 6 },
  { id: "calc", section: "QR", name: "On-screen calculator", blurb: "Keyboard only, like the real thing. Build the muscle memory early.", free: false, max: 25, def: 10, budget: 40 },
  { id: "qrset", section: "QR", name: "Data sets", blurb: "Four linked questions on one table, five options, comparison answers. The shape the real section actually takes.", free: false, max: 24, def: 8, budget: 40 },
  { id: "estimate", section: "QR", name: "Estimation", blurb: "Five options, one right. Ratios, graphs, rates, percentages and inference.", free: false, max: 25, def: 10, budget: 40, sub: true },
  { id: "speed", section: "VR", name: "Pacing", blurb: "Words at a fixed rate, then comprehension. Trains you to stop re-reading.", free: false, max: 1, def: 1, budget: 0 },
  { id: "tfc", section: "VR", name: "True, false, can't tell", blurb: "The signature VR format. Can't tell is the most-missed answer in the exam, and this drills exactly why.", free: false, max: 25, def: 12, budget: 22 },
  { id: "infer", section: "VR", name: "Reading comprehension", blurb: "Four-option questions on a passage: inference, main idea and what is actually supported. The other half of Verbal Reasoning.", free: false, max: 25, def: 8, budget: 30 },
  { id: "scan", section: "VR", name: "Scanning", blurb: "Find one fact in a passage against the clock. The core VR skill.", free: false, max: 25, def: 9, budget: 22 },
  { id: "blurt", section: "VR", name: "Blurting", blurb: "Read, hide, recall. Shows how little of a passage you actually keep.", free: false, max: 1, def: 1, budget: 0 },
  { id: "sjt", section: "SJT", name: "Situational Judgement", blurb: "All three official formats, a written reason for every answer, band estimate at the end.", free: false, max: 25, def: 12, budget: 22 },
];
const DRILL_BY_ID = Object.fromEntries(DRILLS.map((d) => [d.id, d]));
const TIMED = ["tables", "calc", "estimate", "scan", "sjt", "tfc", "qrset", "infer"];

const EST_SUBS = [
  { id: "mixed", name: "Mixed", desc: "Every family, shuffled. Closest to the exam." },
  { id: "ratio", name: "Ratios", desc: "Sharing amounts, scaling, parts of a whole." },
  { id: "graph", name: "Graphs", desc: "Read a chart, then answer from it." },
  { id: "rate", name: "Rates and time", desc: "Speed, output per hour, journey times." },
  { id: "pct", name: "Percentages", desc: "Change, share of a total, discounts." },
  { id: "infer", name: "Inference", desc: "Project a trend one step forward." },
  { id: "unit", name: "Units", desc: "Grams to kilograms, millilitres to litres, minutes to hours." },
];

const TIPS = {
  tables: "If your median is above 3 seconds, the problem is recall, not arithmetic. Drill the 12 to 15 rows on their own until they are automatic, then come back.",
  calc: "Never touch the mouse. Every entry on test day should come from the number pad. If a sum needs more than four keystrokes, ask whether you needed the calculator at all.",
  qrset: "Sets reward reading the table once, properly. Note the units and the grand total before question one, and you will answer all four faster than most people answer two.",
  estimate: "Round to one significant figure first, then adjust. Only compute exactly when two options sit close together.",
  speed: "Faster reading with worse comprehension is not progress. Find the rate where you still score both questions, then hold it. That rate is your exam pace.",
  tfc: "True means the passage says it. False means the passage contradicts it. Can't tell means the passage is silent, however obvious the answer feels from real life. Most lost marks here are Can't tell statements marked True because the candidate filled a gap the writer deliberately left.",
  scan: "Read the question first, decide what shape the answer takes, a year, a name, a number, then hunt for that shape. Never read top to bottom.",
  blurt: "Low recall is normal and is not the point. The point is noticing which details you dropped, because those are the ones you will have to go back for under pressure.",
  dm: "Most DM marks come from three habits: test conclusions by asking whether the premises could be true while the conclusion is false, draw circles for anything involving groups, and answer 'at least one' probability questions through the complement.",
  sjt: "The SJT runs on a framework, not instinct. Patients first, honesty always, deal with things locally before escalating, and never let your own convenience or reputation into the decision. When two options both look right, pick the one that acts sooner.",
  mistakes: "These are the exact questions that beat you before. Clearing this list is worth more than any new practice, because it attacks your actual weaknesses rather than your comfortable strengths.",
};

/* ------------------------------ LEARN ----------------------------- */

const LEARN = [
  {
    id: "vr", title: "Verbal Reasoning",
    intro: "VR is a time problem wearing a reading disguise. The passage is not there to be read; it is there to be searched. Nationally it is the weakest subtest, which means it is also where marks are cheapest to gain.",
    cards: [
      { h: "Question first, always", p: "Read the question before the passage, decide what shape the answer takes, a date, a name, a number, a claim, then scan for that shape. Reading the passage first roughly doubles your time per question.", drill: "scan" },
      { h: "True, false, can't tell", p: "True means the passage says it. False means the passage contradicts it. Can't tell means the passage is silent, even if you know the fact is true in real life. Outside knowledge is the trap: the question is about the passage, not the world.", drill: "tfc" },
      { h: "The three ways False is built", p: "Examiners build False statements three ways: swapping a hedge for an absolute (often becomes always), reversing a comparison, or dropping a condition that the passage attached. Learn those three shapes and False stops being guesswork.", drill: "tfc" },
      { h: "Why Can't tell is missed", p: "Two true facts sitting near each other do not make a causal link. If a statement invents a cause, a ranking, a judgement of right and wrong, or a comparison the passage never draws, it is Can't tell no matter how reasonable it sounds.", drill: "tfc" },
      { h: "Stop re-reading", p: "Most lost time in VR is the second and third read of a sentence you already understood. Pacing practice at a fixed rate trains your eyes to keep moving and your brain to accept one pass.", drill: "speed" },
      { h: "Know what you retain", p: "Blurting shows you which details survive one read. The ones that do not survive are the ones to note the location of, so you can jump back rather than re-read everything.", drill: "blurt" },
    ],
  },
  {
    id: "qr", title: "Quantitative Reasoning",
    intro: "QR is arithmetic under time pressure, not mathematics. Almost every question is percentages, ratios, rates or reading a chart. The exam expects estimation; exact calculation is usually the slow road to the same answer.",
    cards: [
      { h: "Estimate first", p: "Round everything to one significant figure and see which option you land near. 4,127 divided by 68 is roughly 4,000 over 70, which is under 60. If only one option is near that, you are done in ten seconds.", drill: "estimate", sub: "mixed" },
      { h: "Ratios", p: "Turn every ratio into 'per one part'. Sharing 480 in the ratio 3:5 means 8 parts, so one part is 60, so the shares are 180 and 300. One division, then multiply.", drill: "estimate", sub: "ratio" },
      { h: "Graphs", p: "Read the axes before the bars. Most graph errors are unit errors: thousands, percentages, per month versus per year. Then take the two values the question actually asks about and ignore the rest.", drill: "estimate", sub: "graph" },
      { h: "Rates and time", p: "Distance, speed and time is one triangle; output per hour is the same triangle wearing overalls. Fix the units first: minutes to hours before you divide, not after.", drill: "estimate", sub: "rate" },
      { h: "Percentages", p: "Find 10% by moving the decimal, then build: 30% is three of those, 5% is half of one. Percentage change is difference over original, and the original is whichever number came first in time.", drill: "estimate", sub: "pct" },
      { h: "The calculator costs you", p: "The on-screen calculator is slow by design. Every question you can do by estimation is seconds saved for the ones that genuinely need it.", drill: "calc" },
    ],
  },
  {
    id: "sjt", title: "Situational Judgement",
    intro: "The SJT feels subjective and is not. Answers are set by a panel applying professional standards, chiefly the GMC's Good Medical Practice. Learn the principles and the section becomes the most predictable part of the exam. It is banded 1 to 4 separately from your cognitive score, and a poor band can limit your options on its own.",
    cards: Object.entries(SJT_THEMES).map(([k, v]) => ({ h: v.name, p: v.rule, drill: "sjt", theme: k })),
    extra: [
      { h: "Format: Appropriateness", p: SJT_TYPES.appropriateness.how + " " + SJT_TYPES.appropriateness.trap },
      { h: "Format: Importance", p: SJT_TYPES.importance.how + " " + SJT_TYPES.importance.trap },
      { h: "Format: Ranking", p: SJT_TYPES.ranking.how + " " + SJT_TYPES.ranking.trap },
      { h: "Scoring", p: "Full marks for matching the panel, partial marks for landing one step away. That is why the first decision is which half of the scale a response belongs to; get the half right and you always score something." },
    ],
  },
];

/* ------------------------------ PLAN ------------------------------ */

const PLAN = [
  { week: 1, theme: "Build the arithmetic floor", note: "Nothing else works until recall is automatic. Short sessions, every day.", days: [
    { drill: "tables", exam: false }, { drill: "tables", exam: false }, { drill: "scan", exam: false }, { drill: "tables", exam: false }, { drill: "scan", exam: false }] },
  { week: 2, theme: "Meet the calculator", note: "The on-screen calculator loses more marks than the maths does.", days: [
    { drill: "calc", exam: false }, { drill: "tables", exam: false }, { drill: "calc", exam: false }, { drill: "scan", exam: false }, { drill: "calc", exam: false }] },
  { week: 3, theme: "Stop computing, start estimating", note: "The week most people gain the biggest chunk of QR time.", days: [
    { drill: "estimate", exam: false }, { drill: "estimate", exam: false }, { drill: "speed", exam: false }, { drill: "estimate", exam: false }, { drill: "calc", exam: false }] },
  { week: 4, theme: "Judgement", note: "SJT is learnable. Read the Learn page themes before each session.", days: [
    { drill: "sjt", exam: false }, { drill: "scan", exam: true }, { drill: "sjt", exam: false }, { drill: "speed", exam: false }, { drill: "sjt", exam: false }] },
  { week: 5, theme: "Exam conditions", note: "Every session timed with no way back. It should feel worse than practice. That is the point.", days: [
    { drill: "tables", exam: true }, { drill: "calc", exam: true }, { drill: "estimate", exam: true }, { drill: "sjt", exam: true }, { drill: "scan", exam: true }] },
  { week: 6, theme: "Taper", note: "Volume down, sharpness up. Nothing new this week.", days: [
    { drill: "estimate", exam: true }, { drill: "sjt", exam: true }, { drill: "tables", exam: true }, { drill: "speed", exam: false }, { drill: "blurt", exam: false }] },
];
const PLAN_KEYS = [];
PLAN.forEach((w) => w.days.forEach((d, i) => PLAN_KEYS.push(`w${w.week}d${i + 1}`)));

/* Shared helpers (RNG, pickers, fiveOptions, LEVELS) live in ./utils.js. */

/* ------------------------------ QR GENERATORS --------------------- */

const FACTORS = Array.from({ length: 14 }, (_, i) => i + 2);

function makeTables(n, weak, lvl) {
  const L = LEVELS[lvl];
  const pool = FACTORS.filter((f) => f >= L.fMin && f <= L.fMax);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = weightedPick(pool, weak, "f");
    const b = rnd(L.fMin, L.fMax);
    out.push({ kind: "typed", prompt: `${a} × ${b}`, answer: String(a * b), tol: 0, tag: "f" + a, section: "QR", drill: "tables",
      working: `${a} × ${b} = ${a * b}. Split it: ${a} × 10 = ${a * 10}${b > 10 ? `, plus ${a} × ${b - 10} = ${a * (b - 10)}` : ""}.`,
      improve: `The ${a} times table is catching you. Say the whole row aloud, ${a}, ${a * 2}, ${a * 3}, up to ${a * 15}, three times today. Recall beats calculation at this level.` });
  }
  return out;
}

function makeCalc(n, weak, lvl) {
  const kinds = ["pct", "div", "mul"];
  const easy = lvl === "easy", hard = lvl === "hard";
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = weightedPick(kinds, weak, "c");
    if (k === "pct") {
      const a = easy ? rnd(10, 90) * 10 : rnd(120, 9800);
      const p = easy ? pick([10, 20, 25, 50]) : hard ? pick([7, 13, 17, 23, 37]) : pick([5, 8, 12, 15, 18, 22, 35]);
      const ans = Number(((a * p) / 100).toFixed(2));
      out.push({ kind: "typed", prompt: `${p}% of ${a.toLocaleString()}`, answer: String(ans), tol: 0.02, tag: "cpct", section: "QR", drill: "calc",
        working: `10% of ${a.toLocaleString()} is ${(a / 10).toLocaleString()}. Build ${p}% from that: the answer is ${ans.toLocaleString()}.`,
        improve: "Percentages on the calculator: type the number, times the percentage, divide by 100. Same three steps, same order, every time." });
    } else if (k === "div") {
      const a = easy ? rnd(20, 90) * 10 : rnd(1200, 9800);
      const b = easy ? pick([2, 4, 5, 10]) : hard ? rnd(37, 97) : rnd(11, 89);
      out.push({ kind: "typed", prompt: `${a.toLocaleString()} ÷ ${b}  (2 d.p.)`, answer: (a / b).toFixed(2), tol: 0.02, tag: "cdiv", section: "QR", drill: "calc",
        working: `${a.toLocaleString()} ÷ ${b} = ${(a / b).toFixed(2)}. Sanity check by rounding first: roughly ${Math.round(a / 1000) || 1} thousand over ${Math.round(b / 10) * 10} lands near the same place.`,
        improve: "Always sanity-check a division with a one-second estimate. It catches the misplaced decimal, the commonest calculator error in the exam." });
    } else {
      const a = easy ? rnd(11, 40) : hard ? rnd(340, 990) : rnd(140, 990);
      const b = easy ? rnd(3, 12) : hard ? rnd(23, 89) : rnd(11, 45);
      out.push({ kind: "typed", prompt: `${a} × ${b}`, answer: String(a * b), tol: 0, tag: "cmul", section: "QR", drill: "calc",
        working: `${a} × ${b} = ${(a * b).toLocaleString()}. Estimate first: ${Math.round(a / 10) * 10} × ${Math.round(b / 10) * 10} = ${(Math.round(a / 10) * 10 * Math.round(b / 10) * 10).toLocaleString()}, so the answer must sit near that.`,
        improve: "Type multiplications in one pass without watching your fingers. If you looked at the keypad, that is the skill to drill, not the maths." });
    }
  }
  return out;
}

const CLINICS = ["Ashfield", "Brentmoor", "Calder Vale", "Denholm", "Eastgate", "Fenwick"];

function qRatio(L) {
  const parts = [rnd(1, 5), rnd(2, 7)];
  const unitVal = L.round ? rnd(2, 9) * 10 : rnd(23, 94);
  const total = (parts[0] + parts[1]) * unitVal;
  const correct = parts[1] * unitVal;
  return {
    context: `Two wards share a delivery of ${total.toLocaleString()} dressing packs in the ratio ${parts[0]}:${parts[1]}.`,
    prompt: "Approximately how many packs does the second ward receive?",
    correct, unit: null, tag: "qratio",
    working: `${parts[0]} + ${parts[1]} = ${parts[0] + parts[1]} parts. ${total.toLocaleString()} ÷ ${parts[0] + parts[1]} = ${unitVal.toLocaleString()} per part. Second ward: ${parts[1]} × ${unitVal.toLocaleString()} = ${correct.toLocaleString()}.`,
    improve: "Every ratio question is the same three steps: add the parts, divide the total by that, multiply by the parts you want. Say 'per one part' to yourself and the method appears.",
  };
}

function qGraph(L) {
  const labels = ["Q1", "Q2", "Q3", "Q4"];
  const vals = labels.map(() => (L.round ? rnd(2, 9) * 10 : rnd(24, 96)));
  const kind = pick(["diff", "mean", "rise"]);
  let prompt, correct, working;
  if (kind === "diff") {
    const hi = Math.max(...vals), lo = Math.min(...vals);
    prompt = "Approximately what is the difference between the highest and lowest quarters?";
    correct = Math.max(hi - lo, 1);
    working = `Highest bar ${hi}, lowest bar ${lo}. ${hi} minus ${lo} = ${hi - lo}.`;
  } else if (kind === "mean") {
    prompt = "Approximately what is the mean value across the four quarters?";
    correct = vals.reduce((a, b) => a + b, 0) / 4;
    working = `${vals.join(" + ")} = ${vals.reduce((a, b) => a + b, 0)}, divided by 4 = ${correct.toFixed(1)}.`;
  } else {
    let bi = 1, best = -Infinity;
    for (let i = 1; i < 4; i++) if (vals[i] - vals[i - 1] > best) { best = vals[i] - vals[i - 1]; bi = i; }
    prompt = "Approximately how large is the biggest quarter-on-quarter change?";
    correct = Math.max(Math.abs(best), 1);
    working = `Compare neighbours: the biggest change is ${labels[bi - 1]} to ${labels[bi]}, ${vals[bi - 1]} to ${vals[bi]}, a change of ${Math.abs(vals[bi] - vals[bi - 1])}.`;
  }
  return {
    context: `${pick(CLINICS)} Clinic's admissions per quarter (hundreds):`,
    graph: { labels, values: vals },
    prompt, correct, unit: null, tag: "qgraph", working,
    improve: "Graph errors are nearly always axis errors. Read the axis label and units before the bars, then touch only the two bars the question names.",
  };
}

function qRate(L) {
  const kind = pick(["speed", "output"]);
  if (kind === "speed") {
    const speed = L.round ? pick([40, 50, 60, 80]) : rnd(43, 87);
    const mins = L.round ? pick([30, 60, 90, 120]) : rnd(35, 155);
    const correct = (speed * mins) / 60;
    return {
      context: `A patient transport vehicle averages ${speed} km/h for ${mins} minutes.`,
      prompt: "Approximately how far does it travel?",
      correct, unit: { post: " km" }, tag: "qrate",
      working: `${mins} minutes = ${(mins / 60).toFixed(2)} hours. ${speed} × ${(mins / 60).toFixed(2)} = ${correct.toFixed(1)} km.`,
      improve: "Convert minutes to hours before touching the speed, never after. Units first is the whole rates method.",
    };
  }
  const staff = L.round ? pick([4, 5, 8, 10]) : rnd(6, 14);
  const perHr = L.round ? rnd(2, 6) * 5 : rnd(9, 34);
  const hrs = rnd(4, 9);
  const correct = staff * perHr * hrs;
  return {
    context: `A vaccination team of ${staff} staff each administer about ${perHr} doses an hour across a ${hrs}-hour clinic.`,
    prompt: "Approximately how many doses are given in total?",
    correct, unit: null, tag: "qrate",
    working: `${perHr} × ${hrs} = ${perHr * hrs} per member of staff, × ${staff} staff = ${correct.toLocaleString()}.`,
    improve: "Chain rates one link at a time: per hour, then per person, then the team. Multiplying everything in one go is where slips happen.",
  };
}

function qPct(L) {
  const kind = pick(["change", "share", "discount"]);
  if (kind === "change") {
    const a = L.round ? rnd(20, 60) * 10 : rnd(240, 680);
    const up = L.round ? pick([10, 20, 25, 50]) : rnd(8, 62);
    const b = Math.round(a * (1 + up / 100));
    const correct = ((b - a) / a) * 100;
    return {
      context: `Referrals rose from ${a.toLocaleString()} in Year 1 to ${b.toLocaleString()} in Year 2.`,
      prompt: "Approximately what was the percentage increase?",
      correct, unit: { post: "%" }, tag: "qpct",
      working: `Difference ${b - a}. Divide by the original: ${b - a} ÷ ${a} gives about ${correct.toFixed(0)}%.`,
      improve: "Percentage change is always difference over original, and the original is the earlier figure. Dividing by the new figure is the classic error.",
    };
  }
  if (kind === "share") {
    const total = L.round ? rnd(40, 90) * 100 : rnd(3800, 9400);
    const part = Math.round(total * (rnd(12, 62) / 100));
    const correct = (part / total) * 100;
    return {
      context: `Of ${total.toLocaleString()} enquiries last year, ${part.toLocaleString()} were resolved on first contact.`,
      prompt: "Approximately what percentage were resolved on first contact?",
      correct, unit: { post: "%" }, tag: "qpct",
      working: `${part.toLocaleString()} ÷ ${total.toLocaleString()} gives about ${correct.toFixed(0)}%.`,
      improve: "Part over whole, then shift the decimal two places. If your answer is over 100%, you divided the wrong way round.",
    };
  }
  const unitP = L.round ? pick([2, 4, 5, 10]) : Number((rnd(180, 940) / 100).toFixed(2));
  const qty = L.round ? rnd(20, 90) * 10 : rnd(340, 1880);
  const disc = pick([5, 10, 15, 20]);
  const correct = unitP * qty * (1 - disc / 100);
  return {
    context: `A supplier charges £${unitP.toFixed(2)} per unit. An order of ${qty.toLocaleString()} units carries a ${disc}% discount.`,
    prompt: "Approximately what is the total cost?",
    correct, unit: { pre: "£" }, tag: "qpct",
    working: `Full price ${unitP.toFixed(2)} × ${qty.toLocaleString()} = £${Math.round(unitP * qty).toLocaleString()}. Take ${disc}% off by multiplying by ${(1 - disc / 100).toFixed(2)}: about £${Math.round(correct).toLocaleString()}.`,
    improve: "Multiply by one minus the discount in a single step rather than finding the discount and subtracting. One operation, one chance to slip instead of two.",
  };
}

function qInfer(L) {
  const start = L.round ? rnd(10, 40) * 10 : rnd(120, 460);
  const step = L.round ? pick([10, 20, 50]) : rnd(12, 58);
  const vals = [start, start + step, start + 2 * step, start + 3 * step];
  const correct = start + 4 * step;
  return {
    context: `Weekly clinic attendances over four weeks: ${vals.map((v) => v.toLocaleString()).join(", ")}.`,
    prompt: "If the trend continues, approximately how many attendances are expected in week five?",
    correct, unit: null, tag: "qinfer",
    working: `The step is constant: each week rises by ${step}. Week five: ${vals[3].toLocaleString()} + ${step} = ${correct.toLocaleString()}.`,
    improve: "Find the step between consecutive values before anything else. If it is constant, project it forward one step.",
  };
}

function qUnits(L) {
  const kind = pick(["ml", "g", "min"]);
  if (kind === "ml") {
    const per = L.round ? pick([50, 100, 200, 250]) : rnd(35, 240);
    const n = L.round ? rnd(2, 9) * 10 : rnd(14, 96);
    const correct = (per * n) / 1000;
    return {
      context: `Each patient receives ${per} ml of mouthwash. A clinic sees ${n} patients in a week.`,
      prompt: "Approximately how many litres are used in the week?",
      correct, unit: { post: " L" }, tag: "qunit",
      working: `${per} × ${n} = ${(per * n).toLocaleString()} ml. Divide by 1,000 for litres: ${correct.toFixed(1)} L.`,
      improve: "Multiply in the small unit, convert once at the end. Converting first invites a factor-of-1,000 slip in the middle of the arithmetic.",
    };
  }
  if (kind === "g") {
    const per = L.round ? pick([40, 80, 125, 250]) : rnd(28, 340);
    const n = L.round ? rnd(2, 8) * 10 : rnd(12, 88);
    const correct = (per * n) / 1000;
    return {
      context: `A sterile pack weighs ${per} g. A delivery contains ${n} packs.`,
      prompt: "Approximately how many kilograms does the delivery weigh?",
      correct, unit: { post: " kg" }, tag: "qunit",
      working: `${per} × ${n} = ${(per * n).toLocaleString()} g, and 1,000 g is 1 kg, giving ${correct.toFixed(1)} kg.`,
      improve: "Grams to kilograms is three decimal places, always. Sanity check the size: a delivery weighing thousands of kilograms should feel wrong.",
    };
  }
  const per = L.round ? pick([15, 20, 30, 45]) : rnd(12, 55);
  const n = L.round ? rnd(4, 12) : rnd(6, 22);
  const correct = (per * n) / 60;
  return {
    context: `Appointments last ${per} minutes each, and ${n} are booked for the day.`,
    prompt: "Approximately how many hours of clinic time is that?",
    correct, unit: { post: " hrs" }, tag: "qunit",
    working: `${per} × ${n} = ${per * n} minutes. Divide by 60: ${correct.toFixed(1)} hours.`,
    improve: "Minutes to hours divides by 60, not 100. It is the single most common conversion slip under time pressure, so say 'sixty' to yourself as you divide.",
  };
}

/* ------------------------------ WORKING DIAGRAM ------------------- */
/* Drawn on a wrong answer: shows the method as a picture, not prose. */


/* ------------------------------ QR DATA SETS ---------------------- */
/* The real section runs mostly as sets of four questions sharing one */
/* table, with five options and comparison-style answers. Generated   */
/* fresh every run, with full working for each question.              */

const DS_CTX = [
  { title: "Monthly juice sales at an airport cafe (litres)", rows: ["Orange", "Apple", "Cranberry"], cols: ["Jan", "Feb", "Mar", "Apr"], unit: "L", money: false },
  { title: "Referrals received by department", rows: ["Cardiology", "Geriatrics", "Respiratory"], cols: ["Q1", "Q2", "Q3", "Q4"], unit: "", money: false },
  { title: "Practice takings by treatment type", rows: ["Check-ups", "Fillings", "Hygiene"], cols: ["Jan", "Feb", "Mar", "Apr"], unit: "", money: true },
  { title: "Weekly attendances by clinic site", rows: ["Ashfield", "Brentmoor", "Calder Vale"], cols: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"], unit: "", money: false },
];

function fiveOpt(correct, money, suffix) {
  const dress = (v) => {
    const n = Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(1));
    return (money ? "£" : "") + n.toLocaleString() + (suffix || "");
  };
  const seen = new Set([dress(correct)]);
  const opts = [dress(correct)];
  const push = (v) => { const d = dress(v); if (!seen.has(d)) { seen.add(d); opts.push(d); return true; } return false; };
  const nudges = [1.08, 0.92, 1.17, 0.84, 1.26, 0.75, 1.4, 0.6];
  for (const k of nudges) { if (opts.length >= 5) break; push(correct * k); }
  /* Additive fallback so a zero or tiny correct value cannot loop here
     forever (every multiplicative nudge of it rounds to the same string). */
  const step = Math.abs(correct) >= 100 ? Math.max(1, Math.round(Math.abs(correct) * 0.05)) : Math.abs(correct) >= 1 ? 1 : 0.1;
  for (let i = 1; opts.length < 5 && i <= 200; i++) {
    if (!push(correct + i * step)) push(correct - i * step);
  }
  return { options: shuffle(opts), answer: dress(correct) };
}

function makeQrSet(lvl) {
  const L = LEVELS[lvl];
  const c = pick(DS_CTX);
  const data = c.rows.map(() => c.cols.map(() => (L.round ? rnd(4, 40) * 10 : rnd(48, 690))));
  const table = { title: c.title, rows: c.rows, cols: c.cols, data, money: c.money, unit: c.unit };
  const out = [];
  const tot = (r) => data[r].reduce((a, b) => a + b, 0);

  /* 1. percentage change between two columns for one row. Pick a pair
     that actually changed, so the question is not a hollow 'rose by 0%'. */
  let r1 = rnd(0, c.rows.length - 1), ci = rnd(0, c.cols.length - 2);
  for (let attempt = 0; attempt < 12 && data[r1][ci] === data[r1][ci + 1]; attempt++) {
    r1 = rnd(0, c.rows.length - 1); ci = rnd(0, c.cols.length - 2);
  }
  const a1 = data[r1][ci], b1 = data[r1][ci + 1];
  const pc = ((b1 - a1) / a1) * 100;
  const o1 = fiveOpt(Math.abs(pc), false, "%");
  out.push({ kind: "mcq", table, stem: `By approximately what percentage did ${c.rows[r1].toLowerCase()} ${pc >= 0 ? "rise" : "fall"} between ${c.cols[ci]} and ${c.cols[ci + 1]}?`,
    options: o1.options, answer: o1.answer, tag: "qset", section: "QR", drill: "qrset",
    working: `Difference is ${Math.abs(b1 - a1).toLocaleString()}. Divide by the ORIGINAL figure, ${a1.toLocaleString()}, not the new one: that gives about ${Math.abs(pc).toFixed(1)}%.`,
    diagram: { type: "pctchange", a: a1.toLocaleString(), b: b1.toLocaleString(), diff: Math.abs(b1 - a1).toLocaleString(), res: Math.abs(pc).toFixed(1) + "%" },
    improve: "Percentage change is difference over original, and the original is always the earlier column. Dividing by the later figure is the single most common QR error." });

  /* 2. comparison answer: which row is larger and by how much */
  const rA = 0, rB = 1;
  const tA = tot(rA), tB = tot(rB);
  const bigger = tA >= tB ? c.rows[rA] : c.rows[rB];
  const gap = Math.abs(tA - tB);
  const gapStr = (c.money ? "£" : "") + gap.toLocaleString();
  const comp = [
    `${bigger}, by ${gapStr}`,
    `${tA >= tB ? c.rows[rB] : c.rows[rA]}, by ${gapStr}`,
    `${bigger}, by ${(c.money ? "£" : "") + Math.round(gap * 1.3).toLocaleString()}`,
    `${bigger}, by ${(c.money ? "£" : "") + Math.round(gap * 0.7).toLocaleString()}`,
    "Neither, as they are the same",
  ];
  out.push({ kind: "mcq", table, stem: `Across the whole period, which was greater, ${c.rows[rA].toLowerCase()} or ${c.rows[rB].toLowerCase()}, and by how much?`,
    options: shuffle(comp), answer: comp[0], tag: "qset", section: "QR", drill: "qrset",
    working: `${c.rows[rA]} totals ${tA.toLocaleString()}, ${c.rows[rB]} totals ${tB.toLocaleString()}. The difference is ${gap.toLocaleString()}, so ${bigger} is greater by ${gapStr}.`,
    diagram: { type: "compare", nA: c.rows[rA], nB: c.rows[rB], tA, tB, bigger, gap: gapStr },
    improve: "Comparison options carry two things to get right: which one, and by how much. Candidates who rush get the direction right and the gap wrong, which scores nothing. Total both rows fully before comparing." });

  /* 3. mean per column */
  const r3 = rnd(0, c.rows.length - 1);
  const mean = tot(r3) / c.cols.length;
  const o3 = fiveOpt(mean, c.money, "");
  out.push({ kind: "mcq", table, stem: `What was the mean ${c.rows[r3].toLowerCase()} figure per ${c.cols[0].startsWith("Q") ? "quarter" : c.cols[0].startsWith("Wk") ? "week" : "month"}?`,
    options: o3.options, answer: o3.answer, tag: "qset", section: "QR", drill: "qrset",
    working: `Total for ${c.rows[r3].toLowerCase()} is ${tot(r3).toLocaleString()}, divided by ${c.cols.length} gives ${mean.toFixed(1)}.`,
    diagram: { type: "mean", cells: data[r3], total: tot(r3).toLocaleString(), n: c.cols.length, res: mean.toFixed(1) },
    improve: "Add the row once, carefully, then divide. If you find yourself re-adding, you lost more time than the question was worth: write the running total down." });

  /* 4. share of grand total */
  const grand = data.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
  const r4 = rnd(0, c.rows.length - 1);
  const share = (tot(r4) / grand) * 100;
  const o4 = fiveOpt(share, false, "%");
  out.push({ kind: "mcq", table, stem: `What proportion of the overall total came from ${c.rows[r4].toLowerCase()}?`,
    options: o4.options, answer: o4.answer, tag: "qset", section: "QR", drill: "qrset",
    working: `${c.rows[r4]} totals ${tot(r4).toLocaleString()}. The grand total across every row is ${grand.toLocaleString()}. ${tot(r4).toLocaleString()} divided by ${grand.toLocaleString()} is about ${share.toFixed(1)}%.`,
    diagram: { type: "share", part: tot(r4).toLocaleString(), whole: grand.toLocaleString(), pct: share, res: share.toFixed(1) + "%" },
    improve: "Part over whole. The whole is every cell in the table, not the row or column you happen to be looking at. Sketch the grand total once and reuse it across the set." });

  return out;
}

function makeQrSets(n, lvl) {
  const out = [];
  while (out.length < n) out.push(...makeQrSet(lvl));
  return out.slice(0, n);
}

const EST_FAMILIES = { ratio: qRatio, graph: qGraph, rate: qRate, pct: qPct, infer: qInfer, unit: qUnits };

function makeEstimate(n, weak, lvl, sub) {
  const L = LEVELS[lvl];
  const fams = sub && sub !== "mixed" ? [sub] : Object.keys(EST_FAMILIES);
  const out = [];
  for (let i = 0; i < n; i++) {
    const fam = fams.length === 1 ? fams[0] : weightedPick(fams, weak, "e");
    const q = EST_FAMILIES[fam](L);
    const { options, answer } = fiveOptions(q.correct, L.spread, q.unit);
    out.push({ kind: "mcq", context: q.context, graph: q.graph || null, prompt: q.prompt, options, answer, tag: q.tag, section: "QR", drill: "estimate", working: q.working, improve: q.improve });
  }
  return out;
}

function makeScan(n, weak) {
  const ids = PASSAGES.map((p) => p.id);
  const out = [];
  for (let i = 0; i < n; i++) {
    const pid = weightedPick(ids, weak, "s");
    const p = PASSAGES.find((x) => x.id === pid);
    const f = pick(p.facts);
    out.push({ kind: "typed", prompt: f.q, answer: f.a, tol: 0, passageText: p.text, passageTitle: p.title, tag: "s" + pid, section: "VR", drill: "scan",
      working: `The answer, ${f.a}, sits in one sentence of the passage. The question told you its shape before you started looking.`,
      improve: "Decide the shape of the answer from the question, a year, a number, a phrase, then scan only for that shape. If you read whole sentences, you searched too slowly." });
  }
  return out;
}

function makeSjt(n, weak, theme, seen) {
  const scen = SJT_SCENARIOS.filter((s) => !theme || theme === "all" || s.theme === theme);
  const all = [];
  scen.forEach((sc) => {
    if (sc.ranking) all.push({ key: `sjt:${sc.id}#rank`, sc, rank: true });
    (sc.items || []).forEach((it, idx) => all.push({ key: `sjt:${sc.id}#${idx}`, sc, it }));
  });
  if (!all.length) return [];
  const { chosen, cycled } = pickUnseen(all, seen, n);
  const out = chosen.map((c) => {
    const sc = c.sc;
    if (c.rank) {
      return { kind: "rank", scenarioText: sc.text, sid: sc.id, seenKey: c.key, themeName: SJT_THEMES[sc.theme].name, stem: sc.ranking.stem, options: sc.ranking.options, order: sc.ranking.order, why: sc.ranking.why, improve: sc.ranking.fix, tag: "jrank", section: "SJT", drill: "sjt", typeName: "Ranking" };
    }
    const it = c.it;
    return { kind: "scale", scenarioText: sc.text, sid: sc.id, seenKey: c.key, themeName: SJT_THEMES[sc.theme].name, stem: it.stem, options: it.type === "importance" ? IMPORT : APPROP, answer: it.answer, why: it.why, improve: it.fix, tag: "j" + it.type, section: "SJT", drill: "sjt", typeName: SJT_TYPES[it.type].name };
  });
  out.cycled = cycled;
  return out;
}

/* ---- VR reading comprehension: four-option inference on a passage. ----
   The other half of Verbal Reasoning alongside true/false/can't tell.
   Drawn from the mock passage bank, which carries the reasoning and the
   exact evidence line for each answer. Strict no-repeat by question. */
function makeInfer(n, weak, seen) {
  const all = [];
  MOCK_BANK.forEach((set) => {
    const p = mockPassage(set.pid);
    if (!p) return;
    set.questions.forEach((q, idx) => all.push({ key: `vr:infer:${set.pid}#${idx}`, p, q }));
  });
  if (!all.length) return [];
  const { chosen, cycled } = pickUnseen(all, seen, n);
  const out = chosen.map(({ key, p, q }) => ({
    kind: "mcq", passageText: p.text, passageTitle: p.title,
    stem: q.stem, options: q.options, answer: q.options[q.a],
    tag: "cinfer", seenKey: key, section: "VR", drill: "infer",
    why: q.why, evidence: q.evidence,
    improve: "Comprehension is not recall. Work out what the question is really asking, then find the one line that settles it. If the passage never says it, it is not the answer, however true it sounds.",
  }));
  out.cycled = cycled;
  return out;
}

/* ---- Fix my weak spots: a mixed set pulled from the tags you miss most,
   proactively rather than waiting for the mistake bank. ---- */
function genForTag(tag, count, weak, seen) {
  if (/^f/.test(tag)) return makeTables(count, weak, "hard");
  if (["cpct", "cdiv", "cmul"].includes(tag)) return makeCalc(count, weak, "hard");
  if (["qratio", "qgraph", "qrate", "qpct", "qinfer", "qunit"].includes(tag)) return makeEstimate(count, weak, "hard", { qratio: "ratio", qgraph: "graph", qrate: "rate", qpct: "pct", qinfer: "infer", qunit: "unit" }[tag]);
  if (tag === "qset") return makeQrSets(count, "hard");
  if (tag === "cinfer") return makeInfer(count, weak, seen);
  if (/^t/.test(tag)) return makeTfc(count, weak, seen);
  if (/^j/.test(tag)) return makeSjt(count, weak, "all", seen);
  return null;
}
function makeWeakSpots(n, weak, seen) {
  const tags = Object.entries(weak || {}).filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const out = [];
  const per = Math.max(2, Math.ceil(n / Math.max(Math.min(tags.length, 5), 1)));
  for (const tag of tags) {
    if (out.length >= n * 1.5) break;
    const g = genForTag(tag, per, weak, seen);
    if (g && g.length) out.push(...g);
  }
  /* Not enough weakness data yet: fall back to a broad mix. */
  if (out.length < n) out.push(...makeTfc(n, weak, seen), ...makeCalc(n, weak, "hard"), ...makeSjt(n, weak, "all", seen));
  return shuffle(out).slice(0, n);
}

const WEAK_LABEL = {
  cinfer: "Reading comprehension",
  cpct: "Percentages (calculator)", cdiv: "Long division", cmul: "Long multiplication",
  qset: "QR data sets", qratio: "Ratios", qgraph: "Graphs", qrate: "Rates and time", qpct: "Percentages", qinfer: "Inference",
  jappropriateness: "SJT appropriateness", jimportance: "SJT importance", jrank: "SJT ranking",
  dsyll: "Syllogisms", dvenn: "Venn diagrams", dprob: "Probability", dlogic: "Logic puzzles",
  sreservoir: "Reservoir passage", sprinting: "Press passage", salloy: "Alloy passage",
  slido: "Lido passage", sowls: "Owls passage", scontainer: "Container passage", qunit: "Unit conversions",
  treservoir: "T/F/CT reservoir", tprinting: "T/F/CT press", talloy: "T/F/CT alloy", tlido: "T/F/CT lido", towls: "T/F/CT owls", tcontainer: "T/F/CT container",
};
function weakLabel(tag) {
  if (WEAK_LABEL[tag]) return WEAK_LABEL[tag];
  if (tag.startsWith("f")) return `${tag.slice(1)} times table`;
  return tag;
}

/* ------------------------------ STORAGE --------------------------- */
/* getJSON, setJSON and the shared-storage helpers now come from the  */
/* storage adapter (./storage.js), which detects localStorage,        */
/* falls back to memory, and never throws. Supabase can be registered */
/* as the shared backend for a real global leaderboard.               */

async function loadState() {
  const [unlocked, best, history, plan, weak, level, mistakes, prefs, seenBank] = await Promise.all([
    getJSON("ucat:unlocked", false), getJSON("ucat:best", {}), getJSON("ucat:history", []),
    getJSON("ucat:plan", {}), getJSON("ucat:weak", {}), getJSON("ucat:level", "hard"),
    getJSON("ucat:mistakes", []), getJSON("ucat:prefs", {}), getJSON("ucat:seenbank", {}),
  ]);
  /* Medium was removed. Anyone still on it is moved to Hard, the new
     default, so no saved preference points at a level that no longer exists. */
  const safeLevel = LEVELS[level] ? level : "hard";
  return { unlocked: unlocked === true, best, history, plan, weak, level: safeLevel, mistakes, prefs, seenBank };
}

/* Styles live in ./styles.js and are imported as CSS at the top. */

/* ------------------------------ EXIT GUARD ------------------------ */



/* ------------------------------ UCAT CALCULATOR ------------------- */
/* Replica of the Pearson VUE on-screen calculator used in the exam:  */
/* same button layout, trailing-dot display, M indicator, and the     */
/* documented keyboard mappings.                                      */

const fmtNum = (n) => {
  if (!isFinite(n)) return "0";
  return String(Number(n.toFixed(8)));
};

function Calculator() {
  const [st, setSt] = useState({ disp: "0", acc: null, op: null, fresh: true, mem: 0, last: null });
  const [eye, setEye] = useState(false);
  const [banner, setBanner] = useState(false);

  useEffect(() => { getJSON("ucat:calceye", 0).then((v) => { if (!v) setBanner(true); }); }, []);

  const toggleEye = useCallback(() => {
    setEye((o) => !o);
    setBanner((b) => { if (b) setJSON("ucat:calceye", 1); return false; });
  }, []);

  const applyOp = (a, b, o) => o === "+" ? a + b : o === "-" ? a - b : o === "*" ? a * b : o === "/" ? (b === 0 ? 0 : a / b) : b;

  const digit = useCallback((d) => setSt((p) => ({ ...p, disp: (p.fresh || p.disp === "0") ? d : (p.disp.replace("-", "").length < 10 ? p.disp + d : p.disp), fresh: false, last: "d" })), []);
  const dot = useCallback(() => setSt((p) => p.fresh ? { ...p, disp: "0.", fresh: false, last: "d" } : (p.disp.includes(".") ? p : { ...p, disp: p.disp + ".", last: "d" })), []);
  const oper = useCallback((o) => setSt((p) => {
    const v = parseFloat(p.disp);
    if (p.acc !== null && p.op && !p.fresh) {
      const r = applyOp(p.acc, v, p.op);
      return { ...p, acc: r, disp: fmtNum(r), op: o, fresh: true, last: "op" };
    }
    return { ...p, acc: v, op: o, fresh: true, last: "op" };
  }), []);
  const equals = useCallback(() => setSt((p) => {
    if (p.acc === null || !p.op) return { ...p, last: "=" };
    const r = applyOp(p.acc, parseFloat(p.disp), p.op);
    return { ...p, disp: fmtNum(r), acc: null, op: null, fresh: true, last: "=" };
  }), []);
  const clearAll = useCallback(() => setSt((p) => ({ ...p, disp: "0", acc: null, op: null, fresh: true, last: "C" })), []);
  const sign = useCallback(() => setSt((p) => ({ ...p, disp: p.disp.startsWith("-") ? p.disp.slice(1) : (p.disp === "0" ? p.disp : "-" + p.disp), last: "±" })), []);
  const sqrt = useCallback(() => setSt((p) => {
    const v = parseFloat(p.disp);
    return { ...p, disp: v < 0 ? "0" : fmtNum(Math.sqrt(v)), fresh: true, last: "√" };
  }), []);
  const pct = useCallback(() => setSt((p) => {
    const v = parseFloat(p.disp);
    const r = (p.acc !== null && p.op) ? (p.acc * v) / 100 : v / 100;
    return { ...p, disp: fmtNum(r), fresh: true, last: "%" };
  }), []);
  const mrc = useCallback(() => setSt((p) => p.last === "MRC"
    ? { ...p, mem: 0, last: null }
    : { ...p, disp: fmtNum(p.mem), fresh: true, last: "MRC" }), []);
  const mPlus = useCallback(() => setSt((p) => ({ ...p, mem: p.mem + parseFloat(p.disp || "0"), fresh: true, last: "M+" })), []);
  const mMinus = useCallback(() => setSt((p) => ({ ...p, mem: p.mem - parseFloat(p.disp || "0"), fresh: true, last: "M-" })), []);

  /* Exam keyboard mappings. Ignored while typing in the answer box. */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const k = e.key;
      let handled = true;
      if (/^[0-9]$/.test(k)) digit(k);
      else if (k === ".") dot();
      else if (k === "+" || k === "-" || k === "*" || k === "/") oper(k);
      else if (k === "Enter" || k === "=") equals();
      else if (k === "Backspace") clearAll();
      else if (k === "c" || k === "C") mrc();
      else if (k === "p" || k === "P") mPlus();
      else if (k === "m" || k === "M") mMinus();
      else if (k === "%") pct();
      else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [digit, dot, oper, equals, clearAll, mrc, mPlus, mMinus, pct]);

  const shown = st.disp.includes(".") ? st.disp : st.disp + ".";

  const KEYS = [
    ["ON/C", clearAll, "memk"], ["MRC", mrc, "memk"], ["M-", mMinus, "memk"], ["M+", mPlus, "memk"],
    ["%", pct, ""], ["+/-", sign, ""], ["√", sqrt, ""], ["÷", () => oper("/"), ""],
    ["7", () => digit("7"), ""], ["8", () => digit("8"), ""], ["9", () => digit("9"), ""], ["×", () => oper("*"), ""],
    ["4", () => digit("4"), ""], ["5", () => digit("5"), ""], ["6", () => digit("6"), ""], ["−", () => oper("-"), ""],
    ["1", () => digit("1"), ""], ["2", () => digit("2"), ""], ["3", () => digit("3"), ""], ["+", () => oper("+"), ""],
    ["0", () => digit("0"), ""], [".", dot, ""],
  ];

  const SHORTCUTS = [
    ["0-9", "Number pad digits (Num Lock must be on in the exam)"],
    ["Enter", "Equals"],
    ["+ - * /", "Add, subtract, multiply, divide"],
    [".", "Decimal point"],
    ["Backspace", "Clears everything, same as ON/C"],
    ["C", "MRC. Press once to recall memory, twice to wipe it"],
    ["P", "M+, adds the display to memory"],
    ["M", "M-, subtracts the display from memory"],
    ["%", "Percent"],
    ["Alt + C", "Opens the calculator in the real exam"],
  ];

  return (
    <div className="vue-wrap">
      <div className="vue-calc">
        {banner && !eye && (
          <div className="vue-banner">Press the eye to see the exam shortcuts</div>
        )}
        <div className="vue-title">
          <span>Calculator</span>
          <span className="win">
            <button className="vue-eye" onClick={toggleEye} aria-label="Show or hide keyboard shortcuts" aria-pressed={eye}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/></svg>
            </button>
            <span className="vue-x" title="In the exam, this closes the calculator window" aria-hidden="true">✕</span>
          </span>
        </div>
        <div className="vue-disp">
          <span className="mflag">{st.mem !== 0 ? "M" : ""}</span>
          <span className="num mono">{shown}</span>
        </div>
        <div className="vue-grid">
          {KEYS.map(([l, fn, cls]) => (
            <button key={l} type="button" className={`vue-key ${cls}`} onClick={fn}>{l}</button>
          ))}
          <button type="button" className="vue-key eq" onClick={equals}>=</button>
        </div>
      </div>
      {eye && (
        <div className="vue-panel">
          <h5>Exam keyboard shortcuts</h5>
          {SHORTCUTS.map(([k, d]) => (
            <div className="vue-row" key={k}><b>{k}</b><span>{d}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ DRILL RUNNER ---------------------- */

/* Score one question from a saved answer snapshot { picked, rankPicks,
   syllPicks, val }. Used by the free-navigation banks to mark every
   answer at the end. Mirrors the per-kind logic in the live recorder. */
function scoreEntry(q, snap, ms) {
  let correct = false, score = 0, givenLabel = "", picks = null;
  if (q.kind === "syllset") {
    picks = snap && snap.syllPicks ? snap.syllPicks : [];
    let hits = 0;
    q.statements.forEach((st, idx) => { const p2 = picks[idx]; if (p2 !== undefined && p2 !== null && (p2 === 1) === st.yes) hits++; });
    score = hits / q.statements.length; correct = hits === q.statements.length;
    givenLabel = `${hits}/${q.statements.length} conclusions right`;
  } else if (q.kind === "rank") {
    const rp = snap && snap.rankPicks ? snap.rankPicks : [];
    if (rp.length !== 3) { givenLabel = "no answer"; }
    else { let hits = 0; rp.forEach((p, idx) => { if (q.order[idx] === p) hits++; }); score = hits / 3; correct = hits === 3; givenLabel = rp.map((p) => String.fromCharCode(65 + p)).join(" then "); }
  } else if (q.kind === "scale") {
    const idx = snap ? snap.picked : null;
    if (idx === null || idx === undefined) { givenLabel = "no answer"; }
    else { const dist = Math.abs(idx - q.answer); score = dist === 0 ? 1 : dist === 1 ? 0.5 : 0; correct = dist === 0; givenLabel = q.options[idx]; }
  } else if (q.kind === "mcq") {
    const idx = snap ? snap.picked : null;
    if (idx === null || idx === undefined) { givenLabel = "no answer"; }
    else { const given = q.options[idx]; correct = given === q.answer; score = correct ? 1 : 0; givenLabel = String(given); }
  } else {
    const g = String((snap ? snap.val : "") ?? "").trim().toLowerCase();
    const want = String(q.answer).trim().toLowerCase();
    if (g !== "") {
      if (q.tol > 0) { const gn = parseFloat(g.replace(/,/g, "")), wn = parseFloat(want); correct = !isNaN(gn) && Math.abs(gn - wn) <= Math.abs(wn) * q.tol; }
      else correct = g.replace(/,/g, "") === want.replace(/,/g, "");
    }
    score = correct ? 1 : 0; givenLabel = g || "no answer";
  }
  return { q, correct, score, ms: ms || 0, given: givenLabel, picks };
}

/* Is a saved snapshot a complete answer for its question's kind? */
function snapAnswered(q, snap) {
  if (!snap) return false;
  if (q.kind === "scale" || q.kind === "mcq") return snap.picked !== null && snap.picked !== undefined;
  if (q.kind === "rank") return !!snap.rankPicks && snap.rankPicks.length === 3;
  if (q.kind === "syllset") return q.statements.every((_, k) => snap.syllPicks && (snap.syllPicks[k] === 0 || snap.syllPicks[k] === 1));
  return !!snap.val && snap.val.trim() !== "";
}

function DrillRunner({ drill, questions, exam, budget, showCalc, hideStart, reviewEnd, level, onDone, onQuit }) {
  /* No per-question feedback when timed, or when the user chose to review
     only at the end. Feedback after each answer is the tutor default. */
  const noFeedback = exam || reviewEnd;
  /* Easy leads with the strategy so the method is learned first; Hard
     keeps the terse exam-style reasoning the real UCAT would give. */
  const easyMode = level === "easy";
  const [confirmExit, setConfirmExit] = useState(false);
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [rankPicks, setRankPicks] = useState([]);
  const [syllPicks, setSyllPicks] = useState([]);
  const [picked, setPicked] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [showWhy, setShowWhy] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [log, setLog] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("answer");
  const [lastEntry, setLastEntry] = useState(null);
  const [revealed, setRevealed] = useState(!hideStart);
  const revealedRef = useRef(!hideStart);
  useEffect(() => { revealedRef.current = revealed; }, [revealed]);
  const gated = hideStart && !revealed;
  const start = useRef(Date.now());
  const inputRef = useRef(null);
  const valRef = useRef("");
  const phaseRef = useRef("answer");
  const rankRef = useRef([]);
  const syllRef = useRef([]);
  const budgetMs = (budget || 0) * 1000;

  useEffect(() => { valRef.current = val; }, [val]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { rankRef.current = rankPicks; }, [rankPicks]);
  useEffect(() => { syllRef.current = syllPicks; }, [syllPicks]);

  const q = questions[i];

  const advance = useCallback((list) => {
    if (i + 1 >= questions.length) onDone(list);
    else { setI(i + 1); setVal(""); setRankPicks([]); setSyllPicks([]); setPicked(null); setShowWhy(false); setPhase("answer"); setRevealed(!hideStart); start.current = Date.now(); setElapsed(0); }
  }, [i, questions.length, onDone, hideStart]);

  const reveal = () => { setRevealed(true); start.current = Date.now(); setElapsed(0); };

  /* The Pearson-style banks (SJT, DM, QR data sets) offer free navigation
     with a Navigator and an end-of-section review, exactly like the real
     exam, whenever feedback is deferred (timed or review-at-end). Answers
     are held per index so a question can be revisited and changed, and the
     whole set is marked at the finish. */
  const examSkin = drill.section === "SJT" || drill.id === "qrset";
  const navigable = noFeedback && examSkin;
  const [answers, setAnswers] = useState([]);
  const [navOpen, setNavOpen] = useState(false);
  const [secLeft, setSecLeft] = useState(exam ? (budget || 0) * questions.length : 0);
  const answersRef = useRef([]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const curSnap = () => ({ picked, rankPicks, syllPicks, val });
  const navFinish = useCallback(() => {
    const a = [...answersRef.current];
    a[i] = { picked, rankPicks, syllPicks, val };
    onDone(questions.map((qq, idx) => scoreEntry(qq, a[idx], 0)));
  }, [i, picked, rankPicks, syllPicks, val, questions, onDone]);
  const navFinishRef = useRef(navFinish);
  useEffect(() => { navFinishRef.current = navFinish; }, [navFinish]);

  const navGo = (n) => {
    const a = [...answersRef.current];
    a[i] = curSnap();
    setAnswers(a); answersRef.current = a;
    setI(n); setNavOpen(false);
    const s = a[n];
    setPicked(s ? s.picked : null); setRankPicks(s ? s.rankPicks : []); setSyllPicks(s ? s.syllPicks : []); setVal(s ? s.val : "");
    setPhase("answer"); setRevealed(!hideStart);
  };
  const navNext = () => { if (i + 1 >= questions.length) navFinish(); else navGo(i + 1); };
  const navPrev = () => { if (i > 0) navGo(i - 1); };

  /* One section clock for the navigable banks when timed. */
  useEffect(() => {
    if (!(navigable && exam)) return;
    const t = setInterval(() => setSecLeft((s) => { if (s <= 1) { clearInterval(t); navFinishRef.current(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [navigable, exam]);

  const record = useCallback((given) => {
    if (phaseRef.current !== "answer") return;
    const ms = Date.now() - start.current;
    let correct = false, score = 0, givenLabel = "", picks = null;
    if (q.kind === "syllset") {
      picks = Array.isArray(given) ? given : syllRef.current;
      let hits = 0;
      q.statements.forEach((st, idx) => {
        const p2 = picks[idx];
        if (p2 !== undefined && p2 !== null && (p2 === 1) === st.yes) hits++;
      });
      score = hits / q.statements.length;
      correct = hits === q.statements.length;
      givenLabel = `${hits}/${q.statements.length} conclusions right`;
    } else if (q.kind === "rank") {
      const picks = Array.isArray(given) ? given : rankRef.current;
      const pos = picks.length === 3 ? picks : [...picks, ...[0, 1, 2].filter((x) => !picks.includes(x))];
      let hits = 0;
      pos.forEach((p, idx) => { if (q.order[idx] === p) hits++; });
      score = hits / 3;
      correct = hits === 3;
      givenLabel = pos.map((p) => String.fromCharCode(65 + p)).join(" then ");
    } else if (q.kind === "scale") {
      const idx = given;
      if (idx === null || idx === undefined) { score = 0; givenLabel = "no answer"; }
      else {
        const dist = Math.abs(idx - q.answer);
        score = dist === 0 ? 1 : dist === 1 ? 0.5 : 0;
        correct = dist === 0;
        givenLabel = q.options[idx];
      }
    } else if (q.kind === "mcq") {
      correct = given === q.answer;
      score = correct ? 1 : 0;
      givenLabel = given === null || given === undefined ? "no answer" : String(given);
    } else {
      const g = String(given ?? "").trim().toLowerCase();
      const want = String(q.answer).trim().toLowerCase();
      if (g !== "") {
        if (q.tol > 0) {
          const gn = parseFloat(g.replace(/,/g, "")), wn = parseFloat(want);
          correct = !isNaN(gn) && Math.abs(gn - wn) <= Math.abs(wn) * q.tol;
        } else correct = g.replace(/,/g, "") === want.replace(/,/g, "");
      }
      score = correct ? 1 : 0;
      givenLabel = g || "no answer";
    }
    const entry = { q, correct, score, ms, given: givenLabel, picks };
    const list = [...log, entry];
    setLog(list);
    setLastEntry(entry);
    if (noFeedback) {
      /* Timed, or review-at-end: no feedback now, move straight on. */
      advance(list);
    } else if (correct) {
      setPhase("celebrate");
      setTimeout(() => advance(list), 780);
    } else {
      setPhase("review");
    }
  }, [q, log, advance, noFeedback]);

  useEffect(() => {
    if (navigable) return; /* navigable banks use one section clock, not per-question auto-advance */
    const t = setInterval(() => {
      if (phaseRef.current !== "answer") return;
      if (hideStart && !revealedRef.current) return; /* clock paused until Go */
      const e = Date.now() - start.current;
      setElapsed(e);
      if (exam && budgetMs > 0 && e >= budgetMs) {
        if (q.kind === "syllset") record(syllRef.current);
        else if (q.kind === "rank") record(rankRef.current);
        else if (q.kind === "scale" || q.kind === "mcq") record(null);
        else record(valRef.current);
      }
    }, 100);
    return () => clearInterval(t);
  }, [exam, budgetMs, record, q, navigable]);

  useEffect(() => { if (inputRef.current && phase === "answer" && !showCalc) inputRef.current.focus(); }, [i, phase, showCalc]);

  const left = budgetMs - elapsed;
  const frac = budgetMs > 0 ? Math.max(left / budgetMs, 0) : 1;
  const gmax = q.graph ? Math.max(...q.graph.values) : 1;

  const rankTap = (idx) => {
    if (phase !== "answer" || rankPicks.includes(idx)) return;
    const next = [...rankPicks, idx];
    setRankPicks(next);
    if (next.length === 3 && !navigable) record(next);
  };

  const hasAnswer = q.kind === "scale" || q.kind === "mcq" ? picked !== null
    : q.kind === "rank" ? rankPicks.length === 3
    : q.kind === "syllset" ? q.statements.every((_, n) => syllPicks[n] === 0 || syllPicks[n] === 1)
    : val.trim() !== "";

  const submitExam = () => {
    if (q.kind === "scale") record(picked);
    else if (q.kind === "mcq") record(q.options[picked]);
    else if (q.kind === "rank") record(rankPicks);
    else if (q.kind === "syllset") record(syllPicks);
    else record(val);
  };

  const goBack = () => {
    if (i === 0) return;
    setI(i - 1); setPicked(null); setRankPicks([]); setSyllPicks([]); setShowWhy(false);
    setPhase("answer"); setRevealed(!hideStart); start.current = Date.now(); setElapsed(0);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); if (navigable) navNext(); else if (phaseRef.current === "answer") { if (noFeedback || hasAnswer) submitExam(); } else advance(log); }
      if (k === "p") { e.preventDefault(); if (navigable) navPrev(); else if (!exam) goBack(); }
      if (k === "f") { e.preventDefault(); setFlagged((f) => f.includes(i) ? f.filter((x) => x !== i) : [...f, i]); }
      if (k === "c") { e.preventDefault(); setCalcOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* Keyboard for the standard drill runner only: press the letter of the
     option you want (A, B, C ...) to pick and submit it, and Enter to move
     to the next question from the feedback screen. The exam skin and
     typed inputs keep their own key handling. */
  useEffect(() => {
    if (examSkin) return;
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = ((e.target && e.target.tagName) || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (gated) return;
      if (phase === "answer" && (q.kind === "mcq" || q.kind === "scale")) {
        const idx = e.key.length === 1 ? e.key.toLowerCase().charCodeAt(0) - 97 : -1;
        if (idx >= 0 && idx < q.options.length) {
          e.preventDefault();
          record(q.kind === "mcq" ? q.options[idx] : idx);
          return;
        }
      }
      if (e.key === "Enter" && phase === "review") { e.preventDefault(); advance(log); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stars = ["★", "✦", "★", "✧", "★"];

  if (examSkin) {
    const total = questions.length;
    return (
      <div className="vx">
        <ExitGuard open={confirmExit} onStay={() => setConfirmExit(false)} onLeave={onQuit} />
        <div className="vx-top">
          <span className="ttl">{drill.section === "SJT" ? "Situational Judgement" : "Quantitative Reasoning"} Question Bank</span>
          <span className="cnt mono">{i + 1} of {total}</span>
        </div>
        <div className="vx-bar">
          <button className="vx-tool" onClick={() => setShowWhy((o) => !o)} disabled={phase === "answer"}>
            <span className="ic">◈</span> Explain Answer
          </button>
          <button className="vx-tool" onClick={() => setCalcOpen((o) => !o)}><span className="ic">▤</span> Calculator</button>
          {navigable && <button className="vx-tool" onClick={() => setNavOpen(true)}><span className="ic">☰</span> Navigator</button>}
          <span className="vx-spacer" />
          <button className={`vx-tool${flagged.includes(i) ? " on" : ""}`} onClick={() => setFlagged((f) => f.includes(i) ? f.filter((x) => x !== i) : [...f, i])}>
            <span className="ic">⚑</span> Flag for Review
          </button>
          <span className="vx-scheme">Colour Scheme ▾</span>
        </div>

        <div className="vx-body">
          {gated && (
            <div className="q-goover">
              <div className="q-gocard">
                <p>Question hidden so the clock only starts when you are ready. No sneaking a look.</p>
                <button className="ud-btn" onClick={reveal}>Go</button>
              </div>
            </div>
          )}
          <div className="vx-left">
            {q.scenarioText && <p className="stem">{q.scenarioText}</p>}
            {q.passageText && <p className="stem">{q.passageText}</p>}
            {q.table && (
              <div className="qs-tab vx">
                <p className="cap">{q.table.title}</p>
                <table>
                  <thead><tr><th /> {q.table.cols.map((cl) => <th key={cl}>{cl}</th>)}</tr></thead>
                  <tbody>
                    {q.table.rows.map((rw, ri) => (
                      <tr key={rw}><th>{rw}</th>{q.table.data[ri].map((v, vi) => <td key={vi}>{q.table.money ? "£" : ""}{v.toLocaleString()}{q.table.unit}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {q.venn3 && (
              <svg viewBox="0 0 300 178" className="vx-svg" aria-label="Three-set Venn diagram">
                <circle cx="112" cy="66" r="47" fill="none" stroke="#333" strokeWidth="1.2" />
                <circle cx="182" cy="66" r="47" fill="none" stroke="#333" strokeWidth="1.2" />
                <circle cx="147" cy="118" r="47" fill="none" stroke="#333" strokeWidth="1.2" />
                <text x="66" y="18" fontSize="10.5" fill="#111">{q.venn3.la}</text>
                <text x="196" y="18" fontSize="10.5" fill="#111">{q.venn3.lb}</text>
                <text x="188" y="164" fontSize="10.5" fill="#111">{q.venn3.lc}</text>
                <text x="86" y="60" fontSize="13" fontWeight="700" fill="#111" textAnchor="middle">{q.venn3.a}</text>
                <text x="208" y="60" fontSize="13" fontWeight="700" fill="#111" textAnchor="middle">{q.venn3.b}</text>
                <text x="147" y="146" fontSize="13" fontWeight="700" fill="#111" textAnchor="middle">{q.venn3.c}</text>
                <text x="147" y="52" fontSize="12" fontWeight="700" fill="#111" textAnchor="middle">{q.venn3.ab}</text>
                <text x="113" y="106" fontSize="12" fontWeight="700" fill="#111" textAnchor="middle">{q.venn3.ac}</text>
                <text x="181" y="106" fontSize="12" fontWeight="700" fill="#111" textAnchor="middle">{q.venn3.bc}</text>
                <text x="147" y="88" fontSize="12" fontWeight="700" fill="#111" textAnchor="middle">{q.venn3.abc}</text>
                <text x="26" y="170" fontSize="10.5" fill="#444">{q.venn3.none} neither</text>
              </svg>
            )}
            {q.venn && (
              <svg viewBox="0 0 300 140" className="vx-svg" aria-label="Venn diagram">
                <circle cx="115" cy="70" r="48" fill="none" stroke="#333" strokeWidth="1.2" />
                <circle cx="185" cy="70" r="48" fill="none" stroke="#333" strokeWidth="1.2" />
                <text x="90" y="20" fontSize="11" fill="#111">{q.venn.la}</text>
                <text x="178" y="20" fontSize="11" fill="#111">{q.venn.lb}</text>
                <text x="90" y="75" fontSize="14" fontWeight="700" fill="#111" textAnchor="middle">{q.venn.onlyA}</text>
                <text x="150" y="75" fontSize="14" fontWeight="700" fill="#111" textAnchor="middle">{q.venn.both}</text>
                <text x="210" y="75" fontSize="14" fontWeight="700" fill="#111" textAnchor="middle">{q.venn.onlyB}</text>
                <text x="252" y="130" fontSize="11" fill="#444">{q.venn.neither} neither</text>
              </svg>
            )}
            {q.kind === "scale" && (
              <p className="ask">
                How <b>{q.typeName === "Importance" ? "important" : "appropriate"}</b>{" "}
                {q.typeName === "Importance" ? "to take into account is the following consideration" : "is the following response"} for the student when deciding how to respond to the situation?
              </p>
            )}
            {q.kind === "syllset" && <p className="ask">{q.stem}</p>}
            {calcOpen && <div className="vx-calcwrap"><Calculator /></div>}
          </div>

          <div className="vx-right">
            {q.kind === "scale" && (
              <>
                <p className="opt-stem">{q.stem}</p>
                {q.options.map((o, n) => (
                  <label key={n} className={`vx-opt${picked === n ? " sel" : ""}${phase === "review" && n === q.answer ? " right" : ""}`}
                    onClick={() => phase === "answer" && setPicked(n)}>
                    <input type="radio" readOnly checked={picked === n} name="opt" />
                    <b>{String.fromCharCode(65 + n)}.</b><span>{o}</span>
                  </label>
                ))}
              </>
            )}
            {q.kind === "mcq" && <p className="opt-stem">{q.stem || q.prompt}</p>}
            {q.kind === "mcq" && q.options.map((o, n) => (
              <label key={n} className={`vx-opt${picked === n ? " sel" : ""}${phase === "review" && o === q.answer ? " right" : ""}`}
                onClick={() => phase === "answer" && setPicked(n)}>
                <input type="radio" readOnly checked={picked === n} name="opt" />
                <b>{String.fromCharCode(65 + n)}.</b><span>{o}</span>
              </label>
            ))}
            {q.kind === "rank" && (
              <>
                <p className="opt-stem">Rank from most to least appropriate.</p>
                {q.options.map((o, n) => (
                  <label key={n} className={`vx-opt${rankPicks.includes(n) ? " sel" : ""}`} onClick={() => rankTap(n)}>
                    <b>{rankPicks.includes(n) ? rankPicks.indexOf(n) + 1 : String.fromCharCode(65 + n)}.</b><span>{o}</span>
                  </label>
                ))}
              </>
            )}
            {q.kind === "syllset" && q.statements.map((st, n) => (
              <div className="vx-syl" key={n}>
                <span>{st.t}</span>
                <span className="yn">
                  <button className={syllPicks[n] === 1 ? "on" : ""} disabled={phase !== "answer"}
                    onClick={() => setSyllPicks((p2) => { const c2 = [...p2]; c2[n] = 1; return c2; })}>Yes</button>
                  <button className={syllPicks[n] === 0 ? "on no" : ""} disabled={phase !== "answer"}
                    onClick={() => setSyllPicks((p2) => { const c2 = [...p2]; c2[n] = 0; return c2; })}>No</button>
                </span>
              </div>
            ))}

            {(showWhy || phase === "review") && lastEntry && (
              <div className="vx-why">
                <h5>Explain Answer</h5>
                {!lastEntry.correct && q.diagram && <WorkDiagram d={q.diagram} />}
                {q.kind === "syllset" ? (
                  q.statements.map((st, n) => {
                    const p2 = lastEntry.picks ? lastEntry.picks[n] : null;
                    const right = p2 !== null && p2 !== undefined && (p2 === 1) === st.yes;
                    return (
                      <p key={n}><b style={{ color: right ? "#1E8E5A" : "#C0392B" }}>{right ? "✓" : "✗"}</b> {st.t} <i>{st.yes ? "follows" : "does not follow"}.</i> {st.why}</p>
                    );
                  })
                ) : (
                  <>
                    <p><b>Answer: {q.kind === "rank" ? q.order.map((x) => String.fromCharCode(65 + x)).join(", ") : q.kind === "scale" ? q.options[q.answer] : q.answer}</b></p>
                    {easyMode ? (
                      <>
                        {q.improve && <p className="imp"><b>Strategy: </b>{q.improve}</p>}
                        <p>{q.why || q.working}</p>
                      </>
                    ) : (
                      <>
                        <p>{q.why || q.working}</p>
                        {q.improve && <p className="imp">{q.improve}</p>}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="vx-foot">
          <button className="vx-nav" onClick={() => setConfirmExit(true)}>✕ End Session</button>
          {exam && <span className="vx-clock mono">{navigable ? `${Math.floor(secLeft / 60)}:${String(secLeft % 60).padStart(2, "0")}` : `${Math.max(left / 1000, 0).toFixed(0)}s`}</span>}
          <span className="vx-spacer" />
          <span className="vx-hint">{navigable ? "Alt+N next · Alt+P previous · Alt+F flag" : "Alt+N next · Alt+F flag · Alt+C calculator"}</span>
          {navigable ? (
            <>
              <button className="vx-nav" onClick={navPrev} disabled={i === 0}>◀ Previous</button>
              <button className="vx-nav" onClick={() => setNavOpen(true)}>Navigator</button>
              <button className="vx-nav main" onClick={navNext}>{i + 1 >= total ? "Finish ▶" : "Next ▶"}</button>
            </>
          ) : phase === "answer" ? (
            <button className="vx-nav main" onClick={submitExam} disabled={!noFeedback && !hasAnswer}>
              {noFeedback ? (i + 1 >= total ? "Finish ▶" : "Next ▶") : "Submit Answer"}
            </button>
          ) : (
            <button className="vx-nav main" onClick={() => { setShowWhy(false); advance(log); }}>
              {i + 1 >= total ? "Finish ▶" : "Next ▶"}
            </button>
          )}
        </div>
        {navOpen && (
          <div className="ud-modal" onClick={() => setNavOpen(false)}>
            <div className="nav-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Question navigator">
              <div className="nav-head"><b>Navigator</b><span>select a question to go to it</span></div>
              <div className="nav-grid">
                <div className="nav-row nav-hd"><span>Question</span><span>Status</span><span>Flag</span></div>
                {questions.map((qq, n) => {
                  const snap = n === i ? curSnap() : answersRef.current[n];
                  const answered = snapAnswered(qq, snap);
                  return (
                    <button key={n} className={`nav-row${n === i ? " cur" : ""}`} onClick={() => navGo(n)}>
                      <span>Question {n + 1}</span>
                      <span style={{ color: answered ? "#1E8E5A" : "#B4661E", fontWeight: 600 }}>{answered ? "Answered" : "Skipped"}</span>
                      <span>{flagged.includes(n) ? "⚑" : ""}</span>
                    </button>
                  );
                })}
              </div>
              <div className="nav-foot">
                <button className="ud-btn ghost" onClick={() => setNavOpen(false)}>Keep going</button>
                <button className="ud-btn" onClick={navFinish}>End review and mark all</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ud-run">
      <ExitGuard open={confirmExit} onStay={() => setConfirmExit(false)} onLeave={onQuit} />
      <div className="ud-runbar">
        <BrandMark onClick={() => setConfirmExit(true)} />
        {exam ? (
          <>
            <div className={`ud-clock mono${frac < 0.25 ? " warn" : ""}`}>{Math.max(left / 1000, 0).toFixed(1)}s</div>
            <span className="ud-examflag">TIMED</span>
          </>
        ) : (
          <span className="ud-examflag calm">UNTIMED</span>
        )}
        <div className="ud-prog"><i style={{ width: `${(i / questions.length) * 100}%` }} /></div>
        <span className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{i + 1}/{questions.length}</span>
        <button className="ud-quit" onClick={() => setConfirmExit(true)}>End</button>
      </div>
      <div className="ud-stage">
        {gated && (
          <div className="q-goover">
            <div className="q-gocard">
              <p>Question hidden so the clock only starts when you are ready. No sneaking a look.</p>
              <button className="ud-btn" onClick={reveal}>Go</button>
            </div>
          </div>
        )}
        <div className={`ud-panel${phase === "celebrate" ? " correct" : ""}`}>
          <div className="ud-goflash" />
          {phase === "celebrate" && (
            <div className="ud-stars" aria-hidden="true">
              {stars.map((s, n) => (
                <s key={n} style={{ left: `${12 + n * 18}%`, top: `${30 + (n % 2) * 22}%`, color: "#1E8E5A", animationDelay: `${n * 60}ms` }}>{s}</s>
              ))}
            </div>
          )}

          <h4>
            {drill.name}
            {q.typeName ? ` · ${q.typeName}` : ""}
            {q.themeName ? ` · ${q.themeName}` : ""}
            {exam ? " · timed" : ""}
          </h4>
          {exam && phase === "answer" && (
            <div className="ud-budget"><i className={frac < 0.25 ? "low" : ""} style={{ width: `${frac * 100}%` }} /></div>
          )}

          {q.scenarioText && <p className="ud-scenario">{q.scenarioText}</p>}
          {q.passageText && <p className="ud-passage" style={{ marginTop: 0, marginBottom: 18 }}>{q.passageText}</p>}
          {q.context && <p className="ud-context">{q.context}</p>}
          {q.venn3 && (
            <svg viewBox="0 0 300 178" style={{ width: "100%", maxWidth: 330, margin: "4px 0 12px" }} aria-label="Three-set Venn diagram">
              <rect x="1" y="1" width="298" height="176" fill="#fff" stroke="#9DB2C8" rx="4" />
              <circle cx="112" cy="66" r="47" fill="#2F71B81f" stroke="#2F71B8" strokeWidth="1.4" />
              <circle cx="182" cy="66" r="47" fill="#F5A5241f" stroke="#B97A0E" strokeWidth="1.4" />
              <circle cx="147" cy="118" r="47" fill="#3ECF8E1f" stroke="#1E8E5A" strokeWidth="1.4" />
              <text x="66" y="18" fontSize="10.5" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn3.la}</text>
              <text x="196" y="18" fontSize="10.5" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn3.lb}</text>
              <text x="188" y="164" fontSize="10.5" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn3.lc}</text>
              <text x="86" y="60" fontSize="13" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.a}</text>
              <text x="208" y="60" fontSize="13" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.b}</text>
              <text x="147" y="146" fontSize="13" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.c}</text>
              <text x="147" y="52" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.ab}</text>
              <text x="113" y="106" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.ac}</text>
              <text x="181" y="106" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.bc}</text>
              <text x="147" y="88" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.abc}</text>
              <text x="34" y="164" fontSize="10.5" fill="#5A6675" fontFamily="Inter, system-ui, sans-serif">{q.venn3.none} neither</text>
            </svg>
          )}
          {q.venn && (
            <svg viewBox="0 0 300 140" style={{ width: "100%", maxWidth: 320, margin: "4px 0 12px" }} aria-label="Venn diagram">
              <rect x="1" y="1" width="298" height="138" fill="#fff" stroke="#9DB2C8" rx="4" />
              <circle cx="115" cy="70" r="48" fill="#2F71B822" stroke="#2F71B8" strokeWidth="1.5" />
              <circle cx="185" cy="70" r="48" fill="#F5A52422" stroke="#B97A0E" strokeWidth="1.5" />
              <text x="90" y="20" fontSize="11" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn.la}</text>
              <text x="178" y="20" fontSize="11" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn.lb}</text>
              <text x="90" y="75" fontSize="14" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn.onlyA}</text>
              <text x="150" y="75" fontSize="14" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn.both}</text>
              <text x="210" y="75" fontSize="14" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn.onlyB}</text>
              <text x="264" y="128" fontSize="11" fill="#5A6675" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn.neither} neither</text>
            </svg>
          )}
          {q.table && (
            <div className="qs-tab">
              <p className="cap">{q.table.title}</p>
              <table>
                <thead><tr><th /> {q.table.cols.map((cl) => <th key={cl}>{cl}</th>)}</tr></thead>
                <tbody>
                  {q.table.rows.map((rw, ri) => (
                    <tr key={rw}><th>{rw}</th>{q.table.data[ri].map((v, vi) => <td key={vi}>{q.table.money ? "£" : ""}{v.toLocaleString()}{q.table.unit}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {q.graph && (
            <>
              <div className="ud-graph">
                {q.graph.values.map((v, n) => (
                  <div key={n} className="bar" style={{ height: `${(v / gmax) * 100}%` }}><span>{v}</span></div>
                ))}
              </div>
              <div className="ud-graph-x">{q.graph.labels.map((l) => <span key={l}>{l}</span>)}</div>
            </>
          )}

          <p className={q.kind === "typed" && !q.passageText ? "ud-q" : "ud-qs"}>{q.stem || q.prompt}</p>

          {phase !== "review" && q.kind === "rank" && (
            <>
              {q.options.map((o, n) => (
                <button key={n} className={`ud-opt${rankPicks.includes(n) ? " picked" : ""}`} onClick={() => rankTap(n)} disabled={phase !== "answer"}>
                  <b>{rankPicks.includes(n) ? rankPicks.indexOf(n) + 1 : String.fromCharCode(65 + n)}</b>{o}
                </button>
              ))}
              <p className="ud-hint">
                Tap in order, most appropriate first.{" "}
                {rankPicks.length > 0 && <button className="ud-quit" style={{ fontSize: 11 }} onClick={() => setRankPicks([])}>reset</button>}
              </p>
            </>
          )}

          {phase !== "review" && q.kind === "syllset" && (
            <>
              {q.statements.map((st, n) => (
                <div className="ud-syl" key={n}>
                  <span className="txt">{st.t}</span>
                  <span className="yn">
                    <button className={syllPicks[n] === 1 ? "on" : ""} disabled={phase !== "answer"}
                      onClick={() => setSyllPicks((p2) => { const c2 = [...p2]; c2[n] = 1; return c2; })}>Yes</button>
                    <button className={syllPicks[n] === 0 ? "on no" : ""} disabled={phase !== "answer"}
                      onClick={() => setSyllPicks((p2) => { const c2 = [...p2]; c2[n] = 0; return c2; })}>No</button>
                  </span>
                </div>
              ))}
              <button className="ud-submit" style={{ marginTop: 12 }}
                disabled={phase !== "answer" || q.statements.some((_, n) => syllPicks[n] === undefined || syllPicks[n] === null)}
                onClick={() => record(syllPicks)}>
                Submit all five
              </button>
            </>
          )}

          {phase !== "review" && (q.kind === "scale" || q.kind === "mcq") && (
            <>
              {q.options.map((o, n) => (
                <button key={n} className="ud-opt" onClick={() => record(q.kind === "mcq" ? o : n)} disabled={phase !== "answer"}>
                  <b>{String.fromCharCode(65 + n)}</b>{o}
                </button>
              ))}
              <p className="ud-hint kbd">Tip: press a letter key to answer, Enter for the next question.</p>
            </>
          )}

          {phase !== "review" && q.kind === "typed" && (
            <>
              <div className="ud-answer">
                <input ref={inputRef} className="ud-input" value={val}
                  onChange={(e) => setVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && val.trim() !== "") record(val); }}
                  placeholder="Your answer" inputMode={q.section === "VR" ? "text" : "decimal"} autoComplete="off"
                  disabled={phase !== "answer"} />
                <button className="ud-submit" onClick={() => { if (val.trim() !== "") record(val); }} disabled={val.trim() === "" || phase !== "answer"}>Submit</button>
              </div>
              {showCalc && <Calculator />}
            </>
          )}

          {phase === "review" && lastEntry && q.kind === "syllset" && (
            <div className="ud-review">
              <h5>Statement by statement</h5>
              <p className="verdict">{lastEntry.given}. Full marks need all five; each is a separate judgement.</p>
              {q.statements.map((st, n) => {
                const p2 = lastEntry.picks ? lastEntry.picks[n] : null;
                const right = p2 !== null && p2 !== undefined && (p2 === 1) === st.yes;
                return (
                  <div key={n} style={{ borderTop: "1px solid #E3E7EC", padding: "9px 0" }}>
                    <p style={{ margin: "0 0 3px", fontWeight: 600 }}>
                      <span style={{ color: right ? "#1E8E5A" : "#C0392B" }}>{right ? "✓" : "✗"}</span> {st.t}
                      <span style={{ color: "#5A6675", fontWeight: 400 }}> · {st.yes ? "follows" : "does not follow"}{!right && p2 !== null && p2 !== undefined ? `, you said ${p2 === 1 ? "yes" : "no"}` : ""}</span>
                    </p>
                    <p style={{ margin: 0, fontSize: 13 }}>{st.why}</p>
                  </div>
                );
              })}
              {q.improve && <p className="improve" style={{ marginTop: 10 }}>{q.improve}</p>}
              <button className="ud-submit" style={{ marginTop: 12 }} onClick={() => advance(log)}>Continue</button>
            </div>
          )}

          {phase === "review" && lastEntry && q.kind !== "syllset" && (
            <div className="ud-review">
              <h5>Why that was wrong</h5>
              {q.diagram && <WorkDiagram d={q.diagram} />}
              <p className="verdict">
                {lastEntry.given === "no answer" ? "Time ran out before you answered." : `Your answer: ${lastEntry.given}${lastEntry.score > 0 ? " (one step away, partial marks)" : ""}`}
              </p>
              <p>
                <strong>
                  {q.kind === "rank"
                    ? `Correct order: ${q.order.map((p) => String.fromCharCode(65 + p)).join(" then ")}`
                    : q.kind === "scale"
                    ? `Panel answer: ${q.options[q.answer]}`
                    : `Correct answer: ${q.answer}`}
                </strong>
              </p>
              {easyMode ? (
                <>
                  {q.improve && <p className="improve"><b>Strategy: </b>{q.improve}</p>}
                  <p>{q.why || q.working}</p>
                </>
              ) : (
                <>
                  <p>{q.why || q.working}</p>
                  {q.improve && <p className="improve">{q.improve}</p>}
                </>
              )}
              <button className="ud-submit" onClick={() => advance(log)}>Continue</button>
            </div>
          )}

          {phase === "answer" && (
            <p className="ud-hint">
              {exam ? `${budget} seconds a question. It moves on whether you are ready or not.` :
                q.kind === "rank" ? "" :
                q.section === "SJT" ? "Judge it against professional standards, not personal preference." :
                q.drill === "calc" ? "Your keyboard drives the calculator, exactly as in the exam. Click the answer box when you are ready to type your answer." :
                q.drill === "estimate" ? "Estimate first. Only calculate if two options sit close." :
                q.drill === "scan" ? "Read the question first. Hunt for the shape of the answer." : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ PACING / BLURT -------------------- */

function PacingDrill({ onDone, onQuit }) {
  const [confirmExit, setConfirmExit] = useState(false);
  const [phase, setPhase] = useState("setup");
  const [wpm, setWpm] = useState(350);
  const [idx, setIdx] = useState(0);
  const [qi, setQi] = useState(0);
  const [log, setLog] = useState([]);
  const passage = useRef(pick(PASSAGES)).current;
  const words = useRef(passage.text.split(/\s+/)).current;
  const start = useRef(0);
  useEffect(() => {
    if (phase !== "reading") return;
    if (idx >= words.length) { setPhase("questions"); start.current = Date.now(); return; }
    const t = setTimeout(() => setIdx((n) => n + 1), 60000 / wpm);
    return () => clearTimeout(t);
  }, [phase, idx, wpm, words.length]);
  const answer = (choice) => {
    const cq = passage.comprehension[qi];
    const ms = Date.now() - start.current;
    const entry = {
      q: { kind: "mcq", prompt: cq.q, answer: cq.options[cq.correct], options: cq.options, tag: "p" + passage.id, section: "VR", drill: "speed", working: "The passage stated this directly; the distractors contradicted it or were never said.", improve: TIPS.speed },
      correct: choice === cq.correct, score: choice === cq.correct ? 1 : 0, ms, given: cq.options[choice],
    };
    const next = [...log, entry];
    setLog(next);
    if (qi + 1 >= passage.comprehension.length) onDone(next, { wpm });
    else { setQi(qi + 1); start.current = Date.now(); }
  };
  return (
    <div className="ud-run">
      <ExitGuard open={confirmExit} onStay={() => setConfirmExit(false)} onLeave={onQuit} />
      <div className="ud-runbar">
        <BrandMark onClick={() => setConfirmExit(true)} />
        <div className="ud-clock mono">{phase === "reading" ? `${wpm} wpm` : "VR"}</div>
        <div className="ud-prog"><i style={{ width: phase === "reading" ? `${(idx / words.length) * 100}%` : "100%" }} /></div>
        <button className="ud-quit" onClick={() => setConfirmExit(true)}>End</button>
      </div>
      <div className="ud-stage">
        <div className="ud-panel">
          {phase === "setup" && (<>
            <h4>Pacing, set your rate</h4>
            <p className="ud-q mono" style={{ fontSize: 38 }}>{wpm}</p>
            <input type="range" min="180" max="700" step="10" value={wpm} onChange={(e) => setWpm(Number(e.target.value))} style={{ width: "100%" }} aria-label="Words per minute" />
            <p className="ud-hint" style={{ marginBottom: 18 }}>Words appear one at a time. You cannot go back, which is the point. Two comprehension questions follow.</p>
            <button className="ud-btn" onClick={() => setPhase("reading")}>Start reading</button>
          </>)}
          {phase === "reading" && (<><h4>{passage.title}</h4><div className="ud-flash mono">{words[idx] || ""}</div></>)}
          {phase === "questions" && (<>
            <h4>Comprehension {qi + 1} of {passage.comprehension.length}</h4>
            <p className="ud-qs">{passage.comprehension[qi].q}</p>
            {passage.comprehension[qi].options.map((o, n) => (
              <button key={n} className="ud-opt" onClick={() => answer(n)}><b>{String.fromCharCode(65 + n)}</b>{o}</button>
            ))}
          </>)}
        </div>
      </div>
    </div>
  );
}

function BlurtDrill({ onDone, onQuit }) {
  const [confirmExit, setConfirmExit] = useState(false);
  const [phase, setPhase] = useState("read");
  const [left, setLeft] = useState(45);
  const [text, setText] = useState("");
  const [ticked, setTicked] = useState([]);
  const passage = useRef(pick(PASSAGES)).current;
  const start = useRef(Date.now());
  useEffect(() => {
    if (phase !== "read") return;
    if (left <= 0) { setPhase("recall"); start.current = Date.now(); return; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);
  const toggle = (i) => setTicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const finish = () => {
    const ms = Date.now() - start.current;
    const per = Math.round(ms / passage.points.length);
    onDone(passage.points.map((p, i) => ({
      q: { kind: "typed", prompt: p, answer: p, tag: "b" + passage.id, section: "VR", drill: "blurt", working: "This point was in the passage.", improve: TIPS.blurt },
      correct: ticked.includes(i), score: ticked.includes(i) ? 1 : 0, ms: per, given: ticked.includes(i) ? "recalled" : "missed",
    })));
  };
  return (
    <div className="ud-run">
      <ExitGuard open={confirmExit} onStay={() => setConfirmExit(false)} onLeave={onQuit} />
      <div className="ud-runbar">
        <BrandMark onClick={() => setConfirmExit(true)} />
        <div className="ud-clock mono">{phase === "read" ? `${left}s` : "recall"}</div>
        <div className="ud-prog"><i style={{ width: phase === "read" ? `${((45 - left) / 45) * 100}%` : "100%" }} /></div>
        <button className="ud-quit" onClick={() => setConfirmExit(true)}>End</button>
      </div>
      <div className="ud-stage">
        <div className="ud-panel">
          {phase === "read" && (<><h4>Read, {passage.title}</h4><p className="ud-passage">{passage.text}</p></>)}
          {phase === "recall" && (<>
            <h4>Write down everything you remember</h4>
            <textarea className="ud-input" style={{ minHeight: 150, fontSize: 15, lineHeight: 1.6 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type freely. Nobody marks this but you." />
            <button className="ud-btn" style={{ marginTop: 16 }} onClick={() => setPhase("score")}>I'm done, show the checklist</button>
          </>)}
          {phase === "score" && (<>
            <h4>Tick what you actually got</h4>
            {passage.points.map((p, i) => (
              <label key={i} className="ud-check"><input type="checkbox" checked={ticked.includes(i)} onChange={() => toggle(i)} /><span>{p}</span></label>
            ))}
            <button className="ud-btn" style={{ marginTop: 18 }} onClick={finish}>See results</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ VR DIAGNOSIS ---------------------- */
/* Separates the two ways VR goes wrong: too slow, or fast but wrong. */

function diagnoseVR(log, exam, budget) {
  const vr = log.filter((l) => l.q && l.q.section === "VR");
  if (vr.length < 3) return null;
  const times = vr.map((l) => l.ms);
  const med = median(times) / 1000;
  const acc = vr.filter((l) => l.correct).length / vr.length;
  const target = budget && budget > 0 ? budget : 30;
  const slow = med > target * 0.95;
  const accurate = acc >= 0.7;

  if (slow && accurate) return {
    tone: "time", title: "Your accuracy is fine. Your clock is the problem.",
    body: `You are finding the right answers, at a median of ${med.toFixed(1)} seconds against a target near ${target}. In the real section that difference is the difference between finishing and guessing the last passage. The fix is reading speed, not comprehension.`,
    todo: ["Run the Pacing drill and hold a rate where you still score both comprehension questions, then push it up 20 words per minute a week.",
           "Stop re-reading. Most lost VR time is the second and third read of a sentence you already understood.",
           "Answer from the question backwards: decide the shape of the answer before your eyes touch the passage."],
    drill: "speed",
  };
  if (!slow && !accurate) return {
    tone: "acc", title: "Your timing is right. Your answers are not.",
    body: `You are keeping pace at a median of ${med.toFixed(1)} seconds, but only ${Math.round(acc * 100)}% are landing. Speed without accuracy is just guessing faster, and it usually means you are matching topics rather than locating evidence.`,
    todo: ["Drill Scanning: locate the exact sentence that proves the answer before you commit to an option.",
           "Watch for 'rather than' and 'not X but Y' constructions; they hand you the trap and the answer in one clause.",
           "If the passage never says it, the answer is not there. Outside knowledge is the commonest cause of confident wrong answers."],
    drill: "scan",
  };
  if (slow && !accurate) return {
    tone: "both", title: "Slow and off target. Fix accuracy first.",
    body: `A median of ${med.toFixed(1)} seconds with ${Math.round(acc * 100)}% accuracy means the method needs rebuilding before the speed does. Getting faster at the wrong technique just produces wrong answers sooner.`,
    todo: ["Start with Scanning, untimed, until you are locating evidence reliably.",
           "Only then bring the clock back in, and add Pacing once accuracy holds above 70%.",
           "Read the Learn page on VR before your next session; the technique is the bottleneck here, not effort."],
    drill: "scan",
  };
  return {
    tone: "good", title: "Pace and accuracy both holding.",
    body: `A median of ${med.toFixed(1)} seconds at ${Math.round(acc * 100)}% is where you want to be. Protect it: keep sessions timed and let the mistake bank chase the stragglers.`,
    todo: ["Move to the weekly VR mock for a full-pace run.",
           "Push the Pacing drill slightly faster to build headroom for exam-day nerves.",
           "Clear your mistake bank rather than adding fresh volume."],
    drill: "speed",
  };
}

/* General timing-versus-accuracy read for any section, so every results
   screen says what to do next: are you slow, inaccurate, both or neither. */
function diagnoseTiming(log, budget, drill) {
  const timed = log.filter((l) => l.ms > 0);
  if (timed.length < 3) return null;
  const med = median(timed.map((l) => l.ms)) / 1000;
  const acc = log.reduce((a, l) => a + (l.correct ? 1 : 0), 0) / log.length;
  const target = budget && budget > 0 ? budget : 40;
  const slow = med > target * 0.95;
  const accurate = acc >= 0.7;
  const sec = drill.section;
  const fix = sec === "QR" ? "the Estimation and calculator drills"
    : sec === "SJT" ? "the SJT Learn page and a few more scenarios"
    : "the core drills for this section";
  const pctl = Math.round(acc * 100);
  if (slow && accurate) return { tone: "time", title: "Right answers, slow clock.", body: `A median of ${med.toFixed(1)}s against a target near ${target}s. You know how to do these, so this is pure pace. Keep the accuracy and shave the time: run a set with a stricter clock and force a one-second estimate before you commit.` };
  if (!slow && !accurate) return { tone: "acc", title: "Fast, but off target.", body: `On pace at ${med.toFixed(1)}s, but only ${pctl}% are landing. Slow down a touch and get the method right. Work through ${fix}, and check the reasoning on every wrong answer before you move on.` };
  if (slow && !accurate) return { tone: "both", title: "Slow and inaccurate. Method first.", body: `${med.toFixed(1)}s at ${pctl}%. Take the clock off for a few sets and rebuild the technique with ${fix}, then bring the timer back once accuracy holds above 70%.` };
  return { tone: "good", title: "Pace and accuracy both holding.", body: `${med.toFixed(1)}s at ${pctl}%. This is where you want to be. Move to a full mock and let the mistake bank chase the stragglers.` };
}

/* ------------------------------ RESULTS --------------------------- */

const EST_SUB_OF = { qratio: "ratio", qgraph: "graph", qrate: "rate", qpct: "pct", qinfer: "infer", qunit: "unit" };
function launchForGroup(g, fallbackDrill) {
  if (g.drill === "estimate") return { id: "estimate", sub: EST_SUB_OF[g.tag] || "mixed" };
  return { id: DRILL_BY_ID[g.drill] ? g.drill : fallbackDrill, sub: null };
}

/* Vertical time chart for the results screen: one bar per question, height
   is seconds, colour is correctness, with a dashed average-time line and a
   soft grid. Falls back to equal-height state bars when a drill was untimed. */
function TimeChart({ log, fmt }) {
  const noTimes = log.every((l) => !l.ms);
  const times = log.map((l) => l.ms || 0);
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const maxT = Math.max(...times, 1);
  const scaleMax = maxT * 1.15;
  const stateOf = (l) => l.given === "no answer" ? "skip" : l.correct ? "ok" : (l.score > 0 ? "part" : "bad");
  const present = { ok: false, part: false, bad: false, skip: false };
  log.forEach((l) => { present[stateOf(l)] = true; });
  const legend = [["ok", "Correct"], ["part", "Partial"], ["bad", "Wrong"], ["skip", "Skipped"]].filter(([k]) => present[k]);
  const n = log.length;
  const showEvery = n <= 22 ? 1 : n <= 33 ? 3 : 5;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => ({ f, ms: scaleMax * f }));

  return (
    <div className={`tchart${n > 26 ? " dense" : ""}`}>
      {(legend.length > 0 || !noTimes) && (
        <div className="tc-legend">
          {legend.map(([k, label]) => <span key={k} className={`tc-key ${k}`}>{label}</span>)}
          {!noTimes && <span className="tc-key avg">Average</span>}
        </div>
      )}
      <div className="tc-plot">
        {!noTimes && (
          <div className="tc-yaxis" aria-hidden="true">
            {ticks.map((t, i) => <span key={i} style={{ bottom: `${t.f * 100}%` }}>{fmt(t.ms)}</span>)}
          </div>
        )}
        <div className="tc-area">
          {!noTimes && ticks.map((t, i) => <div key={i} className="tc-grid" style={{ bottom: `${t.f * 100}%` }} />)}
          {!noTimes && avg > 0 && (
            <div className="tc-avg" style={{ bottom: `${(avg / scaleMax) * 100}%` }}>
              <span className="tc-avg-tag mono">avg {fmt(avg)}</span>
            </div>
          )}
          <div className="tc-cols" style={{ ["--gap"]: n > 26 ? "2px" : n > 14 ? "4px" : "7px" }}>
            {log.map((l, i) => {
              const st = stateOf(l);
              const h = noTimes ? 62 : Math.max((l.ms / scaleMax) * 100, 2.5);
              const tip = noTimes ? (st === "ok" ? "Correct" : st === "part" ? "Partial" : st === "bad" ? "Wrong" : "Skipped")
                : `Q${i + 1}: ${fmt(l.ms)}${st === "part" ? " · partial" : ""}`;
              return (
                <div className="tc-col" key={i} title={tip}>
                  <span className={`tc-val mono${n <= 10 ? " on" : ""}`}>{noTimes ? "" : fmt(l.ms)}</span>
                  <div className={`tc-bar ${st}`} style={{ height: `${h}%`, animationDelay: `${Math.min(i * 22, 500)}ms` }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="tc-xrow" style={{ ["--gap"]: n > 26 ? "2px" : n > 14 ? "4px" : "7px" }}>
        {log.map((l, i) => (
          <span key={i} className="tc-x mono">{(i + 1) % showEvery === 0 || showEvery === 1 ? i + 1 : ""}</span>
        ))}
      </div>
    </div>
  );
}

function Results({ drill, log, meta, exam, history, onHome, onAgain, onType, budget, onDiagDrill }) {
  const [showReview, setShowReview] = useState(false);
  const vrDiag = diagnoseVR(log, exam, budget);
  const points = log.reduce((a, l) => a + l.score, 0);
  const pct = log.length ? Math.round((points / log.length) * 100) : 0;
  const times = log.map((l) => l.ms);
  const med = median(times);
  const prior = history.filter((h) => h.drill === drill.id).slice(0, -1);
  const lastPct = prior.length ? prior[prior.length - 1].pct : null;
  const delta = lastPct === null ? null : pct - lastPct;
  const isSjt = drill.id === "sjt";

  /* Break the run down by question type so the weakest one can be named
     and practised directly. Partial marks count toward the type's score. */
  const groups = {};
  log.forEach((l) => {
    const key = l.q.typeName || weakLabel(l.q.tag) || l.q.section || "General";
    if (!groups[key]) groups[key] = { correct: 0, total: 0, tag: l.q.tag, drill: l.q.drill };
    groups[key].total++;
    groups[key].correct += l.correct ? 1 : (l.score || 0);
  });
  const groupList = Object.entries(groups)
    .map(([label, g]) => ({ label, pct: Math.round((g.correct / g.total) * 100), tag: g.tag, drill: g.drill }))
    .sort((a, b) => a.pct - b.pct);
  const worst = groupList.length > 1 ? groupList[0] : null;
  const revAnswer = (q) => q.kind === "rank" ? q.order.map((x) => String.fromCharCode(65 + x)).join(", ")
    : q.kind === "scale" ? q.options[q.answer] : q.answer;

  return (
    <div className="ud-wrap ud-res">
      <div className="ud-eyebrow">{drill.section} · {drill.name}{exam ? " · timed" : ""}</div>
      <p className="ud-score">{pct}<small>%</small></p>
      {isSjt && (
        <div className="ud-band"><b>Band {sjtBand(pct)}</b><span>estimated from this session, with partial marks for one-step-away answers, matching how the real section scores.</span></div>
      )}
      <div className="ud-stats" style={{ marginTop: 18 }}>
        <div className="ud-stat"><b className="mono">{log.filter((l) => l.correct).length}/{log.length}</b><span>Exact</span></div>
        {isSjt && <div className="ud-stat"><b className="mono">{points.toFixed(1)}</b><span>Points inc. partial</span></div>}
        <div className="ud-stat"><b className="mono">{fmt(med)}</b><span>Median</span></div>
        <div className="ud-stat"><b className="mono">{fmt(times.reduce((a, b) => a + b, 0))}</b><span>Total</span></div>
        {delta !== null && <div className="ud-stat"><b className="mono" style={{ color: delta >= 0 ? "var(--go)" : "var(--stop)" }}>{delta >= 0 ? "+" : ""}{delta}</b><span>vs last run</span></div>}
        {meta && meta.wpm && <div className="ud-stat"><b className="mono">{meta.wpm}</b><span>Words / min</span></div>}
      </div>
      {(() => {
        const noTimes = log.every((l) => !l.ms);
        return (
          <>
            <div className="ud-sec"><h2>{noTimes ? "Question by question" : "Where the time went"}</h2><i /><span>{noTimes ? "answered or skipped" : "seconds per question"}</span></div>
            <TimeChart log={log} fmt={fmt} />
          </>
        );
      })()}
      {(() => {
        const rp = analysePace(log);
        return rp ? (
          <div className="pace-panel">
            <span className="k">Rhythm</span>
            <div className="pace-nums">
              <div><b className="mono">{fmt(rp.med)}</b><span>median</span></div>
              <div><b className="mono" style={{ color: rp.rushed ? "var(--stop)" : "var(--paper)" }}>{rp.rushed}</b><span>rushed errors</span></div>
              <div><b className="mono" style={{ color: rp.laboured ? "var(--signal)" : "var(--paper)" }}>{rp.laboured}</b><span>laboured errors</span></div>
            </div>
            <p>{rp.verdict}</p>
          </div>
        ) : null;
      })()}
      {groupList.length > 1 && (
        <>
          <div className="ud-sec"><h2>How you did by type</h2><i /><span>weakest first</span></div>
          <div className="res-bars">
            {groupList.map((g) => (
              <div className="res-bar" key={g.label}>
                <span className="rb-l">{g.label}</span>
                <div className="rb-track"><i style={{ width: `${Math.max(g.pct, 3)}%`, background: g.pct < 50 ? "var(--stop)" : g.pct < 75 ? "var(--signal)" : "var(--go)" }} /></div>
                <span className="rb-n mono">{g.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
      {worst && worst.pct < 90 && (
        <div className="res-weak">
          <span className="k">Revise this next</span>
          <h3>Weakest: {worst.label} ({worst.pct}%)</h3>
          <p>{worst.pct < 50
            ? "This is costing you real marks. Slow the clock down and get the method right before you speed it back up."
            : "Close, but not automatic yet. A focused set of these will tidy it up."}</p>
          {onType && (() => { const L = launchForGroup(worst, drill.id); return (
            <button className="ud-btn" onClick={() => onType(L.id, L.sub)}>Practise {worst.label.toLowerCase()}</button>
          ); })()}
        </div>
      )}
      {vrDiag ? (
        <div className={`vr-diag ${vrDiag.tone}`}>
          <span className="k">Diagnosis</span>
          <h3>{vrDiag.title}</h3>
          <p>{vrDiag.body}</p>
          <ul>{vrDiag.todo.map((t, n) => <li key={n}>{t}</li>)}</ul>
          {onDiagDrill && <button className="ud-btn" onClick={() => onDiagDrill(vrDiag.drill)}>Start the {DRILL_BY_ID[vrDiag.drill].name} drill</button>}
        </div>
      ) : (() => {
        const dg = diagnoseTiming(log, budget, drill);
        return dg ? (
          <div className={`vr-diag ${dg.tone}`}>
            <span className="k">Diagnosis</span>
            <h3>{dg.title}</h3>
            <p>{dg.body}</p>
          </div>
        ) : null;
      })()}
      <p className="ud-tip">{TIPS[drill.id] || TIPS.mistakes}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="ud-btn" onClick={onAgain}>Try more questions of this type</button>
        <button className="ud-btn ghost" onClick={() => setShowReview((s) => !s)}>{showReview ? "Hide review" : "Review answers"}</button>
        <button className="ud-btn ghost" onClick={onHome}>Home</button>
      </div>
      {showReview && (
        <div className="res-review">
          {log.map((l, i) => {
            const q = l.q;
            return (
              <div className={`rev-item ${l.correct ? "ok" : ""}`} key={i}>
                <p className="rev-q"><b>{i + 1}.</b> {q.stem || q.prompt}</p>
                {q.kind === "syllset" ? (
                  <div className="rev-syl">{q.statements.map((st, n) => (
                    <p key={n}><b style={{ color: st.yes ? "var(--go)" : "var(--stop)" }}>{st.yes ? "Yes" : "No"}</b> {st.t} <i>{st.why}</i></p>
                  ))}</div>
                ) : (
                  <>
                    <p className="rev-a"><span className="you">You: {l.given}</span><span className="corr">Answer: {revAnswer(q)}</span></p>
                    {(q.why || q.working) && <p className="rev-w">{q.why || q.working}</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      <SiteDisclaimer />
      <p className="ud-empty" style={{ paddingTop: 4, fontSize: 11.5, lineHeight: 1.6 }}>
        Scores here are practice estimates for your own use, not a prediction of your UCAT result.
      </p>
    </div>
  );
}

/* ------------------------------ HOME ------------------------------ */

function Home({ unlocked, best, weak, history, prefs, setPrefs, onStart, onUnlock, mistakesCount, onMistakes, onWeakSpots, onLearnSjt, onGoto, planNext }) {
  const bestBars = Object.entries(best || {}).filter(([id]) => DRILL_BY_ID[id]).map(([id, b]) => [id, b.pct]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const weakTop = Object.entries(weak || {}).filter(([t, v]) => v >= 2 && liveTag(t)).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const strongDrills = bestBars.filter(([, p]) => p >= 80).map(([id]) => (DRILL_BY_ID[id] || { name: id }).name);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [estOpen, setEstOpen] = useState(false);
  const [sjtOpen, setSjtOpen] = useState(false);
  const secs = [
    ["QR", "Quantitative Reasoning", "arithmetic under pressure"],
    ["VR", "Verbal Reasoning", "the weakest subtest nationally"],
    ["SJT", "Situational Judgement", "banded separately, learnable"],
  ];

  const tryCode = () => { if (code.trim().toUpperCase() === ACCESS_CODE) { setErr(""); onUnlock(); } else setErr("That code isn't recognised."); };

  const sjtThemes = [...new Set(SJT_SCENARIOS.map((s) => s.theme))];

  const startDrill = (d, sub) => {
    if (d.id === "estimate" && !sub) { setEstOpen((o) => !o); return; }
    if (d.id === "sjt" && !sub) { setSjtOpen((o) => !o); return; }
    if (d.id === "sjt") { onStart(d, prefs.exam, Math.min(prefs.count, d.max), null, null, sub === "practice" ? "all" : sub); return; }
    onStart(d, prefs.exam, Math.min(prefs.count, d.max), null, sub === "practice" ? null : sub || null, null);
  };

  const Card = ({ d }) => {
    const locked = !d.free && !unlocked;
    if (locked) {
      return (
        <Locked onUnlock={() => onGoto("billing")} label={`${d.name} with access`}>
          <div className="ud-card" style={{ pointerEvents: "none" }}>
            <div className="ud-card-top"><span className="ud-tag">{d.section}</span></div>
            <h3>{d.name}</h3>
            <p>{d.blurb}</p>
          </div>
        </Locked>
      );
    }
    const b = best[d.id];
    const examable = TIMED.includes(d.id);
    return (
      <button className={`ud-card${locked ? " locked" : ""}`} onClick={() => !locked && startDrill(d)} disabled={locked}>
        <div className="ud-card-top">
          <span className="ud-tag">{d.section}</span>
          {locked ? <span className="ud-lock">LOCKED</span> : d.free ? <span className="ud-lock">FREE</span> : null}
        </div>
        <h3>{d.name}</h3>
        <p>{d.blurb}</p>
        {b && !locked && <span className="ud-best mono">Best {b.pct}% · median {fmt(b.med)}</span>}
        {prefs.exam && examable && !locked && <span className="ud-lock" style={{ color: "var(--stop)" }}>{Math.round(d.budget * LEVELS[prefs.level].budget * prefs.extra)}s per question</span>}
      </button>
    );
  };

  return (
    <div className="ud-wrap">
      <div className="ud-herorow">
        <div className="ud-hero">
          <div className="ud-eyebrow">VR · QR · SJT · The training layer</div>
          <h1 className="ud-h1">Your question bank shows the score. This fixes <em>why</em>.</h1>
          <p className="ud-lede">
            Tempo runs beside whichever question bank you already use, it does not replace one. Banks give you volume;
            this builds what sits underneath: recall speed, estimation, scanning, pacing, logic patterns and professional
            judgement. Every answer comes with its reasoning, every mistake follows you until you beat it, and the
            weekly mocks tell you honestly where you stand.
          </p>
          <div className="ud-stats">
            <div className="ud-stat"><b className="mono">602</b><span>Mean VR 2025</span></div>
            <div className="ud-stat"><b className="mono">661</b><span>Mean QR 2025</span></div>
            <div className="ud-stat"><b className="mono">1-4</b><span>SJT bands</span></div>
            <div className="ud-stat"><b className="mono">6</b><span>Week plan</span></div>
          </div>
        </div>
        <div className="ud-herostreak">
          <CountdownStrip prefs={prefs} setPrefs={setPrefs} />
          <StreakCalendar history={history || []} weeks={17} />
        </div>
      </div>

      <div className="ud-today">
        <button className="ud-tcard" onClick={() => onGoto("plan")}>
          <span className="k">Today</span>
          <b>{planNext ? planNext : "Plan complete"}</b>
          <span className="d">{planNext ? "Your next plan session" : "Keep running timed blocks"}</span>
        </button>
        <button className="ud-tcard" onClick={() => onGoto("mock")}>
          <span className="k">This week</span>
          <b>VR + QR mocks</b>
          <span className="d">Three of each, boards reset weekly</span>
        </button>
        <button className="ud-tcard" onClick={() => onGoto("mistakes")} disabled={mistakesCount === 0}>
          <span className="k">Rematch</span>
          <b>{mistakesCount > 0 ? `${mistakesCount} due` : "Bank clear"}</b>
          <span className="d">{mistakesCount > 0 ? "Questions that beat you, waiting" : "Exactly how you want it"}</span>
        </button>
        <button className="ud-tcard" onClick={() => (unlocked ? onWeakSpots() : onGoto("billing"))}>
          <span className="k">Targeted</span>
          <b>Fix weak spots</b>
          <span className="d">{weakTop.length ? "A mixed set built from your weakest skills" : "Practise, then this targets your gaps"}</span>
        </button>
        <button className="ud-tcard" onClick={() => onGoto("learn")}>
          <span className="k">Learn</span>
          <b>Technique first</b>
          <span className="d">Every drill's method, one page each</span>
        </button>
      </div>

      {(bestBars.length > 0 || weakTop.length > 0) && (
        <>
          <div className="ud-sec"><h2>Your progress at a glance</h2><i /><span onClick={() => onGoto("progress")} style={{ cursor: "pointer" }}>full report ›</span></div>
          <div className="ana-wrap">
            {bestBars.length > 0 && (
              <div className="ud-trend ana-card">
                <p className="ana-h">Best score by drill</p>
                <div className="ana-bars">
                  {bestBars.map(([id, pct]) => (
                    <div className="ana-bar" key={id} title={`${(DRILL_BY_ID[id] || { name: id }).name}: ${pct}%`}>
                      <span className="pct mono">{pct}%</span>
                      <i style={{ height: `${Math.max(pct, 4)}%` }} className={pct >= 80 ? "good" : pct >= 55 ? "mid" : "low"} />
                      <span className="lbl">{(DRILL_BY_ID[id] || { name: id }).name.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="ud-trend ana-card">
              <p className="ana-h">What to work on</p>
              {weakTop.length > 0 ? (
                <>
                  <p className="ana-sub">Revise these first, drills already favour them:</p>
                  <div className="ud-weak">{weakTop.map(([t, v]) => <b key={t}>{weakLabel(t)}</b>)}</div>
                </>
              ) : <p className="ana-sub">No weak spots flagged yet. Finish a few drills and this fills in.</p>}
              {strongDrills.length > 0 && (
                <>
                  <p className="ana-sub" style={{ marginTop: 12 }}>You are strong at:</p>
                  <div className="ud-weak strong">{strongDrills.map((n) => <b key={n}>{n}</b>)}</div>
                </>
              )}
              {mistakesCount > 0 && <button className="ud-btn ghost" style={{ marginTop: 14 }} onClick={onMistakes}>Try {mistakesCount} more question{mistakesCount === 1 ? "" : "s"}</button>}
            </div>
          </div>
        </>
      )}

      <div className="ud-config">
        <div className="grp">
          <label>Questions</label>
          <div className="row">
            <input type="range" min="5" max="25" value={prefs.count} onChange={(e) => setPrefs({ ...prefs, count: Number(e.target.value) })} aria-label="Number of questions" />
            <span className="val mono">{prefs.count}</span>
          </div>
        </div>
        <div className="grp">
          <label>Mode</label>
          <div className="row">
            <button className={!prefs.exam ? "on" : ""} onClick={() => setPrefs({ ...prefs, exam: false })}>Untimed</button>
            <button className={prefs.exam ? "on" : ""} onClick={() => setPrefs({ ...prefs, exam: true })}>Timed</button>
          </div>
        </div>
        <div className="grp">
          <label>Feedback</label>
          <div className="row">
            <button className={!prefs.reviewEnd ? "on" : ""} onClick={() => setPrefs({ ...prefs, reviewEnd: false })}>After each</button>
            <button className={prefs.reviewEnd ? "on" : ""} onClick={() => setPrefs({ ...prefs, reviewEnd: true })}>At the end</button>
          </div>
        </div>
        <div className="grp">
          <label>Start on Go</label>
          <div className="row">
            <button className={!prefs.hideQ ? "on" : ""} onClick={() => setPrefs({ ...prefs, hideQ: false })}>Off</button>
            <button className={prefs.hideQ ? "on" : ""} onClick={() => setPrefs({ ...prefs, hideQ: true })}>Hide until ready</button>
          </div>
        </div>
        {prefs.exam && (
          <div className="grp">
            <label>Extra time</label>
            <div className="row">
              <button className={prefs.extra === 1 ? "on" : ""} onClick={() => setPrefs({ ...prefs, extra: 1 })}>None</button>
              <button className={prefs.extra === 1.25 ? "on" : ""} onClick={() => setPrefs({ ...prefs, extra: 1.25 })}>+25%</button>
              <button className={prefs.extra === 1.5 ? "on" : ""} onClick={() => setPrefs({ ...prefs, extra: 1.5 })}>+50%</button>
            </div>
          </div>
        )}
        <div className="grp">
          <label>Difficulty</label>
          <div className="row">
            {Object.entries(LEVELS).map(([k, v]) => (
              <button key={k} className={prefs.level === k ? "on" : ""} onClick={() => setPrefs({ ...prefs, level: k })}>{v.label}</button>
            ))}
          </div>
        </div>
      </div>

      {secs.map(([sec, title, note], si) => (
        <React.Fragment key={sec}>
          <div className="ud-sec"><span className="ud-chip mono">{String(si + 1).padStart(2, "0")}</span><h2>{title}</h2><i /><span>{note}</span></div>
          <div className="ud-grid">{DRILLS.filter((d) => d.section === sec).map((d) => <Card key={d.id} d={d} />)}</div>
          {sec === "QR" && estOpen && (
            <div className="ud-subs">
              {EST_SUBS.map((s) => (
                <button key={s.id} className="ud-sub" onClick={() => startDrill(DRILL_BY_ID.estimate, s.id)}>
                  <b>{s.name}</b><span>{s.desc}</span>
                </button>
              ))}
            </div>
          )}
          {sec === "SJT" && sjtOpen && (
            <div className="ud-subs">
              <button className="ud-sub" onClick={onLearnSjt}>
                <b>Learn the SJT</b><span>An interactive course: timings, bands, the three formats, scoring, principles and traps. Quick checks as you go, nothing to memorise passively.</span>
              </button>
              <button className="ud-sub" onClick={() => startDrill(DRILL_BY_ID.sjt, "practice")}>
                <b>Mixed practice</b><span>All themes and all three official formats with a written reason for every answer and a band estimate at the end.</span>
              </button>
              {sjtThemes.map((th) => (
                <button key={th} className="ud-sub" onClick={() => startDrill(DRILL_BY_ID.sjt, th)}>
                  <b>{SJT_THEMES[th].name}</b><span>{SJT_THEMES[th].rule}</span>
                </button>
              ))}
            </div>
          )}
        </React.Fragment>
      ))}

      {!unlocked && (
        <div className="ud-price">
          <div>
            <h3>{saleLive() ? `${SALE_PRICE}, once` : `${FULL_PRICE}, once`}</h3>
            <p>{saleLive() ? `Launch price of ${SALE_PRICE} until ${SALE_ENDS_LABEL}, then ${FULL_PRICE}. ` : ""}Every drill, the Learn pages, the weekly VR and QR mocks with leaderboards, the six week plan, the spaced mistake bank, and timed mode with extra time options. Built to run alongside whichever question bank you use. No subscription, nothing to cancel. Times tables stays free either way.</p>
            <div className="ud-code">
              <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryCode()} placeholder="Access code" aria-label="Access code" />
              <button className="ud-btn ghost" onClick={tryCode}>Redeem</button>
            </div>
            {err && <p style={{ color: "var(--stop)", fontSize: 12, marginTop: 8 }}>{err}</p>}
          </div>
          <button className="ud-btn" onClick={() => onGoto("billing")}>See what's included</button>
        </div>
      )}

      <div className="ud-foot">
        Not affiliated with the UCAT Consortium. All passages, scenarios, questions and explanations are original to this app, reasoned from published professional standards.<br />
        Preview build, progress saves to this browser only.
      </div>
    </div>
  );
}

/* ------------------------------ LEARN VIEW ------------------------ */

function UcatFacts() {
  const [open, setOpen] = useState(false);
  return (
    <div className="facts-box">
      <button className="facts-head" onClick={() => setOpen((o) => !o)}>
        <span className="k">Exam format, verified</span>
        <span className="t">What the UCAT actually looks like now</span>
        <span className={`chev${open ? " open" : ""}`}>›</span>
      </button>
      {open && (
        <div className="facts-body">
          {UCAT_FACTS.map((f, n) => (
            <div className="frow" key={n}><b>{f.k}</b><span>{f.v}</span></div>
          ))}
          <p className="fnote">Checked against 2026 sources. Formats and dates do change, so confirm anything decision critical on the official UCAT site.</p>
        </div>
      )}
    </div>
  );
}

/* Average best score across the drills that belong to one subtest, for
   the overview progress bars. Returns null when nothing has been sat yet
   so the card can show "Not started" rather than a misleading 0%. */
function subtestProgress(section, best) {
  const ids = DRILLS.filter((d) => d.section === section).map((d) => d.id);
  const scored = ids.map((id) => best && best[id] && best[id].pct).filter((p) => typeof p === "number");
  if (!scored.length) return null;
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
}

function LearnView({ unlocked, best, onStart, onUnlock }) {
  const [open, setOpen] = useState(null);
  const [sjtMode, setSjtMode] = useState("read");

  if (open) {
    const meta = GUIDE_META[open];
    const blocks = GUIDE[open] || [];
    const lesson = LEARN.find((s) => s.id === open); /* vr/qr/sjt also carry drillable techniques */
    const trainSjt = open === "sjt" && sjtMode === "train";
    return (
      <div className="ud-wrap">
        <button className="learn-back" onClick={() => { setOpen(null); setSjtMode("read"); window.scrollTo(0, 0); }}>
          <svg {...svgProps} width="15" height="15"><path d="M15 18l-6-6 6-6" /></svg>
          All of the guide
        </button>
        <div className="learn-detailhead">
          <span className="learn-ico" data-sec={open}>{SUBTEST_ICON[open]}</span>
          <div>
            <h2>{meta.title}</h2>
            <span className="learn-count">{meta.tag}</span>
          </div>
        </div>

        {open === "sjt" && (
          <div className="sjt-modes">
            <button className={`sjt-mode${sjtMode === "read" ? " on" : ""}`} onClick={() => { setSjtMode("read"); window.scrollTo(0, 0); }}>
              <span className="sjt-mode-ico"><svg {...svgProps} width="20" height="20"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /></svg></span>
              <b>Read the guide</b>
              <span className="sjt-mode-sub">The framework and the rules, explained.</span>
            </button>
            <button className={`sjt-mode${sjtMode === "train" ? " on" : ""}`} onClick={() => { setSjtMode("train"); window.scrollTo(0, 0); }}>
              <span className="sjt-mode-ico"><svg {...svgProps} width="20" height="20"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></span>
              <b>Learn &amp; quiz</b>
              <span className="sjt-mode-sub">Interactive lessons, then marked practice questions.</span>
            </button>
          </div>
        )}

        {trainSjt ? <SjtTrainer /> : <GuideBlocks blocks={blocks} />}

        {!trainSjt && lesson && (
          <>
            <div className="ud-sec" style={{ paddingTop: 30 }}><h2>Practise these techniques</h2><i /><span>{lesson.cards.length} drills</span></div>
            <div className="learn-tech">
              {lesson.cards.map((c, n) => (
                <div className="tech-card" key={n}>
                  <span className="tech-num">{String(n + 1).padStart(2, "0")}</span>
                  <div className="tech-body">
                    <h4>{c.h}</h4>
                    <p>{c.p}</p>
                    {c.drill && (
                      <button
                        className="tech-drill"
                        onClick={() => onStart(DRILL_BY_ID[c.drill], false, DRILL_BY_ID[c.drill].def, null, c.sub || null, c.theme || null)}
                        disabled={!unlocked && !DRILL_BY_ID[c.drill].free}
                      >
                        {!unlocked && !DRILL_BY_ID[c.drill].free ? "Locked" : "Drill this →"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ height: 50 }} />
      </div>
    );
  }

  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>The UCAT guide</h2><i /><span>format, scoring and method</span></div>
      <p className="ud-learn-intro">Everything that actually moves a UCAT score: the format, the scoring, the test-day tools, and the technique behind every section. Original method, written for this exam and checked against the live 2025/26 format, not lifted from a bank.</p>
      <ExamGlance />
      <div className="learn-grid">
        {GUIDE_ORDER.map((id) => {
          const meta = GUIDE_META[id];
          const isSub = id === "vr" || id === "qr" || id === "sjt";
          const pct = isSub ? subtestProgress(id.toUpperCase(), best) : null;
          return (
            <button className="learn-card" key={id} onClick={() => { setOpen(id); window.scrollTo(0, 0); }}>
              <span className="learn-ico" data-sec={id}>{SUBTEST_ICON[id]}</span>
              <span className="learn-body">
                <span className="learn-title">{meta.title}</span>
                <span className="learn-blurb">{meta.blurb}</span>
                {isSub && <span className="learn-bar"><i style={{ width: (pct || 0) + "%" }} /></span>}
                <span className="learn-meta">
                  <span>{isSub ? (pct == null ? "Not started" : `Best ${pct}%`) : meta.tag}</span>
                  <span>Read →</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <UcatFacts />
      <div style={{ height: 50 }} />
    </div>
  );
}

/* Renders the structured guide blocks (see data/guide.js for the grammar). */
function GuideBlocks({ blocks }) {
  return (
    <div className="gb">
      {blocks.map((b, i) => {
        const k = b[0];
        if (k === "p") return <p className="gb-p" key={i}>{b[1]}</p>;
        if (k === "h") return <h3 className="gb-h" key={i}>{b[1]}</h3>;
        if (k === "list") return <ul className="gb-list" key={i}>{b[1].map((x, n) => <li key={n}>{x}</li>)}</ul>;
        if (k === "steps") return <ol className="gb-steps" key={i}>{b[1].map((x, n) => <li key={n}>{x}</li>)}</ol>;
        if (k === "key" || k === "trap" || k === "tip") return (
          <div className={`gb-call ${k}`} key={i}>
            <span className="gb-call-tag">{k === "trap" ? "Trap" : k === "tip" ? "Tip" : "Key"}</span>
            <b>{b[1]}</b>
            <span className="gb-call-body">{b[2]}</span>
          </div>
        );
        if (k === "table") return (
          <div className="gb-tablewrap" key={i}>
            <table className="gb-table">
              <thead><tr>{b[1].map((h, n) => <th key={n}>{h}</th>)}</tr></thead>
              <tbody>{b[2].map((row, n) => <tr key={n}>{row.map((c, m) => <td key={m} className={m === 0 ? "" : "mono"}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
        return null;
      })}
    </div>
  );
}

/* The exam-at-a-glance panel on the Learn landing. */
function ExamGlance() {
  return (
    <div className="glance">
      <div className="glance-head"><b>The exam at a glance</b><span>2025/26 format, verified</span></div>
      <div className="glance-tablewrap">
        <table className="glance-table">
          <thead><tr><th>Section</th><th>Qs</th><th>Time</th><th>Per Q</th></tr></thead>
          <tbody>
            {EXAM_FORMAT.map((s) => (
              <tr key={s.code}>
                <td><b>{s.code}</b> <span className="gl-name">{s.name}</span></td>
                <td className="mono">{s.q}</td>
                <td className="mono">{s.time}</td>
                <td className="mono">{s.per}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="glance-foot">
        <span><b className="mono">184</b> questions total</span>
        <span>Cognitive <b className="mono">900–2700</b></span>
        <span>SJT <b className="mono">Bands 1–4</b></span>
        <span>No negative marking</span>
      </div>
    </div>
  );
}

/* ------------------------------ PLAN VIEW ------------------------- */

/* ---- Planner helpers: local-date maths, streaks, plan generation ---- */
const ymd = (dt) => { const x = new Date(dt); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const parseYmd = (s) => { if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (dt, n) => { const x = new Date(dt); x.setDate(x.getDate() + n); return x; };
const humanDate = (s) => { const d = parseYmd(s); return d ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : ""; };
let PLAN_UID = 0;
const planUid = () => `${Date.now().toString(36)}${(PLAN_UID++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

function currentStreak(history) {
  const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const active = new Set((history || []).map((h) => key(new Date(h.ts))));
  const t = new Date(); t.setHours(0, 0, 0, 0);
  let c = 0; const d = new Date(t);
  if (!active.has(key(d))) d.setDate(d.getDate() - 1);
  while (active.has(key(d))) { c++; d.setDate(d.getDate() - 1); }
  return c;
}

const PHASE_LABEL = { found: "Foundations", tech: "Technique", timed: "Timed conditions", taper: "Taper" };
const GEN_POOLS = {
  found: { QR: ["tables", "calc"], VR: ["scan", "speed"], SJT: ["sjt"] },
  tech: { QR: ["estimate", "qrset"], VR: ["tfc", "infer", "scan"], SJT: ["sjt"] },
  timed: { QR: ["estimate", "qrset", "calc"], VR: ["tfc", "infer", "scan"], SJT: ["sjt"] },
  taper: { QR: ["estimate"], VR: ["scan", "blurt"], SJT: ["sjt"] },
};

/* Build a dated, progressive plan from a start and end date. Study days
   are spread across the week; the phase ramps foundations to technique to
   timed conditions, then tapers in the final week. */
function generatePlan({ startYmd, endYmd, perWeek, focus }) {
  const foc = focus && focus.length ? focus : ["QR", "VR", "SJT"];
  const start = parseYmd(startYmd), end = parseYmd(endYmd);
  if (!start || !end || end <= start) return [];
  const order = [1, 3, 5, 2, 4, 6, 0];
  const studyDays = new Set(order.slice(0, Math.max(1, Math.min(7, perWeek))));
  const totalMs = end - start;
  const out = [];
  let k = 0;
  for (let d = new Date(start); d <= end && out.length < 160; d = addDays(d, 1)) {
    if (!studyDays.has(d.getDay())) continue;
    const daysLeft = Math.round((end - d) / 86400000);
    const frac = totalMs > 0 ? 1 - (end - d) / totalMs : 1;
    const phase = daysLeft <= 7 ? "taper" : frac < 0.3 ? "found" : frac < 0.66 ? "tech" : "timed";
    const sec = foc[k % foc.length];
    const pool = (GEN_POOLS[phase][sec] && GEN_POOLS[phase][sec].length) ? GEN_POOLS[phase][sec] : (GEN_POOLS.tech[sec] || ["estimate"]);
    const drill = pool[Math.floor(k / foc.length) % pool.length];
    const exam = phase === "timed" && TIMED.includes(drill);
    out.push({ id: planUid(), drill, exam, count: DRILL_BY_ID[drill].def, date: ymd(d), note: PHASE_LABEL[phase] });
    k++;
  }
  return out;
}

function PlanView({ unlocked, plan, onStart, prefs, setPrefs, setPlanDone, best, history }) {
  const nextKey = PLAN_KEYS.find((k) => !plan[k]);
  const doneCount = PLAN_KEYS.filter((k) => plan[k]).length;
  let nextInfo = null;
  if (nextKey) {
    const w = Number(nextKey.match(/w(\d+)/)[1]);
    const d = Number(nextKey.match(/d(\d+)/)[1]);
    const week = PLAN.find((x) => x.week === w);
    nextInfo = { week, day: week.days[d - 1], w, d, key: nextKey };
  }
  /* One week open at a time so the whole plan stays compact. Default to
     the week that holds the next unfinished session. */
  const [openWeek, setOpenWeek] = useState(nextInfo ? nextInfo.w : 1);
  const [mode, setMode] = useState("guided");

  /* Custom plan lives in prefs.customPlan; completion reuses the plan map
     keyed cust:<id>. The full planner UI is in PlannerPanel. */
  const customPlan = prefs.customPlan || [];
  const custDone = customPlan.filter((x) => plan[`cust:${x.id}`]).length;

  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Study plan</h2><i /><span>{mode === "guided" ? `${doneCount}/${PLAN_KEYS.length} guided done` : `${custDone}/${customPlan.length} custom done`}</span></div>
      <div className="ud-mode" style={{ paddingTop: 12 }}>
        <span>Plan</span>
        <button className={mode === "guided" ? "on" : ""} onClick={() => setMode("guided")}>Six week plan</button>
        <button className={mode === "custom" ? "on" : ""} onClick={() => setMode("custom")}>My own plan</button>
      </div>

      {mode === "custom" ? (
        <PlannerPanel unlocked={unlocked} plan={plan} onStart={onStart} prefs={prefs} setPrefs={setPrefs} setPlanDone={setPlanDone} best={best} history={history} />
      ) : (
      <>
      {nextInfo ? (
        <div className="ud-nextup">
          <div>
            <div className="ud-eyebrow" style={{ marginBottom: 0 }}>Week {nextInfo.w} · Day {nextInfo.d}</div>
            <h3>{DRILL_BY_ID[nextInfo.day.drill].name}</h3>
            <p>{nextInfo.week.theme}{nextInfo.day.exam ? " · timed" : ""}</p>
          </div>
          <button className="ud-btn" disabled={!unlocked && !DRILL_BY_ID[nextInfo.day.drill].free}
            onClick={() => onStart(DRILL_BY_ID[nextInfo.day.drill], nextInfo.day.exam, DRILL_BY_ID[nextInfo.day.drill].def, nextInfo.key, null, null)}>
            {!unlocked && !DRILL_BY_ID[nextInfo.day.drill].free ? "Locked" : "Start today's session"}
          </button>
        </div>
      ) : (
        <div className="ud-nextup"><div><h3>Plan complete</h3><p>Keep running timed blocks until test day.</p></div></div>
      )}
      {PLAN.map((w) => {
        const open = openWeek === w.week;
        const wdone = w.days.filter((_, i) => plan[`w${w.week}d${i + 1}`]).length;
        return (
          <div className={`ud-week${open ? " open" : ""}`} key={w.week}>
            <button className="ud-weekhead" onClick={() => setOpenWeek(open ? null : w.week)} aria-expanded={open}>
              <span className="wk">Week {w.week}</span>
              <b>{w.theme}</b>
              <span className="wk-meta mono">{wdone}/{w.days.length}</span>
              <span className="wk-chev" aria-hidden="true">{open ? "▾" : "▸"}</span>
            </button>
            {open && (
              <div className="ud-weekbody">
                <p className="wk-note">{w.note}</p>
                {w.days.map((d, i) => {
                  const key = `w${w.week}d${i + 1}`;
                  const dr = DRILL_BY_ID[d.drill];
                  const locked = !unlocked && !dr.free;
                  return (
                    <button key={key} className="ud-day" disabled={locked} onClick={() => onStart(dr, d.exam, dr.def, key, null, null)}>
                      <span className={`ud-tick${plan[key] ? " done" : ""}`}>{plan[key] ? "✓" : ""}</span>
                      <span className="n">Day {i + 1}</span>
                      <span className="nm">{dr.name}</span>
                      <span className="meta">{locked ? "locked" : d.exam ? "timed" : "untimed"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ height: 50 }} />
      </>
      )}
    </div>
  );
}

/* Full custom planner: test-date countdown, an auto plan generator with
   templates, per-session scheduling and editing, live stats, and a
   schedule grouped by when each session is due. */
function PlannerPanel({ unlocked, plan, onStart, prefs, setPrefs, setPlanDone, best, history }) {
  const sessions = prefs.customPlan || [];
  const today = ymd(new Date());
  const examDate = prefs.examDate || null;
  const dLeft = daysUntil(examDate);
  const todayStr = today;
  const maxD = new Date(); maxD.setFullYear(maxD.getFullYear() + 3);
  const maxStr = ymd(maxD);

  const isDone = (s) => !!plan[`cust:${s.id}`];
  const doneCount = sessions.filter(isDone).length;

  const [addOpen, setAddOpen] = useState(sessions.length === 0);
  const [pickDrill, setPickDrill] = useState("estimate");
  const [pickExam, setPickExam] = useState(false);
  const [pickCount, setPickCount] = useState(DRILL_BY_ID.estimate.def);
  const [pickDate, setPickDate] = useState(today);
  const [pickNote, setPickNote] = useState("");
  const [editId, setEditId] = useState(null);
  const [genOpen, setGenOpen] = useState(false);
  const [perWeek, setPerWeek] = useState(5);
  const [focus, setFocus] = useState(["QR", "VR", "SJT"]);
  const [genWeeks, setGenWeeks] = useState(6);
  const [pending, setPending] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [dateVal, setDateVal] = useState(examDate || "");
  const [dateEdit, setDateEdit] = useState(false);

  const persist = (arr) => setPrefs({ ...prefs, customPlan: arr });
  const changeDrill = (id) => { setPickDrill(id); setPickCount(DRILL_BY_ID[id].def); if (!TIMED.includes(id)) setPickExam(false); };
  const add = () => {
    const dr = DRILL_BY_ID[pickDrill];
    const cnt = Math.max(1, Math.min(Number(pickCount) || dr.def, dr.max));
    persist([...sessions, { id: planUid(), drill: pickDrill, exam: pickExam && TIMED.includes(pickDrill), count: cnt, date: pickDate || null, note: pickNote.trim().slice(0, 60) }]);
    setPickNote("");
  };
  const remove = (id) => { setPlanDone(`cust:${id}`, false); persist(sessions.filter((s) => s.id !== id)); };
  const update = (id, patch) => persist(sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const toggleDone = (s) => setPlanDone(`cust:${s.id}`, !isDone(s));
  const clearDone = () => { sessions.filter(isDone).forEach((s) => setPlanDone(`cust:${s.id}`, false)); persist(sessions.filter((s) => !isDone(s))); };

  const toggleFocus = (f) => setFocus((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  const buildWith = (params) => {
    const end = examDate || ymd(addDays(new Date(), (params.weeks || genWeeks) * 7));
    const gen = generatePlan({ startYmd: today, endYmd: end, perWeek: params.perWeek, focus: params.focus });
    if (!gen.length) return;
    sessions.forEach((s) => setPlanDone(`cust:${s.id}`, false));
    persist(gen);
    setPending(null); setGenOpen(false);
  };
  const requestBuild = (params) => { if (sessions.length) setPending(params); else buildWith(params); };
  const weakestSection = () => {
    const order = ["VR", "QR", "SJT"];
    const scored = order.map((sec) => {
      const ids = DRILLS.filter((d) => d.section === sec).map((d) => d.id);
      const vals = ids.map((id) => best && best[id] && best[id].pct).filter((p) => typeof p === "number");
      return { sec, pct: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 999 };
    });
    scored.sort((a, b) => a.pct - b.pct);
    return scored[0].pct === 999 ? ["QR", "VR", "SJT"] : [scored[0].sec];
  };

  const saveDate = () => { if (dateVal && dateVal >= todayStr && dateVal <= maxStr) { setPrefs({ ...prefs, examDate: dateVal }); setDateEdit(false); } };

  /* Stats */
  const streak = currentStreak(history);
  const weekEnd = ymd(addDays(new Date(), 7));
  const dueSoon = sessions.filter((s) => s.date && s.date >= today && s.date <= weekEnd);
  const dueSoonDone = dueSoon.filter(isDone).length;
  const pctDone = sessions.length ? Math.round((doneCount / sessions.length) * 100) : 0;

  /* Grouped schedule (outstanding only; completed listed separately) */
  const pend = sessions.filter((s) => !isDone(s));
  const bucket = (s) => (!s.date ? "none" : s.date < today ? "overdue" : s.date === today ? "today" : s.date <= weekEnd ? "week" : "later");
  const GROUPS = [
    { key: "overdue", label: "Overdue" },
    { key: "today", label: "Today" },
    { key: "week", label: "Next 7 days" },
    { key: "later", label: "Later" },
    { key: "none", label: "No date set" },
  ];
  const grouped = GROUPS.map((g) => ({ ...g, items: pend.filter((s) => bucket(s) === g.key).sort((a, b) => (a.date || "9").localeCompare(b.date || "9")) })).filter((g) => g.items.length);
  const doneList = sessions.filter(isDone);

  const Row = (s) => {
    const dr = DRILL_BY_ID[s.drill];
    const key = `cust:${s.id}`;
    const locked = !unlocked && !dr.free;
    const done = isDone(s);
    const overdue = !done && s.date && s.date < today;
    return (
      <div className={`pl-row${done ? " done" : ""}${editId === s.id ? " editing" : ""}`} key={s.id}>
        <button className="pl-check" onClick={() => toggleDone(s)} aria-label={done ? "Mark not done" : "Mark done"}>
          <span className={`ud-tick${done ? " done" : ""}`}>{done ? "✓" : ""}</span>
        </button>
        <div className="pl-main">
          <div className="pl-l1">
            <span className={`pl-sec s-${dr.section}`}>{dr.section}</span>
            <b>{dr.name}</b>
          </div>
          <div className="pl-l2">
            {s.date && <span className={overdue ? "pl-over" : ""}>{humanDate(s.date)}</span>}
            <span>{s.exam ? "timed" : "untimed"}</span>
            <span>{s.count || dr.def}Q</span>
            {s.note && <span className="pl-note">{s.note}</span>}
          </div>
        </div>
        <div className="pl-actions">
          <button className="pl-go" disabled={locked} onClick={() => onStart(dr, s.exam, s.count || dr.def, key, null, null)}>{locked ? "Locked" : "Start"}</button>
          <button className="pl-ic" onClick={() => setEditId(editId === s.id ? null : s.id)} aria-label="Edit session">✎</button>
          <button className="pl-ic" onClick={() => remove(s.id)} aria-label="Remove session">×</button>
        </div>
        {editId === s.id && (
          <div className="pl-edit">
            <label>Date<input type="date" value={s.date || ""} min={todayStr} max={maxStr} onChange={(e) => update(s.id, { date: e.target.value || null })} /></label>
            <label>Questions<input type="number" min="1" max={dr.max} value={s.count || dr.def} onChange={(e) => update(s.id, { count: Math.max(1, Math.min(Number(e.target.value) || dr.def, dr.max)) })} /></label>
            <label className="pl-ce"><input type="checkbox" checked={!!s.exam} disabled={!TIMED.includes(s.drill)} onChange={(e) => update(s.id, { exam: e.target.checked })} /> Timed</label>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Test date */}
      {!examDate || dateEdit ? (
        <div className="pl-datebar set">
          <div><b>When do you sit the UCAT?</b><span>The generator paces your plan around this date.</span></div>
          <div className="pl-datein">
            <input type="date" value={dateVal} min={todayStr} max={maxStr} onChange={(e) => setDateVal(e.target.value)} aria-label="UCAT test date" />
            <button className="ud-btn" onClick={saveDate} disabled={!(dateVal && dateVal >= todayStr && dateVal <= maxStr)}>Set date</button>
          </div>
        </div>
      ) : (
        <div className="pl-datebar">
          <div className="pl-dnum"><b className="mono">{dLeft < 0 ? 0 : dLeft}</b><span>{dLeft === 1 ? "day to your UCAT" : dLeft < 0 ? "test day passed" : "days to your UCAT"}</span></div>
          <span className="pl-ddate">{humanDate(examDate)}</span>
          <button className="ud-quit" onClick={() => { setDateVal(examDate); setDateEdit(true); }}>change</button>
        </div>
      )}

      {/* Stats */}
      <div className="pl-stats">
        <div className="pl-stat"><b>{sessions.length}</b><span>sessions</span></div>
        <div className="pl-stat"><b>{pctDone}%</b><span>complete</span></div>
        <div className="pl-stat"><b>{dueSoonDone}/{dueSoon.length}</b><span>next 7 days</span></div>
        <div className="pl-stat"><b>{streak}</b><span>day streak</span></div>
      </div>

      {/* Toolbar */}
      <div className="pl-tools">
        <button className={`pl-tbtn${genOpen ? " on" : ""}`} onClick={() => setGenOpen((o) => !o)}>Auto-build plan</button>
        <button className={`pl-tbtn${addOpen ? " on" : ""}`} onClick={() => setAddOpen((o) => !o)}>Add a session</button>
        <span className="pl-spacer" />
        {doneCount > 0 && <button className="pl-tbtn ghost" onClick={() => setShowDone((o) => !o)}>{showDone ? "Hide" : "Show"} completed ({doneCount})</button>}
        {doneCount > 0 && <button className="pl-tbtn ghost" onClick={clearDone}>Clear completed</button>}
      </div>

      {/* Generator */}
      {genOpen && (
        <div className="pl-gen">
          <h3>Auto-build a plan</h3>
          <p>A dated schedule that ramps from foundations to timed conditions, then tapers before test day{examDate ? "" : " (set a test date above for exact pacing)"}.</p>
          <div className="pl-genrow">
            <div className="pl-field"><span>Days a week</span>
              <div className="pl-seg">{[3, 4, 5, 6].map((n) => <button key={n} className={perWeek === n ? "on" : ""} onClick={() => setPerWeek(n)}>{n}</button>)}</div>
            </div>
            <div className="pl-field"><span>Focus</span>
              <div className="pl-seg">{["QR", "VR", "SJT"].map((f) => <button key={f} className={focus.includes(f) ? "on" : ""} onClick={() => toggleFocus(f)}>{f}</button>)}</div>
            </div>
            {!examDate && (
              <div className="pl-field"><span>Weeks</span>
                <div className="pl-seg">{[2, 3, 4, 6, 8].map((n) => <button key={n} className={genWeeks === n ? "on" : ""} onClick={() => setGenWeeks(n)}>{n}</button>)}</div>
              </div>
            )}
          </div>
          <div className="pl-templates">
            <span>Quick start:</span>
            <button onClick={() => requestBuild({ perWeek: 5, focus: ["QR", "VR", "SJT"], weeks: 6 })}>Balanced · 6 wk</button>
            <button onClick={() => requestBuild({ perWeek: 6, focus: ["QR", "VR", "SJT"], weeks: 3 })}>Intensive · 3 wk</button>
            <button onClick={() => requestBuild({ perWeek: 6, focus: ["QR", "VR", "SJT"], weeks: 2 })}>Crash · 2 wk</button>
            <button onClick={() => requestBuild({ perWeek: 5, focus: weakestSection(), weeks: 4 })}>Weak spot</button>
          </div>
          {pending ? (
            <div className="pl-confirm">Replace your {sessions.length} current sessions? <button className="ud-btn" onClick={() => buildWith(pending)}>Yes, replace</button><button className="pl-tbtn ghost" onClick={() => setPending(null)}>Cancel</button></div>
          ) : (
            <button className="ud-btn" onClick={() => requestBuild({ perWeek, focus, weeks: genWeeks })} disabled={!focus.length}>Generate plan</button>
          )}
        </div>
      )}

      {/* Add session */}
      {addOpen && (
        <div className="plan-build">
          <h3>Add a session</h3>
          <div className="pb-row">
            <select value={pickDrill} onChange={(e) => changeDrill(e.target.value)} aria-label="Drill">
              {DRILLS.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.section})</option>)}
            </select>
            <input className="pb-count" type="number" min="1" max={DRILL_BY_ID[pickDrill].max} value={pickCount} onChange={(e) => setPickCount(e.target.value)} aria-label="Questions" />
            <label className="pb-timed"><input type="checkbox" checked={pickExam} disabled={!TIMED.includes(pickDrill)} onChange={(e) => setPickExam(e.target.checked)} /> Timed</label>
            <input className="pb-date" type="date" value={pickDate} min={todayStr} max={maxStr} onChange={(e) => setPickDate(e.target.value)} aria-label="Date" />
          </div>
          <div className="pb-row">
            <input className="pb-note" type="text" maxLength={60} value={pickNote} placeholder="Note (optional)" onChange={(e) => setPickNote(e.target.value)} />
            <button className="ud-btn" onClick={add}>Add to plan</button>
          </div>
        </div>
      )}

      {/* Schedule */}
      {sessions.length === 0 ? (
        <p className="ud-empty" style={{ paddingTop: 20 }}>No sessions yet. Auto-build a plan from your test date, or add your own sessions above.</p>
      ) : (
        <>
          {grouped.map((g) => (
            <div className="pl-group" key={g.key}>
              <div className={`pl-ghead${g.key === "overdue" ? " over" : ""}`}>{g.label}<span>{g.items.length}</span></div>
              {g.items.map(Row)}
            </div>
          ))}
          {grouped.length === 0 && <p className="ud-empty" style={{ paddingTop: 16 }}>Everything is ticked off. {doneCount > 0 && "Nice work."}</p>}
          {showDone && doneList.length > 0 && (
            <div className="pl-group">
              <div className="pl-ghead done">Completed<span>{doneList.length}</span></div>
              {doneList.map(Row)}
            </div>
          )}
        </>
      )}
      <div style={{ height: 50 }} />
    </>
  );
}

/* ------------------------------ PROGRESS / MISTAKES --------------- */

const PROG_SECTIONS = [
  { key: "VR", label: "Verbal", color: "#F5A524" },
  { key: "QR", label: "Quant", color: "#4C8DD1" },
  { key: "SJT", label: "Situational", color: "#3ECF8E" },
];

function ScoreChart({ series }) {
  const all = series.flatMap((s) => s.points);
  const W = 640, H = 240, padL = 28, padR = 12, padT = 14, padB = 26;
  const minT = Math.min(...all.map((p) => p.t)), maxT = Math.max(...all.map((p) => p.t));
  const xOf = (t) => padL + (maxT === minT ? 0.5 : (t - minT) / (maxT - minT)) * (W - padL - padR);
  const yOf = (v) => padT + (1 - Math.max(Math.min(v, 100), 0) / 100) * (H - padT - padB);
  const fmtD = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="score-chart" role="img" aria-label="Scores over time by section">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={padL} y1={yOf(g)} x2={W - padR} y2={yOf(g)} stroke="var(--line)" strokeWidth="1" />
          <text x={padL - 5} y={yOf(g) + 3} textAnchor="end" className="sc-axis">{g}</text>
        </g>
      ))}
      <text x={padL} y={H - 6} textAnchor="start" className="sc-axis">{fmtD(minT)}</text>
      <text x={W - padR} y={H - 6} textAnchor="end" className="sc-axis">{fmtD(maxT)}</text>
      {series.map((s) => (
        <g key={s.key}>
          {s.points.length > 1 && <path d={s.points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOf(p.pct).toFixed(1)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />}
          {s.points.map((p, i) => <circle key={i} cx={xOf(p.t)} cy={yOf(p.pct)} r="3" fill={s.color} />)}
        </g>
      ))}
    </svg>
  );
}

function StreakCalendar({ history, weeks: WEEKS = 26 }) {
  const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const counts = {};
  history.forEach((h) => { const k = key(new Date(h.ts)); counts[k] = (counts[k] || 0) + 1; });
  const active = new Set(Object.keys(counts));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  let current = 0;
  { const d = new Date(today); if (!active.has(key(d))) d.setDate(d.getDate() - 1); while (active.has(key(d))) { current++; d.setDate(d.getDate() - 1); } }
  let longest = 0;
  { const ts = [...active].map((k) => { const [y, m, dd] = k.split("-").map(Number); return new Date(y, m, dd).getTime(); }).sort((a, b) => a - b);
    let run = 0, prev = null;
    ts.forEach((t) => { run = (prev !== null && t - prev === 86400000) ? run + 1 : 1; longest = Math.max(longest, run); prev = t; }); }
  const activeDays = active.size;

  const gridEnd = new Date(today); gridEnd.setDate(gridEnd.getDate() + (6 - ((gridEnd.getDay() + 6) % 7)));
  const cells = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) { const d = new Date(gridEnd); d.setDate(gridEnd.getDate() - i); cells.push({ future: d > today, count: counts[key(d)] || 0, d }); }
  const weeks = [];
  for (let w = 0; w < WEEKS; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));
  const lvl = (c) => (c <= 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : 3);

  return (
    <div className="ud-trend" style={{ padding: 18 }}>
      <div className="streak-head">
        <div className="streak-stat"><b><span className="fl" aria-hidden="true">🔥</span>{current}</b><span>day streak</span></div>
        <div className="streak-stat"><b>{longest}</b><span>longest streak</span></div>
        <div className="streak-stat"><b>{activeDays}</b><span>days practised</span></div>
      </div>
      <div className="cal">
        {weeks.map((wk, wi) => (
          <div className="cal-col" key={wi}>
            {wk.map((c, di) => (
              <span key={di} className={`cal-cell l${c.future ? "f" : lvl(c.count)}`}
                title={c.future ? "" : `${c.d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${c.count} session${c.count === 1 ? "" : "s"}`} />
            ))}
          </div>
        ))}
      </div>
      <div className="cal-legend"><span>Less</span><i className="l0" /><i className="l1" /><i className="l2" /><i className="l3" /><span>More</span></div>
    </div>
  );
}

/* Compact "outlook" panel: a readiness gauge and a projected test-day
   score band with a schools-in-range tie-in. All clearly framed as
   estimates. */
function OutlookPanel({ best, history, plan, prefs, onGoto }) {
  const track = prefs.track || "dent";
  const ready = readinessScore({ best, history, plan, customPlan: prefs.customPlan, examDate: prefs.examDate });
  const proj = projectScore(prefs.mockHist, prefs.examDate);
  const range = proj && proj.total ? schoolsInRange(proj.total.proj, track, MED_SCHOOLS, UNIS) : null;
  return (
    <>
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Your outlook</h2><i /><span>estimates, not promises</span></div>
      <div className="outlook">
        <div className="ok-card">
          <div className="ok-gauge">
            <Ring pct={ready.score} label={String(ready.score)} sub="ready" />
            <div className="ok-gbody">
              <b>{ready.band}</b>
              <span>{ready.daysLeft != null ? `${ready.daysLeft < 0 ? 0 : ready.daysLeft} days to your UCAT` : "Set a test date on the planner"}</span>
            </div>
          </div>
          <div className="ok-factors" role="list" aria-label="Readiness breakdown">
            {ready.factors.map((f) => (
              <div className="ok-f" role="listitem" key={f.label}>
                <span>{f.label}</span>
                <div className="ok-ftrack"><i style={{ width: `${f.pct}%` }} /></div>
                <span className="mono">{f.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ok-card">
          {proj ? (
            <>
              <div className="ok-eyebrow">Projected by test day</div>
              {proj.total ? (
                <div className="ok-band"><b className="mono">{proj.total.lo}–{proj.total.hi}</b><span>/ 2700 estimate</span></div>
              ) : (
                <p className="ok-note">Sit both a VR and a QR mock to project a total out of 2700.</p>
              )}
              <div className="ok-secs">
                {proj.vr && <span>VR ~{proj.vr.proj}</span>}
                {proj.qr && <span>QR ~{proj.qr.proj}</span>}
                {proj.complete && <span className="dm">DM ~{proj.dm} (assumed)</span>}
              </div>
              {range && (
                <p className="ok-range">Clears the realistic bar at <b>{range.inRange} of {range.total}</b> {track === "med" ? "medical" : "dental"} schools.{onGoto && <button className="ok-link" onClick={() => onGoto("unis")}>Map them →</button>}</p>
              )}
              <p className="ok-note">From {proj.points} mock{proj.points === 1 ? "" : "s"}. The trend tightens with every one you sit.</p>
            </>
          ) : (
            <div className="ok-empty">
              <b>No projection yet</b>
              <p>Sit a weekly mock and your projected UCAT appears here, tightening with each one. Decision Making is estimated from your other sections, since the app does not drill it.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ProgressView({ history, weak, best, plan, prefs, onGoto }) {
  const weakTop = Object.entries(weak).filter(([t, v]) => v >= 2 && liveTag(t)).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const [ivMarks, setIvMarks] = useState([]);
  useEffect(() => { getJSON("ucat:ivmarks", []).then((a) => setIvMarks(Array.isArray(a) ? a : [])); }, []);
  const ivRecent = ivMarks.slice(-12);
  const ivAvg = ivMarks.length ? (ivMarks.reduce((a, m) => a + (m.out10 || 0), 0) / ivMarks.length).toFixed(1) : null;

  const series = PROG_SECTIONS.map((s) => ({
    ...s,
    points: history
      .filter((h) => (DRILL_BY_ID[h.drill] || {}).section === s.key)
      .map((h) => ({ t: h.ts, pct: h.pct }))
      .sort((a, b) => a.t - b.t),
  })).filter((s) => s.points.length);

  return (
    <div className="ud-wrap">
      <OutlookPanel best={best} history={history} plan={plan} prefs={prefs} onGoto={onGoto} />
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Progress</h2><i /><span>score over time</span></div>
      {series.length === 0 ? (
        <p className="ud-empty">Nothing here yet. Finish a drill and your scores start plotting from the next run, one coloured line per section.</p>
      ) : (
        <div className="ud-trend" style={{ padding: 18 }}>
          <div className="sc-legend">
            {series.map((s) => (
              <span key={s.key} className="k"><i style={{ background: s.color }} />{s.label} <b>{s.points[s.points.length - 1].pct}%</b></span>
            ))}
          </div>
          <ScoreChart series={series} />
        </div>
      )}
      {ivMarks.length > 0 && (<>
        <div className="ud-sec"><h2>Interview practice</h2><i /><span>{ivMarks.length} answers marked</span></div>
        <div className="ud-trend">
          <header>
            <h3>Marked answers</h3>
            <span className="sum">average {ivAvg}/10 · latest {ivRecent[ivRecent.length - 1].out10}/10</span>
          </header>
          <div className="ud-spark">{ivRecent.map((m, i) => <div key={i} style={{ height: `${Math.max((m.out10 || 0) * 10, 6)}%` }} title={`${m.out10}/10`} />)}</div>
          <div className="ud-axis"><span>oldest</span><span>latest</span></div>
        </div>
      </>)}
      {weakTop.length > 0 && (<>
        <div className="ud-sec"><h2>What keeps catching you</h2><i /><span>drills now favour these</span></div>
        <div className="ud-weak">{weakTop.map(([t, v]) => <b key={t}>{weakLabel(t)} · {Math.round(v)}</b>)}</div>
      </>)}
      <div style={{ height: 50 }} />
    </div>
  );
}

function MistakesView({ mistakes, active, onRetry, onClear }) {
  const scheduled = mistakes.filter((m) => !(m.misses > 0 || (m.dueTs && m.dueTs <= Date.now())));
  const daysUntil = (ts) => Math.max(1, Math.ceil((ts - Date.now()) / 86400000));
  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Mistake bank</h2><i /><span>{active.length} due · {scheduled.length} scheduled</span></div>
      {mistakes.length === 0 ? (
        <p className="ud-empty">Empty, which is exactly how you want it. Every question you get wrong lands here automatically. Beat it once and it comes back for review after 3 days, then 7, then 21; survive all three and it retires for good. Clearing this list regularly is the single highest-value habit in the app.</p>
      ) : (<>
        <p className="ud-learn-intro">Every question you got wrong, on a spaced schedule. Beat one and it returns in 3 days, then 7, then 21 before retiring. Miss it again at any point and the clock resets.</p>
        <div style={{ display: "flex", gap: 10, margin: "16px 0 6px" }}>
          <button className="ud-btn" onClick={onRetry} disabled={active.length === 0}>Try {active.length} more questions</button>
          <button className="ud-btn ghost" onClick={onClear}>Clear the bank</button>
        </div>
        {active.map((m, i) => (
          <div className="ud-mrow" key={"a" + i}>
            <span className="sec">{m.q.section}</span>
            <span className="txt">{(m.q.stem || m.q.prompt || "").slice(0, 110)}</span>
            <span className="ct">{m.misses > 0 ? `×${m.misses}` : "review due"}</span>
          </div>
        ))}
        {scheduled.map((m, i) => (
          <div className="ud-mrow" key={"s" + i} style={{ opacity: 0.45 }}>
            <span className="sec">{m.q.section}</span>
            <span className="txt">{(m.q.stem || m.q.prompt || "").slice(0, 110)}</span>
            <span className="ct" style={{ color: "var(--mute)" }}>back in {daysUntil(m.dueTs)}d</span>
          </div>
        ))}
      </>)}
      <div style={{ height: 50 }} />
    </div>
  );
}


/* ------------------------------ SJT LEARN ------------------------- */

/* The interactive lesson flow: info cards interleaved with quick quizzes,
   built from SJT_LESSONS. Ends by handing off to the practice questions. */
function SjtLessons({ onDone }) {
  const slides = [];
  SJT_LESSONS.forEach((m, mi) => m.slides.forEach((sl) => slides.push({ ...sl, module: m.module, mi })));
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [seen, setSeen] = useState(0);

  useEffect(() => {
    getJSON("ucat:sjtlearn", 0).then((n) => {
      const v = Number(n) || 0;
      setSeen(v);
      setIdx(Math.min(v, slides.length - 1));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sl = slides[idx];
  const answered = sl.t !== "quiz" || chosen !== null;
  const atEnd = idx >= slides.length - 1;

  const go = (n) => {
    const next = Math.max(0, Math.min(n, slides.length - 1));
    setIdx(next);
    setChosen(null);
    if (next + 1 > seen) { setSeen(next + 1); setJSON("ucat:sjtlearn", next + 1); }
  };

  return (
    <div className="ud-lesson">
      <div className="ud-dots" aria-hidden="true">
        {slides.map((_, n) => <i key={n} className={n < idx ? "done" : n === idx ? "now" : ""} />)}
      </div>
      <p className="mod">Lesson {sl.mi + 1} of {SJT_LESSONS.length} · {sl.module} · {idx + 1}/{slides.length}</p>

      {sl.t === "info" && (
        <>
          <h3>{sl.h}</h3>
          <p className="body">{sl.p}</p>
          {sl.stats && (
            <div className="ud-stats" style={{ marginBottom: 6 }}>
              {sl.stats.map(([b, l]) => (
                <div className="ud-stat" key={l}><b className="mono">{b}</b><span>{l}</span></div>
              ))}
            </div>
          )}
        </>
      )}

      {sl.t === "quiz" && (
        <>
          <p className="qtext">{sl.q}</p>
          {sl.opts.map((o, n) => {
            let cls = "ud-lopt";
            if (chosen !== null) {
              if (n === sl.a) cls += " right";
              else if (n === chosen) cls += " wrong";
            }
            return (
              <button key={n} className={cls} disabled={chosen !== null} onClick={() => setChosen(n)}>
                <b>{String.fromCharCode(65 + n)}</b>{o}
              </button>
            );
          })}
          {chosen !== null && (
            <p className="ud-lfeed">
              {chosen === sl.a ? "Right. " : "Not quite. "}{sl.why}
            </p>
          )}
        </>
      )}

      <div className="ud-lnav">
        <button className="ud-btn ghost" onClick={() => go(idx - 1)} disabled={idx === 0}>Previous</button>
        {!atEnd && (
          <button className="ud-btn" disabled={!answered} onClick={() => go(idx + 1)}>
            {answered ? "Next" : "Answer to continue"}
          </button>
        )}
        {atEnd && answered && (
          <button className="ud-btn" onClick={onDone}>Start the practice questions →</button>
        )}
      </div>
    </div>
  );
}

/* Marked practice built from the real SJT scenarios: appropriateness,
   importance and ranking, each graded with partial marks for a one-step
   miss (matching how the real section scores) and its own why and fix. */
function SjtPractice() {
  const buildSet = () => {
    const qs = [];
    SJT_SCENARIOS.forEach((s) => {
      if (s.ranking) qs.push({ sid: s.id, theme: s.theme, text: s.text, kind: "ranking", d: s.ranking });
      (s.items || []).forEach((it) => qs.push({ sid: s.id, theme: s.theme, text: s.text, kind: it.type, d: it }));
    });
    return shuffle(qs).slice(0, 10);
  };
  const [set, setSet] = useState(buildSet);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null); /* index for scale, array for ranking */
  const [rank, setRank] = useState([]);
  const [log, setLog] = useState([]); /* "full" | "part" | "miss" */
  const [done, setDone] = useState(false);

  const q = set[i];
  const isRank = q.kind === "ranking";
  const scale = q.kind === "importance" ? IMPORT : APPROP;
  const done1 = picked !== null;

  const answerScale = (p) => {
    if (done1) return;
    const dist = Math.abs(p - q.d.answer);
    setPicked(p);
    setLog([...log, dist === 0 ? "full" : dist === 1 ? "part" : "miss"]);
  };
  const chooseRank = (optIdx) => {
    if (done1 || rank.includes(optIdx)) return;
    const nextRank = [...rank, optIdx];
    setRank(nextRank);
    if (nextRank.length === q.d.options.length) {
      const matches = nextRank.filter((v, n) => v === q.d.order[n]).length;
      setPicked(nextRank);
      setLog([...log, matches === nextRank.length ? "full" : matches >= 1 ? "part" : "miss"]);
    }
  };
  const advance = () => {
    if (i + 1 >= set.length) { setDone(true); window.scrollTo(0, 0); return; }
    setI(i + 1); setPicked(null); setRank([]); window.scrollTo(0, 0);
  };
  const restart = () => { setSet(buildSet()); setI(0); setPicked(null); setRank([]); setLog([]); setDone(false); window.scrollTo(0, 0); };

  if (done) {
    const full = log.filter((x) => x === "full").length;
    const part = log.filter((x) => x === "part").length;
    const miss = log.filter((x) => x === "miss").length;
    const score = full * 2 + part;
    const outOf = set.length * 2;
    const pct = Math.round((score / outOf) * 100);
    const line = pct >= 85 ? "Panel-level judgement. This is a strong Band 1 habit."
      : pct >= 65 ? "Solid. You are landing in the right half almost every time; tighten the one-step misses."
      : "Work the framework: decide the half first, judge each option alone, put patient safety and honesty above everything.";
    return (
      <div className="sjt-summary">
        <div className="ss-score"><b className="mono">{score}<em>/{outOf}</em></b><span>across {set.length} questions</span></div>
        <div className="ss-break">
          <div><b className="mono" style={{ color: "var(--go)" }}>{full}</b><span>spot on</span></div>
          <div><b className="mono" style={{ color: "var(--signal)" }}>{part}</b><span>one step off</span></div>
          <div><b className="mono" style={{ color: "var(--stop)" }}>{miss}</b><span>wrong half</span></div>
        </div>
        <p className="ss-line">{line}</p>
        <div className="ud-lnav" style={{ justifyContent: "center" }}>
          <button className="ud-btn" onClick={restart}>Practise another set</button>
        </div>
      </div>
    );
  }

  const scoreSoFar = log.reduce((a, x) => a + (x === "full" ? 2 : x === "part" ? 1 : 0), 0);

  return (
    <div className="sjt-practice">
      <div className="sjt-phead">
        <span className="sjt-dots" aria-hidden="true">{set.map((_, n) => <i key={n} className={n < i ? "done" : n === i ? "now" : ""} />)}</span>
        <span className="sjt-prog mono">Q {i + 1} / {set.length} · {scoreSoFar} pts</span>
      </div>

      <div className="sjt-scn">
        <span className="sjt-kind">{isRank ? "Ranking" : q.kind === "importance" ? "Importance" : "Appropriateness"}</span>
        <p>{q.text}</p>
      </div>

      {!isRank && (
        <>
          <p className="sjt-stem">{q.kind === "importance" ? "How important is this consideration?" : "How appropriate is this response?"}</p>
          <p className="sjt-action">{q.d.stem}</p>
          {scale.map((label, n) => {
            let cls = "ud-lopt";
            if (done1) { if (n === q.d.answer) cls += " right"; else if (n === picked) cls += " wrong"; }
            return (
              <button key={n} className={cls} disabled={done1} onClick={() => answerScale(n)}>
                <b>{String.fromCharCode(65 + n)}</b>{label}
              </button>
            );
          })}
        </>
      )}

      {isRank && (
        <>
          <p className="sjt-stem">{q.d.stem}</p>
          {q.d.options.map((o, n) => {
            const chosenPos = rank.indexOf(n);
            const correctPos = q.d.order.indexOf(n);
            let cls = "ud-lopt sjt-rankopt";
            if (done1) cls += chosenPos === correctPos ? " right" : " wrong";
            else if (chosenPos >= 0) cls += " picked";
            return (
              <button key={n} className={cls} disabled={done1} onClick={() => chooseRank(n)}>
                <b>{chosenPos >= 0 ? chosenPos + 1 : "·"}</b>
                <span className="sjt-rankt">{o}</span>
                {done1 && <span className="sjt-rankright mono">#{correctPos + 1}</span>}
              </button>
            );
          })}
          {!done1 && <p className="sjt-hint">Tap them in order, most appropriate first.</p>}
        </>
      )}

      {done1 && (
        <>
          <p className="ud-lfeed">
            <b>{log[log.length - 1] === "full" ? "Spot on. " : log[log.length - 1] === "part" ? "One step off, still the right half. " : "Wrong half. "}</b>
            {isRank ? q.d.why : q.d.why}
          </p>
          {(isRank ? q.d.fix : q.d.fix) && <p className="sjt-fix"><b>Remember:</b> {isRank ? q.d.fix : q.d.fix}</p>}
          <div className="ud-lnav" style={{ justifyContent: "flex-end" }}>
            <button className="ud-btn" onClick={advance}>{i + 1 >= set.length ? "See your result" : "Next question"}</button>
          </div>
        </>
      )}
    </div>
  );
}

/* The two-mode SJT trainer body: interactive lessons and marked practice.
   Header and back button are supplied by whichever screen embeds it. */
function SjtTrainer() {
  const [tab, setTab] = useState("lessons");
  return (
    <>
      <div className="ud-mode" style={{ paddingTop: 8, marginBottom: 4 }}>
        <span>Mode</span>
        <button className={tab === "lessons" ? "on" : ""} onClick={() => setTab("lessons")}>Lessons</button>
        <button className={tab === "practice" ? "on" : ""} onClick={() => setTab("practice")}>Practice questions</button>
      </div>
      {tab === "lessons"
        ? <SjtLessons onDone={() => { setTab("practice"); window.scrollTo(0, 0); }} />
        : <SjtPractice />}
    </>
  );
}


/* ------------------------------ INTERVIEW BANK -------------------- */
/* All guidance original, grounded in how MMIs and panels are marked. */

const IV_DELIVERY = [
  { h: "Structure out loud", p: "Interviewers mark what they can follow. Signpost: 'Three things drew me to this: first...'. A slightly slower, structured answer beats a fast ramble every time, because the marker can tick what they hear." },
  { h: "Reflect, don't list", p: "Nobody is impressed that you shadowed a dentist. They are impressed by what you noticed: how the dentist calmed an anxious patient, what that taught you about communication, and what you did with that lesson afterwards. One reflected experience beats five listed ones." },
  { h: "Use STARR for anything behavioural", p: "Situation, Task, Action, Result, Reflection. The last R is where the marks live and where most candidates stop. Always finish with what you would do differently or what it changed in you." },
  { h: "It is a conversation, not a recital", p: "Memorised answers are obvious within one follow-up question. Prepare bullet points and stories, never scripts. Pause before answering; two seconds of thought reads as composure, not weakness." },
  { h: "The basics carry marks", p: "Sit up, smile when you greet, look at the camera or the person, and thank them at the end. Stations are short; first impressions are a real fraction of the score whether anyone admits it or not." },
];


/* ------------------------------ UNI DATA -------------------------- */
/* Figures compiled from the applicant's 2025-cycle research notes.   */
/* Facts only, reworded; always confirm on official pages before      */
/* submitting UCAS choices. UCAT scale: 900-2700 plus SJT band.       */

/* When each admissions dataset was last checked against official
   sources. These figures go stale every cycle, so update the relevant
   entry whenever you reconfirm a dataset and the UI updates with it. */



/* ------------------------------ INTERNATIONAL --------------------- */
/* Figures verified against 2026 published sources. Fees rise yearly  */
/* and vary by school and by clinical year, so every number is shown  */
/* as a range and flagged for confirmation.                           */


const UCAT_FACTS = [
  { k: "Structure since 2025", v: "Three cognitive subtests plus the SJT. Abstract Reasoning was removed, so anything referencing five sections is out of date." },
  { k: "Cognitive scoring", v: "Each of Verbal Reasoning, Decision Making and Quantitative Reasoning is scaled 300 to 900, giving a total of 900 to 2700, down from the old 3600." },
  { k: "Situational Judgement", v: "Reported separately as Band 1 to Band 4, with Band 1 the highest. It is not part of the cognitive total." },
  { k: "Verbal Reasoning", v: "44 questions in 22 minutes, which is about 30 seconds each. Eleven passage sets of four." },
  { k: "Decision Making", v: "35 questions in 37 minutes, both increased when Abstract Reasoning was dropped." },
  { k: "Quantitative Reasoning", v: "36 questions in 26 minutes, up from 24 minutes." },
  { k: "UCAT ANZ window", v: "Testing runs 1 July to 5 August 2026 for 2027 entry, with booking from 3 March 2026." },
  { k: "Score validity", v: "Scores last one admissions cycle only and never carry forward. You sit it in the same calendar year you apply." },
  { k: "ANZ eligibility", v: "Open to students in, or who have recently completed, the final year of secondary school. Australian Year 11 students are not eligible, even when taking Year 12 subjects early." },
];


/* Automated-marking notice. The marking is fixed rules, not AI, and
   nothing the user writes leaves their device. Shown at every surface
   that marks writing. */

/* Short independence and not-advice disclaimer, for the interview and
   university sections and the home footer. */

function IntlPanel({ region }) {
  const d = INTL[region];
  return (
    <div className="intl-box">
      <p className="ih">International student costs · {d.label}</p>
      <div className="intl-grid">
        <div><b>Typical range</b><p>{d.range}</p></div>
        <div><b>Whole degree</b><p>{d.total}</p></div>
        <div><b>Cheaper end</b><p>{d.cheap}</p></div>
        <div><b>Most expensive</b><p>{d.dear}</p></div>
        <div><b>Home and domestic</b><p>{d.home}</p></div>
      </div>
      <ul className="intl-notes">{d.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      <p className="intl-warn">
        Fees rise every year, differ between pre-clinical and clinical years, and change with visa and levy rules. Treat these
        as planning ranges and confirm the exact figure on the university's own fees page before committing to anything.
      </p>
      <LastChecked when={DATA_CHECKED.fees} />
    </div>
  );
}

/* ------------------------------ AUSTRALIA (ANZ) ------------------- */
/* Compiled from the applicant's 2025 research notes on direct entry  */
/* Australian programmes. ATARs and weightings shift every cycle, so  */
/* every figure is shown as approximate and must be confirmed.        */




function assessAu(u, atar, ucatPct) {
  const gap = atar - u.atar;
  const reasons = [];
  let status;
  if (gap >= 1.5) { status = "strong"; reasons.push(`Your ATAR clears the ${u.atar.toFixed(2)} baseline comfortably.`); }
  else if (gap >= 0) { status = "range"; reasons.push(`You sit just above the ${u.atar.toFixed(2)} baseline, so there is little slack.`); }
  else if (gap >= -1.5) { status = "aspire"; reasons.push(`You are ${Math.abs(gap).toFixed(2)} below the ${u.atar.toFixed(2)} baseline. Cut-offs move, so this is a legitimate reach.`); }
  else { status = "out"; reasons.push(`The ${u.atar.toFixed(2)} baseline is ${Math.abs(gap).toFixed(2)} above your rank, which is beyond reach this cycle.`); }

  if (u.ucat === "none") reasons.push("No UCAT required, so your test score is irrelevant here and your ATAR carries everything.");
  else if (u.ucat === "high") {
    if (ucatPct >= 90) reasons.push("UCAT is heavily weighted and yours is in the range this school wants.");
    else if (ucatPct >= 80) reasons.push("UCAT is heavily weighted and yours sits below the usual competitive band, which will hurt here.");
    else { reasons.push("UCAT is heavily weighted and yours is well below the competitive band, so this is a poor use of a preference."); if (status === "strong" || status === "range") status = "aspire"; }
  } else {
    reasons.push("UCAT carries only a small weighting here, which suits applicants whose academic record is stronger than their test.");
    if (ucatPct < 80 && status === "aspire") status = "range";
  }
  return { status, label: status === "strong" ? "Strong fit" : status === "range" ? "In range" : status === "aspire" ? "Aspirational" : "Out of reach", reasons };
}

const PRED_RANK = { "A*AA": 3, "AAA": 2, "AAB": 1, "Other": 0 };

const PRED_ORDER = { "A*AA": 3, "AAA": 2, "AAB": 1, "Other": 0 };
const MED_PRED_LABEL = { notused: "not used in selection at all", threshold: "used as a threshold only, not scored", scored: "scored as part of the ranking", achieved: "only achieved grades count, not predicted" };

function assessMed(u, f) {
  const reasons = [];
  if (u.sjt === "reject" && f.band === 4) {
    return { status: "block", label: "Blocked", reasons: ["Automatically rejects SJT Band 4, so this one is off the table this cycle whatever your score."] };
  }
  if (u.pred === "notused") {
    reasons.push("Predicted A-levels are not used in selection here, so a lower prediction does not shut the door.");
  } else if (u.alevel && PRED_ORDER[f.pred] < (PRED_ORDER[u.alevel] || 0)) {
    reasons.push(`Wants ${u.alevel} predicted, and yours is below, which matters because predicted grades are ${u.pred === "scored" ? "scored" : "a threshold"} here.`);
  }
  const high79 = (f.g9 || 0) + (f.g8 || 0) + (f.g7 || 0);
  if (u.gcse === "scored" && high79 < 6) reasons.push("GCSEs are scored here and yours are on the light side, which costs academic points.");

  let status;
  if (/not used/.test(u.ucatW)) {
    status = "range";
    reasons.push("UCAT is not used, so your score neither helps nor hurts; selection runs on academics and assessments.");
  } else if (u.floor && f.ucat < u.floor) {
    status = "out";
    reasons.unshift(`Below the published minimum of ${u.floor}, so it is rejected before ranking.`);
  } else if (u.low == null) {
    status = "range";
    reasons.push("No published UCAT figure to compare against; the school ranks by score, so aim high and treat this as a maybe.");
  } else {
    const diff = f.ucat - u.low;
    if (diff >= 150) { status = "strong"; reasons.unshift(`Your UCAT is about ${diff} above the ~${u.low} realistic bar, comfortably in range.`); }
    else if (diff >= 0) { status = "range"; reasons.unshift(`About ${diff} above the ~${u.low} realistic bar: in the running, without much slack.`); }
    else if (diff >= -120) { status = "aspire"; reasons.unshift(`About ${Math.abs(diff)} below the ~${u.low} realistic bar. Bars move each year, so this is a legitimate aspirational pick, one at most.`); }
    else { status = "out"; reasons.unshift(`About ${Math.abs(diff)} below the ~${u.low} realistic bar, beyond sensible aspirational range.`); }
  }
  if (u.pred === "threshold" && u.alevel && PRED_ORDER[f.pred] < (PRED_ORDER[u.alevel] || 0) && (status === "strong" || status === "range")) status = "aspire";

  const label = { strong: "Strong fit", range: "In range", aspire: "Aspirational", out: "Out of range", block: "Blocked" }[status];
  return { status, label, reasons };
}

function assessUni(u, f) {
  let cut = f.scottish && u.cutScot ? u.cutScot : u.cut;
  if (f.ctx && u.cutCtx) cut = u.cutCtx;
  const diff = f.ucat - cut;
  const reasons = [];
  let status;
  if (u.band4 === "reject" && f.band === 4) {
    return { status: "block", label: "Blocked", reasons: ["Automatically rejects SJT Band 4, so this one is off the table this cycle regardless of score."] };
  }
  const predNeeded = f.ctx && u.pred === "A*AA" ? "AAA" : u.pred;
  if (predNeeded && PRED_RANK[f.pred] < PRED_RANK[predNeeded]) {
    reasons.push(`Expects ${predNeeded} predicted${f.ctx ? " even contextually" : ""}; yours is below, which makes an interview unlikely here.`);
    status = "out";
  }
  let gcseOk = true;
  const nines = f.g9, high = f.g9 + f.g8;
  if (u.gcse.style === "nines" && nines < 8) { gcseOk = false; reasons.push("Scoring leans almost entirely on grade 9s, and your profile gives away too many points here."); }
  if (u.gcse.style === "topSeven" && high < 7) { gcseOk = false; reasons.push("Needs seven grades at 8 or 9 for full GCSE points; below that the UCAT rarely gets seen."); }
  if (u.gcse.style === "eights" && high < 8) { reasons.push("Competitive profiles carry eight grades at 8 or 9; fewer is possible but weakens you in the academic scoring."); }
  if (u.gcse.style === "seven7" && f.g9 + f.g8 + f.g7 < 7) { gcseOk = false; reasons.push("Requires seven GCSEs at grade 7 or above as a hard floor."); }
  if ((u.gcse.style === "six7" || u.gcse.style === "minset") && f.g9 + f.g8 + f.g7 < 6) { gcseOk = false; reasons.push("Falls short of the six-subjects-at-grade-7 floor."); }
  if (f.maths < 6 || f.eng < 6) {
    if (!["low", "minset"].includes(u.gcse.style)) reasons.push("Check Maths and English minimums carefully; several schools want 6s and yours sit below.");
  }

  if (status !== "out") {
    if (!gcseOk && u.gcse.style !== "eights") status = "out";
    else if (diff >= 30) status = "strong";
    else if (diff >= 0) status = "range";
    else if (diff >= -20) status = "aspire";
    else status = "out";
  }

  if (status === "strong") reasons.unshift(`Your UCAT clears the ${cut} threshold by ${diff} points, comfortably inside the shortlist zone.`);
  if (status === "range") reasons.unshift(`You sit ${diff} points above the ${cut} threshold: in the running, without much slack.`);
  if (status === "aspire") reasons.unshift(`You are ${Math.abs(diff)} below the ${cut} threshold. Thresholds move year to year, so within 20 counts as a legitimate aspirational pick, one at most.`);
  if (status === "out" && diff < -20) reasons.unshift(`The ${cut} threshold is ${Math.abs(diff)} points above your score, which is beyond sensible aspirational range.`);
  if (u.band4 === true && f.band === 4) reasons.push("Accepts Band 4, which makes it disproportionately valuable to you this cycle.");
  if (f.ctx) {
    if (u.cutCtx) reasons.push(`Contextual threshold of ${u.cutCtx} applied.`);
    else if (u.ctxFriendly) reasons.push("Notably contextual-friendly: expect a lower effective threshold and a reduced offer, typically around one grade.");
    else reasons.push("As a contextual applicant, most schools weight thresholds lower and reduce offers by about a grade; confirm this school's scheme.");
  }
  if (!u.pred) {
    reasons.push("Predicted grades are not scored here, so a lower prediction does not hold you back.");
  }
  return { status, label: status === "strong" ? "Strong fit" : status === "range" ? "In range" : status === "aspire" ? "Aspirational" : "Out of reach", reasons };
}

/* ---- Medicine: interview formats and tailored practice ----
   Formats and reported emphases are public information and stable year to
   year; thresholds are not included here because they move constantly.
   These are NOT real interview questions.                              ---- */



/* ---- Sentence level analysis: green, amber, red on the user's own text ---- */



/* ------------------------------ INTERVIEW VIEW -------------------- */

/* A school's interview fact sheet, format and tailored questions. onGo, when
   given, adds a Go button that launches that single question full screen. */
function UniFactSheet({ d, uni, onGo }) {
  const initials = uni ? uni.name.replace("University of ", "").replace("Queen's University ", "").replace("Queen Mary University of London", "QM").replace("King's College London", "KC").replace("University College London", "UC").replace("Imperial College London", "IC").slice(0, 2).toUpperCase() : "";
  return (
    <div className="iv-unibox">
      <div className="uf-head">
        {uni ? <span className="uni-mono" style={{ background: uni.col + "22", color: uni.col, borderColor: uni.col }}>{initials}</span> : null}
        <div>
          <h3>{uni ? uni.name : "Generic practice"}</h3>
          <span className={`uf-style ${d.style}`}>{d.style === "mmi" ? "MMI circuit" : d.style === "panel" ? "Panel interview" : "Both formats"}</span>
        </div>
      </div>

      <div className="uf-grid">
        <div><b>Format</b><p>{d.fmt}</p></div>
        <div><b>The course</b><p>{d.course}</p></div>
        {(d.hosp || (uni && uni.hosp)) && <div><b>Where you train</b><p>{d.hosp || `${uni.hosp} ${uni.plc}`}</p></div>}
        <div><b>The place</b><p>{d.scene}</p></div>
        <div><b>Student life</b><ul>{d.socs.map((x) => <li key={x}>{x}</li>)}</ul></div>
        {uni && uni.rent && <div><b>Costs</b><p>Rent roughly £{uni.rent[0]} to £{uni.rent[1]} a month. International fees {uni.intl}. Post-interview offer rate {uni.pi}%.</p></div>}
      </div>

      <p className="fmt" style={{ marginTop: 14 }}><b>What they weight</b></p>
      <div className="chips">{d.focus.map((f) => <span key={f}>{f}</span>)}</div>

      <p className="fmt" style={{ marginTop: 16 }}><b>Tailored questions</b></p>
      {d.qs.map((q, n) => (
        <div className="iv-uniq" key={n}>
          <span>{q}</span>
          {onGo && <button className="ud-btn iv-goq" onClick={() => onGo(q, "Tailored")}>Go</button>}
        </div>
      ))}

      <p className="fmt" style={{ marginTop: 16, color: "var(--stop)" }}><b>Curveballs</b></p>
      <p className="fmt" style={{ color: "var(--mute)", marginTop: -4 }}>
        {d.style === "mmi" ? "MMI stations throw these to see how you think when you have nowhere to hide. Twenty seconds of visible thinking beats a fast non-answer."
          : d.style === "panel" ? "Panels use these as follow-ups once you are comfortable. They are testing whether your earlier answers were memorised."
          : "Every format uses these. There is no right answer, only whether you stay composed and reason out loud."}
      </p>
      {d.curve.map((q, n) => (
        <div className="iv-uniq curve" key={n}>
          <span>{q}</span>
          {onGo && <button className="ud-btn iv-goq" onClick={() => onGo(q, "Curveball")}>Go</button>}
        </div>
      ))}
    </div>
  );
}

function WritingPractice({ themes, track, uniSel, setUniSel, jump, clearJump }) {
  const IVTABLE = track === "med" ? MED_IV : UNI_IV;
  const IVLIST = track === "med" ? MED_UNIS : UNIS.filter((u) => UNI_IV[u.id]);
  const general = [];
  themes.forEach((th) => th.qs.forEach((q) => { if (!q.t || q.t === track) general.push({ ...q, theme: th.name }); }));

  const src = uniSel === "generic" ? "general" : uniSel;
  const setSrc = (v) => setUniSel(v === "general" ? "generic" : v);
  const [qi, setQi] = useState(0);
  const boxRef = useRef(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [showSamples, setShowSamples] = useState(false);
  const [listening, setListening] = useState(false);
  const [tPhase, setTPhase] = useState("off");
  const [tLeft, setTLeft] = useState(0);
  const [lines, setLines] = useState(null);
  const [micState, setMicState] = useState("idle");
  const [audioUrl, setAudioUrl] = useState("");
  const recRef = useRef(null);
  const baseRef = useRef("");
  const interimRef = useRef("");
  const wantRef = useRef(false);
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const uniData = src !== "general" ? IVTABLE[src] : null;
  const pool = uniData
    ? [
        ...uniData.qs.map((q, n) => ({ q, theme: uniData.focus[n % uniData.focus.length], kindq: "Tailored",
          g: "Built around a theme this school is reported to weight. Give one specific example, keep the verbs first person, and land a reflection." })),
        { q: `Why this course at ${(IVLIST.find((u) => u.id === src) || {}).name || "this school"}?`, theme: "Motivation", kindq: "Course",
          g: "Use the course facts: teaching style, when clinical contact starts, and one distinctive feature. Then link one of them to how you personally learn. Research plus self-knowledge is the full-marks shape." },
        ...uniData.curve.map((q) => ({ q, theme: "Curveball", kindq: "Curveball",
          g: "There is no correct answer. Buy two seconds openly, pick an angle, give reasons out loud, and land somewhere. Composure and visible structure are what is being marked." })),
      ]
    : general;
  const cur = pool[Math.min(qi, pool.length - 1)];

  useEffect(() => { setQi(0); setText(""); setResult(null); setLines(null); }, [src]);

  useEffect(() => {
    if (!jump) return;
    const idx = pool.findIndex((x) => x.q === jump.q);
    if (idx >= 0) {
      setQi(idx); setText(""); setResult(null); setLines(null); setTPhase("off");
      if (boxRef.current) boxRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    clearJump();
  }, [jump && jump.n]);

  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setMicState("unsupported"); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-GB"; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      /* Commit finalised phrases to the buffer so nothing is lost as you
         keep talking; show any in-progress words on top of it. */
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) baseRef.current = (baseRef.current + " " + seg).replace(/\s+/g, " ").trim();
        else interim += seg;
      }
      interimRef.current = interim;
      setText((baseRef.current + (interim ? " " + interim : "")).replace(/\s+/g, " ").trim());
      setResult(null);
    };
    rec.onerror = (e) => {
      /* Only a genuine permission block should stop us. Silence, brief
         network drops and "aborted" are normal; onend then restarts. */
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false; setMicState("denied"); setListening(false);
      }
    };
    rec.onend = () => {
      /* Commit any in-progress words before restarting so a mid-sentence
         cut is not lost, then restart at once to minimise the audio gap. */
      if (interimRef.current) { baseRef.current = (baseRef.current + " " + interimRef.current).replace(/\s+/g, " ").trim(); interimRef.current = ""; setText(baseRef.current); }
      if (wantRef.current) { try { rec.start(); } catch (err) { setTimeout(() => { if (wantRef.current) { try { rec.start(); } catch (e2) { /* give up quietly */ } } }, 120); } }
      else setListening(false);
    };
    recRef.current = rec;
    return () => { wantRef.current = false; try { rec.stop(); } catch (err) { /* already stopped */ } };
  }, []);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const stopAudio = () => {
    try { if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop(); } catch (e) { /* ignore */ }
    try { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ }
  };

  const stopMic = () => {
    wantRef.current = false;
    const rec = recRef.current;
    if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } }
    stopAudio();
    setListening(false);
  };

  const toggleMic = async () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { stopMic(); return; }
    /* Record the raw audio in parallel so nothing said is ever missed. */
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(""); }
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mr = new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
        mr.onstop = () => { try { const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }); setAudioUrl(URL.createObjectURL(blob)); } catch (e) { /* ignore */ } };
        mr.start();
        mediaRef.current = mr;
      } catch (e) { setMicState("denied"); return; }
    }
    baseRef.current = text ? text.replace(/\s+/g, " ").trim() : "";
    interimRef.current = "";
    wantRef.current = true;
    try { rec.start(); setListening(true); setMicState("idle"); } catch (e) { /* already running */ setListening(true); }
  };

  const nextQ = () => { stopMic(); if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(""); } setQi((n) => (n + 1) % pool.length); setText(""); setResult(null); setLines(null); setTPhase("off"); };

  useEffect(() => {
    if (tPhase === "off" || tPhase === "done") return;
    if (tLeft <= 0) {
      if (tPhase === "think") { setTPhase("write"); setTLeft(45); }
      else setTPhase("done");
      return;
    }
    const t = setTimeout(() => setTLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [tPhase, tLeft]);

  const startTimed = () => { setText(""); setResult(null); setLines(null); setTPhase("think"); setTLeft(5); };
  const WRITE_SECS = 45;

  /* When the writing timer runs out, mark automatically so the score
     reveal animates in on its own, as in a real timed station. */
  useEffect(() => {
    if (tPhase === "done" && !result && text.trim().split(/\s+/).filter(Boolean).length >= 5) doMark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tPhase]);

  const doMark = () => {
    const wc = text.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 15) { setResult({ tooShort: true }); setLines(null); return; }
    const r = markAnswer(text);
    setResult(r);
    setLines(analyseAnswer(text));
    if (tPhase !== "off") setTPhase("done");
    /* Save to the progress report. */
    getJSON("ucat:ivmarks", []).then((arr) => {
      const list = Array.isArray(arr) ? arr : [];
      setJSON("ucat:ivmarks", [...list, { ts: Date.now(), out10: r.outOf10, band: r.band, track }].slice(-100));
    });
  };

  return (
    <div className="iv-practice" ref={boxRef} style={{ borderColor: "var(--line)" }}>
      <div className="wp-head">
        <label className="wp-src">Question source
          <select value={src} onChange={(e) => setSrc(e.target.value)}>
            <option value="general">General bank, all schools</option>
            <option disabled>Tailored, course and curveball questions:</option>
            {IVLIST.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select>
        </label>
        <span className="wp-count mono">{qi + 1} / {pool.length}</span>
      </div>

      {uniData && (
        <div className="iv-unibox">
          <p className="fmt"><b>Reported format.</b> {uniData.fmt}</p>
          <div className="chips">{uniData.focus.map((f) => <span key={f}>{f}</span>)}</div>
        </div>
      )}

      <span className="iv-phase" style={{ animation: "none" }}>
        {cur.kindq ? `${cur.kindq} · ` : ""}{cur.theme}
      </span>
      <p className={`qbig${tPhase === "off" ? " iv-blur" : ""}`} aria-hidden={tPhase === "off"}>{cur.q}</p>
      {tPhase === "off" && <p className="iv-revealnote">Press Go to reveal the question and start the station, just like the real thing.</p>}

      <div className="wp-timer">
        {tPhase === "off" ? (
          <button className="ud-btn" onClick={startTimed}>Go</button>
        ) : tPhase === "done" ? (
          <span className="tdone">Time up. Mark it and see where it lands.</span>
        ) : (
          <>
            <span className={`tclock mono ${tPhase}${tPhase === "write" && tLeft <= 15 ? " near" : ""}`}>
              {tPhase === "think" ? tLeft : `${Math.floor(tLeft / 60)}:${String(tLeft % 60).padStart(2, "0")}`}
            </span>
            <span className="tlab">{tPhase === "think" ? "think, do not type yet" : tLeft <= 15 ? "finish your last sentence" : "writing"}</span>
            <div className="tbarwrap"><i style={{ width: `${tPhase === "write" ? (tLeft / WRITE_SECS) * 100 : 100}%` }} className={tLeft <= 15 ? "near" : ""} /></div>
            <button className="ud-quit" onClick={() => setTPhase("off")}>cancel</button>
          </>
        )}
      </div>

      <div className="wp-scaffold">
        {STARR_STEPS.map(([h, d]) => (<div key={h}><b>{h}</b><span>{d}</span></div>))}
      </div>

      <div className="wp-tools">
        <button className={`wp-mic${listening ? " on" : ""}`} onClick={toggleMic} disabled={micState === "unsupported"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" strokeLinecap="round" />
          </svg>
          {listening ? "Listening, tap to stop" : micState === "unsupported" ? "Dictation not supported in this browser" : "Speak your answer"}
        </button>
        {listening && <span className="wp-live">recording</span>}
      </div>
      {listening && <p className="mmi-rechint">Recording the full audio and transcribing as you go. The transcript can miss the odd word, so glance over it; your recording below always has everything.</p>}
      {audioUrl && !listening && (
        <div className="mmi-playback" style={{ marginTop: 8 }}>
          <span className="k">Your recording, everything you said</span>
          <audio controls src={audioUrl} preload="metadata" />
        </div>
      )}
      {micState === "denied" && <p className="wp-note" style={{ color: "var(--stop)" }}>Microphone access was blocked. Allow it in your browser settings, or type the answer instead.</p>}

      <div className={`wp-boxwrap${tPhase === "write" && tLeft <= 30 ? " glow" : ""}`}>
      {tPhase === "think" && (
        <div className="wp-think"><b className="mono">{tLeft}</b><span>Think. Pick your example before you type.</span></div>
      )}
      <textarea className="ud-input wp-box" value={text} disabled={tPhase === "think"} onChange={(e) => { setText(e.target.value); setResult(null); setLines(null); }}
        placeholder="Speak it or type it. Say the answer exactly as you would in the room, because spelling and grammar are never marked here." />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button className="ud-btn" onClick={doMark}>Mark my answer</button>
        <button className="ud-btn ghost" onClick={nextQ}>Next question</button>
        <button className="ud-btn ghost" onClick={() => setShowSamples((o) => !o)}>{showSamples ? "Hide" : "See"} a strong vs weak answer</button>
      </div>
      <MarkingNotice />

      {result && result.tooShort && (
        <p className="wp-note" style={{ color: "var(--signal)", marginTop: 12 }}>
          Write a little more first, at least a couple of sentences (around 15 words), then tap Mark my answer.
        </p>
      )}
      {result && !result.tooShort && (
        <div className="wp-reveal">
          <button className="wp-close" onClick={() => { setResult(null); setLines(null); }} aria-label="Close feedback">✕</button>
          <div className="wp-revealgrid">
            <div className="wp-revealleft">
              {lines && lines.length > 0 ? (
                <div className="wp-hl">
                  <p className="hh">Your answer, marked line by line</p>
                  <div className="hkey">
                    <span className="green">strong</span><span className="amber">could be better</span><span className="red">weak</span>
                  </div>
                  {lines.map((l, n) => (
                    <div className={`hline ${l.v}`} key={n}>
                      <p className="txt">{l.sn}</p>
                      <p className="note">{l.n}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="wp-note">{text}</p>}
            </div>

            <div className="wp-revealright">
              <div className="wp-score10">
                <b className={result.band.toLowerCase()}>{result.outOf10}<em>/10</em></b>
                <span className="mono">{result.band}</span>
              </div>
              <div className="wp-range">
                <div><span>Best case</span><b className="mono">{result.best10}/10</b></div>
                <div><span>Worst case</span><b className="mono">{result.worst10}/10</b></div>
              </div>
              <p className="wp-casetext"><b>Best case.</b> {result.bestCase}</p>
              <p className="wp-casetext"><b>Worst case.</b> {result.worstCase}</p>
              {result.crits.map((c) => (
                <div className="wp-crit" key={c.name}>
                  <span className={`dot s${c.score}`} />
                  <div>
                    <b>{c.name} · {c.score}/2</b>
                    <p>{c.score === 2 ? c.good : c.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="wp-model">
            <p className="hh">A better response would run like this</p>
            <ol>{(MODEL_SKELETON[cur.theme] || MODEL_SKELETON.default).map((x, n) => <li key={n}>{x}</li>)}</ol>
            <p className="mn"><b>For this question specifically:</b> {cur.g}</p>
          </div>
          <MarkingNotice />
        </div>
      )}

      {showSamples && (
        <div className="wp-samples">
          <div><b style={{ color: "var(--go)" }}>Strong</b><p>{IV_SAMPLES.strong}</p></div>
          <div><b style={{ color: "var(--stop)" }}>Weak</b><p>{IV_SAMPLES.weak}</p></div>
          <p className="wp-note">{IV_SAMPLES.why}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ INTERVIEW VIEW -------------------- */

/* Original MMI station templates. UK medicine and dentistry interviews are
   circuits of short stations, so this rehearses the real format: a mix of
   station types, each with its own framework and what a strong answer
   covers. Prompts are written from scratch around published themes, never
   real questions. field/pro adapt the wording to the chosen track. */
function mmiStations(track) {
  const field = track === "med" ? "medicine" : "dentistry";
  return [
    {
      id: "motivation", type: "Motivation", label: `Why ${field}?`,
      prompt: `Why do you want to study ${field}, and how have you tested that it is right for you?`,
      framework: [["Honest reason", "One real reason, not a slogan. Where did it actually start?"], ["Evidence", "What you saw or did that tested it: work experience, volunteering, wider reading."], ["Realism", "One hard or unglamorous part of the job you have understood."], ["Reflection", "What it confirmed or changed, in your own words."]],
      covers: [
        ["A specific moment, not a childhood story", /\b(work experience|placement|volunteer(ed|ing)?|shadow(ed|ing)?|hospital|clinic|ward|care home|hospice|saw|witnessed|watched|when i|one (patient|day))\b/i],
        ["Real evidence you explored it", /\b(work experience|volunteer|shadow|placement|read(ing)?|research|spoke to|talked to|conversation with|first[- ]?hand|observed)\b/i],
        ["Awareness of the difficult side", /\b(hard|difficult|challeng|long hours|emotional|stress|pressure|burn ?out|not glamorous|unglamorous|tough|demanding|sacrifice|toll|deal(ing)? with death|bad news)\b/i],
        ["Why you still chose it despite that", /\b(despite|even though|but still|nonetheless|what draws me|what appeals|the reason i|for me,|still chose|still want)\b/i],
      ],
      guide: `Open with the specific moment that started it, show the work experience or reading that tested it, name one hard reality of being a ${track === "med" ? "doctor" : "dentist"}, and finish on why you still chose it. Avoid "I want to help people" without a scene behind it.`,
    },
    {
      id: "ethics", type: "Ethics", label: "An ethical dilemma",
      prompt: `A close friend on your course tells you, in confidence, that they have been drinking heavily before placement shifts. They beg you not to say anything. What do you do, and why?`,
      framework: [["Autonomy", "Your friend's right to make their own choices."], ["Beneficence", "Acting in the interests of patients and of your friend."], ["Non-maleficence", "The harm risked if impaired care reaches a patient."], ["Justice", "Fairness, professional duty and the wider public."]],
      covers: [
        ["Names the principles in tension", /\b(autonomy|beneficence|non-?maleficence|confidential|justice|duty of care|four pillars|principle|ethic)\b/i],
        ["Puts patient safety first", /\b(patient safety|patients?|harm|risk|safe|unsafe|impair|danger|fitness to practise)\b/i],
        ["Compassion for the friend, not just rules", /\b(support|help (them|him|her)|wellbeing|talk to (them|him|her)|without judg|non-?judg|encourage (them|him|her)|struggling|check (in )?on|underlying|why they)\b/i],
        ["Reaches a clear, professional action", /\b(i would|i'd|i will|speak to|report|escalate|encourage (them|him|her) to|advise|raise (it|this|concern)|seek help|occupational health|supervisor|tutor|welfare)\b/i],
      ],
      note: "Weigh the four pillars, then decide. Consent, capacity and confidentiality often sit underneath them.",
      guide: "Name the clash (confidentiality and your friend's autonomy against patient safety), gather what you would need to know, act with patient safety leading, but do it compassionately: support your friend to disclose or seek help rather than simply reporting them.",
    },
    {
      id: "roleplay", type: "Role play", label: "A difficult conversation",
      prompt: `A team-mate has been missing group deadlines and the rest of the group is angry. You have been asked to speak to them. Talk through how you would open and handle that conversation.`,
      framework: [["Acknowledge", "Open calmly and without accusation."], ["Explore", "Ask open questions; there may be something going on."], ["Empathise", "Show you have heard them before problem-solving."], ["Plan", "Agree a concrete next step together."]],
      covers: [
        ["Opens without blame", /\b(calm|without blame|not accus|non-?confrontational|start by|open by|privately|one to one|how are you|check (in|how))\b/i],
        ["Listens before fixing", /\b(listen|ask|open question|understand|explore|why|find out|their side|hear (them|their)|what's going on|is everything)\b/i],
        ["Genuine empathy", /\b(empath|acknowledge|i understand|that must|i can see|feel|reassure|support|no judg)\b/i],
        ["Agrees a shared, specific plan", /\b(plan|agree|together|next step|going forward|check back|follow up|solution|share the|redistribute|catch up)\b/i],
      ],
      guide: "Open privately and without blame, ask what is going on before assuming, show you have heard them, then agree a concrete shared plan. The mark is in exploring before fixing.",
    },
    {
      id: "prioritise", type: "Prioritisation", label: "Competing demands",
      prompt: `You are on a busy ward round as a student. Three things happen at once: a nurse asks for urgent help, your supervisor wants you to present, and a visitor looks lost and upset. How do you prioritise, and why?`,
      framework: [["Safety first", "What carries the greatest risk if it waits?"], ["Gather", "Quickly clarify what each actually needs."], ["Delegate / escalate", "You do not have to do everything yourself."], ["Communicate", "Tell people what you are doing and when."]],
      covers: [
        ["A clear, safety-led order", /\b(safety|safe|first|priorit|most urgent|urgent|risk|life-threatening|greatest (risk|harm|need)|clinical)\b/i],
        ["Knows your limits as a student", /\b(student|within my|my role|not my place|beyond my|competence|qualified|i am not|i'm not|remit)\b/i],
        ["Escalates or delegates", /\b(escalate|senior|supervisor|nurse|ask for help|inform|tell (the|my)|delegate|hand over|get help)\b/i],
        ["Keeps everyone informed", /\b(let (them|him|her) know|communicat|explain|tell them|inform|update|apolog|reassure|come back|be with you)\b/i],
      ],
      guide: "Lead with the greatest clinical risk (the nurse's urgent request), recognise a student's limits and escalate rather than acting beyond competence, and keep the others informed with a quick word so nobody is ignored.",
    },
    {
      id: "reflection", type: "Reflection", label: "A time you failed",
      prompt: `Describe a time you failed at something that mattered to you. What did you do, and what did it teach you?`,
      framework: [["Situation", "One sentence of context, no more."], ["Task", "What was at stake and why it was hard."], ["Action", "What you did, in the first person."], ["Result and reflection", "The outcome, and what you genuinely changed since. The marks live here."]],
      covers: [
        ["A real failure, owned not deflected", /\b(i failed|my (mistake|fault|error)|i (did not|didn't|should have|could have)|i got (it )?wrong|i underestimated|i let|i struggled|i missed)\b/i],
        ["First-person actions", /\bi (did|took|decided|spoke|asked|changed|worked|practi[sc]ed|tried|rebuilt|organis|planned|approached|reached out)\b/i],
        ["An honest outcome", /\b(result|outcome|in the end|eventually|passed|failed|improved|the grade|the score|we (won|lost)|did not|still|better)\b/i],
        ["A lesson you have since applied", /\b(learn|taught me|since then|now i|next time|i would|applied|used (this|that|it)|changed how|these days|ever since)\b/i],
      ],
      guide: "Pick a real failure and own it in one line, describe what you did in the first person, give the honest outcome, then land on the specific lesson and where you have used it since. The reflection is where the marks live.",
    },
  ];
}

/* Station-aware marking: the general marker for structure and reflection,
   blended with how many of THIS station's key points the answer actually
   hit. That coverage is the "focus on their answer" part, and it drives the
   ticked checklist. */
function scoreStation(text, station) {
  const base = markAnswer(text); /* kept for structure/reflection notes, not the score */
  const met = (station.covers || []).map(([label, re]) => ({ label, met: re.test(text) }));
  const covered = met.filter((m) => m.met).length;
  const cov = met.length ? covered / met.length : 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  /* Coverage of this station's key points drives the score. A modest quality
     bump for adequate length and clear structure, and a bite for the tired
     clichés. The general marker's harsh anecdote/number penalties are not
     applied here, since ethics and role-play answers are not anecdotes. */
  let quality = 0;
  if (words >= 45) quality += 12; else if (words >= 25) quality += 6;
  const structure = base.crits.find((c) => c.name === "Structure");
  quality += structure ? structure.score * 5 : 0;
  const cliches = (text.match(/\b(i want to help people|help people|make a difference|always wanted|from a young age)\b/i) || []).length;
  quality -= cliches * 8;
  const scorePct = Math.max(0, Math.min(100, Math.round(cov * 70 + quality)));
  const out10 = Math.max(1, Math.min(10, Math.round(scorePct / 10)));
  const band = scorePct >= 80 ? "Excellent" : scorePct >= 62 ? "Strong" : scorePct >= 40 ? "Medium" : "Weak";
  return { base, met, covered, total: met.length, out10, band, blended: scorePct };
}

/* One collapsible MMI station: framework, an answer you type or speak,
   content marking and, when spoken, delivery analysis. */
function MmiStation({ st, open, onToggle, track }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [listening, setListening] = useState(false);
  const [micState, setMicState] = useState("idle");
  const [audioUrl, setAudioUrl] = useState("");
  const recRef = useRef(null);
  const baseRef = useRef("");
  const interimRef = useRef("");
  const wantRef = useRef(false);
  const startRef = useRef(0);
  const secsRef = useRef(0);
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  /* Speech recognition gives the transcript for marking. It is a recogniser,
     not a tape: it stops on pauses and drops audio on each restart. So we
     also record the raw audio in parallel, which captures everything spoken,
     stutters and all, for playback. The transcript is kept robust by
     committing any in-progress words before every restart and restarting
     immediately, and by never stopping on silence or transient errors. */
  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setMicState("unsupported"); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-GB"; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) baseRef.current = (baseRef.current + " " + seg).replace(/\s+/g, " ").trim();
        else interim += seg;
      }
      interimRef.current = interim;
      setText((baseRef.current + (interim ? " " + interim : "")).replace(/\s+/g, " ").trim());
    };
    rec.onerror = (e) => {
      /* Only a genuine permission block stops us. Silence, "aborted",
         "network" and the like are normal; onend restarts through them. */
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { wantRef.current = false; setMicState("denied"); setListening(false); }
    };
    rec.onend = () => {
      /* Commit any dangling in-progress words so a mid-sentence cut off is
         not lost, then restart at once to minimise the audio gap. */
      if (interimRef.current) { baseRef.current = (baseRef.current + " " + interimRef.current).replace(/\s+/g, " ").trim(); interimRef.current = ""; setText(baseRef.current); }
      if (wantRef.current) { try { rec.start(); } catch (err) { setTimeout(() => { if (wantRef.current) { try { rec.start(); } catch (e2) { /* give up quietly */ } } }, 120); } }
      else setListening(false);
    };
    recRef.current = rec;
    return () => { wantRef.current = false; try { rec.stop(); } catch (err) { /* ignore */ } };
  }, []);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const stopAudio = () => {
    try { if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop(); } catch (e) { /* ignore */ }
    try { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ }
  };

  const toggleMic = async () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      wantRef.current = false;
      try { rec.stop(); } catch (e) { /* ignore */ }
      stopAudio();
      secsRef.current += (Date.now() - startRef.current) / 1000;
      setListening(false);
      return;
    }
    /* Start the raw audio recorder first, so nothing said is ever missed. */
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(""); }
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mr = new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
        mr.onstop = () => { try { const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }); setAudioUrl(URL.createObjectURL(blob)); } catch (e) { /* ignore */ } };
        mr.start();
        mediaRef.current = mr;
      } catch (e) { setMicState("denied"); return; }
    }
    baseRef.current = text ? text.replace(/\s+/g, " ").trim() : "";
    interimRef.current = "";
    wantRef.current = true; startRef.current = Date.now();
    try { rec.start(); setListening(true); setMicState("idle"); } catch (e) { /* already running */ setListening(true); }
  };

  const stopListening = () => {
    if (!listening) return;
    wantRef.current = false;
    try { recRef.current && recRef.current.stop(); } catch (e) { /* ignore */ }
    stopAudio();
    secsRef.current += (Date.now() - startRef.current) / 1000;
    setListening(false);
  };

  const mark = () => {
    stopListening();
    const wc = text.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 12) { setResult({ short: true }); return; }
    const r = scoreStation(text, st);
    const lines = analyseAnswer(text);
    const delivery = secsRef.current > 3 ? analyseDelivery(text, secsRef.current) : null;
    setResult({ ...r, lines, delivery });
    getJSON("ucat:ivmarks", []).then((arr) => {
      const list = Array.isArray(arr) ? arr : [];
      setJSON("ucat:ivmarks", [...list, { ts: Date.now(), out10: r.out10, band: r.band, track, mmi: st.id }].slice(-100));
    });
  };

  const reset = () => { setText(""); setResult(null); secsRef.current = 0; baseRef.current = ""; interimRef.current = ""; if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(""); } };
  const marked = result && !result.short;

  return (
    <div className={`mmi-station${open ? " open" : ""}`}>
      <button className="mmi-head" onClick={onToggle} aria-expanded={open}>
        <span className="mmi-type">{st.type}</span>
        <b>{st.label}</b>
        {marked && <span className={`mmi-scorepill ${result.band.toLowerCase()}`}>{result.out10}/10</span>}
        <span className="mmi-chev" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mmi-body">
          <p className="mmi-prompt">{st.prompt}</p>
          {st.note && <p className="mmi-note">{st.note}</p>}
          <div className="mmi-frame">
            {st.framework.map(([h, d]) => (<div key={h}><b>{h}</b><span>{d}</span></div>))}
          </div>
          <div className="mmi-answer">
            <textarea value={text} onChange={(e) => { setText(e.target.value); if (result) setResult(null); }} placeholder="Speak it or type it, exactly as you would in the room. Spelling and grammar are never marked here." rows={5} />
            <div className="mmi-tools">
              <button className={`wp-mic${listening ? " on" : ""}`} onClick={toggleMic} disabled={micState === "unsupported"}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" strokeLinecap="round" /></svg>
                {listening ? "Listening, tap to stop" : micState === "unsupported" ? "Dictation not supported" : "Speak your answer"}
              </button>
              {listening && <span className="wp-live">recording</span>}
              <span className="mmi-toolspacer" />
              {result && <button className="ud-quit" onClick={reset}>reset</button>}
              <button className="ud-btn" onClick={mark}>Mark it</button>
            </div>
            {micState === "denied" && <p className="mmi-short" style={{ color: "var(--stop)" }}>Microphone access was blocked. Allow it in your browser settings, or type the answer instead.</p>}
            {listening && <p className="mmi-rechint">Recording the full audio and transcribing as you go. The transcript can miss the odd word, so glance over it before marking; your recording below always has everything.</p>}
            {audioUrl && !listening && (
              <div className="mmi-playback">
                <span className="k">Your recording, everything you said</span>
                <audio controls src={audioUrl} preload="metadata" />
              </div>
            )}
          </div>
          {result && result.short && <p className="mmi-short">Give it a real go first, at least a couple of sentences (around 12 words), then tap Mark it.</p>}
          {marked && (
            <div className="mmi-result">
              <div className="mmi-scoreline">
                <div className="mmi-big"><b className={result.band.toLowerCase()}>{result.out10}<em>/10</em></b><span>{result.band} · {result.covered}/{result.total} key points</span></div>
              </div>
              <div className="mmi-covers">
                <span className="k">Did your answer hit this station's marks?</span>
                <ul>
                  {result.met.map((m, n) => (
                    <li key={n} className={m.met ? "hit" : "miss"}><span aria-hidden="true">{m.met ? "✓" : "○"}</span>{m.label}</li>
                  ))}
                </ul>
                {result.covered < result.total && <p className="mmi-guide"><b>To lift the mark:</b> {st.guide}</p>}
              </div>
              {result.delivery && (
                <div className="mmi-delivery">
                  <span className="k">Delivery</span>
                  <div className="mmi-dnums">
                    <div><b className={`mono ${result.delivery.paceTone === "good" ? "" : "warn"}`}>{result.delivery.wpm}</b><span>words / min</span></div>
                    <div><b className="mono">{result.delivery.seconds}s</b><span>spoken</span></div>
                    <div><b className={`mono ${result.delivery.fillers >= 4 ? "warn" : ""}`}>{result.delivery.fillers}</b><span>filler words</span></div>
                  </div>
                  <p>{result.delivery.verdict}</p>
                </div>
              )}
              <div className="mmi-crits">
                <span className="k">Structure and reflection notes</span>
                {result.base.crits.map((c) => (
                  <div className="mmi-crit" key={c.name}>
                    <span className={`dot s${c.score}`} aria-hidden="true" />
                    <div><b>{c.name} · {c.score}/2</b><p>{c.score === 2 ? c.good : c.fix}</p></div>
                  </div>
                ))}
              </div>
              <div className="mmi-lines">
                <span className="k">Line by line</span>
                {result.lines.map((l, n) => (<p key={n} className={`mmi-l ${l.v}`}>{l.sn} <em>{l.n}</em></p>))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MmiCircuit({ track }) {
  const stations = mmiStations(track);
  const [open, setOpen] = useState({ [stations[0].id]: true });
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  return (
    <div className="mmi-wrap">
      <p className="ud-learn-intro">A circuit of the station types real MMIs are built from. Open a station, take a moment to think, then speak or type your answer and mark it. Each one stays open or folds away so you can work through them at your own pace.</p>
      {stations.map((st) => (
        <MmiStation key={st.id} st={st} open={!!open[st.id]} onToggle={() => toggle(st.id)} track={track} />
      ))}
    </div>
  );
}

/* ==================== UNIFIED INTERVIEW STUDIO ==================== */

/* MMI is marked on the same criteria per topic whatever the scenario, so
   each topic carries one framework, one rubric and several prompts. All
   original, written around published themes, never real questions. */
function ivTopics(track) {
  const pro = track === "med" ? "doctor" : "dentist";
  return {
    ethics: {
      type: "Ethics",
      framework: [["Autonomy", "The person's right to their own choices."], ["Beneficence", "Acting in their and others' interests."], ["Non-maleficence", "The harm risked either way."], ["Justice", "Fairness, duty and the wider public."]],
      covers: [
        ["Names the principles in tension", /\b(autonomy|beneficence|non-?maleficence|confidential|justice|duty of care|four pillars|principle|ethic)\b/i],
        ["Puts patient safety first", /\b(patient safety|patients?|harm|risk|safe|unsafe|impair|danger|fitness to practise)\b/i],
        ["Compassion, not just rules", /\b(support|help (them|him|her)|wellbeing|talk to (them|him|her)|without judg|non-?judg|encourage (them|him|her)|struggling|underlying|why they)\b/i],
        ["A clear, professional action", /\b(i would|i'd|i will|speak to|report|escalate|encourage (them|him|her) to|advise|raise (it|this|concern)|seek help|occupational health|supervisor|tutor|welfare)\b/i],
      ],
      guide: "Name the principles in tension, gather what you would need to know, act with patient safety leading, and stay compassionate throughout.",
      prompts: [
        "A close friend on your course admits, in confidence, that they have been drinking before placement shifts and beg you to say nothing. What do you do, and why?",
        "An elderly patient with capacity refuses a treatment you believe they need. Their adult daughter quietly asks you to go ahead anyway. How do you approach this?",
        `You notice a senior ${pro} you admire skipping infection-control steps when the clinic is busy. What do you do?`,
      ],
    },
    roleplay: {
      type: "Role play",
      framework: [["Acknowledge", "Open calmly, without accusation."], ["Explore", "Ask open questions; something may be going on."], ["Empathise", "Show you have heard them first."], ["Plan", "Agree a concrete next step together."]],
      covers: [
        ["Opens without blame", /\b(calm|without blame|not accus|non-?confrontational|start by|open by|privately|one to one|how are you|check (in|how))\b/i],
        ["Listens before fixing", /\b(listen|ask|open question|understand|explore|why|find out|their side|hear (them|their)|going on|is everything)\b/i],
        ["Genuine empathy", /\b(empath|acknowledge|i understand|that must|i can see|feel|reassure|support|no judg)\b/i],
        ["Agrees a shared plan", /\b(plan|agree|together|next step|going forward|check back|follow up|solution|share the|redistribute|catch up)\b/i],
      ],
      guide: "Open privately and without blame, ask what is going on before assuming, show you have heard them, then agree a concrete shared plan.",
      prompts: [
        "A team-mate has missed several group deadlines and the rest of the group is angry. You have been asked to speak to them. How do you open and handle that conversation?",
        "A friend is convinced they failed an exam that matters to them and is talking about dropping out. How would you talk with them?",
        "A classmate keeps taking credit for shared work in front of tutors. You need to raise it with them. Talk through how.",
      ],
    },
    prioritise: {
      type: "Prioritisation",
      framework: [["Safety first", "What carries the greatest risk if it waits?"], ["Gather", "Clarify what each demand actually needs."], ["Delegate / escalate", "You need not do everything yourself."], ["Communicate", "Tell people what you are doing and when."]],
      covers: [
        ["A clear, safety-led order", /\b(safety|safe|first|priorit|most urgent|urgent|risk|life-threatening|greatest (risk|harm|need)|clinical)\b/i],
        ["Knows your limits", /\b(student|within my|my role|not my place|beyond my|competence|qualified|i am not|i'm not|remit)\b/i],
        ["Escalates or delegates", /\b(escalate|senior|supervisor|nurse|ask for help|inform|tell (the|my)|delegate|hand over|get help)\b/i],
        ["Keeps everyone informed", /\b(let (them|him|her) know|communicat|explain|tell them|inform|update|apolog|reassure|come back|be with you)\b/i],
      ],
      guide: "Lead with the greatest clinical risk, recognise a student's limits and escalate rather than act beyond competence, and keep the others informed.",
      prompts: [
        "You are a student on a busy ward round. At once, a nurse asks for urgent help, your supervisor wants you to present, and a visitor looks lost and upset. How do you prioritise, and why?",
        "It is exam week. You have a group project due, a part-time shift, a friend in crisis messaging you, and your own revision. Walk through how you would order it.",
        "On placement you spot two things at once: a piece of equipment left unsafe, and a patient who seems anxious and alone. What do you do first?",
      ],
    },
    reflection: {
      type: "Reflection",
      framework: [["Situation", "One sentence of context, no more."], ["Task", "What was at stake and why it was hard."], ["Action", "What you did, first person."], ["Result and reflection", "The outcome and what you changed since. The marks live here."]],
      covers: [
        ["A real failure, owned", /\b(i failed|my (mistake|fault|error)|i (did not|didn't|should have|could have)|i got (it )?wrong|i underestimated|i let|i struggled|i missed)\b/i],
        ["First-person actions", /\bi (did|took|decided|spoke|asked|changed|worked|practi[sc]ed|tried|rebuilt|organis|planned|approached|reached out)\b/i],
        ["An honest outcome", /\b(result|outcome|in the end|eventually|passed|failed|improved|the grade|the score|we (won|lost)|did not|still|better)\b/i],
        ["A lesson since applied", /\b(learn|taught me|since then|now i|next time|i would|applied|used (this|that|it)|changed how|these days|ever since)\b/i],
      ],
      guide: "Pick a real failure and own it in a line, describe what you did in the first person, give the honest outcome, then land on the lesson and where you have used it since.",
      prompts: [
        "Describe a time you failed at something that mattered to you. What did you do, and what did it teach you?",
        "Tell me about a time you received difficult feedback. How did you respond?",
        "Describe a time you let a team down. What was your part in it, and what changed afterwards?",
      ],
    },
  };
}
const IV_TOPIC_ORDER = ["ethics", "roleplay", "prioritise", "reflection"];

/* Build a four-question circuit. MMI takes one question from every topic so
   all are tested; Panel and Uni draw from their pools. */
function buildInterviewCircuit(mode, track, panelPool, uniQs) {
  if (mode === "uni") {
    return shuffle(uniQs || []).slice(0, 4).map((q, i) => ({ id: `uni-${i}-${q.q}`, topic: "panel", type: q.theme || "Question", prompt: q.q, guide: q.g || "", mmi: false }));
  }
  if (mode === "panel") {
    return shuffle(panelPool || []).slice(0, 4).map((q, i) => ({ id: `panel-${i}-${q.q}`, topic: "panel", type: q.theme || "Question", prompt: q.q, guide: q.g || "", mmi: false }));
  }
  const T = ivTopics(track);
  return IV_TOPIC_ORDER.map((k) => {
    const t = T[k];
    return { id: `${k}-${Math.floor(Math.random() * 1e6).toString(36)}`, topic: k, type: t.type, prompt: pick(t.prompts), framework: t.framework, covers: t.covers, guide: t.guide, mmi: true };
  });
}

/* One answer scored into a common shape, station-aware for MMI. */
function scoreAnswer(text, q) {
  const lines = analyseAnswer(text);
  if (q.mmi && q.covers) {
    const r = scoreStation(text, q);
    return { out10: r.out10, band: r.band, met: r.met, covered: r.covered, total: r.total, crits: r.base.crits, lines, guide: q.guide };
  }
  const m = markAnswer(text);
  return { out10: m.outOf10, band: m.band, met: null, crits: m.crits, lines, guide: q.guide, bestCase: m.bestCase, worstCase: m.worstCase };
}

/* Robust dictation: recognises for the transcript and records the raw audio
   in parallel so nothing spoken is ever lost. Returns everything a caller
   needs. */
function useDictation() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [micState, setMicState] = useState("idle");
  const [audioUrl, setAudioUrl] = useState("");
  const [level, setLevel] = useState(0);
  const recRef = useRef(null);
  const baseRef = useRef("");
  const interimRef = useRef("");
  const wantRef = useRef(false);
  const startRef = useRef(0);
  const secsRef = useRef(0);
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const heardRef = useRef(0);

  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setMicState("unsupported"); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-GB"; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) baseRef.current = (baseRef.current + " " + seg).replace(/\s+/g, " ").trim();
        else interim += seg;
      }
      interimRef.current = interim;
      setText((baseRef.current + (interim ? " " + interim : "")).replace(/\s+/g, " ").trim());
    };
    rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { wantRef.current = false; setMicState("denied"); setListening(false); } };
    rec.onend = () => {
      if (interimRef.current) { baseRef.current = (baseRef.current + " " + interimRef.current).replace(/\s+/g, " ").trim(); interimRef.current = ""; setText(baseRef.current); }
      if (wantRef.current) { try { rec.start(); } catch (err) { setTimeout(() => { if (wantRef.current) { try { rec.start(); } catch (e2) { /* give up */ } } }, 120); } }
      else setListening(false);
    };
    recRef.current = rec;
    return () => { wantRef.current = false; try { rec.stop(); } catch (err) { /* ignore */ } };
  }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const stopAudio = () => {
    try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch (e) { /* ignore */ }
    try { if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; } } catch (e) { /* ignore */ }
    analyserRef.current = null; setLevel(0);
    try { if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop(); } catch (e) { /* ignore */ }
    try { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ }
  };
  const start = async () => {
    const rec = recRef.current;
    if (!rec || listening) return;
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(""); }
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        streamRef.current = stream;
        const mr = new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
        mr.onstop = () => { try { setAudioUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }))); } catch (e) { /* ignore */ } };
        mr.start(200); mediaRef.current = mr;
        /* live input meter so the speaker can see they are being heard */
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          const ctx = new AC(); audioCtxRef.current = ctx;
          if (ctx.state === "suspended") ctx.resume();
          const an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.75;
          ctx.createMediaStreamSource(stream).connect(an); analyserRef.current = an;
          const buf = new Uint8Array(an.fftSize);
          heardRef.current = 0;
          const tick = () => {
            an.getByteTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
            const rms = Math.sqrt(sum / buf.length);
            const shown = Math.min(1, rms * 3.4);
            if (shown > 0.12) heardRef.current = Date.now();
            setLevel(shown);
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        } catch (e) { /* meter unavailable; dictation still works */ }
      } catch (e) { /* audio recording unavailable; carry on with the live transcript only */ }
    }
    interimRef.current = ""; wantRef.current = true; startRef.current = Date.now();
    try { rec.start(); setListening(true); setMicState("idle"); } catch (e) { setListening(true); }
  };
  const stop = () => {
    if (!listening) return;
    wantRef.current = false;
    try { recRef.current && recRef.current.stop(); } catch (e) { /* ignore */ }
    stopAudio();
    secsRef.current += (Date.now() - startRef.current) / 1000;
    setListening(false);
  };
  const reset = () => { stop(); setText(""); baseRef.current = ""; interimRef.current = ""; secsRef.current = 0; if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(""); } };
  const secsOf = () => secsRef.current + (listening ? (Date.now() - startRef.current) / 1000 : 0);
  return { text, setText, listening, micState, audioUrl, level, start, stop, reset, toggle: () => (listening ? stop() : start()), secsOf, baseRef };
}

/* The fullscreen circuit runner: press Go, the question reveals, 5s to think,
   30s to answer (strict), then it advances with a burst and a slide. At the
   end the results panel rises with a mark for every question. */
function IvStars() {
  const stars = ["★", "✦", "★", "✧", "★", "✦"];
  return <div className="ivr-stars" aria-hidden="true">{stars.map((s, n) => <s key={n} style={{ left: `${8 + n * 16}%`, top: `${20 + (n % 3) * 22}%`, animationDelay: `${n * 55}ms` }}>{s}</s>)}</div>;
}
function InterviewRunner({ title, questions, track, onExit }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("ready"); /* ready | think | write | results */
  const [left, setLeft] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [slide, setSlide] = useState("");
  const [burst, setBurst] = useState(false);
  const d = useDictation();
  const dRef = useRef(d); useEffect(() => { dRef.current = d; });
  const q = questions[idx];
  const THINK = 5, WRITE = 30;

  const finishCircuit = (all) => {
    const scored = all.map((a) => ({ ...a, r: scoreAnswer(a.text, a.q) }));
    setAnswers(scored);
    setPhase("results");
    /* record marks and, for anything under 7, the interview mistake bank */
    getJSON("ucat:ivmarks", []).then((arr) => {
      const list = Array.isArray(arr) ? arr : [];
      const add = scored.map((s) => ({ ts: Date.now(), out10: s.r.out10, band: s.r.band, track, mmi: s.q.mmi ? s.q.topic : "panel" }));
      setJSON("ucat:ivmarks", [...list, ...add].slice(-120));
    });
    getJSON("ucat:ivmistakes", []).then((arr) => {
      let list = Array.isArray(arr) ? arr : [];
      scored.filter((s) => s.r.out10 < 7).forEach((s) => {
        list = list.filter((m) => m.prompt !== s.q.prompt);
        list.push({ id: s.q.id, topic: s.q.topic, type: s.q.type, prompt: s.q.prompt, guide: s.q.guide, out10: s.r.out10, ts: Date.now() });
      });
      setJSON("ucat:ivmistakes", list.slice(-60));
    });
  };

  const advance = () => {
    const secs = dRef.current.secsOf();
    const captured = { q, text: dRef.current.text, secs };
    const all = [...answers, captured];
    dRef.current.reset();
    setBurst(true); setSlide("out");
    setTimeout(() => {
      setBurst(false);
      if (idx + 1 >= questions.length) { setAnswers(all); finishCircuit(all); return; }
      setAnswers(all);
      setIdx(idx + 1); setPhase("ready"); setSlide("in");
      setTimeout(() => setSlide(""), 360);
    }, 620);
  };

  /* Timed phases: think then write, strictly. */
  useEffect(() => {
    if (phase !== "think" && phase !== "write") return;
    if (left <= 0) {
      if (phase === "think") { setPhase("write"); setLeft(WRITE); dRef.current.reset(); }
      else advance();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);

  const go = () => { setPhase("think"); setLeft(THINK); };

  if (phase === "results") {
    const avg = answers.length ? Math.round(answers.reduce((a, s) => a + s.r.out10, 0) / answers.length) : 0;
    /* Delivery: spoken answers only (a typed answer has no real speaking time). */
    const deliveries = answers.map((s) => (s.secs > 3 ? analyseDelivery(s.text, s.secs) : null));
    const spoken = deliveries.filter(Boolean);
    const totalFillers = spoken.reduce((n, dv) => n + dv.fillers, 0);
    const fillerAgg = {};
    spoken.forEach((dv) => Object.entries(dv.fillerCounts).forEach(([k, v]) => { fillerAgg[k] = (fillerAgg[k] || 0) + v; }));
    const topFillers = Object.entries(fillerAgg).sort((a, b) => b[1] - a[1]);
    const advice = fillerAdvice(fillerAgg, totalFillers);
    return (
      <div className="ivr">
        <div className="ivr-top"><span className="ivr-ttl">{title} · results</span><button className="ivr-exit" onClick={onExit}>Done</button></div>
        <div className="ivr-results">
          <div className="ivr-overall"><b className="mono">{avg}<em>/10</em></b><span>average across {answers.length} stations</span></div>
          {answers.map((s, n) => {
            const dv = deliveries[n];
            return (
              <div className="ivr-rcard" key={n} style={{ animationDelay: `${n * 70}ms` }}>
                <div className="ivr-rhead"><span className="mmi-type">{s.q.type}</span><b>{s.q.prompt}</b><span className={`mmi-scorepill ${s.r.band.toLowerCase()}`}>{s.r.out10}/10</span></div>
                {s.r.met && (
                  <ul className="ivr-covers">{s.r.met.map((m, i) => <li key={i} className={m.met ? "hit" : "miss"}><span aria-hidden="true">{m.met ? "✓" : "○"}</span>{m.label}</li>)}</ul>
                )}
                {dv && dv.fillers > 0 && (
                  <p className="ivr-fillers">{dv.fillers} filler {dv.fillers === 1 ? "word" : "words"}: {Object.entries(dv.fillerCounts).sort((a, b) => b[1] - a[1]).map(([w, c]) => `“${w}”${c > 1 ? " ×" + c : ""}`).join(", ")}</p>
                )}
                {s.r.out10 < 7 && <p className="mmi-guide"><b>To improve:</b> {s.q.guide}</p>}
                {!s.text.trim() && <p className="ivr-noans">No answer recorded for this station.</p>}
              </div>
            );
          })}

          {spoken.length > 0 && (
            <div className="ivr-delivery">
              <div className="ivr-dhead"><b>Delivery</b><span className={`ivr-fpill ${totalFillers === 0 ? "clean" : totalFillers >= 6 ? "high" : "some"}`}>{totalFillers} filler {totalFillers === 1 ? "word" : "words"}</span></div>
              {totalFillers === 0 ? (
                <p className="ivr-dsub">Not a single filler word across your spoken answers. That is exactly how it should sound.</p>
              ) : (
                <>
                  <p className="ivr-dsub">Across your spoken answers: {topFillers.map(([w, c]) => `“${w}” ×${c}`).join(", ")}.</p>
                  <p className="ivr-dsub" style={{ marginTop: 8 }}><b>How to cut them:</b></p>
                  <ul className="ivr-advice">{advice.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </>
              )}
            </div>
          )}

          <p className="ok-note">Anything under 7/10 has been added to your interview mistake bank to come back to.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ivr">
      <div className="ivr-top">
        <span className="ivr-ttl">{title}</span>
        <span className="ivr-count mono">Station {idx + 1} / {questions.length}</span>
        {(phase === "think" || phase === "write") && <span className={`ivr-clock mono ${phase}${phase === "write" && left <= 8 ? " low" : ""}`}>{left}s</span>}
        <button className="ivr-exit" onClick={onExit}>End</button>
      </div>
      <div className={`ivr-stage sl-${slide}`}>
        {burst && <IvStars />}
        <span className="ivr-topic">{q.type}</span>
        <p className={`ivr-q${phase === "ready" ? " blur" : ""}`} aria-hidden={phase === "ready"}>{q.prompt}</p>
        {phase === "ready" && (
          <div className="ivr-ready">
            <p>Press Go and the question reveals. You will get {THINK} seconds to think, then {WRITE} seconds to answer, just like a real station.</p>
            <button className="ud-btn" onClick={go}>Go</button>
          </div>
        )}
        {phase === "think" && (
          <div className="ivr-think"><b className="mono">{left}</b><span>Think. Plan your answer, do not type yet.</span>
            {q.framework && <div className="mmi-frame" style={{ marginTop: 14 }}>{q.framework.map(([h, dd]) => <div key={h}><b>{h}</b><span>{dd}</span></div>)}</div>}
          </div>
        )}
        {phase === "write" && (
          <div className="ivr-write">
            <textarea value={d.text} onChange={(e) => d.setText(e.target.value)} placeholder="Speak it or type it. Say it exactly as you would in the room." rows={5} autoFocus />
            <div className="mmi-tools">
              <button className={`wp-mic${d.listening ? " on" : ""}`} onClick={d.toggle} disabled={d.micState === "unsupported"}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" strokeLinecap="round" /></svg>
                {d.listening ? "Listening, tap to stop" : d.micState === "unsupported" ? "Dictation not supported" : "Speak your answer"}
              </button>
              {d.listening && (
                <span className={`mic-meter${d.level > 0.12 ? " live" : ""}`} aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => {
                    const th = (n + 1) / 8;
                    return <i key={n} style={{ transform: `scaleY(${d.level >= th ? 1 : 0.18 + d.level * 1.4})`, opacity: d.level >= th ? 1 : 0.35 }} />;
                  })}
                </span>
              )}
              {d.listening && <span className="wp-live">recording</span>}
            </div>
            {d.listening && d.level < 0.06 && <p className="mmi-short" style={{ color: "var(--signal)" }}>Speak up a little, the mic is quiet. If the bars stay flat, check your browser has mic access.</p>}
            {d.micState === "denied" && <p className="mmi-short" style={{ color: "var(--stop)" }}>Microphone access was blocked. Type the answer instead.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* The one practice screen: pick a source, and on the general bank a MMI or
   Panel toggle, then start the fullscreen circuit. */
function InterviewLauncher({ track }) {
  const [source, setSource] = useState("general");
  const [mode, setMode] = useState("mmi");
  const [running, setRunning] = useState(null);
  const [motion, setMotion] = useState(true);
  useEffect(() => { getJSON("ucat:ivmotion", true).then((v) => setMotion(v !== false)); }, []);
  const toggleMotion = () => { const v = !motion; setMotion(v); setJSON("ucat:ivmotion", v); };
  const IVTABLE = track === "med" ? MED_IV : UNI_IV;
  const IVLIST = track === "med" ? MED_UNIS : UNIS.filter((u) => UNI_IV[u.id]);
  const panelPool = [];
  IV_THEMES.filter((t) => t.tracks.includes(track)).forEach((th) => th.qs.forEach((qq) => { if (!qq.t || qq.t === track) panelPool.push({ q: qq.q, g: qq.g, theme: th.name }); }));

  const [mistakes, setMistakes] = useState([]);
  useEffect(() => { getJSON("ucat:ivmistakes", []).then((a) => setMistakes(Array.isArray(a) ? a : [])); }, [running]);

  const d = source === "general" ? null : IVTABLE[source];
  const uniObj = source === "general" ? null : IVLIST.find((u) => u.id === source);

  const startGeneral = () => setRunning(buildInterviewCircuit(mode, track, panelPool, null));
  const startUni = () => {
    const uni = IVTABLE[source];
    const qs = uni ? [...(uni.qs || []).map((x) => ({ q: x.q || x, g: x.g || "", theme: uni.focus ? uni.focus[0] : "Tailored" })), ...(uni.curve || []).map((x) => ({ q: x, g: "There is no right answer. Buy a beat, pick an angle, reason out loud and land somewhere.", theme: "Curveball" }))] : [];
    setRunning(buildInterviewCircuit("uni", track, null, qs));
  };
  const start = () => (source === "general" ? startGeneral() : startUni());
  const launchSingle = (q, type) => setRunning([{ id: "t-" + q, topic: "panel", type, prompt: q, guide: "Structure it, give one specific first-person example, and land a reflection on what it taught you.", mmi: false }]);
  const retry = () => {
    const qs = mistakes.slice(0, 4).map((m) => {
      const T = ivTopics(track);
      const t = IV_TOPIC_ORDER.includes(m.topic) ? T[m.topic] : null;
      return t ? { id: m.id, topic: m.topic, type: m.type, prompt: m.prompt, framework: t.framework, covers: t.covers, guide: m.guide, mmi: true } : { id: m.id, topic: "panel", type: m.type, prompt: m.prompt, guide: m.guide, mmi: false };
    });
    if (qs.length) setRunning(qs);
  };

  if (running) {
    const single = running.length === 1;
    const title = single ? "Practice question" : source === "general" ? (mode === "mmi" ? "MMI circuit" : "Panel circuit") : (d && d.style === "panel" ? "Panel circuit" : "MMI circuit");
    return <InterviewRunner title={title} questions={running} track={track} onExit={() => setRunning(null)} />;
  }

  const startLabel = source === "general"
    ? "Start the circuit"
    : d && d.style === "panel" ? "Start the panel"
    : d && d.style === "both" ? "Start the circuit"
    : "Start MMI";

  return (
    <>
      <div className="ud-config iv-config" style={{ marginTop: 6 }}>
        <div className="iv-config-main">
          <div className="grp">
            <label>Question source</label>
            <div className="row">
              <select className="ud-input" style={{ maxWidth: 320 }} value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="general">General bank, all schools</option>
                <option disabled>Tailored to a school:</option>
                {IVLIST.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          {source === "general" && (
            <div className="ud-mode" style={{ paddingTop: 12 }}>
              <span>Format</span>
              <button className={mode === "mmi" ? "on" : ""} onClick={() => setMode("mmi")}>MMI circuit</button>
              <button className={mode === "panel" ? "on" : ""} onClick={() => setMode("panel")}>Panel questions</button>
            </div>
          )}
          <p className="ud-empty" style={{ margin: "12px 0 0" }}>
            {source === "general"
              ? (mode === "mmi" ? "Four stations, one from each MMI topic: ethics, role play, prioritisation and reflection. Timed like the real thing, marked at the end." : "Four panel questions back to back, timed and marked at the end.")
              : "Four questions in this school's format, timed and marked at the end. Or hit Go on any single question below to run just that one."}
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="ud-btn" onClick={start}>{startLabel}</button>
          </div>
        </div>

        <div className={`iv-mic${motion ? " live" : ""}`}>
          <div className="iv-mic-orb" aria-hidden="true">
            <span className="iv-ring" /><span className="iv-ring r2" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" /></svg>
          </div>
          <div className="iv-wave" aria-hidden="true">
            {Array.from({ length: 11 }).map((_, n) => <i key={n} style={{ animationDelay: `${(n % 6) * 0.11}s` }} />)}
          </div>
          <p className="iv-mic-cap">Spoken practice. Answer <b>out loud</b> into your mic, and Tempo marks what you actually say.</p>
          <button className="iv-mic-toggle" onClick={toggleMotion} aria-pressed={motion} title="Turn the animation on or off">
            <span className={`iv-sw${motion ? " on" : ""}`} aria-hidden="true"><i /></span>
            Motion {motion ? "on" : "off"}
          </button>
        </div>
      </div>

      {d && <UniFactSheet d={d} uni={uniObj} onGo={launchSingle} />}

      {mistakes.length > 0 && (
        <>
          <div className="ud-sec"><h2>Interview mistake bank</h2><i /><span>{mistakes.length} to revisit</span></div>
          <p className="ud-empty" style={{ margin: "0 0 12px" }}>Stations you scored under 7/10. Read what to fix, then re-run them.</p>
          {mistakes.slice(0, 8).map((m, n) => (
            <div className="ud-mrow" key={n} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <span className="sec mono">{m.out10}/10</span>
              <span className="txt" style={{ flex: 1 }}><b>{m.type}.</b> {m.prompt}<br /><span style={{ color: "var(--mute)", fontSize: 12.5 }}>{m.guide}</span></span>
            </div>
          ))}
          <div className="row" style={{ marginTop: 12 }}><button className="ud-btn ghost" onClick={retry}>Re-run these stations</button></div>
        </>
      )}
    </>
  );
}

function InterviewView({ track, onSwitch }) {
  const themes = IV_THEMES.filter((t) => t.tracks.includes(track));
  const [openQ, setOpenQ] = useState(null);
  const [warnHidden, setWarnHidden] = useState(false);

  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Interview preparation</h2><i /><span>{track === "dent" ? "dentistry" : "medicine"} track</span></div>
      <div className="ud-mode" style={{ paddingTop: 12 }}>
        <span>Track</span>
        <button className={track === "dent" ? "on" : ""} onClick={() => onSwitch("dent")}>Dentistry</button>
        <button className={track === "med" ? "on" : ""} onClick={() => onSwitch("med")}>Medicine</button>
      </div>
      {!warnHidden && (
        <div className="iv-warn">
          <span className="ic" aria-hidden="true">!</span>
          <p>
            <b>These are not real interview questions.</b> No university's actual questions appear here, and sharing them would breach
            the confidentiality every candidate agrees to. Everything below is written from scratch around the themes and formats
            each school publicly reports weighting, so you practise the right skills without anyone passing round leaked material.
          </p>
          <button onClick={() => setWarnHidden(true)} aria-label="Dismiss this notice">✕</button>
        </div>
      )}

      <p className="ud-learn-intro">
        Interviews are the most learnable part of the application: the themes repeat, the mark schemes reward structure and reflection,
        and practice moves scores more than talent does. Open any question for how to build the answer, then use practice mode to rehearse
        under real thinking time.
      </p>
      <SiteDisclaimer />

      <div className="ud-sec"><h2>Interview practice</h2><i /><span>pick a school or the general bank, then run it timed and marked</span></div>
      <p className="ud-learn-intro" style={{ marginTop: 0 }}>
        Choose a school to see its reported format, what it weights and a set of tailored questions, or stay on the general bank.
        Press <b>Start</b> to run a full timed circuit, or <b>Go</b> next to any single question to rehearse it on its own in full screen.
      </p>
      <InterviewLauncher track={track} />

      <div className="ud-sec"><h2>How to present yourself</h2><i /><span>delivery carries real marks</span></div>
      <div className="iv-grid">
        {IV_DELIVERY.map((d, n) => (
          <div className="iv-card" key={n} style={{ animationDelay: `${n * 60}ms` }}>
            <h4>{d.h}</h4>
            <p className="what" style={{ marginBottom: 0 }}>{d.p}</p>
          </div>
        ))}
      </div>

      <div className="ud-sec"><h2>The question bank</h2><i /><span>tap any question for the build</span></div>
      <div className="iv-grid">
        {themes.map((th, ti) => (
          <div className="iv-card" key={th.id} style={{ animationDelay: `${ti * 50}ms` }}>
            <h4>{th.name}</h4>
            <p className="what">{th.what}</p>
            {th.qs.filter((q) => !q.t || q.t === track).map((q, qi) => {
              const key = th.id + qi;
              return (
                <div className={`iv-q${openQ === key ? " open" : ""}`} key={key}>
                  <button className="q" onClick={() => setOpenQ(openQ === key ? null : key)}>
                    {q.q}<span className="chev">›</span>
                  </button>
                  <div className="iv-a"><p>{q.g}</p></div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ height: 50 }} />
    </div>
  );
}

/* ------------------------------ UNI SELECTOR ---------------------- */


function BudgetMini({ u }) {
  const mid = Math.round((u.rent[0] + u.rent[1]) / 2);
  const london = u.rent[0] >= 900;
  const [b, setB] = useState({ rent: mid, food: 190, transport: london ? 110 : 60, other: 130 });
  const monthly = b.rent + b.food + b.transport + b.other;
  return (
    <div className="uni-budget">
      <p className="bh">Build a monthly budget here (approximate 2025 figures, adjust to your reality):</p>
      <div className="brow">
        {[["rent", "Rent"], ["food", "Food"], ["transport", "Transport"], ["other", "Everything else"]].map(([k, l]) => (
          <label key={k}>{l}
            <input type="number" min="0" value={b[k]} onChange={(e) => setB({ ...b, [k]: Number(e.target.value) || 0 })} />
          </label>
        ))}
      </div>
      <p className="bt">≈ <b className="mono">£{monthly.toLocaleString()}</b> a month, <b className="mono">£{(monthly * 9).toLocaleString()}</b> across a nine-month academic year, before fees and travel home.</p>
    </div>
  );
}

function AuSelector({ track }) {
  const [atar, setAtar] = useState(95);
  const [pct, setPct] = useState(85);
  const [ran, setRan] = useState(false);
  const list = track === "med" ? AU_MED : AU_DENT;
  const results = list.map((u) => ({ u, r: assessAu(u, atar, pct) }));
  const order = { strong: 0, range: 1, aspire: 2, out: 3 };
  results.sort((a, b) => order[a.r.status] - order[b.r.status] || b.u.atar - a.u.atar);

  return (
    <>
      <p className="ud-learn-intro">
        Australian direct entry runs on ATAR plus UCAT ANZ, and the balance between them varies enormously by school.
        Some weight UCAT at 100 per cent of the interview shortlist, others ignore it completely. Enter your numbers and
        the tool sorts every programme by fit. Figures move every cycle, so confirm on each university's own page before
        preferencing.
      </p>

      <div className="uni-form">
        <label>Predicted ATAR or selection rank
          <input type="number" min="50" max="99.95" step="0.05" value={atar} onChange={(e) => setAtar(Number(e.target.value))} />
        </label>
        <label>UCAT ANZ percentile
          <input type="number" min="1" max="99" value={pct} onChange={(e) => setPct(Number(e.target.value))} />
        </label>
        <label style={{ justifyContent: "flex-end" }}>
          <button className="ud-btn" onClick={() => setRan(true)}>Map my options</button>
        </label>
      </div>

      <IntlPanel region="au" />

      <div className="au-bands">
        <p className="bh">Where your percentile puts you</p>
        {AU_BANDS.map((b, n) => (
          <div className="aband" key={n}>
            <b className="mono">{b.pct}</b>
            <span className="sc mono">{b.score}</span>
            <span className="st">{b.status}</span>
            <p>{b.use}</p>
          </div>
        ))}
      </div>

      {ran && results.map(({ u, r }, n) => (
        <div className="uni-row" key={u.id} style={{ animationDelay: `${n * 40}ms` }}>
          <header>
            <span className="uni-mono" style={{ background: u.col + "22", color: u.col, borderColor: u.col }}>{u.state}</span>
            <h4>{u.name}</h4>
            <span className={`uni-chip ${r.status}`}>{r.label}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>ATAR ~{u.atar.toFixed(2)}</span>
          </header>
          <p className="why"><b style={{ color: "var(--paper)" }}>{u.deg}.</b> {u.sel}{u.atarNote ? ` Baseline noted as ${u.atarNote}.` : ""}</p>
          <p className="why">{r.reasons.join(" ")} {u.note}</p>
          <div className="uni-pi">
            <i style={{ width: `${u.ucat === "high" ? 180 : u.ucat === "low" ? 70 : 8}px`, background: u.ucat === "high" ? "var(--signal)" : u.ucat === "low" ? "#7FB3F0" : "var(--mute)" }} />
            <span>UCAT weighting: {u.ucat === "high" ? "high" : u.ucat === "low" ? "low to medium" : "not required"}</span>
          </div>
        </div>
      ))}

      {ran && (
        <div className="ud-empty" style={{ paddingTop: 16 }}>
          <p style={{ margin: 0 }}>
            ATAR baselines, weightings and pathway rules change every cycle and differ for rural, Indigenous and interstate
            applicants. Nothing here replaces the university's own admissions page or TISC, UAC, QTAC and VTAC guidance.
          </p>
          <LastChecked when={DATA_CHECKED.australia} />
        </div>
      )}
      <div style={{ height: 50 }} />
    </>
  );
}

/* Custom A-level entry. Students type their own subjects and grades
   rather than picking a fixed grade string, so subject requirements can
   be checked and the profile reads as their own. */
const ALEVEL_GRADES = ["A*", "A", "B", "C", "D", "E"];
const GRADE_RANK = { "A*": 6, "A": 5, "B": 4, "C": 3, "D": 2, "E": 1 };
const DEFAULT_ALEVELS = [{ subj: "Chemistry", grade: "A" }, { subj: "Biology", grade: "A" }, { subj: "Maths", grade: "A" }];

/* Collapse the typed subjects into the grade string the threshold logic
   already understands, using the best three grades. */
function predFromSubjects(subjects) {
  const ranks = (subjects || []).map((s) => GRADE_RANK[s.grade] || 0).sort((a, b) => b - a).slice(0, 3);
  while (ranks.length < 3) ranks.push(0);
  const [a, b, c] = ranks;
  if (a >= 6 && b >= 5 && c >= 5) return "A*AA";
  if (a >= 5 && b >= 5 && c >= 5) return "AAA";
  if (a >= 5 && b >= 5 && c >= 4) return "AAB";
  return "Other";
}

/* Per-school A-level subject rules. UK medicine and dentistry set these
   individually, so a blanket rule is wrong. Requirements are drawn from
   the Dental Schools Council and Medical Schools Council listings and the
   universities' own pages (2025-2026 entry) and grouped into the handful
   of real patterns below. General Studies and Critical Thinking are
   excluded everywhere, so they never count toward a requirement.

   Presets:
     chembio   both Chemistry and Biology required
     chem1     Chemistry plus a second science (Biology, Physics or Maths)
     chem1psy  as chem1 but Psychology counts as the second science
     bio1      Biology required, second science from a wide list (Chem optional)
     cb1       Chemistry OR Biology, plus a second science
     cb1psy    as cb1 but Psychology counts as the second science           */
const EXCLUDED_SUBJ = ["general studies", "critical thinking"];
const SUBJ_PRESETS = {
  chembio: { all: ["chemistry", "biology"], label: "Chemistry and Biology" },
  chemonly: { need: "chemistry", from: [], min: 0, label: "Chemistry (a second science is recommended but not compulsory)" },
  chem1: { need: "chemistry", from: ["biology", "physics", "maths"], min: 1, label: "Chemistry, plus a second science from Biology, Physics or Maths" },
  chem1psy: { need: "chemistry", from: ["biology", "physics", "maths", "psychology"], min: 1, label: "Chemistry, plus a second science from Biology, Physics, Maths or Psychology" },
  bio1: { need: "biology", from: ["chemistry", "physics", "maths", "psychology"], min: 1, label: "Biology, plus a second science from Chemistry, Physics, Maths or Psychology" },
  cbonly: { oneOf: ["chemistry", "biology"], from: ["chemistry", "biology"], min: 0, label: "Chemistry or Biology" },
  cb1: { oneOf: ["chemistry", "biology"], from: ["chemistry", "biology", "physics", "maths"], min: 1, label: "Chemistry or Biology, plus a second science from the other, Physics or Maths" },
  cb1psy: { oneOf: ["chemistry", "biology"], from: ["chemistry", "biology", "physics", "maths", "psychology"], min: 1, label: "Chemistry or Biology, plus a second science from the other, Physics, Maths or Psychology" },
  any: { any: true, label: "no specific A-level subjects (graduate entry or flexible)" },
};
/* Dentistry is Chemistry and Biology almost everywhere. Exceptions:
   Bristol takes Chemistry plus a second science; Plymouth (Peninsula) is
   Biology-led; Queen Mary and King's accept one science plus a second.
   Anything not listed uses the default. Sourced from the Dental Schools
   Council 2026 listing and the schools' own pages. */
const DENT_SUBJ_DEFAULT = "chembio";
const DENT_SUBJ = { bristol: "chem1", plymouth: "bio1", qmul: "cb1", kcl: "cb1psy" };
/* Medicine varies more, so most schools are set explicitly below from the
   Medical Schools Council listing and each school's own page (2026-2027
   entry). The default is Chemistry plus a second science. Requirements
   change yearly, so the UI always tells applicants to confirm on the
   school's own page. */
const MED_SUBJ_DEFAULT = "chem1";
const MED_SUBJ = {
  /* both Chemistry and Biology */
  cardiff: "chembio", nottingham: "chembio", sgul: "chembio", ucl: "chembio", lincoln: "chembio",
  imperial: "chembio", hyms: "chembio", exeter: "chembio", leeds: "chembio", kcl: "chembio",
  aston: "chembio", edgehill: "chembio",
  /* Biology required, Chemistry optional */
  uea: "bio1", soton: "bio1", plymouth: "bio1",
  /* one of Chemistry/Biology plus a second science */
  barts: "cb1", brunel: "cb1", anglia: "cb1", sunderland: "cb1", gtrmanchester: "cb1", bsms: "cb1",
  /* ...with Psychology accepted as the second science */
  sheffield: "cb1psy", lancaster: "cb1psy", kmms: "cb1psy",
  /* Chemistry plus a second science, Psychology accepted */
  keele: "chem1psy", leicester: "chem1psy", manchester: "chem1psy",
  /* Chemistry required, second science not compulsory */
  newcastle: "chemonly",
  /* one science (Chemistry or Biology) is enough at A-level */
  buckingham: "cbonly",
  /* graduate entry, no A-level subject rule */
  surrey: "any", worcester: "any",
  /* remaining schools use the Chemistry-plus-a-second-science default:
     aberdeen, birmingham, bristol, cambridge, dundee, edinburgh, glasgow,
     liverpool, oxford, qub, standrews, uclan */
};

const normSubj = (s) => (s || "").toLowerCase().trim();
function heldSubjects(subjects) {
  return (subjects || []).map((x) => normSubj(x.subj)).filter((n) => n && !EXCLUDED_SUBJ.some((x) => n.includes(x)));
}
const hasSubj = (held, key) => held.some((n) => n.includes(key === "maths" ? "math" : key));

/* Evaluate a subject list against one school's preset. Returns whether it
   is met and a short reason. Deliberately does not hard-block the mapping,
   since applicants often enter predicted info while still choosing
   subjects; it surfaces the gap instead.
     all      every listed subject required
     need     one named subject required, plus `min` more from `from`
     oneOf    one of the named subjects, plus enough from `from` for `min`
     any      no subject rule (graduate entry)                            */
function evalSubjReq(subjects, presetKey) {
  const p = SUBJ_PRESETS[presetKey] || SUBJ_PRESETS.chem1;
  if (p.any) return { ok: true, label: p.label };
  const held = heldSubjects(subjects);
  if (p.all) {
    return { ok: p.all.every((k) => hasSubj(held, k)), label: p.label };
  }
  if (p.need) {
    if (!hasSubj(held, p.need)) return { ok: false, label: p.label };
    const seconds = p.from.filter((k) => k !== p.need && hasSubj(held, k)).length;
    return { ok: seconds >= (p.min ?? 1), label: p.label };
  }
  const coreOk = p.oneOf.some((k) => hasSubj(held, k));
  const fromCount = p.from.filter((k) => hasSubj(held, k)).length;
  return { ok: coreOk && fromCount >= (p.min ?? 1) + 1, label: p.label };
}

function subjPresetFor(track, id) {
  return track === "med" ? (MED_SUBJ[id] || MED_SUBJ_DEFAULT) : (DENT_SUBJ[id] || DENT_SUBJ_DEFAULT);
}

/* Summary line above the results: how many of the mapped schools the typed
   subjects satisfy, and which they fall short of. */
function subjectSummary(subjects, track, ids) {
  const results = ids.map((id) => ({ id, ...evalSubjReq(subjects, subjPresetFor(track, id)) }));
  const short = results.filter((r) => !r.ok);
  const named = heldSubjects(subjects);
  const chem = hasSubj(named, "chemistry"), bio = hasSubj(named, "biology");
  const list = subjects.filter((s) => normSubj(s.subj)).map((s) => `${s.subj} (${s.grade})`).join(", ") || "none entered";
  let tone = "go", text;
  const field = track === "med" ? "medical" : "dental";
  if (!chem && !bio) {
    tone = "stop";
    text = `You list neither Chemistry nor Biology. Essentially every UK ${field} school requires at least one, so this combination would not meet any of them. General Studies and Critical Thinking never count.`;
  } else if (short.length === 0) {
    text = `This meets the A-level subject requirement at all ${results.length} schools shown. Grade requirements still apply separately.`;
  } else if (short.length <= results.length / 2) {
    tone = "warn";
    text = `This meets the subject requirement at ${results.length - short.length} of ${results.length} schools. It falls short where a stricter combination is asked for; those schools are flagged in red below.`;
  } else {
    tone = "stop";
    text = `This meets the subject requirement at only ${results.length - short.length} of ${results.length} schools. Most here want a combination you are not taking; the shortfalls are flagged in red below.`;
  }
  return { tone, text, list };
}

function ALevelEntry({ subjects, onChange }) {
  const set = (i, patch) => onChange(subjects.map((s, n) => (n === i ? { ...s, ...patch } : s)));
  const add = () => onChange([...subjects, { subj: "", grade: "A" }].slice(0, 5));
  const drop = (i) => onChange(subjects.filter((_, n) => n !== i));
  return (
    <div className="al-entry">
      {subjects.map((s, i) => (
        <div className="al-row" key={i}>
          <input className="al-subj" placeholder="Subject, e.g. Chemistry" value={s.subj} maxLength={24} onChange={(e) => set(i, { subj: e.target.value })} />
          <select className="al-grade" value={s.grade} onChange={(e) => set(i, { grade: e.target.value })}>
            {ALEVEL_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button className="al-drop" type="button" onClick={() => drop(i)} aria-label="Remove subject" disabled={subjects.length <= 1}>×</button>
        </div>
      ))}
      {subjects.length < 5 && <button className="al-add" type="button" onClick={add}>+ Add subject</button>}
    </div>
  );
}

function FitBanner({ fit }) {
  return (
    <div className={`fit-banner fit-${fit.tone}`}>
      <b>A-level subjects:</b> {fit.list}. {fit.text}
    </div>
  );
}

/* One red line inside a university row when the typed subjects miss that
   school's specific requirement. */
function SubjectFlag({ subjects, track, id }) {
  const r = evalSubjReq(subjects, subjPresetFor(track, id));
  if (r.ok) return null;
  return <p className="uni-subjflag">Subjects: this course asks for {r.label}. Your current A-levels do not meet that. Confirm on the school's own page.</p>;
}

function MedSelector() {
  const [ucat, setUcat] = useState(2000);
  const [band, setBand] = useState(2);
  const [subjects, setSubjects] = useState(DEFAULT_ALEVELS);
  const [g79, setG79] = useState(7);
  const [ctx, setCtx] = useState(false);
  const [ran, setRan] = useState(false);
  const pred = predFromSubjects(subjects);
  const fit = subjectSummary(subjects, "med", MED_SCHOOLS.map((u) => u.id));
  const results = MED_SCHOOLS.map((u) => ({ u, r: assessMed(u, { ucat, band, pred, g9: g79, g8: 0, g7: 0, ctx }) }));
  const order = { strong: 0, range: 1, aspire: 2, out: 3, block: 4 };
  results.sort((a, b) => order[a.r.status] - order[b.r.status] || (b.u.low || 0) - (a.u.low || 0));

  return (
    <>
      <p className="ud-learn-intro">
        Enter your UCAT out of 2700, SJT band and predicted grades, and the tool maps you against every UK medical school using this cycle's research.
        Most schools set cut-offs after applications close, so these are guides, not guarantees: confirm each on the university's own page.
      </p>
      <div className="uni-form">
        <label>UCAT total (out of 2700)
          <input type="number" min="1200" max="2700" value={ucat} onChange={(e) => setUcat(Number(e.target.value))} />
        </label>
        <label>SJT band
          <select value={band} onChange={(e) => setBand(Number(e.target.value))}>
            {[1, 2, 3, 4].map((b) => <option key={b} value={b}>Band {b}</option>)}
          </select>
        </label>
        <label>GCSEs at grade 7 or above
          <input type="number" min="0" max="12" value={g79} onChange={(e) => setG79(Number(e.target.value))} />
        </label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={ctx} onChange={(e) => setCtx(e.target.checked)} style={{ width: "auto" }} /> Contextual / widening participation
        </label>
        <label style={{ gridColumn: "1 / -1" }}>Your A-level subjects and predicted grades
          <ALevelEntry subjects={subjects} onChange={setSubjects} />
        </label>
        <label style={{ gridColumn: "1 / -1", justifyContent: "flex-end", alignItems: "flex-start" }}>
          <button className="ud-btn" onClick={() => setRan(true)}>Map my options</button>
        </label>
      </div>

      {ran && <FitBanner fit={fit} />}

      {ran && results.map(({ u, r }, n) => (
        <div className="uni-row" key={u.id} style={{ animationDelay: `${n * 25}ms` }}>
          <header>
            <span className="uni-mono" style={{ background: u.col + "22", color: u.col, borderColor: u.col }}>MED</span>
            <h4>{u.name}</h4>
            <span className={`uni-chip ${r.status}`}>{r.label}</span>
            {u.low && <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>~{u.low} bar</span>}
          </header>
          <p className="why">{r.reasons.join(" ")}</p>
          <SubjectFlag subjects={subjects} track="med" id={u.id} />
          <p className="why" style={{ color: "var(--mute)" }}>
            <b style={{ color: "var(--paper)" }}>UCAT:</b> {u.ucatW}. <b style={{ color: "var(--paper)" }}>Predicted grades:</b> {MED_PRED_LABEL[u.pred]}. <b style={{ color: "var(--paper)" }}>GCSEs:</b> {u.gcse === "none" ? "not scored" : u.gcse === "scored" ? "scored" : "threshold only"}. {u.note}
          </p>
        </div>
      ))}
      {ran && (
        <p className="ud-empty" style={{ paddingTop: 16 }}>
          UCAT figures are on the current out-of-2700 scale, converted from older out-of-3600 figures where needed, so treat them as approximate. Nothing here replaces a university's own admissions page.
        </p>
      )}
      <LastChecked when={MED_CHECKED} />
      <div style={{ height: 50 }} />
    </>
  );
}

function UniSelector({ track, prefs, setPrefs }) {
  const saved = prefs.uni || {};
  const [region, setRegion] = useState(prefs.region || "uk");
  const pickRegion = (r) => { setRegion(r); setPrefs({ ...prefs, region: r }); };
  const [f, setF] = useState({
    ucat: saved.ucat || 2000, band: saved.band || 2,
    grades: saved.grades || [9, 9, 9, 8, 8, 8, 7, 7],
    maths: saved.maths || 7, eng: saved.eng || 7,
    subjects: saved.subjects || DEFAULT_ALEVELS, scottish: saved.scottish || false, ctx: saved.ctx || false,
  });
  const [ran, setRan] = useState(false);
  const [openMore, setOpenMore] = useState(null);

  const addGrade = (g) => setF({ ...f, grades: [...f.grades, g].slice(0, 12) });
  const dropGrade = (i) => setF({ ...f, grades: f.grades.filter((_, n) => n !== i) });
  const counts = { g9: f.grades.filter((g) => g === 9).length, g8: f.grades.filter((g) => g === 8).length, g7: f.grades.filter((g) => g === 7).length };

  const run = () => { setPrefs({ ...prefs, uni: f }); setRan(true); setOpenMore(null); };

  const RegionBar = () => (
    <div className="region-bar">
      <button className={region === "uk" ? "on" : ""} onClick={() => pickRegion("uk")}>
        <svg viewBox="0 0 60 30" aria-hidden="true" className="flag">
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
          <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
        </svg>
        United Kingdom
      </button>
      <button className={region === "au" ? "on" : ""} onClick={() => pickRegion("au")}>
        <svg viewBox="0 0 60 30" aria-hidden="true" className="flag">
          <rect width="60" height="30" fill="#00247D" />
          <g transform="scale(0.5)"><rect width="60" height="30" fill="#00247D" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
            <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" /></g>
          <g fill="#fff"><circle cx="15" cy="24" r="2.4" /><circle cx="45" cy="7" r="1.8" /><circle cx="50" cy="15" r="2" /><circle cx="44" cy="22" r="1.8" /><circle cx="52" cy="25" r="1.3" /></g>
        </svg>
        Australia and NZ
      </button>
    </div>
  );

  const TrackBar = () => (
    <div className="ud-mode" style={{ paddingTop: 12 }}>
      <span>Course</span>
      <button className={track !== "med" ? "on" : ""} onClick={() => setPrefs({ ...prefs, track: "dent" })}>Dentistry</button>
      <button className={track === "med" ? "on" : ""} onClick={() => setPrefs({ ...prefs, track: "med" })}>Medicine</button>
    </div>
  );

  if (region === "au") {
    return (
      <div className="ud-wrap">
        <div className="ud-sec" style={{ paddingTop: 32 }}><h2>University selector</h2><i /><span>Australia, direct entry</span></div>
        <RegionBar />
        <TrackBar />
        <SiteDisclaimer />
        <AuSelector track={track} />
      </div>
    );
  }

  if (track === "med") {
    return (
      <div className="ud-wrap">
        <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Strategic university selector</h2><i /><span>medicine · {MED_SCHOOLS.length} UK schools</span></div>
        <RegionBar />
        <TrackBar />
        <SiteDisclaimer />
        <MedSelector />
        <div className="ud-trend" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Graduate entry</h3>
          <p style={{ fontSize: 13.5, color: "var(--body)", lineHeight: 1.65, margin: 0 }}>{GRAD_ENTRY.med}</p>
        </div>
      </div>
    );
  }

  const pred = predFromSubjects(f.subjects);
  const fit = subjectSummary(f.subjects, "dent", UNIS.map((u) => u.id));
  const uf = { ...f, ...counts, pred };
  const results = UNIS.map((u) => ({ u, r: assessUni(u, uf) }));
  const order = { strong: 0, range: 1, aspire: 2, out: 3, block: 4 };
  results.sort((a, b) => order[a.r.status] - order[b.r.status] || b.u.pi - a.u.pi);
  const picks = [
    ...results.filter((x) => x.r.status === "strong" || x.r.status === "range").slice(0, 3),
    ...results.filter((x) => x.r.status === "aspire").slice(0, 1),
  ].slice(0, 4);
  const costRank = [...UNIS].sort((a, b) => (a.rent[0] + a.rent[1]) - (b.rent[0] + b.rent[1]));
  const rankOf = (u) => costRank.findIndex((x) => x.id === u.id) + 1;

  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Strategic university selector</h2><i /><span>14 UK dental schools</span></div>
      <RegionBar />
      <TrackBar />
        <SiteDisclaimer />
      <p className="ud-learn-intro">
        Type your actual grades, mark contextual status if any widening participation scheme applies to you, and the tool maps you against
        every dental school's latest known thresholds. Contextual applicants are weighted more gently almost everywhere: lower effective
        UCAT thresholds and offers typically reduced by a grade. Figures move yearly, so confirm everything on official admissions
        pages before UCAS.
      </p>

      <div className="uni-form">
        <label style={{ gridColumn: "1 / -1" }}>Your GCSE grades, one chip each (tap a chip to remove it)
          <div className="gr-wrap">
            {f.grades.map((g, i) => (
              <button key={i} className={`gr-chip g${g}`} onClick={() => dropGrade(i)}>{g}</button>
            ))}
            <span className="gr-add">
              {[9, 8, 7, 6, 5, 4].map((g) => (
                <button key={g} onClick={() => addGrade(g)}>+{g}</button>
              ))}
            </span>
          </div>
        </label>
        <label>UCAT (900-2700)
          <input type="number" min="900" max="2700" value={f.ucat} onChange={(e) => setF({ ...f, ucat: Number(e.target.value) })} />
        </label>
        <label>SJT band
          <select value={f.band} onChange={(e) => setF({ ...f, band: Number(e.target.value) })}>{[1, 2, 3, 4].map((b) => <option key={b} value={b}>Band {b}</option>)}</select>
        </label>
        <label>Maths GCSE
          <select value={f.maths} onChange={(e) => setF({ ...f, maths: Number(e.target.value) })}>{[9, 8, 7, 6, 5, 4].map((g) => <option key={g} value={g}>{g}</option>)}</select>
        </label>
        <label>English GCSE
          <select value={f.eng} onChange={(e) => setF({ ...f, eng: Number(e.target.value) })}>{[9, 8, 7, 6, 5, 4].map((g) => <option key={g} value={g}>{g}</option>)}</select>
        </label>
        <label>Scottish applicant
          <select value={f.scottish ? "yes" : "no"} onChange={(e) => setF({ ...f, scottish: e.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes</option></select>
        </label>
        <label>Contextual applicant
          <select value={f.ctx ? "yes" : "no"} onChange={(e) => setF({ ...f, ctx: e.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes</option></select>
        </label>
        <label style={{ gridColumn: "1 / -1" }}>Your A-level subjects and predicted grades
          <ALevelEntry subjects={f.subjects} onChange={(subjects) => setF({ ...f, subjects })} />
        </label>
        <label style={{ gridColumn: "1 / -1", justifyContent: "flex-end", alignItems: "flex-start" }}>
          <button className="ud-btn" onClick={run}>Map my choices</button>
        </label>
      </div>

      {ran && (
        <>
          <FitBanner fit={fit} />
          {picks.length > 0 && (
            <div className="ud-nextup" style={{ marginTop: 18 }}>
              <div>
                <div className="ud-eyebrow" style={{ marginBottom: 0 }}>A sensible four</div>
                <h3>{picks.map((x) => x.u.name.replace("University of ", "").replace(" University", "").replace("Queen's ", "").replace(" of London", "")).join(" · ")}</h3>
                <p>Choices you clear or nearly clear, at most one aspirational, favouring stronger post-interview conversion. Your judgement overrides any tool.</p>
              </div>
            </div>
          )}

          <IntlPanel region="uk" />

          {results.map(({ u, r }, n) => (
            <div className="uni-row" key={u.id} style={{ animationDelay: `${n * 40}ms` }}>
              <header>
                <Monogram u={u} />
                <h4>{u.name}</h4>
                <span className={`uni-chip ${r.status}`}>{r.label}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>cut ~{f.ctx && u.cutCtx ? u.cutCtx : f.scottish && u.cutScot ? u.cutScot : u.cut}{u.cutNote ? "*" : ""}</span>
              </header>
              <p className="why">{u.weight} {u.gcse.msg}</p>
              <p className="why">{r.reasons.join(" ")} {u.note}</p>
              <SubjectFlag subjects={f.subjects} track="dent" id={u.id} />
              {u.cutNote && <p className="why" style={{ color: "var(--mute)" }}>*{u.cutNote}.</p>}
              <div className="uni-pi">
                <i style={{ width: `${(f.scottish && u.piScot ? u.piScot : u.pi) * 2.4}px` }} />
                <span>{f.scottish && u.piScot ? u.piScot : u.pi}% of interviews convert to offers</span>
              </div>
              <button className="uni-morebtn" onClick={() => setOpenMore(openMore === u.id ? null : u.id)}>
                {openMore === u.id ? "Less information" : "More information"}
              </button>
              {openMore === u.id && (
                <div className="uni-more">
                  <p><b>The course.</b> {u.course}</p>
                  <p><b>Where you'll train.</b> {u.hosp} {u.plc}</p>
                  <p><b>Living costs.</b> Student rent runs roughly £{u.rent[0]} to £{u.rent[1]} a month here, which places it <b className="mono">#{rankOf(u)} of 14</b> on cost across the dental cities (1 = cheapest). International clinical fees are {u.intl}; home fees are the standard capped rate. All approximate, confirm before budgeting for real.</p>
                  <p><b>Life nearby.</b> {u.near}</p>
                  <BudgetMini u={u} />
                </div>
              )}
            </div>
          ))}

          <div className="ud-trend" style={{ padding: 20, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Graduate entry</h3>
            <p style={{ fontSize: 13.5, color: "var(--body)", lineHeight: 1.65, margin: 0 }}>{GRAD_ENTRY.dent}</p>
          </div>

          <div className="ud-empty" style={{ paddingTop: 16 }}>
            <p style={{ margin: 0 }}>
              Thresholds, rents and fees shown are approximate research figures and estimates, and every one of them moves.
              Nothing here replaces the universities' own published criteria; check each admissions and fees page before submitting UCAS choices.
            </p>
            <LastChecked when={DATA_CHECKED.ukDental} />
          </div>
        </>
      )}
      <div style={{ height: 50 }} />
    </div>
  );
}

/* ------------------------------ COUNTDOWN ------------------------- */

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T09:00:00");
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function CountdownStrip({ prefs, setPrefs }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(prefs.examDate || "");
  const d = daysUntil(prefs.examDate);

  const todayStr = new Date().toISOString().slice(0, 10);
  const maxD = new Date(); maxD.setFullYear(maxD.getFullYear() + 6);
  const maxStr = maxD.toISOString().slice(0, 10);
  /* A native date field lets the year field accept five or more digits.
     Keep it to a real four-digit year within a sensible window. */
  const validDate = (s) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= todayStr && s <= maxStr;

  const save = () => { if (!validDate(val)) return; setPrefs({ ...prefs, examDate: val }); setEditing(false); };

  if (!prefs.examDate || editing) {
    return (
      <div className="cd-strip set">
        <div>
          <span className="k">Test day</span>
          <b>When do you sit the UCAT?</b>
          <span className="d">Everything paces itself around this date.</span>
        </div>
        <div className="cd-in">
          <input type="date" value={val} min={todayStr} max={maxStr} onChange={(e) => setVal(e.target.value)} aria-label="Your UCAT test date" />
          <button className="ud-btn" onClick={save} disabled={!validDate(val)}>Set</button>
        </div>
      </div>
    );
  }

  const weeks = Math.floor(Math.abs(d) / 7);
  const tone = d < 0 ? "past" : d <= 7 ? "urgent" : d <= 28 ? "close" : "far";
  const line = d < 0 ? "Test day has passed. Reset the date if you are sitting again, or keep drilling for interviews."
    : d === 0 ? "Today. Trust the preparation, keep the pace steady, and answer everything."
    : d <= 7 ? "Final week. Volume down, sharpness up. Nothing new from here, just timed blocks and your mistake bank."
    : d <= 28 ? `About ${weeks} week${weeks === 1 ? "" : "s"} out. This is timed-conditions territory: every session against the clock.`
    : `About ${weeks} weeks out. Build the skills now, because technique changes take weeks and cramming cannot buy them later.`;

  return (
    <div className={`cd-strip ${tone}`}>
      <div className="cd-num">
        <b className="mono">{d < 0 ? "0" : d}</b>
        <span>{d === 1 ? "day to go" : d < 0 ? "test day passed" : "days to go"}</span>
      </div>
      <p>{line}</p>
      <button className="ud-quit" onClick={() => { setVal(prefs.examDate); setEditing(true); }}>change date</button>
    </div>
  );
}

/* ------------------------------ LOCKED PREVIEW -------------------- */


/* ------------------------------ STATEMENT BUILDER ----------------- */
/* Critiques and organises the student's own material. It never       */
/* writes content: a statement drafted by software is misconduct      */
/* territory and universities screen for it.                          */


function routeBlurt(line) {
  for (const r of PS_ROUTER) if (r.re.test(line)) return r;
  return { sec: 2, why: "Not sure from the wording. Section 2 is the usual home for anything you did to prepare. Add what you noticed and what it taught you, and it may belong in section 3 instead." };
}

/* ---- Generic writing check ----
   Deliberately NOT an AI detector. Detectors are unreliable and flag
   honest non-native writers constantly. This scores how templated the
   writing is, which is what actually loses marks.                     */



/* ---- Live tips shown beside the box while marking ---- */

function psTips(sec, text) {
  const t = text || "";
  const out = [];
  const has = (re) => re.test(t);
  if (t.trim().length < 60) out.push({ s: "warn", h: "Nothing to work with yet", p: "Get a rough version down before you polish. First drafts are supposed to be bad." });
  if (sec.id === "why") {
    if (!has(/\b(when|during|after|one day|that moment|it was)\b/i)) out.push({ s: "bad", h: "No moment", p: "Open with a specific occasion, not a general feeling. Where were you and what happened?" });
    if (!has(/\b(so i|this led|because of|which is why|afterwards|since then)\b/i)) out.push({ s: "warn", h: "No consequence", p: "Show what you did because of the spark. Motivation with no action behind it reads as a claim." });
  }
  if (sec.id === "prep") {
    if (!has(/\b(noticed|saw|observed|watched|realised|realized)\b/i)) out.push({ s: "bad", h: "No observation", p: "For each experience, name one specific thing you noticed. That is the detail nobody else can copy." });
    if ((t.match(/,/g) || []).length > 12 && !has(/\b(taught|learned|learnt|showed me)\b/i)) out.push({ s: "bad", h: "Reads like a list", p: "You are listing. Cut to two or three experiences and go deeper on each." });
  }
  if (sec.id === "skills") {
    if (!has(/\b(taught|learned|learnt|showed me|changed|would do differently|next time)\b/i)) out.push({ s: "bad", h: "No reflection", p: "This section is scored on growth. What did it change in you, and where have you used that since?" });
    if (has(/\bi am (a )?(good|great|excellent|strong)\b/i)) out.push({ s: "bad", h: "Claim without evidence", p: "Never assert a quality. Show the moment that proves it and let the reader conclude it." });
  }
  if (t.length > sec.chars) out.push({ s: "warn", h: "Running long for this section", p: `Around ${Math.round(sec.chars / 6.5)} words is a sensible share of the whole statement. You are at ${wordCount(t)}.` });
  if (!out.length) out.push({ s: "good", h: "Nothing structural to flag", p: "The shape is right. Now read it aloud: the ear catches what the eye forgives." });
  return out;
}

function PsBuilder({ unlocked, onUnlock }) {
  const [tab, setTab] = useState("write");
  const [drafts, setDrafts] = useState([{ name: "Draft 1", why: "", prep: "", skills: "" }]);
  const [active, setActive] = useState(0);
  const [openSec, setOpenSec] = useState("why");
  const [marks, setMarks] = useState({});
  const [tips, setTips] = useState({});
  const [gen, setGen] = useState(null);
  const [blurt, setBlurt] = useState("");
  const [routed, setRouted] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [frame, setFrame] = useState("peel");
  const [tour, setTour] = useState(-1);
  const [hints, setHints] = useState(true);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    getJSON("ucat:pstour", false).then((seen) => { if (!seen) setTour(0); });
  }, []);
  const endTour = async () => { setTour(-1); await setJSON("ucat:pstour", true); };
  const TOUR = [
    { t: "Start here, not with a blank page", p: "Tap Tell me what you have done first. Empty your head onto the page, one experience per line, and the tool sorts each into the section it belongs in. Everyone who tries to write section one first gets stuck.", tab: "blurt" },
    { t: "Then learn the shapes", p: "How to write it covers the 2025 three question format and the structures that work: PEEL, STAR, CAR and the Gibbs cycle. Pick a structure per paragraph, not one for the whole thing.", tab: "how" },
    { t: "Write in sections, mark as you go", p: "Each section opens with its aim, build steps and named traps. Mark this section gives you suggestions beside the box and a line by line breakdown in green, amber and red.", tab: "write" },
    { t: "Keep drafts, do not overwrite", p: "The plus button makes a new draft copied from the current one, so you can rewrite hard without losing the version that worked.", tab: "write" },
    { t: "Read it whole before anyone else does", p: "Preview shows the finished statement as a single page. Check my writing then scores how templated it reads. Neither will write it for you, and that is deliberate.", tab: "preview" },
  ];

  useEffect(() => {
    getJSON("ucat:ps2", null).then((v) => {
      if (v && Array.isArray(v.drafts) && v.drafts.length) { setDrafts(v.drafts); setActive(0); }
      setLoaded(true);
    });
  }, []);

  const d = drafts[active] || drafts[0];
  const setField = (id, val) => {
    const copy = drafts.map((x, i) => (i === active ? { ...x, [id]: val } : x));
    setDrafts(copy); setMarks((m) => ({ ...m, [id]: null })); setGen(null);
  };
  const totalChars = PS_SECTIONS.reduce((a, sec) => a + (d[sec.id] || "").length, 0);
  const totalWords = PS_SECTIONS.reduce((a, sec) => a + wordCount(d[sec.id]), 0);
  const over = totalChars > PS_TOTAL;

  const save = async () => { await setJSON("ucat:ps2", { drafts }); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  const addDraft = () => {
    const copy = [...drafts, { name: `Draft ${drafts.length + 1}`, why: d.why, prep: d.prep, skills: d.skills }];
    setDrafts(copy); setActive(copy.length - 1);
  };
  const delDraft = (i) => {
    if (drafts.length === 1) return;
    const copy = drafts.filter((_, n) => n !== i);
    setDrafts(copy); setActive(Math.max(0, active - (i <= active ? 1 : 0)));
  };
  const markSection = (sec) => {
    setMarks((m) => ({ ...m, [sec.id]: analyseAnswer(d[sec.id] || "") }));
    setTips((t) => ({ ...t, [sec.id]: psTips(sec, d[sec.id] || "") }));
  };

  if (!unlocked) {
    return (
      <div className="ud-wrap">
        <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Personal statement</h2><i /><span>UCAS three question format</span></div>
        <Locked onUnlock={onUnlock} label="Statement builder with access">
          <div className="ud-trend" style={{ padding: 20, minHeight: 220 }}>
            <h3>Three sections, unlimited drafts, marked line by line</h3>
            <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.65 }}>Structure guidance built from the 2025 format, an experience sorter that tells you which section each thing belongs in, live tips as you mark, cliche detection and a generic writing check.</p>
          </div>
        </Locked>
      </div>
    );
  }

  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Personal statement</h2><i /><span>UCAS three question format</span></div>

      <div className="ps-tabs">
        {[["write", "Write"], ["how", "How to write it"], ["blurt", "Tell me what you have done"], ["preview", "Preview"], ["check", "Check my writing"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "write" && (
        <>
          <div className="ps-drafts">
            {drafts.map((x, i) => (
              <span key={i} className={`dchip${i === active ? " on" : ""}`}>
                <button onClick={() => setActive(i)}>{x.name}</button>
                {drafts.length > 1 && <b onClick={() => delDraft(i)} title="Delete this draft">✕</b>}
              </span>
            ))}
            <button className="dadd" onClick={addDraft} title="New draft, copied from this one">+</button>
          </div>

          <div className={`ps-budget${over ? " over" : ""}`}>
            <div className="bar"><i style={{ width: `${Math.min((totalChars / PS_TOTAL) * 100, 100)}%` }} /></div>
            <span className="mono">{totalWords.toLocaleString()} words written{over ? ` · ${totalChars.toLocaleString()} characters, over the UCAS limit` : ""}</span>
          </div>

          {PS_SECTIONS.map((sec) => (
            <div className="ps-sec" key={sec.id}>
              <button className="ps-head" onClick={() => setOpenSec(openSec === sec.id ? "" : sec.id)}>
                <span className="num">{sec.n}</span>
                <span className="ttl">{sec.title}</span>
                <span className="cc mono">{wordCount(d[sec.id])} words</span>
                <span className={`chev${openSec === sec.id ? " open" : ""}`}>›</span>
              </button>

              {openSec === sec.id && (
                <div className="ps-body">
                  <p className="aim">{sec.aim}</p>
                  <div className="ps-steps">
                    {sec.steps.map((x, n) => (<div key={n}><b>{n + 1}</b><span>{x}</span></div>))}
                  </div>
                  <p className="ps-frame">Suggested frame: <b>{sec.frame}</b>. Avoid: {sec.traps.join(" · ")}.</p>

                  <div className={`ps-split${tips[sec.id] ? " has" : ""}`}>
                    <div className="ps-write">
                      <textarea className="ud-input wp-box" style={{ minHeight: 190 }} value={d[sec.id] || ""} disabled={!loaded}
                        spellCheck={true} lang="en-GB"
                        onChange={(e) => setField(sec.id, e.target.value)}
                        placeholder="Your own words. Draft fast and ugly, then cut. Spelling is checked by your browser, not marked by us." />
                      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                        <button className="ud-btn" disabled={(d[sec.id] || "").trim().split(/\s+/).filter(Boolean).length < 12} onClick={() => markSection(sec)}>Mark this section</button>
                        <button className="ud-btn ghost" onClick={save}>{saved ? "Saved ✓" : "Save"}</button>
                      </div>
                      <MarkingNotice />
                    </div>

                    {tips[sec.id] && (
                      <div className="ps-tips">
                        <p className="th">Suggestions</p>
                        {tips[sec.id].map((t, n) => (
                          <div className={`tip ${t.s}`} key={n}><b>{t.h}</b><span>{t.p}</span></div>
                        ))}
                      </div>
                    )}
                  </div>

                  {marks[sec.id] && marks[sec.id].length > 0 && (
                    <div className="wp-hl">
                      <div className="hkey"><span className="green">strong</span><span className="amber">could be better</span><span className="red">weak</span></div>
                      {marks[sec.id].map((l, n) => (
                        <div className={`hline ${l.v}`} key={n}>
                          <p className="txt">{l.sn}</p>
                          <p className="note">{l.n}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "how" && (
        <>
          <div className="iv-warn" style={{ marginBottom: 4 }}>
            <span className="ic" aria-hidden="true">!</span>
            <p><b>This tool will not write your statement.</b> Universities screen for generated text and UCAS treats a statement you did not write as misconduct. It is also the version you cannot defend at interview, where they ask about it directly.</p>
          </div>
          <div className="ud-lgrid" style={{ paddingTop: 14 }}>
            {PS_HOWTO.map((c, n) => (
              <div className="ud-lcard" key={n}><h4>{c.h}</h4><p>{c.p}</p></div>
            ))}
          </div>

          <div className="ud-sec"><h2>Structures that work</h2><i /><span>pick per paragraph, not per statement</span></div>
          <div className="ps-frames">
            {PS_FRAMES.map((f) => (
              <button key={f.id} className={frame === f.id ? "on" : ""} onClick={() => setFrame(f.id)}>{f.name}</button>
            ))}
          </div>
          {PS_FRAMES.filter((f) => f.id === frame).map((f) => (
            <div className="ps-frameview" key={f.id}>
              <p className="best">{f.best}</p>
              <div className="ps-steps">
                {f.steps.map(([h, p2], n) => (<div key={h}><b>{h}</b><span>{p2}</span></div>))}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "blurt" && (
        <>
          <p className="ud-learn-intro">
            Before you write anything, empty your head. Put every experience on its own line: work experience, volunteering,
            jobs, caring, sport, music, reading, EPQ, anything. The tool sorts each one into the section it belongs in,
            which is exactly how successful applicants start: a list first, paragraphs second.
          </p>
          <textarea className="ud-input wp-box" style={{ minHeight: 170 }} value={blurt}
            onChange={(e) => { setBlurt(e.target.value); setRouted(null); }}
            placeholder={"One per line, for example:\nTwo weeks shadowing at a dental practice\nSaturday job in a cafe\nVolunteered at a care home for a year\nRoot canal that got me interested\nGrade 6 piano"} />
          <button className="ud-btn" style={{ marginTop: 10 }} disabled={blurt.trim().length < 8}
            onClick={() => setRouted(blurt.split("\n").map((x) => x.trim()).filter(Boolean).map((x) => ({ line: x, ...routeBlurt(x) })))}>
            Sort these into sections
          </button>

          {routed && (
            <div className="ps-routed">
              {[1, 2, 3].map((n) => {
                const sec = PS_SECTIONS.find((x) => x.n === n);
                const items = routed.filter((r) => r.sec === n);
                return (
                  <div className="rsec" key={n}>
                    <h4><span className="num">{n}</span> {sec.title}</h4>
                    {items.length === 0 ? <p className="empty">Nothing here yet. This section will feel thin, so look for material that fits it.</p>
                      : items.map((r, i) => {
                        const key = `${n}:${r.line}`;
                        return (
                          <div className="ritem" key={i}>
                            <p className="l">{r.line}</p>
                            {hints && !dismissed.includes(key) && (
                              <div className="rhint">
                                <span className="arrow" aria-hidden="true">↑</span>
                                <p>Put this in <b>section {n}</b>. {r.why}</p>
                                <button onClick={() => setDismissed((x) => [...x, key])} aria-label="Dismiss this hint">✕</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
              <p className="ud-empty">Sorting is based on wording, so move anything that feels misplaced. Most experiences can serve section 2 or 3 depending on whether you write about what you did or what it changed in you.</p>
            </div>
          )}
        </>
      )}

      {tab === "check" && (
        <>
          <div className="iv-warn" style={{ marginBottom: 14 }}>
            <span className="ic" aria-hidden="true">!</span>
            <p>
              <b>This is not an AI detector, and you should distrust anything that claims to be one.</b> Those tools are
              unreliable and wrongly flag honest writers, especially people writing in a second language. What this does
              instead is measure how <i>templated</i> your writing is: cliches, flat sentence rhythm, repetitive openings and
              missing detail. That is what actually costs you marks, and fixing it fixes both problems at once.
            </p>
          </div>
          <button className="ud-btn" onClick={() => setGen(checkGeneric(PS_SECTIONS.map((sec) => d[sec.id] || "").join(" ")))}>
            Check this draft
          </button>
          <MarkingNotice />
          {gen === null && <p className="ud-empty" style={{ paddingTop: 12 }}>Write at least thirty words across the sections, then run the check.</p>}
          {gen && (
            <div className="ps-gen">
              <div className="gscore">
                <b className={gen.score >= 80 ? "good" : gen.score >= 55 ? "warn" : "bad"}>{gen.score}<em>/100</em></b>
                <span>{gen.verdict}</span>
              </div>
              {gen.flags.map((f, n) => (
                <div className={`gflag ${f.s}`} key={n}>
                  <div className="gh"><b>{f.k}</b><span>{f.v}</span></div>
                  <p>{f.d}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "preview" && (
        <>
          <p className="ud-learn-intro">
            Your statement as one page, the way an admissions tutor meets it. Read it aloud here: the ear catches what the
            eye forgives, and it is the fastest way to find a sentence that sounds like someone else wrote it.
          </p>
          <div className="ps-preview">
            <div className="pv-head">
              <span className="mono">{d.name}</span>
              <span className="mono">{totalWords} words · {totalChars.toLocaleString()} characters</span>
            </div>
            {PS_SECTIONS.map((sec) => (
              <div className="pv-sec" key={sec.id}>
                <h4><span className="num">{sec.n}</span>{sec.title}</h4>
                {(d[sec.id] || "").trim()
                  ? (d[sec.id] || "").split(/\n{2,}/).map((para, n) => <p key={n}>{para}</p>)
                  : <p className="empty">Nothing written for this section yet.</p>}
              </div>
            ))}
          </div>
          <p className="ud-empty" style={{ paddingTop: 12 }}>
            Spelling is checked live by your browser while you type in the Write tab. Nothing here is submitted anywhere;
            copy it into UCAS yourself when it is ready.
          </p>
        </>
      )}

      {tour >= 0 && tour < TOUR.length && (
        <div className="tour-wrap">
          <div className="tour-card">
            <span className="step mono">{tour + 1} of {TOUR.length}</span>
            <h3>{TOUR[tour].t}</h3>
            <p>{TOUR[tour].p}</p>
            <div className="tour-dots">{TOUR.map((_, n) => <i key={n} className={n === tour ? "on" : ""} />)}</div>
            <div className="tour-btns">
              <button className="ud-quit" onClick={endTour}>Skip</button>
              {tour > 0 && <button className="ud-btn ghost" onClick={() => { setTour(tour - 1); setTab(TOUR[tour - 1].tab); }}>Back</button>}
              <button className="ud-btn" onClick={() => {
                if (tour === TOUR.length - 1) { endTour(); setTab("blurt"); }
                else { setTab(TOUR[tour + 1].tab); setTour(tour + 1); }
              }}>{tour === TOUR.length - 1 ? "Start with the blurt" : "Next"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="ps-hintbar">
        <button onClick={() => setHints((h) => !h)}>{hints ? "Hide hints" : "Show hints"}</button>
        <button onClick={() => { setTour(0); setTab(TOUR[0].tab); setDismissed([]); }}>Replay the tour</button>
      </div>

      <div style={{ height: 50 }} />
    </div>
  );
}

/* ------------------------------ LEGAL ----------------------------- */
/* Privacy, terms and disclaimer copy plus the user's data rights:    */
/* export everything held on the device, and delete it. Full server   */
/* erasure of a Supabase account needs a service-role Edge Function;   */
/* until that exists the email route in the privacy policy is the      */
/* legally sufficient path, and the button text does not overclaim.   */

function LegalDoc({ doc }) {
  return (
    <div className="ud-trend" style={{ padding: 22, marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>{doc.title}</h3>
      {doc.paragraphs
        ? doc.paragraphs.map((p, n) => <p key={n} style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.7 }}>{fillLegal(p)}</p>)
        : doc.sections.map((s, n) => (
            <div key={n} style={{ marginBottom: 14 }}>
              {s.h && <p style={{ fontWeight: 600, color: "var(--paper)", margin: "0 0 4px", fontSize: 14 }}>{s.h}</p>}
              <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{fillLegal(s.p)}</p>
            </div>
          ))}
    </div>
  );
}

function LegalView({ account, prefs, setPrefs, onDeleteAccount }) {
  const [tab, setTab] = useState("privacy");
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [note, setNote] = useState("");

  const doExport = async () => {
    setBusy(true);
    try {
      const data = await exportLocalData();
      const payload = { app: "Tempo", exportedAt: new Date().toISOString(), account: account ? { email: account.email } : null, data };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "tempo-data.json";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setNote("Your data has been downloaded as tempo-data.json.");
    } catch (e) {
      setNote("Could not build the download. Please try again.");
    }
    setBusy(false);
  };

  const doDelete = async () => {
    setBusy(true);
    await onDeleteAccount();
    setBusy(false);
  };

  const tabs = [["privacy", "Privacy"], ["terms", "Terms"], ["disclaimer", "Disclaimer"], ["data", "Your data"]];

  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Legal and your data</h2><i /><span>policies, consent and data rights</span></div>

      {legalPlaceholdersPending() && (
        <p className="ud-empty" style={{ paddingTop: 12, color: "var(--signal)" }}>
          Setup note for the operator: the controller name, contact email and last-updated date are not yet filled in. Set them in legalContent.js (LEGAL_CONFIG) before taking any payment.
        </p>
      )}

      <div className="ud-mode" style={{ paddingTop: 14 }}>
        <span>Section</span>
        {tabs.map(([k, label]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setNote(""); }}>{label}</button>
        ))}
      </div>

      {tab === "privacy" && <LegalDoc doc={PRIVACY} />}
      {tab === "terms" && <LegalDoc doc={TERMS} />}
      {tab === "disclaimer" && <LegalDoc doc={DISCLAIMER} />}

      {tab === "data" && (
        <>
          <div className="ud-trend" style={{ padding: 22, marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>How your writing is marked</h3>
            <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{MARKING_DISCLOSURE}</p>
          </div>

          <div className="ud-trend" style={{ padding: 22, marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Storage and tracking</h3>
            <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{STORAGE_NOTICE}</p>
          </div>

          <div className="ud-trend" style={{ padding: 22, marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Improving the marking</h3>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={!!prefs.consentImprove} style={{ marginTop: 3 }}
                onChange={(e) => setPrefs({ ...prefs, consentImprove: e.target.checked })} />
              <span style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.6 }}>{CONSENT.improve}</span>
            </label>
            <p className="mono" style={{ fontSize: 11, color: "var(--mute)", marginTop: 8 }}>
              This is off unless you tick it. Marking runs on your device today, so nothing is collected either way; this records your choice for any future opt-in feature.
            </p>
          </div>

          <div className="ud-trend" style={{ padding: 22, marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Download your data</h3>
            <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.7 }}>Get everything Tempo has stored on this device as a single JSON file.</p>
            <button className="ud-btn ghost" onClick={doExport} disabled={busy}>Download my data</button>
          </div>

          <div className="ud-trend" style={{ padding: 22, marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Delete your data</h3>
            <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.7 }}>
              This removes all your progress, drafts and settings from this device{supabaseEnabled ? " and signs you out" : ""}. It is immediate and cannot be undone.
              {supabaseEnabled ? ` To erase your account from our servers entirely, email ${fillLegal("{email}")} and we will action it within 30 days.` : ""}
            </p>
            {!confirmDel ? (
              <button className="ud-btn" style={{ background: "var(--stop)", color: "#fff" }} onClick={() => setConfirmDel(true)}>Delete my data</button>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="ud-btn" style={{ background: "var(--stop)", color: "#fff" }} onClick={doDelete} disabled={busy}>Yes, delete everything</button>
                <button className="ud-btn ghost" onClick={() => setConfirmDel(false)} disabled={busy}>Cancel</button>
              </div>
            )}
          </div>

          {note && <p className="ud-empty" style={{ paddingTop: 12 }}>{note}</p>}
        </>
      )}

      <div style={{ height: 50 }} />
    </div>
  );
}

/* ------------------------------ AUTH AND BILLING ------------------ */

/* =================================================================== */
/*  STRIPE PAYMENT LINK  --  PASTE YOUR LINK BETWEEN THE QUOTES BELOW  */
/*                                                                     */
/*  1. In the Stripe dashboard: Products -> Payment Links -> create a  */
/*     link for the full-access product (one-off, your launch price).  */
/*  2. Under "After payment", choose "Redirect to your website" and    */
/*     set the URL to:   https://YOUR-DOMAIN/app/?checkout=success     */
/*     (that query string is what unlocks the app on return).          */
/*  3. Paste the buy.stripe.com link below and redeploy. Done.         */
/*                                                                     */
/*  Setting VITE_STRIPE_LINK in the environment overrides this, so you */
/*  can keep the real link out of the repo if you prefer. Empty leaves */
/*  the access-code flow in place.                                     */
/* =================================================================== */
const STRIPE_PAYMENT_LINK = ""; /* e.g. "https://buy.stripe.com/8x0abc123" */

const STRIPE_LINK = import.meta.env.VITE_STRIPE_LINK || STRIPE_PAYMENT_LINK;

/* True when Stripe redirects back with ?checkout=success after a completed
   Payment Link, which unlocks the app on return. This trusts the client
   as a launch-time interim; the real control is a Stripe webhook writing a
   server-verified entitlement to Supabase, which will replace this. */
const CHECKOUT_RETURN = (() => {
  try { return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "success"; }
  catch (e) { return false; }
})();
/* Launch sale: £25 until 31 August, then the standard £39. The code
   UCAT18 unlocks during the launch. saleLive() is date driven so the
   copy and price switch on their own when the sale ends. */
const FULL_PRICE = "£39";
const SALE_PRICE = "£25";
const ACCESS_CODE = "UCAT18";
const SALE_ENDS_LABEL = "31 August";
const saleLive = () => Date.now() < new Date("2026-09-01T00:00:00").getTime();
const PRICE_NOTE = "one payment, no subscription, no renewal";

const PLAN_INCLUDES = [
  "Every drill: QR, VR and SJT",
  "Weekly mocks, three per section, with leaderboards",
  "The mistake bank with spaced review at 3, 7 and 21 days",
  "Interview preparation, marked written practice and dictation",
  "The university selector with contextual weighting",
  "Learn pages, the six week plan and your full progress history",
];

function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

function AuthScreen({ onAuthed, onSkip }) {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeImprove, setAgreeImprove] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  const strength = (() => {
    let n = 0;
    if (pw.length >= 8) n++;
    if (pw.length >= 12) n++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++;
    if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) n++;
    return n;
  })();
  const strengthLabel = ["Too short", "Weak", "Fair", "Good", "Strong"][strength];

  const submit = async () => {
    setErr("");
    if (!validEmail(email)) { setErr("That email address does not look right."); return; }
    if (mode !== "reset") {
      if (pw.length < 8) { setErr("Passwords need at least 8 characters."); return; }
      if (mode === "signup" && pw !== pw2) { setErr("The two passwords do not match."); return; }
      if (mode === "signup" && !agreeTerms) { setErr("Please accept the Terms and Privacy Policy to create an account."); return; }
    }
    const addr = email.trim().toLowerCase();
    const consent = mode === "signup" ? { consentImprove: agreeImprove } : {};
    setBusy(true);

    /* Local preview mode: no backend configured, so accept anything. */
    if (!supabaseEnabled) {
      await new Promise((r) => setTimeout(r, 550));
      setBusy(false);
      if (mode === "reset") { setSentMsg(`If an account exists for ${addr}, a reset link is on its way. Check spam if it does not arrive within a few minutes.`); setSent(true); return; }
      onAuthed({ email: addr, ...consent });
      return;
    }

    /* Supabase-backed auth. */
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: addr, password: pw });
        if (error) throw error;
        if (data.session) { onAuthed({ email: data.user.email || addr, id: data.user.id, ...consent }); }
        else { setSentMsg(`Almost there. We have emailed ${addr} a link to confirm your account. Open it, then sign in.`); setSent(true); }
      } else if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: addr, password: pw });
        if (error) throw error;
        onAuthed({ email: data.user.email || addr, id: data.user.id });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(addr);
        if (error) throw error;
        setSentMsg(`If an account exists for ${addr}, a reset link is on its way. Check spam if it does not arrive within a few minutes.`);
        setSent(true);
      }
    } catch (e) {
      setErr(e && e.message ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ud-gate">
      <div className="auth-card">
        <a href="/" className="ud-mark auth-home" style={{ justifyContent: "center", marginBottom: 6 }} title="Back to the Tempo home page" aria-label="Back to the Tempo home page"><b>Tempo</b><span>UCAT trainer</span></a>
        <h2>{mode === "signup" ? "Create your account" : mode === "login" ? "Welcome back" : "Reset your password"}</h2>
        <p className="sub">
          {mode === "signup" ? "An account keeps your progress, mistake bank and mocks on every device you use."
            : mode === "login" ? "Pick up exactly where you left off."
            : "We will email you a link to set a new password."}
        </p>

        {sent ? (
          <>
            <div className="auth-sent">{sentMsg}</div>
            <button className="ud-btn ghost full" onClick={() => { setSent(false); setMode("login"); }}>Back to sign in</button>
          </>
        ) : (
          <>
            <label className="auth-f">Email
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>

            {mode !== "reset" && (
              <label className="auth-f">Password
                <span className="pwwrap">
                  <input type={show ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters"
                    onKeyDown={(e) => e.key === "Enter" && submit()} />
                  <button type="button" className="pweye" onClick={() => setShow((o) => !o)} aria-label={show ? "Hide password" : "Show password"}>
                    {show ? "hide" : "show"}
                  </button>
                </span>
              </label>
            )}

            {mode === "signup" && pw.length > 0 && (
              <div className="pwbar">
                <i className={`s${strength}`} style={{ width: `${(strength / 4) * 100}%` }} />
                <span>{strengthLabel}</span>
              </div>
            )}

            {mode === "signup" && (
              <label className="auth-f">Confirm password
                <input type={show ? "text" : "password"} autoComplete="new-password" value={pw2}
                  onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Type it again" />
              </label>
            )}

            {mode === "signup" && (
              <div className="auth-consent" style={{ margin: "6px 0 2px", display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer", fontSize: 12.5, lineHeight: 1.5, color: "var(--body)" }}>
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>{CONSENT.terms}{" "}
                    <button type="button" onClick={() => setShowLegal((o) => !o)} style={{ background: "none", border: "none", color: "var(--signal)", padding: 0, cursor: "pointer", font: "inherit", textDecoration: "underline" }}>
                      {showLegal ? "Hide them" : "Read them"}
                    </button>
                  </span>
                </label>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer", fontSize: 12.5, lineHeight: 1.5, color: "var(--body)" }}>
                  <input type="checkbox" checked={agreeImprove} onChange={(e) => setAgreeImprove(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>{CONSENT.improve}</span>
                </label>
                {showLegal && (
                  <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 3, padding: "4px 12px" }}>
                    <LegalDoc doc={TERMS} />
                    <LegalDoc doc={PRIVACY} />
                  </div>
                )}
              </div>
            )}

            {err && <p className="auth-err">{err}</p>}

            <button className="ud-btn full" onClick={submit} disabled={busy}>
              {busy ? "Working..." : mode === "signup" ? "Create account" : mode === "login" ? "Sign in" : "Send reset link"}
            </button>

            <div className="auth-alt">
              {mode === "login" && <button onClick={() => { setMode("reset"); setErr(""); }}>Forgotten your password?</button>}
              {mode === "signup"
                ? <button onClick={() => { setMode("login"); setErr(""); }}>Already have an account? Sign in</button>
                : <button onClick={() => { setMode("signup"); setErr(""); }}>New here? Create an account</button>}
            </div>
          </>
        )}

        <div className="auth-foot">
          <button className="ud-quit" onClick={onSkip}>Continue without an account</button>
          <p>{supabaseEnabled
            ? "No tracking cookies and no analytics. Without an account your progress stays in this browser; with one it also syncs so it follows you between devices."
            : "No tracking cookies and no analytics. Progress saves to this browser only until account sync is connected."}</p>
        </div>
      </div>
    </div>
  );
}

function BillingView({ unlocked, onUnlock, email, onSignOut }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const tryCode = () => {
    if (code.trim().toUpperCase() === ACCESS_CODE) { setErr(""); onUnlock(); }
    else setErr("That code is not recognised.");
  };
  const checkout = () => {
    /* Navigate in the same tab so Stripe's after-payment redirect lands
       back on the app (…/app/?checkout=success) and unlocks it. */
    if (STRIPE_LINK) window.location.assign(STRIPE_LINK);
    else setErr(`Checkout is not connected yet. Use the access code ${ACCESS_CODE} to unlock everything for now.`);
  };

  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>{unlocked ? "Your access" : "Full access"}</h2><i /><span>{unlocked ? "active" : PRICE_NOTE}</span></div>

      {unlocked ? (
        <div className="bill-live">
          <span className="tick">✓</span>
          <div>
            <h3>Everything is unlocked</h3>
            <p>{email ? `Tied to ${email}. ` : ""}One payment, no renewal date, no card stored by this app. Every future drill and passage added to the season is included.</p>
          </div>
        </div>
      ) : (
        <div className="bill-grid">
          <div className="bill-card">
            <span className="tag">Free forever</span>
            <p className="price"><b>£0</b></p>
            <p className="sub">No account needed</p>
            <ul>
              <li>Times tables to 15, timed or untimed</li>
              <li>All three difficulty levels</li>
              <li>Your speed history for that drill</li>
            </ul>
            <button className="ud-btn ghost full" disabled>Already yours</button>
          </div>

          <div className="bill-card feature">
            <span className="tag on">Full season</span>
            <p className="price">
              <b>{saleLive() ? SALE_PRICE : FULL_PRICE}</b><em>once</em>
              {saleLive() && <s className="was">{FULL_PRICE}</s>}
            </p>
            <p className="sub">{saleLive() ? `Launch price until ${SALE_ENDS_LABEL}, then ${FULL_PRICE}` : PRICE_NOTE}</p>
            <ul>{PLAN_INCLUDES.map((x) => <li key={x}>{x}</li>)}</ul>
            <button className="ud-btn full" onClick={checkout}>Unlock everything</button>
            <div className="bill-code">
              <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryCode()} placeholder="Access code" aria-label="Access code" />
              <button className="ud-btn ghost" onClick={tryCode}>Redeem</button>
            </div>
            {err && <p className="auth-err" style={{ marginTop: 10 }}>{err}</p>}
          </div>
        </div>
      )}

      <div className="bill-faq">
        <div><b>Why one payment instead of a subscription?</b><p>Because you sit the UCAT once. Monthly billing quietly charges people who have already finished, and nobody should need to remember to cancel a study tool the week of their exam.</p></div>
        <div><b>What happens on test day?</b><p>Nothing changes. Access does not expire, so the interview tools and university selector stay available for the part of the application that comes after the exam.</p></div>
        <div><b>Is this a replacement for a question bank?</b><p>No, and it is not sold as one. Banks give you volume. This builds the underlying speed, technique and judgement, and tells you why each answer was wrong.</p></div>
        <div><b>Refunds</b><p>If it is not useful, say so and get your money back. A study tool that has to trap people to keep them is not worth building.</p></div>
      </div>

      {email && (
        <div className="bill-acct">
          <span>Signed in as <b>{email}</b></span>
          <button className="ud-btn ghost" onClick={onSignOut}>Sign out</button>
        </div>
      )}
      <div style={{ height: 50 }} />
    </div>
  );
}

/* ------------------------------ TRACK GATE ------------------------ */

function TrackGate({ onPick }) {
  return (
    <div className="ud-gate">
      <div className="ud-gate-in">
        <div className="ud-mark" style={{ justifyContent: "center", marginBottom: 8 }}><b>Tempo</b><span>UCAT trainer</span></div>
        <h2>What are you applying for?</h2>
        <p>This sets your interview bank and university tools. You can switch any time.</p>
        <div className="ud-trackrow">
          <button className="ud-track" onClick={() => onPick("dent")}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 6c-5 0-8 4-8 9 0 8 4 10 5 17 .7 4.6 1.6 10 4 10s2.6-5.2 3.4-9.4c.5-2.6 1-4.6 2.6-4.6s2.1 2 2.6 4.6C24.4 36.8 25 42 27.4 42s3.3-5.4 4-10c1-7 5-9 5-17 0-5-3-9-8-9-3.4 0-4.9 1.8-7.2 1.8S17.4 6 14 6z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/></svg>
            <b>Dentistry</b>
            <span>14 UK dental schools loaded with cut-offs and weightings</span>
          </button>
          <button className="ud-track" onClick={() => onPick("med")}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 6v14a10 10 0 0 0 20 0V6M8 6h8M28 6h8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/><circle cx="38" cy="34" r="5" fill="none" stroke="currentColor" strokeWidth="2.4"/><path d="M22 30v4a10 10 0 0 0 11 9.9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
            <b>Medicine</b>
            <span>Interview prep live now, university dataset next</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ MOCK CENTRE ----------------------- */

function highlightEvidence(text, evidence) {
  const idx = text.indexOf(evidence);
  if (idx < 0) return <p className="ud-passage">{text}</p>;
  return (
    <p className="ud-passage">
      {text.slice(0, idx)}
      <mark className="ud-ev">{evidence}</mark>
      {text.slice(idx + evidence.length)}
    </p>
  );
}

/* Approximate raw-marks to scaled-score conversion. The UCAT is equated by
   Pearson each year and no official table is published, so this is a
   transparent piecewise estimate through sensible anchor points, not an
   exact figure. Scaled scores run 300 to 900 per cognitive subtest. */
const SCALE_ANCHORS = [
  [0.00, 300], [0.15, 380], [0.25, 440], [0.35, 500], [0.45, 560],
  [0.55, 610], [0.65, 660], [0.75, 720], [0.85, 790], [0.95, 870], [1.00, 900],
];
function marksToScale(marks, outOf) {
  if (!(outOf > 0)) return null;
  const m = Math.max(0, Math.min(Number(marks) || 0, outOf));
  const f = m / outOf;
  for (let i = 1; i < SCALE_ANCHORS.length; i++) {
    const [f0, s0] = SCALE_ANCHORS[i - 1];
    const [f1, s1] = SCALE_ANCHORS[i];
    if (f <= f1) return Math.round((s0 + ((f - f0) / (f1 - f0)) * (s1 - s0)) / 10) * 10;
  }
  return 900;
}
/* Old four-subtest total (out of 3600, when Abstract Reasoning existed)
   to the current three-subtest total (out of 2700). Dropping one subtest
   that scored the average of the others scales the whole total by 3/4,
   which maps 3600 to 2700 and 1200 to 900 exactly. */
function old3600to2700(v) {
  const t = Number(v);
  if (!isFinite(t) || t <= 0) return null;
  return Math.round((Math.max(1200, Math.min(3600, t)) * 0.75) / 10) * 10;
}

/* ---- Hyper-unique engines: pace, projection, readiness ---- */

const clamp900 = (v) => Math.max(300, Math.min(900, v));
const round10 = (v) => Math.round(v / 10) * 10;

/* Rhythm analysis for a drill log. Splits wrong answers into ones you
   rushed (well under your median time) and ones you laboured over (well
   over it), which is a more useful lens than a flat accuracy number. */
function analysePace(log) {
  const timed = (log || []).filter((l) => l && l.ms > 0);
  if (timed.length < 4) return null;
  const med = median(timed.map((l) => l.ms));
  const wrong = timed.filter((l) => !l.correct && (l.score || 0) < 1);
  const rushed = wrong.filter((l) => l.ms < med * 0.6).length;
  const laboured = wrong.filter((l) => l.ms > med * 1.5).length;
  let verdict;
  if (!wrong.length) verdict = "Clean and even. Nothing to fix in your rhythm this run.";
  else if (rushed > laboured) verdict = "Most errors came when you sped up. Give the trickier ones one extra beat before you commit.";
  else if (laboured > rushed) verdict = "Your errors clustered on the slow questions, where doubt crept in. Decide sooner and move on.";
  else verdict = "Errors are spread evenly across your pace, so this is technique rather than timing.";
  return { med, rushed, laboured, wrong: wrong.length, n: timed.length, verdict };
}

/* Live pace against an even split of the section clock: are you ahead of,
   on, or behind where the time says you should be. */
function paceState(reached, elapsedSec, totalSec, numQ) {
  if (!(totalSec > 0) || !numQ) return null;
  const expected = (elapsedSec / totalSec) * numQ;
  const diff = reached - expected;
  const tone = diff >= 1 ? "ahead" : diff <= -1.5 ? "behind" : "on";
  return { expected, diff, tone, behindBy: Math.max(0, Math.round(-diff)), aheadBy: Math.max(0, Math.round(diff)) };
}

/* Project a scaled score per practised section by fitting a line to your
   mock history and extending it to test day, then estimate a /2700 total
   (Decision Making, which the app does not drill, is assumed to sit at the
   average of your other sections and is labelled as such). Deliberately
   honest: needs at least two mocks in a section, and returns a band. */
function projectSection(pts, nowTs, targetTs) {
  if (!pts.length) return null;
  if (pts.length === 1) return { now: round10(pts[0].y), proj: round10(pts[0].y), n: 1 };
  const x0 = pts[0].x;
  const xs = pts.map((p) => (p.x - x0) / 86400000);
  const ys = pts.map((p) => p.y);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const b = den ? num / den : 0;
  const a = my - b * mx;
  const nowX = (nowTs - x0) / 86400000;
  const targetX = Math.max((targetTs - x0) / 86400000, nowX);
  return { now: round10(clamp900(a + b * nowX)), proj: round10(clamp900(a + b * targetX)), slope: b, n };
}
function projectScore(mockHist, examDate, nowTs = Date.now()) {
  const mh = (mockHist || []).filter((h) => h && (h.t === "vr" || h.t === "qr") && typeof h.pct === "number");
  if (!mh.length) return null;
  const targetTs = examDate && parseYmd(examDate) ? parseYmd(examDate).getTime() : nowTs + 21 * 86400000;
  const ptsOf = (t) => mh.filter((h) => h.t === t).sort((x, y) => x.ts - y.ts).map((h) => ({ x: h.ts, y: marksToScale(h.pct, 100) }));
  const vr = projectSection(ptsOf("vr"), nowTs, targetTs);
  const qr = projectSection(ptsOf("qr"), nowTs, targetTs);
  const have = [vr, qr].filter(Boolean);
  if (!have.length) return null;
  const totalPts = mh.length;
  const bothProj = have.map((s) => s.proj);
  const dm = round10(bothProj.reduce((a, b) => a + b, 0) / bothProj.length); /* assumed */
  const complete = !!(vr && qr);
  const total = complete ? vr.proj + qr.proj + dm : null;
  const spread = totalPts >= 4 ? 60 : 100;
  return {
    vr, qr, dm, complete,
    total: total ? { proj: total, lo: Math.max(900, total - spread), hi: Math.min(2700, total + spread) } : null,
    points: totalPts, targetTs,
  };
}

/* How many schools your projected/best UCAT clears the realistic bar at,
   for the score-to-shortlist tie-in. Uses each school's published low bar
   (medicine) or cut-off (dentistry). */
function schoolsInRange(total, track, medSchools, unis) {
  if (!total) return null;
  if (track === "med") {
    const withBar = medSchools.filter((u) => typeof u.low === "number");
    return { inRange: withBar.filter((u) => total >= u.low).length, total: withBar.length };
  }
  const withBar = unis.filter((u) => typeof u.cut === "number");
  return { inRange: withBar.filter((u) => total >= u.cut).length, total: withBar.length };
}

/* A single readiness number from the things that actually predict a good
   sitting: your scores, how many sections you have touched, plan progress
   and recent consistency. Weighted, 0 to 100, with the breakdown shown. */
function readinessScore({ best, history, plan, customPlan, examDate }) {
  const secBest = (sec) => {
    const ids = DRILLS.filter((d) => d.section === sec).map((d) => d.id);
    const vals = ids.map((id) => best && best[id] && best[id].pct).filter((v) => typeof v === "number");
    return vals.length ? Math.max(...vals) : null;
  };
  const scores = ["VR", "QR", "SJT"].map(secBest);
  const got = scores.filter((s) => s !== null);
  const avgScore = got.length ? got.reduce((a, b) => a + b, 0) / got.length / 100 : 0;
  const covered = got.length / 3;
  const streak = currentStreak(history);
  const streakF = Math.min(streak / 7, 1);
  const planDone = PLAN_KEYS.filter((k) => plan && plan[k]).length + (customPlan || []).filter((x) => plan && plan[`cust:${x.id}`]).length;
  const planTotal = PLAN_KEYS.length + (customPlan || []).length;
  const planF = planTotal ? Math.min(planDone / Math.min(planTotal, 20), 1) : 0;
  const recent = (history || []).filter((h) => Date.now() - h.ts < 7 * 86400000).length;
  const activityF = Math.min(recent / 8, 1);
  const score = Math.round(100 * (0.30 * avgScore + 0.25 * covered + 0.20 * planF + 0.15 * activityF + 0.10 * streakF));
  const band = score >= 75 ? "On track" : score >= 45 ? "Getting there" : "Early days";
  return {
    score, band,
    factors: [
      { label: "Scores", pct: Math.round(avgScore * 100) },
      { label: "Coverage", pct: Math.round(covered * 100) },
      { label: "Plan", pct: Math.round(planF * 100) },
      { label: "Consistency", pct: Math.round(((streakF + activityF) / 2) * 100) },
    ],
    daysLeft: daysUntil(examDate),
  };
}

function ScoreConverter() {
  const [rows, setRows] = useState([
    { key: "vr", name: "Verbal Reasoning", out: 44, marks: "" },
    { key: "dm", name: "Decision Making", out: 35, marks: "" },
    { key: "qr", name: "Quantitative Reasoning", out: 36, marks: "" },
  ]);
  const [old, setOld] = useState("");
  /* Marks can never exceed the paper's maximum, so clamp on entry rather
     than only inside the score maths, or the box shows an impossible mark. */
  const setMarks = (k, v) => setRows((rs) => rs.map((r) => {
    if (r.key !== k) return r;
    if (v === "") return { ...r, marks: "" };
    const out = Math.max(0, Number(r.out) || 0);
    const n = Math.max(0, Math.min(Math.floor(Number(v) || 0), out));
    return { ...r, marks: String(n) };
  }));
  const setOut = (k, v) => setRows((rs) => rs.map((r) => {
    if (r.key !== k) return r;
    const out = Math.max(1, Math.min(Math.floor(Number(v) || 1), 200));
    const marks = r.marks !== "" && Number(r.marks) > out ? String(out) : r.marks;
    return { ...r, out, marks };
  }));
  const scaled = rows.map((r) => ({ ...r, s: r.marks === "" ? null : marksToScale(r.marks, Number(r.out) || 0) }));
  const allIn = scaled.every((r) => r.s !== null);
  const total = allIn ? scaled.reduce((a, r) => a + r.s, 0) : null;
  const conv = old3600to2700(old);

  return (
    <div className="sconv">
      <div className="sconv-head">
        <h3>UCAT score converter</h3>
        <p>Turn mock marks into an estimated scaled score, and old out-of-3600 totals into today's out-of-2700 scale.</p>
      </div>
      <div className="sconv-cols">
        <div className="sconv-tool">
          <div className="sconv-t">Marks to scaled score</div>
          <div className="sconv-grid">
            <span className="sc-h" />
            <span className="sc-h">Marks</span>
            <span className="sc-h">Out of</span>
            <span className="sc-h">Score</span>
            {scaled.map((r) => (
              <React.Fragment key={r.key}>
                <span className="sc-name">{r.name}</span>
                <input type="number" min="0" max={r.out} value={r.marks} onChange={(e) => setMarks(r.key, e.target.value)} aria-label={`${r.name} marks`} />
                <input type="number" min="1" max="200" value={r.out} onChange={(e) => setOut(r.key, e.target.value)} aria-label={`${r.name} out of`} />
                <span className="sc-out">{r.s == null ? "–" : r.s}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="sconv-total">
            <span>Estimated total</span>
            <b>{total == null ? "enter all three" : `${total} / 2700`}</b>
          </div>
          <p className="sconv-mini">Situational Judgement is banded 1 to 4 and is not part of this total. Decision Making has some two-mark items, so set its "out of" to your mock's maximum.</p>
        </div>
        <div className="sconv-tool">
          <div className="sconv-t">Old /3600 to /2700</div>
          <p className="sconv-mini" style={{ marginTop: 0 }}>Before 2024 the UCAT had a fourth subtest (Abstract Reasoning) and totals ran to 3600. Enter an old total to see the equivalent on today's scale.</p>
          <div className="sconv-old">
            <input type="number" min="1200" max="3600" value={old} placeholder="e.g. 2600" onChange={(e) => setOld(e.target.value)} aria-label="Old total out of 3600" />
            <span className="sconv-arrow">→</span>
            <b>{conv == null ? "– / 2700" : `${conv} / 2700`}</b>
          </div>
        </div>
      </div>
      <p className="sconv-note">Estimate only. Pearson scales the UCAT with a different equating table every year and publishes none of them, so treat these as a guide for pacing your practice, never as your real score.</p>
    </div>
  );
}

/* Keep one row per name (their best), sorted high to low, earliest wins
   ties. Guards against malformed rows so one bad entry cannot break the
   board. */
function dedupeBest(entries) {
  const byName = new Map();
  for (const e of entries || []) {
    if (!e || typeof e.name !== "string" || typeof e.pct !== "number" || typeof e.ts !== "number") continue;
    const cur = byName.get(e.name);
    if (!cur || e.pct > cur.pct || (e.pct === cur.pct && e.ts < cur.ts)) byName.set(e.name, e);
  }
  return [...byName.values()].sort((a, b) => b.pct - a.pct || a.ts - b.ts);
}
const nameHue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const MEDAL_COL = ["#E8B923", "#AEB4BD", "#C6884E"];

function Avatar({ name, size = 34, place }) {
  const initial = (String(name).trim()[0] || "?").toUpperCase();
  const h = nameHue(name);
  const ring = place && place <= 3 ? MEDAL_COL[place - 1] : "transparent";
  return (
    <span className="lb-ava" style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${h} 42% 42%)`, boxShadow: place && place <= 3 ? `0 0 0 2px var(--card), 0 0 0 4px ${ring}` : "none" }}>{initial}</span>
  );
}

function Laurel({ size = 64, color = "#E8B923" }) {
  const leaf = (cx, cy, rot) => <ellipse cx={cx} cy={cy} rx="3.2" ry="1.6" fill={color} opacity="0.9" transform={`rotate(${rot} ${cx} ${cy})`} />;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d="M22 56 C9 49 8 29 19 16" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M42 56 C55 49 56 29 45 16" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {[[18, 20, 40], [15, 27, 25], [13, 35, 8], [14, 43, -8], [18, 50, -28]].map(([x, y, r], i) => <g key={"l" + i}>{leaf(x, y, r)}</g>)}
      {[[46, 20, 140], [49, 27, 155], [51, 35, 172], [50, 43, 188], [46, 50, 208]].map(([x, y, r], i) => <g key={"r" + i}>{leaf(x, y, r)}</g>)}
    </svg>
  );
}

/* Circular percentile gauge for the standing panel. The arc animates from
   empty to its target on mount via CSS custom properties. */
function Ring({ pct, label, sub, gold }) {
  const R = 26, C = 2 * Math.PI * R;
  const off = C * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="lb-ring">
      <svg viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
        <circle cx="32" cy="32" r={R} fill="none" stroke="var(--paperline)" strokeWidth="6" />
        <circle className="lb-ring-arc" cx="32" cy="32" r={R} fill="none" stroke={gold ? "#E8B923" : "var(--signal)"} strokeWidth="6" strokeLinecap="round" transform="rotate(-90 32 32)" style={{ strokeDasharray: C, strokeDashoffset: off, "--circ": C, "--off": off }} />
      </svg>
      <div className="lb-ring-c"><b className="mono">{label}</b><span>{sub}</span></div>
    </div>
  );
}

/* The full mock leaderboard: a champion podium, a your-standing panel with
   percentile, a ranked list that pins your row when you fall outside the
   top, a score distribution, and honest device-only vs global labelling. */
function MockLeaderboard({ entries, you, boardGlobal }) {
  const [view, setView] = useState("top");
  const list = dedupeBest(entries);
  const N = list.length;
  if (N === 0) {
    return (
      <>
        <div className="ud-sec"><h2>This week's board</h2><i /><span>empty</span></div>
        <div className="lb-empty"><Laurel size={44} /><p>No scores yet this week. Post one and you set the bar for everyone who sits it after you.</p></div>
      </>
    );
  }
  const youIdx = you ? list.findIndex((e) => e.name === you.name && e.pct === you.pct) : -1;
  const youRank = youIdx >= 0 ? youIdx + 1 : null;
  const avg = Math.round(list.reduce((a, e) => a + e.pct, 0) / N);
  const scaledOf = (p) => marksToScale(p, 100);
  const topPct = youRank ? Math.max(1, Math.round((youRank / N) * 100)) : null;
  const ahead = youRank && N > 1 ? Math.round(((N - youRank) / (N - 1)) * 100) : null;

  const podium = list.slice(0, 3);
  const podOrder = [podium[1], podium[0], podium[2]].map((e, k) => (e ? { e, place: [2, 1, 3][k] } : null)).filter(Boolean);
  const canAround = youRank && N > 12;
  const around = view === "me" && youRank;
  let displayRows;
  if (around) {
    const start = Math.max(0, Math.min(youIdx - 4, N - 11));
    displayRows = list.slice(start, start + 11).map((e, k) => ({ e, place: start + k + 1 }));
  } else {
    displayRows = list.slice(0, 12).map((e, n) => ({ e, place: n + 1 }));
  }
  const youOutside = !around && youRank && youRank > 12;

  const bins = Array.from({ length: 10 }, () => 0);
  list.forEach((e) => { bins[Math.min(9, Math.floor(e.pct / 10))]++; });
  const maxBin = Math.max(...bins, 1);
  const youBin = you ? Math.min(9, Math.floor(you.pct / 10)) : -1;
  const avgBin = Math.min(9, Math.floor(avg / 10));

  const RankCell = (place) => place <= 3
    ? <span className="lb-medal" style={{ color: MEDAL_COL[place - 1] }} aria-label={`Rank ${place}`}><svg viewBox="0 0 24 24" width="20" height="20"><path d="M8.5 2l1.8 5M15.5 2l-1.8 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /><circle cx="12" cy="15" r="6.4" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.5" /><text x="12" y="18" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="currentColor" fontFamily="Inter, system-ui, sans-serif">{place}</text></svg></span>
    : <span className="lb-rank mono">{place}</span>;

  const Row = (e, place) => {
    const mine = you && e.name === you.name && e.pct === you.pct;
    return (
      <div className={`lb-row${mine ? " me" : ""}`} key={`${e.name}-${e.ts}`} style={{ animationDelay: `${Math.min(place, 12) * 35}ms` }}>
        {RankCell(place)}
        <Avatar name={e.name} place={place} />
        <span className="lb-name">{e.name}{mine && <em>you</em>}</span>
        <span className="lb-bar"><i style={{ width: `${e.pct}%`, background: place <= 3 ? MEDAL_COL[place - 1] : "var(--signal)" }} /></span>
        <span className="lb-pct mono">{e.pct}%</span>
      </div>
    );
  };

  return (
    <>
      <div className="ud-sec"><h2>This week's board</h2><i /><span>{N} {N === 1 ? "entry" : "entries"}</span></div>

      {you && youRank && (
        <div className={`lb-standing r${Math.min(youRank, 4)}`}>
          {youRank === 1 && <div className="lb-crown"><Laurel size={58} /></div>}
          <Ring pct={youRank === 1 ? 100 : (ahead == null ? 100 : ahead)} label={`#${youRank}`} sub={`of ${N}`} gold={youRank === 1} />
          <div className="lb-stand-mid">
            <b>{youRank === 1 ? "Top of the board" : `Top ${topPct}% this week`}</b>
            <span>{N === 1 ? "First to post. You set the pace." : youRank === 1 ? "Nobody has beaten you yet." : `Ahead of ${ahead}% of everyone who has sat it.`}</span>
          </div>
          <div className="lb-stand-score"><b className="mono">{you.pct}%</b><span>~{scaledOf(you.pct)} scaled est.</span></div>
        </div>
      )}

      {podOrder.length > 0 && (
        <div className="lb-podium">
          {podOrder.map(({ e, place }) => {
            const mine = you && e.name === you.name && e.pct === you.pct;
            return (
              <div className={`lb-pod p${place}${mine ? " me" : ""}`} key={`${e.name}-${e.ts}`}>
                {place === 1 && <div className="lb-pod-crown"><Laurel size={40} /></div>}
                <Avatar name={e.name} size={place === 1 ? 52 : 42} place={place} />
                <span className="lb-pod-name">{e.name}</span>
                <span className="lb-pod-pct mono">{e.pct}%</span>
                <div className="lb-pod-base" style={{ background: MEDAL_COL[place - 1] }}><span>{place}</span></div>
              </div>
            );
          })}
        </div>
      )}

      {canAround && (
        <div className="lb-viewtabs">
          <button className={view === "top" ? "on" : ""} onClick={() => setView("top")}>Top 12</button>
          <button className={view === "me" ? "on" : ""} onClick={() => setView("me")}>Around you</button>
        </div>
      )}
      <div className="lb-list">
        {around && displayRows[0] && displayRows[0].place > 1 && <div className="lb-gap">· · ·</div>}
        {displayRows.map(({ e, place }) => Row(e, place))}
        {youOutside && (
          <>
            <div className="lb-gap">· · ·</div>
            {Row(list[youIdx], youRank)}
          </>
        )}
      </div>

      <div className="lb-dist">
        <div className="lb-dist-head"><span>Score spread</span><span className="mono">avg {avg}%</span></div>
        <div className="lb-bins">
          {bins.map((c, b) => (
            <div key={b} className={`lb-bin${b === youBin ? " you" : ""}${b === avgBin ? " avg" : ""}`} title={`${b * 10}-${b * 10 + 9}%: ${c}`}>
              <i style={{ height: `${(c / maxBin) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="lb-bins-x"><span>0%</span><span>50%</span><span>100%</span></div>
        {you && <div className="lb-dist-key"><span className="k you">your score</span><span className="k avg">average</span></div>}
      </div>

      <p className="lb-foot">{boardGlobal
        ? "Best score per name, ranked. The board is shared across everyone sitting this mock and resets weekly."
        : "Best score per name, ranked. Saved on this device for now, so you are racing your own past attempts. A shared board across everyone arrives with accounts. Resets weekly."}</p>
    </>
  );
}

function MockCentre({ unlocked, prefs, setPrefs }) {
  const week = weekNumber();
  const [type, setType] = useState("vr");
  const [slot, setSlot] = useState(0);
  const [mini, setMini] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [confirmExit, setConfirmExit] = useState(false);
  const [mock, setMock] = useState(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [seen, setSeen] = useState([]);
  const [flags, setFlags] = useState([]);
  const [navOpen, setNavOpen] = useState(false);
  const [left, setLeft] = useState(0);
  const [board, setBoard] = useState(null);
  const [name, setName] = useState(prefs.name || "");
  const [submitted, setSubmitted] = useState(false);
  const [delta, setDelta] = useState(null);
  const [shared, setShared] = useState("");
  const answersRef = useRef([]);
  const savedHistRef = useRef(false);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  /* True only when a real cross-device backend (Supabase) is live.
     Until then boards live on this device, so the copy must say so. */
  const boardGlobal = sharedIsGlobal();
  const lbKey = `lb:${mini ? "mini-" : ""}${type}:w${week}:s${slot}`;

  const finish = useCallback((ans, m) => {
    setAnswers(ans);
    setPhase("review");
    (async () => {
      const list = await getSharedJSON(lbKey, []);
      setBoard(Array.isArray(list) ? list : []);
    })();
  }, [lbKey]);

  useEffect(() => {
    if (phase !== "run" || !mock) return;
    const t = setInterval(() => setLeft((n) => {
      if (n <= 1) {
        clearInterval(t);
        const ans = [...answersRef.current];
        while (ans.length < mock.flat.length) ans.push(null);
        finish(ans, mock);
        return 0;
      }
      return n - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [phase, mock, finish]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const startMock = (t, sl, isMini) => {
    const m = t === "vr" ? buildVrMock(week, sl, isMini) : t === "sjt" ? buildSjtMock(week, sl, isMini) : buildQrMock(week, sl, isMini);
    setType(t); setSlot(sl); setMini(!!isMini); setMock(m);
    setPhase("run"); setI(0); setAnswers(Array(m.flat.length).fill(null)); setSeen([0]); setFlags([]); setNavOpen(false); setLeft(m.secs);
    setSubmitted(false); setBoard(null);
  };

  /* Free navigation: selecting an option records it in place, and you
     move with Next, Previous or the Navigator, as in the real UCAT. */
  const select = (val) => setAnswers((a) => { const c = [...a]; c[i] = val; return c; });
  const go = (idx) => { setSeen((s) => (s.includes(idx) ? s : [...s, idx])); setI(idx); setNavOpen(false); };
  const next = () => { if (i + 1 < mock.flat.length) go(i + 1); else finish(answersRef.current, mock); };
  const prev = () => { if (i > 0) go(i - 1); };
  const toggleFlag = () => setFlags((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i]));

  const isRight = (q, given) => (q.a !== undefined ? given === q.a : given === q.answer);
  /* SJT scores partial marks one step away, as the real section does. */
  const scoreOf = (q, given) => {
    if (given === null || given === undefined) return 0;
    if (q.sjt) { const d = Math.abs(given - q.a); return d === 0 ? 1 : d === 1 ? 0.5 : 0; }
    return isRight(q, given) ? 1 : 0;
  };
  const score = mock ? mock.flat.reduce((s, q, n) => s + scoreOf(q, answers[n]), 0) : 0;
  const pct = mock ? Math.round((score / mock.flat.length) * 100) : 0;

  /* Once per finished mock: work out how this result compares to your own
     past attempts at the same section, then record it. This drives the
     personal-best and beat-your-last badges. Guarded so it saves once. */
  useEffect(() => {
    if (phase !== "review" || !mock) { savedHistRef.current = false; return; }
    if (savedHistRef.current) return;
    savedHistRef.current = true;
    const mh = prefs.mockHist || [];
    const same = mh.filter((h) => h.t === type);
    const prevBest = same.length ? Math.max(...same.map((h) => h.pct)) : null;
    const prevLast = same.length ? same[same.length - 1].pct : null;
    setDelta({ prevBest, prevLast, isPB: prevBest === null || pct > prevBest, first: same.length === 0 });
    setPrefs({ ...prefs, mockHist: [...mh, { t: type, pct, ts: Date.now() }].slice(-60) });
  }, [phase, mock]);

  /* Build a square share card on a canvas and either open the native share
     sheet (with the image) or download it. Pure client-side, no upload. */
  const shareCard = async () => {
    try {
      const S = 1080, cv = document.createElement("canvas"); cv.width = S; cv.height = S;
      const g = cv.getContext("2d");
      g.fillStyle = "#0E1319"; g.fillRect(0, 0, S, S);
      g.fillStyle = "#F5A524"; g.fillRect(0, 0, S, 12);
      g.textAlign = "left";
      g.fillStyle = "#F5A524"; g.font = "700 44px Inter, system-ui, sans-serif"; g.fillText("Tempo", 80, 130);
      g.fillStyle = "#6B7C90"; g.font = "500 26px Inter, system-ui, sans-serif"; g.fillText("UCAT trainer", 80, 168);
      g.fillStyle = "#98AABD"; g.font = "600 34px Inter, system-ui, sans-serif";
      g.fillText(`${type.toUpperCase()} ${mini ? "Mini" : "Mock " + "ABC"[slot]} · week ${week % 1000}`, 80, 300);
      g.textAlign = "center";
      g.fillStyle = "#E9F0F8"; g.font = "800 320px Inter, system-ui, sans-serif"; g.fillText(`${pct}`, S / 2 - 40, 640);
      g.fillStyle = "#F5A524"; g.font = "800 90px Inter, system-ui, sans-serif"; g.fillText("%", S / 2 + 210, 600);
      g.fillStyle = "#98AABD"; g.font = "500 30px Inter, system-ui, sans-serif";
      g.fillText(`${score} of ${mock.flat.length} correct  ·  ~${marksToScale(pct, 100)} scaled est.`, S / 2, 720);
      if (delta && delta.isPB && !delta.first) { g.fillStyle = "#3ECF8E"; g.font = "700 40px Inter, system-ui, sans-serif"; g.fillText("New personal best", S / 2, 810); }
      g.fillStyle = "#47596E"; g.font = "500 24px Inter, system-ui, sans-serif"; g.fillText("Original UCAT practice on a replica exam screen", S / 2, 1000);
      const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
      if (!blob) return;
      const file = new File([blob], "tempo-result.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Tempo UCAT mock", text: `${pct}% on ${type.toUpperCase()} ${mini ? "Mini" : "Mock " + "ABC"[slot]}` });
        setShared("Shared.");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "tempo-result.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        setShared("Saved to your device.");
      }
    } catch (e) { setShared("Could not share, try again."); }
  };

  const submitScore = async () => {
    if (submitted) return; /* one submission per result, no double-post */
    const nm = cleanName(name);
    if (nm.length < 2) return;
    const safePct = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    setSubmitted(true);
    setPrefs({ ...prefs, name: nm });
    try {
      let list = await getSharedJSON(lbKey, []);
      if (!Array.isArray(list)) list = [];
      /* Only keep well-formed rows, so one bad entry cannot poison the board. */
      list = list.filter((e) => e && typeof e.name === "string" && typeof e.pct === "number" && typeof e.ts === "number");
      list.push({ name: nm, pct: safePct, ts: Date.now() });
      list = list.slice(-200);
      await setSharedJSON(lbKey, list);
      setBoard(list);
    } catch (e) { /* leaderboard unavailable; keep local result */ }
  };


  /* ---------- idle: chooser ---------- */
  if (phase === "idle") {
    const slots = mini ? [0, 1, 2, 3, 4] : [0, 1, 2];
    const full = type === "vr"
      ? { count: VR_MOCK_QCOUNT, mins: Math.round(VR_MOCK_SECONDS / 60), note: "Full length: 44 questions in 22 minutes, the exam's 30-second pace. Fresh passage combinations every week; everyone sits the identical paper." }
      : type === "sjt"
      ? { count: 69, mins: 26, note: "Full length: 69 appropriateness and importance questions in 26 minutes, matching the real section. Partial marks one step away, as the exam scores them." }
      : { count: QR_MOCK_QCOUNT, mins: 26, note: "Full length: 36 questions in 26 minutes, matching the real section. Freshly generated each week; everyone sits the identical paper." };
    const note = mini
      ? "Short papers for a spare ten minutes, at the exam's pace: five each for VR and QR, fresh every week."
      : full.note;
    return (
      <div className="ud-wrap">
        <div className="ud-sec" style={{ paddingTop: 32 }}><h2>{mini ? "Mini mocks" : "Weekly mocks"}</h2><i /><span>week {week % 1000} · boards reset weekly</span></div>
        <div className="ud-mode" style={{ paddingTop: 14 }}>
          <span>Length</span>
          <button className={!mini ? "on" : ""} onClick={() => setMini(false)}>Full mock</button>
          <button className={mini ? "on" : ""} onClick={() => setMini(true)}>Mini, five each</button>
        </div>
        <div className="ud-mode" style={{ paddingTop: 10 }}>
          <span>Section</span>
          <button className={type === "vr" ? "on" : ""} onClick={() => setType("vr")}>Verbal Reasoning</button>
          <button className={type === "qr" ? "on" : ""} onClick={() => setType("qr")}>Quantitative Reasoning</button>
          <button className={type === "sjt" ? "on" : ""} onClick={() => setType("sjt")}>Situational Judgement</button>
        </div>
        <p className="ud-learn-intro">{note} No feedback until the end, one clock, no pausing. Your score joins this week's board, {boardGlobal ? "shared with everyone sitting it" : "kept on this device"}.</p>
        <div className="ud-subs" style={{ paddingTop: 16 }}>
          {slots.map((sl) => (
            <button key={sl} className="ud-sub" disabled={!unlocked} onClick={() => startMock(type, sl, mini)} style={{ padding: "16px 15px" }}>
              <b>{type.toUpperCase()} {mini ? `Mini ${sl + 1}` : `Mock ${"ABC"[sl]}`}</b>
              <span>{mini ? "quick timed paper" : `${full.count} questions · ${full.mins}:00`} · this week's paper{unlocked ? "" : " · locked"}</span>
            </button>
          ))}
        </div>

        <ScoreConverter />

        <p className="ud-empty" style={{ paddingTop: 12 }}>
          {boardGlobal
            ? "Leaderboard names and scores are visible to everyone using this app, so use initials or a nickname if you prefer. Boards are per mock, per week."
            : "Leaderboards are saved on this device only for now, so you are comparing against your own attempts. A shared board across everyone sitting the mock arrives once accounts are connected. Boards are per mock, per week."}
        </p>

        <div className="mock-official">
          <div className="mo-head">
            <h3>Sit the official UCAT mocks too</h3>
            <p>Our weekly mocks build pace and technique. Before test day, always do the real thing at least once: the official practice tests run on the exact Pearson VUE interface you sit on the day, so nothing about the screen surprises you.</p>
          </div>
          <div className="mo-links">
            <a className="mo-link" href="https://www.ucat.ac.uk/preparation/practice-tests/" target="_blank" rel="noopener noreferrer">
              <b>Official UCAT practice tests →</b>
              <span>Free full mocks and question banks on the official UCAT site, in the real exam interface.</span>
            </a>
            <a className="mo-link" href="https://www.ucat.ac.uk/ucat/preparation/" target="_blank" rel="noopener noreferrer">
              <b>UCAT preparation hub →</b>
              <span>The official preparation guide, tutorials and the on-screen calculator practice.</span>
            </a>
          </div>
          <p className="mo-foot">External links to ucat.ac.uk. We are independent and not affiliated with the UCAT Consortium. Always confirm details on the official site.</p>
        </div>
      </div>
    );
  }

  /* ---------- run ---------- */
  if (phase === "run") {
    const q = mock.flat[i];
    const gmax = q.graph ? Math.max(...q.graph.values) : 1;
    return (
      <div className="ud-run">
        <ExitGuard open={confirmExit} onStay={() => setConfirmExit(false)} onLeave={() => { setConfirmExit(false); finish(answersRef.current, mock); }} />
        <div className="ud-runbar">
          <BrandMark onClick={() => setConfirmExit(true)} />
          <div className={`ud-clock mono${left < 60 ? " warn" : ""}`}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>
          <span className="ud-examflag">MOCK</span>
          {(() => {
            const ps = paceState(i, mock.secs - left, mock.secs, mock.flat.length);
            if (!ps) return null;
            const txt = ps.tone === "ahead" ? `Ahead ${ps.aheadBy}` : ps.tone === "behind" ? `Behind ${ps.behindBy}` : "On pace";
            return <span className={`pace-chip ${ps.tone}`} aria-label={`Pace: ${txt}`}>{txt}</span>;
          })()}
          <div className="ud-prog"><i style={{ width: `${(i / mock.flat.length) * 100}%` }} /></div>
          <span className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{i + 1}/{mock.flat.length}</span>
          <button className={`ud-quit${flags.includes(i) ? " on" : ""}`} onClick={toggleFlag} aria-pressed={flags.includes(i)}>{flags.includes(i) ? "⚑ Flagged" : "⚑ Flag"}</button>
          <button className="ud-quit" onClick={() => setConfirmExit(true)}>End</button>
        </div>
        <div className="ud-stage">
          <div className="ud-panel">
            <h4>{mock.title}{q.passage ? ` · ${q.passage.title}` : ""}</h4>
            {q.passage && <p className="ud-passage" style={{ marginBottom: 16 }}>{q.passage.text}</p>}
            {q.table && (
              <div className="qs-tab">
                <p className="cap">{q.table.title}</p>
                <table>
                  <thead><tr><th />{q.table.cols.map((cl) => <th key={cl}>{cl}</th>)}</tr></thead>
                  <tbody>
                    {q.table.rows.map((rw, ri) => (
                      <tr key={rw}><th>{rw}</th>{q.table.data[ri].map((v, vi) => <td key={vi}>{q.table.money ? "£" : ""}{v.toLocaleString()}{q.table.unit}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {q.context && <p className="ud-context">{q.context}</p>}
            {q.graph && (
              <>
                <div className="ud-graph">
                  {q.graph.values.map((v, n) => (
                    <div key={n} className="bar" style={{ height: `${(v / gmax) * 100}%` }}><span>{v}</span></div>
                  ))}
                </div>
                <div className="ud-graph-x">{q.graph.labels.map((l) => <span key={l}>{l}</span>)}</div>
              </>
            )}
            {q.venn3 && (
              <svg viewBox="0 0 300 178" style={{ width: "100%", maxWidth: 330, margin: "4px 0 12px" }} aria-label="Three-set Venn diagram">
                <rect x="1" y="1" width="298" height="176" fill="#fff" stroke="#9DB2C8" rx="4" />
                <circle cx="112" cy="66" r="47" fill="#2F71B81f" stroke="#2F71B8" strokeWidth="1.4" />
                <circle cx="182" cy="66" r="47" fill="#F5A5241f" stroke="#B97A0E" strokeWidth="1.4" />
                <circle cx="147" cy="118" r="47" fill="#3ECF8E1f" stroke="#1E8E5A" strokeWidth="1.4" />
                <text x="66" y="18" fontSize="10.5" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn3.la}</text>
                <text x="196" y="18" fontSize="10.5" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn3.lb}</text>
                <text x="188" y="164" fontSize="10.5" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn3.lc}</text>
                <text x="86" y="60" fontSize="13" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.a}</text>
                <text x="208" y="60" fontSize="13" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.b}</text>
                <text x="147" y="146" fontSize="13" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.c}</text>
                <text x="147" y="52" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.ab}</text>
                <text x="113" y="106" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.ac}</text>
                <text x="181" y="106" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.bc}</text>
                <text x="147" y="88" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn3.abc}</text>
                <text x="34" y="164" fontSize="10.5" fill="#5A6675" fontFamily="Inter, system-ui, sans-serif">{q.venn3.none} neither</text>
              </svg>
            )}
            {q.venn && (
              <svg viewBox="0 0 300 140" style={{ width: "100%", maxWidth: 320, margin: "4px 0 12px" }} aria-label="Venn diagram">
                <rect x="1" y="1" width="298" height="138" fill="#fff" stroke="#9DB2C8" rx="4" />
                <circle cx="115" cy="70" r="48" fill="#2F71B822" stroke="#2F71B8" strokeWidth="1.5" />
                <circle cx="185" cy="70" r="48" fill="#F5A52422" stroke="#B97A0E" strokeWidth="1.5" />
                <text x="90" y="20" fontSize="11" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn.la}</text>
                <text x="178" y="20" fontSize="11" fill="#10233A" fontFamily="Inter, system-ui, sans-serif">{q.venn.lb}</text>
                <text x="95" y="75" fontSize="14" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn.onlyA}</text>
                <text x="150" y="75" fontSize="14" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn.both}</text>
                <text x="205" y="75" fontSize="14" fontWeight="700" fill="#10233A" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{q.venn.onlyB}</text>
                <text x="252" y="130" fontSize="11" fill="#5A6675" fontFamily="Inter, system-ui, sans-serif">{q.venn.neither} neither</text>
              </svg>
            )}
            {q.scenarioText && <p className="ud-scenario">{q.scenarioText}</p>}
            {q.framing && <p className="ud-qs" style={{ fontWeight: 600 }}>{q.framing}</p>}
            <p className="ud-qs">{q.stem || q.prompt}</p>
            {(q.options).map((o, n) => {
              const val = type === "vr" || type === "sjt" ? n : o;
              const sel = answers[i] === val;
              return (
                <button key={n} className={`ud-opt${sel ? " sel" : ""}`} onClick={() => select(val)} aria-pressed={sel}>
                  <b>{String.fromCharCode(65 + n)}</b>{o}
                </button>
              );
            })}
            <p className="ud-hint">No feedback until the end. Move with Previous, Next or the Navigator. Aim for {mock.perQ} seconds a question.</p>
          </div>
        </div>
        <div className="ud-mockfoot">
          <button className="mock-navbtn" onClick={() => setConfirmExit(true)}>End exam</button>
          <span style={{ flex: 1 }} />
          <button className="mock-navbtn" onClick={prev} disabled={i === 0}>◀ Previous</button>
          <button className="mock-navbtn" onClick={() => setNavOpen(true)}>Navigator</button>
          <button className="mock-navbtn main" onClick={next}>{i + 1 >= mock.flat.length ? "Finish ▶" : "Next ▶"}</button>
        </div>
        {navOpen && (
          <div className="ud-modal" onClick={() => setNavOpen(false)}>
            <div className="nav-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Question navigator">
              <div className="nav-head"><b>Navigator</b><span>select a question to go to it</span></div>
              <div className="nav-grid">
                <div className="nav-row nav-hd"><span>Question</span><span>Status</span><span>Review</span></div>
                {mock.flat.map((_, n) => {
                  const answered = answers[n] !== null && answers[n] !== undefined;
                  const status = answered ? "Answered" : seen.includes(n) ? "Incomplete" : "Unseen";
                  return (
                    <button key={n} className={`nav-row${n === i ? " cur" : ""}`} onClick={() => go(n)}>
                      <span>Question {n + 1}</span>
                      <span className={answered ? "ok" : "no"}>{status}</span>
                      <span className="flag">{flags.includes(n) ? "Flagged" : ""}</span>
                    </button>
                  );
                })}
              </div>
              <div className="nav-foot">
                <span>{mock.flat.filter((_, n) => answers[n] === null || answers[n] === undefined).length} unseen or incomplete</span>
                <button className="ud-btn ghost" onClick={() => setNavOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------- review ---------- */
  const wrong = mock.flat.map((q, n) => ({ q, given: answers[n], n })).filter((x) => !isRight(x.q, x.given));
  return (
    <div className="ud-wrap ud-res">
      <div className="ud-eyebrow">{type.toUpperCase()} · {mock.title} · week {week % 1000}</div>
      <p className="ud-score">{pct}<small>%</small></p>
      {delta && (
        <div className="res-badges">
          {delta.first ? (
            <span className="res-badge first">First {type.toUpperCase()} mock logged</span>
          ) : delta.isPB ? (
            <span className="res-badge pb">Personal best · beat {delta.prevBest}%</span>
          ) : (
            <span className={`res-badge ${pct >= delta.prevLast ? "up" : "down"}`}>
              {pct >= delta.prevLast ? "▲" : "▼"} {Math.abs(pct - delta.prevLast)}% vs your last · best {delta.prevBest}%
            </span>
          )}
        </div>
      )}
      <div className="ud-stats" style={{ marginTop: 16 }}>
        <div className="ud-stat"><b className="mono">{score}/{mock.flat.length}</b><span>Correct</span></div>
        <div className="ud-stat"><b className="mono">~{marksToScale(pct, 100)}</b><span>Scaled estimate</span></div>
      </div>
      <div className="res-share">
        <button className="ud-btn" onClick={shareCard}>Share result card</button>
        {shared && <span className="res-shared">{shared}</span>}
      </div>

      <div className="ud-sec"><h2>Review screen</h2><i /><span>green right, red wrong, grey skipped</span></div>
      <div className="ud-reviewgrid" role="list" aria-label="Question results">
        {mock.flat.map((q, n) => {
          const given = answers[n];
          const unans = given === null || given === undefined;
          const ok = !unans && isRight(q, given);
          return (
            <a key={n} href={`#mockq${n}`} className={`rv ${unans ? "skip" : ok ? "ok" : "no"}`} role="listitem"
              aria-label={`Question ${n + 1}: ${unans ? "skipped" : ok ? "correct" : "wrong"}${flags.includes(n) ? ", flagged" : ""}`}>
              {n + 1}{flags.includes(n) ? <i className="fl" aria-hidden="true">⚑</i> : null}
            </a>
          );
        })}
      </div>

      {!submitted && (
        <div className="ud-config" style={{ marginTop: 22 }}>
          <div className="grp">
            <label>{boardGlobal ? "Join this week's board (name is public)" : "Save to this week's board (this device only for now)"}</label>
            <div className="row">
              <input className="ud-input" style={{ maxWidth: 180, fontSize: 14, padding: 10, background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--line)" }}
                value={name} onChange={(e) => setName(e.target.value)} placeholder="Name or initials" maxLength={12} />
              <button className="ud-btn" onClick={submitScore} disabled={name.trim().length < 2}>Submit score</button>
            </div>
          </div>
        </div>
      )}

      <MockLeaderboard
        entries={board || []}
        you={submitted ? { name: cleanName(name), pct: Math.max(0, Math.min(100, Math.round(Number(pct) || 0))) } : null}
        boardGlobal={boardGlobal}
      />

      {wrong.length > 0 && (
        <>
          <div className="ud-sec"><h2>The ones you missed</h2><i /><span>{type === "vr" ? "evidence highlighted in the passage" : "full working shown"}</span></div>
          {wrong.map(({ q, given, n }) => (
            <div className="ud-trend" key={n} id={`mockq${n}`} style={{ padding: 20, scrollMarginTop: 20 }}>
              <p className="ud-qs" style={{ color: "var(--paper)" }}>{n + 1}. {q.stem || q.prompt}</p>
              <p style={{ fontSize: 13, margin: "0 0 4px" }}>
                <span style={{ color: "var(--stop)" }}>Yours: {given === null || given === undefined ? "unanswered (time ran out)" : q.a !== undefined ? q.options[given] : String(given)}</span>
                <span style={{ color: "var(--go)", marginLeft: 14 }}>Correct: {q.a !== undefined ? q.options[q.a] : q.answer}</span>
                {q.diagram && <WorkDiagram d={q.diagram} />}
              </p>
              <p style={{ fontSize: 13.5, color: "var(--body)", lineHeight: 1.65, margin: "8px 0 12px" }}>{q.why || q.working}</p>
              {type === "vr" ? (
                <div style={{ background: "var(--card)", borderRadius: 3, padding: "14px 16px" }}>
                  <p style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5A6675", margin: "0 0 8px" }}>Where the answer was hiding</p>
                  {highlightEvidence(q.passage.text, q.evidence)}
                </div>
              ) : (
                q.improve && <p className="ud-tip" style={{ margin: "0" }}>{q.improve}</p>
              )}
            </div>
          ))}
        </>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 26 }}>
        <button className="ud-btn" onClick={() => startMock(type, slot)}>Run it again</button>
        <button className="ud-btn ghost" onClick={() => setPhase("idle")}>All mocks</button>
      </div>
    </div>
  );
}

/* ------------------------------ APP ------------------------------- */

/* Decision Making was removed; its old weakness tags may still sit in a
   returning user's saved data, so exclude them from every progress view. */
const REMOVED_TAGS = new Set(["dsyll", "dvenn", "dprob", "dlogic"]);
const liveTag = (t) => !REMOVED_TAGS.has(t);

const MISTAKE_DRILL = { id: "mistakes", section: "MIX", name: "Mistake rematch", budget: 30 };
const WEAKSPOTS_DRILL = { id: "weakspots", section: "MIX", name: "Fix my weak spots", budget: 40 };

/* Line icons for the sidebar navigation, one per section. Stroke only,
   inherit colour, so they light up with the active accent. */
const svgProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const NAV_ICON = {
  drills: (<svg {...svgProps}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>),
  learn: (<svg {...svgProps}><path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5 1.5-1.5 4-2 8-1.5V5c-4-.5-6.5 0-8 1.5z" /><path d="M12 6.5v13" /></svg>),
  mock: (<svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>),
  interview: (<svg {...svgProps}><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" /></svg>),
  unis: (<svg {...svgProps}><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5" /></svg>),
  ps: (<svg {...svgProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>),
  plan: (<svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>),
  progress: (<svg {...svgProps}><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg>),
  mistakes: (<svg {...svgProps}><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /></svg>),
  legal: (<svg {...svgProps}><path d="M12 2 4 5v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V5z" /></svg>),
  billing: (<svg {...svgProps}><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M16 5l3 3M14 7l3 3" /></svg>),
};

/* Original subtest icons for the Learn overview, drawn here rather than
   borrowed from any bank. VR is a magnifier over text lines (search, not
   read); QR is a rising bar chart with a trend tick; SJT is a balance
   beam. Slightly thinner stroke reads cleaner at circle size. */
const learnIco = { ...svgProps, strokeWidth: 1.6 };
const SUBTEST_ICON = {
  vr: (<svg {...learnIco}><path d="M4 6h9M4 10h7M4 14h5" /><circle cx="15.5" cy="14.5" r="4" /><path d="M18.4 17.4 21.5 20.5" /></svg>),
  qr: (<svg {...learnIco}><path d="M4 4v16h16" /><rect x="7" y="12" width="2.6" height="5" rx=".4" /><rect x="11.7" y="9" width="2.6" height="8" rx=".4" /><rect x="16.4" y="6" width="2.6" height="11" rx=".4" /><path d="M7 10.5 12 7l3 2 4-3.5" /></svg>),
  sjt: (<svg {...learnIco}><path d="M12 3v16" /><path d="M7 19h10" /><path d="M4.5 7h15l-.5-.2M12 5.5 5 7M12 5.5 19 7" /><path d="M8 7 5.4 12c1.7 1.2 3.5 1.2 5.2 0z" /><path d="M16 7 13.4 12c1.7 1.2 3.5 1.2 5.2 0z" /></svg>),
  overview: (<svg {...learnIco}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /></svg>),
  dm: (<svg {...learnIco}><path d="M6 4v6a4 4 0 0 0 4 4h4" /><circle cx="6" cy="4" r="1.6" /><circle cx="18" cy="8" r="1.6" /><path d="M16.5 8H10a4 4 0 0 0-4 4v8" /><circle cx="6" cy="20" r="1.6" /></svg>),
  cheat: (<svg {...learnIco}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>),
};

/* First-payment walkthrough of the main features, shown once after
   unlocking. Advancing navigates the app to the feature being described. */
const FEATURE_TOUR = [
  { t: "Welcome to Tempo", p: "You're unlocked. Here is a quick tour of everything you now have. Skip whenever you like.", view: "drills" },
  { t: "Drills", p: "Every UCAT skill as a focused drill: times tables, the on-screen calculator, estimation, verbal reasoning, decision making and situational judgement. Timed or untimed.", view: "drills" },
  { t: "Learn", p: "Short lessons on the technique behind each section, with a quick quiz as you go. Read these before you drill.", view: "learn" },
  { t: "Weekly mocks", p: "Full timed VR and QR mocks, three of each every week, marked with a leaderboard so you can see where you stand.", view: "mock" },
  { t: "Interview", p: "Written and spoken practice for real interview themes, marked out of 10 with a best and worst case, plus dictation so you can rehearse out loud.", view: "interview" },
  { t: "University selector", p: "Enter your grades and UCAT and map yourself against every school, with cut-offs, weightings and living costs.", view: "unis" },
  { t: "Personal statement", p: "Build your statement section by section, marked line by line, with frameworks and an experience router.", view: "ps" },
  { t: "Mistakes and progress", p: "Everything you get wrong comes back for spaced review, and Progress tracks your scores, weak spots and interview marks over time.", view: "progress" },
];

function FeatureTour({ onGoto, onClose }) {
  const [i, setI] = useState(0);
  const go = (n) => { setI(n); if (FEATURE_TOUR[n].view) onGoto(FEATURE_TOUR[n].view); };
  const s = FEATURE_TOUR[i];
  const last = i === FEATURE_TOUR.length - 1;
  return (
    <div className="tour-wrap">
      <div className="tour-card">
        <span className="step mono">{i + 1} of {FEATURE_TOUR.length}</span>
        <h3>{s.t}</h3>
        <p>{s.p}</p>
        <div className="tour-dots">{FEATURE_TOUR.map((_, n) => <i key={n} className={n === i ? "on" : ""} />)}</div>
        <div className="tour-btns">
          <button className="ud-quit" onClick={onClose}>Skip</button>
          {i > 0 && <button className="ud-btn ghost" onClick={() => go(i - 1)}>Back</button>}
          <button className="ud-btn" onClick={() => { if (last) { onGoto("drills"); onClose(); } else go(i + 1); }}>{last ? "Start" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}

export default function UcatDrillTrainer() {
  const [view, setView] = useState("drills");
  const [drill, setDrill] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [log, setLog] = useState([]);
  const [meta, setMeta] = useState(null);
  const [runExam, setRunExam] = useState(false);
  const [runBudget, setRunBudget] = useState(0);
  const [planKey, setPlanKey] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [best, setBest] = useState({});
  const [history, setHistory] = useState([]);
  const [plan, setPlan] = useState({});
  const [weak, setWeak] = useState({});
  const [seenBank, setSeenBank] = useState({});
  const [mistakes, setMistakes] = useState([]);
  const [prefs, setPrefsState] = useState({ count: 10, exam: false, extra: 1, level: "hard", theme: "light" });
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState(null);
  const [authDone, setAuthDone] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const lastRun = useRef(null);

  useEffect(() => {
    loadState().then((s) => {
      const paid = s.unlocked || CHECKOUT_RETURN;
      setUnlocked(paid); setBest(s.best); setHistory(s.history);
      setPlan(s.plan); setWeak(s.weak); setSeenBank(s.seenBank || {}); setMistakes(s.mistakes);
      const pf = { count: 10, exam: false, extra: 1, level: s.level || "hard", theme: "light", ...(s.prefs || {}) };
      if (!LEVELS[pf.level]) pf.level = "hard";
      setPrefsState(pf);
      if (pf.account) { setAccount(pf.account); setAuthDone(true); }
      if (pf.skippedAuth) setAuthDone(true);
      /* Persist and confirm a fresh unlock arriving back from Stripe, then
         tidy the query string so a refresh does not re-trigger it. */
      if (CHECKOUT_RETURN && !s.unlocked) {
        setJSON("ucat:unlocked", true);
        try { window.history.replaceState({}, "", window.location.pathname); } catch (e) { /* ignore */ }
        setView("billing");
      }
      /* Show the feature tour once to anyone already unlocked who has not seen it. */
      if (paid && !pf.tourSeen) setShowTour(true);
      setReady(true);
    });
  }, []);

  /* Restore a Supabase session so a signed-in user is not asked to log
     in again after a refresh, and follow future sign-in/out events.
     No-op when Supabase is not configured (local preview mode). */
  useEffect(() => {
    if (!supabaseEnabled) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data && data.session) {
        setAccount({ email: data.session.user.email });
        setAuthDone(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setAccount({ email: session.user.email }); setAuthDone(true); }
      else setAccount(null);
    });
    return () => { if (listener && listener.subscription) listener.subscription.unsubscribe(); };
  }, []);

  const setPrefs = (p) => { setPrefsState(p); setJSON("ucat:prefs", p); setJSON("ucat:level", p.level); };

  const qKey = (q) => `${q.drill}|${q.stem || q.prompt}|${q.answer ?? (q.order || []).join("")}`;

  /* Count each VR passage and SJT scenario as it is served, so the
     generators serve only unseen items, so a question is shown once and
     not again until the whole bank is exhausted. When a batch reports it
     had to cycle, that bank's seen keys are cleared first so a clean new
     cycle starts. */
  const recordSeen = (qs) => {
    const keys = qs.map((q) => q.seenKey).filter(Boolean);
    if (!keys.length) return;
    const prefix = keys[0].slice(0, keys[0].indexOf(":") + 1);
    setSeenBank((prev) => {
      const next = { ...prev };
      if (qs.cycled) Object.keys(next).forEach((k) => { if (k.startsWith(prefix)) delete next[k]; });
      keys.forEach((k) => { next[k] = 1; });
      setJSON("ucat:seenbank", next);
      return next;
    });
  };

  const start = (d, isExam, count, key, sub, theme) => {
    const lvl = prefs.level;
    let qs = [];
    if (d.id === "tables") qs = makeTables(count, weak, lvl);
    else if (d.id === "calc") qs = makeCalc(count, weak, lvl);
    else if (d.id === "estimate") qs = makeEstimate(count, weak, lvl, sub);
    else if (d.id === "qrset") qs = makeQrSets(count, lvl);
    else if (d.id === "scan") qs = makeScan(count, weak);
    else if (d.id === "tfc") qs = makeTfc(count, weak, seenBank);
    else if (d.id === "infer") qs = makeInfer(count, weak, seenBank);
    else if (d.id === "sjt") qs = makeSjt(count, weak, theme, seenBank);
    recordSeen(qs);
    lastRun.current = { d, isExam, count, sub, theme };
    setDrill(d);
    setMeta(null);
    setRunExam(!!isExam && TIMED.includes(d.id));
    setRunBudget(Math.round(d.budget * LEVELS[lvl].budget * (prefs.extra || 1)));
    setPlanKey(key || null);
    setQuestions(qs);
    setView("run");
  };

  /* Manual done toggle for planner sessions. Completing a drill already
     writes plan[cust:id]; this lets a student tick or untick one by hand. */
  const setPlanDone = (key, val) => {
    setPlan((p) => {
      const n = { ...p };
      if (val) n[key] = Date.now(); else delete n[key];
      setJSON("ucat:plan", n);
      return n;
    });
  };

  const activeMistakes = mistakes.filter((m) => m.misses > 0 || (m.dueTs && m.dueTs <= Date.now()));
  const nextPlanKey = PLAN_KEYS.find((k) => !plan[k]);
  const planNextName = nextPlanKey
    ? DRILL_BY_ID[PLAN.find((w) => w.week === Number(nextPlanKey.match(/w(\d+)/)[1])).days[Number(nextPlanKey.match(/d(\d+)/)[1]) - 1].drill].name
    : null;

  const startMistakes = () => {
    const bank = activeMistakes;
    if (!bank.length) { setView("mistakes"); return; }
    lastRun.current = { mistakes: true };
    setDrill(MISTAKE_DRILL);
    setMeta(null);
    setRunExam(false);
    setRunBudget(0);
    setPlanKey(null);
    setQuestions(shuffle(bank.map((m) => m.q)));
    setView("run");
  };

  const startWeakSpots = () => {
    const qs = makeWeakSpots(prefs.count || 10, weak, seenBank);
    recordSeen(qs);
    lastRun.current = { weakspots: true };
    setDrill(WEAKSPOTS_DRILL);
    setMeta(null);
    setRunExam(false);
    setRunBudget(Math.round(WEAKSPOTS_DRILL.budget * LEVELS[prefs.level].budget * (prefs.extra || 1)));
    setPlanKey(null);
    setQuestions(qs);
    setView("run");
  };

  const rerun = () => {
    const r = lastRun.current;
    if (!r) { setView("drills"); return; }
    if (r.weakspots) { startWeakSpots(); return; }
    if (r.mistakes) startMistakes();
    else start(r.d, r.isExam, r.count, null, r.sub, r.theme);
  };

  const done = (l, m) => {
    setLog(l); setMeta(m || null);
    const points = l.reduce((a, x) => a + x.score, 0);
    const pct = l.length ? Math.round((points / l.length) * 100) : 0;
    const med = median(l.map((x) => x.ms));
    const isReal = drill.id !== "mistakes";

    if (isReal) {
      const nextBest = (!best[drill.id] || pct > best[drill.id].pct) ? { ...best, [drill.id]: { pct, med } } : best;
      if (nextBest !== best) { setBest(nextBest); setJSON("ucat:best", nextBest); }
      const nextHistory = [...history, { drill: drill.id, ts: Date.now(), pct, med, exam: runExam }].slice(-240);
      setHistory(nextHistory); setJSON("ucat:history", nextHistory);
      if (planKey && !plan[planKey]) {
        const nextPlan = { ...plan, [planKey]: Date.now() };
        setPlan(nextPlan); setJSON("ucat:plan", nextPlan);
      }
    }

    const nextWeak = { ...weak };
    l.forEach((x) => {
      const t = x.q.tag;
      if (!t) return;
      if (!x.correct) nextWeak[t] = (nextWeak[t] || 0) + 1;
      else if (nextWeak[t]) nextWeak[t] = Math.max(nextWeak[t] - 0.35, 0);
    });
    setWeak(nextWeak); setJSON("ucat:weak", nextWeak);

    let bank = [...mistakes];
    const DAY = 86400000;
    const GAPS = [3, 7, 21];
    l.forEach((x) => {
      const k = qKey(x.q);
      const idx = bank.findIndex((b) => b.key === k);
      if (!x.correct) {
        if (idx >= 0) bank[idx] = { ...bank[idx], misses: bank[idx].misses + 1, stage: 0, dueTs: 0 };
        else bank.push({ key: k, q: x.q, misses: 1, stage: 0, dueTs: 0, ts: Date.now() });
      } else if (idx >= 0) {
        const stage = (bank[idx].stage || 0) + 1;
        if (stage > GAPS.length) bank.splice(idx, 1);
        else bank[idx] = { ...bank[idx], misses: 0, stage, dueTs: Date.now() + GAPS[stage - 1] * DAY };
      }
    });
    bank = bank.slice(-100);
    setMistakes(bank); setJSON("ucat:mistakes", bank);
    setView("results");
  };

  const unlock = () => { setUnlocked(true); setJSON("ucat:unlocked", true); if (!prefs.tourSeen) setShowTour(true); };
  const closeTour = () => { setShowTour(false); setPrefs({ ...prefs, tourSeen: true }); };

  /* Self-service deletion: wipe every key on this device, sign out of
     Supabase, and reset to a clean, signed-out state. Full server-side
     erasure of the account needs the email route in the privacy policy
     (or a service-role Edge Function), which the UI states honestly. */
  const deleteAccount = async () => {
    await deleteLocalData();
    if (supabaseEnabled) { try { await supabase.auth.signOut(); } catch (e) { /* ignore */ } }
    setUnlocked(false); setBest({}); setHistory([]); setPlan({}); setWeak({}); setMistakes([]);
    setPrefsState({ count: 10, exam: false, extra: 1, level: "hard", theme: "light" });
    setAccount(null); setAuthDone(false);
    setView("drills");
  };

  /* Sign out without wiping anything: end the Supabase session, forget who
     is signed in, and return to the sign-in screen. Progress on this device
     is kept, so signing back in picks up where you left off. */
  const signOut = async () => {
    if (supabaseEnabled) { try { await supabase.auth.signOut(); } catch (e) { /* ignore */ } }
    const np = { ...prefs }; delete np.account; delete np.skippedAuth;
    setPrefs(np);
    setAccount(null); setAuthDone(false);
    setView("drills");
  };

  const Header = () => (
    <nav className="ud-side" aria-label="Main navigation">
      <button className="ud-markbtn" onClick={() => setView("drills")} aria-label="Tempo home">
        <span className="ud-mark"><b>Tempo</b><span className="txt">UCAT</span></span>
      </button>
      <div className="ud-side-nav">
        {[["drills", "Drills"], ["learn", "Learn"], ["mock", "Mock"], ["interview", "Interview"], ["unis", "University"], ["ps", "Statement"], ["plan", "Plan"], ["progress", "Progress"], ["mistakes", "Mistakes"], ["legal", "Legal"], ["billing", unlocked ? "Access" : "Unlock"]].map(([k, label]) => (
          <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)} aria-current={view === k ? "page" : undefined} title={label}>
            {NAV_ICON[k]}
            <span className="lbl">{label}</span>
            {k === "mistakes" && activeMistakes.length > 0 && <span className="dot" />}
          </button>
        ))}
      </div>
      <div className="ud-side-foot">
        <button className="ud-theme" aria-label="Switch between light and dark mode"
          onClick={() => setPrefs({ ...prefs, theme: prefs.theme === "light" ? "dark" : "light" })}>
          {prefs.theme === "light" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          )}
        </button>
        <button className={`ud-badge${unlocked ? " on" : ""}`} onClick={() => setView("billing")} title={account ? account.email : "Not signed in"}>
          <span className="txt">{unlocked ? "Full access" : "Free only"}</span>
        </button>
        <button className="ud-theme ud-signout" onClick={signOut} title={account ? `Sign out of ${account.email}` : "Back to sign in"} aria-label={account ? "Sign out" : "Back to sign in"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        </button>
      </div>
    </nav>
  );

  if (!ready) {
    return (
      <div className={`ud${prefs.theme === "light" ? " light" : ""}`}><style>{CSS}</style>
        <div className="ud-wrap" style={{ padding: "80px 20px" }}>
          <p className="mono" style={{ color: "var(--mute)", fontSize: 13 }}>Loading your progress…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`ud${prefs.theme === "light" ? " light" : ""}${authDone && view !== "run" ? " ud-hasside" : ""}`}>
      <style>{CSS}</style>
      {!authDone && (
        <AuthScreen
          onAuthed={(a) => {
            const acct = { email: a.email, id: a.id };
            setAccount(acct); setAuthDone(true);
            setPrefs({ ...prefs, account: acct, ...(a.consentImprove !== undefined ? { consentImprove: a.consentImprove } : {}) });
          }}
          onSkip={() => { setAuthDone(true); setPrefs({ ...prefs, skippedAuth: true }); }}
        />
      )}
      {authDone && !prefs.track && <TrackGate onPick={(t) => setPrefs({ ...prefs, track: t })} />}
      {showTour && authDone && prefs.track && <FeatureTour onGoto={(v) => setView(v)} onClose={closeTour} />}
      {view === "drills" && (<><Header /><Home unlocked={unlocked} best={best} weak={weak} history={history} prefs={prefs} setPrefs={setPrefs} onStart={start} onUnlock={unlock} mistakesCount={activeMistakes.length} onMistakes={startMistakes} onWeakSpots={startWeakSpots} onLearnSjt={() => setView("sjtlearn")} onGoto={(v) => setView(v)} planNext={planNextName} /></>)}
      {view === "sjtlearn" && (<><Header /><div className="ud-wrap">
        <button className="learn-back" onClick={() => setView("learn")}>
          <svg {...svgProps} width="15" height="15"><path d="M15 18l-6-6 6-6" /></svg>
          The UCAT guide
        </button>
        <div className="learn-detailhead">
          <span className="learn-ico" data-sec="sjt">{SUBTEST_ICON.sjt}</span>
          <div><h2>SJT interactive trainer</h2><span className="learn-count">learn the framework, then prove it</span></div>
        </div>
        <SjtTrainer />
        <div style={{ height: 50 }} />
      </div></>)}
      {view === "learn" && (<><Header /><LearnView unlocked={unlocked} best={best} onStart={start} onUnlock={() => setView("billing")} /></>)}
      {view === "mock" && (<><Header /><MockCentre unlocked={unlocked} prefs={prefs} setPrefs={setPrefs} /></>)}
      {view === "interview" && (<><Header />{unlocked ? <InterviewView track={prefs.track || "dent"} onSwitch={(t) => setPrefs({ ...prefs, track: t })} />
        : <div className="ud-wrap"><div className="ud-sec" style={{ paddingTop: 32 }}><h2>Interview preparation</h2><i /><span>locked</span></div>
          <Locked onUnlock={() => setView("billing")} label="Interview tools with access">
            <div className="ud-trend" style={{ padding: 20, minHeight: 220 }}><h3>Question banks, marked practice and university fact sheets</h3>
            <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.65 }}>Tailored and curveball questions for every school, timed written practice marked line by line, delivery coaching and dictation.</p></div>
          </Locked></div>}</>)}
      {view === "unis" && (<><Header />{unlocked ? <UniSelector track={prefs.track || "dent"} prefs={prefs} setPrefs={setPrefs} />
        : <div className="ud-wrap"><div className="ud-sec" style={{ paddingTop: 32 }}><h2>University selector</h2><i /><span>locked</span></div>
          <Locked onUnlock={() => setView("billing")} label="Selector with access">
            <div className="ud-trend" style={{ padding: 20, minHeight: 220 }}><h3>Map your grades against every school</h3>
            <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.65 }}>Enter your GCSEs, UCAT and predictions and see where you are strong, in range or aspirational, with contextual weighting, course detail and living costs.</p></div>
          </Locked></div>}</>)}
      {view === "billing" && (<><Header /><BillingView unlocked={unlocked} onUnlock={unlock} email={account ? account.email : ""} onSignOut={signOut} /></>)}
      {view === "legal" && (<><Header /><LegalView account={account} prefs={prefs} setPrefs={setPrefs} onDeleteAccount={deleteAccount} /></>)}
      {view === "ps" && (<><Header /><PsBuilder unlocked={unlocked} onUnlock={() => setView("billing")} /></>)}
      {view === "plan" && (<><Header /><PlanView unlocked={unlocked} plan={plan} onStart={start} prefs={prefs} setPrefs={setPrefs} setPlanDone={setPlanDone} weak={weak} best={best} history={history} /></>)}
      {view === "progress" && !unlocked && (<><Header /><div className="ud-wrap"><div className="ud-sec" style={{ paddingTop: 32 }}><h2>Progress</h2><i /><span>locked</span></div>
        <Locked onUnlock={() => setView("billing")} label="Progress tracking with access">
          <div className="ud-trend" style={{ padding: 20, minHeight: 200 }}><h3>Sparklines, weak tags and score history</h3>
          <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.65 }}>Every session tracked per section, with the tags you keep dropping marks on surfaced automatically.</p></div>
        </Locked></div></>)}
      {view === "progress" && unlocked && (<><Header /><ProgressView history={history} weak={weak} best={best} plan={plan} prefs={prefs} onGoto={(v) => setView(v)} /></>)}
      {view === "mistakes" && (<><Header /><MistakesView mistakes={mistakes} active={activeMistakes} onRetry={startMistakes} onClear={() => { setMistakes([]); setJSON("ucat:mistakes", []); }} /></>)}
      {view === "run" && drill && drill.id === "speed" && <PacingDrill onDone={done} onQuit={() => setView("drills")} />}
      {view === "run" && drill && drill.id === "blurt" && <BlurtDrill onDone={done} onQuit={() => setView("drills")} />}
      {view === "run" && drill && !["speed", "blurt"].includes(drill.id) && (
        <DrillRunner drill={drill} questions={questions} exam={runExam} budget={runBudget}
          showCalc={drill.id === "calc"} hideStart={prefs.hideQ} reviewEnd={prefs.reviewEnd} level={prefs.level} onDone={done} onQuit={() => setView("drills")} />
      )}
      {view === "results" && drill && (<><Header />
        <Results drill={drill} log={log} meta={meta} exam={runExam} history={history}
          onHome={() => setView("drills")} onAgain={rerun} budget={runBudget}
          onType={(id, sub) => start(DRILL_BY_ID[id], false, DRILL_BY_ID[id].def, null, sub, null)}
          onDiagDrill={(id) => start(DRILL_BY_ID[id], false, DRILL_BY_ID[id].def, null, null, null)} />
      </>)}
    </div>
  );
}

/* ------------------------------ TEST SURFACE ---------------------- */
/* Named exports so the test suite can exercise the generators and    */
/* mock data directly. These reference existing module-scope values   */
/* and change no behaviour. When the file is split into data/ and     */
/* engine/, these move with their definitions.                        */
export {
  PASSAGES, TFC_SETS, MOCK_BANK, mockPassage, DRILLS, VENN_GENS, LEVELS,
  makeTables, makeCalc, makeEstimate, makeQrSets, makeScan, makeTfc, makeSjt, makeDm, makeVenn,
  makeProb, makeLogic, makeInfer, makeWeakSpots, scoreEntry, snapAnswered, buildVrMock, buildQrMock, buildSjtMock, assessMed,
  predFromSubjects, evalSubjReq, subjPresetFor, SUBJ_PRESETS, MED_SUBJ, DENT_SUBJ,
  generatePlan, currentStreak, DRILL_BY_ID, PlannerPanel,
  marksToScale, old3600to2700, ScoreConverter, dedupeBest, MockLeaderboard,
  analysePace, paceState, projectScore, readinessScore, schoolsInRange, OutlookPanel,
  mmiStations, MmiCircuit, scoreStation,
  ivTopics, IV_TOPIC_ORDER, buildInterviewCircuit, scoreAnswer, InterviewLauncher, InterviewRunner,
};
