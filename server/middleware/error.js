import { env } from '../env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

// Express recognizes error middleware by its 4-arg signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const body = { error: err.message || 'Internal server error' };
  if (err.details) body.details = err.details;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
    if (!env.isProd && err.stack) body.stack = err.stack;
  }

  res.status(status).json(body);
}
