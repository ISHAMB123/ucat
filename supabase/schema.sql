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

-- The server-side credit balance for the paid AI interview. This is the real
-- ledger: /api/interview-start spends from it and /api/verify tops it up, both
-- with the service role. The browser can no longer mint credits, so the AI
-- interview cannot be run for free. Trials grant 0 credits.
alter table public.entitlements add column if not exists credits int not null default 0;

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
-- 1a. CREDIT LEDGER RPCs  --  the server-enforced spend / top-up for the AI
--     interview. Both are called only by the serverless functions using the
--     service role, never from the browser: execute is revoked from anon and
--     authenticated below, so a signed-in client cannot grant itself credits.
--
--     spend_credits atomically deducts p_amount and returns the remaining
--     balance, or -1 when the balance is insufficient (no row is changed).
--     add_credits tops up (creating the row if needed) and returns the total.
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(p_email text, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int;
begin
  update public.entitlements
     set credits = credits - p_amount, updated_at = now()
   where lower(email) = lower(p_email) and credits >= p_amount
   returning credits into remaining;
  if not found then
    return -1;
  end if;
  return remaining;
end;
$$;

create or replace function public.add_credits(p_email text, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
begin
  insert into public.entitlements (email, credits, updated_at)
       values (lower(p_email), greatest(p_amount, 0), now())
  on conflict (email) do update
       set credits = public.entitlements.credits + greatest(p_amount, 0),
           updated_at = now()
    returning credits into total;
  return total;
end;
$$;

-- Only the service role may run these; deny the public/anon/authenticated roles
-- so credits can never be spent or granted from the browser.
revoke all on function public.spend_credits(text, int) from public;
revoke all on function public.add_credits(text, int) from public;
revoke all on function public.spend_credits(text, int) from anon, authenticated;
revoke all on function public.add_credits(text, int) from anon, authenticated;

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
-- 1c. MFA BACKUP CODES  --  one-time recovery codes for the optional
--     authenticator-app (TOTP) two-factor login. The authenticator itself is
--     handled by Supabase's built-in MFA; these codes are the "lost my phone"
--     fallback. Only the service role touches this table (the /api/mfa-backup
--     and /api/mfa-recover functions): codes are stored as SHA-256 hashes, never
--     in plain text, and are never readable by the browser.
-- ---------------------------------------------------------------------------
create table if not exists public.mfa_backup_codes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  code_hash   text not null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists mfa_backup_user_idx on public.mfa_backup_codes (user_id);

alter table public.mfa_backup_codes enable row level security;
-- No policies: only the service role can read or write these.

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
