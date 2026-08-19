import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { ErrorBanner } from '../components/ui';
import { Spinner } from '../components/Spinner';

function safeNext(raw) {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/';
}

export default function Register() {
  const { registerStudent } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [form, setForm] = useState({ name: '', loginId: '', pin: '', grade: '', roll: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerStudent({
        name: form.name.trim(),
        loginId: form.loginId.trim(),
        pin: form.pin,
        grade: form.grade.trim(),
        roll: form.roll.trim(),
      });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Something went wrong', 0));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xl">Q</div>
        <span className="text-lg font-semibold text-slate-900">MCQ Exam Platform</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Your history stays with you across devices.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={update('name')}
              required
              minLength={2}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="loginId" className="block text-sm font-medium text-slate-700 mb-1">
              Email or phone
            </label>
            <input
              id="loginId"
              type="text"
              autoComplete="username"
              value={form.loginId}
              onChange={update('loginId')}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
              placeholder="you@example.com or 01712345678"
            />
          </div>
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-slate-700 mb-1">
              PIN / Password <span className="text-slate-400 font-normal">(min 4 characters)</span>
            </label>
            <input
              id="pin"
              type="password"
              autoComplete="new-password"
              value={form.pin}
              onChange={update('pin')}
              required
              minLength={4}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
              placeholder="Choose a PIN"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-slate-700 mb-1">
                Class <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="grade"
                type="text"
                value={form.grade}
                onChange={update('grade')}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
                placeholder="e.g. SSC"
              />
            </div>
            <div>
              <label htmlFor="roll" className="block text-sm font-medium text-slate-700 mb-1">
                Roll <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="roll"
                type="text"
                value={form.roll}
                onChange={update('roll')}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
                placeholder="e.g. 12"
              />
            </div>
          </div>

          {error && <ErrorBanner message={error.message} details={error.details} />}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Spinner className="w-4 h-4" />}
            Create account
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          Already have an account?{' '}
          <Link to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-emerald-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
