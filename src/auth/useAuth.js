import { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try {
      const { data } = await api.get('/api/v1/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password });
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) return { ok: false, message: 'Incorrect email or password.' };
      if (status === 400) return { ok: false, message: 'Invalid input.' };
      return { ok: false, message: 'Login failed. Please try again.' };
    }
  }

  async function logout() {
    try { await api.post('/api/v1/auth/logout'); } catch {}
    setUser(null);
  }

  useEffect(() => {
    refreshMe();
    const onUnauthorized = () => setUser(null);
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
