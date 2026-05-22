import { apiClient } from './client';

type Id = string;

type ApiEnvelope<T> = {
  data: {
    data: T;
  };
};

export type ProviderResponse = {
  id: Id;
  providerCode: string;
  providerName: string;
  baseUrl: string;
  status: string;
  hasApiKey: boolean;
  timeoutMs?: number;
  retryCount?: number;
  circuitFailureThreshold?: number;
  circuitCooldownSeconds?: number;
  fallbackModelCode?: string | null;
  healthStatus?: string | null;
  consecutiveFailures?: number;
  circuitOpenUntil?: string | null;
  lastCheckedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderTestResponse = {
  providerId: Id;
  providerCode: string;
  modelCode?: string;
  success: boolean;
  code: string;
  message: string;
  latencyMs: number;
  testedAt: string;
};

export type ModelResponse = {
  id: Id;
  providerId: Id;
  providerCode?: string;
  modelCode: string;
  displayName: string;
  inputPrice: number;
  outputPrice: number;
  inputCreditRate: number;
  outputCreditRate: number;
  billingMultiplier: number;
  supportStream: boolean;
  supportToolCall: boolean;
  status: string;
};

export type TenantApiKeyResponse = {
  id: Id;
  name: string;
  apiKeyPrefix: string;
  scopes: string[];
  status: string;
  expiredAt?: string | null;
  createdAt?: string;
  lastUsedAt?: string | null;
};

export type TenantApiKeyCreated = TenantApiKeyResponse & {
  apiKey: string;
};

export type RateLimitResponse = {
  id?: Id | null;
  tenantId: Id;
  apiKeyId?: Id | null;
  rpmLimit?: number | null;
  tpmLimit?: number | null;
  dailyCreditsLimit?: number | null;
  maxConcurrent?: number | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RateLimitPayload = {
  rpmLimit?: number | null;
  tpmLimit?: number | null;
  dailyCreditsLimit?: number | null;
  maxConcurrent?: number | null;
  status?: string;
};

const unwrapData = <T>(response: ApiEnvelope<T>) => response.data.data;

export const gatewayApi = {
  providers: async (): Promise<ProviderResponse[]> => unwrapData(await apiClient.get('/providers')),
  createProvider: async (payload: unknown): Promise<ProviderResponse> => unwrapData(await apiClient.post('/providers', payload)),
  updateProviderApiKey: async (id: Id, payload: { apiKey: string }): Promise<ProviderResponse> =>
    unwrapData(await apiClient.put(`/providers/${id}/api-key`, payload)),
  testProvider: async (id: Id, payload?: { model?: string; message?: string }): Promise<ProviderTestResponse> =>
    unwrapData(await apiClient.post(`/providers/${id}/test`, payload ?? {})),
  disableProvider: async (id: Id) => {
    await apiClient.delete(`/providers/${id}`);
  },
  models: async (): Promise<ModelResponse[]> => unwrapData(await apiClient.get('/models')),
  createModel: async (payload: unknown): Promise<ModelResponse> => unwrapData(await apiClient.post('/models', payload)),
  disableModel: async (id: Id) => {
    await apiClient.delete(`/models/${id}`);
  },
  apiKeys: async (tenantId: Id): Promise<TenantApiKeyResponse[]> =>
    unwrapData(await apiClient.get(`/tenants/${tenantId}/api-keys`)),
  createApiKey: async (tenantId: Id, payload: { name: string; scopes?: string[] }): Promise<TenantApiKeyCreated> =>
    unwrapData(await apiClient.post(`/tenants/${tenantId}/api-keys`, payload)),
  revokeApiKey: async (tenantId: Id, keyId: Id) => {
    await apiClient.delete(`/tenants/${tenantId}/api-keys/${keyId}`);
  },
  tenantRateLimit: async (tenantId: Id): Promise<RateLimitResponse | null> =>
    unwrapData(await apiClient.get(`/tenants/${tenantId}/rate-limits`)),
  updateTenantRateLimit: async (tenantId: Id, payload: RateLimitPayload): Promise<RateLimitResponse> =>
    unwrapData(await apiClient.put(`/tenants/${tenantId}/rate-limits`, payload)),
  apiKeyRateLimit: async (tenantId: Id, keyId: Id): Promise<RateLimitResponse | null> =>
    unwrapData(await apiClient.get(`/tenants/${tenantId}/rate-limits/api-keys/${keyId}`)),
  updateApiKeyRateLimit: async (tenantId: Id, keyId: Id, payload: RateLimitPayload): Promise<RateLimitResponse> =>
    unwrapData(await apiClient.put(`/tenants/${tenantId}/rate-limits/api-keys/${keyId}`, payload)),
};
