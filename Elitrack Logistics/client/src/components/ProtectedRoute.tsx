import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: string[];
};

export function ProtectedRoute({ children, allowedRoles = [] }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
