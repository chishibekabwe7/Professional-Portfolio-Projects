import { GoogleOAuthProvider } from '@react-oauth/google';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import InstallButton from './components/InstallButton';
import { ProtectedRoute } from './components/ProtectedRoute';
import ThemeToggle from './components/ThemeToggle';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

console.log('[LOCK] Google Client ID loaded:', GOOGLE_CLIENT_ID ? '[CHECK] Loaded' : '[ERROR] Missing - Check .env file');

export default function App() {
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    const onApiOffline = (event) => {
      setApiUnavailable(true);
      setApiMessage(event?.detail?.message || 'Backend is currently unavailable. Showing cached/offline content when possible.');
    };

    const onApiOnline = () => {
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
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 3000,
                background: 'var(--danger-surface)',
                color: 'var(--danger-text)',
                borderBottom: '1px solid var(--danger-border)',
                padding: '10px 16px',
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              {isOffline
                ? 'You are offline. Some features may use cached data only.'
                : apiMessage || 'Cannot reach API right now. Retrying automatically.'}
            </div>
          )}
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ThemeToggle />
          <InstallButton />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
