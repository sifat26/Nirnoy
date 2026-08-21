import { api } from './client';

/** Update the logged-in student's own profile (category, name, grade, roll). */
export const updateMe = (patch) => api.patch('/me', patch);
