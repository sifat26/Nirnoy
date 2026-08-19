/**
 * Thin fetch wrapper around the backend API.
 *
 * - Prefixes every path with `/api` (Vite proxies this to the Express server in
 *   dev; same-origin in production).
 * - Attaches the bearer token from localStorage when `auth` is not disabled.
 * - Normalizes error responses ({ error, details }) into a typed ApiError.
 * - Emits a global `auth:unauthorized` event on a 401 so AuthContext can log out.
 */

const TOKEN_KEY = 'mcq_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details || null;
  }
}

async function request(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {};
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form; // let the browser set the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError('Network error — check your connection and that the server is running.', 0);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && data.error) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`;
    if (res.status === 401 && auth && token) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new ApiError(message, res.status, data && data.details);
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  upload: (path, form, opts) => request(path, { ...opts, method: 'POST', form }),
};
