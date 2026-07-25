# Tempo backend (Supabase)

This is the groundwork for turning payment and the leaderboard from
"trust the browser" into server-enforced. None of it is wired into the
client yet, so the app keeps running in its local-only mode until you
deploy this and connect it. Do this when you have Stripe access.

## 1. Create the tables

Open the Supabase SQL editor and run [`schema.sql`](./schema.sql). It creates:

- **`entitlements`** — who has paid. Written only by the webhook (service
  role); a signed-in user can read only their own row. This is what unlock
  should check instead of a client flag or access code.
- **`kv`** — the key/value store the app already uses for weekly boards,
  now with Row Level Security (public read, leaderboard-key writes only for
  signed-in users).
- **`scores`** — the recommended per-row leaderboard to migrate to, so one
  user cannot overwrite another's score.

## 2. Deploy the Stripe webhook

[`functions/stripe-webhook/index.ts`](./functions/stripe-webhook/index.ts)
verifies the Stripe signature and writes `active = true` into
`entitlements`.

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_URL=https://YOURPROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server only, never in the browser
```

Then in the Stripe dashboard add a webhook endpoint at
`https://YOURPROJECT.functions.supabase.co/stripe-webhook` and subscribe to
`checkout.session.completed`.

## 3. Wire the client (the last step)

`supabaseClient.js` already exposes `getEntitlement()`. After a user signs
in, call it and unlock when it returns active:

```js
import { getEntitlement } from "./supabaseClient.js";
// after auth:
const ent = await getEntitlement();
if (ent?.active) unlock();
```

Once this is live, the `?checkout=success` client unlock and the `UCAT18`
access code can be removed: entitlement becomes the single source of truth,
and it cannot be forged from the browser because the anon key is bound by
Row Level Security.

## Why this order

- The **entitlements** table + webhook is the real payment fix. Ship it
  first.
- The **scores** migration is a quality upgrade for the leaderboard; it can
  follow, since the current `kv` board still works.
