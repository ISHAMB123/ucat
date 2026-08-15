/* Serverless endpoint for the live interview simulator.
 *
 * The browser holds no model key. It POSTs the running conversation here;
 * this function adds the interviewer's brief and relays a single short turn
 * to the Anthropic API, then hands back the interviewer's reply. The key
 * lives only in an environment variable:
 *   ANTHROPIC_API_KEY   a key from https://platform.claude.com
 *   INTERVIEW_MODEL     optional model id. Defaults to claude-haiku-4-5,
 *                       which runs a scripted interviewer well for about a
 *                       penny a session. Step up to claude-sonnet-5 for
 *                       sharper end-of-interview feedback if you want it.
 *
 * Everything the interviewer says is generated fresh. It is told never to
 * reproduce any real university's questions, matching the rest of the app.
 */
import crypto from "crypto";

const MODEL = process.env.INTERVIEW_MODEL || "claude-haiku-4-5";

/* Verify the HMAC session token minted by /api/interview-start. Returns the
   token payload when valid and unexpired, or null. The token is the proof that
   the interview cost was charged server-side; without it (when INTERVIEW_SECRET
   is set) the real, billable model is never called. Constant-time comparison so
   a forged token cannot be tuned byte by byte. */
function verifyToken(token, secret) {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expect = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString()); } catch (e) { return null; }
  if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}

function brief(track, format) {
  const field = track === "med" ? "medicine" : "dentistry";
  const role = track === "med" ? "doctor" : "dentist";
  const setting =
    format === "mmi"
      ? "a single MMI station: one scenario, explored in depth across a few short exchanges"
      : "a panel interview: a spread of questions across motivation, insight, ethics and teamwork";
  const shape =
    format === "mmi"
      ? "Stay on the one scenario throughout. If it calls for it you may briefly play the other person in a role-play, in character."
      : "Move through four to six distinct questions across the interview, one theme at a time.";
  return `You are a warm but rigorous admissions interviewer for ${field} at a UK university. You are running ${setting}.

How you behave:
- Ask ONE question at a time, then stop and wait for the candidate's answer. Never put two questions in one turn.
- Keep each of your turns to two to four sentences. Talk like a real interviewer, not a form.
- Probe. When an answer is thin or rehearsed, ask a natural follow-up that presses for a concrete example, the other side of the argument, or a hard reality of life as a ${role}.
- ${shape}
- While the interview is running you do not give feedback, hints, marks, or encouragement about quality. You just interview.
- British spelling. Never use the em dash. Plain sentences only, with no internal or system XML tags of any kind.
- Every word you say is your own original material. Never reproduce a real university's actual interview questions.

When the candidate's message ends with the token [FINAL], stop interviewing and write a debrief instead of another question:
- First line: a band from 1 (a lot to work on) to 4 (excellent), written like "Band 3 of 4".
- "What worked" then two specific things the candidate did well, paraphrasing what they said.
- "Sharpen this" then two concrete fixes, each saying how.
- "One reframe" then take their weakest moment and show a stronger two-sentence version of it.
Keep the whole debrief under 200 words, warm and direct. Do not ask any more questions after the debrief.
- On the very last line, write nothing but this machine-readable score, filling each with a whole number from 1 to 5 that reflects the candidate: SCORES structure=N insight=N communication=N resilience=N`;
}

/* Scripted interviewer used only in demo mode (no key set). Original,
   generic questions so the whole experience can be tried for free. It does
   not adapt to answers; that is what the real model does once a key exists. */
const DEMO_QS = {
  dent: {
    panel: [
      "To start, tell me why dentistry rather than medicine or another healthcare career.",
      "Describe a time your attention to detail or your hands made the difference to something you were doing.",
      "A nervous patient in real pain refuses the treatment they clearly need. Talk me through how you would handle that.",
      "What do you think is the hardest part of being a dentist that patients rarely see?",
      "Tell me about something you have read or noticed about access to NHS dentistry, and what you made of it.",
      "Ten years from now, what kind of dentist do you want to be, and why?",
    ],
    mmi: [
      "Here is your station. A friend on your course quietly tells you they cheated in an online assessment and asks you to say nothing. Talk me through what is going through your mind.",
      "Your friend says reporting it would end their career over a single mistake. How does that change your thinking?",
      "Imagine I am that friend, sitting in front of you. Say out loud what you would actually say to me.",
      "Now step back. What principle were you trying to protect, and what did you have to weigh it against?",
    ],
  },
  med: {
    panel: [
      "To start, tell me why medicine rather than another career that also helps people.",
      "Describe a time you saw good teamwork in a caring or pressured setting. What actually made it work?",
      "A patient refuses a treatment you believe they genuinely need. Walk me through how you would handle it.",
      "What do you think is the hardest part of being a doctor that people outside medicine rarely see?",
      "Tell me about something you read or followed recently about the NHS, and what you made of it.",
      "Ten years from now, what kind of doctor do you want to be, and why?",
    ],
    mmi: [
      "Here is your station. A friend on your course quietly tells you they cheated in an online assessment and asks you to keep it to yourself. Talk me through what is going through your mind.",
      "Your friend says reporting it would end their career over a single mistake. How does that change your thinking?",
      "Imagine I am that friend, sitting in front of you. Say out loud what you would actually say to me.",
      "Now step back. What principle were you trying to protect, and what did you have to weigh it against?",
    ],
  },
};

const DEMO_DEBRIEF =
  "Band 3 of 4.\n\n" +
  "What worked\n" +
  "- You engaged with every question and reached for concrete answers rather than abstract ones.\n" +
  "- You showed you can see more than one side of a difficult situation.\n\n" +
  "Sharpen this\n" +
  "- Anchor each claim in a specific moment: name the who, the when and the what, not a general statement.\n" +
  "- When you take a position, say the principle behind it out loud so a marker can actually score your reasoning.\n\n" +
  "One reframe\n" +
  "Instead of \"I want to help people\", try: \"On a hospital ward I watched a clinician's calm turn a frightened patient's whole day around, and I wanted to be the person who could do that.\"\n\n" +
  "This is demo feedback and does not read your actual answers. Add an ANTHROPIC_API_KEY and the interviewer adapts to everything you say.\n" +
  "SCORES structure=3 insight=3 communication=3 resilience=3";

function demoReply(track, format, messages) {
  const last = messages[messages.length - 1];
  if (last && last.role === "user" && /\[FINAL\]\s*$/.test(last.content)) return DEMO_DEBRIEF;
  const bank = (DEMO_QS[track] && DEMO_QS[track][format]) || DEMO_QS.dent.panel;
  const asked = messages.filter((m) => m.role === "assistant").length;
  return bank[Math.min(asked, bank.length - 1)];
}

/* Best-effort per-IP rate limiting. Serverless instances are short-lived, so
   this resets on cold starts and does not span instances; it is a cheap guard
   against one client hammering the endpoint, layered under the credit system.
   For a hard, cross-instance limit use a shared store (Vercel KV / Upstash). */
const RATE = new Map();
const RATE_MAX = 40;
const RATE_WINDOW = 600000;
function rateLimited(ip) {
  const now = Date.now();
  if (RATE.size > 5000) RATE.clear();
  const rec = RATE.get(ip);
  if (!rec || now - rec.start > RATE_WINDOW) { RATE.set(ip, { start: now, n: 1 }); return false; }
  rec.n++;
  return rec.n > RATE_MAX;
}
function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.headers["x-real-ip"] || "unknown";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (rateLimited(clientIp(req))) {
    res.status(429).json({ error: "That is a lot of questions at once. Give it a moment and try again." });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const track = body.track === "med" ? "med" : "dent";
  const format = body.format === "mmi" ? "mmi" : "panel";
  const raw = Array.isArray(body.messages) ? body.messages : [];
  /* Bound the history so a client cannot run up an unbounded bill, and drop
     anything that is not a plain user/assistant text turn. */
  if (raw.length === 0 || raw.length > 40) {
    res.status(400).json({ error: "That interview could not be continued." });
    return;
  }
  const messages = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (messages.length === 0 || messages[0].role !== "user") {
    res.status(400).json({ error: "That interview could not be continued." });
    return;
  }

  /* No key set means demo mode: serve a scripted interviewer so the whole
     flow can be walked through for free. Add ANTHROPIC_API_KEY and this path
     is never taken, the interviewer becomes the real, adaptive model. */
  if (!key) {
    res.status(200).json({ reply: demoReply(track, format, messages), demo: true });
    return;
  }

  /* Real, billable interview. When INTERVIEW_SECRET is set, require the signed
     session token from /api/interview-start, which is issued only after the
     cost has been charged server-side. This is what stops the endpoint being
     called for free. Fail-safe: with no secret set the check is skipped, so the
     app runs exactly as before until the owner deploys the protection. */
  const secret = process.env.INTERVIEW_SECRET;
  if (secret) {
    const claims = verifyToken(req.headers["x-iv-token"], secret);
    if (!claims) {
      res.status(402).json({ error: "This interview needs to be started from your account. Please reopen it and try again." });
      return;
    }
  }

  /* Keep the turn fast and cheap. The interviewer does not need to reason,
     so on the models that accept it we switch thinking off and keep effort
     low. Haiku (the default) takes neither parameter, so we send the bare
     request there, which already runs without thinking. */
  const payload = { model: MODEL, max_tokens: 700, system: brief(track, format), messages };
  if (!/haiku/i.test(MODEL)) {
    payload.thinking = { type: "disabled" };
    payload.output_config = { effort: "low" };
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("interview turn failed", r.status, detail.slice(0, 400));
      res.status(502).json({ error: "The interviewer could not respond just now. Please try again." });
      return;
    }
    const data = await r.json();
    const reply = (data.content || [])
      .filter((b) => b && b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    res.status(200).json({ reply: reply || "Sorry, could you say that once more?" });
  } catch (e) {
    console.error("interview error", e);
    res.status(502).json({ error: "The interviewer could not be reached. Please try again." });
  }
}
