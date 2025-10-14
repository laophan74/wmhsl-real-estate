import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://wmhsl-real-estate-backend.vercel.app';

export const api = axios.create({
  baseURL,
  // Remove withCredentials since we're using JWT tokens now
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor: if 401, clear token and broadcast
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Clear invalid token
      localStorage.removeItem('authToken');
      // Notify the app to clear session
      try { window.dispatchEvent(new CustomEvent('app:unauthorized')); } catch (_) {}
    }
    return Promise.reject(error);
  }
);
