import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB. Call once at server startup (and in the seed script).
 * Mongoose buffers queries until connected, so callers don't need to await
 * this before defining models — but the server won't accept traffic until it
 * resolves.
 */
export async function connectDb() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log('✅ MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('❌ MongoDB error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('⚠️  MongoDB disconnected');
  });

  await mongoose.connect(env.mongoUri);
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
