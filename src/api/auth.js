import { api } from './client';

export const registerStudent = (data) => api.post('/auth/student/register', data, { auth: false });
export const loginStudent = (loginId, pin) => api.post('/auth/student/login', { loginId, pin }, { auth: false });
export const loginAdmin = (username, password) => api.post('/auth/admin/login', { username, password }, { auth: false });
export const fetchMe = () => api.get('/auth/me');
