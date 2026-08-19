import { api, getToken } from './client';

// ---- Exams ----
export const adminListExams = () => api.get('/admin/exams');
export const adminGetExam = (id) => api.get(`/admin/exams/${id}`);
export const adminCreateExam = (payload) => api.post('/admin/exams', payload);
export const adminUpdateExam = (id, patch) => api.patch(`/admin/exams/${id}`, patch);
export const adminReplaceExam = (id, payload) => api.put(`/admin/exams/${id}`, payload);
export const adminDeleteExam = (id) => api.del(`/admin/exams/${id}`);
export const adminExamAttempts = (id) => api.get(`/admin/exams/${id}/attempts`);

export const adminUploadExam = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.upload('/admin/exams/upload', form);
};

// ---- Students ----
export const adminListStudents = () => api.get('/admin/students');
export const adminGetStudent = (id) => api.get(`/admin/students/${id}`);

// ---- Dashboard ----
export const adminAnalytics = () => api.get('/admin/analytics');

/** Download the per-exam results CSV. Uses fetch+blob to preserve bytes + filename. */
export async function adminExportAttempts(id, filename = 'results.csv') {
  const res = await fetch(`/api/admin/exams/${id}/attempts/export`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
