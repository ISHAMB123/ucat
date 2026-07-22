/* Personal statement content: word targets, section guides, frameworks, how-to and the experience router. */

export const PS_TOTAL = 4000;
export const PS_WORDS = 620;
function wordCount(t) { return (t || "").trim().split(/\s+/).filter(Boolean).length; }

export const PS_SECTIONS = [
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

export const PS_FRAMES = [
  { id: "peel", name: "PEEL", best: "Best for reflection and for linking an experience to the course.",
    steps: [["Point", "The claim, in one sentence."], ["Evidence", "The specific thing that happened."], ["Explanation", "What it showed you about the job."], ["Link", "Why that matters for this course."]] },
  { id: "star", name: "STAR", best: "Best for a story with a clear outcome. Can feel rigid if overused.",
    steps: [["Situation", "One sentence of scene setting."], ["Task", "What needed doing and why it was hard."], ["Action", "What you did, first person."], ["Result", "What changed because of you."]] },
  { id: "car", name: "CAR", best: "A shorter STAR. Good when characters are tight, but it can lose the reflection.",
    steps: [["Context", "Where and when."], ["Action", "What you did."], ["Result", "What happened."]] },
  { id: "gibbs", name: "Gibbs cycle", best: "The deepest reflection. Use it once, on your most important experience.",
    steps: [["Description", "What happened."], ["Feelings", "How you felt at the time."], ["Evaluation", "What was good or difficult about it."], ["Analysis", "What sense you make of it now."], ["Conclusion", "What it confirmed or changed."], ["Action plan", "What you have done since."]] },
];

export const PS_HOWTO = [
  { h: "The format changed in 2025", p: "The old single 4,000 character essay is gone. It is now three structured questions, sharing one budget of about 4,000 characters including spaces, which is roughly 620 words in total. That is far less than it sounds, so every sentence has to earn its place." },
  { h: "Reflection beats description", p: "Nobody is scoring how impressive your placement was. If you shadowed a brilliant surgeon on a rare case, that is not the point. What matters is what you learned and what you did with it. Description tells them where you stood; reflection tells them who you are." },
  { h: "Start with a list, not a paragraph", p: "Write down everything you have done, then rank it. You will not have room for all of it, so choose a few things and go deep rather than producing a CV. The blurt tool below does exactly this and tells you which section each item belongs in." },
  { h: "Do not tailor it to one university", p: "One statement goes to every choice. Writing it around your dream school wastes characters on people who will never read it, and some schools barely use the statement at all. Write something any admissions tutor would recognise as a strong candidate." },
  { h: "Draft early, redraft often", p: "Most successful applicants have a rough draft by the end of Year 12 and are still redrafting in September of Year 13. First drafts are supposed to be bad. Get the material down, then cut." },
  { h: "It has to sound like you", p: "If a friend picked it up off the street they should know you wrote it. That is also why you cannot generate it: you will be asked about it at interview, and the version you did not write is the version you cannot defend." },
];

/* ---- Blurt sorter: student dumps experiences, tool assigns sections ---- */

export const PS_ROUTER = [
  { sec: 3, why: "This is skill evidence. Section 3 wants the skill, the proof, and what it changed in you.",
    re: /\b(team|teamwork|captain|led|leader|group|committee|communicat|listen|explain|taught|tutor|mentor|coach|organis|organiz|manag|part[- ]time|job|waiter|retail|customer|shop|carer|caring for|babysit|volunteer|charity|scout|duke of edinburgh|dofe)\b/i },
  { sec: 2, why: "This is preparation evidence. Section 2 wants what you did, what you noticed, and the lesson.",
    re: /\b(work experience|shadow|placement|hospital|clinic|gp|surgery|dentist|dental|ward|care home|hospice|pharmacy|observ|st john|first aid|course|mooc|webinar|lecture series|read|book|podcast|journal|research|epq|project|olympiad|biology|chemistry|physics|maths|a[- ]level)\b/i },
  { sec: 1, why: "This is motivation material. Section 1 wants the spark and what you did because of it.",
    re: /\b(inspired|sparked|why i|realised|realized|decided|fascinated|interest began|my own|family|illness|diagnos|treatment|operation|root canal|braces|appointment|patient journey|documentary)\b/i },
];
