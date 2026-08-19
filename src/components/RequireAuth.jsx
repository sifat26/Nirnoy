import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullPageSpinner } from './Spinner';

/**
 * Gate a route behind authentication (optionally a specific role).
 * Unauthenticated users are redirected to the right login with a `next` param.
 */
export default function RequireAuth({ role, children }) {
  const { loading, session } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!session) {
    const loginPath = role === 'admin' ? '/admin/login' : '/login';
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPath}?next=${next}`} replace />;
  }

  if (role && session.role !== role) {
    // Logged in but wrong role — send them to their own home.
    return <Navigate to={session.role === 'admin' ? '/admin' : '/'} replace />;
  }

  return children;
}
