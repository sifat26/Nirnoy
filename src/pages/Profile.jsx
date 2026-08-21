import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { myAttempts, listCategories, updateMe } from '../api';
import { ApiError } from '../api/client';
import Header from '../components/Header';
import { Spinner } from '../components/Spinner';
import { StatTile, EmptyState, ErrorBanner, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { categoryLabel } from '../lib/categories';
import { usePageMeta } from '../hooks/usePageMeta';
import { formatDate, formatDuration, initials, scoreColor } from '../lib/format';

export default function Profile() {
  usePageMeta('My Profile', 'Your Nirnoy profile, exam history, and preferred category.');
  const { user, patchUser } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [catError, setCatError] = useState(null);

  useEffect(() => {
    myAttempts()
      .then((data) => setAttempts(data.attempts || []))
      .catch((err) => setError(err instanceof ApiError ? err : new ApiError('Failed to load history', 0)))
      .finally(() => setLoading(false));
    listCategories()
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  async function onChangeCategory(e) {
    const slug = e.target.value;
    setCatError(null);
    setSavingCat(true);
    try {
      const { student } = await updateMe({ category: slug });
      patchUser({ category: student.category });
    } catch (err) {
      setCatError(err instanceof ApiError ? err.message : 'Failed to update category');
    } finally {
      setSavingCat(false);
    }
  }

  const count = attempts.length;
  const avg = count ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / count) : 0;
  const best = count ? Math.max(...attempts.map((a) => a.percentage || 0)) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Profile card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 mb-6 flex items-center gap-4">
          {user?.avatarUrl && !avatarError ? (
            <img
              src={user.avatarUrl}
              alt={user?.name || 'Profile'}
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shrink-0">
              {initials(user?.name)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{user?.name}</h1>
            <p className="text-sm text-slate-500 truncate">{user?.loginId}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {user?.provider === 'google' && <Badge color="emerald">Google account</Badge>}
              {user?.category && <Badge color="blue">{categoryLabel(user.category, categories)}</Badge>}
              {user?.grade && <Badge color="slate">Class: {user.grade}</Badge>}
              {user?.roll && <Badge color="slate">Roll: {user.roll}</Badge>}
            </div>
          </div>
        </div>

        {/* Preferred category */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-6">
          <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1.5">
            Exam category
          </label>
          <div className="flex items-center gap-3">
            <select
              id="category"
              value={user?.category || ''}
              onChange={onChangeCategory}
              disabled={savingCat}
              className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900 bg-white disabled:opacity-60"
            >
              <option value="">All categories (not set)</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                  {c.nameBn ? ` — ${c.nameBn}` : ''}
                </option>
              ))}
            </select>
            {savingCat && <Spinner className="w-5 h-5 shrink-0" />}
          </div>
          {catError && <p className="text-xs text-red-600 mt-1.5">{catError}</p>}
          <p className="text-xs text-slate-400 mt-1.5">Your home page opens on this category. Change it anytime.</p>
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
