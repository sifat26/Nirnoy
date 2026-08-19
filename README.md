# MCQ Exam Platform

A full-stack, database-backed MCQ exam/quiz platform for SSC/HSC students (Bangladesh curriculum). Admins upload question sets as JSON and see every student's scores; students register once (phone/email + PIN) and take shared exams from any device, with their history following them. **Grading happens on the server** — correct answers are never sent to the browser before submission.

- **Frontend:** React 19 + Vite + Tailwind CSS v4 (React Router v7)
- **Backend:** Node + Express 5 + Mongoose 9 (MongoDB)
- **Auth:** JWT (bcryptjs-hashed PINs/passwords), role-based (student / admin)

---

## Features

**Students**
- Register with name + phone/email + PIN; log in from any device (portable account)
- Browse published exams; open a shared exam link
- Take exams on one scrollable page: sticky **server-authoritative** countdown, question navigation, progress indicator, confirm-to-submit
- See server-graded results with full review + explanations
- Personal **Profile** with attempt history and stats (count / average / best)

**Admins**
- Dashboard with totals + recent activity
- Create exams by **pasting JSON** or **uploading a `.json` file** (validated; errors point to the offending question)
- Publish / unpublish, copy share links, delete
- Per-exam **leaderboard** + per-question difficulty stats + **CSV export**
- Student directory with per-student drill-in and aggregate stats

**Platform**
- Server-side grading & answer-stripping (answers/explanations withheld until submit)
- Server-authoritative timer (absolute `serverDeadline`; robust to tab throttling; auto-submit on expiry)
- Attempt **ownership checks** (one student cannot read another's attempt)
- Optional per-exam question / option shuffling and negative marking
- Bengali support (Noto Sans Bengali)
- Clean AI extension seams (disabled in v1) — see below

---

## Quick Start

Prerequisites: **Node 18+** and a **MongoDB** instance (local `mongod`, or a free MongoDB Atlas cluster).

```bash
cd mcq-exam-platform
npm install

# 1. Configure environment
cp .env.example .env
#   then edit .env — set MONGODB_URI, a long random JWT_SECRET, and admin credentials

# 2. Seed the admin account + a sample exam
npm run seed

# 3. Run frontend (5173) + API (4000) together
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` → `http://localhost:4000`.

**Log in as admin** at `/admin/login` with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set in `.env`.

### Environment variables (`.env`)

| Var | Purpose |
|---|---|
| `PORT` | API port (default `4000`) |
| `NODE_ENV` | `development` / `production` |
| `MONGODB_URI` | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | Secret for signing login tokens — use a long random string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin account, created/updated by `npm run seed` |
| `CLIENT_URL` | Frontend origin, used for CORS (default `http://localhost:5173`) |
| `ANTHROPIC_API_KEY` | **Optional, unused in v1.** Reserved for future AI features |

### Production

```bash
npm run build      # bundles the client to dist/
npm run start      # Express serves dist/ + /api on one process (PORT)
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run client + API concurrently (dev) |
| `npm run dev:client` / `npm run dev:server` | Run one side only |
| `npm run seed` | Create/update admin + import the sample exam |
| `npm run build` | Production client build → `dist/` |
| `npm run start` | Run the server in production (serves `dist/` + `/api`) |
| `npm run lint` | oxlint |
| `npm run preview` | Preview the production client build |

---

## Managing exams

Admins add exams from **Admin → Exams → + New Exam**, either by pasting JSON or uploading a `.json` file. The accepted format (same as the sample in [public/exams/ssc-physics-ch3.json](public/exams/ssc-physics-ch3.json)):

```json
{
  "examTitle": "Exam Title",
  "duration_minutes": 30,
  "subject": "Physics",
  "grade": "SSC",
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correct_answer": "B",
      "explanation": "Why B is correct"
    }
  ]
}
```

Rules (validated on the server, via zod): each question needs text, **≥2 options**, and a `correct_answer` that exists among its option keys. Upload errors report the offending question index. UTF-8 BOM (common from Windows editors) is tolerated. New exams start **unpublished** — publish when ready, then share the link (`/exam/<slug>/start`).

---

## Project structure

```
server/
  index.js            # Express app + middleware + static serve + /api mount (exports app + start())
  db.js  env.js  seed.js
  models/       Student.js  Admin.js  Exam.js  Attempt.js
  middleware/   auth.js (requireStudent/requireAdmin)  error.js  rateLimit.js
  routes/       auth.js  exams.js  attempts.js  me.js  admin.js
  services/     grading.js  shuffle.js  serialize.js  ai.js (disabled stub)
  validation/   schemas.js  (zod)
  lib/          errors.js  tokens.js  asyncHandler.js  csv.js  json.js (BOM-tolerant parse)
src/
  api/          client.js  auth.js  exams.js  attempts.js  admin.js  index.js (barrel)
  context/      AuthContext.jsx
  components/    RequireAuth  Header  Spinner  ui (StatTile/Badge/ErrorBanner/EmptyState)
  lib/          format.js
  pages/        Home  Login  Register  Profile  ExamStart  ExamTake  Results
    admin/      AdminLogin  AdminLayout  Dashboard  Exams  ExamDetail  Students  StudentDetail
  App.jsx  main.jsx  index.css
public/exams/   ssc-physics-ch3.json   # sample, imported by `npm run seed`
```

---

## API overview

**Auth** — `POST /api/auth/student/register` · `POST /api/auth/student/login` · `POST /api/auth/admin/login` · `GET /api/auth/me`

**Student** — `GET /api/exams` (published, meta only) · `GET /api/exams/:slug` · `POST /api/exams/:slug/attempts` (starts attempt, **answer-less** questions + `serverDeadline`) · `POST /api/attempts/:id/submit` (server grades) · `GET /api/attempts/:id` (owner or admin) · `GET /api/me/attempts`

**Admin** (`requireAdmin`) — `GET/POST/PATCH/PUT/DELETE /api/admin/exams[/:id]` · `POST /api/admin/exams/upload` · `GET /api/admin/exams/:id/attempts` (leaderboard + question stats) · `GET /api/admin/exams/:id/attempts/export` (CSV) · `GET /api/admin/students[/:id]` · `GET /api/admin/analytics`

---

## Security notes

- **Server-side grading & answer-stripping:** `correctAnswer`/`explanation` are never serialized into exam-start or in-progress responses — only after submission, in the graded review.
- **Server-authoritative timer:** each attempt stores an absolute `serverDeadline`; the client only displays remaining time, and the server clamps/expires on submit.
- **Ownership checks:** fetching another student's attempt returns `403`.
- **Hashing:** PINs and admin passwords are bcryptjs-hashed; JWTs signed with `JWT_SECRET`.
- **CORS** locked to `CLIENT_URL`; auth endpoints rate-limited; all input validated with zod.
- The JWT is stored in `localStorage` (`mcq_token`). For higher-security deployments, moving to an httpOnly cookie is a documented future hardening step.

---

## AI extension points (v1: disabled)

The backend is structured so AI features can drop in later behind `ANTHROPIC_API_KEY`, with no v1 behavior change:

- [server/services/ai.js](server/services/ai.js) is a documented no-op stub. When a key is present, wire it to Claude for:
  - **Question generation** from a topic/notes → `POST /api/admin/exams/generate` (UI hook reserved in admin "New exam")
  - **Auto-explanations** for questions lacking one
  - **Personalized post-exam feedback** → an attempt-result field (UI hook reserved in Results)

Leave `ANTHROPIC_API_KEY` blank to keep everything AI-free.

---

## Tech stack

React 19 · React Router v7 · Vite · Tailwind CSS v4 · Node · Express 5 · Mongoose 9 · MongoDB · Zod · bcryptjs · jsonwebtoken · multer · Noto Sans Bengali

## License

MIT
"# Nirnoy" 
