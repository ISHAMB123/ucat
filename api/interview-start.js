/* Authorises one AI interview, server-side, so it cannot be run for free.
 *
 * The browser cannot be trusted to charge itself: anyone could call
 * /api/interview directly and skip the client's credit check. This endpoint
 * closes that hole. It:
 *   1. verifies the caller's Supabase login (so the email cannot be spoofed),
 *   2. charges the interview cost against the server-side credit ledger
 *      (the master account and, of course, is never charged), and
 *   3. issues a short-lived, HMAC-signed token that /api/interview requires.
 *
 * Environment (all set in Vercel, never VITE_-prefixed / never in the browser):
 *   INTERVIEW_SECRET            secret used to sign the session token. When
 *                               unset, this endpoint reports not_configured and
 *                               the client falls back to its local credit
 *                               charge, so the app keeps working before deploy.
 *   SUPABASE_URL                your project URL (used to verify the login and
 *                               to spend credits with the service role)
 *   SUPABASE_SERVICE_ROLE_KEY   server-only key; NEVER expose to the browser
 *
 * The token is only proof that the cost was paid; it does not carry any secret
 * of the user's. It expires quickly, so a leaked token is worth at most a few
 * extra turns of one interview, never free unlimited access.
 */
import crypto from "crypto";

const INTERVIEW_COST = 50;
const MASTER_EMAIL = "ishambari1@gmail.com";
const TOKEN_TTL_MS = 30 * 60 * 1000; // one interview comfortably fits in 30 min

function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return body + "." + mac;
}

async function sb(path, key, url, opts = {}) {
  const r = await fetch(url + "/rest/v1/" + path, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const body = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, reason: "method" });
    return;
  }

  const secret = process.env.INTERVIEW_SECRET;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  /* Fail-safe: with no secret (or no backend) there is nothing to enforce, so
     tell the client to fall back to its local credit charge. /api/interview
     likewise skips the token check when INTERVIEW_SECRET is unset, so the app
     behaves exactly as before until the owner deploys these three secrets. */
  if (!secret || !url || !key) {
    res.status(200).json({ ok: false, reason: "not_configured" });
    return;
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) { res.status(401).json({ ok: false, reason: "not_signed_in" }); return; }

  try {
    /* Verify the login with Supabase and learn the real email. */
    const who = await fetch(url + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + token } });
    const user = await who.json().catch(() => null);
    const email = user && user.email ? String(user.email).toLowerCase() : "";
    if (!who.ok || !email) { res.status(401).json({ ok: false, reason: "not_signed_in" }); return; }

    /* The master (owner) account is never charged; it exists only for testing.
       Demo mode (no ANTHROPIC_API_KEY) is a free trial of the flow, so it is
       never charged either, even with this backend deployed. */
    const isMaster = email === MASTER_EMAIL;
    const demo = !process.env.ANTHROPIC_API_KEY;
    let remaining = -1;

    if (!isMaster && !demo) {
      /* Charge the cost atomically. spend_credits returns -1 (and changes
         nothing) when the balance is short. */
      const spent = await sb("rpc/spend_credits", key, url, {
        method: "POST",
        body: JSON.stringify({ p_email: email, p_amount: INTERVIEW_COST }),
      });
      remaining = typeof spent.body === "number" ? spent.body : -1;
      if (!spent.ok || remaining < 0) {
        res.status(200).json({ ok: false, reason: "insufficient" });
        return;
      }
    }

    const now = Date.now();
    const sessionToken = signToken({ sub: email, iat: now, exp: now + TOKEN_TTL_MS, m: isMaster ? 1 : 0 }, secret);
    res.status(200).json({ ok: true, token: sessionToken, credits: isMaster ? -1 : remaining, master: isMaster });
  } catch (e) {
    console.error("interview-start error", e);
    res.status(502).json({ ok: false, reason: "error" });
  }
}
