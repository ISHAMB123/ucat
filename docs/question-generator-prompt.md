# Tempo question-generator prompt

Paste everything inside the fence below into the other chat (the one holding the
reference pages). Tell it how many of each type you want per batch. Then paste its
output back to the Tempo chat for validation and merging.

````text
You are generating practice content for "Tempo", a UCAT trainer. You have reference
material (real/other-provider UCAT questions). Use it ONLY to calibrate difficulty,
topic spread, format and answer-option style. Do NOT copy any question, passage,
scenario, sentence or answer from it. Everything you output must be ORIGINAL, written
from scratch. Copied content is forbidden and would get the app taken down.

HARD RULES
- Original content only. British spelling. No em dashes anywhere (use commas, colons
  or full stops). Plain apostrophes and quotes.
- Output valid JavaScript ES-module code only, in the exact shapes below. No prose
  outside the code blocks. It is pasted straight into the app.
- Self-consistency is checked by an automated test suite. If any of these fail, the
  batch is rejected:
    * Every multiple-choice answer index must point to a real option in that question.
    * For a "mock evidence" question, the `evidence` string MUST appear VERBATIM as an
      exact substring of that passage's `text`. Copy it character-for-character.
    * No duplicate `id` values within a batch.
- Explanations must teach the technique, not just state the answer.

Produce however many items I ask for per type. Here are the exact formats.

=========================================================
1) VERBAL REASONING PASSAGES  ->  data/vr.js  (export const PASSAGES = [...])
=========================================================
Each passage is ~120-160 words, dense with facts, one neutral topic (history, science,
geography, industry, nature). Then 3 fact-retrieval questions, ~10 key points, and 2
comprehension MCQs.

  {
    id: "unique_slug",
    title: "Short title",
    text: `120 to 160 words of original factual prose with several specific numbers, years and names.`,
    facts: [
      { q: "A question whose answer is a single word/number in the text", a: "2011" },
      { q: "...", a: "14" },
      { q: "...", a: "1996" },
    ],
    points: [ "Ten short bullet facts", "each a phrase", "drawn from the text" ],
    comprehension: [
      { q: "Stem...", options: ["A","B","C","D"], correct: 1 },   // correct = 0-based index
      { q: "Stem...", options: ["A","B","C","D"], correct: 2 },
    ],
  },

=========================================================
2) TRUE / FALSE / CAN'T TELL SETS  ->  data/vr.js  (export const TFC_SETS = { ... })
=========================================================
Keyed by a PASSAGES id. Four statements per passage. `a` is the answer index into
["True","False","Can't tell"]: 0 = True (passage states it), 1 = False (passage
contradicts it), 2 = Can't tell (passage is silent). `w` = why.

  passage_id: [
    { t: "A statement about the passage.", a: 2,
      w: "Why it is Can't tell: the passage never settles this. Explain the trap." },
    { t: "...", a: 1, w: "Why it is False: the passage contradicts it." },
    { t: "...", a: 0, w: "Why it is True: stated or derivable by arithmetic in the text." },
    { t: "...", a: 1, w: "..." },
  ],

=========================================================
3) VR MOCK EVIDENCE SETS  ->  data/vr.js  (added to MOCK_BANK)
=========================================================
A passage plus 4 retrieval MCQs. `a` = correct option index. `evidence` MUST be an
exact substring of the passage text. Provide the passage under `pid`+`passage`.

  {
    pid: "unique_slug",
    passage: { title: "Title", text: `original 120-160 word passage` },
    questions: [
      { stem: "Question?", options: ["A","B","C","D"], a: 1,
        evidence: "the exact clause copied verbatim from the passage text",
        why: "Why the answer is there and the others are traps." },
      // 4 questions total
    ],
  },

=========================================================
4) DECISION MAKING MCQs  ->  data/dm.js  (export const DM_QUESTIONS = [...])
=========================================================
`tag` is one of: "dsyll" (syllogism), "dprob" (probability), "dlogic" (logic puzzle).
Do NOT generate "dvenn" here; Venn questions are produced by the app.
`a` = correct option index.

  { kind: "mcq", stem: "Full self-contained question.",
    options: ["...","...","...","..."], a: 2, tag: "dlogic",
    why: "Worked reasoning to the answer.",
    improve: "The transferable method for this question type." },

=========================================================
5) SYLLOGISM SETS  ->  data/dm.js  (export const SYLL_SETS = [...])
=========================================================
Three premises, five Yes/No conclusions. `yes` = does it definitely follow.

  { premises: ["All A are B.", "No B are C.", "Some C do X."],
    statements: [
      { t: "A conclusion.", yes: true,  why: "Why it follows." },
      { t: "...", yes: false, why: "Why it does not follow (name the fallacy)." },
      // 5 statements total
    ] },

=========================================================
6) SJT SCENARIOS  ->  data/sjt.js  (export const SJT_SCENARIOS = [...])
=========================================================
`theme` one of: safety, honesty, confidentiality, colleagues, candour, dignity,
boundaries, escalation, communication, teamwork.
Each `item.type` is "appropriateness" or "importance". `answer` is a 0-based index:
  appropriateness scale: 0 = A very appropriate thing to do, 1 = Appropriate but not
    ideal, 2 = Inappropriate but not awful, 3 = A very inappropriate thing to do.
  importance scale: 0 = Very important, 1 = Important, 2 = Of minor importance,
    3 = Not important at all.
Optionally add ONE `ranking` block instead of some items (three options, `order` is the
array of option indices from most to least appropriate).

  {
    id: "unique_slug", theme: "honesty",
    text: "A scenario from the perspective of a first-year medical or dental student.",
    items: [
      { type: "appropriateness", stem: "A possible response.", answer: 3,
        why: "Why it scores there, on GMC Good Medical Practice principles.",
        fix: "The rule of thumb to spot this next time." },
      { type: "importance", stem: "A consideration.", answer: 0, why: "...", fix: "..." },
      // 3 to 5 items
    ],
    // optional instead of some items:
    ranking: { stem: "Rank these responses from most to least appropriate.",
      options: ["Option one","Option two","Option three"], order: [0,1,2],
      why: "...", fix: "..." },
  },

Quantitative Reasoning is generated procedurally by the app, so do not produce QR.

OUTPUT: for each type I ask for, give one fenced ```js code block containing a valid
`export const ...` array (or object for TFC_SETS) with the requested number of items.
Nothing else.
````
