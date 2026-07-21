-- ════════════════════════════════════════════════════════
-- Migration: custom tests drawn from a question bank
-- Run in: Supabase → SQL Editor → New query → Run
-- Safe to run more than once. Existing questions keep working.
-- ════════════════════════════════════════════════════════

-- every question now carries a subject and a difficulty, so the
-- student can filter on them when setting up a test
alter table questions add column if not exists topic      text not null default 'General';
alter table questions add column if not exists difficulty text not null default 'medium';

create index if not exists questions_filter_idx on questions(topic, difficulty);

-- an attempt is no longer tied to one uploaded set, so record the
-- settings the student chose instead
alter table attempts add column if not exists config jsonb;
alter table attempts alter column test_id drop not null;

-- the upload batch keeps its own defaults, shown on the admin screen
alter table tests add column if not exists topic      text not null default 'General';
alter table tests add column if not exists difficulty text not null default 'medium';

-- ─── done ───────────────────────────────────────────────
-- Expect: "Success. No rows returned."
