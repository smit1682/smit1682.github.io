/* ═══════════════════════════════════════════════════════
   retopic.js — collapse the fine-grained subjects into the
   six the student actually filters on.

   Thirteen chips on the setup screen was noise, and a chip
   reading "Management 3" is not a choice anyone makes. These
   six mirror how the AIIMS syllabus is organised.

   Rewrites the Topic: line in every question file, and writes
   questions/retopic.sql to bring an already-imported database
   into line without reloading anything.

   Usage: node tools/retopic.js
   ═══════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'questions');

const MAP = {
  'Anatomy':          'Basic Sciences',
  'Physiology':       'Basic Sciences',
  'Microbiology':     'Basic Sciences',
  'Nutrition':        'Basic Sciences',

  'Fundamentals':     'Nursing Foundations',
  'Pharmacology':     'Nursing Foundations',
  'Research':         'Nursing Foundations',
  'Management':       'Nursing Foundations',

  'Medical-Surgical': 'Medical-Surgical Nursing',

  'Obstetrics':       'Obstetrics & Child Health',
  'Child Health':     'Obstetrics & Child Health',

  'Community Health': 'Community Health Nursing',
  'Mental Health':    'Mental Health Nursing',

  /* the sample paper used a couple of one-off labels */
  'Emergency Care':   'Medical-Surgical Nursing',
  'Infection Control':'Nursing Foundations',
  'General':          'Nursing Foundations'
};

const files = fs.readdirSync(DIR).filter(f => /^\d.*\.txt$/.test(f)).sort();
const counts = {};
let changed = 0, untouched = 0;

files.forEach(file => {
  const full = path.join(DIR, file);
  const out = fs.readFileSync(full, 'utf8').split(/\r?\n/).map(line => {
    const m = line.match(/^Topic:\s*(.+)$/);
    if (!m) return line;
    const from = m[1].trim();
    const to = MAP[from];
    if (!to) {
      if (Object.values(MAP).indexOf(from) === -1) {
        console.error('  ! no mapping for subject: ' + from);
        process.exitCode = 1;
      }
      untouched++;
      counts[from] = (counts[from] || 0) + 1;
      return line;
    }
    if (to !== from) changed++;
    counts[to] = (counts[to] || 0) + 1;
    return 'Topic: ' + to;
  }).join('\n');

  fs.writeFileSync(full, out);
  console.log(file.padEnd(34) + 'done');
});

/* so a database that already holds the old labels can be updated in place */
const groups = {};
Object.keys(MAP).forEach(from => {
  if (MAP[from] === from) return;
  (groups[MAP[from]] = groups[MAP[from]] || []).push(from);
});

const sql = [
  '-- ═══════════════════════════════════════════════════════',
  '-- Collapse the fine-grained subjects into six.',
  '-- Run in: Supabase → SQL Editor → New query → Run',
  '--',
  '-- Only needed if you already imported questions under the',
  '-- old subject names. Safe to run more than once.',
  '-- ═══════════════════════════════════════════════════════',
  '',
  'begin;'
];
Object.keys(groups).sort().forEach(to => {
  const list = groups[to].map(s => "'" + s.replace(/'/g, "''") + "'").join(', ');
  sql.push('');
  sql.push('update questions set topic = ' + "'" + to.replace(/'/g, "''") + "'" + ' where topic in (' + list + ');');
  sql.push('update tests     set topic = ' + "'" + to.replace(/'/g, "''") + "'" + ' where topic in (' + list + ');');
});
sql.push('');
sql.push('commit;');
sql.push('');
sql.push('-- Check with:  select topic, count(*) from questions group by 1 order by 2 desc;');
fs.writeFileSync(path.join(DIR, 'retopic.sql'), sql.join('\n') + '\n');

console.log('\nrewritten : ' + changed + ' Topic: lines');
if (untouched) console.log('unchanged : ' + untouched + ' (already a final subject)');
console.log('\nSIX SUBJECTS');
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + String(v).padStart(3) + '  ' + k));
console.log('\nalso wrote questions/retopic.sql');
