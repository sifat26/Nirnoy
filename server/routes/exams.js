import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireStudent } from '../middleware/auth.js';
import { Exam } from '../models/Exam.js';
import { Attempt } from '../models/Attempt.js';
import { NotFoundError } from '../lib/errors.js';
import { shuffle } from '../services/shuffle.js';
import { toStudentQuestions } from '../services/serialize.js';

const router = Router();

// GET /api/exams — published exams (meta only)
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const exams = await Exam.find({ published: true }).sort({ createdAt: -1 });
    res.json({ exams: exams.map((e) => e.toMetaJSON()) });
  })
);

// GET /api/exams/:slug — start-screen meta (no questions/answers)
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const exam = await Exam.findOne({ slug: req.params.slug.toLowerCase(), published: true });
    if (!exam) throw new NotFoundError('Exam not found or not published yet');
    res.json({ exam: exam.toMetaJSON() });
  })
);

// POST /api/exams/:slug/attempts — start an attempt; returns ANSWER-LESS questions
router.post(
  '/:slug/attempts',
  requireStudent,
  asyncHandler(async (req, res) => {
    const exam = await Exam.findOne({ slug: req.params.slug.toLowerCase(), published: true });
    if (!exam) throw new NotFoundError('Exam not found or not published yet');
    if (!exam.questions.length) throw new NotFoundError('This exam has no questions yet');

    let order = exam.questions.map((q) => q.qid);
    if (exam.shuffleQuestions) order = shuffle(order);

    const startedAt = new Date();
    const serverDeadline = new Date(startedAt.getTime() + exam.durationMinutes * 60 * 1000);

    const attempt = await Attempt.create({
      student: req.student._id,
      exam: exam._id,
      examTitle: exam.title,
      questionOrder: order,
      status: 'in_progress',
      startedAt,
      serverDeadline,
      score: { totalMarks: exam.totalMarks() },
    });

    res.status(201).json({
      attemptId: attempt._id.toString(),
      exam: {
        id: exam._id.toString(),
        slug: exam.slug,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks(),
        negativeMarking: exam.negativeMarking,
      },
      questions: toStudentQuestions(exam, order, { shuffleOptions: exam.shuffleOptions }),
      startedAt: startedAt.toISOString(),
      serverDeadline: serverDeadline.toISOString(),
    });
  })
);

export default router;
