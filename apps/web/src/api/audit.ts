import { apiClient } from './client';
import type { ApiResponse } from './types';

export type AuditLogResponse = {
  id: string;
  tenantId?: string;
  userId?: string;
  username?: string;
  roles?: string;
  requestId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  method?: string;
  path?: string;
  queryString?: string;
  statusCode?: number;
  success?: boolean;
  latencyMs?: number;
  ip?: string;
  userAgent?: string;
  createdAt?: string;
};

type AuditLogParams = {
  tenantId?: string | null;
  username?: string;
  action?: string | null;
  resourceType?: string;
  success?: boolean | null;
  limit?: number;
};

function compactParams(params: AuditLogParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

export const auditApi = {
  logs: async (params: AuditLogParams = {}) => {
    const response = await apiClient.get<ApiResponse<AuditLogResponse[]>>('/audit-logs', {
      params: compactParams(params),
    });
    return response.data.data;
  },
};
