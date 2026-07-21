/* smoke test: topic/difficulty parsing, filtering, drawing */
const fs = require('fs');
const p = '/home/smit-prajapati/exam-app/js/';
global.window = {};
eval(fs.readFileSync(p + 'seed.js', 'utf8'));
eval(fs.readFileSync(p + 'parse.js', 'utf8'));
const P = window.Parser;

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (x !== undefined ? '\n       ' + JSON.stringify(x) : '')));

console.log('\n— seed carries topic + difficulty —');
const sq = window.SEED_TESTS[0].questions;
check('all have a topic', sq.every(q => q.topic && q.topic.length));
check('all have valid difficulty', sq.every(q => ['easy','medium','hard'].includes(q.difficulty)));
check('multiple subjects present', new Set(sq.map(q => q.topic)).size >= 5);
check('all three levels present', new Set(sq.map(q => q.difficulty)).size === 3);

console.log('\n— batch defaults apply when lines are absent —');
let r = P.parse(`Q: Test one
A) a
B) b
Ans: A`, { topic: 'Anatomy', difficulty: 'hard' });
check('no errors', r.errors.length === 0, r.errors);
check('inherits batch topic', r.questions[0].topic === 'Anatomy');
check('inherits batch difficulty', r.questions[0].difficulty === 'hard');

r = P.parse(`Q: no defaults given
A) a
B) b
Ans: A`, {});
check('falls back to General/medium', r.questions[0].topic === 'General' && r.questions[0].difficulty === 'medium');

console.log('\n— per-question overrides —');
r = P.parse(`Q: One
A) a
B) b
Ans: A
Topic: Pharmacology
Diff: easy

Q: Two
A) a
B) b
Ans: B
Exp: because
Difficulty: Hard

Q: Three
A) a
B) b
Ans: A
Subject: Physiology`, { topic: 'Anatomy', difficulty: 'medium' });
check('no errors', r.errors.length === 0, r.errors);
check('3 questions', r.questions.length === 3);
check('q1 override both', r.questions[0].topic === 'Pharmacology' && r.questions[0].difficulty === 'easy');
check('q2 diff override, topic inherited', r.questions[1].difficulty === 'hard' && r.questions[1].topic === 'Anatomy');
check('q2 explanation still parsed', r.questions[1].explanation === 'because');
check('q3 Subject: alias works', r.questions[2].topic === 'Physiology');
check('q3 difficulty inherited', r.questions[2].difficulty === 'medium');

console.log('\n— difficulty spellings —');
check('E/M/H letters', P.normDifficulty('E') === 'easy' && P.normDifficulty('m') === 'medium' && P.normDifficulty('HARD') === 'hard');
check('numbers 1/2/3', P.normDifficulty('2') === 'medium');
check('nonsense rejected', P.normDifficulty('spicy') === null);
r = P.parse(`Q: bad level
A) a
B) b
Ans: A
Diff: spicy`, {});
check('bad difficulty is an error, not silent', r.errors.length === 1 && /not easy, medium or hard/.test(r.errors[0]), r.errors);

console.log('\n— JSON keeps topic/difficulty —');
r = P.parse(JSON.stringify([
  { question: 'x', options: ['a','b'], answer: 'A', topic: 'Micro', difficulty: 'hard' },
  { question: 'y', options: ['a','b'], answer: 'B' }
]), { topic: 'Fallback', difficulty: 'easy' });
check('explicit values kept', r.questions[0].topic === 'Micro' && r.questions[0].difficulty === 'hard');
check('missing values inherit', r.questions[1].topic === 'Fallback' && r.questions[1].difficulty === 'easy');

console.log('\n— filtering + draw (mirrors app.js) —');
const index = [];
[['Anatomy','easy',12],['Anatomy','hard',8],['Pharma','medium',20],['Physio','hard',5]]
  .forEach(([t,d,n]) => { for (let i=0;i<n;i++) index.push({id:t+d+i,topic:t,difficulty:d}); });

const matching = (diff, topic) => index.filter(q =>
  (diff === 'mix' || q.difficulty === diff) && (topic === 'mix' || q.topic === topic));

check('total bank', index.length === 45);
check('mix/mix = all', matching('mix','mix').length === 45);
check('hard only', matching('hard','mix').length === 13);
check('Anatomy only', matching('mix','Anatomy').length === 20);
check('Anatomy + hard', matching('hard','Anatomy').length === 8);
check('empty combo', matching('easy','Physio').length === 0);

const clamp = (n,lo,hi) => Math.min(hi, Math.max(lo,n));
check('count clamps to 10..100', clamp(5,10,100) === 10 && clamp(500,10,100) === 100 && clamp(37,10,100) === 37);
check('time clamps to 10..90', clamp(3,10,90) === 10 && clamp(200,10,90) === 90);

function shuffled(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
const drawn = shuffled(matching('mix','mix')).slice(0, 50);
check('draw clamps to available (50 asked, 45 exist)', drawn.length === 45);
check('draw has no duplicates', new Set(drawn.map(q=>q.id)).size === drawn.length);
const d2 = shuffled(matching('mix','Anatomy')).slice(0, 10);
check('filtered draw respects filter', d2.length === 10 && d2.every(q => q.topic === 'Anatomy'));
const unshuf = matching('mix','mix').slice(0, 10);
check('no-shuffle keeps bank order', unshuf[0].id === index[0].id);

let same = 0;
for (let i=0;i<20;i++){ const a=shuffled(index).slice(0,10).map(q=>q.id).join(); const b=shuffled(index).slice(0,10).map(q=>q.id).join(); if(a===b) same++; }
check('shuffle actually varies', same === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
