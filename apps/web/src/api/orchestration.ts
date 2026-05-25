import { apiClient } from './client';

type Id = string;

export type PromptTemplate = {
  id: Id;
  tenantId: Id;
  templateCode: string;
  templateName: string;
  description?: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PromptVersion = {
  id: Id;
  tenantId: Id;
  templateId: Id;
  versionNo: number;
  content: string;
  status: string;
  publishedAt: string;
  createdAt: string;
};

export type AgentConfig = {
  id: Id;
  tenantId: Id;
  systemCode?: string;
  dataDomain?: string;
  allowedDataDomains?: string;
  agentCode: string;
  agentName: string;
  description?: string;
  systemPrompt?: string;
  defaultModel: string;
  temperature?: number;
  maxTokens?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentExecuteLog = {
  id: Id;
  requestId: string;
  tenantId: Id;
  agentConfigId?: Id;
  systemCode?: string;
  dataDomain?: string;
  agentCode?: string;
  model?: string;
  latencyMs?: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  chargeCredits: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  traceId?: string;
  createdAt: string;
};

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const orchestrationApi = {
  promptTemplates: async (tenantId?: Id) =>
    unwrap<PromptTemplate[]>(await apiClient.get('/prompt-templates', { params: { tenantId } })),
  createPromptTemplate: async (payload: Partial<PromptTemplate>) =>
    unwrap<PromptTemplate>(await apiClient.post('/prompt-templates', payload)),
  updatePromptTemplate: async (id: Id, payload: Partial<PromptTemplate>) =>
    unwrap<PromptTemplate>(await apiClient.put(`/prompt-templates/${id}`, payload)),
  publishPromptTemplate: async (id: Id) =>
    unwrap<PromptVersion>(await apiClient.post(`/prompt-templates/${id}/publish`)),
  disablePromptTemplate: async (id: Id) =>
    unwrap<PromptTemplate>(await apiClient.delete(`/prompt-templates/${id}`)),
  promptVersions: async (id: Id) =>
    unwrap<PromptVersion[]>(await apiClient.get(`/prompt-templates/${id}/versions`)),
  agentConfigs: async (tenantId?: Id) =>
    unwrap<AgentConfig[]>(await apiClient.get('/agent-configs', { params: { tenantId } })),
  createAgentConfig: async (payload: Partial<AgentConfig>) =>
    unwrap<AgentConfig>(await apiClient.post('/agent-configs', payload)),
  updateAgentConfig: async (id: Id, payload: Partial<AgentConfig>) =>
    unwrap<AgentConfig>(await apiClient.put(`/agent-configs/${id}`, payload)),
  disableAgentConfig: async (id: Id) =>
    unwrap<AgentConfig>(await apiClient.delete(`/agent-configs/${id}`)),
  agentExecuteLogs: async (params?: { tenantId?: Id; requestId?: string; traceId?: string }) =>
    unwrap<AgentExecuteLog[]>(await apiClient.get('/agent-execute-logs', { params })),
};
