import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
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

const attachAuthToken = (config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

apiClient.interceptors.request.use(attachAuthToken);
rootApiClient.interceptors.request.use(attachAuthToken);

export function unwrap<T>(response: { data: ApiResponse<T> }) {
  return response.data.data;
}
