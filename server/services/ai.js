import { env } from '../env.js';

/**
 * AI service — DISABLED in v1 (no Claude calls are made).
 *
 * The platform is intentionally shipped without AI, but the seams are here so
 * it can be switched on later by setting ANTHROPIC_API_KEY (env.aiEnabled).
 *
 * To implement later:
 *   1. `npm i @anthropic-ai/sdk`
 *   2. Create a client with env.anthropicApiKey.
 *   3. generateQuestions(): prompt Claude to return MCQ JSON in the platform
 *      format ({ examTitle, duration_minutes, questions:[...] }); validate with
 *      server/validation/schemas.js before saving. Wire to
 *      POST /api/admin/exams/generate.
 *   4. generateFeedback(): given a graded attempt's wrong answers, ask Claude
 *      for short, per-topic study tips in the question's language; attach to
 *      the attempt result. Wire into the submit flow / Results page.
 *
 * Prefer the latest capable model available at build time.
 */

export class AiDisabledError extends Error {
  constructor(message = 'AI features are not enabled. Set ANTHROPIC_API_KEY to enable them.') {
    super(message);
    this.name = 'AiDisabledError';
    this.status = 503;
  }
}

export function isAiEnabled() {
  return env.aiEnabled;
}

// eslint-disable-next-line no-unused-vars
export async function generateQuestions(_options) {
  throw new AiDisabledError();
}

// eslint-disable-next-line no-unused-vars
export async function generateFeedback(_attemptResult) {
  throw new AiDisabledError();
}
