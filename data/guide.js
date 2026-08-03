/* The Tempo UCAT guide: strategy and format reference for the Learn page.
 *
 * Adapted and rewritten in Tempo's own words from the project's compiled
 * source notes, de-duplicated and checked against the live 2025/26 format
 * (three cognitive subtests plus SJT, cognitive total out of 2700, no
 * Abstract Reasoning). Facts such as timings, scoring, shortcuts and
 * formulae are reproduced; prose is original. British spelling, no dashes.
 *
 * Block grammar used by the Learn renderer:
 *   ["p", text]                     paragraph
 *   ["h", text]                     sub-heading
 *   ["list", [items]]               bullet list
 *   ["steps", [items]]              numbered list
 *   ["key", title, body]            highlighted key point
 *   ["trap", title, body]           highlighted trap / warning
 *   ["tip", title, body]            highlighted tip
 *   ["table", [head], [[row]]]      data table
 *   ["stat", [[value, label]]]      row of stat tiles
 */

export const EXAM_FORMAT = [
  { name: "Verbal Reasoning", code: "VR", q: 44, time: "22 min", instr: "1.5 min", per: "~30s" },
  { name: "Decision Making", code: "DM", q: 35, time: "37 min", instr: "1.5 min", per: "~63s" },
  { name: "Quantitative Reasoning", code: "QR", q: 36, time: "26 min", instr: "2 min", per: "~43s" },
  { name: "Situational Judgement", code: "SJT", q: 69, time: "26 min", instr: "1.5 min", per: "~22s" },
];

export const SHORTCUTS = [
  ["Alt + N", "Next question"],
  ["Alt + P", "Previous question"],
  ["Alt + F", "Flag the current question"],
  ["Alt + C", "Open the calculator"],
  ["Alt + D", "Open the scratchpad"],
];

export const HALFWAY = [
  ["VR", "around Q22 by 11 minutes"],
  ["DM", "around Q17 by 18 minutes"],
  ["QR", "around Q18 by 13 minutes"],
  ["SJT", "around Q34 by 13 minutes"],
];

export const PCT_FLUENCY = [
  ["12.5%", "0.125", "1/8"],
  ["25%", "0.25", "1/4"],
  ["33%", "0.33", "1/3"],
  ["50%", "0.5", "1/2"],
  ["75%", "0.75", "3/4"],
];

export const GUIDE_META = {
  overview: { title: "The exam itself", tag: "format, scoring and test-day tools", blurb: "Three cognitive subtests plus the SJT, in just under two hours. Know the format cold so nothing on the day is a surprise." },
  vr: { title: "Verbal Reasoning", tag: "44 questions · 22 minutes", blurb: "The weakest subtest nationally, so the cheapest marks. Learn to search a passage instead of reading it." },
  dm: { title: "Decision Making", tag: "35 questions · 37 minutes", blurb: "Logic puzzles, syllogisms, Venn diagrams and probability. Precise reading and the whiteboard win it." },
  qr: { title: "Quantitative Reasoning", tag: "36 questions · 26 minutes", blurb: "Arithmetic under time pressure, not maths. Estimation beats the on-screen calculator on nearly every question." },
  sjt: { title: "Situational Judgement", tag: "69 questions · 26 minutes", blurb: "Feels subjective, is not. A panel applies fixed professional standards, and those standards can be learned." },
  cheat: { title: "The cheat sheet", tag: "everything on one screen", blurb: "The whole guide compressed to what you would want in your head walking in. Read it the night before." },
};

export const GUIDE = {
  overview: [
    ["p", "The UCAT is a computer-based, multiple-choice aptitude test used by most UK and many Australian and New Zealand medical and dental schools. It tests no curriculum content: bringing in outside knowledge is more often a trap than a help. What it really measures is speed under pressure plus disciplined reasoning, so almost every technique in this guide is a way to save seconds or dodge a predictable trap."],

    ["h", "Structure and timing"],
    ["p", "From the 2025 cycle, Abstract Reasoning was withdrawn. There are now three cognitive subtests plus the Situational Judgement Test, sat in a fixed order, in just under two hours. Each subtest is preceded by its own separately timed instruction screen."],
    ["key", "The one-glance version", "VR 44q / 22 min, DM 35q / 37 min, QR 36q / 26 min, SJT 69q / 26 min. Fixed order: VR, DM, QR, SJT. No Abstract Reasoning. Around 184 questions in total."],

    ["h", "Scoring"],
    ["list", [
      "The three cognitive subtests (VR, DM, QR) are each scaled from 300 to 900.",
      "The cognitive total therefore runs 900 to 2700. It used to be out of 3600, when there were four scored cognitive sections.",
      "SJT is scored separately in Bands 1 to 4, where Band 1 is the best.",
      "Raw marks are scaled each cycle to keep papers comparable, like grade boundaries, so you do not need every question right for a top score.",
    ]],
    ["key", "No negative marking", "There is no penalty for a wrong answer, so never leave anything blank. A blind guess on a five-option question is a free 20 percent expected mark. Always put something down."],
    ["p", "How schools use the score varies enormously: some set a cut-off, some rank, some award points, some weight it lightly. For the SJT specifically, some reject Band 3 or 4, some award points per band, some ignore it. Check each target school's exact policy."],

    ["h", "Test-day tools"],
    ["p", "The on-screen calculator is a basic four-function calculator with one memory, in the style of a simple TI-108. Learn it before the day so you are not fighting it. Master M+ (add the shown number to memory), MRC or MR (recall it, reusable for repeated multiplication), M- (clear memory), +/- (flip the sign) and the square-root key. Treat ON/C carefully, it wipes your current working. Use a keyboard number pad if the centre has one, the digits sit closer together."],
    ["p", "You get a laminated whiteboard, a marker and an eraser, plus an on-screen scratchpad (Alt+D) you can type into and resize. You can cut, copy and paste within it, but you cannot copy the question into it. Its contents survive moving between questions in a subtest but are wiped at the end of each subtest. Check your marker and sheets work before you start."],
    ["table", ["Shortcut", "Action"], SHORTCUTS],
    ["tip", "Memorise the shortcuts", "The saved milliseconds compound across roughly 184 questions. Reaching for the mouse to hit Next hundreds of times is real time you will wish you had at the end of a section."],

    ["h", "Timing philosophy"],
    ["p", "Constantly checking the clock wastes time and feeds anxiety. Instead, learn one halfway marker per section and glance at it once. On or ahead of the marker means your pace is right; behind it means speed up or flag more aggressively."],
    ["table", ["Section", "You should be"], HALFWAY],

    ["h", "Flagging and guessing"],
    ["p", "Every question is worth the same. Sinking three minutes into one brutal question costs you the four or five easy questions you never reach. This is the single most common way strong candidates lose marks."],
    ["steps", [
      "If a question is clearly a time sink, or you are stuck on the first question of a set (which usually means the rest of the set is just as hard), do not pour time into it.",
      "Eliminate what you can, make your best guess, and select an answer.",
      "Then flag it and move on. Always select something before you flag: a flagged-but-blank question scores zero if you run out of time.",
    ]],

    ["h", "Mindset and endurance"],
    ["p", "The UCAT rewards stamina as much as ability. You must be able to write off a bad question, or even a weak section, and reset, because scaled scoring means a strong later section can rescue the whole result. Panic bleeds across sections and drags the total down, so practise under timed conditions specifically to train nerve, not just technique."],
    ["p", "Keep perspective too. The UCAT is one part of the application. A strong score helps win interviews but does not guarantee an offer, and an average score can still lead to offers with a strong application elsewhere. It matters, but it is not the whole story."],

    ["h", "How to prepare"],
    ["steps", [
      "Start early and light, around January or February: one to two hours a week learning the format and core techniques.",
      "Move into an intensive block of at least six weeks before the test: two to three hours a day drilling questions.",
      "In the final week, sit the official UCAT practice tests on the UCAT website under realistic timed conditions.",
    ]],
    ["key", "Keep a labelled error log", "For every wrong answer, name the cause so practice fixes the real problem. Careless: you knew it and slipped, fix with focus. Understanding: you misread the question, fix by reading the stem more deliberately. Skill: you did not know the method, fix by revising that technique. Practising without reviewing mistakes just entrenches them."],
  ],

  vr: [
    ["p", "44 questions across 11 passages, four questions per passage, in 22 minutes: roughly two minutes a passage, 30 seconds a question. Passages run 200 to 400 words and are deliberately dense, so this is the most time-pressured section relative to reading load. It is also historically the lowest-scoring cognitive section, which means realistic timing matters here far more than perfection."],
    ["key", "Answer only from the passage", "Your own knowledge is a distractor. The question tests what the text supports, not what is true in the real world. If the passage does not say it, you cannot use it."],

    ["h", "The two question families"],
    ["p", "Within one passage, all four questions are the same family. You never get a mix inside a single passage."],
    ["list", [
      "True / False / Can't Tell: judge a statement against the passage. True means stated or a safe inference. False means directly contradicted. Can't Tell means there is not enough to decide.",
      "Statement / inference: a stem with four options and exactly one right answer, asking what can be concluded, what the writer believes, or what follows. Most modern VR is this family; pure True/False/Can't Tell is now a smaller slice.",
    ]],
    ["tip", "The Can't Tell test", "Ask: if I were handed more information, could this flip to true or false? If yes, it is Can't Tell. Can't Tell is not a cop-out answer, it is often the intended one."],

    ["h", "Strategy: True / False / Can't Tell"],
    ["steps", [
      "Do not read the passage in full. Go straight to the first statement.",
      "Pick out the keywords in the statement.",
      "Scan the passage for those keywords.",
      "When you find one, read that sentence plus the one before and after.",
      "Keep scanning for further mentions and repeat, then answer from that targeted reading.",
      "Aim to clear a four-question set in about a minute to bank time for harder passages.",
    ]],

    ["h", "Strategy: statement / inference"],
    ["steps", [
      "Read the first question to confirm the family is inference-based.",
      "Read the whole passage once, properly, to build a mental map of where each topic lives.",
      "Test option A against your understanding. If it fits, commit. If not, move to B, and so on. The moment you find the right option, stop.",
      "If unsure, jump back to the relevant part of the passage to confirm rather than re-reading all of it.",
    ]],

    ["h", "The underlying skill: reading speed"],
    ["p", "Skimming suits True/False/Can't Tell; genuine fast reading with comprehension is what inference needs. Most people read at speaking speed (150 to 200 words a minute) out of childhood habit. Under exam pressure you want closer to 400 to 500. Three habits to break:"],
    ["list", [
      "Subvocalisation: silently saying each word caps you at speaking speed. Train yourself to see and understand without pronouncing internally.",
      "Fixations: stopping on every single word. Train your eye to take in small chunks per glance.",
      "Backtracking: re-reading what you already read. Resist it unless a question genuinely requires it.",
    ]],

    ["trap", "Extreme language leans False or Can't Tell", "Absolutes such as only, never, always, all, none, must and the best are more often False or Can't Tell than True: the real world rarely supports absolutes, and examiners save true statements for softer, more inferential wording. Short on time, lean that way before flagging. But less likely to be True is not impossible: a passage can genuinely state an absolute, so do not rule it out blindly."],
    ["trap", "Correlation is not causation", "Two things happening together does not license a causal claim. “Whenever James played rugby, it rained” is a correlation, not proof rugby causes rain. Only accept causation when the text signals it: because, as a result of, due to, as evidenced by. Be especially wary when the stem asks for a cause."],
    ["trap", "The near-paraphrase trap", "An option mirrors a sentence with one small, decisive change. “All preschool children like to play outside” in the passage does not make “all children like to play outside” true; that is Can't Tell. Read around the isolated sentence to confirm the exact scope, and watch for planted word swaps (Iran for Iraq, a missing negation)."],

    ["h", "Reminders"],
    ["list", [
      "Read qualifiers in context: always, often, sometimes, never and normally can each flip an answer.",
      "A category is not its members: mammals are not automatically lions unless the passage narrows it.",
      "Learn to discard. If the first question of a set is a slog, the passage is probably a time sink: guess, flag, move on.",
      "Choosing correctly whether to scan or to read is one of the most valuable VR skills.",
    ]],
  ],

  dm: [
    ["p", "35 questions in 37 minutes, roughly 63 seconds each, plus an instruction screen. Decision Making covers logic puzzles, syllogisms, Venn diagrams, probabilistic and statistical reasoning, and evaluating arguments. Each question stands alone rather than sitting in a set."],
    ["p", "The 2025 change was only to count and time: it gained six questions and six minutes over the old format. The content and question styles are unchanged from previous years."],
    ["key", "How to approach it", "Read every word precisely, because one qualifier flips the answer. Use the whiteboard for logic grids and Venn diagrams rather than holding them in your head. And apply the same flagging discipline as everywhere else: a fiddly syllogism is worth the same as an easy one, so do not let it eat the clock."],
    ["list", [
      "Syllogisms: test whether a conclusion must follow, not whether it sounds plausible. Look for the case where the premises are true but the conclusion is false.",
      "Venn diagrams: draw them. Anything involving overlapping groups is far safer on paper than in your head.",
      "Probability: for “at least one” questions, it is usually faster to work out the chance of none and subtract from one.",
      "Evaluating arguments: the strongest argument is relevant and directly addresses the claim, not the one that is merely true or emotionally appealing.",
    ]],
  ],

  qr: [
    ["p", "36 questions in 26 minutes, roughly 43 seconds each, plus a two-minute instruction screen. Questions arrive as scenarios with one to six linked parts (usually about three), each with five numerical options, often hung off a table, chart or graph. Difficulty swings widely, from near-instant to multi-step. A basic on-screen calculator is provided."],
    ["key", "It is arithmetic, not maths", "The exam does not silo questions into neat topics: one question can fold together percentages, a unit conversion and a drug calculation. Train to apply methods flexibly rather than to recognise question types."],

    ["h", "General strategy"],
    ["steps", [
      "Read the question first and extract only what it asks. Long stems and busy charts are deliberately distracting.",
      "Eyeball before you calculate. Estimation often gets you there, or eliminates options, without touching the calculator.",
      "In a linked set, skim it first and do the simplest part first: a later part is sometimes one step of an earlier one and hands you a value you would otherwise recompute.",
      "“Approximately” in the stem means round aggressively and use mental maths.",
    ]],

    ["h", "Using the calculator well"],
    ["list", [
      "Prefer decimals over the % button. For 33 percent, multiply by .33 (drop the leading zero to save a keystroke).",
      "Divide where it is fewer clicks: 25 percent is / 4, not x .25; 12.5 percent is / 8. Dividing by x equals multiplying by 1/x.",
      "Use the memory key for repeated multipliers. For growth of 9.5 percent a year, store 1.095 with M+ and recall it with MRC each year instead of retyping.",
      "If you only need the size of a gap, computing a - b and reading the magnitude of a negative result is faster than reordering.",
    ]],

    ["h", "Percentage fluency"],
    ["p", "Memorise these so you never compute them under pressure:"],
    ["table", ["Percentage", "Decimal", "Fraction"], PCT_FLUENCY],
    ["trap", "Word forms are there to slow you down", "“Tripled” means 300 percent of the original. “Reduced by a quarter” means 75 percent of it. A rise “by 9.5 percent” means multiply by 1.095, not by 0.095: multiplying by the rate alone gives only the increase, not the new total."],

    ["h", "Mental maths building blocks"],
    ["list", [
      "Powers of ten: count zeros. 25 x 200 is 25 x 2 = 50, then append two zeros for 5000. 3300 / 110 is 33 / 11 = 3, then apply the zero difference for 30.",
      "Split multiplication: 12 x 9 = (10 x 9) + (2 x 9) = 90 + 18 = 108.",
      "Place-value addition: split into tens and ones and carry, so 37 + 56 is 13 (carry 1) then 9, giving 93.",
    ]],

    ["h", "Averages and statistics"],
    ["list", [
      "Mean = sum / count. Median = middle value when ordered (average the two middle ones if the count is even). Mode = most frequent. Range = max minus min.",
      "If every value rises by k, the mean rises by k. If only one value rises by k, the mean rises by k divided by the number of values, so by less.",
    ]],

    ["h", "Ratios, units and speed"],
    ["list", [
      "Cross-multiplication is the workhorse: set known/known = unknown/known, cross multiply, solve. It handles proportions, unit conversions and drug doses.",
      "Larger unit to smaller, multiply; smaller to larger, divide. Same for time: hours to minutes x 60, seconds to minutes / 60.",
      "Speed triangle: Distance = Speed x Time, Speed = Distance / Time, Time = Distance / Speed.",
      "Match units before calculating. The classic trap is km/h with a time in minutes, or a mix of miles and km. The only conversion the exam gives you is 1 mile = 1.61 km; know everything else.",
    ]],

    ["h", "Drug calculations"],
    ["list", [
      "Volume: convert mass to volume using the given concentration and standard equivalences (1 g = 1000 mg, 1 mg = 1000 micrograms; for water, 1 g = 1 ml, 1 litre = 1000 ml). 7 mg per 5 kg for a 75 kg patient is (7 x 75) / 5 = 105 mg.",
      "Concentration: find the active ingredient per unit, then how many units deliver the target. A 75 ml syringe at 3 percent carries 2.25 ml of active; to deliver 9 ml you need 9 / 2.25 = 4 syringes.",
    ]],

    ["h", "Probability and geometry"],
    ["list", [
      "Independent events: multiply. Dependent (no replacement): reduce both the numerator and denominator after the first pick, so two blues from 3 in 18 is (3/18) x (2/17).",
      "Know area, perimeter and volume of standard shapes, and Pythagoras (a squared + b squared = c squared). Read whether the question wants the hypotenuse or a shorter side.",
      "Time zones: treat them like floors relative to GMT. From a -4 zone to a +5 zone is a rise of 9 hours. Ignore flight durations and layovers piled on as noise when all you need is one conversion.",
    ]],

    ["trap", "Chart statements follow Can't Tell logic", "When a chart is followed by true / false / can't tell statements, most point to Can't Tell: a generalisation from a sample, a subjective adverb like “very high”, incomplete data (London does not speak for the UK), or an imported outside assumption. A statement is False only if the data directly contradicts it. Unsupported but not contradicted equals Can't Tell."],
    ["tip", "Eyeball and eliminate when time is short", "Round to calculate fast (18 x 21 is about 20 x 20 = 400). Rule out answers by units or direction. Group the five options and guess within the right range, especially on long graph questions. This only works when the options are spread apart; if they cluster, calculate."],
  ],

  sjt: [
    ["p", "The final section: 69 questions in 26 minutes, roughly 22 seconds each, across about 20 scenarios with three to six items. It tests professional judgement in clinical and non-clinical settings, grounded in the GMC's Good Medical Practice (and the GDC standards for dentistry). No medical knowledge is needed. Because judgement is partly subjective, this is the one section that awards partial marks: full marks for the intended answer, partial for a near miss."],
    ["key", "Bands, not a scaled score", "SJT is reported in Bands 1 to 4, Band 1 highest, Band 2 the typical average, scored separately from the cognitive total. It feels subjective but is not: a panel applies fixed standards, and those standards can be learned."],

    ["h", "Logistics to internalise"],
    ["list", [
      "Each item within a scenario is independent. Do not let your answer to item 1 constrain item 2.",
      "Options can be used once, more than once, or not at all. Four actions could all be “very appropriate”.",
      "Each item is one action or one consideration. It need not be the complete response to count as appropriate or important.",
      "Do not answer as yourself. Answer as the character described, within that role's limits.",
      "A doctor or dentist is never “off duty” from their standards, so non-clinical scenarios still demand professional principles.",
    ]],

    ["h", "Question formats"],
    ["list", [
      "Appropriateness: rate one action as Very appropriate, Appropriate but not ideal, Inappropriate but not awful, or Very inappropriate.",
      "Importance: rate one consideration as Very important, Important, Of minor importance, or Not important at all.",
      "Most / least (rarest): from three options, drag the single most and single least appropriate; one is unused. You must get both right to score.",
    ]],

    ["h", "Name the theme, then answer to it"],
    ["list", [
      "Qualities: empathy, compassion, honesty and integrity, respect and dignity, patient-centredness, dedication.",
      "Principles: confidentiality, consent, professionalism, patient safety, due diligence, the four pillars of ethics.",
      "Skills: conflict resolution, prioritisation, leadership and teamwork, coping with pressure, decision making, communication.",
    ]],
    ["key", "Patient safety is paramount", "The themes have a hierarchy, and patient safety outranks the rest. Empathy matters, but never at the expense of safety. When two themes clash, resolve for the one higher up. Whoever first spots a risk must act on it rather than passing it along, because delay increases harm."],
    ["list", [
      "Confidentiality: those not involved in a patient's care have no right to their information. Breach it only in narrow cases (serious harm to the patient or another, a serious crime), only the minimum needed, and ideally after trying to persuade the patient first.",
      "Honesty and integrity: doing the right thing when no one is watching. Owning and correcting a mistake beats concealing it, and any option that dismisses honesty is essentially always inappropriate.",
      "Beneficence versus non-maleficence: doing good (treating, supporting) is distinct from avoiding harm (not over-treating, stopping a harmful interaction). Students often conflate the two.",
    ]],

    ["h", "Know the character's limits"],
    ["p", "Your answer changes with the role. Medical students are mainly observational: they may do basic clinical skills only with a supervisor's approval and view records of patients at their placement, but they cannot prescribe, cannot make care decisions, cannot perform skills without permission, and cannot act beyond their competence. Anchor every answer to what that specific character is allowed to do."],
    ["key", "The four pillars of ethics", "Autonomy (the patient's right to decide), beneficence (act in their best interest), non-maleficence (do no harm) and justice (fairness). These underpin most scenarios and are worth reading around."],

    ["h", "Answering importance questions"],
    ["p", "For each consideration ask two things: if I consider this, is there a benefit to resolving the main issue? And if I ignore it, is there a risk of harm?"],
    ["list", [
      "Benefit and harm-if-ignored both yes leans Very important.",
      "No benefit and no harm, or a consideration that would bias you away from the main issue (“everyone loves this doctor” during a safety complaint), leans Not important at all.",
      "Serve the primary goal, usually patient safety, first.",
    ]],

    ["h", "Answering appropriateness questions"],
    ["list", [
      "Worst case first: rank by the most serious thing at stake. An immediate threat to safety outranks being late to a supervisor.",
      "A very appropriate action tackles the main problem and moves towards a solution. If it does not address the core issue, it cannot be very appropriate.",
      "Do not even suggest breaking a rule. Telling a colleague to instead ask the doctor for confidential information is still inappropriate, because the doctor cannot breach it either.",
      "Clarity and politeness matter. A response that hits the right concern but vaguely or curtly is usually appropriate but not ideal, not very appropriate.",
      "Assumptions lose credibility: an action justified only by an unevidenced assumption is weaker.",
    ]],
    ["tip", "Two safe defaults", "Whenever an item asks how important it is to consider patient safety or patient autonomy, the answer is essentially always Very important. And read the scenario properly, not skim-style as in VR: find the main problem, its theme and the character's role before touching the items."],

    ["h", "Reading that actually moves the band"],
    ["list", [
      "Good Medical Practice (GMC)",
      "Outcomes for Graduates (GMC)",
      "Standards for the Dental Team (GDC)",
    ]],
  ],

  cheat: [
    ["p", "The whole guide compressed to what you would want in your head walking in. Read it the night before, not for the first time."],
    ["h", "Format (2025/26)"],
    ["p", "VR 44q / 22m, DM 35q / 37m, QR 36q / 26m, SJT 69q / 26m. Fixed order VR, DM, QR, SJT. No Abstract Reasoning. No negative marking, so never leave anything blank."],
    ["h", "Scoring"],
    ["p", "VR, DM and QR each 300 to 900, total 900 to 2700. SJT in Bands 1 (best) to 4."],
    ["h", "Shortcuts"],
    ["table", ["Shortcut", "Action"], SHORTCUTS],
    ["h", "Halfway markers"],
    ["table", ["Section", "You should be"], HALFWAY],
    ["h", "VR"],
    ["list", [
      "Answer only from the passage. Scan for True/False/Can't Tell, one focused read for inference.",
      "Extreme language leans False or Can't Tell. Correlation is not causation.",
      "Watch near-paraphrases and word swaps.",
    ]],
    ["h", "QR"],
    ["list", [
      "Read the question first, then eyeball and estimate.",
      "Decimals over the % button, divide where cheaper, memory key for repeated multipliers.",
      "Match units before calculating. Cross-multiply for proportions and drug doses. Can't Tell logic for chart statements.",
    ]],
    ["h", "SJT"],
    ["list", [
      "Name the theme, then answer to it. Patient safety is paramount.",
      "Answer as the character, within their role limits. Items are independent, options reusable.",
      "Suggesting a rule breach is still inappropriate. Safety and autonomy considerations are almost always Very important.",
    ]],
    ["key", "Universal", "Flag ruthlessly, always guess before you flag, keep a labelled error log (careless / understanding / skill), and train nerve under timed conditions. The clock is the exam."],
  ],
};

export const GUIDE_ORDER = ["overview", "vr", "dm", "qr", "sjt", "cheat"];
