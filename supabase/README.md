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

## 1b. Protect the AI interview (server-enforced credits)

The AI interview costs real money per turn, so it must not be runnable for
free by calling `/api/interview` directly. The protection is server-side and
**fail-safe**: it does nothing until you set the secrets below, so the app
keeps working exactly as before until you deploy it.

How it works once deployed:

1. `credits` is a real column on `entitlements` (added by `schema.sql`), plus
   two service-role-only RPCs, `spend_credits` and `add_credits`. A signed-in
   browser can neither read another user's balance nor change any balance.
2. When you start an interview, the client calls
   [`../api/interview-start.js`](../api/interview-start.js). It verifies your
   Supabase login, charges the interview cost with `spend_credits`, and returns
   a short-lived HMAC token. The master account (`ishambari1@gmail.com`) and
   demo mode (no `ANTHROPIC_API_KEY`) are never charged.
3. [`../api/interview.js`](../api/interview.js) requires that token on every
   turn. With no valid token it returns `402` and never calls the paid model,
   so the endpoint cannot be used for free.
4. [`../api/verify.js`](../api/verify.js) tops up the server ledger with
   `add_credits` when a credit purchase is confirmed, so paid credits are the
   ones the interview actually spends.

Set in **Vercel** (server only, never `VITE_`-prefixed):

```
INTERVIEW_SECRET=<a long random string>   # signs the interview session token
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server only
```

Generate the secret with e.g. `openssl rand -hex 32`. Until `INTERVIEW_SECRET`
is set, `/api/interview-start` reports `not_configured` and the client falls
back to charging its local credit balance, and `/api/interview` skips the token
check, so nothing breaks before you deploy. After deploying, re-run
`schema.sql` (it is idempotent) so the `credits` column and the RPCs exist.

Honest limit: a leaked token is valid for its 30-minute window, so it is worth
at most a few extra turns of one interview, never free unlimited access.
Tightening that to one-token-per-interview would need a shared store (Vercel
KV / Upstash); the current design already stops the "call it for free" hole,
which is the expensive one.

## 2. Deploy the Stripe webhook (no command line needed)

The webhook is now a Vercel serverless function,
[`../api/stripe-webhook.js`](../api/stripe-webhook.js), so it **deploys
automatically with the app** — there is nothing to run from a terminal. It
verifies the Stripe signature and writes `active = true` into `entitlements`.
It only grants full access for the £25 unlock: the grant is gated on
`amount_total >= 2000` pence, so credit-pack purchases (£1.49 / £5.99 /
£14.99) do not unlock the whole app. Those go through `/api/checkout` +
`/api/verify` and top up credits instead.

Set-up is all point-and-click:

1. In **Vercel**, you already have `STRIPE_SECRET_KEY`, `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`. You only need to add one more after step 2:
   `STRIPE_WEBHOOK_SECRET` (the signing secret Stripe gives you).
2. In the **Stripe dashboard** → Developers → **Webhooks** → **Add endpoint**:
   - Endpoint URL: `https://YOUR-DOMAIN/api/stripe-webhook`
   - Events to send: **`checkout.session.completed`**
   - After creating it, click **Reveal** under "Signing secret" and copy the
     `whsec_...` value.
3. Back in **Vercel**, add `STRIPE_WEBHOOK_SECRET` = that `whsec_...` value
   (server only, never `VITE_`-prefixed), then **redeploy**.

Send a test event from the Stripe webhook page (or make a real £25 purchase)
and confirm the buyer's `entitlements` row flips to `active = true`.

> The old Deno Edge Function under `functions/stripe-webhook/` is kept for
> reference only; you do not need to deploy it. The Vercel function above is
> the live one.

### Closing the client-side unlock fallbacks

With the webhook live, unlock is fully server-enforced. The app no longer
trusts the `?checkout=success` URL, has no local "unlock" button that grants
access, and the free trial is granted only by `/api/trial` (no local
fallback). The only ways to get full access are: a real payment (webhook),
the master account (`ishambari1@gmail.com`, by verified email), or an active
server-granted trial (which carries no AI credits).

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
