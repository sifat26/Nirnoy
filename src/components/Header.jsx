import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials } from '../lib/format';

/** Top navigation for student-facing pages. Reflects auth state. */
export default function Header() {
  const { isStudent, user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            N
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 leading-tight truncate">Nirnoy</h1>
            <p className="text-xs text-slate-500 truncate">Practice &amp; track your progress</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5 shrink-0">
          {isStudent ? (
            <>
              <Link
                to="/me"
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                  {initials(user?.name)}
                </span>
                <span className="hidden sm:inline max-w-[120px] truncate">{user?.name?.split(' ')[0] || 'Profile'}</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-sm text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
