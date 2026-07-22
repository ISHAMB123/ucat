import React, { useState, useEffect, useRef, useCallback } from "react";
import { getJSON, setJSON, getSharedJSON, setSharedJSON, sharedIsGlobal, exportLocalData, deleteLocalData } from "./storage.js";
import { supabase, supabaseEnabled } from "./supabaseClient.js";
import {
  PRIVACY, TERMS, DISCLAIMER, DISCLAIMER_SHORT, STORAGE_NOTICE, CONSENT,
  MARKING_DISCLOSURE, MARKING_DISCLOSURE_SHORT, fillLegal, legalPlaceholdersPending,
} from "./legalContent.js";
import { CSS } from "./styles.js";
import { seeded, rnd, pick, shuffle, fmt, median, weightedPick, LEVELS, fiveOptions } from "./utils.js";
import { PASSAGES, TFC, TFC_SETS } from "./data/vr.js";
import { APPROP, IMPORT, SJT_THEMES, SJT_TYPES, SJT_SCENARIOS, SJT_LESSONS } from "./data/sjt.js";
import { DM_QUESTIONS, DM_SUBS, VCTX, SYLL_SETS } from "./data/dm.js";

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


function makeTfc(n, weak) {
  const ids = Object.keys(TFC_SETS);
  const out = [];
  const used = new Set();
  for (let i = 0; i < n; i++) {
    const pid = weightedPick(ids, weak, "t");
    const p2 = PASSAGES.find((x) => x.id === pid);
    const pool = TFC_SETS[pid].filter((_, idx) => !used.has(pid + idx));
    const set = pool.length ? pool : TFC_SETS[pid];
    const item = pick(set);
    used.add(pid + TFC_SETS[pid].indexOf(item));
    out.push({
      kind: "scale", scenarioText: null, passageText: p2.text, passageTitle: p2.title,
      stem: item.t, options: TFC, answer: item.a, typeName: "True, false, can't tell",
      tag: "t" + pid, section: "VR", drill: "tfc",
      why: item.w,
      diagram: { type: "tfc" },
      improve: "Ask only one question: does the passage itself settle this? True means it says so, False means it contradicts it, Can't tell means it is silent. Watch for swapped absolutes (always, never, sole), invented causes between two true facts, and outside knowledge creeping in.",
    });
  }
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

function makeDm(n, weak, sub, lvl) {
  const L = lvl || "medium";
  if (sub === "dvenn") return makeVenn(n, L);
  if (sub === "dsyll") {
    const sets = makeSyllSets();
    const easy = shuffle(DM_QUESTIONS.filter((q) => q.tag === "dsyll")).map((q) => ({
      kind: "mcq", stem: q.stem, options: q.options, answer: q.options[q.a], venn: q.venn || null,
      tag: q.tag, section: "DM", drill: "dm", why: q.why, improve: q.improve,
    }));
    const pool = L === "easy" ? [...easy, ...sets] : L === "hard" ? sets : shuffle([...sets, ...easy.slice(0, 2)]);
    return pool.slice(0, Math.min(n, pool.length));
  }
  const src = sub && sub !== "mixed" ? DM_QUESTIONS.filter((q) => q.tag === sub) : DM_QUESTIONS;
  const statics = shuffle(src).map((q) => ({
    kind: "mcq", stem: q.stem, options: q.options, answer: q.options[q.a], venn: q.venn || null,
    tag: q.tag, section: "DM", drill: "dm", why: q.why, improve: q.improve,
  }));
  if (sub && sub !== "mixed") return statics.slice(0, Math.min(n, statics.length));
  const blend = shuffle([...statics, ...makeVenn(Math.ceil(n / 2), L), ...makeSyllSets().slice(0, 2)]);
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

const VR_MOCK_QCOUNT = 12;             /* 3 passage sets of 4 */
const VR_MOCK_SECONDS = VR_MOCK_QCOUNT * 30;   /* the real section's pace: 44 Qs in 22:00 = 30s each */
const QR_MOCK_QCOUNT = 36;
const QR_MOCK_SECONDS = 26 * 60;       /* full length: 36 Qs in 26:00, matching the exam */

function buildVrMock(week, slot) {
  /* The real section mixes true/false/can't tell sets with inference sets,
     so two evidence sets plus one TFC set reproduces the same texture.     */
  const sets = seeded(week * 97 + slot * 13 + 7, () => shuffle(MOCK_BANK)).slice(0, 2);
  const flat = [];
  sets.forEach((set) => set.questions.forEach((q) => flat.push({ ...q, kindm: "vr", passage: mockPassage(set.pid) })));
  const tfcId = seeded(week * 41 + slot * 7 + 5, () => pick(Object.keys(TFC_SETS)));
  const tp = PASSAGES.find((x) => x.id === tfcId);
  TFC_SETS[tfcId].forEach((item) => flat.push({
    kindm: "vr", stem: item.t, options: TFC, a: item.a, tfc: true,
    why: item.w, diagram: { type: "tfc" }, tag: "t" + tfcId,
    passage: { title: tp.title, text: tp.text },
  }));
  return { title: `VR Mock ${"ABC"[slot]}`, flat, secs: VR_MOCK_SECONDS, perQ: 30 };
}

function buildQrMock(week, slot) {
  /* Real QR runs mostly as sets of four questions sharing one table, so the
     mock is 28 set questions plus a short tail of standalone items.        */
  const flat = seeded(week * 131 + slot * 17 + 3, () => {
    const sets = makeQrSets(28, "medium");
    const singles = makeEstimate(QR_MOCK_QCOUNT - 28, {}, "medium", null);
    return [...sets, ...singles];
  }).map((q) => ({ ...q, kindm: "qr" }));
  return { title: `QR Mock ${"ABC"[slot]}`, flat, secs: QR_MOCK_SECONDS, perQ: 43 };
}

/* ------------------------------ DRILLS ---------------------------- */

const DRILLS = [
  { id: "tables", section: "QR", name: "Times tables to 15", blurb: "The foundation. Hesitate on 13 × 7 and the question is already lost.", free: true, max: 25, def: 15, budget: 6 },
  { id: "calc", section: "QR", name: "On-screen calculator", blurb: "Keyboard only, like the real thing. Build the muscle memory early.", free: false, max: 25, def: 10, budget: 30 },
  { id: "qrset", section: "QR", name: "Data sets", blurb: "Four linked questions on one table, five options, comparison answers. The shape the real section actually takes.", free: false, max: 24, def: 8, budget: 40 },
  { id: "estimate", section: "QR", name: "Estimation", blurb: "Five options, one right. Ratios, graphs, rates, percentages and inference.", free: false, max: 25, def: 10, budget: 40, sub: true },
  { id: "speed", section: "VR", name: "Pacing", blurb: "Words at a fixed rate, then comprehension. Trains you to stop re-reading.", free: false, max: 1, def: 1, budget: 0 },
  { id: "tfc", section: "VR", name: "True, false, can't tell", blurb: "The signature VR format. Can't tell is the most-missed answer in the exam, and this drills exactly why.", free: false, max: 25, def: 12, budget: 30 },
  { id: "scan", section: "VR", name: "Scanning", blurb: "Find one fact in a passage against the clock. The core VR skill.", free: false, max: 25, def: 9, budget: 25 },
  { id: "blurt", section: "VR", name: "Blurting", blurb: "Read, hide, recall. Shows how little of a passage you actually keep.", free: false, max: 1, def: 1, budget: 0 },
  { id: "sjt", section: "SJT", name: "Situational Judgement", blurb: "All three official formats, a written reason for every answer, band estimate at the end.", free: false, max: 25, def: 12, budget: 22 },
  { id: "dm", section: "DM", name: "Decision Making", blurb: "Syllogism sets in the real five-conclusion format, generated Venns, probability and logic puzzles.", free: false, max: 25, def: 10, budget: 60, sub: "dm" },
];
const DRILL_BY_ID = Object.fromEntries(DRILLS.map((d) => [d.id, d]));
const TIMED = ["tables", "calc", "estimate", "scan", "sjt", "dm", "tfc", "qrset"];

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
    id: "dm", title: "Decision Making",
    intro: "DM looks like it tests cleverness. It actually tests whether you know about six patterns. Syllogisms, Venn logic and probability cover most of the marks, and each one collapses into a mechanical habit once you have seen it.",
    extra: [
      { h: "Notation: union and intersection", p: "A ∪ B, the union, is everything in A or B or both: the whole of both circles. A ∩ B, the intersection, is only the shared middle where both apply. If a question uses symbols, translate them to circle regions before doing anything else." },
      { h: "Notation: complement, subset, member, empty", p: "A′ is everything outside circle A: if A is tea drinkers, A′ is everyone who does not drink tea. A ⊂ B means A sits completely inside B, the way all cats sit inside animals. x ∈ A says one individual belongs to group A. And ∅ is the empty set: A ∩ B = ∅ means the circles do not overlap at all." },
      { h: "Region discipline", p: "A number written in one section counts only that exact section: the 'just tea' part of the tea circle excludes the tea-and-coffee overlap. To total a circle, add every section inside it, overlaps included. With three circles, work middle-out: triple overlap first, then the pairs, then the singles, or you will double count." },
    ],
    cards: [
      { h: "Syllogisms: try to break the conclusion", p: "A conclusion 'follows' only if the premises make it unavoidable. Ask one question: could the premises be true while the conclusion is false? If you can imagine that world, the answer is 'does not follow'. Most wrong answers come from accepting plausible instead of demanding certain.", drill: "dm", sub: "dsyll" },
      { h: "Draw circles for groups", p: "Any question about categories becomes easy as circles: 'all A are B' puts A inside B, 'no A are B' pulls them apart, 'some' overlaps them. If the circles can be arranged two different ways, nothing about their relationship follows.", drill: "dm", sub: "dsyll" },
      { h: "Venn numbers: overlap first", p: "Fill the overlap first, then each 'only' region, then whatever is outside. A circle's total always includes the overlap, and the survey total minus everything inside the circles gives 'neither'. Every Venn question is those three moves.", drill: "dm", sub: "dvenn" },
      { h: "The whiteboard habit", p: "Sketch the circles every single time, even when it looks easy enough to hold in your head. Read the question first so you know whether you are building a diagram, reading one, or matching a statement to one. Most dropped marks come from rushed overlaps, not hard arithmetic.", drill: "dm", sub: "dvenn" },
      { h: "The totals check", p: "Every region plus the outside must add up to the number in the question. Run that check before you answer: if it fails, you have double counted an overlap somewhere, and finding it costs five seconds instead of the mark.", drill: "dm", sub: "dvenn" },
      { h: "Some, all, no", p: "Three words carry the whole logic. 'Some' means at least one, so the circles overlap. 'All' means one circle sits entirely inside the other, so everything in the smaller belongs to the bigger. 'No' means the circles never touch. Shape-matching questions are just these three words drawn.", drill: "dm", sub: "dsyll" },
      { h: "Logic puzzles: pin the fixed clue", p: "Seats, heights, rotas: start with the clue that fixes something absolutely, an end seat, a named day, then chain the relative clues off it. If two arrangements survive every clue, the answer is 'cannot be determined', and that option is sometimes right.", drill: "dm", sub: "dlogic" },
      { h: "Probability: use the complement", p: "'At least one' questions are answered backwards: find the probability of none, subtract from 1. And keep the denominator honest: it is everything that could happen, not just the outcomes the question mentions.", drill: "dm", sub: "dprob" },
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

function WorkDiagram({ d }) {
  if (!d) return null;
  const C = { line: "#9DB2C8", ink: "#131A22", go: "#1E8E5A", stop: "#C0392B", sig: "#B97A0E" };

  if (d.type === "pctchange") {
    return (
      <svg viewBox="0 0 420 150" className="wd" aria-label="How to work out percentage change">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">STEP 1 · find the difference</text>
        <rect x="0" y="24" width="90" height="30" fill="none" stroke={C.line} />
        <text x="45" y="43" fontSize="12" fill={C.ink} textAnchor="middle">{d.b}</text>
        <text x="100" y="43" fontSize="13" fill={C.ink}>−</text>
        <rect x="118" y="24" width="90" height="30" fill="none" stroke={C.line} />
        <text x="163" y="43" fontSize="12" fill={C.ink} textAnchor="middle">{d.a}</text>
        <text x="218" y="43" fontSize="13" fill={C.ink}>=</text>
        <rect x="236" y="24" width="90" height="30" fill="none" stroke={C.go} strokeWidth="1.6" />
        <text x="281" y="43" fontSize="12" fill={C.go} textAnchor="middle" fontWeight="700">{d.diff}</text>

        <text x="0" y="80" fontSize="11" fill={C.sig} fontFamily="monospace">STEP 2 · divide by the ORIGINAL, never the new one</text>
        <text x="0" y="112" fontSize="13" fill={C.ink}>{d.diff}</text>
        <line x1="0" y1="118" x2="86" y2="118" stroke={C.go} strokeWidth="1.8" />
        <text x="0" y="136" fontSize="13" fill={C.go} fontWeight="700">{d.a}</text>
        <text x="96" y="126" fontSize="13" fill={C.ink}>× 100  =  {d.res}</text>
        <text x="236" y="112" fontSize="11" fill={C.stop} fontFamily="monospace">✗ dividing by {d.b}</text>
        <text x="236" y="128" fontSize="11" fill={C.stop} fontFamily="monospace">is the classic error</text>
      </svg>
    );
  }

  if (d.type === "compare") {
    const w = (v) => Math.max(12, (v / Math.max(d.tA, d.tB)) * 200);
    return (
      <svg viewBox="0 0 420 140" className="wd" aria-label="How to compare two totals">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">STEP 1 · total each row completely</text>
        <text x="0" y="40" fontSize="11" fill={C.ink}>{d.nA}</text>
        <rect x="110" y="28" width={w(d.tA)} height="16" fill="#2F71B855" stroke="#2F71B8" />
        <text x={118 + w(d.tA)} y="41" fontSize="11" fill={C.ink}>{d.tA}</text>
        <text x="0" y="70" fontSize="11" fill={C.ink}>{d.nB}</text>
        <rect x="110" y="58" width={w(d.tB)} height="16" fill="#F5A52455" stroke={C.sig} />
        <text x={118 + w(d.tB)} y="71" fontSize="11" fill={C.ink}>{d.tB}</text>

        <text x="0" y="100" fontSize="11" fill={C.sig} fontFamily="monospace">STEP 2 · the answer needs BOTH parts</text>
        <rect x="0" y="110" width="180" height="24" fill="none" stroke={C.go} strokeWidth="1.6" />
        <text x="90" y="126" fontSize="11.5" fill={C.go} textAnchor="middle" fontWeight="700">which one: {d.bigger}</text>
        <rect x="192" y="110" width="180" height="24" fill="none" stroke={C.go} strokeWidth="1.6" />
        <text x="282" y="126" fontSize="11.5" fill={C.go} textAnchor="middle" fontWeight="700">by how much: {d.gap}</text>
      </svg>
    );
  }

  if (d.type === "share") {
    const pct = Math.max(4, Math.min(96, d.pct));
    return (
      <svg viewBox="0 0 420 130" className="wd" aria-label="How to work out a share of a total">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">part ÷ WHOLE TABLE, not the row you are looking at</text>
        <rect x="0" y="26" width="360" height="26" fill="none" stroke={C.line} />
        <rect x="0" y="26" width={(pct / 100) * 360} height="26" fill="#3ECF8E44" stroke={C.go} strokeWidth="1.4" />
        <text x={(pct / 100) * 180} y="44" fontSize="11" fill={C.go} textAnchor="middle" fontWeight="700">{d.part}</text>
        <text x="368" y="44" fontSize="11" fill={C.ink}>whole: {d.whole}</text>
        <text x="0" y="82" fontSize="13" fill={C.ink}>{d.part}</text>
        <line x1="0" y1="88" x2="96" y2="88" stroke={C.go} strokeWidth="1.8" />
        <text x="0" y="106" fontSize="13" fill={C.go} fontWeight="700">{d.whole}</text>
        <text x="106" y="96" fontSize="13" fill={C.ink}>× 100  =  {d.res}</text>
      </svg>
    );
  }

  if (d.type === "mean") {
    return (
      <svg viewBox="0 0 420 110" className="wd" aria-label="How to work out a mean">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">add every cell in the row, then divide by how many</text>
        {d.cells.map((v, i) => (
          <g key={i}>
            <rect x={i * 62} y="26" width="52" height="26" fill="none" stroke={C.line} />
            <text x={i * 62 + 26} y="44" fontSize="11" fill={C.ink} textAnchor="middle">{v}</text>
            {i < d.cells.length - 1 && <text x={i * 62 + 55} y="44" fontSize="12" fill={C.ink}>+</text>}
          </g>
        ))}
        <text x="0" y="76" fontSize="12" fill={C.ink}>total {d.total}  ÷  {d.n}  =</text>
        <rect x="150" y="58" width="90" height="26" fill="none" stroke={C.go} strokeWidth="1.6" />
        <text x="195" y="76" fontSize="12" fill={C.go} textAnchor="middle" fontWeight="700">{d.res}</text>
      </svg>
    );
  }

  if (d.type === "tfc") {
    return (
      <svg viewBox="0 0 420 132" className="wd" aria-label="How to decide true, false or can't tell">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">ask one question, in this order</text>
        <rect x="0" y="24" width="418" height="28" fill="none" stroke={C.line} />
        <text x="10" y="42" fontSize="11.5" fill={C.ink}>Does the passage SAY it?</text>
        <text x="330" y="42" fontSize="11.5" fill={C.go} fontWeight="700">→ TRUE</text>
        <rect x="0" y="58" width="418" height="28" fill="none" stroke={C.line} />
        <text x="10" y="76" fontSize="11.5" fill={C.ink}>Does the passage CONTRADICT it?</text>
        <text x="326" y="76" fontSize="11.5" fill={C.stop} fontWeight="700">→ FALSE</text>
        <rect x="0" y="92" width="418" height="28" fill="none" stroke={C.sig} strokeWidth="1.8" />
        <text x="10" y="110" fontSize="11.5" fill={C.ink}>Neither? The passage is SILENT.</text>
        <text x="300" y="110" fontSize="11.5" fill={C.sig} fontWeight="700">→ CAN'T TELL</text>
      </svg>
    );
  }
  return null;
}

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

function makeSjt(n, weak, theme) {
  const pool = [];
  const scenarios = shuffle(SJT_SCENARIOS.filter((s) => !theme || theme === "all" || s.theme === theme));
  scenarios.forEach((sc) => {
    if (sc.ranking) {
      pool.push({ kind: "rank", scenarioText: sc.text, themeName: SJT_THEMES[sc.theme].name, stem: sc.ranking.stem, options: sc.ranking.options, order: sc.ranking.order, why: sc.ranking.why, improve: sc.ranking.fix, tag: "jrank", section: "SJT", drill: "sjt", typeName: "Ranking" });
    }
    shuffle(sc.items).forEach((it) => {
      pool.push({ kind: "scale", scenarioText: sc.text, themeName: SJT_THEMES[sc.theme].name, stem: it.stem, options: it.type === "importance" ? IMPORT : APPROP, answer: it.answer, why: it.why, improve: it.fix, tag: "j" + it.type, section: "SJT", drill: "sjt", typeName: SJT_TYPES[it.type].name });
    });
  });
  return shuffle(pool).slice(0, Math.min(n, pool.length));
}

const WEAK_LABEL = {
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
  const [unlocked, best, history, plan, weak, level, mistakes, prefs] = await Promise.all([
    getJSON("ucat:unlocked", false), getJSON("ucat:best", {}), getJSON("ucat:history", []),
    getJSON("ucat:plan", {}), getJSON("ucat:weak", {}), getJSON("ucat:level", "medium"),
    getJSON("ucat:mistakes", []), getJSON("ucat:prefs", {}),
  ]);
  return { unlocked: unlocked === true, best, history, plan, weak, level, mistakes, prefs };
}

/* Styles live in ./styles.js and are imported as CSS at the top. */

/* ------------------------------ EXIT GUARD ------------------------ */

function BrandMark({ onClick }) {
  return (
    <button className="ud-markbtn" onClick={onClick} aria-label="Go to home">
      <span className="ud-mark"><b>Tempo</b><span>UCAT trainer</span></span>
    </button>
  );
}

function ExitGuard({ open, onStay, onLeave }) {
  if (!open) return null;
  return (
    <div className="ud-modal" role="dialog" aria-modal="true">
      <div className="box">
        <h3>Leave this session?</h3>
        <p>This run's answers won't be saved to your history or mistake bank.</p>
        <div className="row">
          <button className="ud-btn ghost" onClick={onStay}>Stay</button>
          <button className="ud-btn" onClick={onLeave}>Leave session</button>
        </div>
      </div>
    </div>
  );
}

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

function DrillRunner({ drill, questions, exam, budget, showCalc, onDone, onQuit }) {
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
    else { setI(i + 1); setVal(""); setRankPicks([]); setSyllPicks([]); setPicked(null); setShowWhy(false); setPhase("answer"); start.current = Date.now(); setElapsed(0); }
  }, [i, questions.length, onDone]);

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
    if (correct) {
      setPhase("celebrate");
      setTimeout(() => advance(list), 780);
    } else {
      setPhase("review");
    }
  }, [q, log, advance]);

  useEffect(() => {
    const t = setInterval(() => {
      if (phaseRef.current !== "answer") return;
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
  }, [exam, budgetMs, record, q]);

  useEffect(() => { if (inputRef.current && phase === "answer" && !showCalc) inputRef.current.focus(); }, [i, phase, showCalc]);

  const left = budgetMs - elapsed;
  const frac = budgetMs > 0 ? Math.max(left / budgetMs, 0) : 1;
  const gmax = q.graph ? Math.max(...q.graph.values) : 1;

  const rankTap = (idx) => {
    if (phase !== "answer" || rankPicks.includes(idx)) return;
    const next = [...rankPicks, idx];
    setRankPicks(next);
    if (next.length === 3) record(next);
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
    setPhase("answer"); start.current = Date.now(); setElapsed(0);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); if (phaseRef.current === "answer") { if (hasAnswer) submitExam(); } else advance(log); }
      if (k === "p") { e.preventDefault(); goBack(); }
      if (k === "f") { e.preventDefault(); setFlagged((f) => f.includes(i) ? f.filter((x) => x !== i) : [...f, i]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stars = ["★", "✦", "★", "✧", "★"];

  const examSkin = drill.section === "SJT" || drill.section === "DM" || drill.id === "qrset";

  if (examSkin) {
    const total = questions.length;
    return (
      <div className="vx">
        <ExitGuard open={confirmExit} onStay={() => setConfirmExit(false)} onLeave={onQuit} />
        <div className="vx-top">
          <span className="ttl">{drill.section === "SJT" ? "Situational Judgement" : "Decision Making"} Question Bank</span>
          <span className="cnt mono">{i + 1} of {total}</span>
        </div>
        <div className="vx-bar">
          <button className="vx-tool" onClick={() => setShowWhy((o) => !o)} disabled={phase === "answer"}>
            <span className="ic">◈</span> Explain Answer
          </button>
          <button className="vx-tool" onClick={() => setCalcOpen((o) => !o)}><span className="ic">▤</span> Calculator</button>
          <span className="vx-spacer" />
          <button className={`vx-tool${flagged.includes(i) ? " on" : ""}`} onClick={() => setFlagged((f) => f.includes(i) ? f.filter((x) => x !== i) : [...f, i])}>
            <span className="ic">⚑</span> Flag for Review
          </button>
          <span className="vx-scheme">Colour Scheme ▾</span>
        </div>

        <div className="vx-body">
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
                    <p>{q.why || q.working}</p>
                    {q.improve && <p className="imp">{q.improve}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="vx-foot">
          <button className="vx-nav" onClick={() => setConfirmExit(true)}>✕ End Session</button>
          {exam && <span className="vx-clock mono">{Math.max(left / 1000, 0).toFixed(0)}s</span>}
          <span className="vx-spacer" />
          <span className="vx-hint">Alt+P previous · Alt+N next · Alt+F flag</span>
          <button className="vx-nav" onClick={goBack} disabled={i === 0}>◀ Previous</button>
          {phase === "answer" ? (
            <button className="vx-nav main" onClick={submitExam} disabled={!hasAnswer}>Next ▶</button>
          ) : (
            <button className="vx-nav main" onClick={() => { setShowWhy(false); advance(log); }}>Next ▶</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ud-run">
      <ExitGuard open={confirmExit} onStay={() => setConfirmExit(false)} onLeave={onQuit} />
      <div className="ud-runbar">
        <BrandMark onClick={() => setConfirmExit(true)} />
        <div className={`ud-clock mono${exam && frac < 0.25 ? " warn" : ""}`}>
          {exam ? `${Math.max(left / 1000, 0).toFixed(1)}s` : fmt(elapsed)}
        </div>
        {exam && <span className="ud-examflag">TIMED</span>}
        <div className="ud-prog"><i style={{ width: `${(i / questions.length) * 100}%` }} /></div>
        <span className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{i + 1}/{questions.length}</span>
        <button className="ud-quit" onClick={() => setConfirmExit(true)}>End</button>
      </div>
      <div className="ud-stage">
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
              <text x="66" y="18" fontSize="10.5" fill="#10233A" fontFamily="monospace">{q.venn3.la}</text>
              <text x="196" y="18" fontSize="10.5" fill="#10233A" fontFamily="monospace">{q.venn3.lb}</text>
              <text x="188" y="164" fontSize="10.5" fill="#10233A" fontFamily="monospace">{q.venn3.lc}</text>
              <text x="86" y="60" fontSize="13" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn3.a}</text>
              <text x="208" y="60" fontSize="13" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn3.b}</text>
              <text x="147" y="146" fontSize="13" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn3.c}</text>
              <text x="147" y="52" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn3.ab}</text>
              <text x="113" y="106" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn3.ac}</text>
              <text x="181" y="106" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn3.bc}</text>
              <text x="147" y="88" fontSize="12" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn3.abc}</text>
              <text x="34" y="164" fontSize="10.5" fill="#5A6675" fontFamily="monospace">{q.venn3.none} neither</text>
            </svg>
          )}
          {q.venn && (
            <svg viewBox="0 0 300 140" style={{ width: "100%", maxWidth: 320, margin: "4px 0 12px" }} aria-label="Venn diagram">
              <rect x="1" y="1" width="298" height="138" fill="#fff" stroke="#9DB2C8" rx="4" />
              <circle cx="115" cy="70" r="48" fill="#2F71B822" stroke="#2F71B8" strokeWidth="1.5" />
              <circle cx="185" cy="70" r="48" fill="#F5A52422" stroke="#B97A0E" strokeWidth="1.5" />
              <text x="90" y="20" fontSize="11" fill="#10233A" fontFamily="monospace">{q.venn.la}</text>
              <text x="178" y="20" fontSize="11" fill="#10233A" fontFamily="monospace">{q.venn.lb}</text>
              <text x="90" y="75" fontSize="14" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn.onlyA}</text>
              <text x="150" y="75" fontSize="14" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn.both}</text>
              <text x="210" y="75" fontSize="14" fontWeight="700" fill="#10233A" fontFamily="monospace" textAnchor="middle">{q.venn.onlyB}</text>
              <text x="264" y="128" fontSize="11" fill="#5A6675" fontFamily="monospace" textAnchor="middle">{q.venn.neither} neither</text>
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
            q.options.map((o, n) => (
              <button key={n} className="ud-opt" onClick={() => record(q.kind === "mcq" ? o : n)} disabled={phase !== "answer"}>
                <b>{String.fromCharCode(65 + n)}</b>{o}
              </button>
            ))
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
              <p>{q.why || q.working}</p>
              {q.improve && <p className="improve">{q.improve}</p>}
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

/* ------------------------------ RESULTS --------------------------- */

function Results({ drill, log, meta, exam, history, onHome, onAgain, onMistakes, missedNow, budget, onDiagDrill }) {
  const vrDiag = diagnoseVR(log, exam, budget);
  const points = log.reduce((a, l) => a + l.score, 0);
  const pct = log.length ? Math.round((points / log.length) * 100) : 0;
  const times = log.map((l) => l.ms);
  const med = median(times);
  const max = Math.max(...times, 1);
  const prior = history.filter((h) => h.drill === drill.id).slice(0, -1);
  const lastPct = prior.length ? prior[prior.length - 1].pct : null;
  const delta = lastPct === null ? null : pct - lastPct;
  const isSjt = drill.id === "sjt";
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
      <div className="ud-sec"><h2>Where the time went</h2><i /><span>bar width = seconds</span></div>
      <div className="ud-strip">
        {log.map((l, i) => (
          <div className="ud-row" key={i}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div className="ud-bar" style={{ width: `${Math.max((l.ms / max) * 76, 2)}%`, background: l.correct ? "var(--go)" : l.score > 0 ? "var(--signal)" : "var(--stop)" }} />
            <em>{fmt(l.ms)}{l.score > 0 && l.score < 1 ? " · partial" : ""}</em>
          </div>
        ))}
      </div>
      {vrDiag && (
        <div className={`vr-diag ${vrDiag.tone}`}>
          <span className="k">Diagnosis</span>
          <h3>{vrDiag.title}</h3>
          <p>{vrDiag.body}</p>
          <ul>{vrDiag.todo.map((t, n) => <li key={n}>{t}</li>)}</ul>
          {onDiagDrill && <button className="ud-btn" onClick={() => onDiagDrill(vrDiag.drill)}>Start the {DRILL_BY_ID[vrDiag.drill].name} drill</button>}
        </div>
      )}
      <p className="ud-tip">{TIPS[drill.id] || TIPS.mistakes}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="ud-btn" onClick={onAgain}>Run it again</button>
        {missedNow > 0 && <button className="ud-btn ghost" onClick={onMistakes}>Retry the {missedNow} you missed</button>}
        <button className="ud-btn ghost" onClick={onHome}>All drills</button>
      </div>
    </div>
  );
}

/* ------------------------------ HOME ------------------------------ */

function Home({ unlocked, best, prefs, setPrefs, onStart, onUnlock, mistakesCount, onMistakes, onLearnSjt, onGoto, planNext }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [estOpen, setEstOpen] = useState(false);
  const [sjtOpen, setSjtOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const secs = [
    ["QR", "Quantitative Reasoning", "arithmetic under pressure"],
    ["VR", "Verbal Reasoning", "the weakest subtest nationally"],
    ["DM", "Decision Making", "logic you can learn as patterns"],
    ["SJT", "Situational Judgement", "banded separately, learnable"],
  ];

  const tryCode = () => { if (code.trim().toUpperCase() === "UCAT25") { setErr(""); onUnlock(); } else setErr("That code isn't recognised."); };

  const startDrill = (d, sub) => {
    if (d.id === "estimate" && !sub) { setEstOpen((o) => !o); return; }
    if (d.id === "dm" && !sub) { setDmOpen((o) => !o); return; }
    if (d.id === "sjt" && !sub) { setSjtOpen((o) => !o); return; }
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
      <div className="ud-hero">
        <div className="ud-eyebrow">VR · QR · DM · SJT · The training layer</div>
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

      <CountdownStrip prefs={prefs} setPrefs={setPrefs} />

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
        <button className="ud-tcard" onClick={() => onGoto("learn")}>
          <span className="k">Learn</span>
          <b>Technique first</b>
          <span className="d">Every drill's method, one page each</span>
        </button>
      </div>

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
          {sec === "DM" && dmOpen && (
            <div className="ud-subs">
              {DM_SUBS.map((s2) => (
                <button key={s2.id} className="ud-sub" onClick={() => startDrill(DRILL_BY_ID.dm, s2.id)}>
                  <b>{s2.name}</b><span>{s2.desc}</span>
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
                <b>Practice questions</b><span>All three official formats with a written reason for every answer and a band estimate at the end.</span>
              </button>
            </div>
          )}
        </React.Fragment>
      ))}

      {!unlocked && (
        <div className="ud-price">
          <div>
            <h3>£25, once</h3>
            <p>Every drill, the Learn pages, the weekly VR and QR mocks with leaderboards, the six week plan, the spaced mistake bank, and timed mode with extra time options. Built to run alongside whichever question bank you use. No subscription, nothing to cancel. Times tables stays free either way.</p>
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

function LearnView({ unlocked, onStart, onUnlock }) {
  return (
    <div className="ud-wrap">
      <UcatFacts />
      {LEARN.map((sec) => (
        <React.Fragment key={sec.id}>
          <div className="ud-sec" style={{ paddingTop: 32 }}><h2>{sec.title}</h2><i /><span>{sec.cards.length + (sec.extra ? sec.extra.length : 0)} topics</span></div>
          <p className="ud-learn-intro">{sec.intro}</p>
          <div className="ud-lgrid">
            {sec.cards.map((c, n) => (
              <div className="ud-lcard" key={n}>
                <h4>{c.h}</h4>
                {unlocked ? <p>{c.p}</p> : (
                  <Locked onUnlock={onUnlock} label="Full technique with access">
                    <p>{c.p}</p>
                  </Locked>
                )}
                {c.drill && (
                  <button
                    onClick={() => onStart(DRILL_BY_ID[c.drill], false, DRILL_BY_ID[c.drill].def, null, c.sub || null, c.theme || null)}
                    disabled={!unlocked && !DRILL_BY_ID[c.drill].free}
                  >
                    {!unlocked && !DRILL_BY_ID[c.drill].free ? "LOCKED" : "DRILL THIS"}
                  </button>
                )}
              </div>
            ))}
            {sec.extra && sec.extra.map((c, n) => (
              <div className="ud-lcard" key={"x" + n}>
                <h4>{c.h}</h4>
                {unlocked ? <p>{c.p}</p> : (
                  <Locked onUnlock={onUnlock} label="Full technique with access"><p>{c.p}</p></Locked>
                )}
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}

      <div style={{ height: 50 }} />
    </div>
  );
}

/* ------------------------------ PLAN VIEW ------------------------- */

function PlanView({ unlocked, plan, onStart }) {
  const nextKey = PLAN_KEYS.find((k) => !plan[k]);
  const doneCount = PLAN_KEYS.filter((k) => plan[k]).length;
  let nextInfo = null;
  if (nextKey) {
    const w = Number(nextKey.match(/w(\d+)/)[1]);
    const d = Number(nextKey.match(/d(\d+)/)[1]);
    const week = PLAN.find((x) => x.week === w);
    nextInfo = { week, day: week.days[d - 1], w, d, key: nextKey };
  }
  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Six week plan</h2><i /><span>{doneCount}/{PLAN_KEYS.length} sessions done</span></div>
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
      {PLAN.map((w) => (
        <div className="ud-week" key={w.week}>
          <div className="ud-weekhead"><span>Week {w.week}</span><b>{w.theme}</b><p>{w.note}</p></div>
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
      ))}
      <div style={{ height: 50 }} />
    </div>
  );
}

/* ------------------------------ PROGRESS / MISTAKES --------------- */

function ProgressView({ history, weak }) {
  const byDrill = {};
  history.forEach((h) => { (byDrill[h.drill] = byDrill[h.drill] || []).push(h); });
  const ids = Object.keys(byDrill);
  const weakTop = Object.entries(weak).sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 2).slice(0, 10);
  return (
    <div className="ud-wrap">
      <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Progress</h2><i /><span>{history.length} runs recorded</span></div>
      {ids.length === 0 && (
        <p className="ud-empty">Nothing here yet. Finish a drill and your accuracy starts plotting from the next run. Green bars are timed runs.</p>
      )}
      {ids.map((id) => {
        const runs = byDrill[id].slice(-12);
        const d = DRILL_BY_ID[id] || { name: id };
        const first = runs[0], last = runs[runs.length - 1];
        const trend = runs.length > 1 ? last.pct - first.pct : null;
        return (
          <div className="ud-trend" key={id}>
            <header>
              <h3>{d.name}</h3>
              <span className="sum">{runs.length} runs · latest {last.pct}% · median {fmt(last.med)}{trend !== null && ` · ${trend >= 0 ? "+" : ""}${trend} pts`}</span>
            </header>
            <div className="ud-spark">{runs.map((r, i) => <div key={i} className={r.exam ? "exam" : ""} style={{ height: `${Math.max(r.pct, 3)}%` }} title={`${r.pct}%`} />)}</div>
            <div className="ud-axis"><span>oldest</span><span>latest</span></div>
          </div>
        );
      })}
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
          <button className="ud-btn" onClick={onRetry} disabled={active.length === 0}>Retry the {active.length} due now</button>
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

function SjtLearn({ onPractice, onBack }) {
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
    <div className="ud-wrap">
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
          <button className="ud-btn ghost" onClick={() => (idx === 0 ? onBack() : go(idx - 1))}>
            {idx === 0 ? "Back" : "Previous"}
          </button>
          {!atEnd && (
            <button className="ud-btn" disabled={!answered} onClick={() => go(idx + 1)}>
              {answered ? "Next" : "Answer to continue"}
            </button>
          )}
          {atEnd && answered && (
            <button className="ud-btn" onClick={onPractice}>Practise the SJT now</button>
          )}
        </div>
      </div>
    </div>
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

const IV_THEMES = [
  {
    id: "motivation", name: "Motivation", tracks: ["dent", "med"],
    what: "The single most predictable station. They are testing whether your reasons survive contact with reality, not whether they sound noble.",
    qs: [
      { q: "Why dentistry?", t: "dent", g: "Structure it as a journey: the spark, how you tested it (work experience, conversations, reading), and what confirmed it despite the downsides. Name something specific you saw. Mention what dentistry gives that medicine does not: ownership of treatment start to finish, manual craft, running a practice, work-life balance stated carefully. The trap is generic 'helping people', which fits forty careers." },
      { q: "Why medicine?", t: "med", g: "Same journey shape: spark, testing, confirmation. Tie it to evidence from your own experience, then show realism: mention a difficulty you observed (pressure, rationing, emotional load) and why you still choose it. Wanting the science plus the human contact is fine if you can name a moment that proved both to you." },
      { q: "Why not medicine instead?", t: "dent", g: "They want a positive case for dentistry, not a rejection of medicine. Talk about definitive treatment in one chair, the craft element, long-term patient relationships, and earlier clinical independence. Never say easier hours as your lead reason, even if it is a real one; frame it as sustainable career design if it comes up." },
      { q: "What will you find hardest about this career?", g: "Pick something real: repetitive strain and precision work, anxious or angry patients, NHS system pressure, business responsibility. Then show a coping strategy you already use. Claiming nothing will be hard scores zero for self-insight." },
      { q: "If you don't get an offer this cycle, what will you do?", g: "The panel wants commitment with a spine. Give a concrete plan: which parts of the application you would strengthen, how you would use the year (work in a dental setting, deepen experience, retake the UCAT with a target), and that you would reapply. Vague devastation scores nothing; a calm rebuild plan shows the resilience the whole career demands." },
      { q: "What do you know about the course at this university?", g: "Have three concrete facts: teaching style, when clinical contact starts, and one thing genuinely distinctive. Then link one of them to how you learn. This question is a free gift to anyone who did twenty minutes of research and a trap for everyone else." },
    ],
  },
  {
    id: "workexp", name: "Work experience", tracks: ["dent", "med"],
    what: "Not a test of what you got access to. A test of what you extracted from whatever you got.",
    qs: [
      { q: "Tell me about your work experience.", g: "Pick two moments, not the whole diary. For each: what happened, what you noticed about the professional's behaviour, and what it taught you about the career. If your access was limited, say so plainly and show how you compensated: online programmes, speaking to professionals, volunteering. Honesty about limited access plus deep reflection beats exaggeration every time." },
      { q: "Describe something difficult you observed and what you learnt.", g: "Choose a human moment: a frightened child, a patient refusing treatment, bad news delivered. Describe the professional's technique specifically (kneeling to eye level, offering control back, chunking information). Then the lesson, then how you have used it since. STARR fits perfectly here." },
      { q: "What did you learn about teamwork from your experience?", g: "Name the roles you saw and what each actually did: nurse, hygienist, therapist, receptionist, technician. The insight that scores: the clinician is one part of a system, and care fails when any link fails. If you saw a handover or a disagreement handled well, that is your story." },
      { q: "Describe a team that failed at something. What was your part in the failure?", g: "The trap is blaming everyone else. Own a specific contribution: you stayed quiet when you disagreed, you took too much on instead of delegating, you assumed someone else had a task covered. Then the fix you applied in a later team. Interviewers rank the candidates who can locate themselves inside a failure far above those who narrate it from the outside." },
      { q: "How has your experience changed your view of the career?", g: "The word they are listening for is realism. Something surprised you: the pace, the admin, how much talking there is, how physical the work is. Show your image updated and your commitment survived. A view that never changed suggests you were not paying attention." },
    ],
  },
  {
    id: "ethics", name: "Ethics", tracks: ["dent", "med"],
    what: "Marked on process, not conclusion. They want to watch you weigh principles out loud: autonomy, doing good, avoiding harm, fairness, honesty.",
    qs: [
      { q: "A patient refuses treatment you believe they need. What do you do?", g: "Open with the principle: a competent adult can refuse anything, and your job becomes understanding why. Check capacity gently, explore the real barrier (fear, cost, a past experience), give clear information about consequences, and leave the door open. Never say you would persuade them until they agree; that is autonomy failure in one sentence." },
      { q: "You smell alcohol on a colleague before they see patients. What do you do?", g: "Patient safety first and immediately: they must not see patients while you raise it with the supervising senior now, not after the list. Show compassion in the same breath, since this may be a health problem needing support, but be unambiguous that safety cannot wait on kindness. This is the most rehearsed scenario in interviews; the differentiator is balancing urgency with humanity." },
      { q: "Should the NHS fund cosmetic treatment?", g: "Do not pick a side in the first sentence. Set up the tension: finite resources against real psychological benefit in some cases. Distinguish cosmetic from functional-with-cosmetic-benefit, mention fairness of consistent criteria, and land on a reasoned position while acknowledging the strongest opposing point. Balance then commitment is the full-marks shape." },
      { q: "You make a clinical error that the patient has not noticed. What do you do?", g: "Duty of candour, stated as instinct: tell the patient, apologise, explain what it means and what happens next, document it, and report it so the system can learn. Mention that hiding it destroys the trust the entire profession runs on. Any hedging on whether to disclose is the wrong answer." },
      { q: "A patient asks you a question you don't know the answer to. What do you say?", g: "The professional answer is comfortable honesty: say you don't know, say you will find out, and say when they will hear back. Never bluff, because confident wrongness in healthcare hurts people. If it helps, add how you would find out: a senior, guidelines, the notes. Interviewers ask this to see whether your ego can survive three small words." },
      { q: "A 15-year-old asks for treatment and does not want their parents told.", g: "Show you know competence exists for under-16s: if they fully understand the treatment, they may consent, and confidentiality then generally applies. Encourage involving parents without requiring it, and know the safety exception: signs of harm or coercion change everything. Nuance here reads as genuine preparation." },
    ],
  },
  {
    id: "communication", name: "Communication and role play", tracks: ["dent", "med"],
    what: "MMI role-play stations mark behaviour, not knowledge: whether you listen, check understanding, and respond to the person in front of you.",
    qs: [
      { q: "Explain a complicated process to someone with no background in it.", g: "Whatever the topic, the technique is: check what they already know, explain in three plain chunks with an everyday analogy, pause after each, then ask them to tell you what they took from it. Teach-back is the professional move almost no candidate uses; using it stands out instantly." },
      { q: "Break unwelcome news to an actor (a cancelled procedure, a failed application).", g: "Warn, tell, pause. A short warning shot, the news itself in one clear sentence, then silence while they react. Acknowledge the emotion by name before any solutions. Candidates fail this station by talking through the silence; sitting with it calmly is the skill being marked." },
      { q: "Calm an angry or upset person.", g: "Let them finish without interrupting, reflect back what you heard, apologise for the experience without inventing blame, then move to one concrete next step. The mark scheme is essentially: did you listen, did they feel heard, did you stay warm and steady. It is never about winning the argument." },
      { q: "Talk to a nervous patient who fears the procedure.", g: "Especially live in dentistry, where fear is the biggest barrier to care. Name the fear as normal, offer control back (a raise-your-hand stop signal, explaining each step before doing it), and go at their pace. Showing you understand that trust is built in minutes and spent over years is the insight that scores." },
    ],
  },
  {
    id: "dexterity", name: "Manual dexterity", tracks: ["dent"],
    what: "Dentistry-specific and beloved of Birmingham and Glasgow among others. They want evidence of fine motor skill and, more importantly, of practised patience.",
    qs: [
      { q: "What have you done that demonstrates manual dexterity?", g: "Concrete hobbies with progression beat one-off claims: instrument grades, sewing, model-making, art, calligraphy, coding-adjacent soldering, even consistent mirror-drawing practice. Describe a specific difficult piece and how many attempts it took. The reflection that lands: precision is mostly patience plus deliberate repetition, which is exactly what clinical skills training demands." },
      { q: "Why does dexterity matter in dentistry?", g: "Work happens in a wet, moving, few-centimetre field, often in mirror image, for years without shortcuts. Connect it to patient outcomes: margins of error are fractions of a millimetre and mistakes are in someone's mouth. Then connect back to your evidence in one line." },
    ],
  },
  {
    id: "hot", name: "Hot topics", tracks: ["dent", "med"],
    what: "They are not testing news recall. They are testing whether you can hold a balanced, structured position on the system you are joining.",
    qs: [
      { q: "What are the biggest challenges facing NHS dentistry?", t: "dent", g: "Know three: access (people struggling to find NHS dentists, rising DIY dentistry stories), the contract and units-of-dental-activity model discouraging NHS work, and workforce drift to private practice. For each, one sentence of cause and one of consequence. Finish with why you still want in: being part of fixing access is a legitimate, memorable answer." },
      { q: "What pressures is the NHS under generally?", t: "med", g: "Pick three you can actually discuss: waiting lists and the elective backlog, workforce shortage and retention, and prevention versus treatment funding. Structure beats breadth. If asked for solutions, offer trade-offs rather than slogans; acknowledging that every fix costs something is what mature analysis sounds like." },
      { q: "Should sugary drinks be taxed more heavily?", g: "A prevention classic that ties straight into dental caries. Weigh population health benefit and NHS savings against personal freedom and the regressive cost on poorer households, mention the reformulation effect the existing levy produced, then commit with reasoning. Bringing it back to what you would tell a patient shows applied thinking." },
      { q: "Water fluoridation: for or against?", t: "dent", g: "The classic dental ethics-meets-policy question. Set the tension honestly: strong evidence it cuts decay across whole populations, particularly where brushing habits and dentist access are weakest, against the argument that mass medication removes individual choice. Mention that deprived areas gain most, which makes it partly a fairness question. Weigh both, then commit with your reasoning." },
      { q: "How will AI change your profession?", g: "Sensible middle: strong at pattern tasks like radiograph screening and triage, nowhere near the hands, the judgement, or the trust relationship. The professional's job shifts toward verification and communication. Enthusiasm plus limits reads far better than either fear or hype." },
    ],
  },
  {
    id: "selfinsight", name: "Resilience and self-insight", tracks: ["dent", "med"],
    what: "Courses are long and clinical life is heavy. They want evidence you know yourself, recover from failure, and have a life that sustains you.",
    qs: [
      { q: "Tell me about a time you failed.", g: "Pick a real failure with stakes, not a humblebrag. STARR it, spend most time on the reflection: what the failure exposed, what you changed, and a later moment proving the change stuck. Interviewers rate the candidates who own failure cleanly far above the ones who never seem to have any." },
      { q: "What is your greatest weakness?", g: "A genuine one, currently managed: overcommitting, difficulty delegating, perfectionism only if you show its real cost and your specific countermeasure. Name the mechanism you use, not just intent. Fake weaknesses are marked as evasion." },
      { q: "Tell me about a time you changed your mind about something that mattered.", g: "This tests intellectual honesty. Pick a genuine reversal: a person you misjudged, a belief about the career, a study method you defended too long. Name the evidence that turned you and how quickly you let it. The insight that lands: changing your mind on evidence is a clinical skill, not a weakness, because patients pay when professionals cannot update." },
      { q: "Teach me something you know well in one minute.", g: "A live test of audience awareness. Pick something small and concrete, check what they already know in one sentence, teach it in three steps with an everyday comparison, then close with a one-line summary. What is marked is not the topic but whether you structured for the listener and finished inside the time." },
      { q: "How do you manage stress?", g: "Name your actual system: sport, music, faith, friends, structured planning, sleep discipline. Then prove it with a specific pressured period you got through and what you noticed about your limits. The word burnout used accurately, as something you actively design against, lands well." },
      { q: "What would you bring to this university?", g: "Two specifics beat five generics: a society you would join or start, a skill you would teach others, a community thing you already do that you would continue. Tie one to something the university actually has. This is also a research question in disguise." },
    ],
  },
];

/* ------------------------------ UNI DATA -------------------------- */
/* Figures compiled from the applicant's 2025-cycle research notes.   */
/* Facts only, reworded; always confirm on official pages before      */
/* submitting UCAS choices. UCAT scale: 900-2700 plus SJT band.       */

/* When each admissions dataset was last checked against official
   sources. These figures go stale every cycle, so update the relevant
   entry whenever you reconfirm a dataset and the UI updates with it. */
const DATA_CHECKED = {
  ukDental: "the 2025 admissions cycle",
  ukMed: "the 2025 admissions cycle",
  australia: "the 2025 admissions cycle",
  fees: "2026 entry figures",
};

const UNIS = [
  { id: "belfast", col: "#C8102E", hosp: "School of Dentistry on the Royal Victoria Hospital site, west of the city centre.", course: "Five-year BDS mixing lectures, e-learning and early practical skills, with clinical treatment sessions building from mid-course.", plc: "Outreach placements across Northern Ireland trusts in the later years.", rent: [450, 600], intl: "roughly £42k-£48k a year", near: "Titanic Quarter, the Cathedral Quarter music scene, and the coast an hour away.", name: "Queen's University Belfast", cut: 1600, safer: 1800, pi: 15,
    weight: "Points system out of 42: GCSEs up to 36, UCAT banded up to 6. GCSEs dominate.",
    gcse: { style: "nines", need: 9, msg: "Scores your nine best GCSEs; grade 9s worth most, so near-perfect GCSEs are the real entry ticket." },
    band4: true, pred: "AAA", note: "Chem and Bio required. Strong GCSE profiles can enter with comparatively low UCAT." },
  { id: "dundee", col: "#5B2C6F", hosp: "Dundee Dental Hospital and School on Park Place, right inside the campus.", course: "Spiral curriculum: clinical science foundations laid early then revisited and deepened every year, with unusually early chairside time.", plc: "Community outreach across Tayside and Fife in senior years.", rent: [450, 600], intl: "roughly £42k-£50k a year", near: "V&A Dundee on the waterfront, cheap student living, and the Highlands at weekend distance.", name: "University of Dundee", cut: 1850, pi: 13, piScot: 44,
    weight: "Roughly 60:40 between academics (all GCSEs weighted plus predicted grades) and UCAT.",
    gcse: { style: "spread", msg: "Every GCSE counts toward shortlisting; Maths and English 6 minimum." },
    band4: true, pred: "AAA", note: "Post-interview odds are far higher for Scottish applicants than rest-of-UK." },
  { id: "cardiff", col: "#D2232A", hosp: "University Dental Hospital at the Heath Park campus, shared with the medical school.", course: "Traditional integrated course blending pre-clinical science with patient exposure from early on.", plc: "Wales-wide outreach clinics in the final two years.", rent: [550, 750], intl: "roughly £45k-£52k a year", near: "Bute Park, the Bay, match days at the Principality, and mountains within an hour.", name: "Cardiff University", cut: 1950, cutNote: "cut-off only applied after GCSE scoring; roughly 1950-2030 in recent cycles", pi: 39,
    weight: "GCSEs scored out of 28 from your best seven at 8 or 9; UCAT used to separate the top scorers.",
    gcse: { style: "topSeven", msg: "Realistically needs seven 8s and 9s for full GCSE points; English 6, Bio and Chem 7 minimum." },
    band4: false, pred: null, note: "Predicted grades not scored. If you firm Cardiff and miss the offer, they hold your place for a resit year." },
  { id: "liverpool", col: "#1B4F8A", hosp: "Liverpool University Dental Hospital on Pembroke Place, a short walk from central campus.", course: "Integrated teaching with patient contact from first year, one of the earliest in the UK.", plc: "Merseyside outreach clinics in senior years.", rent: [500, 700], intl: "roughly £42k-£50k a year", near: "Two cathedrals, the Baltic Triangle, football culture, and famously low student living costs.", name: "University of Liverpool", cut: 1850, pi: 22,
    weight: "UCAT alongside a non-academic information form that genuinely matters.",
    gcse: { style: "six6", msg: "Six GCSEs at 6+ including Bio, Chem, English and Maths." },
    band4: false, pred: null, note: "1800s possible when the non-academic form is exceptional. Eleven-station MMI." },
  { id: "leeds", col: "#00693C", hosp: "Leeds Dental Institute in the Worsley Building, centre of the university precinct.", course: "Integrated course with clinical exposure from year one; the only UK dental degree that graduates you with an integrated masters.", plc: "Yorkshire community placements in later years.", rent: [550, 750], intl: "roughly £45k-£52k a year", near: "Hyde Park student life, the Dales north of the city, and a big-city centre on your doorstep.", name: "University of Leeds", cut: 1900, cutNote: "1900+ in 2025, was about 2030 the year before", pi: 13,
    weight: "GCSEs heavily weighted plus UCAT plus a personal statement focused on reflection.",
    gcse: { style: "eights", need: 8, msg: "Eight grade 8s and 9s is the competitive shape, including Bio, Chem, English, Maths." },
    band4: true, pred: "AAA", note: "Lowest post-interview conversion on the list alongside Dundee; interview prep is everything here." },
  { id: "glasgow", col: "#003865", hosp: "Glasgow Dental Hospital and School on Sauchiehall Street in the city centre.", course: "Traditionally structured: two pre-clinical years building science foundations, three clinical years applying them. Rare now, and loved by people who want the science first.", plc: "West of Scotland outreach in the clinical years.", rent: [550, 750], intl: "roughly £45k-£52k a year", near: "Kelvingrove, the West End, the best music scene in Scotland, and lochs an hour north.", name: "University of Glasgow", cut: 1970, cutScot: 1870, pi: 60, piScot: 70,
    weight: "UCAT carries full pre-interview weight and the SJT band is not considered at all.",
    gcse: { style: "six7", msg: "Six subjects at grade 7 including Maths or Physics and English." },
    band4: true, pred: "AAA", note: "The standout option for anyone with a strong score and a Band 4. Panel interview, Scottish style." },
  { id: "plymouth", ctxFriendly: true, col: "#0B7285", hosp: "Peninsula Dental School with clinics at Derriford and city education facilities.", course: "Problem-based learning in small groups from day one, mirroring how real dental teams work, supported by guided tutorials.", plc: "Peninsula Dental Social Enterprise clinics treat thousands of NHS patients, so student care is real care early.", rent: [500, 700], intl: "roughly £40k-£48k a year", near: "The Hoe and the Sound, Dartmoor twenty minutes away, and Cornwall beaches for surf weekends.", name: "University of Plymouth", cut: 2000, cutNote: "interview averages around 1960", pi: 28,
    weight: "UCAT plus predicted grades; the personal statement is not used for selection.",
    gcse: { style: "low", msg: "Seven GCSEs at grade 4+, the gentlest GCSE bar on the list." },
    band4: false, pred: null, note: "Friendly to contextual applicants and to strong UCAT scores with weaker GCSE profiles." },
  { id: "sheffield", col: "#251D5A", hosp: "Charles Clifford Dental Hospital beside the Royal Hallamshire, up the hill from the students union.", course: "Theory taught alongside clinical practice throughout, and dentists train side by side with hygiene and therapy students, which teaches the whole team early.", plc: "South Yorkshire outreach in senior years.", rent: [500, 680], intl: "roughly £42k-£50k a year", near: "The Peak District starts at the city edge; cheap living and a famously friendly student city.", name: "University of Sheffield", cut: 1990, pi: 42,
    weight: "Straight UCAT cut-off carries full pre-interview weight; VR used for borderline decisions.",
    gcse: { style: "six7", msg: "Six subjects at grade 7 including Maths, English and sciences." },
    band4: "reject", pred: "AAA", note: "Automatically rejects SJT Band 4. Consistent 1990 cut-off three years running." },
  { id: "qmul", col: "#003E74", hosp: "Institute of Dentistry at the Royal London Hospital, Whitechapel, East London.", course: "Integrated course with clinics from first year, drawing on one of the busiest and most diverse patient populations in Europe.", plc: "Placements across Barts Health sites in East London.", rent: [950, 1400], intl: "roughly £50k-£58k a year", near: "Brick Lane, Victoria Park, the whole of London on the doorstep, priced accordingly.", name: "Queen Mary University of London", cut: 2030, pi: 68,
    weight: "UCAT decile plus SJT Band 1-3 required; high predicted grades expected.",
    gcse: { style: "mix", msg: "Three 7s and three 6s minimum including English, Maths, Bio, Chem." },
    band4: "reject", pred: "A*AA", note: "The best post-interview conversion in the country at 68 per cent. A*AA predicted is the price of entry." },
  { id: "newcastle", col: "#1C3F94", hosp: "Newcastle Dental Hospital on Richardson Road, attached to the medical campus.", course: "Lectures, seminars and lab demonstration teaching, with first years shadowing seniors on clinics so pre-clinical knowledge lands in context immediately.", plc: "North East community clinics in later years.", rent: [500, 700], intl: "roughly £42k-£50k a year", near: "Quayside nights, the coast at Tynemouth on the Metro, and the cheapest big-city living in England.", name: "Newcastle University", cut: 2100, cutNote: "interview averages 2080-2130", pi: 31,
    weight: "UCAT dominates selection; GCSE requirements are minimal.",
    gcse: { style: "low", msg: "Maths and English at grade 4. The option for high UCAT scores with weak GCSE years." },
    band4: true, pred: null, note: "Twenty-minute panel scoring motivation, learning skills, teamwork, resilience, empathy out of 30." },
  { id: "manchester", col: "#6A0F49", hosp: "University Dental Hospital of Manchester on Oxford Road, in the middle of the campus corridor.", course: "Balances traditional grounding, including dissection-based anatomy which is rare in dentistry, with early clinical exposure and PBL.", plc: "Greater Manchester outreach clinics in senior years.", rent: [600, 850], intl: "roughly £45k-£53k a year", near: "Northern Quarter, live music every night of the week, and two football giants.", name: "University of Manchester", cut: 2130, cutCtx: 2060, cutNote: "2130 in 2025; contextual threshold nearer 2060", pi: 36,
    weight: "UCAT cut-off, softened slightly by strong GCSEs and predictions; contextual criteria lower both bars.",
    gcse: { style: "seven7", msg: "Seven GCSEs at grade 7+ including English, Maths and two sciences." },
    band4: false, pred: null, note: "Five-station MMI, seven minutes each. Dissection-based teaching, unusual for dentistry." },
  { id: "kcl", col: "#E2231A", hosp: "Guy's Tower at London Bridge, the largest dental teaching centre in Europe.", course: "Integrated course with haptic simulation suites for practical skills, then heavy clinical volume through Guy's and partner sites.", plc: "Placements across Guy's, King's and community sites in London.", rent: [950, 1400], intl: "roughly £52k-£58k a year", near: "Borough Market under the window, the South Bank, and everything London offers at London prices.", name: "King's College London", cut: 2150, pi: 49,
    weight: "UCAT and GCSEs weighted roughly equally, with contextual factors on top.",
    gcse: { style: "eights", need: 8, msg: "Eight grade 8s and 9s is the competitive profile; English and Maths 6 minimum." },
    band4: false, pred: "A*AA", note: "2050s possible with a perfect GCSE row but risky. Virtual panel with two interviewers." },
  { id: "birmingham", col: "#003B5C", hosp: "Birmingham Dental Hospital at Pebble Mill, a short ride from the Edgbaston campus.", course: "Small-group and PBL teaching with lectures and lab work; treatments observed from first year and carried out from second, among the earliest hands-on starts anywhere.", plc: "West Midlands outreach in the clinical years.", rent: [550, 750], intl: "roughly £45k-£52k a year", near: "Canalside city centre, the Balti Triangle, and green Edgbaston student living.", name: "University of Birmingham", cut: 2160, cutNote: "2160 in 2025, 2170 the year before", pi: 43,
    weight: "UCAT carries full pre-interview weight above GCSE minimums.",
    gcse: { style: "minset", msg: "English 7, Maths 7, Bio and Chem 8 as minimums; beyond that GCSEs are unweighted." },
    band4: true, pred: "AAA", note: "Very early clinical exposure, treating patients from second year. Eight-part interview circuit." },
  { id: "bristol", ctxFriendly: true, col: "#B01C2E", hosp: "Bristol Dental School in a new city-centre building beside the BRI.", course: "Structured around four development themes taking you from scientist to practitioner, with students delivering thousands of free NHS appointments a year.", plc: "South West outreach placements in senior years.", rent: [700, 950], intl: "roughly £48k-£55k a year", near: "Harbourside, street art, the Downs, and the most expensive rents outside London on this list.", name: "University of Bristol", cut: 2300, cutNote: "jumped to 2300 in 2025 from 2190", pi: 55,
    weight: "UCAT carries full pre-interview weight; big contextual reductions.",
    gcse: { style: "low", msg: "Maths 7 and English 4, remarkably light for the UCAT level demanded." },
    band4: true, pred: "AAA", note: "The highest UCAT bar in UK dentistry, paired with a strong 55 per cent conversion for those who clear it." },
];

const GRAD_ENTRY = {
  dent: "Graduate entry into dentistry mostly means joining the standard five-year BDS as a graduate: most schools accept graduates with a 2:1, usually in a science, and some relax GCSE scrutiny in exchange. Dedicated shortened graduate programmes are rare in dentistry, and Scotland's Aberdeen route is aimed squarely at graduates, so a science degree first is a genuine second road in, just a longer and more expensive one. Check each school's graduate policy directly, because they differ more than any other criterion.",
  med: "Medicine has a real graduate-entry ecosystem: four-year GEM programmes at schools such as Warwick, Swansea, ScotGEM and others, usually wanting a 2:1, with their own admissions tests and fierce competition. Standard five-year courses also take graduates. If this cycle fails, a strong science degree keeps both doors open.",
};

/* ------------------------------ INTERNATIONAL --------------------- */
/* Figures verified against 2026 published sources. Fees rise yearly  */
/* and vary by school and by clinical year, so every number is shown  */
/* as a range and flagged for confirmation.                           */

const INTL = {
  uk: {
    label: "United Kingdom",
    home: "Home students in England and Wales pay a capped tuition fee of about £9,790 a year for 2026 entry, expected to rise to roughly £10,050 for 2027. Scotland and Northern Ireland differ depending on where you are from.",
    range: "About £30,150 to £70,554 a year, averaging roughly £47,700 across schools that admit overseas students.",
    total: "Across a five or six year degree, most international students pay roughly £230,000 to £420,000 in tuition alone.",
    cheap: "Leicester, Birmingham and Southampton start around £30,150, though clinical years usually cost more than pre-clinical ones.",
    dear: "Cambridge is the most expensive at about £70,554 a year, plus a separate college fee.",
    notes: [
      "Several UK schools admit home students only, so check eligibility before you spend an application on one.",
      "Scotland applies a mandatory national levy for overseas medical students covering NHS clinical teaching costs, which is built into the tuition fee.",
      "Clinical years frequently carry a higher fee than the earlier years. Budget for the higher figure, not the headline one.",
      "Living costs sit outside tuition entirely: London and Bristol are the expensive end, Belfast, Dundee and Liverpool the cheapest.",
    ],
  },
  au: {
    label: "Australia and New Zealand",
    home: "Domestic students access Commonwealth Supported Places with student contribution amounts far below international rates, and can defer payment through HECS-HELP.",
    range: "Roughly A$40,000 to A$70,000 a year for most programmes, with some medicine and dentistry places reaching A$90,000 or more.",
    total: "Dentistry sits at the top end internationally, so a full programme commonly runs well beyond A$300,000 in tuition.",
    cheap: "Regional campuses and universities outside Sydney and Melbourne are generally the more affordable end.",
    dear: "Metropolitan medicine and dentistry programmes at the largest universities are the most expensive.",
    notes: [
      "A student visa, subclass 500, requires you to demonstrate access to at least A$29,710 a year for living costs, entirely separate from tuition.",
      "Overseas Student Health Cover is mandatory for the whole visa period and is an additional cost.",
      "All in, tuition plus living, budget roughly A$55,000 to A$90,000 a year.",
      "Adelaide, the Gold Coast and regional campuses are the cheapest places to live; Sydney and Melbourne the most expensive.",
    ],
  },
};

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

function LastChecked({ when }) {
  return (
    <p className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: "0.04em", margin: "10px 0 0" }}>
      Last checked against official sources: {when}. Always confirm on the university's own page before deciding.
    </p>
  );
}

/* Automated-marking notice. The marking is fixed rules, not AI, and
   nothing the user writes leaves their device. Shown at every surface
   that marks writing. */
function MarkingNotice() {
  return (
    <p className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: "0.04em", margin: "10px 0 0", lineHeight: 1.55 }}>
      {MARKING_DISCLOSURE_SHORT}
    </p>
  );
}

/* Short independence and not-advice disclaimer, for the interview and
   university sections and the home footer. */
function SiteDisclaimer() {
  return (
    <p className="ud-empty" style={{ paddingTop: 10, fontSize: 11.5, lineHeight: 1.6 }}>{DISCLAIMER_SHORT}</p>
  );
}

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

const AU_DENT = [
  { id: "a_usyd", name: "University of Sydney", state: "NSW", col: "#E64626", deg: "Double degree dentistry",
    atar: 99.95, atarNote: "strict cut-off", ucat: "none", sel: "Panel assessment rather than UCAT. The highest academic bar in the country.",
    note: "Effectively a pure ATAR pathway. If you are not at the very top of the state, this is not the door." },
  { id: "a_uq", name: "University of Queensland", state: "QLD", col: "#51247A", deg: "BDSc (Honours)",
    atar: 99.00, ucat: "high", sel: "Very high UCAT cut-off used alongside ATAR, and the SJT band is considered.",
    note: "One of the few Australian dental programmes where a strong UCAT genuinely changes your odds." },
  { id: "a_griffith", name: "Griffith University", state: "QLD", col: "#E30613", deg: "B Dental Health Science",
    atar: 99.00, ucat: "high", sel: "Competitive UCAT threshold alongside a high ATAR.",
    note: "Pairs a demanding ATAR with real UCAT weighting, so both have to land." },
  { id: "a_latrobe", name: "La Trobe University", state: "VIC", col: "#003A5D", deg: "BDSc (Honours)",
    atar: 97.00, atarNote: "97 to 99 plus in recent cycles", ucat: "none", sel: "Strictly ATAR driven. No UCAT requirement at all.",
    note: "The obvious target if your ATAR is strong and your UCAT is not." },
  { id: "a_uwa", name: "University of Western Australia", state: "WA", col: "#27348B", deg: "DMD assured pathway",
    atar: 98.00, atarNote: "99 plus typical", ucat: "low", sel: "UCAT is 20 per cent of the final rank, with ATAR 20 per cent and interview 60 per cent.",
    note: "Interview carries most of the weight here, so preparation for MMI matters more than squeezing the last UCAT points. A spatial awareness test features in dentistry interviews." },
  { id: "a_csu", name: "Charles Sturt University", state: "NSW", col: "#A6192E", deg: "Bachelor of Dental Science",
    atar: 95.00, ucat: "high", sel: "UCAT used in interview ranking.",
    note: "A comparatively reachable ATAR paired with genuine UCAT weighting, which makes it a sensible mid target." },
  { id: "a_adelaide", name: "University of Adelaide", state: "SA", col: "#005A9C", deg: "BDS",
    atar: 90.00, atarNote: "minimum, 99 plus competitive", ucat: "high", sel: "UCAT determines the interview shortlist.",
    note: "The published minimum is low and the real bar is not. Treat 90 as eligibility, not a target." },
  { id: "a_jcu", name: "James Cook University", state: "QLD", col: "#00539B", deg: "Bachelor of Dental Surgery",
    atar: 95.00, ucat: "none", sel: "Written application plus ATAR plus interview. No UCAT.",
    note: "Rewards a strong written application and rural or regional commitment rather than test performance." },
];

const AU_MED = [
  { id: "am_usyd", name: "University of Sydney", state: "NSW", col: "#E64626", deg: "Double degree medicine",
    atar: 99.95, atarNote: "strict cut-off", ucat: "none", sel: "Panel assessment, no UCAT.",
    note: "Ultra competitive pure academic entry." },
  { id: "am_griffith", name: "Griffith University", state: "QLD", col: "#E30613", deg: "Provisional entry MD",
    atar: 99.85, ucat: "none", sel: "Pure ATAR pathway, then maintain a minimum GPA during the undergraduate years.",
    note: "No UCAT at all, but the academic bar is close to the top of the state." },
  { id: "am_uwa", name: "University of Western Australia", state: "WA", col: "#27348B", deg: "MD assured pathway",
    atar: 98.00, atarNote: "99 plus competitive", ucat: "low", sel: "Final rank is 20 per cent ATAR, 20 per cent UCAT and 60 per cent MMI.",
    note: "Interview dominates. Strong communicators do disproportionately well here." },
  { id: "am_unsw", name: "UNSW Sydney", state: "NSW", col: "#FFDB00", deg: "BMedSt / MD",
    atar: 96.00, atarNote: "99 plus rank typical", ucat: "high", sel: "Pre-interview selection is a 50:50 split of ATAR and UCAT.",
    note: "The cleanest 50:50 in the country, so UCAT points convert directly into interview chances." },
  { id: "am_bond", name: "Bond University", state: "QLD", col: "#00263A", deg: "BMedSt / MD",
    atar: 96.00, ucat: "none", sel: "Private application using ATAR, an internal psychometric test and MMI.",
    note: "Private institution with its own process and fee structure. No UCAT required." },
  { id: "am_monash", name: "Monash University", state: "VIC", col: "#006DAE", deg: "BMedSc / MD",
    atar: 95.00, atarNote: "96 to 99 plus typical", ucat: "high", sel: "Final weighting splits evenly: a third ATAR, a third UCAT, a third interview.",
    note: "Around the 94th to 96th percentile UCAT for locals, higher for interstate applicants." },
  { id: "am_uq", name: "University of Queensland", state: "QLD", col: "#51247A", deg: "Provisional entry MD",
    atar: 95.00, atarNote: "98 to 99.95 target", ucat: "high", sel: "UCAT determines the interview shortlist entirely.",
    note: "High UCAT is the gate. Clear it and the interview decides." },
  { id: "am_utas", name: "University of Tasmania", state: "TAS", col: "#B31B1B", deg: "MBBS",
    atar: 95.00, ucat: "high", sel: "Combined rank calculation using ATAR and UCAT.",
    note: "Often overlooked interstate, which can make it a smart application." },
  { id: "am_curtin", name: "Curtin University", state: "WA", col: "#FFC700", deg: "MBBS",
    atar: 95.00, atarNote: "92 via some pathways", ucat: "low", sel: "Pre-interview ranking is 35 per cent ATAR, 35 per cent CASPer and 30 per cent UCAT. UCAT is 20 per cent of the final offer.",
    note: "CASPer matters as much as UCAT here, and most applicants ignore it until too late." },
  { id: "am_flinders", name: "Flinders University", state: "SA", col: "#004B87", deg: "Bachelor / MD",
    atar: 95.00, ucat: "low", sel: "UCAT contributes only 10 per cent of the final offer rank.",
    note: "A genuine option for a strong ATAR with a middling UCAT." },
  { id: "am_wsu", name: "Western Sydney University and CSU", state: "NSW", col: "#A6192E", deg: "BMedSc / MD",
    atar: 95.50, atarNote: "93.50 for Greater Western Sydney and rural applicants", ucat: "high", sel: "Uses a customised UCAT formula that weights Verbal Reasoning heavily.",
    note: "If your VR is your strongest section, this is the school where it counts most." },
  { id: "am_adelaide", name: "University of Adelaide", state: "SA", col: "#005A9C", deg: "BMedSt / MD",
    atar: 90.00, atarNote: "95 to 99 plus target", ucat: "high", sel: "UCAT is 100 per cent of the interview shortlist. Final rank is 40 per cent academic, 40 per cent interview, 20 per cent UCAT.",
    note: "The published minimum is well below the real competitive range." },
  { id: "am_jmp", name: "Joint Medical Program, Newcastle and New England", state: "NSW", col: "#00558B", deg: "BMedSc / MD",
    atar: 94.30, atarNote: "threshold requirement", ucat: "high", sel: "Once the ATAR threshold is met, the UCAT cognitive score determines 100 per cent of interview invitations.",
    note: "A threshold rather than a race on ATAR, which makes UCAT decisive. Strong option for a good test taker." },
  { id: "am_jcu", name: "James Cook University", state: "QLD", col: "#00539B", deg: "MBBS",
    atar: 95.00, ucat: "none", sel: "ATAR, an extensive written application and a panel interview. No UCAT.",
    note: "Built around rural and tropical medicine, and the written application genuinely decides outcomes." },
];

const AU_BANDS = [
  { pct: "95th to 99th plus", score: "about 2350 to 2500 plus", status: "Top tier", use: "High weight interstate programmes: UNSW, Monash, UQ medicine and dentistry, the Joint Medical Program interstate." },
  { pct: "85th to 94th", score: "about 2200 to 2340", status: "Competitive", use: "Local state offers: Adelaide, Western Sydney locally, JMP locally, Curtin, UWA." },
  { pct: "75th to 84th", score: "about 2100 to 2190", status: "Borderline", use: "Low weight UCAT options such as Flinders and Curtin, rural pathways, or leaning on a high ATAR." },
  { pct: "Below 75th", score: "under 2100", status: "Low for UCAT heavy schools", use: "Pivot to the no-UCAT pathways: JCU, Griffith, La Trobe, Bond, or plan for graduate entry." },
];

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
  return { status, label: status === "strong" ? "Strong fit" : status === "range" ? "In range" : status === "aspire" ? "Aspirational" : "Out of reach", reasons };
}

/* ---- Medicine: interview formats and tailored practice ----
   Formats and reported emphases are public information and stable year to
   year; thresholds are not included here because they move constantly.
   These are NOT real interview questions.                              ---- */

const MED_UNIS = [
  { id: "m_manchester", name: "University of Manchester", col: "#6A0F49" },
  { id: "m_leeds", name: "University of Leeds", col: "#00693C" },
  { id: "m_birmingham", name: "University of Birmingham", col: "#003B5C" },
  { id: "m_kcl", name: "King's College London", col: "#E2231A" },
  { id: "m_imperial", name: "Imperial College London", col: "#003E74" },
  { id: "m_ucl", name: "University College London", col: "#500778" },
  { id: "m_qmul", name: "Queen Mary University of London", col: "#003E74" },
  { id: "m_bristol", name: "University of Bristol", col: "#B01C2E" },
  { id: "m_sheffield", name: "University of Sheffield", col: "#251D5A" },
  { id: "m_newcastle", name: "Newcastle University", col: "#1C3F94" },
  { id: "m_glasgow", name: "University of Glasgow", col: "#003865" },
  { id: "m_edinburgh", name: "University of Edinburgh", col: "#00325F" },
  { id: "m_cardiff", name: "Cardiff University", col: "#D2232A" },
  { id: "m_liverpool", name: "University of Liverpool", col: "#1B4F8A" },
  { id: "m_nottingham", name: "University of Nottingham", col: "#005596" },
  { id: "m_soton", name: "University of Southampton", col: "#8D3970" },
];

const MED_IV = {
  m_manchester: { style: "mmi", fmt: "MMI circuit of short stations, each with a fresh assessor, typically including role play and ethics.",
    course: "5 years MBChB. Problem-based learning from year one with early clinical contact, and a wide intercalation offer.",
    hosp: "Teaching across Manchester Royal Infirmary, Wythenshawe, Salford Royal and partner trusts.",
    socs: ["MedSoc is one of the largest societies in the country", "Strong global health and widening participation groups", "Sport takes over Wednesday afternoons"],
    scene: "Oxford Road campus corridor, Northern Quarter nightlife, Peak District thirty minutes away.",
    focus: ["Ethics", "Communication", "Teamwork", "Motivation", "NHS values"],
    qs: ["Why PBL rather than a traditional lecture-based course?", "Tell me about a time you were the least experienced person in a team.", "What is the biggest threat to the NHS in the next ten years?", "How do you know you can cope with five years of this?"],
    curve: ["Persuade me not to study medicine.", "What would your GP say about you as a patient?", "Is empathy teachable?"] },
  m_leeds: { style: "mmi", fmt: "MMI stations covering communication, ethics, motivation and data or problem tasks.",
    course: "5 years MBChB, integrated with clinical exposure from year one and a strong emphasis on reflective practice.",
    hosp: "Leeds Teaching Hospitals including the LGI and St James's, one of the largest trusts in Europe.",
    socs: ["MedSoc and a large charity fundraising culture", "Hyde Park student area", "Excellent hiking and climbing clubs"],
    scene: "Compact campus, Yorkshire Dales an hour north, cheap living for a big city.",
    focus: ["Reflection", "Ethics", "Communication", "NHS values", "Teamwork"],
    qs: ["What did you learn about yourself from your work experience?", "How would you break bad news to a relative?", "Which NHS value do you find hardest to live up to?", "Describe a time you received criticism well."],
    curve: ["Should doctors ever go on strike?", "What is the most overrated quality in a doctor?", "Teach me something in sixty seconds."] },
  m_birmingham: { style: "mmi", fmt: "MMI circuit with multiple short stations including role play and ethical scenarios.",
    course: "5 years MBChB. Lectures and small-group work with clinical placements building through the course.",
    hosp: "Queen Elizabeth Hospital Birmingham and partner trusts across the West Midlands.",
    socs: ["MedSoc, surgical and specialty societies", "Guild of Students is the largest in the UK", "Big volunteering and outreach culture"],
    scene: "Green Edgbaston campus, canalside city centre, Balti Triangle nearby.",
    focus: ["Motivation", "Ethics", "Communication", "Self-insight", "Teamwork"],
    qs: ["Why medicine rather than another healthcare career?", "A friend asks you to write their essay. What do you do?", "What did you notice about how doctors talk to each other?", "What is your biggest weakness as a future doctor?"],
    curve: ["Should the NHS treat smokers differently?", "What would you do with an extra hour every day?", "Explain the internet to a Victorian."] },
  m_kcl: { style: "mmi", fmt: "MMI stations with communication and ethics prominent, sometimes including a written task.",
    course: "5 years MBBS. Integrated course with substantial clinical volume across major London trusts.",
    hosp: "Guy's, St Thomas' and King's College Hospital, three major London teaching sites.",
    socs: ["Huge society range including specialty and cultural groups", "Rugby and rowing have long history", "Everything London offers"],
    scene: "Guy's campus at London Bridge, the South Bank, Borough Market downstairs.",
    focus: ["Communication", "Ethics", "Motivation", "Teamwork", "Hot topics"],
    qs: ["What would you contribute to this medical school?", "How would you handle a patient who does not trust you?", "Talk me through an ethical dilemma you find genuinely difficult.", "Why London for five years?"],
    curve: ["Is healthcare a right or a privilege?", "What is the last thing that changed your mind?", "Sell me this pen as if it were a treatment."] },
  m_imperial: { style: "mmi", fmt: "MMI circuit with a strong science and problem-solving element alongside ethics and communication.",
    course: "6 years MBBS with a compulsory intercalated BSc, heavy on scientific research.",
    hosp: "Imperial College Healthcare including Charing Cross, Hammersmith and St Mary's.",
    socs: ["Research and academic societies dominate", "Strong sports culture at Harlington", "ICSM has its own union traditions"],
    scene: "South Kensington campus beside the museums, Hyde Park across the road.",
    focus: ["Scientific reasoning", "Ethics", "Communication", "Motivation", "Resilience"],
    qs: ["Why a course with a compulsory research year?", "How would you design a study to test a new treatment?", "Explain a scientific paper you have read.", "What interests you about academic medicine?"],
    curve: ["Should we fund rare disease research or public health?", "What scientific idea do you think is wrong?", "Convince me that medicine is a science, not an art."] },
  m_ucl: { style: "panel", fmt: "Panel interview, typically with two or three interviewers covering motivation, ethics and insight.",
    course: "6 years MBBS with an integrated BSc, plus a distinctive humanities and social science strand.",
    hosp: "UCLH, the Royal Free, the Whittington and specialist central London hospitals.",
    socs: ["RUMS has strong sporting and social identity", "Arts and humanities crossover societies", "Central London everything"],
    scene: "Bloomsbury campus, garden squares, the British Museum around the corner.",
    focus: ["Motivation", "Ethics", "Insight", "Communication", "Wider reading"],
    qs: ["What have you read recently that changed how you see medicine?", "Why does UCL teach humanities alongside science?", "What does being a professional actually mean?", "Describe a doctor you admire and why."],
    curve: ["Does medicine need more artists?", "What is the worst advice you have been given?", "Should doctors be allowed to refuse treatment on moral grounds?"] },
  m_qmul: { style: "mmi", fmt: "MMI stations at Barts, often including role play and communication tasks.",
    course: "5 years MBBS. Integrated with early clinical contact and one of the most diverse patient populations in the UK.",
    hosp: "Royal London in Whitechapel, Barts, and Newham among Barts Health sites.",
    socs: ["Barts and the London has its own strong traditions", "Very diverse student community", "East London arts scene"],
    scene: "Whitechapel and Mile End, Brick Lane, Victoria Park, the City nearby.",
    focus: ["Communication", "Teamwork", "Ethics", "Motivation", "Diversity"],
    qs: ["How does treating a diverse population change your job?", "Tell me about a time you worked with someone very different from you.", "What would you do if a patient needed an interpreter and none was available?", "Why medicine in East London?"],
    curve: ["What does culture have to do with health?", "Who has the hardest job in a hospital?", "Should medical school be free?"] },
  m_bristol: { style: "mmi", fmt: "MMI circuit covering motivation, ethics, communication and data interpretation.",
    course: "5 years MBChB. Case-based integrated teaching with early patient contact.",
    hosp: "Bristol Royal Infirmary and hospitals across the South West including academies.",
    socs: ["Galenicals is the historic medical society", "Big outdoor, surf and sailing scene", "Strong music culture"],
    scene: "Clifton and the suspension bridge, harbourside, the Downs, Cornwall two hours away.",
    focus: ["Motivation", "Ethics", "Communication", "Data interpretation", "Problem solving"],
    qs: ["Interpret this: admissions rose but mortality fell. What might explain it?", "How would you support a struggling colleague?", "What has your work experience taught you about limits?", "Why case-based learning?"],
    curve: ["Should we ration healthcare by age?", "What would you fix first in the NHS?", "Describe medicine without using the word help."] },
  m_sheffield: { style: "mmi", fmt: "MMI stations covering values, communication, ethics and motivation.",
    course: "5 years MBChB with early clinical contact and integrated teaching.",
    hosp: "Northern General, Royal Hallamshire and regional South Yorkshire placements.",
    socs: ["MedSoc runs strong peer mentoring", "Outdoor societies dominate given the Peaks", "Cheap and famously friendly city"],
    scene: "Campus running up the hill, Peak District starting at the city edge.",
    focus: ["Values", "Communication", "Ethics", "Motivation", "Teamwork"],
    qs: ["What values matter most in a doctor and why those?", "How do you handle being wrong?", "Tell me about a time you put someone else first.", "Why Sheffield specifically?"],
    curve: ["Is kindness a skill or a personality trait?", "What would make you leave medicine?", "Explain death to a child."] },
  m_newcastle: { style: "mmi", fmt: "MMI circuit with structured stations scored individually.",
    course: "5 years MBBS. Integrated teaching with early clinical exposure and regional placements.",
    hosp: "Royal Victoria Infirmary and Northumbria and Tees placements.",
    socs: ["MedSoc with strong social identity", "Famous nightlife", "Coast and countryside both close"],
    scene: "City-centre campus, Quayside bridges, Tynemouth beach on the Metro.",
    focus: ["Motivation", "Teamwork", "Resilience", "Communication", "Empathy"],
    qs: ["What will you find hardest about clinical years?", "Describe your role in a team that struggled.", "How do you recover from a bad day?", "What does empathy look like when you are exhausted?"],
    curve: ["Should doctors show emotion in front of patients?", "What is the most useful thing you own?", "Argue that nurses matter more than doctors."] },
  m_glasgow: { style: "mmi", fmt: "MMI stations, Scottish schools often blending panel-style depth with circuit format.",
    course: "5 years MBChB with early clinical contact and vocational studies running throughout.",
    hosp: "Queen Elizabeth University Hospital and west of Scotland placements.",
    socs: ["GUSA sport is enormous", "MedChir society has long history", "Best music scene in Scotland"],
    scene: "Gothic main campus, Kelvingrove, the West End, lochs an hour north.",
    focus: ["Ethics", "Communication", "Empathy", "Teamwork", "Motivation"],
    qs: ["How would you respond to a colleague who is not coping?", "What does patient-centred care actually mean?", "Tell me about a time you listened rather than spoke.", "Why Scotland?"],
    curve: ["Should healthcare be free at the point of use everywhere?", "What is the hardest thing about being honest?", "Describe a hospital to someone who has never seen one."] },
  m_edinburgh: { style: "panel", fmt: "Edinburgh weights the written application heavily and interviews vary; prepare panel-style depth.",
    course: "6 years MBChB including a compulsory intercalated honours year.",
    hosp: "Royal Infirmary of Edinburgh and Lothian sites.",
    socs: ["Royal Medical Society, the oldest student medical society", "Huge arts scene during the Festival", "Hillwalking and skiing clubs"],
    scene: "Old Town and Arthur's Seat, the Festival every August, Highlands within reach.",
    focus: ["Academic depth", "Motivation", "Ethics", "Reflection", "Research"],
    qs: ["Why a compulsory intercalated year?", "What area of medicine would you research and why?", "How do you evaluate whether a study is trustworthy?", "What has your reading taught you that experience has not?"],
    curve: ["Is medicine becoming too specialised?", "What question should I have asked you?", "Defend a medical opinion you know is unpopular."] },
  m_cardiff: { style: "mmi", fmt: "MMI circuit covering communication, ethics, motivation and problem solving.",
    course: "5 years MBBCh, case-based learning with early clinical contact across Wales.",
    hosp: "University Hospital of Wales at Heath Park and placements across Wales.",
    socs: ["MedSoc and specialty societies", "Welsh-language societies", "Rugby dominates the city"],
    scene: "Heath Park campus, Bute Park, Cardiff Bay, Brecon Beacons an hour away.",
    focus: ["Communication", "Ethics", "Work experience", "Problem solving", "Hot topics"],
    qs: ["How does healthcare differ in Wales?", "What did work experience teach you that surprised you?", "How would you approach a problem with no clear answer?", "What is the biggest public health issue today?"],
    curve: ["Should health be devolved or national?", "What is the point of a doctor if AI can diagnose?", "Argue for something you disagree with."] },
  m_liverpool: { style: "mmi", fmt: "MMI stations covering ethics, communication and motivation.",
    course: "5 years MBChB, integrated with clinical contact from early in the course.",
    hosp: "Royal Liverpool University Hospital, Alder Hey and regional placements.",
    socs: ["LMSS with strong social calendar", "Guild of Students society range", "Football culture everywhere"],
    scene: "Two cathedrals, the Baltic Triangle, the cheapest big-city living on the list.",
    focus: ["Ethics", "Communication", "Motivation", "Teamwork", "Hot topics"],
    qs: ["How would you handle a disagreement with a senior?", "What draws you to a city with high health inequality?", "Describe a time you advocated for someone.", "What is health inequality actually caused by?"],
    curve: ["Is poverty a medical problem?", "What would you tell a patient who has given up?", "Should doctors treat friends?"] },
  m_nottingham: { style: "mmi", fmt: "MMI circuit with stations covering communication, ethics and motivation.",
    course: "5 years BMBS with an integrated BMedSci, so you graduate with a research degree built in.",
    hosp: "Queen's Medical Centre, one of the largest hospitals in Europe, and Nottingham City Hospital.",
    socs: ["MedSoc with strong sporting identity", "Research societies given the BMedSci", "Big campus social scene"],
    scene: "Green University Park campus, lakes and open space, city centre nearby.",
    focus: ["Motivation", "Research", "Communication", "Ethics", "Teamwork"],
    qs: ["Why a course with a built-in research degree?", "How do you decide what evidence to trust?", "Tell me about a time you had to learn something quickly.", "What makes a good scientist a good doctor?"],
    curve: ["Should every doctor do research?", "What is the biggest myth about medicine?", "Explain a randomised trial to a sceptic."] },
  m_soton: { style: "mmi", fmt: "MMI circuit with stations covering values, communication and ethics.",
    course: "5 years BM with an integrated research project year, strong early patient contact.",
    hosp: "Southampton General and Wessex regional placements.",
    socs: ["MedSoc and a large sailing scene", "Strong volunteering culture", "Beach and New Forest close"],
    scene: "Coastal city, New Forest twenty minutes away, Isle of Wight across the water.",
    focus: ["Values", "Communication", "Research", "Ethics", "Motivation"],
    qs: ["What does evidence-based medicine mean in practice?", "How would you comfort someone you cannot cure?", "Tell me about a time you changed how you did something.", "Why a research-focused course?"],
    curve: ["Is it ethical to give a placebo?", "What is the last thing you failed at?", "Should patients see their own notes?"] },
};

/* ---- Sentence level analysis: green, amber, red on the user's own text ---- */

function splitSentences(text) {
  /* No lookbehind: older Safari throws on it at parse time and takes the app down. */
  const t = text.replace(/\s+/g, " ").trim();
  const out = [];
  let buf = "";
  for (let i = 0; i < t.length; i++) {
    buf += t[i];
    if (".!?".includes(t[i]) && (i + 1 >= t.length || t[i + 1] === " ")) {
      if (buf.trim().length > 1) out.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim().length > 1) out.push(buf.trim());
  return out;
}

const CLICHES = /\b(passionate about|always wanted to be|helping people|since i was (a )?(young|little|child)|rewarding career|make a difference|people person|hard working|i am a good|i believe i would|caring profession|best of both worlds)\b/i;

function analyseSentence(sn) {
  const t = " " + sn.toLowerCase() + " ";
  const has = (re) => re.test(t);
  const specific = has(/\b(for example|such as|specifically|one (time|day|occasion)|last (year|term|summer|month)|during my|when i (was|shadowed|volunteered|worked|noticed)|in year \d{1,2}|at the (clinic|practice|hospital|surgery))\b/) || /\d/.test(sn);
  const action = has(/\bi (led|organised|organized|decided|spoke|arranged|built|resolved|suggested|volunteered|took|asked|noticed|created|planned|practised|practiced|shadowed|ran|started|changed|stayed|checked)\b/);
  const reflect = has(/\b(learn|learnt|learned|realis|realiz|taught me|next time|since then|now i|changed how|i would|looking back|which showed me|that is why)\b/);
  const cliche = CLICHES.test(sn);
  const weOnly = has(/\bwe\b/) && !has(/\bi\b/);
  const words = sn.trim().split(/\s+/).length;

  if (cliche && !specific) return { v: "red", n: "Cliche with nothing behind it. Every applicant writes this sentence, so it scores nothing. Replace it with the moment that made it true for you." };
  if (weOnly) return { v: "amber", n: "All 'we', no 'I'. The panel is admitting you, not your team. Keep the context but make your own actions carry the sentence." };
  if (specific && (action || reflect)) return { v: "green", n: "Specific and owned. This is the shape the mark scheme rewards: a real moment with your own action or lesson attached." };
  if (reflect && words > 6) return { v: "green", n: "Genuine reflection. This is the highest weighted criterion on real mark schemes, and most candidates never get here." };
  if (specific) return { v: "amber", n: "Good detail, but nothing of yours in it yet. Add what you did or what it taught you and this becomes a strong sentence." };
  if (action) return { v: "amber", n: "Your action is clear but the scene is not. Anchor it: when, where, and what was at stake." };
  if (words <= 5) return { v: "amber", n: "Very short. Either develop it or cut it, because half-sentences break the marker's flow." };
  return { v: "red", n: "A claim with no evidence. Sentences like this are assertions the panel cannot verify, and they read as filler." };
}

function analyseAnswer(text) {
  return splitSentences(text).map((sn) => ({ sn, ...analyseSentence(sn) }));
}

const MODEL_SKELETON = {
  Motivation: ["Open with the specific moment that started it, not a childhood memory.",
    "Say how you tested the idea: what you saw, read, or did that could have changed your mind.",
    "Name one difficulty you observed and why you still chose it.",
    "Close on what dentistry gives that other options do not, in your own words."],
  Ethics: ["Name the principles in tension in one sentence, for example autonomy against doing good.",
    "Gather what you would need to know before acting.",
    "Give your action, with the reason attached.",
    "Acknowledge the strongest opposing view, then hold your position."],
  Communication: ["State what you would check first about the other person's understanding or feeling.",
    "Describe your approach in plain steps, including a pause.",
    "Say how you would confirm they understood, for example teach-back.",
    "Close with what you would do if it went badly."],
  Curveball: ["Buy two seconds openly: 'that's an interesting one, let me think.'",
    "Pick an angle and say which angle you are picking.",
    "Give two or three points with reasons, out loud, so they can follow your thinking.",
    "Land somewhere. Composure and structure are the marks here, not the conclusion."],
  default: ["Situation: one sentence of scene setting.",
    "Task: what needed doing and why it was hard.",
    "Action: what YOU did, step by step, in first person. Longest part.",
    "Result: what changed because of you.",
    "Reflection: the lesson and where you have used it since."],
};

/* ------------------------------ UNI INTERVIEW FOCUS --------------- */
/* Format and reported emphasis compiled from 2025-cycle applicant    */
/* research. These are NOT the questions asked; they are the themes    */
/* each school is reported to weight, turned into practice prompts.    */

const UNI_IV = {
  generic: { style: "both", fmt: "Generic practice covering both formats. MMI circuits move fast with a fresh marker each station; panels go deeper on fewer themes with follow-up questions.",
    course: "Most UK dental degrees run five years, either integrated (science and clinics side by side from early on) or traditional (pre-clinical years first). Know which yours is and why it suits you.",
    socs: ["Dental societies run skills evenings, mentoring and the annual ball at every school", "Sports and volunteering carry real weight in answers about contribution", "Outreach and charity work is the most quotable kind"],
    scene: "Campus versus city, cost of living, and distance from home all legitimately belong in your reasoning when asked why here.",
    curve: ["Sell me something in this room.", "What question were you hoping I would not ask?", "If you were not accepted anywhere, what would you tell yourself in a year?"],
    focus: ["Motivation", "Ethics", "Communication", "Teamwork", "Resilience"],
    qs: ["Why dentistry, and what tested that choice?", "Tell me about a time you handled a difficult conversation.", "What is the biggest issue facing dentistry right now?", "What would you contribute beyond the course?"] },
  belfast: { style: "panel", course: '5 years BDS. Traditional mix of lectures, e-learning, practicals and clinical teaching, with treatment building from mid-course.', socs: ['Dental Society runs clinical skills evenings and the annual ball', 'Strong GAA and rugby culture', "Students' Union at Elmwood is the centre of everything"], scene: "Leafy Queen's Quarter, Botanic Gardens on the doorstep, Titanic Quarter twenty minutes away, and the Antrim coast within an hour.", curve: ['If you had to remove one year from the course, which and why?', 'A patient tells you they trust a TikTok video over your advice. Go.', 'Teach me to tie a shoelace without using your hands.'], fmt: "In person, international candidates online. Interview performance carries the entire post-interview weighting.",
    focus: ["Resilience", "Communication", "Empathy", "Ethics", "Understanding of dentistry"],
    qs: ["Describe a time you kept going when something was not working. What kept you there?",
         "How would you explain a difficult diagnosis to someone frightened of dentists?",
         "What does empathy look like in a five-minute appointment?",
         "What do you actually understand dentistry to involve day to day?"] },
  birmingham: { style: "mmi", course: '5 years BDS. Small-group PBL with lectures and lab work. Observing treatments from first year, carrying them out from second.', socs: ['BDSA runs socials, sports and the dental ball', 'Guild of Students is the largest in the UK', 'Dental charity work through outreach societies'], scene: 'Green Edgbaston campus with the clock tower, canalside city centre, Balti Triangle nearby, and the Lickey Hills for escape.', curve: ['Sell me a toothbrush.', 'You have five minutes with the Health Secretary. What do you say?', 'Is it ever right to refuse to treat someone?'], fmt: "In person, four stations split into eight parts.",
    focus: ["Motivation", "Manual dexterity", "Leadership", "Self-insight", "Ethical reasoning"],
    qs: ["What have you done that proves fine motor skill, and how did you improve at it?",
         "Tell me about a time you led without holding any authority.",
         "What is the most useful piece of criticism you have received?",
         "Walk me through how you would weigh up an ethical dilemma you have never met before."] },
  bristol: { style: "mmi", course: '5 years BDS built around four development themes: practitioner, scholar and scientist, professional and agent of change, person and citizen.', socs: ['Galenicals and the dental society run mentoring', 'Big outdoor and surf societies given the coast', 'Students deliver thousands of free NHS appointments'], scene: "New city-centre dental school beside the BRI, harbourside and street art, the Downs for running, and Cornwall's beaches two hours west.", curve: ['What would you do if you found out dentistry was not for you in third year?', 'Interpret this: decay rates fell but extractions rose. Why might that be?', 'Convince me that dentistry is harder than medicine.'], fmt: "Virtual, six stations, five minutes each.",
    focus: ["Motivation for dentistry", "Role play", "Communication", "Data interpretation", "Problem solving"],
    qs: ["In one minute: why dentistry, and what tested that choice?",
         "Role play: a patient is upset that their appointment was cancelled twice. Begin.",
         "You are shown a chart of decay rates by region. What questions would you ask before drawing conclusions?",
         "How do you approach a problem when you have no idea where to start?"] },
  cardiff: { style: "mmi", course: '5 years BDS. Traditional integrated course blending pre-clinical science with patient exposure from early on.', socs: ['Cardiff Dental Society is famously active', 'Welsh-language societies and a huge sports scene', 'Rugby internationals shut down the city centre'], scene: "Heath Park campus, Bute Park's woodland walks, Cardiff Bay, and the Brecon Beacons within an hour.", curve: ['Should dentists be allowed to advertise?', 'Your patient is late every time and blames the bus. What now?', 'What is the most important invention in dentistry?'], fmt: "In person, with rest stations built into the circuit.",
    focus: ["Communication", "Work experience", "Hot topics", "Problem solving", "Ethics"],
    qs: ["What did your work experience teach you that reading could not?",
         "What is the biggest issue facing NHS dentistry right now, and why that one?",
         "Describe a problem you solved where your first approach failed.",
         "When is it right to overrule what a patient wants?"] },
  dundee: { style: "mmi", course: '5 years BDS on a 4-dimensional spiral curriculum: foundations laid early, then revisited and deepened each year.', socs: ['Dental society with strong year-group mixing', 'Cheap living funds an active social scene', 'Hillwalking and mountaineering clubs are big'], scene: 'Compact campus with the dental school right inside it, V&A Dundee on the waterfront, and the Highlands at weekend distance.', curve: ['Thiel cadavers are used here. How do you feel about that?', 'A colleague asks you to sign their attendance sheet. They are not here.', 'What does a good dentist do that a competent one does not?'], fmt: "In person, seven stations, rest stations present.",
    focus: ["Role play", "Critical thinking", "Work experience", "Ethics", "Communication"],
    qs: ["Role play: explain to a friend why they should not skip a dental appointment they are scared of.",
         "Someone tells you a treatment is unnecessary because they read it online. What do you do?",
         "What surprised you most about the profession when you saw it up close?",
         "How do you decide what is true when experts disagree?"] },
  glasgow: { style: "panel", course: '5 years BDS, traditionally structured: two pre-clinical years of clinical science, then three clinical years applying it.', socs: ['GUSA sports is enormous', 'Dental society runs skills sessions and charity work', 'One of the best student music scenes in the UK'], scene: "Gothic main campus, Kelvingrove museum and park, the West End's bars and cafes, and lochs an hour north.", curve: ['Why traditional teaching rather than integrated?', 'Rank these: honesty, competence, kindness. Defend your order.', 'Explain a filling to a frightened seven-year-old. I am the child.'], fmt: "In person, panel format, common in Scotland.",
    focus: ["Ethics", "Empathy", "Communication", "Leadership", "Dexterity"],
    qs: ["Tell me about a time you noticed someone struggling before they said anything.",
         "How would you handle a patient who refuses treatment you believe they need?",
         "What role do you take in a group that has no leader?",
         "What have you practised until your hands got better at it?"] },
  kcl: { style: "panel", course: "5 years BDS. Integrated course with haptic and augmented reality simulation, then high clinical volume through Guy's.", socs: ['KCLDS is one of the largest dental societies', 'Rugby and rowing have serious history here', 'Every London society you can imagine'], scene: "Guy's Tower at London Bridge, Borough Market beneath it, the South Bank walk, and all of London beyond.", curve: ['Is private dentistry ethical?', 'You are running forty minutes late and a patient is furious. Begin.', 'What would your worst enemy say about you?'], fmt: "Virtual panel interview with two interviewers.",
    focus: ["Communication", "Ethics", "Contribution to university", "Work experience", "Hot topics"],
    qs: ["What would you contribute to this university outside the course?",
         "Talk me through an ethical issue in dentistry you find genuinely difficult.",
         "What is the most important thing you learnt from any work experience?",
         "Pick a health story from the last year and tell me why it matters to dentistry."] },
  leeds: { style: "mmi", course: '5 years BDS, integrated with clinical exposure from year one. The only UK dental degree with an integrated masters.', socs: ['Leeds Dental Society and a big charity fundraising culture', 'Hyde Park student area is legendary', 'Excellent hiking and climbing clubs'], scene: 'Worsley Building in the university precinct, Hyde Park terraces, and the Yorkshire Dales an hour north.', curve: ['Which NHS value would you drop if forced?', 'A patient refuses treatment because of their beliefs. Talk me through it.', 'What is wrong with the way dentistry is taught?'], fmt: "Previously five-station online MMIs. Leeds publishes little in advance.",
    focus: ["Ethics", "Hot topics", "NHS values", "Communication"],
    qs: ["Which NHS value matters most in a dental practice, and why that one?",
         "How would you respond to a colleague cutting corners on infection control?",
         "What is your view on charging patients for missed appointments?",
         "Explain something you know well to someone who knows nothing about it."] },
  liverpool: { style: "mmi", course: '5 years BDS. Integrated teaching with patient contact from first year, one of the earliest starts in the UK.', socs: ['LUDSS runs the dental ball and sports teams', 'Guild of Students has huge society range', 'Football culture dominates the city'], scene: 'Pembroke Place dental hospital near central campus, two cathedrals, the Baltic Triangle, and the cheapest big-city living on this list.', curve: ['Your non-academic form is what got you here. Justify it.', 'Should missed appointments be charged for?', 'Describe your hands to me.'], fmt: "In person, eleven stations including two rest stations.",
    focus: ["Ethics", "Communication", "Hot topics", "Motivation for dentistry"],
    qs: ["Why dentistry rather than any other healthcare career?",
         "A patient asks you to do something you think is wrong. Talk me through your thinking.",
         "What would you change about how dental care is delivered?",
         "Describe a conversation where you changed someone's mind."] },
  manchester: { style: "mmi", course: '5 years BDS balancing traditional grounding, including dissection-based anatomy which is rare in dentistry, with early clinical exposure and PBL.', socs: ['MUDSS is very active socially', 'Interdisciplinary learning with dental nursing and therapy students', 'Music scene is the best in England'], scene: 'Oxford Road corridor campus, Northern Quarter for nights out, Peak District thirty minutes east.', curve: ['You learn alongside therapists here. Is that a good thing?', 'What is the strongest argument against water fluoridation?', 'Tell me about a time you were unfair to someone.'], fmt: "In person, five stations, seven minutes each with two-minute gaps.",
    focus: ["Ethics", "Communication", "Hot topics", "Motivation", "Work experience"],
    qs: ["What did you notice about how the dental team worked together?",
         "Should the NHS fund treatment for preventable conditions differently? Argue both sides.",
         "Tell me about a time you were wrong and someone else was right.",
         "How do you keep going through a five-year course when motivation dips?"] },
  newcastle: { style: "panel", course: '5 years BDS. Lectures, seminars and lab demonstrations, with first years shadowing seniors on clinics.', socs: ['Newcastle Dental Society is tight-knit', 'Famous nightlife and student culture', 'Coast and countryside both close'], scene: 'Richardson Road dental hospital on the medical campus, Quayside bridges, Tynemouth beach on the Metro.', curve: ['You are scored out of 30 today. Which category do you expect to lose marks in?', 'What have you failed at recently?', 'Should a dentist ever treat a family member?'], fmt: "In person panel, roughly twenty minutes, two interviewers, scored out of 30.",
    focus: ["Motivation", "Effective learning skills", "Teamwork", "Resilience", "Empathy and professionalism"],
    qs: ["How do you learn best, and what evidence do you have for that?",
         "Describe your part in a team that achieved something difficult.",
         "What is the hardest setback you have handled, and what did it change?",
         "What does professionalism mean to a student, not a qualified dentist?"] },
  plymouth: { style: "mmi", course: '5 years BDS beginning in PBL groups from day one, mirroring how dental teams actually work, with study guides and wrap-up sessions.', socs: ['Peninsula Dental Social Enterprise volunteering', 'Surf society is genuinely serious here', 'Small cohort means everyone knows everyone'], scene: 'Derriford and city education facilities, the Hoe overlooking Plymouth Sound, Dartmoor twenty minutes away.', curve: ["How does poor oral health wreck someone's life?", 'Your PBL group has one person doing nothing. Fix it.', 'What does inclusive care actually mean?'], fmt: "In person, five stations, four interviewers, around 55 minutes, each station scored numerically.",
    focus: ["Communication", "Impact of illness", "Reflection and self-insight", "Resilience and adaptability", "Integrity and inclusivity"],
    qs: ["How does poor oral health affect the rest of someone's life?",
         "Tell me about a time you adapted when plans changed suddenly.",
         "What does inclusive care mean in practice, not in theory?",
         "What is something about yourself you are actively working on?"] },
  qmul: { style: "panel", course: '5 years BDS. Integrated with clinics from first year, drawing on one of the most diverse patient populations in Europe.', socs: ['QMBL dental society and Barts history', 'Huge international student community', 'East London arts and music on the doorstep'], scene: 'Institute of Dentistry at the Royal London in Whitechapel, Brick Lane, Victoria Park, and the City ten minutes west.', curve: ['A member of the public is on this panel. Explain dentistry to them.', 'What does diversity change about how you treat patients?', 'Why should we pick you over someone with a higher UCAT?'], fmt: "Virtual panel including clinical staff, a dental student and a member of the public.",
    focus: ["Motivation for dentistry", "Teamwork", "Communication", "Contribution to university life", "Ethics"],
    qs: ["A member of the public is on your panel. Explain why you want to be a dentist in plain language.",
         "What would you bring to student life here beyond your studies?",
         "Describe a time teamwork failed and what you took from it.",
         "How would you treat a patient whose beliefs conflict with your advice?"] },
  sheffield: { style: "panel", course: '5 years BDS teaching theory alongside clinical practice, training dentists beside hygiene and therapy students.', socs: ['Sheffield Dental Society runs strong mentoring', 'Outdoor societies dominate given the Peaks', 'Famously friendly, low-cost student city'], scene: 'Charles Clifford dental hospital by the Royal Hallamshire, and the Peak District literally starts at the city edge.', curve: ['Why dentistry, without saying you want to help people?', 'Take something from A-level biology and apply it to gum disease.', 'What would make you quit this career?'], fmt: "In person panel, around fifteen minutes, two staff and one senior student.",
    focus: ["Why dentistry", "Hot topics", "Applying knowledge", "Work experience", "Personal qualities and values"],
    qs: ["Why dentistry, in under a minute, without saying you want to help people?",
         "Take something you learnt in science and apply it to a dental problem.",
         "What personal quality of yours will matter most in clinic?",
         "What is a current issue in oral health you would want to work on?"] },
};

/* ------------------------------ ANSWER MARKER --------------------- */
/* Rule-based marking against a published scheme: structure,          */
/* specificity, ownership, reflection, landing. It reads signals,     */
/* not prose quality, and it never marks spelling or grammar.         */

const STARR_STEPS = [
  ["1. Situation", "One sentence of scene-setting. Where, when, who. No more than that."],
  ["2. Task", "What needed doing and why it mattered, or why it was hard."],
  ["3. Action", "What YOU did, in first person, step by step. This is the longest part."],
  ["4. Result", "What happened because of your actions. A number or concrete outcome if one exists."],
  ["5. Reflection", "What it taught you, what you would change, and where you have used the lesson since. This is where the marks live."],
];

function markAnswer(text) {
  const t = " " + text.toLowerCase().replace(/\s+/g, " ") + " ";
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const count = (re) => (t.match(re) || []).length;

  const crits = [];
  const structure = count(/\b(first|firstly|second|secondly|then|next|finally|to begin|overall|in conclusion|the situation|my task|my role)\b/g);
  crits.push({ name: "Structure", score: structure >= 3 ? 2 : structure >= 1 ? 1 : 0,
    good: "Clear signposting throughout; a marker can follow and tick as they listen.",
    fix: "Signpost out loud: 'The situation was... my role was... so I... which meant... and it taught me...'. Markers credit what they can follow." });

  const specific = count(/\b(for example|such as|specifically|one time|last year|during|when i|a patient|the captain|my teacher|the nurse|the dentist)\b/g) + count(/\d/g) / 2;
  crits.push({ name: "Specificity", score: specific >= 4 ? 2 : specific >= 1.5 ? 1 : 0,
    good: "Grounded in a real, named moment rather than generalities.",
    fix: "Swap claims for scenes. Not 'I am a good team player' but 'in April our group project stalled two days before the deadline, so I...'. One concrete moment outscores five adjectives." });

  const ownership = count(/\bi (led|organised|organized|decided|spoke|arranged|built|resolved|suggested|volunteered|took|asked|noticed|created|planned)\b/g) + Math.min(count(/\bi\b/g) / 4, 1.5);
  crits.push({ name: "Ownership", score: ownership >= 3 ? 2 : ownership >= 1.5 ? 1 : 0,
    good: "Strong first-person actions; your contribution is unmissable.",
    fix: "Too much 'we'. The panel is admitting you, not your team. Keep the team context but make your own verbs carry the answer: I noticed, I suggested, I took on." });

  const reflect = count(/\b(learn|learnt|learned|realis|realiz|reflect|taught me|next time|since then|now i|changed how|i would|looking back)\b/g);
  crits.push({ name: "Reflection", score: reflect >= 3 ? 2 : reflect >= 1 ? 1 : 0,
    good: "Genuine reflection: lesson drawn and carried forward.",
    fix: "Finish the loop. After the story: what it taught you, what you would do differently, and one place you have used the lesson since. Reflection is the highest-weighted criterion on real mark schemes." });

  const landed = words >= 70 && words <= 280 ? 1 : 0;
  const ending = count(/\b(overall|ultimately|which is why|so now|this taught me|in the end|that experience)\b/g) >= 1 ? 1 : 0;
  crits.push({ name: "Length and landing", score: landed + ending,
    good: "Right length for two minutes spoken, with a deliberate ending.",
    fix: words < 70 ? "Too thin for a two-minute answer; develop the action and reflection sections." : words > 280 ? "Too long to say in two minutes; cut scene-setting, keep action and reflection." : "It trails off. End on purpose: 'ultimately, that experience is why...'." });

  const raw = crits.reduce((a, c) => a + c.score, 0);
  let score = Math.round((raw / 10) * 100);
  /* Deliberately harsh: real interviewers are. Penalties bite. */
  const clicheHits = (text.match(CLICHES) || []).length;
  score -= clicheHits * 12;
  if (!/\b(learn|learnt|learned|taught me|realis|next time|since then|looking back)\b/i.test(text)) score -= 15;
  if (!/\d/.test(text) && !/\b(one (time|day)|last (year|term|summer)|during my|when i)\b/i.test(text)) score -= 10;
  if (words < 90) score -= 12;
  score = Math.max(0, Math.min(100, score));
  const band = score >= 80 ? "Excellent" : score >= 62 ? "Strong" : score >= 40 ? "Medium" : "Weak";
  return { crits, total: raw, score, band };
}

const IV_SAMPLES = {
  strong: "During my Year 12 first aid course, our group of five had to run a mock emergency and we froze because two people both tried to lead. I suggested we each take one role and asked the quietest member to be the caller, since she had the checklist memorised. I took the recovery position because I had practised it most. We finished inside the time and the assessor credited the role split. Looking back, the real lesson was that teams fail from unclaimed roles more than from weak members, and since then I start every group task by agreeing who owns what, which is exactly how I saw the dental nurse and dentist divide an emergency when I was on work experience.",
  weak: "I am a really good team player and I always help everyone in my team. In school we do lots of group work and it always goes well because everyone works together and communicates. Teamwork is very important in dentistry because dentists work with nurses and hygienists every day and communication is the key to success. I believe my teamwork skills would make me a great dentist because I am hardworking, motivated and passionate about helping people in my community.",
  why: "The strong answer is one specific scene with first-person actions, a result, and a reflection that connects forward to dentistry. The weak answer is all claims and no evidence: no moment, no action verbs, no lesson, and it would sound identical from a thousand candidates. Notice spelling and polish had nothing to do with the gap.",
};

/* ------------------------------ INTERVIEW VIEW -------------------- */

function UniInterviewDeck({ track, sel, setSel, onPractise }) {
  const med = track === "med";
  const list = med ? MED_UNIS : UNIS.filter((u) => UNI_IV[u.id]);
  const table = med ? MED_IV : UNI_IV;
  const d = table[sel] || UNI_IV.generic;
  const uni = med ? MED_UNIS.find((u) => u.id === sel) : UNIS.find((u) => u.id === sel);

  useEffect(() => { if (sel !== "generic" && !table[sel]) setSel("generic"); }, [track]);

  return (
    <>
      <div className="ud-sec"><h2>Interview by university</h2><i /><span>format, fact sheet and tailored questions</span></div>

      <div className="iv-unipick">
        <label>Choose a school
          <select value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="generic">Generic practice, all schools</option>
            {list.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>

        <div className="iv-unibox">
          <div className="uf-head">
            {uni ? <span className="uni-mono" style={{ background: uni.col + "22", color: uni.col, borderColor: uni.col }}>{uni.name.replace("University of ", "").replace("Queen's University ", "").replace("Queen Mary University of London", "QM").replace("King's College London", "KC").replace("University College London", "UC").replace("Imperial College London", "IC").slice(0, 2).toUpperCase()}</span> : null}
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
              <button className="ud-quit" onClick={() => onPractise(q)}>write it</button>
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
              <button className="ud-quit" onClick={() => onPractise(q)}>write it</button>
            </div>
          ))}
        </div>
      </div>
    </>
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
  const recRef = useRef(null);
  const baseRef = useRef("");

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
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-GB";
    rec.onresult = (e) => {
      let out = "";
      for (let i = e.resultIndex; i < e.results.length; i++) out += e.results[i][0].transcript;
      setText((baseRef.current + " " + out).trim());
      setResult(null);
    };
    rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") setMicState("denied"); setListening(false); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch (err) { /* already stopped */ } };
  }, []);

  const toggleMic = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { try { rec.stop(); } catch (e) { /* ignore */ } setListening(false); return; }
    baseRef.current = text;
    try { rec.start(); setListening(true); setMicState("idle"); } catch (e) { /* already running */ }
  };

  const nextQ = () => { setQi((n) => (n + 1) % pool.length); setText(""); setResult(null); setLines(null); setTPhase("off"); };

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

  const doMark = () => {
    setResult(markAnswer(text));
    setLines(analyseAnswer(text));
    if (tPhase !== "off") setTPhase("done");
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
      <p className="qbig">{cur.q}</p>

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
      {micState === "denied" && <p className="wp-note" style={{ color: "var(--stop)" }}>Microphone access was blocked. Allow it in your browser settings, or type the answer instead.</p>}

      <div className={`wp-boxwrap${tPhase === "write" && tLeft <= 30 ? " glow" : ""}`}>
      {tPhase === "think" && (
        <div className="wp-think"><b className="mono">{tLeft}</b><span>Think. Pick your example before you type.</span></div>
      )}
      <textarea className="ud-input wp-box" value={text} disabled={tPhase === "think"} onChange={(e) => { setText(e.target.value); setResult(null); setLines(null); }}
        placeholder="Speak it or type it. Say the answer exactly as you would in the room, because spelling and grammar are never marked here." />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button className="ud-btn" disabled={text.trim().split(/\s+/).filter(Boolean).length < 15} onClick={doMark}>Mark my answer</button>
        <button className="ud-btn ghost" onClick={nextQ}>Next question</button>
        <button className="ud-btn ghost" onClick={() => setShowSamples((o) => !o)}>{showSamples ? "Hide" : "See"} a strong vs weak answer</button>
      </div>
      <MarkingNotice />

      {result && (
        <div className="wp-result">
          <p className="band">
            <b className={result.band.toLowerCase()}>{result.score}<em>/100</em></b>
            <span className="mono">{result.band} · marked hard, because interviewers are</span>
          </p>
          {lines && lines.length > 0 && (
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
          )}
          {result.crits.map((c) => (
            <div className="wp-crit" key={c.name}>
              <span className={`dot s${c.score}`} />
              <div>
                <b>{c.name} · {c.score}/2</b>
                <p>{c.score === 2 ? c.good : c.fix}</p>
              </div>
            </div>
          ))}
          <div style={{ background: "var(--ink)", border: "1px solid var(--line)", borderRadius: 3, padding: "12px 14px", marginTop: 12 }}>
            <p style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: "var(--signal)" }}>How to build this one:</strong> {cur.g}
            </p>
          </div>
          <div className="wp-model">
            <p className="hh">A better response would run like this</p>
            <ol>{(MODEL_SKELETON[cur.theme] || MODEL_SKELETON.default).map((x, n) => <li key={n}>{x}</li>)}</ol>
            <p className="mn"><b>For this question specifically:</b> {cur.g}</p>
          </div>
          <p className="wp-note">Automated marking against a fixed scheme: it reads structural and content signals, not prose quality, and deliberately ignores spelling and grammar. A human mock interview remains the gold standard; use this to make every attempt before one count.</p>
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

function InterviewView({ track, onSwitch }) {
  const themes = IV_THEMES.filter((t) => t.tracks.includes(track));
  const [openQ, setOpenQ] = useState(null);
  const [warnHidden, setWarnHidden] = useState(false);
  const [uni, setUni] = useState("");
  const [uniSel, setUniSel] = useState("generic");
  const [jump, setJump] = useState(null);
  const [practice, setPractice] = useState(null); /* {q, theme} */
  const [phase, setPhase] = useState("prep");
  const [left, setLeft] = useState(30);

  useEffect(() => {
    if (!practice) return;
    if (left <= 0) {
      if (phase === "prep") { setPhase("answer"); setLeft(120); }
      else setPhase("done");
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [practice, phase, left]);

  const startPractice = () => {
    const pool = [];
    themes.forEach((th) => th.qs.forEach((q) => { if (!q.t || q.t === track) pool.push({ ...q, theme: th.name }); }));
    setPractice(pool[Math.floor(Math.random() * pool.length)]);
    setPhase("prep"); setLeft(30);
  };

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

      <UniInterviewDeck track={track} sel={uniSel} setSel={setUniSel} onPractise={(qq) => setJump({ q: qq, n: Date.now() })} />

      <div className="ud-sec"><h2>Written practice, marked</h2><i /><span>structure and content, never spelling or grammar</span></div>
      <WritingPractice themes={themes} track={track} uniSel={uniSel} setUniSel={setUniSel} jump={jump} clearJump={() => setJump(null)} />

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

function Monogram({ u }) {
  const init = u.name.replace("University of ", "").replace("Queen's University ", "").replace(" University", "").replace("Queen Mary University of London", "QM").slice(0, 2).toUpperCase();
  return <span className="uni-mono" style={{ background: u.col + "22", color: u.col, borderColor: u.col }}>{u.id === "qmul" ? "QM" : u.id === "kcl" ? "KC" : init}</span>;
}

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

function UniSelector({ track, prefs, setPrefs }) {
  const saved = prefs.uni || {};
  const [region, setRegion] = useState(prefs.region || "uk");
  const pickRegion = (r) => { setRegion(r); setPrefs({ ...prefs, region: r }); };
  const [f, setF] = useState({
    ucat: saved.ucat || 2000, band: saved.band || 2,
    grades: saved.grades || [9, 9, 9, 8, 8, 8, 7, 7],
    maths: saved.maths || 7, eng: saved.eng || 7,
    pred: saved.pred || "AAA", scottish: saved.scottish || false, ctx: saved.ctx || false,
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

  if (region === "au") {
    return (
      <div className="ud-wrap">
        <div className="ud-sec" style={{ paddingTop: 32 }}><h2>University selector</h2><i /><span>Australia, direct entry</span></div>
        <RegionBar />
        <SiteDisclaimer />
        <AuSelector track={track} />
      </div>
    );
  }

  if (track === "med") {
    return (
      <div className="ud-wrap">
        <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Strategic university selector</h2><i /><span>medicine</span></div>
        <RegionBar />
        <SiteDisclaimer />
        <p className="ud-empty">The dentistry dataset is live with all 14 UK dental schools, including course structure, hospitals, placements and living-cost estimates. The medicine table is the next dataset to build, and the engine is already waiting for it. The interview bank, including the marked writing practice, is live for medicine now.</p>
        <div className="ud-trend" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Graduate entry</h3>
          <p style={{ fontSize: 13.5, color: "var(--body)", lineHeight: 1.65, margin: 0 }}>{GRAD_ENTRY.med}</p>
        </div>
      </div>
    );
  }

  const uf = { ...f, ...counts };
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
        <label>Predicted A-levels
          <select value={f.pred} onChange={(e) => setF({ ...f, pred: e.target.value })}>{["A*AA", "AAA", "AAB", "Other"].map((g) => <option key={g} value={g}>{g}</option>)}</select>
        </label>
        <label>Scottish applicant
          <select value={f.scottish ? "yes" : "no"} onChange={(e) => setF({ ...f, scottish: e.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes</option></select>
        </label>
        <label>Contextual applicant
          <select value={f.ctx ? "yes" : "no"} onChange={(e) => setF({ ...f, ctx: e.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes</option></select>
        </label>
        <label style={{ justifyContent: "flex-end" }}>
          <button className="ud-btn" onClick={run}>Map my choices</button>
        </label>
      </div>

      {ran && (
        <>
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

  const save = () => { setPrefs({ ...prefs, examDate: val }); setEditing(false); };

  if (!prefs.examDate || editing) {
    return (
      <div className="cd-strip set">
        <div>
          <span className="k">Test day</span>
          <b>When do you sit the UCAT?</b>
          <span className="d">Everything paces itself around this date.</span>
        </div>
        <div className="cd-in">
          <input type="date" value={val} onChange={(e) => setVal(e.target.value)} aria-label="Your UCAT test date" />
          <button className="ud-btn" onClick={save} disabled={!val}>Set</button>
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

function Locked({ children, onUnlock, label }) {
  return (
    <div className="lk-wrap">
      <div className="lk-blur" aria-hidden="true">{children}</div>
      <div className="lk-over">
        <div className="lk-pill">
          <b>LOCKED</b>
          <span>{label || "Included with full access"}</span>
          <button onClick={onUnlock}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ STATEMENT BUILDER ----------------- */
/* Critiques and organises the student's own material. It never       */
/* writes content: a statement drafted by software is misconduct      */
/* territory and universities screen for it.                          */

const PS_TOTAL = 4000;
const PS_WORDS = 620;
function wordCount(t) { return (t || "").trim().split(/\s+/).filter(Boolean).length; }

const PS_SECTIONS = [
  { id: "why", n: 1, title: "Why do you want to study this course?",
    aim: "Show a specific spark, then prove you tested it. This section is about motivation that survived contact with reality.",
    steps: [
      "Open with the actual moment, not a childhood memory. A treatment you had, something on placement, a book, a conversation.",
      "Say what it made you understand about the job, not just how it made you feel.",
      "Show what you did next because of it. Motivation that led to action is the only kind worth writing down.",
      "Land on the version of the career you now understand, downsides included.",
    ],
    frame: "PEEL", chars: 1200,
    traps: ["Since I was five years old", "My parents are doctors", "I want to help people, with nothing after it", "Quotes from famous physicians"],
  },
  { id: "prep", n: 2, title: "What have you done to prepare for this course?",
    aim: "Experience plus structure. The marks are in what you extracted, never in what you got access to.",
    steps: [
      "Pick two or three experiences, not everything. Depth outscores coverage every time.",
      "For each: what you did, one specific thing you noticed, and what it taught you.",
      "Include subjects where they genuinely connect. Draw a straight line from something you studied to something the course demands.",
      "If your access was limited, say so plainly and show how you compensated. Honesty plus reflection beats exaggeration.",
    ],
    frame: "STAR or CAR", chars: 1500,
    traps: ["Listing placements like a CV", "Naming the hospital or consultant to impress", "Describing what you saw with no lesson drawn"],
  },
  { id: "skills", n: 3, title: "How have your experiences helped you develop relevant skills?",
    aim: "This is the reflection section. You are proving you have grown, not that you were there.",
    steps: [
      "Name the skill, then the evidence, then what it showed you, then how it applies to the course.",
      "Use non-clinical experience freely: a part-time job handling angry customers, caring responsibilities, sport, music.",
      "Show change over time. What you would do differently now is worth more than what went well.",
      "Finish on where you have already used the lesson since.",
    ],
    frame: "PEEL or Gibbs", chars: 1300,
    traps: ["Claiming skills with no evidence", "I am a good team player", "Listing adjectives about yourself"],
  },
];

const PS_FRAMES = [
  { id: "peel", name: "PEEL", best: "Best for reflection and for linking an experience to the course.",
    steps: [["Point", "The claim, in one sentence."], ["Evidence", "The specific thing that happened."], ["Explanation", "What it showed you about the job."], ["Link", "Why that matters for this course."]] },
  { id: "star", name: "STAR", best: "Best for a story with a clear outcome. Can feel rigid if overused.",
    steps: [["Situation", "One sentence of scene setting."], ["Task", "What needed doing and why it was hard."], ["Action", "What you did, first person."], ["Result", "What changed because of you."]] },
  { id: "car", name: "CAR", best: "A shorter STAR. Good when characters are tight, but it can lose the reflection.",
    steps: [["Context", "Where and when."], ["Action", "What you did."], ["Result", "What happened."]] },
  { id: "gibbs", name: "Gibbs cycle", best: "The deepest reflection. Use it once, on your most important experience.",
    steps: [["Description", "What happened."], ["Feelings", "How you felt at the time."], ["Evaluation", "What was good or difficult about it."], ["Analysis", "What sense you make of it now."], ["Conclusion", "What it confirmed or changed."], ["Action plan", "What you have done since."]] },
];

const PS_HOWTO = [
  { h: "The format changed in 2025", p: "The old single 4,000 character essay is gone. It is now three structured questions, sharing one budget of about 4,000 characters including spaces, which is roughly 620 words in total. That is far less than it sounds, so every sentence has to earn its place." },
  { h: "Reflection beats description", p: "Nobody is scoring how impressive your placement was. If you shadowed a brilliant surgeon on a rare case, that is not the point. What matters is what you learned and what you did with it. Description tells them where you stood; reflection tells them who you are." },
  { h: "Start with a list, not a paragraph", p: "Write down everything you have done, then rank it. You will not have room for all of it, so choose a few things and go deep rather than producing a CV. The blurt tool below does exactly this and tells you which section each item belongs in." },
  { h: "Do not tailor it to one university", p: "One statement goes to every choice. Writing it around your dream school wastes characters on people who will never read it, and some schools barely use the statement at all. Write something any admissions tutor would recognise as a strong candidate." },
  { h: "Draft early, redraft often", p: "Most successful applicants have a rough draft by the end of Year 12 and are still redrafting in September of Year 13. First drafts are supposed to be bad. Get the material down, then cut." },
  { h: "It has to sound like you", p: "If a friend picked it up off the street they should know you wrote it. That is also why you cannot generate it: you will be asked about it at interview, and the version you did not write is the version you cannot defend." },
];

/* ---- Blurt sorter: student dumps experiences, tool assigns sections ---- */

const PS_ROUTER = [
  { sec: 3, why: "This is skill evidence. Section 3 wants the skill, the proof, and what it changed in you.",
    re: /\b(team|teamwork|captain|led|leader|group|committee|communicat|listen|explain|taught|tutor|mentor|coach|organis|organiz|manag|part[- ]time|job|waiter|retail|customer|shop|carer|caring for|babysit|volunteer|charity|scout|duke of edinburgh|dofe)\b/i },
  { sec: 2, why: "This is preparation evidence. Section 2 wants what you did, what you noticed, and the lesson.",
    re: /\b(work experience|shadow|placement|hospital|clinic|gp|surgery|dentist|dental|ward|care home|hospice|pharmacy|observ|st john|first aid|course|mooc|webinar|lecture series|read|book|podcast|journal|research|epq|project|olympiad|biology|chemistry|physics|maths|a[- ]level)\b/i },
  { sec: 1, why: "This is motivation material. Section 1 wants the spark and what you did because of it.",
    re: /\b(inspired|sparked|why i|realised|realized|decided|fascinated|interest began|my own|family|illness|diagnos|treatment|operation|root canal|braces|appointment|patient journey|documentary)\b/i },
];

function routeBlurt(line) {
  for (const r of PS_ROUTER) if (r.re.test(line)) return r;
  return { sec: 2, why: "Not sure from the wording. Section 2 is the usual home for anything you did to prepare. Add what you noticed and what it taught you, and it may belong in section 3 instead." };
}

/* ---- Generic writing check ----
   Deliberately NOT an AI detector. Detectors are unreliable and flag
   honest non-native writers constantly. This scores how templated the
   writing is, which is what actually loses marks.                     */

const PS_CLICHE_LIST = [
  [/\bsince i was (a )?(young|little|small|five|\d+)\b/i, "Since I was ... opener"],
  [/\bfrom a young age\b/i, "From a young age"],
  [/\bi (have )?(always )?(wanted|dreamed|dreamt) (to be|of being)\b/i, "Always wanted to be"],
  [/\bi am (very |really )?passionate about\b/i, "Passionate about"],
  [/\bhelp(ing)? people\b/i, "Helping people, unqualified"],
  [/\bmake a difference\b/i, "Make a difference"],
  [/\brewarding (career|profession|job)\b/i, "Rewarding career"],
  [/\bmy parents are\b/i, "My parents are"],
  [/\bfascinating (world|field) of\b/i, "The fascinating world of"],
  [/\bever since\b/i, "Ever since"],
  [/\bi believe (that )?i (would|am|have)\b/i, "I believe I would be"],
  [/\bhard[- ]working (and|individual|person)\b/i, "Hard-working"],
  [/\bwell[- ]rounded\b/i, "Well-rounded"],
  [/\bthis experience taught me a lot\b/i, "Taught me a lot, unspecific"],
  [/\bin today's (world|society)\b/i, "In today's society"],
  [/\bplays a (vital|crucial|key) role\b/i, "Plays a vital role"],
];

function checkGeneric(text) {
  const raw = text.trim();
  if (raw.split(/\s+/).filter(Boolean).length < 30) return null;
  const sents = splitSentences(raw);
  const words = raw.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);

  /* burstiness: sentence length variation. Templated writing is flat. */
  const lens = sents.map((x) => x.split(/\s+/).length);
  const mean = lens.reduce((a, b) => a + b, 0) / (lens.length || 1);
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / (lens.length || 1));
  const burst = mean ? sd / mean : 0;

  /* vocabulary diversity */
  const uniq = new Set(words).size;
  const diversity = words.length ? uniq / words.length : 0;

  /* repetition of openers */
  const openers = sents.map((x) => x.split(/\s+/)[0].toLowerCase());
  const openRepeat = openers.length ? 1 - new Set(openers).size / openers.length : 0;

  /* cliche density */
  const hits = PS_CLICHE_LIST.filter(([re]) => re.test(raw)).map(([, name]) => name);

  /* concreteness: numbers, named things, first person actions */
  const concrete = (raw.match(/\d/g) || []).length
    + (raw.match(/\bi (led|organised|organized|noticed|asked|shadowed|volunteered|arranged|built|practised|practiced|spoke|decided|took|ran|started)\b/gi) || []).length * 2;

  const flags = [];
  if (hits.length) flags.push({ k: "Cliches", v: `${hits.length} found`, s: hits.length >= 3 ? "bad" : "warn", d: hits.join(", ") + ". These appear in thousands of statements, so they carry no information about you." });
  else flags.push({ k: "Cliches", v: "none found", s: "good", d: "No stock phrases detected. That alone puts you ahead of most drafts." });

  if (burst < 0.25) flags.push({ k: "Sentence rhythm", v: "flat", s: "warn", d: "Your sentences are all a similar length, which reads as machine-even. Real writing varies: a long explanation, then a short one that lands." });
  else flags.push({ k: "Sentence rhythm", v: "natural", s: "good", d: "Good variation in sentence length, which is what human writing sounds like." });

  if (diversity < 0.42) flags.push({ k: "Vocabulary", v: "repetitive", s: "warn", d: "You reuse the same words heavily. Check for repeated use of experience, learned, skills and important." });
  else flags.push({ k: "Vocabulary", v: "varied", s: "good", d: "Good range of vocabulary without straining for thesaurus words." });

  if (openRepeat > 0.35) flags.push({ k: "Sentence openers", v: "repetitive", s: "warn", d: "Too many sentences start the same way, usually with I. Vary the opening and the whole thing reads faster." });
  else flags.push({ k: "Sentence openers", v: "varied", s: "good", d: "Openings vary, so it does not read as a list." });

  if (concrete < 3) flags.push({ k: "Concrete detail", v: "thin", s: "bad", d: "Almost no specifics: no numbers, no named moments, few first person actions. This is the single biggest cause of a forgettable statement." });
  else flags.push({ k: "Concrete detail", v: "present", s: "good", d: "Specific moments and actions are doing work here." });

  const bad = flags.filter((f) => f.s === "bad").length;
  const warn = flags.filter((f) => f.s === "warn").length;
  const score = Math.max(0, 100 - bad * 25 - warn * 12);
  const verdict = score >= 80 ? "Reads like you" : score >= 55 ? "Partly templated" : "Reads generic";
  return { flags, score, verdict, hits };
}

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
/* Wire STRIPE_LINK to a Stripe Payment Link and billing is live.     */

const STRIPE_LINK = "";      /* e.g. https://buy.stripe.com/xxxxx */
const PRICE = "£25";
const PRICE_NOTE = "one payment, no subscription, no renewal";

const PLAN_INCLUDES = [
  "Every drill: QR, VR, Decision Making and SJT",
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
        <div className="ud-mark" style={{ justifyContent: "center", marginBottom: 6 }}><b>Tempo</b><span>UCAT trainer</span></div>
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

function BillingView({ unlocked, onUnlock, email }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const tryCode = () => {
    if (code.trim().toUpperCase() === "UCAT25") { setErr(""); onUnlock(); }
    else setErr("That code is not recognised.");
  };
  const checkout = () => {
    if (STRIPE_LINK) window.open(STRIPE_LINK, "_blank", "noopener");
    else setErr("Checkout is not connected in this preview. Use the access code UCAT25 to unlock everything.");
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
            <p className="price"><b>{PRICE}</b><em>once</em></p>
            <p className="sub">{PRICE_NOTE}</p>
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

function MockCentre({ unlocked, prefs, setPrefs }) {
  const week = weekNumber();
  const [type, setType] = useState("vr");
  const [slot, setSlot] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [confirmExit, setConfirmExit] = useState(false);
  const [mock, setMock] = useState(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [left, setLeft] = useState(0);
  const [board, setBoard] = useState(null);
  const [name, setName] = useState(prefs.name || "");
  const [submitted, setSubmitted] = useState(false);
  const answersRef = useRef([]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  /* True only when a real cross-device backend (Supabase) is live.
     Until then boards live on this device, so the copy must say so. */
  const boardGlobal = sharedIsGlobal();
  const lbKey = `lb:${type}:w${week}:s${slot}`;

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

  const startMock = (t, sl) => {
    const m = t === "vr" ? buildVrMock(week, sl) : buildQrMock(week, sl);
    setType(t); setSlot(sl); setMock(m);
    setPhase("run"); setI(0); setAnswers([]); setLeft(m.secs);
    setSubmitted(false); setBoard(null);
  };

  const answer = (val) => {
    const next = [...answers, val];
    if (next.length >= mock.flat.length) finish(next, mock);
    else { setAnswers(next); setI(i + 1); }
  };

  const isRight = (q, given) => (q.a !== undefined ? given === q.a : given === q.answer);
  const score = mock ? answers.filter((a, n) => isRight(mock.flat[n], a)).length : 0;
  const pct = mock ? Math.round((score / mock.flat.length) * 100) : 0;

  const submitScore = async () => {
    const nm = name.trim().slice(0, 12);
    if (nm.length < 2) return;
    setPrefs({ ...prefs, name: nm });
    try {
      let list = await getSharedJSON(lbKey, []);
      if (!Array.isArray(list)) list = [];
      list.push({ name: nm, pct, ts: Date.now() });
      list = list.slice(-200);
      await setSharedJSON(lbKey, list);
      setBoard(list);
    } catch (e) { /* leaderboard unavailable; keep local result */ }
    setSubmitted(true);
  };

  const sorted = (board || []).slice().sort((a, b) => b.pct - a.pct || a.ts - b.ts);
  const avg = sorted.length ? Math.round(sorted.reduce((a, b) => a + b.pct, 0) / sorted.length) : null;
  const rank = submitted && sorted.length ? sorted.findIndex((e) => e.name === name.trim().slice(0, 12) && e.pct === pct) + 1 : null;

  /* ---------- idle: chooser ---------- */
  if (phase === "idle") {
    const meta = type === "vr"
      ? { count: VR_MOCK_QCOUNT, mins: Math.round(VR_MOCK_SECONDS / 60), note: "Three passages at the exam's exact pace: 30 seconds a question, the same rate as 44 in 22:00. Fresh passage combinations every week." }
      : { count: QR_MOCK_QCOUNT, mins: 26, note: "Full length: 36 questions in 26 minutes, matching the real section. Freshly generated each week; everyone sits the identical paper." };
    return (
      <div className="ud-wrap">
        <div className="ud-sec" style={{ paddingTop: 32 }}><h2>Weekly mocks</h2><i /><span>week {week % 1000} · three per section · boards reset weekly</span></div>
        <div className="ud-mode" style={{ paddingTop: 14 }}>
          <span>Section</span>
          <button className={type === "vr" ? "on" : ""} onClick={() => setType("vr")}>Verbal Reasoning</button>
          <button className={type === "qr" ? "on" : ""} onClick={() => setType("qr")}>Quantitative Reasoning</button>
        </div>
        <p className="ud-learn-intro">{meta.note} No feedback until the end, one clock, no pausing. Your score joins this week's board for that mock, {boardGlobal ? "shared with everyone sitting it" : "kept on this device"}.</p>
        <div className="ud-subs" style={{ paddingTop: 16 }}>
          {[0, 1, 2].map((sl) => (
            <button key={sl} className="ud-sub" disabled={!unlocked} onClick={() => startMock(type, sl)} style={{ padding: "16px 15px" }}>
              <b>{type.toUpperCase()} Mock {"ABC"[sl]}</b>
              <span>{meta.count} questions · {meta.mins}:00 · this week's paper{unlocked ? "" : " · locked"}</span>
            </button>
          ))}
        </div>
        <p className="ud-empty" style={{ paddingTop: 12 }}>
          {boardGlobal
            ? "Leaderboard names and scores are visible to everyone using this app, so use initials or a nickname if you prefer. Boards are per mock, per week."
            : "Leaderboards are saved on this device only for now, so you are comparing against your own attempts. A shared board across everyone sitting the mock arrives once accounts are connected. Boards are per mock, per week."}
        </p>
      </div>
    );
  }

  /* ---------- run ---------- */
  if (phase === "run") {
    const q = mock.flat[i];
    const gmax = q.graph ? Math.max(...q.graph.values) : 1;
    return (
      <div className="ud-run">
        <ExitGuard open={confirmExit} onStay={() => setConfirmExit(false)} onLeave={() => setPhase("idle")} />
        <div className="ud-runbar">
          <BrandMark onClick={() => setConfirmExit(true)} />
          <div className={`ud-clock mono${left < 60 ? " warn" : ""}`}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>
          <span className="ud-examflag">MOCK</span>
          <div className="ud-prog"><i style={{ width: `${(i / mock.flat.length) * 100}%` }} /></div>
          <span className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>{i + 1}/{mock.flat.length}</span>
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
            <p className="ud-qs">{q.stem || q.prompt}</p>
            {(q.options).map((o, n) => (
              <button key={n} className="ud-opt" onClick={() => answer(type === "vr" ? n : o)}>
                <b>{String.fromCharCode(65 + n)}</b>{o}
              </button>
            ))}
            <p className="ud-hint">No feedback until the end. Aim for {mock.perQ} seconds a question.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- review ---------- */
  const wrong = mock.flat.map((q, n) => ({ q, given: answers[n], n })).filter((x) => !isRight(x.q, x.given));
  return (
    <div className="ud-wrap ud-res">
      <div className="ud-eyebrow">{type.toUpperCase()} · {mock.title} · week {week % 1000}</div>
      <p className="ud-score">{pct}<small>%</small></p>
      <div className="ud-stats" style={{ marginTop: 18 }}>
        <div className="ud-stat"><b className="mono">{score}/{mock.flat.length}</b><span>Correct</span></div>
        {avg !== null && <div className="ud-stat"><b className="mono">{avg}%</b><span>Average, this mock</span></div>}
        {rank && <div className="ud-stat"><b className="mono">#{rank}</b><span>Your rank</span></div>}
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

      {sorted.length > 0 && (
        <>
          <div className="ud-sec"><h2>This week's board</h2><i /><span>{sorted.length} entries</span></div>
          {sorted.slice(0, 10).map((e, n) => (
            <div className="ud-mrow" key={n}>
              <span className="sec mono">#{n + 1}</span>
              <span className="txt">{e.name}</span>
              <span className="mono" style={{ color: n === 0 ? "var(--signal)" : "var(--paper)", fontSize: 13 }}>{e.pct}%</span>
            </div>
          ))}
        </>
      )}

      {wrong.length > 0 && (
        <>
          <div className="ud-sec"><h2>The ones you missed</h2><i /><span>{type === "vr" ? "evidence highlighted in the passage" : "full working shown"}</span></div>
          {wrong.map(({ q, given, n }) => (
            <div className="ud-trend" key={n} style={{ padding: 20 }}>
              <p className="ud-qs" style={{ color: "var(--paper)" }}>{n + 1}. {q.stem || q.prompt}</p>
              <p style={{ fontSize: 13, margin: "0 0 4px" }}>
                <span style={{ color: "var(--stop)" }}>Yours: {given === null || given === undefined ? "unanswered (time ran out)" : q.a !== undefined ? q.options[given] : String(given)}</span>
                <span style={{ color: "var(--go)", marginLeft: 14 }}>Correct: {q.a !== undefined ? q.options[q.a] : q.answer}</span>
                {q.diagram && <WorkDiagram d={q.diagram} />}
              </p>
              <p style={{ fontSize: 13.5, color: "var(--body)", lineHeight: 1.65, margin: "8px 0 12px" }}>{q.why || q.working}</p>
              {type === "vr" ? (
                <div style={{ background: "var(--card)", borderRadius: 3, padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5A6675", margin: "0 0 8px" }}>Where the answer was hiding</p>
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

const MISTAKE_DRILL = { id: "mistakes", section: "MIX", name: "Mistake rematch", budget: 30 };

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
  const [mistakes, setMistakes] = useState([]);
  const [prefs, setPrefsState] = useState({ count: 10, exam: false, extra: 1, level: "medium" });
  const [ready, setReady] = useState(false);
  const [missedNow, setMissedNow] = useState(0);
  const [account, setAccount] = useState(null);
  const [authDone, setAuthDone] = useState(false);
  const lastRun = useRef(null);

  useEffect(() => {
    loadState().then((s) => {
      setUnlocked(s.unlocked); setBest(s.best); setHistory(s.history);
      setPlan(s.plan); setWeak(s.weak); setMistakes(s.mistakes);
      const pf = { count: 10, exam: false, extra: 1, level: s.level || "medium", ...(s.prefs || {}) };
      setPrefsState(pf);
      if (pf.account) { setAccount(pf.account); setAuthDone(true); }
      if (pf.skippedAuth) setAuthDone(true);
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

  const start = (d, isExam, count, key, sub, theme) => {
    const lvl = prefs.level;
    let qs = [];
    if (d.id === "tables") qs = makeTables(count, weak, lvl);
    else if (d.id === "calc") qs = makeCalc(count, weak, lvl);
    else if (d.id === "estimate") qs = makeEstimate(count, weak, lvl, sub);
    else if (d.id === "qrset") qs = makeQrSets(count, lvl);
    else if (d.id === "scan") qs = makeScan(count, weak);
    else if (d.id === "tfc") qs = makeTfc(count, weak);
    else if (d.id === "sjt") qs = makeSjt(count, weak, theme);
    else if (d.id === "dm") qs = makeDm(count, weak, sub, lvl);
    lastRun.current = { d, isExam, count, sub, theme };
    setDrill(d);
    setMeta(null);
    setRunExam(!!isExam && TIMED.includes(d.id));
    setRunBudget(Math.round(d.budget * LEVELS[lvl].budget * (prefs.extra || 1)));
    setPlanKey(key || null);
    setQuestions(qs);
    setView("run");
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

  const rerun = () => {
    const r = lastRun.current;
    if (!r) { setView("drills"); return; }
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
    setMissedNow(l.filter((x) => !x.correct).length);
    setView("results");
  };

  const unlock = () => { setUnlocked(true); setJSON("ucat:unlocked", true); };

  /* Self-service deletion: wipe every key on this device, sign out of
     Supabase, and reset to a clean, signed-out state. Full server-side
     erasure of the account needs the email route in the privacy policy
     (or a service-role Edge Function), which the UI states honestly. */
  const deleteAccount = async () => {
    await deleteLocalData();
    if (supabaseEnabled) { try { await supabase.auth.signOut(); } catch (e) { /* ignore */ } }
    setUnlocked(false); setBest({}); setHistory([]); setPlan({}); setWeak({}); setMistakes([]);
    setPrefsState({ count: 10, exam: false, extra: 1, level: "medium" });
    setAccount(null); setAuthDone(false);
    setView("drills");
  };

  const Header = () => (
    <div className="ud-wrap">
      <div className="ud-top">
        <button className="ud-markbtn" onClick={() => setView("drills")} aria-label="Go to home">
          <span className="ud-mark"><b>Tempo</b><span>UCAT trainer</span></span>
        </button>
        <div className="ud-nav">
          {[["drills", "Drills"], ["learn", "Learn"], ["mock", "Mock"], ["interview", "Interview"], ["unis", "Unis"], ["ps", "Statement"], ["plan", "Plan"], ["progress", "Progress"], ["mistakes", "Mistakes"], ["legal", "Legal"], ["billing", unlocked ? "Access" : "Unlock"]].map(([k, label]) => (
            <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
              {label}
              {k === "mistakes" && activeMistakes.length > 0 && <span className="dot" />}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="ud-theme" aria-label="Switch between light and dark mode"
            onClick={() => setPrefs({ ...prefs, theme: prefs.theme === "light" ? "dark" : "light" })}>
            {prefs.theme === "light" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            )}
          </button>
          <button className={`ud-badge${unlocked ? " on" : ""}`} onClick={() => setView("billing")} title={account ? account.email : "Not signed in"}>
            {unlocked ? "Full access" : "Free drill only"}
          </button>
        </div>
      </div>
    </div>
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
    <div className={`ud${prefs.theme === "light" ? " light" : ""}`}>
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
      {view === "drills" && (<><Header /><Home unlocked={unlocked} best={best} prefs={prefs} setPrefs={setPrefs} onStart={start} onUnlock={unlock} mistakesCount={activeMistakes.length} onMistakes={startMistakes} onLearnSjt={() => setView("sjtlearn")} onGoto={(v) => setView(v)} planNext={planNextName} /></>)}
      {view === "sjtlearn" && (<><Header /><SjtLearn onBack={() => setView("drills")} onPractice={() => start(DRILL_BY_ID.sjt, prefs.exam, Math.min(prefs.count, 25), null, null, null)} /></>)}
      {view === "learn" && (<><Header /><LearnView unlocked={unlocked} onStart={start} onUnlock={() => setView("billing")} /></>)}
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
      {view === "billing" && (<><Header /><BillingView unlocked={unlocked} onUnlock={unlock} email={account ? account.email : ""} /></>)}
      {view === "legal" && (<><Header /><LegalView account={account} prefs={prefs} setPrefs={setPrefs} onDeleteAccount={deleteAccount} /></>)}
      {view === "ps" && (<><Header /><PsBuilder unlocked={unlocked} onUnlock={() => setView("billing")} /></>)}
      {view === "plan" && (<><Header /><PlanView unlocked={unlocked} plan={plan} onStart={start} /></>)}
      {view === "progress" && !unlocked && (<><Header /><div className="ud-wrap"><div className="ud-sec" style={{ paddingTop: 32 }}><h2>Progress</h2><i /><span>locked</span></div>
        <Locked onUnlock={() => setView("billing")} label="Progress tracking with access">
          <div className="ud-trend" style={{ padding: 20, minHeight: 200 }}><h3>Sparklines, weak tags and score history</h3>
          <p style={{ color: "var(--body)", fontSize: 13.5, lineHeight: 1.65 }}>Every session tracked per section, with the tags you keep dropping marks on surfaced automatically.</p></div>
        </Locked></div></>)}
      {view === "progress" && unlocked && (<><Header /><ProgressView history={history} weak={weak} /></>)}
      {view === "mistakes" && (<><Header /><MistakesView mistakes={mistakes} active={activeMistakes} onRetry={startMistakes} onClear={() => { setMistakes([]); setJSON("ucat:mistakes", []); }} /></>)}
      {view === "run" && drill && drill.id === "speed" && <PacingDrill onDone={done} onQuit={() => setView("drills")} />}
      {view === "run" && drill && drill.id === "blurt" && <BlurtDrill onDone={done} onQuit={() => setView("drills")} />}
      {view === "run" && drill && !["speed", "blurt"].includes(drill.id) && (
        <DrillRunner drill={drill} questions={questions} exam={runExam} budget={runBudget}
          showCalc={drill.id === "calc"} onDone={done} onQuit={() => setView("drills")} />
      )}
      {view === "results" && drill && (<><Header />
        <Results drill={drill} log={log} meta={meta} exam={runExam} history={history}
          onHome={() => setView("drills")} onAgain={rerun} budget={runBudget}
          onDiagDrill={(id) => start(DRILL_BY_ID[id], false, DRILL_BY_ID[id].def, null, null, null)}
          onMistakes={startMistakes} missedNow={missedNow} />
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
  buildVrMock, buildQrMock,
};
