import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { env } from './env.js';
import { connectDb, disconnectDb } from './db.js';
import { Admin } from './models/Admin.js';
import { Exam } from './models/Exam.js';
import { Category } from './models/Category.js';
import { normalizeExamInput } from './validation/schemas.js';
import { readJsonFile } from './lib/json.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default admin-managed categories. Admins can add/edit/remove more in the UI.
const DEFAULT_CATEGORIES = [
  { slug: 'ssc', name: 'SSC', nameBn: 'এসএসসি', order: 1 },
  { slug: 'hsc', name: 'HSC', nameBn: 'এইচএসসি', order: 2 },
  { slug: 'job-preparation', name: 'Job Preparation', nameBn: 'চাকরির প্রস্তুতি', order: 3 },
];

async function seedCategories() {
  await Promise.all(
    DEFAULT_CATEGORIES.map(async (c) => {
      if (await Category.exists({ slug: c.slug })) return;
      await Category.create({ ...c, active: true });
    })
  );
  log(`✓ Categories ensured: ${DEFAULT_CATEGORIES.map((c) => c.slug).join(', ')}`);
}

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
  const existing = await Exam.findOne({ slug: SLUG });
  if (existing) {
    if (!existing.category) {
      existing.category = 'ssc';
      await existing.save();
      log(`• Sample exam "${SLUG}" already exists — backfilled category "ssc"`);
    } else {
      log(`• Sample exam "${SLUG}" already exists — skipping`);
    }
    return;
  }
  const raw = readJsonFile(fs, file);
  const normalized = normalizeExamInput(raw);
  normalized.slug = SLUG; // stable slug so re-seeding is idempotent
  await Exam.create({ ...normalized, published: true, category: 'ssc', createdBy: adminId });
  log(`✓ Sample exam "${normalized.title}" created and published`);
}

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(msg);
}

async function main() {
  await connectDb();
  const admin = await seedAdmin();
  await seedCategories();
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
