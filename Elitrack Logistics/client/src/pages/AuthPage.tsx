import { faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../api';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ApiError } from '../types/api';

type AuthMode = 'login' | 'register';

type AuthFormState = {
  email: string;
  password: string;
  phone: string;
  full_name: string;
  company: string;
};

type GoogleAuthResponse = {
  token?: string;
  user?: {
    role?: string;
    [key: string]: unknown;
  };
  error?: string;
};

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState<AuthFormState>({ email: '', password: '', phone: '', full_name: '', company: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isAdminRole = (role?: string): boolean => ['admin', 'super_admin'].includes(String(role || ''));

  const handle = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse): Promise<void> => {
    console.log('[CHECK] Google Login Success - Token received');
    setError('');
    setLoading(true);
    try {
      // Send the token to your backend
      console.log('[SEND] Sending token to backend...');
      const response = await fetch(buildApiUrl('/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = (await response.json()) as GoogleAuthResponse;
      console.log('[RECV] Backend response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (!data.token || !data.user) {
        console.error('[ERROR] Invalid response structure:', data);
        throw new Error('Invalid response from server');
      }

      // Store token and redirect using same keys as AuthContext
      console.log('[CHECK] Token stored, redirecting...');
      localStorage.setItem('tl_token', data.token);
      localStorage.setItem('tl_user', JSON.stringify(data.user));
      navigate(isAdminRole(data.user.role) ? '/admin' : '/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google login failed. Check browser console for details.';
      console.error('[ERROR] Google login error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (): void => {
    console.error('[ERROR] Google Authentication Error');
    setError('Google login failed. Please try again.');
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login(form.email, form.password);
        navigate(isAdminRole(user.role) ? '/admin' : '/dashboard');
      } else {
        // For register, just create the account without logging in
        await register(form);
        setSuccess('Account created successfully! Please log in with your credentials.');
        setForm({ email: '', password: '', phone: '', full_name: '', company: '' });
        setTimeout(() => {
          setMode('login');
          setSuccess('');
        }, 2000);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-toolbar">
          <ThemeToggle />
        </div>
        <div className="auth-brand">
          <h1 className="auth-brand__title">ELITRACK</h1>
          <p className="auth-brand__subtitle">FLEET MULTI-ASSET PORTAL</p>
        </div>

        <div className="auth-card">
          <div className="auth-mode-switch">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={mode === m ? 'auth-mode-btn is-active' : 'auth-mode-btn'}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {mode === 'login' && (
            <div className="auth-google-wrap">
              <GoogleLogin
                key={theme}
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme={theme === 'dark' ? 'filled_black' : 'outline'}
              />
            </div>
          )}

          <div className="auth-alt-text">
            {mode === 'login' && 'Or continue with email'}
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input name="full_name" placeholder="Your full name" value={form.full_name} onChange={handle} />
                </div>
                <div className="form-group">
                  <label>Company / Mine</label>
                  <input name="company" placeholder="e.g. Kansanshi Mining" value={form.company} onChange={handle} />
                </div>
                <div className="form-group">
                  <label>Phone (optional)</label>
                  <input name="phone" placeholder="0977 000 000" value={form.phone} onChange={handle} />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" placeholder="you@company.zm" value={form.email} onChange={handle} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handle} required />
            </div>

            {success && <p className="auth-feedback auth-feedback--success"><FontAwesomeIcon icon={faCircleCheck} style={{ color: '#4ade80', marginRight: 8 }} />{success}</p>}
            {error && <p className="auth-feedback auth-feedback--error"><FontAwesomeIcon icon={faCircleXmark} style={{ color: '#e74c3c', marginRight: 8 }} />{error}</p>}

            <button type="submit" className="btn btn-gold btn-full" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Access Fleet Portal' : 'Create Account'}
            </button>
          </form>

          <p className="auth-copyright">
            &copy; {new Date().getFullYear()} Elitrack Logistics. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
