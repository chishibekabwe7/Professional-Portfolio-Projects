import type { AxiosError } from 'axios';
import type { AuthUser } from './models';

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export type ApiError = AxiosError<ApiErrorPayload> & {
  userMessage?: string;
};

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  phone?: string;
  full_name?: string;
  company?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterResponse {
  token?: string;
  user?: AuthUser;
  message?: string;
  [key: string]: unknown;
}
