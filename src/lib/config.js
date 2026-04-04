const fallbackApiBaseUrl = import.meta.env.DEV
  ? 'https://courier-tracking-system-pnj7.onrender.com'
  : 'http://localhost:5001';

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL || fallbackApiBaseUrl).replace(/\/$/, '');

export const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL || API_BASE_URL).replace(/\/$/, '');
