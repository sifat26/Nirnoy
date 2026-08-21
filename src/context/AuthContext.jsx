import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { setToken, getToken } from '../api/client';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { role: 'student'|'admin', user }
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((res) => {
    setToken(res.token);
    setSession({ role: res.role, user: res.role === 'admin' ? res.admin : res.student });
    return res;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setSession(null);
  }, []);

  // Merge fields into the current session user (e.g. after a profile update).
  const patchUser = useCallback((partial) => {
    setSession((s) => (s ? { ...s, user: { ...s.user, ...partial } } : s));
  }, []);

  // Resolve an existing token on first load.
  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setLoading(false);
      return undefined;
    }
    authApi
      .fetchMe()
      .then((res) => {
        if (active) setSession({ role: res.role, user: res.role === 'admin' ? res.admin : res.student });
      })
      .catch(() => {
        if (active) {
          setToken(null);
          setSession(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // A 401 anywhere in the app means the token is stale — clear the session.
  useEffect(() => {
    window.addEventListener('auth:unauthorized', logout);
    return () => window.removeEventListener('auth:unauthorized', logout);
  }, [logout]);

  const loginStudent = useCallback(
    async (loginId, pin) => applyAuth(await authApi.loginStudent(loginId, pin)),
    [applyAuth]
  );
  const registerStudent = useCallback(async (data) => applyAuth(await authApi.registerStudent(data)), [applyAuth]);
  const loginWithGoogle = useCallback(
    async (credential, extra) => applyAuth(await authApi.loginWithGoogle(credential, extra)),
    [applyAuth]
  );
  const loginAdmin = useCallback(
    async (username, password) => applyAuth(await authApi.loginAdmin(username, password)),
    [applyAuth]
  );

  const value = useMemo(
    () => ({
      session,
      loading,
      user: session?.user || null,
      isStudent: session?.role === 'student',
      isAdmin: session?.role === 'admin',
      loginStudent,
      registerStudent,
      loginWithGoogle,
      loginAdmin,
      logout,
      patchUser,
    }),
    [session, loading, loginStudent, registerStudent, loginWithGoogle, loginAdmin, logout, patchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- co-locating the hook with its provider is intentional; splitting it would churn imports app-wide for no runtime benefit
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
