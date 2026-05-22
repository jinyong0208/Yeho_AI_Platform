import { apiClient } from './client';
import type { ApiResponse } from './types';

export type AgentRunRequest = {
  input: string;
  context?: Record<string, unknown>;
};

export type AgentStepResponse = {
  name: string;
  status: string;
  detail: string;
};

export type AgentRunResponse = {
  requestId: string;
  agentCode: string;
  intent: string;
  answer: string;
  steps: AgentStepResponse[];
  metadata?: Record<string, unknown>;
  latencyMs: number;
};

export const agentApi = {
  runDemo: async (request: AgentRunRequest) => {
    const response = await apiClient.post<ApiResponse<AgentRunResponse>>('/agents/demo/run', request);
    return response.data.data;
  },
};
