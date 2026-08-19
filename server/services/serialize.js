import { shuffle } from './shuffle.js';

/**
 * Build the questions payload sent to a student while taking an exam.
 * Strips correctAnswer + explanation. Honors the attempt's question order and
 * optionally shuffles each question's options.
 */
export function toStudentQuestions(exam, order, { shuffleOptions = false } = {}) {
  const byId = new Map(exam.questions.map((q) => [q.qid, q]));
  return order
    .map((qid) => byId.get(qid))
    .filter(Boolean)
    .map((q) => {
      let options = q.options.map((o) => ({ key: o.key, text: o.text }));
      if (shuffleOptions) options = shuffle(options);
      return { qid: q.qid, question: q.question, marks: q.marks || 1, options };
    });
}

/**
 * Build the full graded result for the Results page and history review.
 * Includes correct answers + explanations — only call for submitted attempts.
 */
export function buildResultPayload(exam, attempt) {
  const answers =
    attempt.answers instanceof Map ? Object.fromEntries(attempt.answers) : attempt.answers || {};
  const byId = new Map(exam.questions.map((q) => [q.qid, q]));
  const order =
    attempt.questionOrder && attempt.questionOrder.length
      ? attempt.questionOrder
      : exam.questions.map((q) => q.qid);

  const review = order
    .map((qid) => byId.get(qid))
    .filter(Boolean)
    .map((q) => {
      const selected = answers[q.qid] ?? null;
      return {
        qid: q.qid,
        question: q.question,
        options: q.options.map((o) => ({ key: o.key, text: o.text })),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        selected,
        isCorrect: selected != null && selected === q.correctAnswer,
        marks: q.marks || 1,
      };
    });

  return {
    attemptId: attempt._id.toString(),
    examId: exam._id.toString(),
    examSlug: exam.slug,
    examTitle: attempt.examTitle || exam.title,
    status: attempt.status,
    score: attempt.score,
    percentage: attempt.percentage,
    totalQuestions: exam.questions.length,
    timeTakenSec: attempt.timeTakenSec ?? null,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt ?? null,
    review,
  };
}
