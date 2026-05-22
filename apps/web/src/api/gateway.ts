import { apiClient, unwrap } from './client';

export type Provider = {
  id: string;
  providerCode: string;
  providerName: string;
  baseUrl: string;
  status: string;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProviderCreateRequest = {
  providerCode: string;
  providerName: string;
  baseUrl: string;
  apiKey?: string;
  status?: string;
};

export type ModelConfig = {
  id: string;
  providerId: string;
  providerCode: string;
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
  createdAt: string;
  updatedAt: string;
};

export type ModelCreateRequest = {
  providerId: string;
  modelCode: string;
  displayName: string;
  inputPrice: number;
  outputPrice: number;
  inputCreditRate: number;
  outputCreditRate: number;
  billingMultiplier: number;
  supportStream: boolean;
  supportToolCall: boolean;
  status?: string;
};

export type TenantApiKey = {
  id: string;
  tenantId: string;
  apiKeyPrefix: string;
  name: string;
  status: string;
  expiredAt?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
};

export type TenantApiKeyCreated = TenantApiKey & {
  apiKey: string;
};

export const gatewayApi = {
  providers: async () => unwrap<Provider[]>(await apiClient.get('/providers')),
  createProvider: async (payload: ProviderCreateRequest) =>
    unwrap<Provider>(await apiClient.post('/providers', payload)),
  disableProvider: async (id: string) => {
    await apiClient.delete(`/providers/${id}`);
  },
  models: async () => unwrap<ModelConfig[]>(await apiClient.get('/models')),
  createModel: async (payload: ModelCreateRequest) => unwrap<ModelConfig>(await apiClient.post('/models', payload)),
  disableModel: async (id: string) => {
    await apiClient.delete(`/models/${id}`);
  },
  apiKeys: async (tenantId: string) =>
    unwrap<TenantApiKey[]>(await apiClient.get(`/tenants/${tenantId}/api-keys`)),
  createApiKey: async (tenantId: string, payload: { name: string }) =>
    unwrap<TenantApiKeyCreated>(await apiClient.post(`/tenants/${tenantId}/api-keys`, payload)),
  revokeApiKey: async (tenantId: string, id: string) => {
    await apiClient.delete(`/tenants/${tenantId}/api-keys/${id}`);
  },
};
