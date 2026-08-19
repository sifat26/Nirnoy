import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAnalytics } from '../../api';
import { ApiError } from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { StatTile, EmptyState, ErrorBanner } from '../../components/ui';
import { formatDate } from '../../lib/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error) return <ErrorBanner message={error} />;

  const t = data.totals;
  const recent = data.recent || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">Overview of your platform.</p>
        </div>
        <Link to="/admin/exams" className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors">
          + New Exam
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <StatTile label="Students" value={t.students} />
        <StatTile label="Exams" value={t.exams} hint={`${t.publishedExams} published`} />
        <StatTile label="Attempts" value={t.attempts} />
        <StatTile label="Avg score" value={`${t.avgPercentage}%`} />
        <StatTile label="Published" value={t.publishedExams} />
      </div>

      <h2 className="font-bold text-slate-900 mb-3">Recent activity</h2>
      {recent.length === 0 ? (
        <EmptyState title="No attempts yet" subtitle="Results will appear here once students take exams." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {recent.map((r) => (
            <Link
              key={r.attemptId}
              to={`/results/${r.attemptId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{r.studentName}</p>
                <p className="text-xs text-slate-500 truncate">{r.examTitle}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-slate-900">{r.percentage}%</p>
                <p className="text-xs text-slate-400">{formatDate(r.submittedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
