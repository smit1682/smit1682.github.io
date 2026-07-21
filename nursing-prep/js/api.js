/* ═══════════════════════════════════════════════════════
   API — one data layer, two backends.

   Supabase configured  → shared data, admin signs in with
                          real Supabase Auth.
   Not configured       → demo mode on this device only,
                          backed by localStorage + seed.js.
   ═══════════════════════════════════════════════════════ */

window.API = (function () {
  const cfg = window.APP_CONFIG;
  const remote = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const LOCAL_KEY = 'nep_local_db_v1';
  const TOKEN_KEY = 'nep_admin_token';

  let token = sessionStorage.getItem(TOKEN_KEY) || null;

  /* ---------------- shared helpers ---------------- */

  function isRemote() { return remote; }

  function uid() {
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------- localStorage backend ---------------- */

  function localDB() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to a fresh seed */ }
    const fresh = { tests: JSON.parse(JSON.stringify(window.SEED_TESTS || [])), attempts: [] };
    saveLocal(fresh);
    return fresh;
  }
  function saveLocal(db) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(db)); }
    catch (e) { throw new Error('This browser has no room left to save. Free up storage and try again.'); }
  }

  /* ---------------- Supabase REST ---------------- */

  async function sb(path, opts = {}) {
    const headers = Object.assign({
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + (token || cfg.SUPABASE_ANON_KEY),
      'Content-Type': 'application/json'
    }, opts.headers || {});

    let res;
    try {
      res = await fetch(cfg.SUPABASE_URL.replace(/\/$/, '') + path, Object.assign({}, opts, { headers }));
    } catch (e) {
      throw new Error('Cannot reach the server. Check the internet connection and try again.');
    }

    if (res.status === 204) return null;
    const body = await res.text();
    let data = null;
    if (body) { try { data = JSON.parse(body); } catch (e) { data = body; } }

    if (!res.ok) {
      const msg = (data && (data.message || data.error_description || data.error || data.hint)) || ('Request failed (' + res.status + ')');
      if (res.status === 401 || res.status === 403) {
        throw new Error('Not allowed. The admin session may have expired — sign out and sign in again.');
      }
      throw new Error(msg);
    }
    return data;
  }

  /* ---------------- auth ---------------- */

  async function adminLogin(email, password) {
    if (!remote) {
      const ok = email.trim().toLowerCase() === String(cfg.ADMIN_EMAIL).toLowerCase() &&
                 password === cfg.ADMIN_DEMO_PASSWORD;
      if (!ok) throw new Error('That email and password do not match.');
      token = null;
      return { email: cfg.ADMIN_EMAIL };
    }
    const data = await sb('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password })
    });
    if (!data || !data.access_token) throw new Error('That email and password do not match.');
    token = data.access_token;
    sessionStorage.setItem(TOKEN_KEY, token);
    return data.user || { email: email.trim() };
  }

  function signOut() {
    token = null;
    sessionStorage.removeItem(TOKEN_KEY);
  }

  /* ---------------- tests ---------------- */

  async function listTests() {
    if (!remote) {
      return localDB().tests
        .slice()
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map(t => ({
          id: t.id, title: t.title,
          duration_minutes: t.duration_minutes,
          created_at: t.created_at,
          question_count: (t.questions || []).length
        }));
    }
    const rows = await sb('/rest/v1/tests?select=id,title,duration_minutes,created_at,questions(count)&order=created_at.desc');
    return (rows || []).map(t => ({
      id: t.id, title: t.title,
      duration_minutes: t.duration_minutes,
      created_at: t.created_at,
      question_count: (t.questions && t.questions[0] && t.questions[0].count) || 0
    }));
  }

  async function getQuestions(testId) {
    if (!remote) {
      const t = localDB().tests.find(t => t.id === testId);
      return t ? (t.questions || []).map(q => Object.assign({}, q)) : [];
    }
    const rows = await sb('/rest/v1/questions?select=question,options,correct_index,explanation&test_id=eq.' +
                          encodeURIComponent(testId) + '&order=position.asc');
    return rows || [];
  }

  async function createTest(title, durationMinutes, questions) {
    if (!remote) {
      const db = localDB();
      db.tests.push({
        id: uid(), title, duration_minutes: durationMinutes,
        created_at: new Date().toISOString(),
        questions: questions.map(q => Object.assign({}, q))
      });
      saveLocal(db);
      return;
    }
    const inserted = await sb('/rest/v1/tests', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ title, duration_minutes: durationMinutes })
    });
    const test = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!test || !test.id) throw new Error('The paper was not saved. Please try again.');

    const rows = questions.map((q, i) => ({
      test_id: test.id, position: i,
      question: q.question, options: q.options,
      correct_index: q.correct_index, explanation: q.explanation || ''
    }));

    try {
      await sb('/rest/v1/questions', { method: 'POST', body: JSON.stringify(rows) });
    } catch (e) {
      // don't leave a paper with no questions behind
      try { await sb('/rest/v1/tests?id=eq.' + test.id, { method: 'DELETE' }); } catch (_) {}
      throw e;
    }
  }

  async function deleteTest(id) {
    if (!remote) {
      const db = localDB();
      db.tests = db.tests.filter(t => t.id !== id);
      db.attempts = db.attempts.filter(a => a.test_id !== id);
      saveLocal(db);
      return;
    }
    await sb('/rest/v1/tests?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
  }

  /* ---------------- attempts ---------------- */

  async function saveAttempt(a) {
    if (!remote) {
      const db = localDB();
      db.attempts.push(Object.assign({ id: uid(), created_at: new Date().toISOString() }, a));
      saveLocal(db);
      return;
    }
    await sb('/rest/v1/attempts', { method: 'POST', body: JSON.stringify(a) });
  }

  async function listAttempts() {
    if (!remote) {
      const db = localDB();
      const titleOf = id => (db.tests.find(t => t.id === id) || {}).title || 'Deleted paper';
      return db.attempts.slice().reverse().map(a => Object.assign({}, a, { test_title: titleOf(a.test_id) }));
    }
    const rows = await sb('/rest/v1/attempts?select=*,tests(title)&order=created_at.desc&limit=100');
    return (rows || []).map(a => Object.assign({}, a, { test_title: (a.tests && a.tests.title) || 'Deleted paper' }));
  }

  return {
    isRemote, adminLogin, signOut,
    listTests, getQuestions, createTest, deleteTest,
    saveAttempt, listAttempts
  };
})();
