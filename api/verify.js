/* Confirms a completed Stripe Checkout session and reports how many credits
 * were bought. The app calls this after Stripe redirects the buyer back, so
 * the credit grant only happens once Stripe itself says the payment landed,
 * not merely because someone reached the success URL.
 *   STRIPE_SECRET_KEY   your secret key from https://dashboard.stripe.com
 *
 * The session id is a long unguessable token, and payment_status is checked
 * against Stripe directly, so the return URL cannot be forged to mint free
 * credits.
 *
 * When the Supabase backend is configured and the buyer sends their login, the
 * purchased credits are also written to the server-side ledger (the credits
 * column of entitlements) with the service role, so /api/interview-start can
 * spend them. The response still returns the credit count for the client's
 * local display; the server ledger is the one the interview actually enforces.
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   optional; server only, never VITE_
 */

/* Best-effort: attribute the purchased credits to the signed-in buyer in the
   server ledger. Verifies the login so the email cannot be spoofed, then calls
   the add_credits RPC with the service role. Fails silently (returns without
   throwing) when the backend is not configured or the caller is not signed in,
   so purchase confirmation never breaks. */
async function grantServerCredits(req, credits) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !credits) return;
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return;
  try {
    const who = await fetch(url + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + token } });
    const user = await who.json().catch(() => null);
    const email = user && user.email ? String(user.email).toLowerCase() : "";
    if (!who.ok || !email) return;
    await fetch(url + "/rest/v1/rpc/add_credits", {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_email: email, p_amount: credits }),
    });
  } catch (e) {
    console.error("verify grant error", e);
  }
}

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
      /* Sessions created by /api/checkout carry the credit count in metadata.
         Sessions from a hosted Payment Link do not, so fall back to mapping the
         amount paid (in pence) to the pack it corresponds to. */
      const byAmount = { 149: 50, 599: 250, 1499: 800 };
      let credits = Number(data.metadata && data.metadata.credits) || 0;
      if (!credits) credits = byAmount[data.amount_total] || 0;
      /* Also record the credits in the server ledger for the signed-in buyer,
         so the AI interview (which now enforces credits server-side) can spend
         them. Best-effort and non-blocking to the client's own top-up. */
      await grantServerCredits(req, credits);
      res.status(200).json({ ok: true, credits });
      return;
    }
    res.status(200).json({ ok: false });
  } catch (e) {
    console.error("verify error", e);
    res.status(502).json({ error: "Could not confirm the payment." });
  }
}
