/* Serverless endpoint for the "Report a problem" form.
 *
 * The destination address and the mail-provider key live only in
 * environment variables, so they are never shipped to the browser or
 * committed to the repo:
 *   REPORT_TO       the inbox reports are delivered to
 *   RESEND_API_KEY  an API key from https://resend.com (free tier is plenty)
 *
 * With Resend's onboarding sender you can deliver to your own account
 * email without verifying a domain, so setup is just those two variables.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.REPORT_TO;
  if (!key || !to) {
    res.status(503).json({ error: "Reporting is not set up yet. Please try again later." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const message = String(body.message || "").slice(0, 5000).trim();
  const from = String(body.from || "").slice(0, 200).trim();
  const url = String(body.url || "").slice(0, 500).trim();
  if (!message) {
    res.status(400).json({ error: "Please describe the problem." });
    return;
  }

  const validReply = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from) ? from : "";
  const text =
    "New problem report from the Tempo website:\n\n" +
    message +
    "\n\n---\n" +
    "Reply to: " + (validReply || "(not provided)") + "\n" +
    "Page: " + (url || "(unknown)") + "\n" +
    "Time: " + new Date().toISOString();

  const payload = {
    from: "Tempo reports <onboarding@resend.dev>",
    to: [to],
    subject: "Tempo: problem report",
    text: text,
  };
  if (validReply) payload.reply_to = validReply;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("report send failed", r.status, detail);
      res.status(502).json({ error: "Could not send right now. Please try again later." });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("report send error", e);
    res.status(502).json({ error: "Could not send right now. Please try again later." });
  }
}
