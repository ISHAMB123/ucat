# Tempo

A UCAT skills trainer and a medicine and dentistry admissions toolkit. Times
tables are free; everything else unlocks with one payment. This guide is
written for the owner, not for a developer. Where a step genuinely needs
someone technical, it says so.

---

## What to do before you charge anyone

Do these three first. The rest can follow.

1. **Fill in your legal details.** Open `legalContent.js` and edit the block at
   the top called `LEGAL_CONFIG`: your name (or trading name), a contact email,
   and today's date. Until you do, the Legal page shows a note reminding you.
2. **Get a solicitor to read the policies.** The privacy policy, terms and
   disclaimer are drafts. A UK solicitor should check them before the first
   payment. Also check whether you need to register with the ICO (about £52 a
   year) using the ICO's own online self-assessment.
3. **Test it on a real phone.** Deploy it (below), then on your phone: do a
   drill, refresh the page, and confirm your score is still there. Open the
   Unis, Interview, Statement and Legal pages and check they load. This is the
   one thing only you can do, because the app has to run in a real browser.

---

## How to put it online (no coding)

The easiest free option is **Vercel**.

1. Make a free account at vercel.com and connect your GitHub.
2. Click **Add New → Project**, pick this repository.
3. Vercel detects the settings automatically (build command `npm run build`,
   output folder `dist`). Click **Deploy**.
4. When it finishes you get a live link like `your-app.vercel.app`. You can add
   your own domain later in the Vercel dashboard.

Netlify works the same way if you prefer it.

### The settings (environment variables)

In the Vercel dashboard, open your project, go to **Settings → Environment
Variables**, and add these. They are safe to store there.

| Name | What it is |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `VITE_STRIPE_LINK` | Your Stripe Payment Link (leave empty until you have one) |

After adding or changing these, click **Redeploy** so they take effect.

---

## Accounts and progress (Supabase)

Sign-in and the shared weekly leaderboard use Supabase, which is already wired
up. If you set up a new Supabase project, you need to:

1. In Supabase, open **SQL Editor**, paste this, and run it (creates the table
   the leaderboard uses):

   ```sql
   create table if not exists public.kv (
     key text primary key,
     value text,
     updated_at timestamptz default now()
   );
   alter table public.kv enable row level security;
   create policy "kv read"   on public.kv for select using (true);
   create policy "kv insert" on public.kv for insert with check (true);
   create policy "kv update" on public.kv for update using (true) with check (true);
   ```

2. **Authentication → Providers → Email** is on by default. If you want signup
   to log people in instantly while testing, turn **Confirm email** off;
   otherwise users confirm by email first.

If Supabase is not configured, the app still works: progress saves in the
person's own browser and the leaderboard is per-device, and the wording changes
to say so honestly.

---

## Payments (Stripe)

1. In Stripe, create a **Payment Link** for £25.
2. Put it in the `VITE_STRIPE_LINK` setting (above) and redeploy.
3. The "Unlock everything" button now opens Stripe checkout.

**Important, and this needs a developer.** A Payment Link lets people pay, but
the app cannot automatically unlock them afterwards on its own. That last step
needs a small piece of server code (a Stripe webhook that marks the account as
paid in Supabase). Until that exists, unlock is manual: the access code
`UCAT25`, or you mark a buyer as unlocked yourself. Ask a developer to add the
webhook when you are ready; it is a well-defined, contained job.

---

## Keeping it accurate each year

University cut-offs, fees and ATARs go out of date every cycle. When you
re-check them, update the dates in one place: the `DATA_CHECKED` block near the
top of the university data in `data/universities.js`. The app shows those dates
to users automatically.

---

## What still needs a developer later

None of these block launch, but they make it better:

- **Auto-unlock after payment** (the Stripe webhook above).
- **Full account deletion on the server.** Today "Delete my data" wipes the
  device and signs the person out; the privacy policy gives an email route for
  full erasure within 30 days, which is legally enough. A one-click server
  version needs a small Supabase Edge Function.
- **Deleting accounts inactive for 24 months**, as the privacy policy promises.
  That is a scheduled server job.
- A social preview image (`og:image`) so shared links show a picture, not just
  text.

---

## Security

`vercel.json` sets security headers on every response: it stops the site being
framed by other sites (clickjacking), stops content-type sniffing, limits which
outside services the page may talk to (your own domain, Supabase and Google
Fonts), forces HTTPS, and allows the microphone only for dictation. These are
safe defaults and need no maintenance.

One caveat, because I could not test the deployed site from here: if after
deploying the app looks **unstyled or the fonts do not load**, the
Content-Security-Policy is the likely cause. Remove just the
`Content-Security-Policy` line from `vercel.json` and redeploy; the other
headers still apply. On Netlify, put the same headers in a `_headers` file
instead of `vercel.json`.

**Leaderboard, please tighten this.** The `kv` table SQL earlier lets anyone
read and overwrite any row, which means the leaderboard can be tampered with. It
is fine for launch, but for a tamper-resistant board a developer should switch
to a `scores` table that only allows inserting and reading rows (no update or
delete for the public key), so no one can wipe or edit other people's scores.
This pairs with the payment webhook work.

## For a developer

The app is Vite + React. The main screen logic is in `ucat-drill-trainer.jsx`;
supporting modules are split out:

- `styles.js`, `utils.js` — stylesheet and shared helpers (seeded RNG, pickers).
- `storage.js` — storage adapter: Supabase-aware, localStorage, then in-memory,
  never throws. `supabaseClient.js` wires Supabase from the env vars.
- `data/` — all content: `vr`, `sjt`, `dm`, `universities`, `interview`,
  `statement`.
- `engine/marking.js` — the automated writing marking (fixed rules, no AI, runs
  on-device).
- `components/ui.jsx` — shared leaf components.
- `legalContent.js` — all policy copy and consent labels.

Commands:

```
npm install      # once
npm run dev      # run locally at http://localhost:5173
npm run build    # production build into dist/
npm test         # run the test suite
npm run lint     # catch undefined references (missing imports)
```

Tests check that every generated question's answer is a real option, that mock
evidence appears verbatim in its passage, that no component name is duplicated,
and that the app mounts. Keep them green.
