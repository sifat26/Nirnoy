/**
 * Vercel serverless entry point.
 *
 * vercel.json rewrites every /api/* request to this function. The Express app
 * in server/index.js already mounts all routes under /api, returns JSON 404s
 * for unknown API paths, and skips the dist/ SPA fallback when no build
 * output exists (as in the serverless bundle).
 *
 * MongoDB: serverless functions are short-lived, so the connection promise is
 * cached on globalThis. Warm invocations reuse the same connection instead of
 * reconnecting every request. Mongoose buffers queries until the connection
 * resolves, so no top-level await is needed.
 */
import { app } from '../server/index.js';
import { connectDb } from '../server/db.js';

const globalForDb = globalThis;

if (!globalForDb.__mcqMongoPromise) {
  globalForDb.__mcqMongoPromise = connectDb().catch((err) => {
    console.error('MongoDB connection failed:', err.message);
  });
}

export default app;
