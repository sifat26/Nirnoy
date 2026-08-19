import { api } from './client';

/** Published exams (meta only). */
export const listExams = () => api.get('/exams');

/** One exam's start-screen meta (no questions/answers). */
export const getExam = (slug) => api.get(`/exams/${slug}`);

/** Start an attempt. Returns answer-less questions + serverDeadline. */
export const startAttempt = (slug) => api.post(`/exams/${slug}/attempts`);
