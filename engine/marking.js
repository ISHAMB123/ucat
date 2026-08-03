/* Automated writing marking: fixed regex rules, no AI, nothing leaves the device.
   Scores answers, classifies sentences green/amber/red, and rates a full draft. */

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

export function analyseAnswer(text) {
  return splitSentences(text).map((sn) => ({ sn, ...analyseSentence(sn) }));
}

/* Delivery analysis for a spoken answer: pace, filler words and length.
   Interviews are spoken, so how it lands matters as much as what is said.
   Returns null unless there is real speech and a measured duration. */
const FILLERS = /\b(um+|uh+|erm*|hmm+|like|basically|literally|actually|obviously|honestly|you know|kind of|sort of|i mean|i guess|so yeah|sort a|kinda)\b/gi;
/* Group raw matches so "um/umm/ummm" all count as one word, for a clean tally. */
export function normaliseFiller(w) {
  w = (w || "").toLowerCase().trim();
  if (/^um+$/.test(w)) return "um";
  if (/^uh+$/.test(w)) return "uh";
  if (/^erm*$/.test(w)) return "erm";
  if (/^hmm+$/.test(w)) return "hmm";
  if (w === "kinda" || w === "kind of") return "kind of";
  if (w === "sort a" || w === "sort of") return "sort of";
  return w;
}
export function analyseDelivery(text, seconds) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  if (!wc || !(seconds > 0)) return null;
  const wpm = Math.round(wc / (seconds / 60));
  const rawFillers = (text.match(FILLERS) || []).map(normaliseFiller);
  const fillerCounts = {};
  rawFillers.forEach((w) => { fillerCounts[w] = (fillerCounts[w] || 0) + 1; });
  const fillers = rawFillers.length;
  const paceTone = wpm < 110 ? "slow" : wpm > 170 ? "fast" : "good";
  const lenTone = seconds < 40 ? "short" : seconds > 150 ? "long" : "good";
  const bits = [];
  if (paceTone === "fast") bits.push("You are speaking fast, which reads as nerves. Slow down; clarity beats cramming.");
  else if (paceTone === "slow") bits.push("A measured pace, maybe a touch slow. Fine for a considered point, just keep the energy up.");
  else bits.push("Good speaking pace, clear and unhurried.");
  if (fillers >= 4) bits.push(`Heard ${fillers} filler words. A short silence to think reads far better than "um".`);
  if (lenTone === "short") bits.push("Quite short for a station. Develop one point with an example rather than stopping early.");
  else if (lenTone === "long") bits.push("Running long. Interviewers cut you off; make your point and land it.");
  return { wc, seconds: Math.round(seconds), wpm, fillers, fillerCounts, paceTone, lenTone, verdict: bits.join(" ") };
}

/* Concrete, ordered advice for cutting filler words, tailored to the worst
   offender when there is one. Returns null when there is nothing to fix. */
export function fillerAdvice(fillerCounts, total) {
  if (!total) return null;
  const top = Object.entries(fillerCounts || {}).sort((a, b) => b[1] - a[1]);
  const worst = top.length ? top[0][0] : null;
  const tips = [
    "Swap the filler for a pause. A second of silence while you think reads as composure; “um” reads as nerves.",
  ];
  if (worst) tips.push(`Your most frequent was “${worst}”. It tends to slip out the instant before you decide what to say, so let that moment be a silent beat instead of a sound.`);
  tips.push("Plan the first sentence before you open your mouth. Most fillers come from starting to talk before you know where the sentence is going.");
  tips.push("Record one answer and play it back. Hearing your own fillers is the fastest way to notice, and then stop, them.");
  return tips;
}

export const MODEL_SKELETON = {
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


/* ------------------------------ ANSWER MARKER --------------------- */
/* Rule-based marking against a published scheme: structure,          */
/* specificity, ownership, reflection, landing. It reads signals,     */
/* not prose quality, and it never marks spelling or grammar.         */

export const STARR_STEPS = [
  ["1. Situation", "One sentence of scene-setting. Where, when, who. No more than that."],
  ["2. Task", "What needed doing and why it mattered, or why it was hard."],
  ["3. Action", "What YOU did, in first person, step by step. This is the longest part."],
  ["4. Result", "What happened because of your actions. A number or concrete outcome if one exists."],
  ["5. Reflection", "What it taught you, what you would change, and where you have used the lesson since. This is where the marks live."],
];

export function markAnswer(text) {
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

  /* Overall out of 10, plus an honest range. The weakest criterion is the
     one that swings the mark either way, so it drives best and worst case. */
  const to10 = (s) => Math.max(1, Math.min(10, Math.round(s / 10)));
  const outOf10 = to10(score);
  const weakest = crits.slice().sort((a, b) => a.score - b.score)[0];
  const best10 = to10(Math.min(100, score + (2 - weakest.score) * 9 + 6));
  const worst10 = to10(Math.max(0, score - 14));
  const bestCase = `On a generous read, and with ${weakest.name.toLowerCase()} tightened up, this lands around ${best10}/10. ${weakest.fix}`;
  const worstCase = `A strict interviewer weighting ${weakest.name.toLowerCase()} could mark it near ${worst10}/10, so do not count on the benefit of the doubt.`;

  return { crits, total: raw, score, band, outOf10, best10, worst10, bestCase, worstCase, weakest: weakest.name };
}

/* Cliche patterns used only by the draft checker below. */
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

export function checkGeneric(text) {
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
