import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireStudent } from '../middleware/auth.js';
import { Attempt } from '../models/Attempt.js';

const router = Router();

// GET /api/me/attempts — the logged-in student's exam history
router.get(
  '/attempts',
  requireStudent,
  asyncHandler(async (req, res) => {
    const attempts = await Attempt.find({
      student: req.student._id,
      status: { $in: ['submitted', 'expired'] },
    })
      .sort({ createdAt: -1 })
      .populate('exam', 'slug title subject');

    const items = attempts.map((a) => ({
      attemptId: a._id.toString(),
      examId: a.exam?._id?.toString() ?? null,
      examSlug: a.exam?.slug ?? null,
      examTitle: a.examTitle || a.exam?.title || 'Exam',
      subject: a.exam?.subject || '',
      score: a.score,
      percentage: a.percentage,
      status: a.status,
      timeTakenSec: a.timeTakenSec ?? null,
      submittedAt: a.submittedAt,
    }));

    res.json({ attempts: items });
  })
);

export default router;
