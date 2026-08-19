import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export function signStudentToken(student) {
  return jwt.sign({ sub: student._id.toString(), role: 'student' }, env.jwtSecret, {
    expiresIn: env.studentTokenTtl,
  });
}

export function signAdminToken(admin) {
  return jwt.sign({ sub: admin._id.toString(), role: 'admin' }, env.jwtSecret, {
    expiresIn: env.adminTokenTtl,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
