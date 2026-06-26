-- ============================================================================
-- SuperLedger — Supabase schema + Row-Level Security
-- ============================================================================
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste ALL of this
-- → Run. It's safe to run more than once (uses "if not exists" / "drop policy
-- if exists"). You should see "Success. No rows returned."
--
-- What this creates:
--   private_profile  — one row per user. Sensitive fields are CIPHERTEXT
--                      (encrypted by the app before insert). RLS: owner-only.
--   public_alias     — one row per user. Banded/non-sensitive only. Private by
--                      DEFAULT (is_public = false) per the privacy consult.
--   follows          — alias watchlist.
--
-- The partition: no exact balance/salary/age ever lives in public_alias.
-- ============================================================================

-- ---- PRIVATE ----------------------------------------------------------------
create table if not exists private_profile (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email_hash   text,
  -- Sensitive: stored as base64 ciphertext (see lib/crypto.ts). NOT readable
  -- from a DB dump. Null until the user saves.
  enc_balance  text,
  enc_salary   text,
  enc_age      text,
  -- Non-sensitive preferences: plaintext is fine (still RLS-protected).
  prefs        jsonb default '{}'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ---- PUBLIC-BY-ALIAS --------------------------------------------------------
create table if not exists public_alias (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  alias            text unique not null,
  fund_name        text,
  net_return_band  text,                 -- e.g. 'Top 12%'  (derived from FUND, not balance)
  -- on_track_bucket is intentionally COARSE and optional (re-identification risk;
  -- blueprint 3.3). Stored only if the user opts in.
  on_track_bucket  text,
  -- Private by default. The user must actively flip this to appear on the
  -- leaderboard (lawyer's "active consent" requirement). Never default true.
  is_public        boolean default false,
  updated_at       timestamptz default now()
);

-- ---- FOLLOWS ----------------------------------------------------------------
create table if not exists follows (
  follower_id  uuid references auth.users(id) on delete cascade,
  followed_id  uuid references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, followed_id)
);

-- ============================================================================
-- Row-Level Security — the database-enforced partition
-- ============================================================================
alter table private_profile enable row level security;
alter table public_alias    enable row level security;
alter table follows         enable row level security;

-- PRIVATE: a user can touch ONLY their own row. No cross-user reads, ever.
drop policy if exists private_self_only on private_profile;
create policy private_self_only on private_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PUBLIC ALIAS:
--   READ  → your own row always; other rows only if they opted in (is_public).
--   WRITE → only your own row.
drop policy if exists alias_read on public_alias;
create policy alias_read on public_alias
  for select using (is_public = true or auth.uid() = user_id);

drop policy if exists alias_insert_self on public_alias;
create policy alias_insert_self on public_alias
  for insert with check (auth.uid() = user_id);

drop policy if exists alias_update_self on public_alias;
create policy alias_update_self on public_alias
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FOLLOWS: you manage only your own follows; you can read your own.
drop policy if exists follows_self on follows;
create policy follows_self on follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- ============================================================================
-- Done. Verify in Table Editor that the three tables exist and each shows
-- "RLS enabled". If you ever see data in private_profile, enc_* columns should
-- look like base64 gibberish — that's correct; it means encryption is working.
-- ============================================================================
