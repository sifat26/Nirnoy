/**
 * Vercel serverless entry point.
 *
 * vercel.json rewrites every /api/* request to this function. The Express app
 * in server/index.js already mounts all routes under /api, returns JSON 404s
 * for unknown API paths, and skips the dist/ SPA fallback when no build
 * output exists (as in the serverless bundle).
 *
 * MongoDB: serverless functions are short-lived, so we cache the connection
 * promise on globalThis and reuse it across warm invocations. Crucially, we
 * AWAIT the connection before handing the request to Express — otherwise a
 * cold start fires connectDb() in the background and the first query buffers
 * against a not-yet-connected mongoose, timing out with
 * "Operation ... buffering timed out after 10000ms". On failure we reset the
 * cache so a later warm invocation can retry instead of caching a dead promise.
 */
import { app } from '../server/index.js';
import { connectDb } from '../server/db.js';
import mongoose from 'mongoose';

const globalForDb = globalThis;

async function ensureDb() {
  // Already connected (warm invocation) — nothing to do.
  if (mongoose.connection.readyState === 1) return;

  if (!globalForDb.__mcqMongoPromise) {
    globalForDb.__mcqMongoPromise = connectDb().catch((err) => {
      // Reset so the next invocation retries rather than caching a rejection.
      globalForDb.__mcqMongoPromise = null;
      console.error('MongoDB connection failed:', err.message);
      throw err;
    });
  }

  await globalForDb.__mcqMongoPromise;
}

export default async function handler(req, res) {
  try {
    await ensureDb();
  } catch (err) {
    console.error('Database unavailable:', err.message);
    res.status(500).json({ error: 'Database connection failed. Please try again later.' });
    return;
  }

  app(req, res);
}
