/* Stripe webhook -> Supabase entitlement, hosted on Vercel.
 *
 * This is the piece that makes a payment real. After a successful checkout,
 * Stripe calls this endpoint server-to-server. We verify Stripe's signature
 * (so the call cannot be faked), and for the full-access purchase we write
 * active = true into the entitlements table with the service role. The browser
 * never touches this, so unlock cannot be forged client-side.
 *
 * Unlike the old Supabase Edge Function version, this deploys automatically
 * with the app (it is just a file in /api), so there is no command line to run.
 *
 * Environment (set in Vercel, server only, never VITE_-prefixed):
 *   STRIPE_SECRET_KEY           your Stripe secret key (already set)
 *   STRIPE_WEBHOOK_SECRET       the "Signing secret" (whsec_...) from the
 *                               webhook you add in the Stripe dashboard
 *   SUPABASE_URL                your project URL (already set)
 *   SUPABASE_SERVICE_ROLE_KEY   server-only key (already set)
 *
 * In the Stripe dashboard, add an endpoint pointing at
 *   https://YOUR-DOMAIN/api/stripe-webhook
 * and subscribe to the event "checkout.session.completed".
 */
import crypto from "crypto";

/* Stripe signs the raw request body, so we must read it unparsed. */
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

/* Verify Stripe's "stripe-signature" header:  t=timestamp,v1=hexmac
   signed payload is `${t}.${rawBody}`, HMAC-SHA256 with the signing secret.
   Also reject signatures older than five minutes to blunt replay. */
function verifyStripeSignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    String(header).split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody.toString("utf8")}`).digest("hex");
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).send("Method not allowed");
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!webhookSecret || !url || !serviceKey) {
    console.error("stripe-webhook not configured");
    res.status(503).send("not_configured");
    return;
  }

  let raw;
  try { raw = await readRawBody(req); } catch (e) { res.status(400).send("no body"); return; }

  if (!verifyStripeSignature(raw, req.headers["stripe-signature"], webhookSecret)) {
    res.status(400).send("bad signature");
    return;
  }

  let event;
  try { event = JSON.parse(raw.toString("utf8")); } catch (e) { res.status(400).send("bad json"); return; }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object || {};
      const email = (s.customer_details && s.customer_details.email) || s.customer_email || "";
      const paid = s.payment_status === "paid";
      /* Only the full-access purchase (>= £20) unlocks the app. Credit packs
         (£1.49 / £5.99 / £14.99) are handled by /api/verify and must not grant
         full access, so gate on the amount. */
      const isUnlock = Number(s.amount_total || 0) >= 2000;
      if (email && paid && isUnlock) {
        const r = await fetch(url + "/rest/v1/entitlements", {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: "Bearer " + serviceKey,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            email: String(email).toLowerCase(),
            active: true,
            product: "full_access",
            stripe_customer_id: typeof s.customer === "string" ? s.customer : null,
            stripe_checkout_session_id: s.id || null,
            updated_at: new Date().toISOString(),
          }),
        });
        if (!r.ok) {
          const detail = await r.text().catch(() => "");
          console.error("entitlement upsert failed", r.status, detail.slice(0, 300));
          /* 500 so Stripe retries delivery later. */
          res.status(500).send("db error");
          return;
        }
      }
    }
    res.status(200).json({ received: true });
  } catch (e) {
    console.error("stripe-webhook handler error", e);
    res.status(500).send("handler error");
  }
}
