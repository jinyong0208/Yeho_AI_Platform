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
  status: string;
  expiredAt?: string | null;
  createdAt?: string;
  lastUsedAt?: string | null;
};

export type TenantApiKeyCreated = TenantApiKeyResponse & {
  apiKey: string;
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
  createApiKey: async (tenantId: Id, payload: { name: string }): Promise<TenantApiKeyCreated> =>
    unwrapData(await apiClient.post(`/tenants/${tenantId}/api-keys`, payload)),
  revokeApiKey: async (tenantId: Id, keyId: Id) => {
    await apiClient.delete(`/tenants/${tenantId}/api-keys/${keyId}`);
  },
};
