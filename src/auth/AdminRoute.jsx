import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role || user.metadata?.role;
  if (String(role).toLowerCase() !== 'admin') return <Navigate to="/" replace />;
  return children;
}
