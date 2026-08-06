/* Confirms a completed Stripe Checkout session and reports how many credits
 * were bought. The app calls this after Stripe redirects the buyer back, so
 * the credit grant only happens once Stripe itself says the payment landed,
 * not merely because someone reached the success URL.
 *   STRIPE_SECRET_KEY   your secret key from https://dashboard.stripe.com
 *
 * The session id is a long unguessable token, and payment_status is checked
 * against Stripe directly, so the return URL cannot be forged to mint free
 * credits. Credits are stored per device, so treat this as a lightweight
 * top-up rather than a full ledger until a user backend exists.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(503).json({ error: "not_configured" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const id = String((body && body.session_id) || "").trim();
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) {
    res.status(400).json({ error: "Bad session." });
    return;
  }

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(id), {
      headers: { Authorization: "Bearer " + key },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.status(502).json({ error: "Could not confirm the payment." });
      return;
    }
    if (data.payment_status === "paid") {
      const credits = Number(data.metadata && data.metadata.credits) || 0;
      res.status(200).json({ ok: true, credits });
      return;
    }
    res.status(200).json({ ok: false });
  } catch (e) {
    console.error("verify error", e);
    res.status(502).json({ error: "Could not confirm the payment." });
  }
}
