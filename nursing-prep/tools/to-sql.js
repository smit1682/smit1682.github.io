/* ═══════════════════════════════════════════════════════
   to-sql.js — turn the reviewed question files into one
   SQL file to run in the Supabase SQL Editor.

   Why not paste the text through the admin screen? That path
   exists for adding a few questions by hand. For a bulk load
   it means several rounds of copy-paste through a browser
   parser, and a failure halfway leaves the bank half full.
   One transaction either lands completely or not at all.

   Text stays the source of truth because it is the form a
   human can proofread. This is only the transport.

   Usage: node tools/to-sql.js > questions/import.sql
   ═══════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'questions');

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'parse.js'), 'utf8'));
const Parser = window.Parser;

/* dollar-quoting sidesteps every apostrophe in the explanations */
function q(s) {
  let tag = 'x';
  while (String(s).indexOf('$' + tag + '$') !== -1) tag += 'x';
  return '$' + tag + '$' + s + '$' + tag + '$';
}

/* with no arguments every file is converted; pass filenames to
   emit only those, so an already-imported batch is not sent twice */
const argv = process.argv.slice(2);
const files = argv.length
  ? argv.map(a => path.basename(a))
  : fs.readdirSync(DIR).filter(f => /^\d.*\.txt$/.test(f)).sort();
const out = [];
let grand = 0;

out.push('-- ═══════════════════════════════════════════════════════');
out.push('-- Question bank import');
out.push('-- Run in: Supabase → SQL Editor → New query → Run');
out.push('--');
out.push('-- Wrapped in a transaction: if any row fails, nothing is');
out.push('-- inserted and the bank is left exactly as it was.');
out.push('-- Running it twice inserts the questions twice, so run once.');
out.push('-- ═══════════════════════════════════════════════════════');
out.push('');
out.push('begin;');
out.push('');

files.forEach(file => {
  const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
  const parsed = Parser.parse(raw, {});
  if (parsed.errors.length) {
    console.error('ERRORS in ' + file);
    parsed.errors.forEach(e => console.error('  ' + e));
    process.exit(1);
  }

  const headline = (raw.split(/\r?\n/).find(l => l.trim()[0] === '#') || file)
    .replace(/^#\s*/, '').trim();

  const topics = Array.from(new Set(parsed.questions.map(x => x.topic)));
  const batchTopic = topics.length === 1 ? topics[0] : 'Mixed';

  out.push('-- ' + file + ' — ' + parsed.questions.length + ' questions');
  out.push('with b as (');
  out.push('  insert into tests (title, topic, difficulty, duration_minutes)');
  out.push('  values (' + q(headline) + ', ' + q(batchTopic) + ", 'medium', 60)");
  out.push('  returning id');
  out.push(')');
  out.push('insert into questions (test_id, position, question, options, correct_index, explanation, topic, difficulty)');
  out.push('select b.id, v.pos::int, v.question, v.options::jsonb, v.ci::int, v.exp, v.topic, v.diff');
  out.push('from b, (values');

  const rows = parsed.questions.map((x, i) =>
    '  (' + i + ', ' + q(x.question) + ', ' + q(JSON.stringify(x.options)) + ', ' +
    x.correct_index + ', ' + q(x.explanation) + ', ' + q(x.topic) + ', ' + q(x.difficulty) + ')');

  out.push(rows.join(',\n'));
  out.push(') as v(pos, question, options, ci, exp, topic, diff);');
  out.push('');

  grand += parsed.questions.length;
});

out.push('commit;');
out.push('');
out.push('-- Expect: ' + grand + ' rows inserted across ' + files.length + ' batches.');
out.push('-- Check with:  select topic, difficulty, count(*) from questions group by 1,2 order by 1,2;');

console.log(out.join('\n'));
console.error('generated SQL for ' + grand + ' questions in ' + files.length + ' batches');
