import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import api from '../api';
import type {
    LoginResponse,
    RegisterPayload,
    RegisterResponse,
} from '../types/api';
import type { AuthUser } from '../types/models';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  logout: () => void;
};

type AuthProviderProps = {
  children: ReactNode;
};

const AuthCtx = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('tl_user');

    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('tl_user');
      }
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem('tl_token', data.token);
    localStorage.setItem('tl_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const { data } = await api.post<RegisterResponse>('/auth/register', payload);
    return data;
  };

  const logout = (): void => {
    localStorage.removeItem('tl_token');
    localStorage.removeItem('tl_user');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, login, register, logout, loading }),
    [user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthCtx);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
