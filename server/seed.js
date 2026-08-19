import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { env } from './env.js';
import { connectDb, disconnectDb } from './db.js';
import { Admin } from './models/Admin.js';
import { Exam } from './models/Exam.js';
import { normalizeExamInput } from './validation/schemas.js';
import { readJsonFile } from './lib/json.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedAdmin() {
  const username = env.adminUsername.toLowerCase();
  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  let admin = await Admin.findOne({ username });
  if (admin) {
    admin.passwordHash = passwordHash; // keep the login in sync with .env
    await admin.save();
    log(`✓ Admin "${username}" updated (password synced from .env)`);
  } else {
    admin = await Admin.create({ username, passwordHash });
    log(`✓ Admin "${username}" created`);
  }
  return admin;
}

async function seedSampleExam(adminId) {
  const file = path.resolve(__dirname, '..', 'public', 'exams', 'ssc-physics-ch3.json');
  if (!fs.existsSync(file)) {
    log('• No sample exam file found — skipping sample import');
    return;
  }
  const SLUG = 'ssc-physics-ch3';
  if (await Exam.exists({ slug: SLUG })) {
    log(`• Sample exam "${SLUG}" already exists — skipping`);
    return;
  }
  const raw = readJsonFile(fs, file);
  const normalized = normalizeExamInput(raw);
  normalized.slug = SLUG; // stable slug so re-seeding is idempotent
  await Exam.create({ ...normalized, published: true, createdBy: adminId });
  log(`✓ Sample exam "${normalized.title}" created and published`);
}

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(msg);
}

async function main() {
  await connectDb();
  const admin = await seedAdmin();
  await seedSampleExam(admin._id);
  await disconnectDb();
  log('✅ Seed complete');
  log(`   Admin login → username: ${env.adminUsername}  (password: from .env)`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
