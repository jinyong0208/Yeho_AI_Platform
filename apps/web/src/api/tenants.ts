import { apiClient } from './client';
import type { ApiResponse, Tenant, TenantCreatePayload } from './types';

export type BusinessSystem = {
  id: string;
  tenantId: string;
  systemCode: string;
  systemName: string;
  description?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BusinessSystemPayload = {
  systemCode: string;
  systemName: string;
  description?: string;
  status?: string;
};

export const tenantApi = {
  async list() {
    const response = await apiClient.get<ApiResponse<Tenant[]>>('/tenants');
    return response.data.data;
  },

  async create(payload: TenantCreatePayload) {
    const response = await apiClient.post<ApiResponse<Tenant>>('/tenants', payload);
    return response.data.data;
  },

  async remove(id: string) {
    await apiClient.delete<ApiResponse<null>>(`/tenants/${id}`);
  },

  async businessSystems(tenantId: string) {
    const response = await apiClient.get<ApiResponse<BusinessSystem[]>>(`/tenants/${tenantId}/business-systems`);
    return response.data.data;
  },

  async createBusinessSystem(tenantId: string, payload: BusinessSystemPayload) {
    const response = await apiClient.post<ApiResponse<BusinessSystem>>(`/tenants/${tenantId}/business-systems`, payload);
    return response.data.data;
  },

  async updateBusinessSystem(tenantId: string, id: string, payload: BusinessSystemPayload) {
    const response = await apiClient.put<ApiResponse<BusinessSystem>>(`/tenants/${tenantId}/business-systems/${id}`, payload);
    return response.data.data;
  },

  async disableBusinessSystem(tenantId: string, id: string) {
    const response = await apiClient.delete<ApiResponse<BusinessSystem>>(`/tenants/${tenantId}/business-systems/${id}`);
    return response.data.data;
  },
};
