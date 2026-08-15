/* Backup (recovery) codes for the optional authenticator-app two-factor login.
 *
 * Supabase handles the authenticator (TOTP) itself; this endpoint issues the
 * one-time backup codes a user saves in case they lose their phone. Codes are
 * shown to the user exactly once (here, in the response) and stored only as
 * SHA-256 hashes, so even a database leak never reveals a usable code.
 *
 *   SUPABASE_URL                your project URL
 *   SUPABASE_SERVICE_ROLE_KEY   server-only key; never exposed to the browser
 *
 * POST { action: "generate" }  -> { ok, codes: [...] }   (replaces any old set)
 * POST { action: "status" }    -> { ok, remaining: n }
 * The caller must send their Supabase access token as a Bearer header; we verify
 * it to learn the real user id, so one user cannot touch another's codes.
 */
import crypto from "crypto";

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

/* Human-friendly, unambiguous codes: two groups of four from an alphabet with
   no 0/O/1/I/L so they are easy to write down and read back. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode() {
  const pick = () => ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  const group = () => Array.from({ length: 4 }, pick).join("");
  return `${group()}-${group()}`;
}

async function sb(path, key, url, opts = {}) {
  const r = await fetch(url + "/rest/v1/" + path, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=minimal",
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
    const action = (body && body.action) || "generate";

    if (action === "status") {
      const rows = await sb(`mfa_backup_codes?user_id=eq.${uid}&used=eq.false&select=id`, key, url, { method: "GET", prefer: "return=representation" });
      const remaining = Array.isArray(rows.body) ? rows.body.length : 0;
      res.status(200).json({ ok: true, remaining });
      return;
    }

    /* generate (also used to regenerate): wipe the old set and issue a fresh one. */
    await sb(`mfa_backup_codes?user_id=eq.${uid}`, key, url, { method: "DELETE" });
    const codes = Array.from({ length: 10 }, makeCode);
    const rows = codes.map((c) => ({ user_id: uid, code_hash: hashCode(c) }));
    const ins = await sb("mfa_backup_codes", key, url, { method: "POST", body: JSON.stringify(rows) });
    if (!ins.ok) { res.status(502).json({ ok: false, reason: "store_failed" }); return; }
    res.status(200).json({ ok: true, codes });
  } catch (e) {
    console.error("mfa-backup error", e);
    res.status(502).json({ ok: false, reason: "error" });
  }
}
