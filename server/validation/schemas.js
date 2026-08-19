import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{5,}$/;

/** Turn a title into a URL-safe slug. Falls back to random for non-Latin (e.g. Bengali) titles. */
export function slugify(text) {
  const base = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  if (base) return base;
  return `exam-${Math.random().toString(36).slice(2, 8)}`;
}

export function detectLoginType(loginId) {
  if (EMAIL_RE.test(loginId)) return 'email';
  if (PHONE_RE.test(loginId)) return 'phone';
  return null;
}

function formatIssues(error) {
  return error.issues.map((i) => {
    const path = i.path.join('.');
    return path ? `${path}: ${i.message}` : i.message;
  });
}

// ---------- Auth ----------

export const studentRegisterSchema = z.object({
  name: z.string().trim().min(2, 'name must be at least 2 characters').max(80),
  loginId: z
    .string()
    .trim()
    .min(3)
    .refine((v) => detectLoginType(v) !== null, 'must be a valid email or phone number'),
  pin: z.string().min(4, 'PIN/password must be at least 4 characters').max(64),
  grade: z.string().trim().max(40).optional().default(''),
  roll: z.string().trim().max(40).optional().default(''),
});

export const studentLoginSchema = z.object({
  loginId: z.string().trim().min(3),
  pin: z.string().min(1),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

// ---------- Exam upload / create ----------

const questionInputSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  question: z.string().trim().min(1, 'question text is required'),
  options: z.record(z.string(), z.string().trim().min(1, 'option text cannot be empty')),
  correct_answer: z.string().trim().min(1, 'correct_answer is required'),
  explanation: z.string().optional().default(''),
  marks: z.coerce.number().min(0).optional().default(1),
});

const examUploadSchema = z.object({
  title: z.string().trim().min(1, 'title/examTitle is required').max(200),
  durationMinutes: z.coerce.number().int().min(1, 'duration must be at least 1 minute').max(600),
  description: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  grade: z.string().optional().default(''),
  slug: z.string().trim().toLowerCase().optional(),
  published: z.boolean().optional().default(false),
  shuffleQuestions: z.boolean().optional().default(false),
  shuffleOptions: z.boolean().optional().default(false),
  negativeMarking: z.coerce.number().min(0).optional().default(0),
  questions: z.array(questionInputSchema).min(1, 'at least one question is required'),
});

/** Accept both { examTitle, duration_minutes, questions:[{correct_answer}] } and camelCase. */
function canonicalize(raw) {
  const r = raw || {};
  return {
    title: r.title ?? r.examTitle,
    durationMinutes: r.durationMinutes ?? r.duration_minutes,
    description: r.description,
    subject: r.subject,
    grade: r.grade ?? r.class,
    slug: r.slug,
    published: r.published,
    shuffleQuestions: r.shuffleQuestions,
    shuffleOptions: r.shuffleOptions,
    negativeMarking: r.negativeMarking,
    questions: Array.isArray(r.questions)
      ? r.questions.map((q) => ({
          id: q?.id,
          question: q?.question,
          options: q?.options,
          correct_answer: q?.correct_answer ?? q?.correctAnswer,
          explanation: q?.explanation ?? '',
          marks: q?.marks,
        }))
      : r.questions,
  };
}

/**
 * Validate + normalize an uploaded/created exam into the Exam model shape.
 * Throws ValidationError (400) with a `details` array of human-readable messages.
 */
export function normalizeExamInput(raw) {
  const parsed = examUploadSchema.safeParse(canonicalize(raw));
  if (!parsed.success) {
    throw new ValidationError('Exam data is invalid', formatIssues(parsed.error));
  }
  const data = parsed.data;

  // Semantic checks that are clearer done by hand than in zod.
  const details = [];
  const questions = data.questions.map((q, idx) => {
    const optionKeys = Object.keys(q.options);
    if (optionKeys.length < 2) {
      details.push(`Question ${idx + 1}: needs at least 2 options`);
    }
    if (!optionKeys.includes(q.correct_answer)) {
      details.push(
        `Question ${idx + 1}: correct_answer "${q.correct_answer}" is not one of the options (${optionKeys.join(', ')})`
      );
    }
    return {
      qid: String(q.id ?? idx + 1),
      question: q.question,
      options: optionKeys.map((key) => ({ key, text: q.options[key] })),
      correctAnswer: q.correct_answer,
      explanation: q.explanation || '',
      marks: q.marks ?? 1,
    };
  });

  // Ensure qids are unique within the exam.
  const seen = new Set();
  questions.forEach((q, idx) => {
    if (seen.has(q.qid)) {
      q.qid = `${q.qid}-${idx + 1}`;
    }
    seen.add(q.qid);
  });

  if (details.length) {
    throw new ValidationError('Some questions are invalid', details);
  }

  return {
    title: data.title,
    slug: data.slug || slugify(data.title),
    description: data.description || '',
    subject: data.subject || '',
    grade: data.grade || '',
    durationMinutes: data.durationMinutes,
    published: data.published ?? false,
    shuffleQuestions: data.shuffleQuestions ?? false,
    shuffleOptions: data.shuffleOptions ?? false,
    negativeMarking: data.negativeMarking ?? 0,
    questions,
  };
}

/** Parse a zod schema or throw a ValidationError with friendly messages. */
export function parseOrThrow(schema, raw) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', formatIssues(parsed.error));
  }
  return parsed.data;
}
