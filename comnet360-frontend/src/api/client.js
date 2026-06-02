import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 seconds — prevents infinite loading if backend is down
});

// ── Token refresh deduplication ─────────────────────────────────────────────
// Problem: when multiple requests fire simultaneously with an expired access
// token, each one gets a 401 and each tries to refresh independently.
// The first refresh revokes all existing refresh tokens (backend behaviour),
// so every subsequent concurrent refresh fails → "invalid credentials" loop.
//
// Solution: only ONE refresh call is in-flight at a time. All other 401 requests
// queue themselves as subscribers and retry once the single refresh resolves.
let isRefreshing = false;
let refreshQueue = []; // { resolve, reject }[]

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

// ── Request interceptor — attach access token ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handle 401 / token refresh ──────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Never intercept auth endpoints — a 401 on /auth/login means wrong credentials,
    // not an expired session. Let the error propagate normally to the UI.
    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true; // prevent infinite retry on this specific request

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No refresh token at all — send user to login page.
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another request is already refreshing — queue this one.
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }).catch((err) => Promise.reject(err));
      }

      // This request is first — it owns the refresh call.
      isRefreshing = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Wake up every queued request with the new token.
        processQueue(null, data.accessToken);

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        // Refresh itself failed (token expired or revoked) — log out.
        processQueue(refreshError, null);
        localStorage.clear();
        toast.error('Your session has expired. Please log in again.', { id: 'session-expired', duration: 4000 });
        setTimeout(() => { window.location.href = '/login'; }, 1500); // brief delay so toast is visible
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
