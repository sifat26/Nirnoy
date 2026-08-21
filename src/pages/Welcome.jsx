import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listCategories, updateMe } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ui';
import { usePageMeta } from '../hooks/usePageMeta';

// Shared flag so the Home "choose a category" banner stays hidden once the
// student has been through (or skipped) onboarding.
export const WELCOME_SEEN = 'mcq_welcome_seen';

function safeNext(raw) {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/';
}

export default function Welcome() {
  usePageMeta('Choose your category', 'Pick your exam category to personalize your practice on Nirnoy.');
  const { user, patchUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(''); // slug currently being saved
  const [error, setError] = useState(null);

  useEffect(() => {
    listCategories()
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  function finish() {
    localStorage.setItem(WELCOME_SEEN, '1');
    navigate(next, { replace: true });
  }

  async function choose(slug) {
    setError(null);
    setSaving(slug);
    try {
      const { student } = await updateMe({ category: slug });
      patchUser({ category: student.category });
      finish();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Could not save your choice. Please try again.', 0));
      setSaving('');
    }
  }

  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900">
          {firstName ? `Welcome, ${firstName}!` : 'Welcome!'}
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Which exam are you preparing for? We'll show these exams first — you can change it anytime.
        </p>

        {error && <div className="mb-4"><ErrorBanner message={error.message} details={error.details} /></div>}

        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No categories are available yet. You can continue and pick one later.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => choose(c.slug)}
                disabled={Boolean(saving)}
                className="text-left rounded-xl border border-slate-200 p-4 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors disabled:opacity-60 flex items-center justify-between gap-2"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900 truncate">{c.name}</span>
                  {c.nameBn && <span className="block text-sm text-slate-500 truncate">{c.nameBn}</span>}
                </span>
                {saving === c.slug && <Spinner className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={finish}
          disabled={Boolean(saving)}
          className="w-full mt-6 text-sm text-slate-500 hover:text-slate-700 font-medium disabled:opacity-60"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
