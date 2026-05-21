import { apiClient } from './client';
import type { ApiResponse, LoginRequest, LoginResponse } from './types';

export const authApi = {
  async login(payload: LoginRequest) {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    return response.data.data;
  },
};
