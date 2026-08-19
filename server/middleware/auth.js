import { asyncHandler } from '../lib/asyncHandler.js';
import { verifyToken } from '../lib/tokens.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { Student } from '../models/Student.js';
import { Admin } from '../models/Admin.js';

function getBearer(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function authPayload(req) {
  const token = getBearer(req);
  if (!token) throw new UnauthorizedError('Authentication required');
  try {
    return verifyToken(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired session. Please log in again.');
  }
}

/** Require any valid token (student or admin). Attaches req.auth only. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  req.auth = authPayload(req);
  next();
});

/** Require a logged-in student. Attaches req.student. */
export const requireStudent = asyncHandler(async (req, _res, next) => {
  const payload = authPayload(req);
  if (payload.role !== 'student') throw new ForbiddenError('Student access only');
  const student = await Student.findById(payload.sub);
  if (!student) throw new UnauthorizedError('Account not found');
  req.student = student;
  req.auth = payload;
  next();
});

/** Require a logged-in admin. Attaches req.admin. */
export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const payload = authPayload(req);
  if (payload.role !== 'admin') throw new ForbiddenError('Admin access only');
  const admin = await Admin.findById(payload.sub);
  if (!admin) throw new UnauthorizedError('Admin not found');
  req.admin = admin;
  req.auth = payload;
  next();
});
