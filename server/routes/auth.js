import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../env.js';
import { Student } from '../models/Student.js';
import { Admin } from '../models/Admin.js';
import { signStudentToken, signAdminToken } from '../lib/tokens.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../lib/errors.js';
import {
  parseOrThrow,
  studentRegisterSchema,
  studentLoginSchema,
  adminLoginSchema,
  googleAuthSchema,
  detectLoginType,
} from '../validation/schemas.js';

const router = Router();

// One reusable Google OAuth client. Empty clientId is fine — the /google route
// guards on env.googleEnabled before ever calling verifyIdToken.
const googleClient = new OAuth2Client(env.googleClientId);

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

    // Google-only accounts have no PIN — steer them to the Google button.
    if (!student.pinHash) {
      throw new UnauthorizedError('This account uses Google sign-in. Please continue with Google.');
    }

    const ok = await bcrypt.compare(data.pin, student.pinHash);
    if (!ok) throw new UnauthorizedError('Incorrect PIN/password.');

    student.lastActiveAt = new Date();
    await student.save();

    const token = signStudentToken(student);
    res.json({ token, role: 'student', student: student.toPublicJSON() });
  })
);

// POST /api/auth/google  — sign in / sign up with a Google ID token.
// The client obtains the ID token via Google Identity Services; we verify it
// server-side (never trust the raw credential) and issue our own JWT.
router.post(
  '/google',
  authLimiter,
  asyncHandler(async (req, res) => {
    if (!env.googleEnabled) {
      throw new ValidationError('Google login is not configured on this server.');
    }
    const { credential, grade, roll } = parseOrThrow(googleAuthSchema, req.body);

    // Verify signature, audience (our Client ID), issuer, and expiry.
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedError('Google sign-in failed. Please try again.');
    }

    // Require a Google-verified email — this is what makes email-based linking safe.
    if (!payload?.email || payload.email_verified !== true) {
      throw new UnauthorizedError('Your Google account has no verified email.');
    }

    const email = String(payload.email).toLowerCase();
    const googleId = payload.sub;
    const name = (payload.name || '').trim() || email.split('@')[0];
    const picture = payload.picture || '';

    // 1) Returning Google user. 2) Existing local account with same email → link
    // (Google proved ownership). 3) Otherwise create a fresh passwordless account.
    let student = await Student.findOne({ googleId });
    if (!student) {
      student = await Student.findOne({ loginId: email });
      if (student) {
        student.googleId = googleId;
        if (!student.email) student.email = email;
        if (picture && !student.avatarUrl) student.avatarUrl = picture;
      } else {
        student = new Student({
          name,
          loginId: email,
          email,
          loginType: 'google',
          provider: 'google',
          googleId,
          avatarUrl: picture,
          grade: grade || '',
          roll: roll || '',
        });
      }
    }

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
