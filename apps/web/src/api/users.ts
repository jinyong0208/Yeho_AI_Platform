import { apiClient } from './client';
import type { AdminPasswordResetPayload, ApiResponse, TenantUser, UserCreatePayload } from './types';

export const userApi = {
  async list(tenantId: string) {
    const response = await apiClient.get<ApiResponse<TenantUser[]>>(`/tenants/${tenantId}/users`);
    return response.data.data;
  },

  async create(tenantId: string, payload: UserCreatePayload) {
    const response = await apiClient.post<ApiResponse<TenantUser>>(`/tenants/${tenantId}/users`, payload);
    return response.data.data;
  },

  async resetPassword(tenantId: string, userId: string, payload: AdminPasswordResetPayload) {
    const response = await apiClient.put<ApiResponse<void>>(`/tenants/${tenantId}/users/${userId}/password`, payload);
    return response.data.data;
  },
};
