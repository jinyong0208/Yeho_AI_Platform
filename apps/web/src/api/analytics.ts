import { apiClient } from './client';

export type CostMetric = {
  dimension: string;
  dimensionName: string;
  requests: number;
  successRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  credits: number;
  cost: number;
  profit: number;
};

export type CostSummary = {
  days: number;
  requests: number;
  successRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  credits: number;
  cost: number;
  profit: number;
  daily: CostMetric[];
  providers: CostMetric[];
  models: CostMetric[];
  tenants: CostMetric[];
  apiKeys: CostMetric[];
};

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const analyticsApi = {
  costSummary: async (days = 7) =>
    unwrap<CostSummary>(await apiClient.get('/analytics/costs/summary', { params: { days } })),
  providerCosts: async (days = 7) =>
    unwrap<CostMetric[]>(await apiClient.get('/analytics/costs/providers', { params: { days } })),
};
