# Setup

Three stages. You can stop after stage 1 and still have a working app on the phone —
stage 2 is only needed so the admin and the student can share papers between devices.

---

## Stage 1 — Put it online (10 minutes)

The app works as-is. Right now it runs in **demo mode**: the sample paper in
`js/seed.js` is available, and anything the admin adds is saved only in the browser
that added it.

1. Create a new **public** repository on GitHub, e.g. `nightingale`.
2. From this folder:

   ```bash
   cd ~/exam-app
   git init -b main
   git add .
   git commit -m "Nursing entrance prep app"
   git remote add origin https://github.com/<your-username>/nightingale.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment**
   Source: *Deploy from a branch* · Branch: `main` · Folder: `/ (root)` · **Save**

4. Wait about a minute. The site is live at:

   ```
   https://<your-username>.github.io/nightingale/
   ```

5. Open that link in Safari on the iPhone → **Share → Add to Home Screen**.
   It then opens full-screen, without the browser bars, like an app.

**Sign in with:** `student` / `student123`, or `admin@exam.local` / `admin123`.
Change these in `js/config.js`.

---

## Stage 2 — Shared papers with Supabase (15 minutes)

Without this, a paper the admin adds on a laptop will not appear on the student's
iPhone. Supabase's free tier is enough for this app several times over.

### 2.1 Create the project

1. Sign up at <https://supabase.com> → **New project**.
2. Pick any name and a strong database password. Choose the region nearest you
   (Mumbai / Singapore for India).
3. Wait for it to finish provisioning.

### 2.2 Create the tables

Open **SQL Editor → New query**, paste all of this, and click **Run**:

```sql
-- ─── tables ────────────────────────────────────────────
create table if not exists tests (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  duration_minutes int  not null default 60,
  created_at       timestamptz not null default now()
);

create table if not exists questions (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid not null references tests(id) on delete cascade,
  position      int  not null default 0,
  question      text not null,
  options       jsonb not null,
  correct_index int  not null,
  explanation   text not null default ''
);
create index if not exists questions_test_idx on questions(test_id, position);

create table if not exists attempts (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid references tests(id) on delete cascade,
  student_name  text,
  score         int, total int, correct int, wrong int, skipped int,
  seconds_taken int,
  answers       jsonb,
  created_at    timestamptz not null default now()
);

-- ─── row level security ────────────────────────────────
alter table tests     enable row level security;
alter table questions enable row level security;
alter table attempts  enable row level security;

-- anyone with the link may read papers; only a signed-in admin may change them
create policy "read tests"    on tests     for select to anon, authenticated using (true);
create policy "write tests"   on tests     for all    to authenticated using (true) with check (true);

create policy "read qs"       on questions for select to anon, authenticated using (true);
create policy "write qs"      on questions for all    to authenticated using (true) with check (true);

-- the student submits a score without signing in; only the admin can read scores
create policy "add attempt"   on attempts  for insert to anon, authenticated with check (true);
create policy "read attempts" on attempts  for select to authenticated using (true);
```

### 2.3 Create the admin account

**Authentication → Users → Add user → Create new user**

- Email: `admin@exam.local`
- Password: pick a real one
- Tick **Auto Confirm User** (otherwise the login will be rejected as unconfirmed)

Then **Authentication → Sign In / Providers → Email**: turn **Confirm email** off,
and turn **Allow new users to sign up** off — you never want a stranger creating an
account that can edit the papers.

### 2.4 Paste the keys into the app

**Project Settings → API** gives you two values. Put them in `js/config.js`:

```js
SUPABASE_URL: 'https://xxxxxxxxxxxx.supabase.co',
SUPABASE_ANON_KEY: 'eyJhbGciOi....',   // the "anon" / "publishable" key
ADMIN_EMAIL: 'admin@exam.local',
```

Use the **anon** key. Never put the `service_role` key in this file — it bypasses
every rule above, and this file is public.

Commit and push. The admin now signs in with the Supabase password, and papers
published on any device show up on every device.

---

## Stage 3 — Add the real questions

Sign in as admin → **Add paper** → give it a title and duration → paste the questions:

```
Q: Which of these vitamins is fat soluble?
A) Vitamin C
B) Vitamin B12
C) Vitamin A
D) Folic acid
Ans: C
Exp: Vitamins A, D, E and K are fat soluble and are stored in the liver.

Q: The normal resting heart rate in a healthy adult is
A) 40-60 beats/min
B) 60-100 beats/min
C) 100-120 beats/min
D) 120-140 beats/min
Ans: B
Exp: Below 60 is bradycardia and above 100 is tachycardia.
```

Press **Check the questions** first — it reports the exact question number and reason
for anything it cannot read, before you publish.

The format is forgiving:

- `Q:` or `1.` both start a question
- `A)` `A.` `(A)` all work, two to six options
- `Ans:` accepts the letter (`C`), the position (`3`), or the full option text
- `Exp:` is optional, but it is what the student reads in the review screen
- questions and explanations may wrap over several lines
- a JSON array works too, if the questions are already in one

---

## What to know about the sign-in

The student login is checked inside the browser, so anyone who opens the page source
can read it. It keeps a casual visitor out of the admin screen; it is not a lock on
anything valuable. The admin login (once stage 2 is done) is real — it is checked by
Supabase, and only a signed-in admin can add or delete papers.

One consequence worth knowing: because the student's phone must download the paper to
mark it, the correct answers are technically visible to anyone who digs through the
browser's developer tools. For exam practice that is not a problem, but do not use
this app for anything where marks actually count.

---

## Changing things later

| What | Where |
|---|---|
| Student username / password | `js/config.js` |
| Admin email | `js/config.js` (and the Supabase user) |
| Default duration | `js/config.js` |
| The sample paper | `js/seed.js` |
| Colours, fonts, spacing | `css/styles.css` — all tokens are at the top |

After any edit: `git add . && git commit -m "..." && git push`. GitHub Pages
redeploys in under a minute. On the iPhone, pull down to refresh if the old version
is still showing.
