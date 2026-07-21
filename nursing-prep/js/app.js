/* ═══════════════════════════════════════════════════════
   APP — screens, exam engine, review, admin.
   ═══════════════════════════════════════════════════════ */

(function () {
  const cfg = window.APP_CONFIG;
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const S = {
    role: null,
    tests: [],
    test: null, questions: [],
    answers: [], flags: [],
    idx: 0,
    endsAt: 0, timerId: null, startedAt: 0,
    result: null, filter: 'all',
    parsed: null,
    doneTests: {}
  };

  /* ══════════ small utilities ══════════ */

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
    const body = $('#' + id + ' .pad');
    if (body) body.scrollTop = 0;
  }

  function fmtClock(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(total / 60), s = total % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function fmtDuration(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m ? m + ' min ' + s + ' sec' : s + ' sec';
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ══════════ theme ══════════ */

  function initTheme() {
    const saved = localStorage.getItem('nep_theme');
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;

    document.addEventListener('click', e => {
      if (!e.target.closest('[data-theme-toggle]')) return;
      const now = document.documentElement.dataset.theme;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const next = now ? (now === 'dark' ? 'light' : 'dark')
                       : (prefersDark ? 'light' : 'dark');
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('nep_theme', next); } catch (err) {}
    });
  }

  /* ══════════ completed-paper memory ══════════ */

  function loadDone() {
    try { S.doneTests = JSON.parse(localStorage.getItem('nep_done') || '{}'); }
    catch (e) { S.doneTests = {}; }
  }
  function markDone(testId, score, total) {
    S.doneTests[testId] = { score, total, at: new Date().toISOString() };
    try { localStorage.setItem('nep_done', JSON.stringify(S.doneTests)); } catch (e) {}
  }

  /* ══════════ login ══════════ */

  function initLogin() {
    const seg = $('#role-seg');

    seg.addEventListener('click', e => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      const role = btn.dataset.role;
      seg.dataset.role = role;
      $$('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      $('#user-label').textContent = role === 'admin' ? 'Email' : 'Username';
      const user = $('#login-user');
      user.value = '';
      user.type = role === 'admin' ? 'email' : 'text';
      user.placeholder = role === 'admin' ? cfg.ADMIN_EMAIL : cfg.STUDENT_USERNAME;
      $('#login-pass').value = '';
      $('#login-error').classList.add('hidden');
      updateHint();
    });

    $('#login-btn').addEventListener('click', doLogin);
    $('#login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    $('#login-user').addEventListener('keydown', e => { if (e.key === 'Enter') $('#login-pass').focus(); });

    $('#login-user').placeholder = cfg.STUDENT_USERNAME;
    updateHint();
  }

  function updateHint() {
    const role = $('#role-seg').dataset.role === 'admin' ? 'admin' : 'student';
    const hint = $('#login-hint');
    if (API.isRemote()) {
      hint.innerHTML = role === 'admin'
        ? 'Use the admin account created in Supabase.'
        : 'Ask your admin for the student username and password.';
    } else {
      hint.innerHTML = role === 'admin'
        ? 'Demo mode — <code>' + esc(cfg.ADMIN_EMAIL) + '</code> / <code>' + esc(cfg.ADMIN_DEMO_PASSWORD) + '</code>'
        : 'Demo mode — <code>' + esc(cfg.STUDENT_USERNAME) + '</code> / <code>' + esc(cfg.STUDENT_PASSWORD) + '</code>';
    }
  }

  function loginError(msg) {
    const el = $('#login-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  async function doLogin() {
    const role = $('#role-seg').dataset.role === 'admin' ? 'admin' : 'student';
    const user = $('#login-user').value.trim();
    const pass = $('#login-pass').value;
    const btn  = $('#login-btn');
    $('#login-error').classList.add('hidden');

    if (!user || !pass) return loginError('Enter both fields to sign in.');

    if (role === 'student') {
      if (user.toLowerCase() !== String(cfg.STUDENT_USERNAME).toLowerCase() || pass !== cfg.STUDENT_PASSWORD) {
        return loginError('That username and password do not match.');
      }
      S.role = 'student';
      $('#login-pass').value = '';
      show('screen-home');
      return loadTests();
    }

    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      await API.adminLogin(user, pass);
      S.role = 'admin';
      $('#login-pass').value = '';
      show('screen-admin');
      loadAdminTests();
    } catch (e) {
      loginError(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }

  function logout() {
    API.signOut();
    S.role = null;
    stopTimer();
    $('#login-user').value = '';
    $('#login-pass').value = '';
    show('screen-login');
  }

  /* ══════════ student home ══════════ */

  async function loadTests() {
    const list = $('#test-list');
    list.innerHTML = '<div class="empty">Loading papers…</div>';
    try {
      S.tests = await API.listTests();
    } catch (e) {
      list.innerHTML = '<div class="empty"><strong>Could not load papers</strong>' + esc(e.message) + '</div>';
      return;
    }
    renderTests();
  }

  function renderTests() {
    const list = $('#test-list');
    if (!S.tests.length) {
      list.innerHTML = '<div class="empty"><strong>No papers yet</strong>Once the admin publishes a paper it will appear here.</div>';
      return;
    }
    list.innerHTML = S.tests.map(t => {
      const done = S.doneTests[t.id];
      return '<button class="tile" data-test="' + esc(t.id) + '">' +
        '<div class="tile-top">' +
          '<span class="tile-title">' + esc(t.title) + '</span>' +
          '<span class="tile-go" aria-hidden="true">→</span>' +
        '</div>' +
        '<div class="tile-meta">' +
          '<span>' + t.question_count + ' questions</span>' +
          '<span>' + t.duration_minutes + ' min</span>' +
          (done ? '<span class="done">Last score ' + done.score + '/' + done.total + '</span>' : '') +
        '</div>' +
      '</button>';
    }).join('');

    list.querySelectorAll('.tile').forEach(el => {
      el.addEventListener('click', () => startTest(el.dataset.test));
    });
  }

  /* ══════════ exam engine ══════════ */

  async function startTest(testId) {
    const meta = S.tests.find(t => t.id === testId);
    if (!meta) return;

    toast('Opening paper…');
    let qs;
    try {
      qs = await API.getQuestions(testId);
    } catch (e) {
      return toast(e.message);
    }
    if (!qs.length) return toast('This paper has no questions in it yet.');

    S.test = meta;
    S.questions = qs;
    S.answers = new Array(qs.length).fill(null);
    S.flags = new Array(qs.length).fill(false);
    S.idx = 0;
    S.startedAt = Date.now();
    S.endsAt = Date.now() + meta.duration_minutes * 60000;

    $('#q-total').textContent = qs.length;
    buildRail();
    show('screen-test');
    renderQuestion();
    startTimer();
  }

  function buildRail() {
    $('#rail').innerHTML = S.questions.map(() => '<i class="tick"></i>').join('');
  }

  function updateRail() {
    const ticks = $('#rail').children;
    for (let i = 0; i < ticks.length; i++) {
      const t = ticks[i];
      t.className = 'tick' +
        (i === S.idx ? ' current' : (S.flags[i] ? ' flagged' : (S.answers[i] !== null ? ' answered' : '')));
    }
  }

  function renderQuestion() {
    const q = S.questions[S.idx];
    const card = $('#qcard');

    $('#q-current').textContent = S.idx + 1;
    $('#qnum-badge').textContent = 'Q' + (S.idx + 1);
    $('#qtext').textContent = q.question;

    $('#options').innerHTML = q.options.map((opt, i) =>
      '<button class="opt' + (S.answers[S.idx] === i ? ' sel' : '') + '" data-opt="' + i + '">' +
        '<span class="opt-key">' + LETTERS[i] + '</span>' +
        '<span class="opt-text">' + esc(opt) + '</span>' +
      '</button>'
    ).join('');

    $('#options').querySelectorAll('.opt').forEach(el => {
      el.addEventListener('click', () => choose(Number(el.dataset.opt)));
    });

    const flag = $('#flag-btn');
    flag.classList.toggle('on', !!S.flags[S.idx]);
    flag.querySelector('.flag-ico').textContent = S.flags[S.idx] ? '◆' : '◇';

    $('#btn-prev').disabled = S.idx === 0;
    $('#btn-next').textContent = S.idx === S.questions.length - 1 ? 'Finish' : 'Next';

    card.classList.remove('swap');
    void card.offsetWidth;             // restart the entrance animation
    card.classList.add('swap');

    updateRail();
    $('#exam-body').scrollTop = 0;
  }

  function choose(i) {
    S.answers[S.idx] = (S.answers[S.idx] === i) ? null : i;
    $('#options').querySelectorAll('.opt').forEach((el, k) => {
      el.classList.toggle('sel', S.answers[S.idx] === k);
    });
    updateRail();
  }

  function goTo(i) {
    if (i < 0 || i >= S.questions.length) return;
    S.idx = i;
    renderQuestion();
  }

  function next() {
    if (S.idx === S.questions.length - 1) return openPalette();
    goTo(S.idx + 1);
  }

  /* ---- timer ---- */

  function startTimer() {
    stopTimer();
    tick();
    S.timerId = setInterval(tick, 500);
  }
  function stopTimer() {
    if (S.timerId) clearInterval(S.timerId);
    S.timerId = null;
  }
  function tick() {
    const left = S.endsAt - Date.now();
    const el = $('#timer');
    el.textContent = fmtClock(left);
    el.classList.toggle('low', left <= 5 * 60000);
    if (left <= 0) {
      stopTimer();
      submit(true);
    }
  }

  /* ---- palette ---- */

  function openPalette() {
    const answered = S.answers.filter(a => a !== null).length;
    const left = S.questions.length - answered;
    $('#submit-summary').textContent = left === 0
      ? 'All ' + S.questions.length + ' questions answered.'
      : left + ' question' + (left === 1 ? '' : 's') + ' still unanswered.';

    $('#palette').innerHTML = S.questions.map((_, i) => {
      const cls = 'pal' +
        (S.flags[i] ? ' flagged' : (S.answers[i] !== null ? ' answered' : '')) +
        (i === S.idx ? ' current' : '');
      return '<button class="' + cls + '" data-go="' + i + '">' + (i + 1) + '</button>';
    }).join('');

    $('#palette').querySelectorAll('.pal').forEach(el => {
      el.addEventListener('click', () => { closePalette(); goTo(Number(el.dataset.go)); });
    });

    $('#palette-sheet').classList.remove('hidden');
  }
  function closePalette() { $('#palette-sheet').classList.add('hidden'); }

  /* ---- submit ---- */

  function submit(auto) {
    if (!auto) {
      const left = S.answers.filter(a => a === null).length;
      const msg = left
        ? left + ' question' + (left === 1 ? ' is' : 's are') + ' still unanswered. Submit anyway?'
        : 'Submit the paper now?';
      if (!confirm(msg)) return;
    }
    stopTimer();
    closePalette();

    let correct = 0, wrong = 0, skipped = 0;
    S.questions.forEach((q, i) => {
      if (S.answers[i] === null) skipped++;
      else if (S.answers[i] === q.correct_index) correct++;
      else wrong++;
    });

    const seconds = Math.round((Date.now() - S.startedAt) / 1000);
    S.result = {
      correct, wrong, skipped,
      total: S.questions.length,
      seconds,
      auto: !!auto
    };
    markDone(S.test.id, correct, S.questions.length);

    API.saveAttempt({
      test_id: S.test.id,
      student_name: cfg.STUDENT_NAME,
      score: correct,
      total: S.questions.length,
      correct, wrong, skipped,
      seconds_taken: seconds,
      answers: S.answers
    }).catch(() => { /* a lost score record must never block the review */ });

    renderResult();
  }

  /* ══════════ result ══════════ */

  function renderResult() {
    const r = S.result;
    const pct = Math.round((r.correct / r.total) * 100);

    show('screen-result');

    $('#result-eyebrow').textContent = r.auto ? 'Time up — submitted automatically' : 'Paper submitted';
    $('#score-total').textContent = r.total;
    $('#stat-correct').textContent = r.correct;
    $('#stat-wrong').textContent = r.wrong;
    $('#stat-skipped').textContent = r.skipped;

    $('#score-title').textContent =
      pct >= 85 ? 'Excellent' :
      pct >= 70 ? 'Strong attempt' :
      pct >= 50 ? 'Good, keep going' :
                  'Worth another round';

    $('#score-sub').textContent =
      pct + '% · finished in ' + fmtDuration(r.seconds) + ' · ' + esc(S.test.title);

    // ring sweep
    const C = 2 * Math.PI * 52;
    const ring = $('#ring-fill');
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = C;
    void ring.getBoundingClientRect();
    ring.style.transition = '';
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = C * (1 - r.correct / r.total);
    });

    countUp($('#score-num'), r.correct);
  }

  function countUp(el, target) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) {
      el.textContent = target;
      return;
    }
    const dur = 900, t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ══════════ review ══════════ */

  function renderReview() {
    const list = $('#review-list');
    const items = [];

    S.questions.forEach((q, i) => {
      const given = S.answers[i];
      const state = given === null ? 'skipped' : (given === q.correct_index ? 'correct' : 'wrong');
      if (S.filter !== 'all' && S.filter !== state) return;

      const badge = state === 'correct' ? '<span class="rev-badge b-ok">Correct</span>'
                  : state === 'wrong'   ? '<span class="rev-badge b-bad">Wrong</span>'
                                        : '<span class="rev-badge b-skip">Not answered</span>';

      const opts = q.options.map((opt, k) => {
        let cls = 'rev-opt', tag = '';
        if (k === q.correct_index) { cls += ' correct'; tag = '<span class="tag">Correct answer</span>'; }
        if (k === given && k !== q.correct_index) { cls += ' chosen-wrong'; tag = '<span class="tag">Your answer</span>'; }
        else if (k === given && k === q.correct_index) { tag = '<span class="tag">Your answer</span>'; }
        return '<div class="' + cls + '"><span class="k">' + LETTERS[k] + '</span>' +
               '<span>' + esc(opt) + '</span>' + tag + '</div>';
      }).join('');

      items.push(
        '<article class="rev is-' + state + '">' +
          '<div class="rev-head"><span class="rev-n">Q' + (i + 1) + '</span>' + badge + '</div>' +
          '<p class="rev-q">' + esc(q.question) + '</p>' +
          opts +
          (q.explanation ? '<div class="exp"><b>Why</b>' + esc(q.explanation) + '</div>' : '') +
        '</article>'
      );
    });

    list.innerHTML = items.length ? items.join('')
      : '<div class="empty"><strong>Nothing here</strong>No questions fall into this filter.</div>';
  }

  function initReview() {
    $('#review-filters').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      S.filter = chip.dataset.filter;
      $$('#review-filters .chip').forEach(c => c.classList.toggle('active', c === chip));
      renderReview();
      $('#screen-review .pad').scrollTop = 0;
    });
  }

  /* ══════════ admin ══════════ */

  function initAdmin() {
    $$('[data-admin-tab]').forEach(chip => {
      chip.addEventListener('click', () => {
        const tab = chip.dataset.adminTab;
        $$('[data-admin-tab]').forEach(c => c.classList.toggle('active', c === chip));
        $('#admin-tests').classList.toggle('hidden', tab !== 'tests');
        $('#admin-add').classList.toggle('hidden', tab !== 'add');
        $('#admin-scores').classList.toggle('hidden', tab !== 'scores');
        if (tab === 'tests') loadAdminTests();
        if (tab === 'scores') loadAttempts();
      });
    });

    $('#new-duration').value = cfg.DEFAULT_DURATION_MINUTES;
    $('#btn-parse').addEventListener('click', () => checkQuestions(true));
    $('#btn-save-test').addEventListener('click', publishTest);
  }

  async function loadAdminTests() {
    const list = $('#admin-test-list');
    list.innerHTML = '<div class="empty">Loading…</div>';
    let tests;
    try { tests = await API.listTests(); }
    catch (e) { list.innerHTML = '<div class="empty"><strong>Could not load papers</strong>' + esc(e.message) + '</div>'; return; }

    $('#admin-sub').textContent = tests.length + (tests.length === 1 ? ' paper' : ' papers');

    if (!tests.length) {
      list.innerHTML = '<div class="empty"><strong>No papers yet</strong>Use the “Add paper” tab to publish the first one.</div>';
      return;
    }

    list.innerHTML = tests.map(t =>
      '<div class="tile" style="cursor:default">' +
        '<div class="tile-top"><span class="tile-title">' + esc(t.title) + '</span></div>' +
        '<div class="tile-meta">' +
          '<span>' + t.question_count + ' questions</span>' +
          '<span>' + t.duration_minutes + ' min</span>' +
          '<span>' + esc(fmtDate(t.created_at)) + '</span>' +
        '</div>' +
        '<div class="row-actions">' +
          '<button class="btn btn-sub danger" data-del="' + esc(t.id) + '">Delete paper</button>' +
        '</div>' +
      '</div>'
    ).join('');

    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const t = tests.find(x => x.id === btn.dataset.del);
        if (!confirm('Delete “' + t.title + '” and all its questions? This cannot be undone.')) return;
        btn.disabled = true;
        try { await API.deleteTest(btn.dataset.del); toast('Paper deleted'); loadAdminTests(); }
        catch (e) { btn.disabled = false; toast(e.message); }
      });
    });
  }

  function checkQuestions(loud) {
    const status = $('#parse-status');
    const res = Parser.parse($('#new-questions').value);
    S.parsed = res.questions;

    status.classList.remove('hidden', 'notice-ok', 'notice-bad');

    if (res.errors.length) {
      status.classList.add('notice-bad');
      status.innerHTML = '<strong>' + res.questions.length + ' question(s) read, ' + res.errors.length + ' problem(s):</strong><br>' +
        res.errors.slice(0, 8).map(esc).join('<br>') +
        (res.errors.length > 8 ? '<br>…and ' + (res.errors.length - 8) + ' more' : '');
      return false;
    }
    if (loud || res.questions.length) {
      status.classList.add('notice-ok');
      status.textContent = res.questions.length + ' question' + (res.questions.length === 1 ? '' : 's') + ' read correctly. Ready to publish.';
    }
    return res.questions.length > 0;
  }

  async function publishTest() {
    const title = $('#new-title').value.trim();
    const duration = parseInt($('#new-duration').value, 10);
    const btn = $('#btn-save-test');

    if (!title) return toast('Give the paper a title first.');
    if (!duration || duration < 1) return toast('Duration must be at least 1 minute.');
    if (!checkQuestions(false)) return toast('Fix the questions listed above, then publish.');

    btn.disabled = true;
    btn.textContent = 'Publishing…';
    try {
      await API.createTest(title, duration, S.parsed);
      toast('Published “' + title + '”');
      $('#new-title').value = '';
      $('#new-questions').value = '';
      $('#parse-status').classList.add('hidden');
      S.parsed = null;
      $$('[data-admin-tab]')[0].click();
    } catch (e) {
      toast(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Publish paper';
    }
  }

  async function loadAttempts() {
    const list = $('#attempt-list');
    list.innerHTML = '<div class="empty">Loading…</div>';
    let rows;
    try { rows = await API.listAttempts(); }
    catch (e) { list.innerHTML = '<div class="empty"><strong>Could not load scores</strong>' + esc(e.message) + '</div>'; return; }

    if (!rows.length) {
      list.innerHTML = '<div class="empty"><strong>No attempts yet</strong>Scores appear here once a paper has been submitted.</div>';
      return;
    }

    list.innerHTML = rows.map(a => {
      const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
      return '<div class="tile" style="cursor:default">' +
        '<div class="tile-top">' +
          '<span class="tile-title">' + esc(a.test_title) + '</span>' +
          '<span class="tile-go">' + a.score + '/' + a.total + '</span>' +
        '</div>' +
        '<div class="tile-meta">' +
          '<span>' + pct + '%</span>' +
          '<span>' + a.correct + ' right · ' + a.wrong + ' wrong · ' + a.skipped + ' skipped</span>' +
          '<span>' + fmtDuration(a.seconds_taken || 0) + '</span>' +
          '<span>' + esc(fmtDate(a.created_at)) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ══════════ wiring ══════════ */

  function init() {
    initTheme();
    loadDone();
    initLogin();
    initReview();
    initAdmin();

    $('#btn-prev').addEventListener('click', () => goTo(S.idx - 1));
    $('#btn-next').addEventListener('click', next);
    $('#btn-palette').addEventListener('click', openPalette);
    $('#btn-submit').addEventListener('click', () => submit(false));
    $('#flag-btn').addEventListener('click', () => {
      S.flags[S.idx] = !S.flags[S.idx];
      renderQuestion();
    });

    $('#btn-quit').addEventListener('click', () => {
      if (!confirm('Leave the paper? Your answers will be lost.')) return;
      stopTimer();
      show('screen-home');
      loadTests();
    });

    $$('[data-close-sheet]').forEach(el => el.addEventListener('click', closePalette));

    $('#btn-review').addEventListener('click', () => {
      S.filter = 'all';
      $$('#review-filters .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
      renderReview();
      show('screen-review');
    });

    document.addEventListener('click', e => {
      const act = e.target.closest('[data-action]');
      if (!act) return;
      const a = act.dataset.action;
      if (a === 'logout') logout();
      if (a === 'home')   { show('screen-home'); loadTests(); }
      if (a === 'result') show('screen-result');
    });

    // keyboard, for anyone practising on a laptop
    document.addEventListener('keydown', e => {
      if (!$('#screen-test').classList.contains('active')) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft')  goTo(S.idx - 1);
      const n = 'abcdef'.indexOf(e.key.toLowerCase());
      if (n > -1 && n < (S.questions[S.idx] || { options: [] }).options.length) choose(n);
    });

    // guard against a stray swipe-back mid-paper
    window.addEventListener('beforeunload', e => {
      if ($('#screen-test').classList.contains('active')) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
