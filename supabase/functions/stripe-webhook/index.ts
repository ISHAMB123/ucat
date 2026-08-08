// ============================================================================
//  Stripe webhook -> Supabase entitlement  (Supabase Edge Function, Deno)
//
//  This is the piece that makes payment real: Stripe calls this endpoint
//  after a successful checkout, we verify the signature (so nobody can fake
//  the call), and we write active=true into the entitlements table using the
//  service role key. The browser never touches this table's writes, so unlock
//  can no longer be forged client-side.
//
//  DEPLOY
//    1. supabase functions deploy stripe-webhook --no-verify-jwt
//       (--no-verify-jwt because Stripe calls it, not a signed-in user)
//    2. Set the secrets:
//       supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//       supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//       supabase secrets set SUPABASE_URL=https://xxxx.supabase.co
//       supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...   (server only!)
//    3. In the Stripe dashboard add a webhook endpoint pointing at
//       https://xxxx.functions.supabase.co/stripe-webhook and subscribe to
//       "checkout.session.completed".
//
//  NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser. It bypasses RLS.
// ============================================================================

import Stripe from "https://esm.sh/stripe@16?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    // constructEventAsync is the Deno-safe variant (async crypto).
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return new Response(`bad signature: ${(err as Error).message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const email = s.customer_details?.email ?? s.customer_email;
      // Only the £25 full-access purchase unlocks the app. Credit packs
      // (£1.49 / £5.99 / £14.99, i.e. 149 / 599 / 1499 pence) go through the
      // Checkout + /api/verify path and must NOT grant full access, so gate
      // on the amount: anything at or above £20 is the unlock, nothing below.
      const paid = s.payment_status === "paid";
      const isUnlock = (s.amount_total ?? 0) >= 2000;
      if (email && paid && isUnlock) {
        const { error } = await admin.from("entitlements").upsert(
          {
            email: email.toLowerCase(),
            active: true,
            product: "full_access",
            stripe_customer_id: typeof s.customer === "string" ? s.customer : null,
            stripe_checkout_session_id: s.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" },
        );
        if (error) throw error;
      }
    }
    // Optional: handle refunds/chargebacks to revoke access
    //   charge.refunded / charge.dispute.created -> set active = false
  } catch (err) {
    // 500 so Stripe retries the delivery.
    return new Response(`handler error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
