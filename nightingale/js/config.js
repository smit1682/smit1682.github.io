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
  SUPABASE_URL: 'https://oxwmtebmmqqbwibqppmw.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_yEI5AYf0DPar9lORjJeRnA_sV0YAFjL',


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
  DEFAULT_DURATION_MINUTES: 60,


  /* ── For her ───────────────────────────────────────────
     Everything personal lives here. Edit freely — the words
     below are a starting point, and they will mean more in
     your own.

     The greeting appears once a day, the first time she opens
     the app. The exam screen is deliberately left plain: she
     is concentrating there, and that is its own kind of care. */
  LOVE: {
    enabled: true,

    name:     'Drashti',
    nickname: 'Golu',
    from:     'Smit',

    /* the line under her name, one per day, in rotation */
    greetings: [
      'You have got this. You always do.',
      'Fifty questions today. A whole life after.',
      'Study hard, Golu. I am right here.',
      'Your dream is my favourite project.',
      'One question at a time. I am already proud.',
      'Be gentle with yourself today.',
      'The exam is temporary. We are not.',
      'Whatever the score says, you are more than it.',
      'Go be brilliant, then come tell me everything.',
      'Take a breath. You know more than you think.',
      'I believe in you on the days you do not.',
      'Every question you attempt is a step closer.',
      'Coffee, questions, and you. A good day.',
      'Nurse Drashti has a nice ring to it.'
    ],

    /* the longer notes behind the ♡ on the home screen */
    notes: [
      'I built this whole thing just so studying feels a little less lonely. Every time you open it, that is me saying good luck.',
      'You are allowed to have a bad practice score. It is practice. That is the entire point of it.',
      'When this is over and you are wearing that MSc, I am going to be unbearable about how proud I am. Fair warning.',
      'Tired is allowed. Quitting is not. Close the app, sleep, come back tomorrow. It will still be here.',
      'I do not need you to be perfect at this. I just like watching you go after something you want.'
    ],

    /* shown on the result screen, chosen by how it went */
    praise: {
      great: ['That is brilliant, Golu.', 'Look at you go.', 'You made that look easy.'],
      good:  ['Solid work, Golu.', 'That is real progress.', 'Getting stronger every time.'],
      okay:  ['Good. Now review the wrong ones.', 'This is how it builds. Keep at it.', 'Every mistake here is one less in the exam.'],
      tough: ['A hard one. It happens.', 'Now you know what to study. That is useful.', 'Not your day. Tomorrow can be.']
    }
  }
};
