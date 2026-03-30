export const API_BASE_URL =
    (import.meta.env.VITE_API_URL || 'https://courier-tracking-system-pnj7.onrender.com').replace(/\/$/, '');

export const SOCKET_URL =
    (import.meta.env.VITE_SOCKET_URL || API_BASE_URL).replace(/\/$/, '');
