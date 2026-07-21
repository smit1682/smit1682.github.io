-- ═══════════════════════════════════════════════════════
-- Collapse the fine-grained subjects into six.
-- Run in: Supabase → SQL Editor → New query → Run
--
-- Only needed if you already imported questions under the
-- old subject names. Safe to run more than once.
-- ═══════════════════════════════════════════════════════

begin;

update questions set topic = 'Basic Sciences' where topic in ('Anatomy', 'Physiology', 'Microbiology', 'Nutrition');
update tests     set topic = 'Basic Sciences' where topic in ('Anatomy', 'Physiology', 'Microbiology', 'Nutrition');

update questions set topic = 'Community Health Nursing' where topic in ('Community Health');
update tests     set topic = 'Community Health Nursing' where topic in ('Community Health');

update questions set topic = 'Medical-Surgical Nursing' where topic in ('Medical-Surgical', 'Emergency Care');
update tests     set topic = 'Medical-Surgical Nursing' where topic in ('Medical-Surgical', 'Emergency Care');

update questions set topic = 'Mental Health Nursing' where topic in ('Mental Health');
update tests     set topic = 'Mental Health Nursing' where topic in ('Mental Health');

update questions set topic = 'Nursing Foundations' where topic in ('Fundamentals', 'Pharmacology', 'Research', 'Management', 'Infection Control', 'General');
update tests     set topic = 'Nursing Foundations' where topic in ('Fundamentals', 'Pharmacology', 'Research', 'Management', 'Infection Control', 'General');

update questions set topic = 'Obstetrics & Child Health' where topic in ('Obstetrics', 'Child Health');
update tests     set topic = 'Obstetrics & Child Health' where topic in ('Obstetrics', 'Child Health');

commit;

-- Check with:  select topic, count(*) from questions group by 1 order by 2 desc;
