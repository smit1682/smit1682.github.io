/* ═══════════════════════════════════════════════════════
   balance.js — even out where the correct answer sits.

   Authoring by hand skews the answer key badly (B far too
   often), which lets a guesser score without knowing anything.
   This shuffles the options within each question and rewrites
   the Ans: letter to follow.

   Option sets that read as an ordered numeric scale are left
   alone: their position is fixed by the value, not by habit,
   and scrambling them just looks wrong.

   Deterministic, so re-running gives the same result.

   Usage: node tools/balance.js [file ...]
   With no arguments it rewrites every question file. Pass
   filenames to touch only those — important once a batch has
   already been imported, since reshuffling it would make the
   files disagree with what is in the database.
   ═══════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'questions');
const L = ['A', 'B', 'C', 'D', 'E', 'F'];

/* small seeded PRNG so the output is reproducible */
let seed = 20260721;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'parse.js'), 'utf8'));
const Parser = window.Parser;

/* leading number of an option, if it reads as a quantity */
function leadNum(s) {
  const m = String(s).match(/^[^\d]{0,3}(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
function isOrderedScale(options) {
  const nums = options.map(leadNum);
  if (nums.some(n => n === null)) return false;
  for (let i = 1; i < nums.length; i++) if (nums[i] <= nums[i - 1]) return false;
  return true;
}

function shuffleQuestion(q) {
  if (isOrderedScale(q.options)) return { q, moved: false };
  const pairs = q.options.map((text, i) => ({ text, correct: i === q.correct_index }));
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = pairs[i]; pairs[i] = pairs[j]; pairs[j] = t;
  }
  q.options = pairs.map(p => p.text);
  q.correct_index = pairs.findIndex(p => p.correct);
  return { q, moved: true };
}

function render(q) {
  return [
    'Q: ' + q.question,
    ...q.options.map((o, i) => L[i] + ') ' + o),
    'Ans: ' + L[q.correct_index],
    'Topic: ' + q.topic,
    'Diff: ' + q.difficulty,
    'Exp: ' + q.explanation
  ].join('\n');
}

const argv = process.argv.slice(2);
const files = argv.length
  ? argv.map(a => path.basename(a))
  : fs.readdirSync(DIR).filter(f => /^\d.*\.txt$/.test(f)).sort();
let total = 0, scaled = 0;
const spread = {};

files.forEach(file => {
  const full = path.join(DIR, file);
  const raw = fs.readFileSync(full, 'utf8');
  const header = raw.split(/\r?\n/).filter(l => l.trim()[0] === '#').join('\n');

  const parsed = Parser.parse(raw, {});
  if (parsed.errors.length) {
    console.error('ERRORS in ' + file);
    parsed.errors.forEach(e => console.error('  ' + e));
    process.exit(1);
  }

  const out = parsed.questions.map(q => {
    const before = q.correct_index;
    const { moved } = shuffleQuestion(q);
    if (!moved) scaled++;
    total++;
    spread[q.correct_index] = (spread[q.correct_index] || 0) + 1;
    return q;
  });

  fs.writeFileSync(full, header + '\n\n' + out.map(render).join('\n\n') + '\n');
  console.log(file.padEnd(34) + out.length + ' questions rewritten');
});

console.log('\ntotal            : ' + total);
console.log('left as a scale  : ' + scaled + ' (numeric options kept in ascending order)');
console.log('answer spread    : ' + [0, 1, 2, 3].map(i => L[i] + '=' + (spread[i] || 0)).join('  '));
