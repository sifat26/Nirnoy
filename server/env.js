import 'dotenv/config';

/**
 * Central, validated environment configuration.
 *
 * Loads from a local `.env` in development (see .env.example). In production,
 * real environment variables set by the host take precedence. Import `env`
 * everywhere instead of touching `process.env` directly.
 */

const isProd = (process.env.NODE_ENV || 'development') === 'production';

function warnOnce(message) {
  // eslint-disable-next-line no-console
  console.warn(`⚠️  ${message}`);
}

// --- MongoDB ---
const mongoUri =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mcq-exam';
if (!process.env.MONGODB_URI) {
  warnOnce(
    'MONGODB_URI not set — falling back to mongodb://127.0.0.1:27017/mcq-exam (local).'
  );
}

// --- JWT secret ---
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) {
    throw new Error(
      'JWT_SECRET is required in production. Set it in your environment.'
    );
  }
  jwtSecret = 'dev-insecure-secret-change-me';
  warnOnce('JWT_SECRET not set — using an insecure dev secret. Do NOT use in production.');
}

// --- Anthropic / AI (unused in v1, wired for later) ---
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';

export const env = {
  isProd,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri,
  jwtSecret,
  studentTokenTtl: process.env.STUDENT_TOKEN_TTL || '7d',
  adminTokenTtl: process.env.ADMIN_TOKEN_TTL || '1d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  // AI is intentionally disabled in v1. When a key is present these flags let
  // future endpoints (see server/services/ai.js) light up without code changes.
  anthropicApiKey,
  aiEnabled: Boolean(anthropicApiKey),
};
