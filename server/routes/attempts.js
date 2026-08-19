import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireStudent, requireAuth } from '../middleware/auth.js';
import { Attempt } from '../models/Attempt.js';
import { Exam } from '../models/Exam.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { gradeAnswers } from '../services/grading.js';
import { buildResultPayload } from '../services/serialize.js';

const router = Router();

const GRACE_MS = 5000; // allow a few seconds for network latency on auto-submit

// POST /api/attempts/:id/submit — server grades; correct answers never left the server
router.post(
  '/:id/submit',
  requireStudent,
  asyncHandler(async (req, res) => {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) throw new NotFoundError('Attempt not found');
    if (attempt.student.toString() !== req.student._id.toString()) throw new ForbiddenError();

    const exam = await Exam.findById(attempt.exam);
    if (!exam) throw new NotFoundError('Exam not found');

    // Idempotent: if already submitted, just return the stored result.
    if (attempt.status !== 'in_progress') {
      return res.json({ result: buildResultPayload(exam, attempt) });
    }

    const answers = (req.body && req.body.answers) || {};
    if (typeof answers !== 'object' || Array.isArray(answers)) {
      throw new ValidationError('answers must be an object of questionId -> option key');
    }

    // Accept only answers for real questions in this exam.
    const validQids = new Set(exam.questions.map((q) => q.qid));
    const clean = {};
    for (const [qid, key] of Object.entries(answers)) {
      if (validQids.has(qid) && typeof key === 'string' && key) clean[qid] = key;
    }

    const now = new Date();
    const deadline = new Date(attempt.serverDeadline).getTime();
    const isLate = now.getTime() > deadline + GRACE_MS;
    const graded = gradeAnswers(exam, clean);

    attempt.answers = clean;
    attempt.score = graded.score;
    attempt.percentage = graded.percentage;
    attempt.status = isLate ? 'expired' : 'submitted';
    attempt.submittedAt = now;
    const endMs = Math.min(now.getTime(), deadline);
    attempt.timeTakenSec = Math.max(
      0,
      Math.round((endMs - new Date(attempt.startedAt).getTime()) / 1000)
    );
    await attempt.save();

    res.json({ result: buildResultPayload(exam, attempt) });
  })
);

// GET /api/attempts/:id — graded result (owning student OR any admin)
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) throw new NotFoundError('Attempt not found');

    const isOwner = req.auth.role === 'student' && attempt.student.toString() === req.auth.sub;
    const isAdmin = req.auth.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenError();

    const exam = await Exam.findById(attempt.exam);
    if (!exam) throw new NotFoundError('Exam not found');

    res.json({ result: buildResultPayload(exam, attempt) });
  })
);

export default router;
