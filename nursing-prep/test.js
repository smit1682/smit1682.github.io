/* smoke test: parser + seed integrity */
const fs = require('fs');
const path = '/home/smit-prajapati/exam-app/js/';
global.window = {};
eval(fs.readFileSync(path + 'seed.js', 'utf8'));
eval(fs.readFileSync(path + 'parse.js', 'utf8'));
const P = window.Parser;

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '\n       ' + JSON.stringify(extra) : '')); }
};

console.log('\n— seed —');
const seedQs = window.SEED_TESTS[0].questions;
check('8 seed questions', seedQs.length === 8);
check('every correct_index in range', seedQs.every(q => q.correct_index >= 0 && q.correct_index < q.options.length));
check('every question has an explanation', seedQs.every(q => q.explanation && q.explanation.length > 20));

console.log('\n— parser: standard paste —');
let r = P.parse(`Q: Which vitamin is fat soluble?
A) Vitamin C
B) Vitamin B12
C) Vitamin A
D) Folic acid
Ans: C
Exp: A, D, E and K are fat soluble.

Q: Normal adult resting heart rate is
A) 40-60
B) 60-100
C) 100-120
D) 120-140
Ans: B
Exp: 60 to 100 beats per minute.`);
check('no errors', r.errors.length === 0, r.errors);
check('2 questions', r.questions.length === 2);
check('q1 answer = index 2', r.questions[0].correct_index === 2);
check('q2 answer = index 1', r.questions[1].correct_index === 1);
check('explanation captured', r.questions[0].explanation === 'A, D, E and K are fat soluble.');

console.log('\n— parser: numbered questions, dots, no blank lines —');
r = P.parse(`1. The gag reflex is carried by
A. Trigeminal
B. Facial
C. Glossopharyngeal
D. Hypoglossal
Answer: C
Explanation: Cranial nerve IX.
2. Warfarin is monitored using
A. aPTT
B. INR
C. Bleeding time
D. Platelets
Answer: B`);
check('no errors', r.errors.length === 0, r.errors);
check('2 questions', r.questions.length === 2);
check('answers resolved', r.questions[0].correct_index === 2 && r.questions[1].correct_index === 1);
check('missing Exp allowed', r.questions[1].explanation === '');

console.log('\n— parser: answer given as full text, and as a number —');
r = P.parse(`Q: Capital of blood filtration is
A) Liver
B) Kidney
C) Spleen
D) Lung
Ans: Kidney

Q: How many chambers has the heart?
A) Two
B) Three
C) Four
D) Five
Ans: 3`);
check('no errors', r.errors.length === 0, r.errors);
check('text answer matched', r.questions[0].correct_index === 1);
check('numeric answer matched', r.questions[1].correct_index === 2);

console.log('\n— parser: wrapped question and option lines —');
r = P.parse(`Q: A patient in hypovolaemic shock should be placed in which
position to improve venous return to the heart?
A) Fowler position with the head of the bed
raised to 45 degrees
B) Modified Trendelenburg
Ans: B
Exp: Raising the legs improves venous return
without pressing on the diaphragm.`);
check('no errors', r.errors.length === 0, r.errors);
check('question lines joined', /position to improve venous return/.test(r.questions[0].question));
check('option lines joined', /raised to 45 degrees/.test(r.questions[0].options[0]));
check('explanation lines joined', /without pressing on the diaphragm/.test(r.questions[0].explanation));

console.log('\n— parser: errors are reported, not swallowed —');
r = P.parse(`Q: Only one option here
A) Alone
Ans: A`);
check('too few options flagged', r.errors.length === 1 && /at least 2/.test(r.errors[0]), r.errors);

r = P.parse(`Q: Answer points nowhere
A) One
B) Two
Ans: D`);
check('bad answer flagged', r.errors.length === 1 && /does not match/.test(r.errors[0]), r.errors);

r = P.parse(`Q: No answer line at all
A) One
B) Two`);
check('missing Ans flagged', r.errors.length === 1 && /Ans/.test(r.errors[0]), r.errors);

check('empty paste flagged', P.parse('   ').errors.length === 1);

console.log('\n— parser: JSON input —');
r = P.parse(JSON.stringify([
  { question: 'Fat soluble vitamin?', options: ['C', 'B12', 'A', 'Folic'], correct_index: 2, explanation: 'ADEK' },
  { q: 'Heart rate?', choices: ['40-60', '60-100'], answer: 'B' }
]));
check('no errors', r.errors.length === 0, r.errors);
check('2 questions', r.questions.length === 2);
check('correct_index honoured', r.questions[0].correct_index === 2);
check('letter answer in JSON', r.questions[1].correct_index === 1);

r = P.parse('[{"question":"broken","options":["only one"]}]');
check('bad JSON item flagged', r.errors.length === 1, r.errors);
check('malformed JSON flagged', P.parse('[{oops').errors.length === 1);

console.log('\n— scoring logic (mirrors app.js submit) —');
function score(questions, answers) {
  let correct = 0, wrong = 0, skipped = 0;
  questions.forEach((q, i) => {
    if (answers[i] === null) skipped++;
    else if (answers[i] === q.correct_index) correct++;
    else wrong++;
  });
  return { correct, wrong, skipped };
}
const qs = [{ correct_index: 0 }, { correct_index: 1 }, { correct_index: 2 }, { correct_index: 3 }];
let s = score(qs, [0, 0, null, 3]);
check('correct/wrong/skipped counted', s.correct === 2 && s.wrong === 1 && s.skipped === 1, s);
s = score(qs, [null, null, null, null]);
check('all skipped scores zero', s.correct === 0 && s.skipped === 4, s);
check('index 0 is not treated as unanswered', score([{ correct_index: 0 }], [0]).correct === 1);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
