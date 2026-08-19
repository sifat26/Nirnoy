/**
 * Mock API layer for MCQ Exam Platform
 * 
 * This module provides a clean API interface that mirrors what a real backend
 * would expose. For v1, data is loaded from local JSON files.
 * 
 * To connect a real backend later, replace the implementations below with
 * actual fetch/axios calls to your API server. The interface (function names,
 * parameters, and return shapes) should remain the same.
 * 
 * --- FUTURE INTEGRATION POINTS ---
 * 
 * AUTH: Currently no auth. To add student login:
 *   - Add an AuthContext/provider that stores JWT tokens
 *   - Pass Authorization headers in each API call below
 *   - Add login/register/logout functions here
 * 
 * DATABASE: Current mock uses localStorage + in-memory.
 *   Recommended production options for solo dev:
 *   - Supabase (free tier): PostgreSQL + Auth + Storage, great for this use case
 *   - Firebase Firestore: NoSQL, real-time sync, generous free tier
 *   - Custom Node/Express + Supabase/Neon Postgres: Most control, slightly more setup
 * 
 * API ENDPOINTS (for real backend):
 *   GET  /api/exams              -> list available exams
 *   GET  /api/exams/:id          -> get exam with questions
 *   POST /api/results            -> submit exam attempt
 *   GET  /api/results/:id        -> get a specific result
 *   GET  /api/results?studentId= -> get student's all results
 */

// In-memory cache for exam data
const examCache = new Map();

/**
 * Fetch the list of available exams.
 * Real backend: GET /api/exams
 * @returns {Promise<Array<{id: string, title: string, questionCount: number, duration: number}>>}
 */
export async function fetchExams() {
  const exams = [
    { id: 'ssc-physics-ch3', title: 'SSC \u09aa\u09a6\u09be\u09b0\u09cd\u09a5\u09ac\u09bf\u099c\u09cd\u099e\u09be\u09a8 - \u0985\u09a7\u09cd\u09af\u09be\u09af\u09bc \u09e9: \u0997\u09a4\u09bf', questionCount: 10, duration: 30 },
  ];
  
  return exams;
}

/**
 * Fetch a single exam with all its questions.
 * Real backend: GET /api/exams/:id
 * @param {string} examId
 * @returns {Promise<{examTitle: string, duration_minutes: number, questions: Array}>}
 */
export async function fetchExamById(examId) {
  if (examCache.has(examId)) {
    return examCache.get(examId);
  }
  
  try {
    const response = await fetch(`/exams/${examId}.json`);
    if (!response.ok) throw new Error(`Exam not found: ${examId}`);
    const data = await response.json();
    examCache.set(examId, data);
    return data;
  } catch (error) {
    console.error('Failed to load exam:', error);
    throw error;
  }
}

/**
 * Submit exam results.
 * Real backend: POST /api/results
 * @param {{examId: string, answers: Object, timeTaken: number, score: Object}} resultData
 * @returns {Promise<{attemptId: string, submittedAt: string}>}
 */
export async function submitResult(resultData) {
  const attemptId = `attempt_${Date.now()}`;
  const attempt = {
    attemptId,
    ...resultData,
    submittedAt: new Date().toISOString(),
    studentId: 'anonymous',
  };
  
  const history = JSON.parse(localStorage.getItem('examHistory') || '[]');
  history.unshift(attempt);
  localStorage.setItem('examHistory', JSON.stringify(history));
  
  return { attemptId, submittedAt: attempt.submittedAt };
}

/**
 * Fetch past results for a student.
 * Real backend: GET /api/results?studentId=:id
 * @param {string} studentId
 * @returns {Promise<Array>}
 */
export async function fetchStudentResults(studentId) {
  const history = JSON.parse(localStorage.getItem('examHistory') || '[]');
  return studentId === 'anonymous' 
    ? history 
    : history.filter(r => r.studentId === studentId);
}

// --- Helper for future auth integration ---
// function getAuthHeaders() {
//   const token = localStorage.getItem('auth_token');
//   return token ? { Authorization: `Bearer ${token}` } : {};
// }
// function getCurrentStudentId() {
//   return localStorage.getItem('student_id') || 'anonymous';
// }
