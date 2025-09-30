import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://wmhsl-real-estate-backend.vercel.app';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});
// Global response interceptor: if 401, broadcast and reject
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Notify the app to clear session
      try { window.dispatchEvent(new CustomEvent('app:unauthorized')); } catch (_) {}
    }
    return Promise.reject(error);
  }
);
