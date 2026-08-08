/* Text-to-speech proxy for the live interview.
 *
 * Keeps the Fish Audio key server-side and returns MP3 audio the browser can
 * play, so the interviewer can speak in a natural voice. When no key is set
 * it returns 503 and the client falls back to the browser voice, so the
 * interview always speaks.
 *   FISH_API_KEY    from https://fish.audio  (required to enable the voice)
 *   FISH_VOICE_ID   optional reference_id for a specific Fish voice
 *   FISH_MODEL      optional model id, defaults to s1
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const key = process.env.FISH_API_KEY;
  if (!key) {
    res.status(503).json({ error: "not_configured" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const text = String((body && body.text) || "").slice(0, 1500).trim();
  if (!text) {
    res.status(400).json({ error: "No text." });
    return;
  }

  const payload = { text, format: "mp3", mp3_bitrate: 128, normalize: true, latency: "normal" };
  const voice = (body && body.voice) || process.env.FISH_VOICE_ID;
  if (voice) payload.reference_id = String(voice);

  try {
    const r = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        model: process.env.FISH_MODEL || "s1",
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("fish tts failed", r.status, detail.slice(0, 200));
      res.status(502).json({ error: "tts_failed" });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buf);
  } catch (e) {
    console.error("tts error", e);
    res.status(502).json({ error: "tts_failed" });
  }
}
