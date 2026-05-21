import { apiClient } from './client';
import type { ApiResponse, Tenant, TenantCreatePayload } from './types';

export const tenantApi = {
  async list() {
    const response = await apiClient.get<ApiResponse<Tenant[]>>('/tenants');
    return response.data.data;
  },

  async create(payload: TenantCreatePayload) {
    const response = await apiClient.post<ApiResponse<Tenant>>('/tenants', payload);
    return response.data.data;
  },

  async remove(id: number) {
    await apiClient.delete<ApiResponse<null>>(`/tenants/${id}`);
  },
};
