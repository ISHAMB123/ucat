-- ============================================================================
--  Tempo backend schema (Supabase / Postgres)
--
--  Run this in the Supabase SQL editor (or via the CLI) once. It sets up:
--    1. entitlements  -- who has paid; written ONLY by the Stripe webhook
--    2. kv            -- the current leaderboard store the app already uses
--    3. scores        -- the recommended per-row leaderboard to migrate to
--
--  Everything is protected by Row Level Security, so the public anon key
--  that ships in the browser cannot be used to forge access or scores.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENTITLEMENTS  --  the source of truth for "has this person paid"
--
--    Keyed by email because a Stripe Payment Link gives us the buyer's email
--    at checkout, before they necessarily have a Supabase user id. The webhook
--    (service role) upserts rows here; clients may only READ their own row,
--    matched on the email in their signed-in JWT. No client can ever write,
--    so unlock can no longer be forged from the browser.
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  email                       text primary key,
  active                      boolean not null default false,
  product                     text not null default 'full_access',
  expires_at                  timestamptz,               -- set only for time-limited trials; null = never expires
  stripe_customer_id          text,
  stripe_checkout_session_id  text,
  updated_at                  timestamptz not null default now()
);

-- If the table pre-dates the trial feature, add the expiry column in place.
alter table public.entitlements add column if not exists expires_at timestamptz;

alter table public.entitlements enable row level security;

-- A signed-in user can read only the row for their own email.
drop policy if exists "read own entitlement" on public.entitlements;
create policy "read own entitlement" on public.entitlements
  for select
  to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- No insert/update/delete policies exist, so anon and authenticated clients
-- are denied all writes. Only the service role (the webhook and the trial
-- function) can write.

-- ---------------------------------------------------------------------------
-- 1b. TRIALS  --  one free trial per email and (softly) per network
--
--    Written only by the service role (the /api/trial serverless function),
--    which verifies the signed-in user before recording a trial and granting a
--    time-limited entitlement. Never readable or writable by clients: the IP is
--    kept only to rate-limit abuse and must be covered by the privacy policy.
-- ---------------------------------------------------------------------------
create table if not exists public.trials (
  email       text primary key,
  ip          text,
  fingerprint text,
  started_at  timestamptz not null default now()
);

-- If the table pre-dates device fingerprinting, add the column in place.
alter table public.trials add column if not exists fingerprint text;

create index if not exists trials_ip_idx on public.trials (ip);
create index if not exists trials_fingerprint_idx on public.trials (fingerprint);

alter table public.trials enable row level security;
-- No policies: only the service role can touch this table.

-- ---------------------------------------------------------------------------
-- 2. KV  --  the key/value store the app uses today for weekly leaderboards
--
--    Keeps the current app working, but locks writes down: readable by all,
--    writable only by signed-in users and only for leaderboard keys (lb:*).
--    Note the honest limitation: because the app stores the whole board as
--    one JSON blob per key, a signed-in user could still overwrite the blob.
--    The `scores` table below is the real fix; migrate to it when ready.
-- ---------------------------------------------------------------------------
create table if not exists public.kv (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

alter table public.kv enable row level security;

drop policy if exists "kv public read" on public.kv;
create policy "kv public read" on public.kv
  for select using (true);

drop policy if exists "kv write leaderboard only" on public.kv;
create policy "kv write leaderboard only" on public.kv
  for insert to authenticated with check (key like 'lb:%');

drop policy if exists "kv update leaderboard only" on public.kv;
create policy "kv update leaderboard only" on public.kv
  for update to authenticated using (key like 'lb:%') with check (key like 'lb:%');

-- ---------------------------------------------------------------------------
-- 3. SCORES  --  recommended per-row leaderboard (migration target)
--
--    One row per user per mock, so nobody can overwrite anyone else's score.
--    Readable by all (the board is public), writable only for your own row.
--    Keep a user's best by upserting on the unique (mock_key, user_id).
-- ---------------------------------------------------------------------------
create table if not exists public.scores (
  id            bigint generated always as identity primary key,
  mock_key      text not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text not null,
  pct           int  not null check (pct between 0 and 100),
  created_at    timestamptz not null default now(),
  unique (mock_key, user_id)
);

create index if not exists scores_mock_key_idx on public.scores (mock_key, pct desc);

alter table public.scores enable row level security;

drop policy if exists "scores public read" on public.scores;
create policy "scores public read" on public.scores
  for select using (true);

drop policy if exists "scores insert own" on public.scores;
create policy "scores insert own" on public.scores
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "scores update own" on public.scores;
create policy "scores update own" on public.scores
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
