import { api } from './client';

export const registerStudent = (data) => api.post('/auth/student/register', data, { auth: false });
export const loginStudent = (loginId, pin) => api.post('/auth/student/login', { loginId, pin }, { auth: false });
export const loginAdmin = (username, password) => api.post('/auth/admin/login', { username, password }, { auth: false });
// Exchange a Google ID token (from Google Identity Services) for our own JWT.
// `extra` may carry optional { grade, roll } captured at signup.
export const loginWithGoogle = (credential, extra = {}) =>
  api.post('/auth/google', { credential, ...extra }, { auth: false });
export const fetchMe = () => api.get('/auth/me');
