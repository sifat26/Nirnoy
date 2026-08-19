import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { Student } from '../models/Student.js';
import { Admin } from '../models/Admin.js';
import { signStudentToken, signAdminToken } from '../lib/tokens.js';
import { ConflictError, UnauthorizedError } from '../lib/errors.js';
import {
  parseOrThrow,
  studentRegisterSchema,
  studentLoginSchema,
  adminLoginSchema,
  detectLoginType,
} from '../validation/schemas.js';

const router = Router();

// POST /api/auth/student/register
router.post(
  '/student/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(studentRegisterSchema, req.body);
    const loginId = data.loginId.toLowerCase();

    if (await Student.exists({ loginId })) {
      throw new ConflictError('An account with this email/phone already exists. Please log in.');
    }

    const pinHash = await bcrypt.hash(data.pin, 10);
    const student = await Student.create({
      name: data.name,
      loginId,
      loginType: detectLoginType(loginId),
      pinHash,
      grade: data.grade,
      roll: data.roll,
    });

    const token = signStudentToken(student);
    res.status(201).json({ token, role: 'student', student: student.toPublicJSON() });
  })
);

// POST /api/auth/student/login
router.post(
  '/student/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(studentLoginSchema, req.body);
    const loginId = data.loginId.toLowerCase();

    const student = await Student.findOne({ loginId });
    if (!student) throw new UnauthorizedError('No account found with these details. Please register.');

    const ok = await bcrypt.compare(data.pin, student.pinHash);
    if (!ok) throw new UnauthorizedError('Incorrect PIN/password.');

    student.lastActiveAt = new Date();
    await student.save();

    const token = signStudentToken(student);
    res.json({ token, role: 'student', student: student.toPublicJSON() });
  })
);

// POST /api/auth/admin/login
router.post(
  '/admin/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(adminLoginSchema, req.body);
    const admin = await Admin.findOne({ username: data.username.toLowerCase() });
    if (!admin) throw new UnauthorizedError('Invalid credentials');

    const ok = await bcrypt.compare(data.password, admin.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    const token = signAdminToken(admin);
    res.json({ token, role: 'admin', admin: admin.toPublicJSON() });
  })
);

// GET /api/auth/me  — resolve the current session (student or admin) from the token
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth.role === 'admin') {
      const admin = await Admin.findById(req.auth.sub);
      if (!admin) throw new UnauthorizedError('Admin not found');
      return res.json({ role: 'admin', admin: admin.toPublicJSON() });
    }
    const student = await Student.findById(req.auth.sub);
    if (!student) throw new UnauthorizedError('Account not found');
    res.json({ role: 'student', student: student.toPublicJSON() });
  })
);

export default router;
