import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireStudent } from '../middleware/auth.js';
import { Attempt } from '../models/Attempt.js';
import { Category } from '../models/Category.js';
import { ValidationError } from '../lib/errors.js';
import { parseOrThrow, meUpdateSchema } from '../validation/schemas.js';

const router = Router();

// PATCH /api/me — update the logged-in student's profile (category, name, etc.)
router.patch(
  '/',
  requireStudent,
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(meUpdateSchema, req.body);
    const student = req.student;

    if ('category' in data) {
      const slug = data.category; // already trimmed + lowercased by the schema
      if (slug && !(await Category.exists({ slug }))) {
        throw new ValidationError(`Unknown category "${slug}".`);
      }
      student.category = slug; // '' clears the preference
    }
    if ('name' in data && data.name) student.name = data.name;
    if ('grade' in data) student.grade = data.grade;
    if ('roll' in data) student.roll = data.roll;

    student.lastActiveAt = new Date();
    await student.save();
    res.json({ student: student.toPublicJSON() });
  })
);

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
