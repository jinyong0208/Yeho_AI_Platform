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

const isAuthEndpoint = (url?: string) => {
  const value = url ?? '';
  return value.includes('/auth/login') || value.includes('/auth/captcha');
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
  if (isAuthEndpoint(config.url)) {
    return config;
  }
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

  if (!isAuthEndpoint(url) && status === 401) {
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
