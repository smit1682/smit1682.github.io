-- ════════════════════════════════════════════════════════
-- Nursing Entrance Prep — Supabase schema
-- Paste the whole file into: Supabase → SQL Editor → New query → Run
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════

-- ─── tables ─────────────────────────────────────────────

create table if not exists tests (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  duration_minutes int  not null default 60,
  created_at       timestamptz not null default now()
);

create table if not exists questions (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid not null references tests(id) on delete cascade,
  position      int  not null default 0,
  question      text not null,
  options       jsonb not null,
  correct_index int  not null,
  explanation   text not null default ''
);

create index if not exists questions_test_idx on questions(test_id, position);

create table if not exists attempts (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid references tests(id) on delete cascade,
  student_name  text,
  score         int,
  total         int,
  correct       int,
  wrong         int,
  skipped       int,
  seconds_taken int,
  answers       jsonb,
  created_at    timestamptz not null default now()
);

-- ─── row level security ─────────────────────────────────

alter table tests     enable row level security;
alter table questions enable row level security;
alter table attempts  enable row level security;

-- drop first so re-running this file never errors
drop policy if exists "read tests"    on tests;
drop policy if exists "write tests"   on tests;
drop policy if exists "read qs"       on questions;
drop policy if exists "write qs"      on questions;
drop policy if exists "add attempt"   on attempts;
drop policy if exists "read attempts" on attempts;

-- anyone with the link may read the papers…
create policy "read tests"  on tests     for select to anon, authenticated using (true);
create policy "read qs"     on questions for select to anon, authenticated using (true);

-- …but only a signed-in admin may add, edit or delete them
create policy "write tests" on tests     for all to authenticated using (true) with check (true);
create policy "write qs"    on questions for all to authenticated using (true) with check (true);

-- the student submits a score without signing in; only the admin can read scores
create policy "add attempt"   on attempts for insert to anon, authenticated with check (true);
create policy "read attempts" on attempts for select to authenticated using (true);

-- ─── done ───────────────────────────────────────────────
-- Expect: "Success. No rows returned."
