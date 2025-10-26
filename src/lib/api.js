import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://stone-real-estate-real-capture-back.vercel.app';

export const api = axios.create({
  baseURL,
  // Remove withCredentials since we're using JWT tokens now
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  console.log('API Request - URL:', config.url, 'Token exists:', !!token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('API Request - Authorization header added');
  }
  return config;
});

// Global response interceptor: if 401, clear token and broadcast
api.interceptors.response.use(
  (response) => {
    console.log('API Response - Success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    console.log('API Response - Error:', error.config?.url, status, error.message);
    
    if (status === 401) {
      console.log('API Response - 401 Unauthorized, clearing token');
      // Clear invalid token
      localStorage.removeItem('authToken');
      // Notify the app to clear session
      try { window.dispatchEvent(new CustomEvent('app:unauthorized')); } catch (_) {}
    }
    return Promise.reject(error);
  }
);
