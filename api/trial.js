/* One-day free trial, granted server-side so it cannot be forged in the
 * browser, and soft-limited to one per email and one per network so it is not
 * trivially farmed.
 *
 *   SUPABASE_URL                 your project URL
 *   SUPABASE_SERVICE_ROLE_KEY    server-only key; NEVER expose to the browser
 *
 * How it works: the client sends its Supabase access token. We verify it with
 * Supabase to learn the real signed-in email (so the caller cannot claim to be
 * someone else), read the request IP, and check the trials table. If neither
 * the email nor the IP has started a trial, we record one and write a
 * time-limited entitlement (product "trial", active, expires in 24h). The
 * trial grants app access but no credits, so the paid AI features still need a
 * purchase.
 *
 * Privacy note: the IP is stored only to rate-limit trial abuse and should be
 * covered by the privacy policy. It is a soft signal; shared networks (a
 * school, a family) share an IP, so a blocked repeat may be a different person.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "";
}

/* Optional VPN / proxy / Tor block. Only runs when IPQS_KEY (an
   IPQualityScore API key) is set; otherwise skipped, because reliable VPN
   detection needs a paid data provider and a blunt block would also lock out
   legitimate users on shared or privacy networks. Fails open on any error so a
   provider outage never blocks real students. Returns true if the IP looks
   like a VPN/proxy and should be refused. */
async function looksLikeVpn(ip) {
  const k = process.env.IPQS_KEY;
  if (!k || !ip) return false;
  try {
    const r = await fetch(`https://ipqualityscore.com/api/json/ip/${k}/${encodeURIComponent(ip)}?strictness=1&allow_public_access_points=true`);
    const d = await r.json().catch(() => null);
    if (!d || d.success === false) return false;
    return !!(d.vpn || d.proxy || d.tor || d.active_vpn || d.active_tor);
  } catch (e) { return false; }
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
    /* Verify the token with Supabase and learn the real email. */
    const who = await fetch(url + "/auth/v1/user", { headers: { apikey: key, Authorization: "Bearer " + token } });
    const user = await who.json().catch(() => null);
    const email = user && user.email ? String(user.email).toLowerCase() : "";
    if (!who.ok || !email) { res.status(401).json({ ok: false, reason: "not_signed_in" }); return; }

    const ip = clientIp(req);
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const fingerprint = String((body && body.fingerprint) || "").slice(0, 128);

    /* Already have any entitlement? Then no trial needed / allowed. */
    const ent = await sb(`entitlements?email=eq.${encodeURIComponent(email)}&select=product,expires_at`, key, url, { method: "GET" });
    if (ent.ok && Array.isArray(ent.body) && ent.body.length) {
      res.status(200).json({ ok: false, reason: "already_entitled" });
      return;
    }

    /* Refuse VPNs / proxies when a detection provider is configured. */
    if (await looksLikeVpn(ip)) {
      res.status(200).json({ ok: false, reason: "vpn" });
      return;
    }

    /* One trial per email. */
    const byEmail = await sb(`trials?email=eq.${encodeURIComponent(email)}&select=email`, key, url, { method: "GET" });
    if (byEmail.ok && Array.isArray(byEmail.body) && byEmail.body.length) {
      res.status(200).json({ ok: false, reason: "email_used" });
      return;
    }

    /* One trial per IP, ever (not a rolling window). */
    if (ip) {
      const byIp = await sb(`trials?ip=eq.${encodeURIComponent(ip)}&select=ip`, key, url, { method: "GET" });
      if (byIp.ok && Array.isArray(byIp.body) && byIp.body.length) {
        res.status(200).json({ ok: false, reason: "network_used" });
        return;
      }
    }

    /* One trial per device fingerprint (defeats clearing storage / new email
       on the same machine). */
    if (fingerprint) {
      const byFp = await sb(`trials?fingerprint=eq.${encodeURIComponent(fingerprint)}&select=fingerprint`, key, url, { method: "GET" });
      if (byFp.ok && Array.isArray(byFp.body) && byFp.body.length) {
        res.status(200).json({ ok: false, reason: "device_used" });
        return;
      }
    }

    const now = new Date();
    const expires = new Date(now.getTime() + DAY_MS).toISOString();

    /* Record the trial, then the entitlement. */
    await sb("trials", key, url, { method: "POST", prefer: "return=minimal", body: JSON.stringify({ email, ip, fingerprint: fingerprint || null, started_at: now.toISOString() }) });
    const grant = await sb("entitlements", key, url, {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify({ email, active: true, product: "trial", expires_at: expires, updated_at: now.toISOString() }),
    });
    if (!grant.ok) { res.status(502).json({ ok: false, reason: "grant_failed" }); return; }

    res.status(200).json({ ok: true, expires_at: expires });
  } catch (e) {
    console.error("trial error", e);
    res.status(502).json({ ok: false, reason: "error" });
  }
}
