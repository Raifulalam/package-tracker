import { API_BASE_URL } from './config';

async function request(path, options = {}) {
  const { token, method = 'GET', body, headers = {}, timeoutMs = 15000 } = options;
  const requestUrl = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let response;

  try {
    response = await fetch(requestUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const networkError = new Error(
      error.name === 'AbortError'
        ? `API request timed out after ${timeoutMs / 1000} seconds: ${path}`
        : `Cannot reach API server at ${API_BASE_URL}. Make sure the backend is running and this route exists: ${path}`
    );
    networkError.cause = error;
    throw networkError;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      payload?.message ||
        payload?.msg ||
        (typeof payload === 'string' && payload.trim()) ||
        `API request failed for ${method} ${requestUrl}.`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
