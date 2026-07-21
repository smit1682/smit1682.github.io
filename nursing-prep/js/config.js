/* ═══════════════════════════════════════════════════════
   CONFIG — the only file you normally need to edit.
   ═══════════════════════════════════════════════════════ */

window.APP_CONFIG = {

  /* ── Supabase ──────────────────────────────────────────
     Leave both blank to run in DEMO MODE: the app works
     entirely on this device using the sample paper in
     js/seed.js, and anything the admin adds is saved only
     in this browser.

     Fill these in (see SETUP.md) to share papers between
     the admin's laptop and the student's iPhone.          */
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',


  /* ── Student sign-in ───────────────────────────────────
     Checked in the browser, so treat it as a doorway, not
     a lock — anyone who views the page source can read it. */
  STUDENT_USERNAME: 'student',
  STUDENT_PASSWORD: 'student123',
  STUDENT_NAME:     'Student',


  /* ── Admin sign-in ─────────────────────────────────────
     With Supabase configured, the admin signs in against
     Supabase Auth and this password is ignored — create
     the user in the Supabase dashboard (SETUP.md step 3).
     In demo mode, the password below is used instead.     */
  ADMIN_EMAIL:            'admin@exam.local',
  ADMIN_DEMO_PASSWORD:    'admin123',


  /* ── Defaults ──────────────────────────────────────────*/
  DEFAULT_DURATION_MINUTES: 60
};
