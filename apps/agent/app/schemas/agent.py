from typing import Any

from pydantic import BaseModel, Field


class AgentRunRequest(BaseModel):
    input: str = Field(..., min_length=1, max_length=4000)
    tenantId: str | None = None
    userId: str | None = None
    requestId: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class AgentStep(BaseModel):
    name: str
    status: str
    detail: str


class AgentRunResponse(BaseModel):
    requestId: str
    agentCode: str
    intent: str
    answer: str
    steps: list[AgentStep]
    metadata: dict[str, Any] = Field(default_factory=dict)
    latencyMs: int
