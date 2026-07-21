/* ═══════════════════════════════════════════════════════
   API — one data layer, two backends.

   Supabase configured  → shared bank, admin signs in with
                          real Supabase Auth.
   Not configured       → demo mode on this device only,
                          backed by localStorage + seed.js.

   The student's setup screen filters against a light index
   (id, topic, difficulty) rather than downloading the whole
   bank, then fetches only the questions actually drawn.
   ═══════════════════════════════════════════════════════ */

window.API = (function () {
  const cfg = window.APP_CONFIG;
  const remote = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const LOCAL_KEY = 'nep_local_db_v2';
  const TOKEN_KEY = 'nep_admin_token';

  let token = sessionStorage.getItem(TOKEN_KEY) || null;

  function isRemote() { return remote; }
  function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

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
  /* every question in demo mode, tagged with a stable id */
  function localQuestions() {
    const out = [];
    localDB().tests.forEach(t => {
      (t.questions || []).forEach((q, i) => {
        out.push(Object.assign({}, q, {
          id: t.id + ':' + i,
          topic: q.topic || t.topic || 'General',
          difficulty: q.difficulty || t.difficulty || 'medium'
        }));
      });
    });
    return out;
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

  /* ---------------- the question bank ---------------- */

  /* light index the setup screen filters against */
  async function getIndex() {
    if (!remote) {
      return localQuestions().map(q => ({ id: q.id, topic: q.topic, difficulty: q.difficulty }));
    }
    const rows = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const page = await sb('/rest/v1/questions?select=id,topic,difficulty', {
        headers: { Range: from + '-' + (from + PAGE - 1) }
      });
      if (!page || !page.length) break;
      rows.push.apply(rows, page);
      if (page.length < PAGE) break;
    }
    return rows;
  }

  /* the questions actually drawn, in the order given */
  async function getByIds(ids) {
    if (!ids.length) return [];

    if (!remote) {
      const byId = {};
      localQuestions().forEach(q => { byId[q.id] = q; });
      return ids.map(id => byId[id]).filter(Boolean);
    }

    const rows = [];
    const CHUNK = 60;                       // keeps the URL a sane length
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const list = slice.map(id => '"' + id + '"').join(',');
      const page = await sb('/rest/v1/questions?select=id,question,options,correct_index,explanation,topic,difficulty&id=in.(' + encodeURIComponent(list) + ')');
      rows.push.apply(rows, page || []);
    }
    const byId = {};
    rows.forEach(q => { byId[q.id] = q; });
    return ids.map(id => byId[id]).filter(Boolean);
  }

  /* ---------------- upload batches ---------------- */

  async function listSets() {
    if (!remote) {
      return localDB().tests
        .slice()
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map(t => ({
          id: t.id, title: t.title,
          topic: t.topic || 'General',
          difficulty: t.difficulty || 'medium',
          created_at: t.created_at,
          question_count: (t.questions || []).length
        }));
    }
    const rows = await sb('/rest/v1/tests?select=id,title,topic,difficulty,created_at,questions(count)&order=created_at.desc');
    return (rows || []).map(t => ({
      id: t.id, title: t.title,
      topic: t.topic || 'General',
      difficulty: t.difficulty || 'medium',
      created_at: t.created_at,
      question_count: (t.questions && t.questions[0] && t.questions[0].count) || 0
    }));
  }

  async function createSet(meta, questions) {
    if (!remote) {
      const db = localDB();
      db.tests.push({
        id: uid(), title: meta.title,
        topic: meta.topic, difficulty: meta.difficulty,
        duration_minutes: 60,
        created_at: new Date().toISOString(),
        questions: questions.map(q => Object.assign({}, q))
      });
      saveLocal(db);
      return;
    }
    const inserted = await sb('/rest/v1/tests', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ title: meta.title, topic: meta.topic, difficulty: meta.difficulty, duration_minutes: 60 })
    });
    const set = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!set || !set.id) throw new Error('The questions were not saved. Please try again.');

    const rows = questions.map((q, i) => ({
      test_id: set.id, position: i,
      question: q.question, options: q.options,
      correct_index: q.correct_index, explanation: q.explanation || '',
      topic: q.topic, difficulty: q.difficulty
    }));

    try {
      /* send in chunks so a large paste doesn't hit the request size limit */
      const CHUNK = 100;
      for (let i = 0; i < rows.length; i += CHUNK) {
        await sb('/rest/v1/questions', { method: 'POST', body: JSON.stringify(rows.slice(i, i + CHUNK)) });
      }
    } catch (e) {
      // don't leave a half-saved batch behind
      try { await sb('/rest/v1/tests?id=eq.' + set.id, { method: 'DELETE' }); } catch (_) {}
      throw e;
    }
  }

  async function deleteSet(id) {
    if (!remote) {
      const db = localDB();
      db.tests = db.tests.filter(t => t.id !== id);
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
    if (!remote) return localDB().attempts.slice().reverse();
    return (await sb('/rest/v1/attempts?select=*&order=created_at.desc&limit=100')) || [];
  }

  return {
    isRemote, adminLogin, signOut,
    getIndex, getByIds,
    listSets, createSet, deleteSet,
    saveAttempt, listAttempts
  };
})();
