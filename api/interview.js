/* Serverless endpoint for the live interview simulator.
 *
 * The browser holds no model key. It POSTs the running conversation here;
 * this function adds the interviewer's brief and relays a single short turn
 * to the Anthropic API, then hands back the interviewer's reply. The key
 * lives only in an environment variable:
 *   ANTHROPIC_API_KEY   a key from https://platform.claude.com
 *   INTERVIEW_MODEL     optional model id (defaults to claude-opus-5;
 *                       set to claude-sonnet-5 or claude-haiku-4-5 to cut cost)
 *
 * Everything the interviewer says is generated fresh. It is told never to
 * reproduce any real university's questions, matching the rest of the app.
 */
const MODEL = process.env.INTERVIEW_MODEL || "claude-opus-5";

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
Keep the whole debrief under 200 words, warm and direct. Do not ask any more questions after the debrief.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(503).json({ error: "The interviewer is not switched on yet. Please try again later." });
    return;
  }

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

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        system: brief(track, format),
        messages,
      }),
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
