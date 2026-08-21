import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { Exam } from '../models/Exam.js';
import { Attempt } from '../models/Attempt.js';
import { Student } from '../models/Student.js';
import { Category } from '../models/Category.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { normalizeExamInput, slugify } from '../validation/schemas.js';
import { toCsv } from '../lib/csv.js';
import { parseJsonLoose } from '../lib/json.js';
import adminCategoriesRouter from './adminCategories.js';

const router = Router();

// Every admin route requires a valid admin token.
router.use(requireAdmin);

// Admin-managed exam categories (CRUD). Inherits requireAdmin above.
router.use('/categories', adminCategoriesRouter);

// ---------- helpers ----------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/json' || file.originalname.toLowerCase().endsWith('.json');
    cb(ok ? null : new ValidationError('Only .json files are allowed'), ok);
  },
});

/** Run multer for a single 'file' field and convert its errors to 400s. */
function uploadJson(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ValidationError) return next(err);
    next(new ValidationError(err.message || 'File upload failed'));
  });
}

async function uniqueSlug(base, excludeId) {
  let slug = base;
  let n = 1;
  const filter = () => (excludeId ? { slug, _id: { $ne: excludeId } } : { slug });
  // eslint-disable-next-line no-await-in-loop
  while (await Exam.exists(filter())) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function toAdminExamJSON(exam, stats) {
  return {
    ...exam.toMetaJSON(),
    attempts: stats?.attempts ?? 0,
    avgPercentage: stats ? Math.round(stats.avgPct || 0) : 0,
    questions: exam.questions.map((q) => ({
      qid: q.qid,
      question: q.question,
      options: q.options.map((o) => ({ key: o.key, text: o.text })),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      marks: q.marks,
    })),
  };
}

/** Normalize + validate a category slug against known categories. '' clears it. */
async function resolveCategory(slug) {
  const c = String(slug ?? '').trim().toLowerCase();
  if (!c) return '';
  if (!(await Category.exists({ slug: c }))) {
    throw new ValidationError(`Unknown category "${c}". Create it first or leave it blank.`);
  }
  return c;
}

async function createExamFromInput(raw, adminId, category) {
  const normalized = normalizeExamInput(raw);
  normalized.slug = await uniqueSlug(normalized.slug);
  normalized.category = await resolveCategory(category);
  return Exam.create({ ...normalized, createdBy: adminId });
}

// ---------- exams ----------

// GET /api/admin/exams — all exams (incl. unpublished) + attempt stats
router.get(
  '/exams',
  asyncHandler(async (_req, res) => {
    const exams = await Exam.find().sort({ createdAt: -1 });
    const stats = await Attempt.aggregate([
      { $match: { status: { $in: ['submitted', 'expired'] } } },
      { $group: { _id: '$exam', attempts: { $sum: 1 }, avgPct: { $avg: '$percentage' } } },
    ]);
    const statMap = new Map(stats.map((s) => [s._id.toString(), s]));
    res.json({
      exams: exams.map((e) => {
        const s = statMap.get(e._id.toString());
        return { ...e.toMetaJSON(), attempts: s?.attempts || 0, avgPercentage: s ? Math.round(s.avgPct || 0) : 0 };
      }),
    });
  })
);

// POST /api/admin/exams — create from pasted JSON body
router.post(
  '/exams',
  asyncHandler(async (req, res) => {
    const exam = await createExamFromInput(req.body, req.admin._id, req.body.category);
    res.status(201).json({ exam: toAdminExamJSON(exam) });
  })
);

// POST /api/admin/exams/upload — create from an uploaded .json file
router.post(
  '/exams/upload',
  uploadJson,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError('No file uploaded (expected form field "file")');
    let parsed;
    try {
      parsed = parseJsonLoose(req.file.buffer.toString('utf-8'));
    } catch {
      throw new ValidationError('The uploaded file is not valid JSON');
    }
    const exam = await createExamFromInput(parsed, req.admin._id, req.body.category);
    res.status(201).json({ exam: toAdminExamJSON(exam) });
  })
);

// GET /api/admin/exams/:id — full exam incl. correct answers (admin only)
router.get(
  '/exams/:id',
  asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw new NotFoundError('Exam not found');
    res.json({ exam: toAdminExamJSON(exam) });
  })
);

// PATCH /api/admin/exams/:id — partial meta update (publish toggle, rename, etc.)
const EDITABLE = [
  'title',
  'description',
  'subject',
  'grade',
  'durationMinutes',
  'published',
  'shuffleQuestions',
  'shuffleOptions',
  'negativeMarking',
];
router.patch(
  '/exams/:id',
  asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw new NotFoundError('Exam not found');
    for (const key of EDITABLE) {
      if (key in req.body) exam[key] = req.body[key];
    }
    if ('category' in req.body) {
      exam.category = await resolveCategory(req.body.category);
    }
    if (req.body.slug) {
      exam.slug = await uniqueSlug(slugify(req.body.slug), exam._id);
    }
    await exam.save();
    res.json({ exam: toAdminExamJSON(exam) });
  })
);

// PUT /api/admin/exams/:id — replace content + meta (re-validates questions)
router.put(
  '/exams/:id',
  asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw new NotFoundError('Exam not found');
    const normalized = normalizeExamInput(req.body);
    const desiredSlug = req.body.slug ? slugify(req.body.slug) : exam.slug;
    exam.slug = await uniqueSlug(desiredSlug, exam._id);
    exam.title = normalized.title;
    exam.description = normalized.description;
    exam.subject = normalized.subject;
    exam.grade = normalized.grade;
    exam.durationMinutes = normalized.durationMinutes;
    exam.negativeMarking = normalized.negativeMarking;
    exam.shuffleQuestions = normalized.shuffleQuestions;
    exam.shuffleOptions = normalized.shuffleOptions;
    exam.questions = normalized.questions;
    if ('category' in req.body) {
      exam.category = await resolveCategory(req.body.category);
    }
    if ('published' in req.body) exam.published = Boolean(req.body.published);
    await exam.save();
    res.json({ exam: toAdminExamJSON(exam) });
  })
);

// DELETE /api/admin/exams/:id
router.delete(
  '/exams/:id',
  asyncHandler(async (req, res) => {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) throw new NotFoundError('Exam not found');
    res.json({ ok: true });
  })
);

// ---------- per-exam attempts: leaderboard + question difficulty ----------

async function loadRankedAttempts(examId) {
  return Attempt.find({ exam: examId, status: { $in: ['submitted', 'expired'] } })
    .sort({ percentage: -1, timeTakenSec: 1 })
    .populate('student', 'name loginId grade roll');
}

router.get(
  '/exams/:id/attempts',
  asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw new NotFoundError('Exam not found');
    const attempts = await loadRankedAttempts(exam._id);

    const leaderboard = attempts.map((a, i) => ({
      rank: i + 1,
      attemptId: a._id.toString(),
      studentId: a.student?._id?.toString() ?? null,
      studentName: a.student?.name ?? 'Unknown',
      loginId: a.student?.loginId ?? '',
      grade: a.student?.grade ?? '',
      roll: a.student?.roll ?? '',
      percentage: a.percentage,
      marksObtained: a.score?.marksObtained ?? 0,
      totalMarks: a.score?.totalMarks ?? 0,
      correct: a.score?.correct ?? 0,
      wrong: a.score?.wrong ?? 0,
      unanswered: a.score?.unanswered ?? 0,
      timeTakenSec: a.timeTakenSec ?? null,
      submittedAt: a.submittedAt,
      status: a.status,
    }));

    // Per-question difficulty across all attempts.
    const qStats = new Map(
      exam.questions.map((q) => [q.qid, { qid: q.qid, question: q.question, correct: 0, wrong: 0, unanswered: 0 }])
    );
    for (const a of attempts) {
      const ans = a.answers instanceof Map ? a.answers : new Map(Object.entries(a.answers || {}));
      for (const q of exam.questions) {
        const st = qStats.get(q.qid);
        const sel = ans.get(q.qid);
        if (sel == null || sel === '') st.unanswered += 1;
        else if (sel === q.correctAnswer) st.correct += 1;
        else st.wrong += 1;
      }
    }
    const questionStats = exam.questions.map((q) => {
      const st = qStats.get(q.qid);
      const answered = st.correct + st.wrong;
      return { ...st, accuracy: answered ? Math.round((st.correct / answered) * 100) : 0 };
    });

    res.json({
      summary: {
        exam: exam.toMetaJSON(),
        totalAttempts: attempts.length,
        avgPercentage: attempts.length
          ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
          : 0,
        highest: attempts.length ? attempts[0].percentage : 0,
      },
      leaderboard,
      questionStats,
    });
  })
);

// GET /api/admin/exams/:id/attempts/export — CSV (UTF-8 BOM so Excel shows Bengali)
router.get(
  '/exams/:id/attempts/export',
  asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw new NotFoundError('Exam not found');
    const attempts = await loadRankedAttempts(exam._id);
    const headers = [
      'Rank', 'Name', 'Login ID', 'Class', 'Roll', 'Percentage', 'Marks', 'Total',
      'Correct', 'Wrong', 'Unanswered', 'Time (s)', 'Submitted', 'Status',
    ];
    const rows = attempts.map((a, i) => [
      i + 1,
      a.student?.name ?? 'Unknown',
      a.student?.loginId ?? '',
      a.student?.grade ?? '',
      a.student?.roll ?? '',
      a.percentage,
      a.score?.marksObtained ?? 0,
      a.score?.totalMarks ?? 0,
      a.score?.correct ?? 0,
      a.score?.wrong ?? 0,
      a.score?.unanswered ?? 0,
      a.timeTakenSec ?? '',
      a.submittedAt ? new Date(a.submittedAt).toISOString() : '',
      a.status,
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.slug}-results.csv"`);
    res.send(`﻿${toCsv(headers, rows)}`);
  })
);

// ---------- students ----------

// GET /api/admin/students — all students + aggregate stats
router.get(
  '/students',
  asyncHandler(async (_req, res) => {
    const students = await Student.find().sort({ createdAt: -1 });
    const agg = await Attempt.aggregate([
      { $match: { status: { $in: ['submitted', 'expired'] } } },
      {
        $group: {
          _id: '$student',
          attempts: { $sum: 1 },
          avgPct: { $avg: '$percentage' },
          bestPct: { $max: '$percentage' },
          lastAt: { $max: '$submittedAt' },
        },
      },
    ]);
    const map = new Map(agg.map((s) => [s._id.toString(), s]));
    res.json({
      students: students.map((s) => {
        const st = map.get(s._id.toString());
        return {
          ...s.toPublicJSON(),
          attempts: st?.attempts || 0,
          avgPercentage: st ? Math.round(st.avgPct || 0) : 0,
          bestPercentage: st?.bestPct ?? 0,
          lastActivity: st?.lastAt ?? s.lastActiveAt,
        };
      }),
    });
  })
);

// GET /api/admin/students/:id — one student + their attempts
router.get(
  '/students/:id',
  asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if (!student) throw new NotFoundError('Student not found');
    const attempts = await Attempt.find({
      student: student._id,
      status: { $in: ['submitted', 'expired'] },
    })
      .sort({ createdAt: -1 })
      .populate('exam', 'slug title subject');
    res.json({
      student: student.toPublicJSON(),
      attempts: attempts.map((a) => ({
        attemptId: a._id.toString(),
        examTitle: a.examTitle || a.exam?.title || 'Exam',
        examSlug: a.exam?.slug ?? null,
        subject: a.exam?.subject || '',
        percentage: a.percentage,
        score: a.score,
        timeTakenSec: a.timeTakenSec ?? null,
        submittedAt: a.submittedAt,
        status: a.status,
      })),
    });
  })
);

// ---------- dashboard analytics ----------

router.get(
  '/analytics',
  asyncHandler(async (_req, res) => {
    const [studentCount, examCount, publishedCount, attemptAgg, recent] = await Promise.all([
      Student.countDocuments(),
      Exam.countDocuments(),
      Exam.countDocuments({ published: true }),
      Attempt.aggregate([
        { $match: { status: { $in: ['submitted', 'expired'] } } },
        { $group: { _id: null, count: { $sum: 1 }, avgPct: { $avg: '$percentage' } } },
      ]),
      Attempt.find({ status: { $in: ['submitted', 'expired'] } })
        .sort({ submittedAt: -1 })
        .limit(8)
        .populate('student', 'name')
        .populate('exam', 'title slug'),
    ]);
    const a = attemptAgg[0] || { count: 0, avgPct: 0 };
    res.json({
      totals: {
        students: studentCount,
        exams: examCount,
        publishedExams: publishedCount,
        attempts: a.count,
        avgPercentage: Math.round(a.avgPct || 0),
      },
      recent: recent.map((r) => ({
        attemptId: r._id.toString(),
        studentName: r.student?.name ?? 'Unknown',
        examTitle: r.exam?.title ?? r.examTitle ?? 'Exam',
        examSlug: r.exam?.slug ?? null,
        percentage: r.percentage,
        submittedAt: r.submittedAt,
      })),
    });
  })
);

export default router;
