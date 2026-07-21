/* ═══════════════════════════════════════════════════════
   PARSE — turns pasted text (or JSON) into question objects.
   Returns { questions, errors }.
   ═══════════════════════════════════════════════════════ */

window.Parser = (function () {

  const RE_Q      = /^(?:Q\s*[:.)\-]|\d+\s*[.)]\s)\s*(.*)$/i;
  const RE_OPT    = /^\(?([A-Fa-f])[).:\-]\s*(.+)$/;
  const RE_ANS    = /^(?:ans|answer|correct(?:\s*answer)?)\s*[:.\-]\s*(.+)$/i;
  const RE_EXP    = /^(?:exp|explanation|sol|solution|reason)\s*[:.\-]\s*(.+)$/i;

  function parse(raw) {
    const text = (raw || '').trim();
    if (!text) return { questions: [], errors: ['Nothing pasted yet.'] };

    if (text[0] === '[' || text[0] === '{') {
      try { return fromJSON(JSON.parse(text)); }
      catch (e) { return { questions: [], errors: ['That looks like JSON but it could not be read: ' + e.message] }; }
    }
    return fromText(text);
  }

  /* ---------- plain text ---------- */
  function fromText(text) {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let cur = null;
    let field = null;                       // where continuation lines go

    for (const rawLine of lines) {
      const line = rawLine.trim();

      const mQ = line.match(RE_Q);
      if (mQ) {
        if (cur) blocks.push(cur);
        cur = { question: mQ[1].trim(), options: [], keys: [], ans: '', explanation: '' };
        field = 'question';
        continue;
      }
      if (!cur) { if (line) { cur = { question: line, options: [], keys: [], ans: '', explanation: '' }; field = 'question'; } continue; }

      const mA = line.match(RE_ANS);
      if (mA) { cur.ans = mA[1].trim(); field = 'ans'; continue; }

      const mE = line.match(RE_EXP);
      if (mE) { cur.explanation = mE[1].trim(); field = 'explanation'; continue; }

      const mO = line.match(RE_OPT);
      if (mO) { cur.keys.push(mO[1].toUpperCase()); cur.options.push(mO[2].trim()); field = 'option'; continue; }

      if (!line) { field = field === 'question' ? null : field; continue; }

      // continuation of whatever came last
      if (field === 'question')          cur.question += ' ' + line;
      else if (field === 'explanation')  cur.explanation += ' ' + line;
      else if (field === 'option' && cur.options.length) cur.options[cur.options.length - 1] += ' ' + line;
      else if (!cur.question)            cur.question = line;
    }
    if (cur) blocks.push(cur);

    const questions = [];
    const errors = [];

    blocks.forEach((b, i) => {
      const n = i + 1;
      if (!b.question)            { errors.push(`Question ${n}: no question text.`); return; }
      if (b.options.length < 2)   { errors.push(`Question ${n}: found ${b.options.length} option(s), needs at least 2. Check the A) B) C) D) lines.`); return; }
      if (b.options.length > 6)   { errors.push(`Question ${n}: ${b.options.length} options is more than the 6 supported.`); return; }
      if (!b.ans)                 { errors.push(`Question ${n}: no "Ans:" line.`); return; }

      const idx = resolveAnswer(b.ans, b.options, b.keys);
      if (idx === -1) {
        errors.push(`Question ${n}: answer "${b.ans}" does not match any option.`);
        return;
      }
      questions.push({
        question: b.question.trim(),
        options: b.options.map(o => o.trim()),
        correct_index: idx,
        explanation: b.explanation.trim()
      });
    });

    if (!questions.length && !errors.length) errors.push('No questions found. Every question must start with "Q:".');
    return { questions, errors };
  }

  /* answer may be a letter (C), a number (3), or the option text */
  function resolveAnswer(ans, options, keys) {
    const a = ans.trim().replace(/^\(|[).:\-]\s*$/g, '').trim();

    const letter = a.match(/^\(?([A-Fa-f])\)?$/);
    if (letter) {
      const L = letter[1].toUpperCase();
      const byKey = keys.indexOf(L);
      if (byKey !== -1) return byKey;
      const byPos = L.charCodeAt(0) - 65;
      if (byPos >= 0 && byPos < options.length) return byPos;
    }

    const num = a.match(/^([1-6])$/);
    if (num) {
      const i = Number(num[1]) - 1;
      if (i < options.length) return i;
    }

    const norm = s => s.toLowerCase().replace(/\s+/g, ' ').replace(/[.,;:]$/, '').trim();
    const exact = options.findIndex(o => norm(o) === norm(a));
    return exact;
  }

  /* ---------- JSON ---------- */
  function fromJSON(data) {
    const arr = Array.isArray(data) ? data : (data.questions || []);
    const questions = [];
    const errors = [];

    arr.forEach((q, i) => {
      const n = i + 1;
      const text = q.question || q.q || q.text;
      const options = q.options || q.choices;
      if (!text)                        { errors.push(`Item ${n}: missing "question".`); return; }
      if (!Array.isArray(options) || options.length < 2) { errors.push(`Item ${n}: "options" must be an array of at least 2.`); return; }

      let idx = -1;
      if (typeof q.correct_index === 'number')      idx = q.correct_index;
      else if (typeof q.answer_index === 'number')  idx = q.answer_index;
      else if (q.answer !== undefined)              idx = resolveAnswer(String(q.answer), options, []);
      else if (q.correct !== undefined)             idx = resolveAnswer(String(q.correct), options, []);

      if (idx < 0 || idx >= options.length) { errors.push(`Item ${n}: could not work out the correct answer.`); return; }

      questions.push({
        question: String(text).trim(),
        options: options.map(o => String(o).trim()),
        correct_index: idx,
        explanation: String(q.explanation || q.exp || '').trim()
      });
    });

    if (!questions.length && !errors.length) errors.push('The JSON held no questions.');
    return { questions, errors };
  }

  return { parse };
})();
