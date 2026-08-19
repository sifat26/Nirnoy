import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { myAttempts } from '../api';
import { ApiError } from '../api/client';
import Header from '../components/Header';
import { Spinner } from '../components/Spinner';
import { StatTile, EmptyState, ErrorBanner, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDuration, initials, scoreColor } from '../lib/format';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    myAttempts()
      .then((data) => setAttempts(data.attempts || []))
      .catch((err) => setError(err instanceof ApiError ? err : new ApiError('Failed to load history', 0)))
      .finally(() => setLoading(false));
  }, []);

  const count = attempts.length;
  const avg = count ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / count) : 0;
  const best = count ? Math.max(...attempts.map((a) => a.percentage || 0)) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Profile card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shrink-0">
            {initials(user?.name)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{user?.name}</h1>
            <p className="text-sm text-slate-500 truncate">{user?.loginId}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {user?.grade && <Badge color="slate">Class: {user.grade}</Badge>}
              {user?.roll && <Badge color="slate">Roll: {user.roll}</Badge>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatTile label="Exams taken" value={count} />
          <StatTile label="Average" value={`${avg}%`} />
          <StatTile label="Best" value={`${best}%`} />
        </div>

        {/* History */}
        <h2 className="font-bold text-slate-900 mb-3">Exam History</h2>
        {error && <div className="mb-4"><ErrorBanner message={error.message} /></div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : count === 0 ? (
          <EmptyState title="No attempts yet" subtitle="Take an exam and it will show up here.">
            <Link to="/" className="inline-block text-emerald-600 font-medium hover:underline">
              Browse exams →
            </Link>
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {attempts.map((a) => (
              <button
                key={a.attemptId}
                onClick={() => navigate(`/results/${a.attemptId}`)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all flex items-center gap-4"
              >
                <div className={`shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center border ${scoreBg(a.percentage)}`}>
                  <span className="text-lg font-bold leading-none">{a.percentage}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{a.examTitle}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(a.submittedAt)}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                    <span className="text-emerald-600">{a.score?.correct ?? 0} correct</span>
                    <span className="text-red-500">{a.score?.wrong ?? 0} wrong</span>
                    <span>{a.score?.unanswered ?? 0} skipped</span>
                    <span>· {formatDuration(a.timeTakenSec)}</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function scoreBg(percentage) {
  const c = scoreColor(percentage);
  return {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }[c];
}
