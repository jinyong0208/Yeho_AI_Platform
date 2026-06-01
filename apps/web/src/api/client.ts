import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { notifications } from '@mantine/notifications';
import i18n from '../i18n';
import { useAuthStore } from '../store/useAuthStore';

export type ApiResponse<T> = {
  code: number;
  message: string;
  requestId: string;
  data: T;
  timestamp: string;
};

const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const apiRootURL = import.meta.env.VITE_API_ROOT_URL ?? apiBaseURL.replace(/\/api\/v1\/?$/, '');

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
});

export const rootApiClient = axios.create({
  baseURL: apiRootURL || undefined,
  timeout: 15000,
});

let sessionExpiredNotified = false;

const redirectToLogin = () => {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

const expireSession = () => {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    return;
  }
  useAuthStore.getState().logout();
  if (!sessionExpiredNotified) {
    sessionExpiredNotified = true;
    notifications.show({
      color: 'yellow',
      title: i18n.t('auth.sessionExpiredTitle'),
      message: i18n.t('auth.sessionExpiredMessage'),
    });
    window.setTimeout(() => {
      sessionExpiredNotified = false;
    }, 3000);
  }
  redirectToLogin();
};

const attachAuthToken = (config: InternalAxiosRequestConfig) => {
  const { accessToken, tokenExpiresAt } = useAuthStore.getState();
  if (accessToken && tokenExpiresAt && Date.now() >= tokenExpiresAt) {
    expireSession();
    throw new axios.CanceledError('Session expired');
  }
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
};

const handleAuthError = (error: AxiosError) => {
  const status = error.response?.status;
  const url = error.config?.url ?? '';
  const data = error.response?.data as { message?: string } | undefined;
  const isLoginRequest = url.includes('/auth/login');
  const looksUnauthenticated = status === 401 || (status === 403 && data?.message === 'Access denied');

  if (!isLoginRequest && looksUnauthenticated) {
    expireSession();
  }
  return Promise.reject(error);
};

apiClient.interceptors.request.use(attachAuthToken);
rootApiClient.interceptors.request.use(attachAuthToken);
apiClient.interceptors.response.use((response) => response, handleAuthError);
rootApiClient.interceptors.response.use((response) => response, handleAuthError);

export function unwrap<T>(response: { data: ApiResponse<T> }) {
  return response.data.data;
}
