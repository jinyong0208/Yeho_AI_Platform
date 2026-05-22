import { apiClient, unwrap } from './client';

export type UsageLog = {
  id: string;
  tenantId: string;
  apiKeyId?: string | null;
  providerCode?: string | null;
  modelCode?: string | null;
  requestId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  realCost: number;
  chargeCredits: number;
  profit: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  promptSummary?: string | null;
  createdAt: string;
};

export type UsageSummary = {
  tenantId?: string | null;
  requestCount: number;
  successCount: number;
  failureCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  chargeCredits: number;
  realCost: number;
  profit: number;
};

export type UsageQuery = {
  tenantId?: string | null;
  apiKeyId?: string | null;
  providerCode?: string | null;
  modelCode?: string | null;
  success?: boolean | null;
  limit?: number;
};

const compactParams = (params: UsageQuery) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));

export const usageApi = {
  logs: async (params: UsageQuery = {}) =>
    unwrap<UsageLog[]>(await apiClient.get('/usage-logs', { params: compactParams(params) })),
  summary: async (params: Omit<UsageQuery, 'success' | 'limit'> = {}) =>
    unwrap<UsageSummary>(await apiClient.get('/usage-stats/summary', { params: compactParams(params) })),
};
