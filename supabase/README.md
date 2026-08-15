# Tempo backend (Supabase)

This turns payment and the leaderboard from "trust the browser" into
server-enforced. The client is now wired to it (step 3), so once you run
the SQL and deploy the webhook below, entitlement becomes the real unlock.
Until then the app keeps running in its local-only mode.

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
- **`trials`** — one free trial per email and (softly) per network. Written
  only by the `/api/trial` function; never readable by clients.

## 1a. Free trial (email + IP soft-block)

The 1-day free trial is granted by [`../api/trial.js`](../api/trial.js) (a
Vercel serverless function, deployed automatically with the app). It verifies
the signed-in user, records a row in `trials`, and writes a time-limited
`entitlements` row (`product = 'trial'`, `expires_at` 24h out). The trial
unlocks the app but grants **no credits**, so the paid AI features still need a
purchase — nothing a trial user does can run up an AI cost.

It needs the same two server secrets as the webhook, set in **Vercel** (not in
the browser, never `VITE_`-prefixed):

```
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # server only
```

Anti-abuse controls, strongest first:
- **One trial per verified email** (always on).
- **One trial per IP, ever** (not a rolling window).
- **One trial per device fingerprint** — a hash of coarse browser/screen
  traits, sent by the client, so clearing storage or using a new email on the
  same machine does not mint another trial.
- **VPN / proxy / Tor block** — OFF unless you set an `IPQS_KEY`
  (an IPQualityScore API key) in Vercel. Reliable VPN detection needs a paid
  provider, and a blunt block also refuses legitimate users on privacy or
  shared networks, so it is opt-in and fails open on any provider error.

Legal note (important, since many users are under 18): storing the IP and a
device fingerprint, and sending the IP to IPQualityScore, are all uses of
personal data that **must be disclosed in the privacy policy**, with
IPQualityScore named as a processor. Fingerprinting under UK PECR/GDPR and the
Age Appropriate Design Code needs a lawful basis; keep it strictly to trial
abuse prevention. None of these stops a determined abuser (new device + new
email + no VPN), so treat them as friction, not a wall.

Local fallback: if the trial backend is not deployed (no service-role key), the
app grants a **local** one-day trial so the code still works — but that path is
farmable and applies none of the limits above. Deploy the backend to make the
limits real.

## 2. Deploy the Stripe webhook

[`functions/stripe-webhook/index.ts`](./functions/stripe-webhook/index.ts)
verifies the Stripe signature and writes `active = true` into
`entitlements`. It only grants full access for the £25 unlock: the grant is
gated on `amount_total >= 2000` pence, so credit-pack purchases (£1.49 /
£5.99 / £14.99) do not unlock the whole app. Those go through
`/api/checkout` + `/api/verify` and top up credits instead.

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

## 3. Wire the client (done)

This is already implemented. `supabaseClient.js` exposes `getEntitlement()`,
and `UcatDrillTrainer` calls it after `getSession()` and on every
`onAuthStateChange`, unlocking when the row is active:

```js
const ent = await getEntitlement();
if (ent?.active) { setUnlocked(true); setJSON("ucat:unlocked", true); }
```

`?checkout=success` and the `UCAT18` access code are deliberately kept as a
fallback so unlock keeps working before the webhook is confirmed live in
production. Once you have verified a real £25 purchase flips the
`entitlements` row and the app unlocks on next sign-in, you can remove them:
entitlement then becomes the single source of truth, and it cannot be forged
from the browser because the anon key is bound by Row Level Security.

## Why this order

- The **entitlements** table + webhook is the real payment fix. Ship it
  first.
- The **scores** migration is a quality upgrade for the leaderboard; it can
  follow, since the current `kv` board still works.
