import { api } from './client';

/** Submit answers for grading (server-side). Returns the full graded result. */
export const submitAttempt = (attemptId, answers) => api.post(`/attempts/${attemptId}/submit`, { answers });

/** Fetch a graded attempt by id (owner or admin). */
export const getAttempt = (attemptId) => api.get(`/attempts/${attemptId}`);

/** The logged-in student's own exam history. */
export const myAttempts = () => api.get('/me/attempts');
