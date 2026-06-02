import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, usersApi } from '../api/auth';

const AuthContext = createContext(null);

// ── Decode JWT payload locally (no network, no library) ───────────────────────
// The access token already contains userId, role, name, email — use them
// instantly so the app never shows a loading spinner on reload.
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload?.userId) return null;
    return {
      userId: payload.userId,
      name:   payload.name  ?? '',
      email:  payload.sub   ?? '',   // 'sub' = email in our JWT
      role:   payload.role  ?? '',
      phone:  null,
      isActive: true,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  // Decode the JWT synchronously on first render — instant, no spinner.
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('accessToken');
    return token ? decodeToken(token) : null;
  });

  // loading is always false — we never block rendering waiting for a network call
  const [loading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Verify the token in the background and fill in extra fields (phone, etc.).
    // This runs after the app is already visible — no spinner shown.
    usersApi
      .getMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        // Both access + refresh tokens failed.
        // api/client.js interceptor shows the toast and redirects to /login.
        localStorage.clear();
        setUser(null);
      });
  }, []);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser({
      userId: data.userId,
      name:   data.name,
      email:  data.email,
      phone:  data.phone ?? null,
      role:   data.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  };

  const register = async (name, email, password) => {
    const { data } = await authApi.register({ name, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser({
      userId: data.userId,
      name:   data.name,
      email:  data.email,
      phone:  data.phone ?? null,
      role:   data.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.clear();
    setUser(null);
  };

  const hasRole = (...roles) => !!user && roles.includes(user.role);

  const refreshUser = async () => {
    try {
      const res = await usersApi.getMe();
      setUser(res.data);
    } catch { /* silently ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
