import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export type ApiResponse<T> = {
  code: number;
  message: string;
  requestId: string;
  data: T;
  timestamp: string;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function unwrap<T>(response: { data: ApiResponse<T> }) {
  return response.data.data;
}
