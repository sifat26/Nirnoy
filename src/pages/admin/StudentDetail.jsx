import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminGetStudent } from '../../api';
import { ApiError } from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { StatTile, EmptyState, ErrorBanner, Badge } from '../../components/ui';
import { formatDate, formatDuration, initials } from '../../lib/format';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminGetStudent(id)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load student'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (error) return <ErrorBanner message={error} />;

  const { student, attempts } = data;
  const count = attempts.length;
  const avg = count ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / count) : 0;
  const best = count ? Math.max(...attempts.map((a) => a.percentage || 0)) : 0;

  return (
    <div>
      <button onClick={() => navigate('/admin/students')} className="text-sm text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to students
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold shrink-0">
          {initials(student.name)}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{student.name}</h1>
          <p className="text-sm text-slate-500 truncate">{student.loginId}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge color="slate">{student.loginType}</Badge>
            {student.grade && <Badge color="slate">Class: {student.grade}</Badge>}
            {student.roll && <Badge color="slate">Roll: {student.roll}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile label="Attempts" value={count} />
        <StatTile label="Average" value={`${avg}%`} />
        <StatTile label="Best" value={`${best}%`} />
      </div>

      <h2 className="font-bold text-slate-900 mb-3">Attempts</h2>
      {count === 0 ? (
        <EmptyState title="No attempts yet" subtitle="This student hasn't completed any exams." />
      ) : (
        <div className="space-y-3">
          {attempts.map((a) => (
            <button
              key={a.attemptId}
              onClick={() => navigate(`/results/${a.attemptId}`)}
              className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all flex items-center gap-4"
            >
              <div className="shrink-0 w-14 h-14 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-900">{a.percentage}%</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{a.examTitle}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatDate(a.submittedAt)}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                  <span className="text-emerald-600">{a.score?.correct ?? 0} correct</span>
                  <span className="text-red-500">{a.score?.wrong ?? 0} wrong</span>
                  <span>{a.score?.unanswered ?? 0} skipped</span>
                  <span>· {formatDuration(a.timeTakenSec)}</span>
                  {a.status === 'expired' && <span className="text-amber-600">· auto-submitted</span>}
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
