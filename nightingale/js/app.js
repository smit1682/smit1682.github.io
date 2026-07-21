/* ═══════════════════════════════════════════════════════
   APP — screens, test setup, exam engine, review, admin.
   ═══════════════════════════════════════════════════════ */

(function () {
  const cfg = window.APP_CONFIG;
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const LIMITS = { minQ: 10, maxQ: 100, minT: 10, maxT: 90 };

  const S = {
    role: null,
    index: [],                                  // {id, topic, difficulty} for the whole bank
    setup: { count: 50, time: 30, diff: 'mix', topic: 'mix', shuffle: true },
    questions: [], answers: [], flags: [], idx: 0,
    endsAt: 0, timerId: null, startedAt: 0,
    result: null, filter: 'all',
    parsed: null
  };

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  /* ══════════ utilities ══════════ */

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
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2800);
  }

  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
    const body = $('#' + id + ' .pad');
    if (body) body.scrollTop = 0;
    /* the ambient hearts run only while her home screen is on show */
    if (id === 'screen-home') startAmbient(); else stopAmbient();
    if (id === 'screen-login') startLoginHearts(); else stopLoginHearts();
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
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ══════════ theme ══════════ */

  function initTheme() {
    const saved = localStorage.getItem('nep_theme');
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;

    document.addEventListener('click', e => {
      if (!e.target.closest('[data-theme-toggle]')) return;
      const now = document.documentElement.dataset.theme;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const next = now ? (now === 'dark' ? 'light' : 'dark') : (prefersDark ? 'light' : 'dark');
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('nep_theme', next); } catch (err) {}
    });
  }

  /* ═══════════════════════════════════════════════════════
     FOR HER

     Warmth lives at the edges — the moment she opens the app,
     the home screen, the result. The exam screen is left
     deliberately plain, because what she needs there is to
     concentrate, and protecting that is its own kind of care.
     ═══════════════════════════════════════════════════════ */

  const LOVE = cfg.LOVE || { enabled: false };
  const loveOn = () => !!LOVE.enabled;

  function pick(arr, i) {
    if (!arr || !arr.length) return '';
    return arr[(i === undefined ? Math.floor(Math.random() * arr.length) : i) % arr.length];
  }

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function dayNumber() {
    const d = new Date();
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  }
  function timeOfDay() {
    const h = new Date().getHours();
    const bands = (LOVE.timeGreetings && LOVE.timeGreetings.length) ? LOVE.timeGreetings : [
      { before: 5,  text: 'The lamp is still lit' },
      { before: 12, text: 'Good morning' },
      { before: 17, text: 'Good afternoon' },
      { before: 22, text: 'Good evening' },
      { before: 24, text: 'Burning the midnight oil' }
    ];
    for (const b of bands) if (h < b.before) return b.text;
    return bands[bands.length - 1].text;
  }

  /* the rose accent rides on top of whichever theme is active */
  function applyLove(on) {
    document.documentElement.classList.toggle('love', on && loveOn());
    $('#btn-note').classList.toggle('hidden', !(on && loveOn() && (LOVE.notes || []).length));
    const hello = $('#hero-hello');
    if (on && loveOn()) {
      hello.textContent = 'Hi ' + (LOVE.nickname || LOVE.name) + ',';
      hello.classList.remove('hidden');
    } else {
      hello.classList.add('hidden');
    }
  }

  /* every single sign-in — she should not have to wait a day for it */
  function maybeGreet() {
    if (!loveOn()) return;
    showGreeting();
  }

  function showGreeting() {
    const g = $('#greeting');
    $('#greet-eyebrow').textContent = timeOfDay();
    $('#greet-name').textContent = LOVE.nickname || LOVE.name || '';
    $('#greet-line').textContent = pick(LOVE.greetings, dayNumber());
    $('#greet-sign').textContent = '— ' + (LOVE.from || '');
    g.classList.remove('hidden', 'leaving');
    startHearts();
  }

  function closeGreeting() {
    const g = $('#greeting');
    g.classList.add('leaving');
    setTimeout(() => { g.classList.add('hidden'); stopHearts(); }, 560);
  }

  /* ---- drifting hearts ----
     One renderer, two uses: the bold pass on the greeting, and a
     faint one behind her home screen. Returns a handle so each can
     be stopped, because a canvas left animating under a hidden
     screen just drains her battery. Static for reduced motion. */

  function runHearts(canvas, opts) {
    const o = opts || {};
    const count = o.count || 22;
    const aMin = o.alphaMin === undefined ? 0.10 : o.alphaMin;
    const aMax = o.alphaMax === undefined ? 0.40 : o.alphaMax;
    const sMin = o.sizeMin || 6;
    const sMax = o.sizeMax || 20;
    const speed = o.speed === undefined ? 1 : o.speed;

    const ctx = canvas.getContext('2d');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = null, parts = [];

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return false;                 // screen not visible yet
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function spawn(seeded) {
      return {
        x: Math.random() * w,
        y: seeded ? Math.random() * h : h + 30,
        s: sMin + Math.random() * (sMax - sMin),
        v: (0.25 + Math.random() * 0.55) * speed,
        sway: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        a: aMin + Math.random() * (aMax - aMin),
        rot: (Math.random() - 0.5) * 0.5
      };
    }

    function heart(p) {
      const s = p.s;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c1436d';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.bezierCurveTo(0, -s * 0.95, -s, -s * 0.72, -s, -s * 0.08);
      ctx.bezierCurveTo(-s, s * 0.42, -s * 0.34, s * 0.62, 0, s);
      ctx.bezierCurveTo(s * 0.34, s * 0.62, s, s * 0.42, s, -s * 0.08);
      ctx.bezierCurveTo(s, -s * 0.72, 0, -s * 0.95, 0, -s * 0.3);
      ctx.fill();
      ctx.restore();
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p, i) => {
        p.y -= p.v;
        p.x += Math.sin(t + p.phase) * p.sway * 0.35;
        if (p.y < -40) parts[i] = spawn(false);
        heart(p);
      });
    }

    if (!size()) return { stop: function () {} };
    parts = Array.from({ length: still ? Math.round(count * 0.6) : count }, () => spawn(true));

    if (still) {                                  // a quiet, static scatter
      ctx.clearRect(0, 0, w, h);
      parts.forEach(heart);
      return { stop: function () {} };
    }

    let t = 0;
    (function frame() {
      t += 0.016;
      draw(t);
      raf = requestAnimationFrame(frame);
    })();

    const onResize = function () { if (size()) parts = parts.map(() => spawn(true)); };
    window.addEventListener('resize', onResize);

    return {
      stop: function () {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        window.removeEventListener('resize', onResize);
        ctx.clearRect(0, 0, w, h);
      }
    };
  }

  /* the bold pass, on the greeting */
  let greetHearts = null;
  function startHearts() {
    stopHearts();
    greetHearts = runHearts($('#hearts'), { count: 22, alphaMin: 0.10, alphaMax: 0.40, sizeMin: 6, sizeMax: 20 });
  }
  function stopHearts() {
    if (greetHearts) greetHearts.stop();
    greetHearts = null;
  }

  /* the faint pass — behind the sign-in screen and her home screen */
  const AMBIENT = { count: 14, alphaMin: 0.05, alphaMax: 0.14, sizeMin: 9, sizeMax: 26, speed: 0.55 };

  let homeHearts = null;
  function startAmbient() {
    if (!loveOn() || S.role !== 'student') return;
    stopAmbient();
    /* wait a frame so the screen is laid out and the canvas has a size */
    requestAnimationFrame(function () {
      if (!$('#screen-home').classList.contains('active')) return;
      homeHearts = runHearts($('#ambient'), AMBIENT);
    });
  }
  function stopAmbient() {
    if (homeHearts) homeHearts.stop();
    homeHearts = null;
  }

  let loginHearts = null;
  function startLoginHearts() {
    if (!loveOn()) return;
    stopLoginHearts();
    requestAnimationFrame(function () {
      if (!$('#screen-login').classList.contains('active')) return;
      if (!document.documentElement.classList.contains('love')) return;
      loginHearts = runHearts($('#login-hearts'), AMBIENT);
    });
  }
  function stopLoginHearts() {
    if (loginHearts) loginHearts.stop();
    loginHearts = null;
  }

  function openNote() {
    $('#note-body').textContent = pick(LOVE.notes);
    $('#note-sign').textContent = '— ' + (LOVE.from || '');
    $('#note-sheet').classList.remove('hidden');
  }
  function closeNote() { $('#note-sheet').classList.add('hidden'); }

  /* the encouragement on the result screen, chosen by how it actually went */
  function praiseFor(pct) {
    const p = LOVE.praise || {};
    if (pct >= 85) return pick(p.great);
    if (pct >= 70) return pick(p.good);
    if (pct >= 50) return pick(p.okay);
    return pick(p.tough);
  }

  /* ══════════ local history (anon cannot read attempts back) ══════════ */

  function history() {
    try { return JSON.parse(localStorage.getItem('nep_history') || '[]'); }
    catch (e) { return []; }
  }
  function pushHistory(entry) {
    const h = history();
    h.unshift(entry);
    try { localStorage.setItem('nep_history', JSON.stringify(h.slice(0, 10))); } catch (e) {}
  }

  /* ══════════ login ══════════ */

  let wrongTries = 0;

  function initLogin() {
    /* the two tabs are their names, not job titles — and picking hers
       drops the username field entirely, so she only types a password */
    $('#seg-her').textContent = LOVE.nickname || LOVE.name || 'Student';
    $('#seg-him').textContent = LOVE.from || 'Admin';
    if (!loveOn()) {
      $('#seg-her').textContent = 'Student';
      $('#seg-him').textContent = 'Admin';
      $('.seg-heart').classList.add('hidden');
    }

    $('#role-seg').addEventListener('click', e => {
      const btn = e.target.closest('.seg-btn');
      if (btn) setRole(btn.dataset.role);
    });

    $('#login-btn').addEventListener('click', doLogin);
    $('#login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    $('#login-user').addEventListener('keydown', e => { if (e.key === 'Enter') $('#login-pass').focus(); });

    setRole('student');
  }

  function setRole(role) {
    const her = role !== 'admin';
    const seg = $('#role-seg');
    seg.dataset.role = her ? 'student' : 'admin';
    $$('.seg-btn').forEach(b => b.classList.toggle('active', (b.dataset.role === 'admin') === !her));

    applyLove(her);                       // her side is rose, his stays clinical
    wrongTries = 0;

    const user = $('#login-user');
    $('#field-user').classList.toggle('hidden', her && loveOn());
    user.type = her ? 'text' : 'email';
    user.value = her ? cfg.STUDENT_USERNAME : '';
    user.placeholder = her ? cfg.STUDENT_USERNAME : cfg.ADMIN_EMAIL;
    $('#user-label').textContent = her ? 'Username' : 'Email';

    $('#login-pass').value = '';
    $('#login-error').classList.add('hidden');

    const name = her ? (LOVE.nickname || LOVE.name) : LOVE.from;
    $('#login-greet').textContent = loveOn() && name ? timeOfDay() + ', ' + name : '';
    $('#login-greet').classList.toggle('hidden', !(loveOn() && name));

    $('#login-btn').textContent = her && loveOn() ? 'Let me in' : 'Sign in';

    const ps = $('#login-ps');
    ps.textContent = her && loveOn() ? pick(LOVE.loginLines) : '';
    ps.classList.toggle('hidden', !(her && loveOn()));

    if (her) startLoginHearts(); else stopLoginHearts();
    updateHint();
  }

  function updateHint() {
    const her = $('#role-seg').dataset.role !== 'admin';
    const hint = $('#login-hint');
    if (!API.isRemote()) {
      hint.innerHTML = 'Demo mode — <code>' + esc(her ? cfg.STUDENT_USERNAME : cfg.ADMIN_EMAIL) +
        '</code> / <code>' + esc(her ? cfg.STUDENT_PASSWORD : cfg.ADMIN_DEMO_PASSWORD) + '</code>';
      return;
    }
    hint.innerHTML = her ? '' : 'Use the admin account created in Supabase.';
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
      /* she can sign in with her own name as well as the plain username */
      const aliases = [cfg.STUDENT_USERNAME, LOVE.name, LOVE.nickname]
        .filter(Boolean).map(s => String(s).toLowerCase());
      if (aliases.indexOf(user.toLowerCase()) === -1 || pass !== cfg.STUDENT_PASSWORD) {
        wrongTries++;
        let msg = (loveOn() && pick(LOVE.wrongPassword)) || 'That username and password do not match.';
        if (wrongTries >= 3 && loveOn() && LOVE.passwordHint) msg += ' ' + LOVE.passwordHint;
        return loginError(msg);
      }
      wrongTries = 0;
      S.role = 'student';
      $('#login-pass').value = '';
      stopLoginHearts();
      applyLove(true);
      show('screen-home');
      maybeGreet();
      return loadBank();
    }

    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      await API.adminLogin(user, pass);
      S.role = 'admin';
      $('#login-pass').value = '';
      applyLove(false);
      show('screen-admin');
      loadAdminSets();
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
    stopHearts();
    closeNote();
    $('#greeting').classList.add('hidden');
    applyLove(false);
    show('screen-login');
    setRole('student');
  }

  /* ══════════ student home ══════════ */

  async function loadBank() {
    $('#bank-count').textContent = '…';
    $('#bank-topics').innerHTML = '';
    $('#bank-note').textContent = '';
    $('#btn-apply').disabled = true;

    try {
      S.index = await API.getIndex();
    } catch (e) {
      $('#bank-count').textContent = '0';
      $('#bank-note').textContent = e.message;
      return;
    }

    $('#bank-count').textContent = S.index.length;
    $('#btn-apply').disabled = S.index.length === 0;

    const counts = countBy(S.index, q => q.topic);
    $('#bank-topics').innerHTML = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, 6)
      .map(t => '<span>' + esc(t) + ' ' + counts[t] + '</span>')
      .join('');

    $('#bank-note').textContent = S.index.length
      ? 'Choose how many questions and how long you want.'
      : 'The bank is empty. Ask your admin to add questions.';

    renderHistory();
  }

  function countBy(arr, fn) {
    const out = {};
    arr.forEach(x => { const k = fn(x); out[k] = (out[k] || 0) + 1; });
    return out;
  }

  function renderHistory() {
    const h = history().slice(0, 3);
    const el = $('#last-attempts');
    if (!h.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<p class="recent-head">Recent attempts</p>' + h.map(a => {
      const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
      return '<div class="recent">' +
        '<span class="recent-score">' + a.score + '/' + a.total + '</span>' +
        '<span class="recent-meta">' + esc(a.label) + '<br>' + esc(fmtDate(a.at)) + '</span>' +
        '<span class="recent-pct">' + pct + '%</span>' +
      '</div>';
    }).join('');
  }

  /* ══════════ test setup ══════════ */

  function initSetup() {
    $('#btn-apply').addEventListener('click', openSetup);

    /* number of questions */
    $('#row-count').addEventListener('click', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      selectChip('#row-count', chip);
      const v = chip.dataset.count;
      $('#custom-count').classList.toggle('hidden', v !== 'custom');
      if (v === 'custom') {
        const input = $('#custom-count input');
        input.value = S.setup.count;
        input.focus();
      } else {
        S.setup.count = Number(v);
      }
      recompute();
    });
    $('#custom-count input').addEventListener('input', e => {
      const n = parseInt(e.target.value, 10);
      if (!isNaN(n)) S.setup.count = clamp(n, LIMITS.minQ, LIMITS.maxQ);
      recompute();
    });
    $('#custom-count input').addEventListener('blur', e => {
      e.target.value = S.setup.count;
    });

    /* time */
    $('#row-time').addEventListener('click', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      selectChip('#row-time', chip);
      const v = chip.dataset.time;
      $('#custom-time').classList.toggle('hidden', v !== 'custom');
      if (v === 'custom') {
        const input = $('#custom-time input');
        input.value = S.setup.time;
        input.focus();
      } else {
        S.setup.time = Number(v);
      }
      recompute();
    });
    $('#custom-time input').addEventListener('input', e => {
      const n = parseInt(e.target.value, 10);
      if (!isNaN(n)) S.setup.time = clamp(n, LIMITS.minT, LIMITS.maxT);
      recompute();
    });
    $('#custom-time input').addEventListener('blur', e => {
      e.target.value = S.setup.time;
    });

    /* difficulty */
    $('#row-diff').addEventListener('click', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      selectChip('#row-diff', chip);
      S.setup.diff = chip.dataset.diff;
      recompute();
    });

    /* subject */
    $('#row-topic').addEventListener('click', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      S.setup.topic = chip.dataset.topic;
      recompute();
    });

    $('#opt-shuffle').addEventListener('change', e => { S.setup.shuffle = e.target.checked; });
    $('#btn-start').addEventListener('click', startTest);
  }

  function selectChip(rowSel, chip) {
    $$(rowSel + ' .chip').forEach(c => c.classList.toggle('active', c === chip));
  }

  function openSetup() {
    if (!S.index.length) return toast('There are no questions in the bank yet.');
    buildTopicChips();
    recompute();
    show('screen-setup');
  }

  /* questions matching the current difficulty + subject filters */
  function matching(diff, topic) {
    return S.index.filter(q =>
      (diff === 'mix' || q.difficulty === diff) &&
      (topic === 'mix' || q.topic === topic));
  }

  function buildTopicChips() {
    const counts = countBy(S.index, q => q.topic);
    const topics = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
    if (!topics.includes(S.setup.topic)) S.setup.topic = 'mix';

    $('#row-topic').innerHTML =
      '<button class="chip" data-topic="mix">All subjects</button>' +
      topics.map(t => '<button class="chip" data-topic="' + esc(t) + '">' + esc(t) + '</button>').join('');
  }

  function recompute() {
    const setup = S.setup;

    /* live counts on the difficulty chips, within the chosen subject */
    $$('#row-diff .chip').forEach(chip => {
      const d = chip.dataset.diff;
      const n = matching(d, setup.topic).length;
      const label = d === 'mix' ? 'Mix' : d[0].toUpperCase() + d.slice(1);
      chip.textContent = label + ' ' + n;
      chip.disabled = n === 0 && d !== setup.diff;
      chip.classList.toggle('active', d === setup.diff);
    });

    /* live counts on the subject chips, within the chosen difficulty */
    $$('#row-topic .chip').forEach(chip => {
      const t = chip.dataset.topic;
      const n = matching(setup.diff, t).length;
      const label = t === 'mix' ? 'All subjects' : t;
      chip.textContent = label + ' ' + n;
      chip.disabled = n === 0 && t !== setup.topic;
      chip.classList.toggle('active', t === setup.topic);
    });

    const available = matching(setup.diff, setup.topic).length;
    const willAsk = Math.min(setup.count, available);

    $('#val-count').textContent = setup.count;
    $('#val-time').textContent = setup.time + ' min';

    const note = $('#avail-note');
    note.classList.remove('short', 'none');
    if (available === 0) {
      note.classList.add('none');
      note.textContent = 'No questions match these filters. Widen the difficulty or subject.';
    } else if (available < setup.count) {
      note.classList.add('short');
      note.textContent = 'Only ' + available + ' question' + (available === 1 ? '' : 's') +
        ' match — the test will have ' + available + '.';
    } else {
      note.textContent = available + ' question' + (available === 1 ? '' : 's') + ' match your filters.';
    }

    const btn = $('#btn-start');
    btn.disabled = available === 0;
    btn.textContent = available === 0
      ? 'Start test'
      : 'Start test — ' + willAsk + ' question' + (willAsk === 1 ? '' : 's') + ' · ' + setup.time + ' min';
  }

  function setupLabel() {
    const s = S.setup;
    const d = s.diff === 'mix' ? 'Mixed difficulty' : s.diff[0].toUpperCase() + s.diff.slice(1);
    const t = s.topic === 'mix' ? 'All subjects' : s.topic;
    return t + ' · ' + d;
  }

  /* ══════════ exam engine ══════════ */

  async function startTest() {
    const setup = S.setup;
    const pool = matching(setup.diff, setup.topic);
    if (!pool.length) return toast('No questions match these filters.');

    const picked = (setup.shuffle ? shuffled(pool) : pool).slice(0, setup.count);
    const btn = $('#btn-start');
    btn.disabled = true;
    btn.textContent = 'Loading…';

    let qs;
    try {
      qs = await API.getByIds(picked.map(q => q.id));
    } catch (e) {
      btn.disabled = false;
      recompute();
      return toast(e.message);
    }
    if (!qs.length) {
      btn.disabled = false;
      recompute();
      return toast('Those questions could not be loaded. Try again.');
    }

    S.questions = qs;
    S.answers = new Array(qs.length).fill(null);
    S.flags = new Array(qs.length).fill(false);
    S.idx = 0;
    S.startedAt = Date.now();
    S.endsAt = Date.now() + setup.time * 60000;

    $('#q-total').textContent = qs.length;
    buildRail();
    show('screen-test');
    renderQuestion();
    startTimer();
    recompute();
  }

  function buildRail() {
    $('#rail').innerHTML = S.questions.map(() => '<i class="tick"></i>').join('');
  }

  function updateRail() {
    const ticks = $('#rail').children;
    for (let i = 0; i < ticks.length; i++) {
      ticks[i].className = 'tick' +
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
    void card.offsetWidth;                       // restart the entrance animation
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

  function startTimer() { stopTimer(); tick(); S.timerId = setInterval(tick, 500); }
  function stopTimer() { if (S.timerId) clearInterval(S.timerId); S.timerId = null; }
  function tick() {
    const left = S.endsAt - Date.now();
    const el = $('#timer');
    el.textContent = fmtClock(left);
    el.classList.toggle('low', left <= 5 * 60000);
    if (left <= 0) { stopTimer(); submit(true); }
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
        : 'Submit the test now?';
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
    S.result = { correct, wrong, skipped, total: S.questions.length, seconds, auto: !!auto };

    pushHistory({
      score: correct, total: S.questions.length,
      label: setupLabel(), at: new Date().toISOString()
    });

    API.saveAttempt({
      student_name: cfg.STUDENT_NAME,
      score: correct, total: S.questions.length,
      correct, wrong, skipped,
      seconds_taken: seconds,
      answers: S.answers,
      config: {
        requested: S.setup.count, asked: S.questions.length,
        minutes: S.setup.time, difficulty: S.setup.diff,
        topic: S.setup.topic, shuffle: S.setup.shuffle
      }
    }).catch(() => { /* a lost score record must never block the review */ });

    renderResult();
  }

  /* ══════════ result ══════════ */

  function renderResult() {
    const r = S.result;
    const pct = Math.round((r.correct / r.total) * 100);

    show('screen-result');

    $('#result-eyebrow').textContent = r.auto ? 'Time up — submitted automatically' : 'Test submitted';
    $('#score-total').textContent = r.total;
    $('#stat-correct').textContent = r.correct;
    $('#stat-wrong').textContent = r.wrong;
    $('#stat-skipped').textContent = r.skipped;

    /* the words change with how it went; the numbers never flatter */
    const plain =
      pct >= 85 ? 'Excellent' :
      pct >= 70 ? 'Strong attempt' :
      pct >= 50 ? 'Good, keep going' : 'Worth another round';
    $('#score-title').textContent = (loveOn() && S.role === 'student' && praiseFor(pct)) || plain;

    $('#score-sub').textContent = pct + '% · finished in ' + fmtDuration(r.seconds) + ' · ' + setupLabel();

    const C = 2 * Math.PI * 52;
    const ring = $('#ring-fill');
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = C;
    void ring.getBoundingClientRect();
    ring.style.transition = '';
    requestAnimationFrame(() => { ring.style.strokeDashoffset = C * (1 - r.correct / r.total); });

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
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ══════════ review ══════════ */

  function renderReview() {
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
          '<div class="rev-head"><span class="rev-n">Q' + (i + 1) + '</span>' + badge +
            (q.topic ? '<span class="rev-badge b-skip">' + esc(q.topic) + '</span>' : '') + '</div>' +
          '<p class="rev-q">' + esc(q.question) + '</p>' + opts +
          (q.explanation ? '<div class="exp"><b>Why</b>' + esc(q.explanation) + '</div>' : '') +
        '</article>'
      );
    });

    $('#review-list').innerHTML = items.length ? items.join('')
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
        if (tab === 'tests') loadAdminSets();
        if (tab === 'scores') loadAttempts();
      });
    });

    $('#btn-parse').addEventListener('click', () => checkQuestions(true));
    $('#btn-save-test').addEventListener('click', publishSet);
  }

  function batchDefaults() {
    return { topic: $('#new-topic').value.trim() || 'General', difficulty: $('#new-diff').value };
  }

  async function loadAdminSets() {
    const list = $('#admin-test-list');
    list.innerHTML = '<div class="empty">Loading…</div>';
    let sets;
    try { sets = await API.listSets(); }
    catch (e) { list.innerHTML = '<div class="empty"><strong>Could not load the bank</strong>' + esc(e.message) + '</div>'; return; }

    const total = sets.reduce((n, s) => n + s.question_count, 0);
    $('#admin-sub').textContent = total + (total === 1 ? ' question' : ' questions') +
      ' in ' + sets.length + (sets.length === 1 ? ' batch' : ' batches');

    /* offer existing subjects as autocomplete when adding more */
    $('#topic-list').innerHTML = Array.from(new Set(sets.map(s => s.topic)))
      .map(t => '<option value="' + esc(t) + '"></option>').join('');

    if (!sets.length) {
      list.innerHTML = '<div class="empty"><strong>The bank is empty</strong>Use “Add questions” to put the first batch in.</div>';
      return;
    }

    list.innerHTML = sets.map(s =>
      '<div class="tile" style="cursor:default">' +
        '<div class="tile-top"><span class="tile-title">' + esc(s.title) + '</span></div>' +
        '<div class="tile-meta">' +
          '<span>' + s.question_count + ' questions</span>' +
          '<span>' + esc(s.topic) + '</span>' +
          '<span>' + esc(s.difficulty) + '</span>' +
          '<span>' + esc(fmtDate(s.created_at)) + '</span>' +
        '</div>' +
        '<div class="row-actions">' +
          '<button class="btn btn-sub danger" data-del="' + esc(s.id) + '">Delete batch</button>' +
        '</div>' +
      '</div>'
    ).join('');

    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const s = sets.find(x => x.id === btn.dataset.del);
        if (!confirm('Delete “' + s.title + '” and its ' + s.question_count + ' questions? This cannot be undone.')) return;
        btn.disabled = true;
        try { await API.deleteSet(btn.dataset.del); toast('Batch deleted'); loadAdminSets(); }
        catch (e) { btn.disabled = false; toast(e.message); }
      });
    });
  }

  function checkQuestions(loud) {
    const status = $('#parse-status');
    const res = Parser.parse($('#new-questions').value, batchDefaults());
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
      const topics = Object.keys(countBy(res.questions, q => q.topic));
      status.classList.add('notice-ok');
      status.textContent = res.questions.length + ' question' + (res.questions.length === 1 ? '' : 's') +
        ' read correctly across ' + topics.length + (topics.length === 1 ? ' subject' : ' subjects') + '. Ready to add.';
    }
    return res.questions.length > 0;
  }

  async function publishSet() {
    const title = $('#new-title').value.trim();
    const btn = $('#btn-save-test');

    if (!title) return toast('Give the batch a name first.');
    if (!checkQuestions(false)) return toast('Fix the questions listed above, then add them.');

    btn.disabled = true;
    btn.textContent = 'Adding…';
    try {
      await API.createSet(Object.assign({ title: title }, batchDefaults()), S.parsed);
      toast('Added ' + S.parsed.length + ' questions to the bank');
      $('#new-title').value = '';
      $('#new-questions').value = '';
      $('#parse-status').classList.add('hidden');
      S.parsed = null;
      $$('[data-admin-tab]')[0].click();
    } catch (e) {
      toast(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add to the bank';
    }
  }

  async function loadAttempts() {
    const list = $('#attempt-list');
    list.innerHTML = '<div class="empty">Loading…</div>';
    let rows;
    try { rows = await API.listAttempts(); }
    catch (e) { list.innerHTML = '<div class="empty"><strong>Could not load scores</strong>' + esc(e.message) + '</div>'; return; }

    if (!rows.length) {
      list.innerHTML = '<div class="empty"><strong>No attempts yet</strong>Scores appear here once a test has been submitted.</div>';
      return;
    }

    list.innerHTML = rows.map(a => {
      const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
      const c = a.config || {};
      const setup = [
        c.topic && c.topic !== 'mix' ? c.topic : 'All subjects',
        c.difficulty && c.difficulty !== 'mix' ? c.difficulty : 'mixed difficulty',
        c.minutes ? c.minutes + ' min' : null
      ].filter(Boolean).join(' · ');

      return '<div class="tile" style="cursor:default">' +
        '<div class="tile-top">' +
          '<span class="tile-title">' + esc(a.student_name || 'Student') + '</span>' +
          '<span class="tile-go">' + a.score + '/' + a.total + '</span>' +
        '</div>' +
        '<div class="tile-meta">' +
          '<span>' + pct + '%</span>' +
          '<span>' + a.correct + ' right · ' + a.wrong + ' wrong · ' + a.skipped + ' skipped</span>' +
          '<span>' + fmtDuration(a.seconds_taken || 0) + '</span>' +
          (setup ? '<span>' + esc(setup) + '</span>' : '') +
          '<span>' + esc(fmtDate(a.created_at)) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ══════════ wiring ══════════ */

  function init() {
    initTheme();
    initLogin();
    initSetup();
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
      if (!confirm('Leave the test? Your answers will be lost.')) return;
      stopTimer();
      show('screen-home');
      renderHistory();
    });

    $$('[data-close-sheet]').forEach(el => el.addEventListener('click', closePalette));
    $$('[data-close-note]').forEach(el => el.addEventListener('click', closeNote));
    $('#btn-note').addEventListener('click', openNote);
    $('#greet-go').addEventListener('click', closeGreeting);
    $('#note-from').textContent = LOVE.from || '';

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
      if (a === 'home')   { show('screen-home'); renderHistory(); }
      if (a === 'result') show('screen-result');
    });

    document.addEventListener('keydown', e => {
      if (!$('#screen-test').classList.contains('active')) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft')  goTo(S.idx - 1);
      const n = 'abcdef'.indexOf(e.key.toLowerCase());
      if (n > -1 && n < (S.questions[S.idx] || { options: [] }).options.length) choose(n);
    });

    // a canvas animating behind a backgrounded tab is pure battery drain
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { stopAmbient(); stopLoginHearts(); return; }
      if ($('#screen-home').classList.contains('active')) startAmbient();
      if ($('#screen-login').classList.contains('active')) startLoginHearts();
    });

    window.addEventListener('beforeunload', e => {
      if ($('#screen-test').classList.contains('active')) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
