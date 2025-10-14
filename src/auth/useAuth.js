import { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try {
      // Only try to refresh if we have a token
      const token = localStorage.getItem('authToken');
      console.log('RefreshMe - Token found:', !!token);
      
      if (!token) {
        console.log('RefreshMe - No token, setting user to null');
        setUser(null);
        return;
      }
      
      console.log('RefreshMe - Calling /api/v1/auth/me');
      const { data } = await api.get('/api/v1/auth/me');
      console.log('RefreshMe - Success, user:', data.user);
      setUser(data.user);
    } catch (error) {
      console.log('RefreshMe - Error:', error.response?.status, error.message);
      // Clear invalid token
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    try {
      const normUser = (username || '').trim().toLowerCase();
      console.log('Login - Attempting login for:', normUser);
      const { data } = await api.post('/api/v1/auth/login', { username: normUser, password });
      
      console.log('Login - Response data:', data);
      
      // Store the JWT token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        console.log('Login - Token stored in localStorage');
      } else {
        console.warn('Login - No token in response!');
      }
      
      // Set user from login response
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      console.log('Login - Error:', err.response?.status, err.message);
      const status = err?.response?.status;
      if (status === 401) return { ok: false, message: 'Incorrect username or password.' };
      if (status === 400) return { ok: false, message: 'Invalid input.' };
      return { ok: false, message: 'Login failed. Please try again.' };
    }
  }

  async function logout() {
    // JWT is stateless, just remove token and clear user
    localStorage.removeItem('authToken');
    setUser(null);
  }

  useEffect(() => {
    refreshMe();
    const onUnauthorized = () => {
      localStorage.removeItem('authToken');
      setUser(null);
    };
    window.addEventListener('app:unauthorized', onUnauthorized);
    return () => window.removeEventListener('app:unauthorized', onUnauthorized);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refreshMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
