import { apiClient } from './client';
import type { ApiResponse } from './types';

export type InvoiceApplication = {
  id: string;
  tenantId: string;
  invoiceTitle: string;
  taxNo?: string;
  amountCny: string;
  invoiceType: string;
  status: string;
  email?: string;
  appliedAt: string;
  issuedAt?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceApplicationCreateRequest = {
  tenantId: string;
  invoiceTitle: string;
  taxNo?: string;
  amountCny: string;
  invoiceType: string;
  email?: string;
  remark?: string;
};

type InvoiceListParams = {
  tenantId?: string | null;
  status?: string | null;
  limit?: number;
};

function compactParams(params: InvoiceListParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

export const invoiceApi = {
  list: async (params: InvoiceListParams = {}) => {
    const response = await apiClient.get<ApiResponse<InvoiceApplication[]>>('/invoice-applications', {
      params: compactParams(params),
    });
    return response.data.data;
  },
  create: async (request: InvoiceApplicationCreateRequest) => {
    const response = await apiClient.post<ApiResponse<InvoiceApplication>>('/invoice-applications', request);
    return response.data.data;
  },
  process: async (id: string, remark?: string) => {
    const response = await apiClient.post<ApiResponse<InvoiceApplication>>(`/invoice-applications/${id}/process`, {
      remark,
    });
    return response.data.data;
  },
  issue: async (id: string, remark?: string) => {
    const response = await apiClient.post<ApiResponse<InvoiceApplication>>(`/invoice-applications/${id}/issue`, {
      remark,
    });
    return response.data.data;
  },
  reject: async (id: string, remark?: string) => {
    const response = await apiClient.post<ApiResponse<InvoiceApplication>>(`/invoice-applications/${id}/reject`, {
      remark,
    });
    return response.data.data;
  },
};
