/* Recover a locked-out account using a two-factor backup code.
 *
 * When a user has the authenticator (TOTP) turned on but has lost their phone,
 * they sign in with their password (which gives an aal1 session) and then send
 * one of their saved backup codes here. We verify the code, mark it used, and
 * remove their authenticator factor(s) with the admin API so they can get back
 * in with their password alone. The app then prompts them to set 2FA up again.
 *
 *   SUPABASE_URL                your project URL
 *   SUPABASE_SERVICE_ROLE_KEY   server-only key; never exposed to the browser
 *
 * POST { code: "XXXX-XXXX" }  (Bearer access token required)  -> { ok }
 */
import crypto from "crypto";

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

/* Accept the code however the user typed it: trim, upper-case, and keep only
   the code characters so spaces or a missing dash still match. */
function normalise(code) {
  const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length < 8) return "";
  return clean.slice(0, 4) + "-" + clean.slice(4, 8);
}

async function sb(path, key, url, opts = {}) {
  const r = await fetch(url + "/rest/v1/" + path, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
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
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { res.status(503).json({ ok: false, reason: "not_configured" }); return; }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) { res.status(401).json({ ok: false, reason: "not_signed_in" }); return; }

  try {
    const who = await fetch(url + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + token } });
    const user = await who.json().catch(() => null);
    const uid = user && user.id ? user.id : "";
    if (!who.ok || !uid) { res.status(401).json({ ok: false, reason: "not_signed_in" }); return; }

    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const code = normalise(body && body.code);
    if (!code) { res.status(400).json({ ok: false, reason: "bad_code" }); return; }

    /* Find an unused code for this user whose hash matches. */
    const hash = hashCode(code);
    const rows = await sb(`mfa_backup_codes?user_id=eq.${uid}&used=eq.false&code_hash=eq.${hash}&select=id`, key, url, { method: "GET" });
    if (!rows.ok || !Array.isArray(rows.body) || rows.body.length === 0) {
      res.status(200).json({ ok: false, reason: "invalid_code" });
      return;
    }

    /* Burn the code so it cannot be reused. */
    await sb(`mfa_backup_codes?id=eq.${rows.body[0].id}`, key, url, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ used: true }) });

    /* Remove the user's authenticator factor(s) so their password alone gets
       them back in; they will be asked to set 2FA up again. */
    const list = await fetch(url + `/auth/v1/admin/users/${uid}/factors`, { headers: { apikey: key, Authorization: "Bearer " + key } });
    const factors = await list.json().catch(() => null);
    const arr = Array.isArray(factors) ? factors : (factors && Array.isArray(factors.factors) ? factors.factors : []);
    for (const f of arr) {
      if (f && f.id) {
        await fetch(url + `/auth/v1/admin/users/${uid}/factors/${f.id}`, { method: "DELETE", headers: { apikey: key, Authorization: "Bearer " + key } });
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("mfa-recover error", e);
    res.status(502).json({ ok: false, reason: "error" });
  }
}
