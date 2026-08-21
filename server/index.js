import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './env.js';
import { connectDb } from './db.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import examRoutes from './routes/exams.js';
import attemptRoutes from './routes/attempts.js';
import meRoutes from './routes/me.js';
import categoryRoutes from './routes/categories.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));
app.use(cors({ origin: env.isProd ? true : env.clientUrl }));
if (!env.isProd) app.use(morgan('dev'));

// --- API ---
const api = express.Router();
api.get('/health', (_req, res) => res.json({ ok: true, aiEnabled: env.aiEnabled }));
api.use('/auth', authRoutes);
api.use('/exams', examRoutes);
api.use('/attempts', attemptRoutes);
api.use('/me', meRoutes);
api.use('/categories', categoryRoutes);
api.use('/admin', adminRoutes);
app.use('/api', api);

// Any unmatched /api route -> JSON 404 (before the SPA fallback).
app.use('/api', notFoundHandler);

// --- Serve built frontend in production (dist/) ---
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA fallback: serve index.html for non-API GET routes.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(errorHandler);

export async function start() {
  await connectDb();
  return new Promise((resolve) => {
    const server = app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 API listening on http://localhost:${env.port} (${env.nodeEnv})`);
      if (!fs.existsSync(distDir)) {
        // eslint-disable-next-line no-console
        console.log('ℹ️  No dist/ yet — run the Vite dev server (npm run dev) for the UI.');
      }
      resolve(server);
    });
  });
}

export { app };

// Auto-start only when run directly (not when imported by tests).
const runDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (runDirectly) {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });
}
