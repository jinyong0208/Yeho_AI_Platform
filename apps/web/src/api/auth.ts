import { apiClient } from './client';
import type { ApiResponse, CaptchaResponse, LoginRequest, LoginResponse, SelfPasswordChangePayload } from './types';

export const authApi = {
  async captcha() {
    const response = await apiClient.get<ApiResponse<CaptchaResponse>>('/auth/captcha');
    return response.data.data;
  },

  async login(payload: LoginRequest) {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    return response.data.data;
  },

  async changePassword(payload: SelfPasswordChangePayload) {
    const response = await apiClient.put<ApiResponse<void>>('/auth/me/password', payload);
    return response.data.data;
  },
};
