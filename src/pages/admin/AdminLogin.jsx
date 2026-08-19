import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import { ErrorBanner } from '../../components/ui';
import { Spinner } from '../../components/Spinner';

function safeNext(raw) {
  if (raw && raw.startsWith('/admin')) return raw;
  return '/admin';
}

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginAdmin(username.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Something went wrong', 0));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xl">Q</div>
        <span className="text-lg font-semibold text-white">Admin Console</span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900">Admin login</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Sign in to manage exams and students.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
              placeholder="admin"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
              placeholder="••••••••"
            />
          </div>

          {error && <ErrorBanner message={error.message} details={error.details} />}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Spinner className="w-4 h-4" />}
            Sign in
          </button>
        </form>
      </div>

      <Link to="/" className="text-xs text-slate-400 hover:text-slate-200 mt-6">
        ← Back to student site
      </Link>
    </div>
  );
}
