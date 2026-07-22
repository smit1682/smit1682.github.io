/* ═══════════════════════════════════════════════════════
   ingest.js — take raw drafted question files, validate,
   dedupe against the whole existing bank and each other,
   and write clean batch files ready for balance + to-sql.

   Generated drafts cannot be trusted blindly: they may
   repeat an existing question, repeat each other, drift in
   format, or skew the answer key. This is the gate.

   Usage: node tools/ingest.js <draft1.txt> <draft2.txt> ...
   Reads drafts from questions/incoming/, writes accepted
   questions back to the named batch file in questions/,
   and prints a full report. Nothing is written to a batch
   file unless it parses cleanly and is not a duplicate.
   ═══════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QDIR = path.join(ROOT, 'questions');
const INBOX = path.join(QDIR, 'incoming');

global.window = {};
eval(fs.readFileSync(path.join(ROOT, 'js', 'parse.js'), 'utf8'));
const Parser = window.Parser;

const SIX = ['Basic Sciences', 'Nursing Foundations', 'Medical-Surgical Nursing',
             'Obstetrics & Child Health', 'Community Health Nursing', 'Mental Health Nursing'];

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
/* a looser key to catch near-duplicates: first 8 significant words */
const stemKey = s => norm(s).split(' ').filter(w => w.length > 3).slice(0, 8).join(' ');

/* everything already in the bank */
const existing = [];
fs.readdirSync(QDIR).filter(f => /^\d.*\.txt$/.test(f)).sort().forEach(f => {
  const r = Parser.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'), {});
  r.questions.forEach(q => existing.push(q));
});
const seenExact = new Set(existing.map(q => norm(q.question)));
const seenStem = new Set(existing.map(q => stemKey(q.question)));

const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node tools/ingest.js <file ...> (from questions/incoming/)'); process.exit(1); }

const report = { accepted: 0, parseErrors: 0, dupExisting: 0, dupBatch: 0, badTopic: 0, badExp: 0, files: [] };

args.forEach(name => {
  const src = path.join(INBOX, name);
  if (!fs.existsSync(src)) { console.error('missing ' + src); process.exit(1); }

  const r = Parser.parse(fs.readFileSync(src, 'utf8'), {});
  const kept = [];
  const rej = [];

  r.errors.forEach(() => report.parseErrors++);

  r.questions.forEach(q => {
    if (SIX.indexOf(q.topic) === -1) { rej.push(['bad-topic', q.question, q.topic]); report.badTopic++; return; }
    if (!q.explanation || q.explanation.length < 80) { rej.push(['weak-explanation', q.question]); report.badExp++; return; }
    if (seenExact.has(norm(q.question))) { rej.push(['dup-existing', q.question]); report.dupExisting++; return; }
    if (seenStem.has(stemKey(q.question))) { rej.push(['near-dup', q.question]); report.dupBatch++; return; }
    seenExact.add(norm(q.question));
    seenStem.add(stemKey(q.question));
    kept.push(q);
  });

  const outName = name.replace(/\.draft\.txt$/, '.txt').replace(/\.txt$/, '.txt');
  const header = '# ' + name.replace(/\.(draft\.)?txt$/, '') + ' — ingested draft, verify before trusting';
  const L = ['A', 'B', 'C', 'D', 'E', 'F'];
  const body = kept.map(q =>
    'Q: ' + q.question + '\n' +
    q.options.map((o, i) => L[i] + ') ' + o).join('\n') + '\n' +
    'Ans: ' + L[q.correct_index] + '\n' +
    'Topic: ' + q.topic + '\n' +
    'Diff: ' + q.difficulty + '\n' +
    'Exp: ' + q.explanation).join('\n\n');
  fs.writeFileSync(path.join(QDIR, outName), header + '\n\n' + body + '\n');

  report.accepted += kept.length;
  report.files.push({ name, in: r.questions.length, kept: kept.length, out: outName, rej });
});

console.log('\n════ INGEST REPORT ════');
report.files.forEach(f => {
  console.log('\n' + f.name + '  →  ' + f.out);
  console.log('  parsed ' + f.in + ', accepted ' + f.kept + ', rejected ' + f.rej.length);
  f.rej.slice(0, 12).forEach(r => console.log('    ✗ ' + r[0] + ': ' + r[1].slice(0, 70) + (r[2] ? '  [' + r[2] + ']' : '')));
  if (f.rej.length > 12) console.log('    …and ' + (f.rej.length - 12) + ' more');
});
console.log('\n──── totals ────');
console.log('  accepted     : ' + report.accepted);
console.log('  parse errors : ' + report.parseErrors);
console.log('  dup existing : ' + report.dupExisting);
console.log('  near dup     : ' + report.dupBatch);
console.log('  bad topic    : ' + report.badTopic);
console.log('  weak exp     : ' + report.badExp);
console.log('  bank was ' + existing.length + ', would become ' + (existing.length + report.accepted));
