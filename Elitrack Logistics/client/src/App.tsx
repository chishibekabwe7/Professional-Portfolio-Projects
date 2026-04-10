import { GoogleOAuthProvider } from '@react-oauth/google';
import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import InstallButton from './components/InstallButton';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

type ApiStatusEventDetail = {
  message?: string;
};

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

console.log('[LOCK] Google Client ID loaded:', GOOGLE_CLIENT_ID ? '[CHECK] Loaded' : '[ERROR] Missing - Check .env file');

export default function App() {
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [apiUnavailable, setApiUnavailable] = useState<boolean>(false);
  const [apiMessage, setApiMessage] = useState<string>('');

  useEffect(() => {
    const onOnline = (): void => setIsOffline(false);
    const onOffline = (): void => setIsOffline(true);

    const onApiOffline = (event: Event): void => {
      const apiEvent = event as CustomEvent<ApiStatusEventDetail>;
      setApiUnavailable(true);
      setApiMessage(apiEvent?.detail?.message || 'Backend is currently unavailable. Showing cached/offline content when possible.');
    };

    const onApiOnline = (): void => {
      setApiUnavailable(false);
      setApiMessage('');
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('api-offline', onApiOffline);
    window.addEventListener('api-online', onApiOnline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('api-offline', onApiOffline);
      window.removeEventListener('api-online', onApiOnline);
    };
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          {(isOffline || apiUnavailable) && (
            <div className="offline-banner">
              {isOffline
                ? 'You are offline. Some features may use cached data only.'
                : apiMessage || 'Cannot reach API right now. Retrying automatically.'}
            </div>
          )}
          <Suspense fallback={<div className="route-fallback"><div className="spinner" /></div>}>
            <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <InstallButton />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
