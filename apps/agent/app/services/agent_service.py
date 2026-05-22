from time import perf_counter
from typing import Any, TypedDict
from uuid import uuid4

from langgraph.graph import END, StateGraph

from app.core.config import settings
from app.schemas.agent import AgentRunRequest, AgentRunResponse, AgentStep


class AgentState(TypedDict, total=False):
    requestId: str
    tenantId: str | None
    userId: str | None
    input: str
    intent: str
    answer: str
    steps: list[dict[str, str]]
    metadata: dict[str, Any]


def _append_step(state: AgentState, name: str, detail: str) -> AgentState:
    steps = [*state.get("steps", []), {"name": name, "status": "DONE", "detail": detail}]
    return {**state, "steps": steps}


class AgentService:
    def __init__(self) -> None:
        self._graph = self._build_graph()

    def status(self) -> str:
        return "ready"

    def run(self, request: AgentRunRequest) -> AgentRunResponse:
        started_at = perf_counter()
        request_id = request.requestId or str(uuid4())
        result = self._graph.invoke(
            {
                "requestId": request_id,
                "tenantId": request.tenantId,
                "userId": request.userId,
                "input": request.input,
                "steps": [],
                "metadata": request.context,
            }
        )
        latency_ms = int((perf_counter() - started_at) * 1000)
        return AgentRunResponse(
            requestId=request_id,
            agentCode=settings.demo_agent_code,
            intent=result["intent"],
            answer=result["answer"],
            steps=[AgentStep(**step) for step in result.get("steps", [])],
            metadata={
                "environment": settings.environment,
                "tenantId": request.tenantId,
                "userId": request.userId,
                "workflow": "langgraph-demo",
            },
            latencyMs=latency_ms,
        )

    def _build_graph(self):
        graph = StateGraph(AgentState)
        graph.add_node("classify", self._classify)
        graph.add_node("plan", self._plan)
        graph.add_node("respond", self._respond)
        graph.set_entry_point("classify")
        graph.add_edge("classify", "plan")
        graph.add_edge("plan", "respond")
        graph.add_edge("respond", END)
        return graph.compile()

    def _classify(self, state: AgentState) -> AgentState:
        text = state["input"].lower()
        if any(word in text for word in ["wallet", "credits", "billing", "recharge", "钱包", "扣费"]):
            intent = "billing"
        elif any(word in text for word in ["api key", "apikey", "key", "密钥"]):
            intent = "api_key"
        elif any(word in text for word in ["model", "provider", "qwen", "deepseek", "模型", "供应商"]):
            intent = "model_gateway"
        elif any(word in text for word in ["usage", "token", "log", "统计", "日志"]):
            intent = "observability"
        else:
            intent = "general"
        return _append_step({**state, "intent": intent}, "classify", f"intent={intent}")

    def _plan(self, state: AgentState) -> AgentState:
        intent = state["intent"]
        plans = {
            "billing": "check wallet balance, ledger, recharge order, then explain credit flow",
            "api_key": "verify tenant scope, inspect key status, then suggest safe key operations",
            "model_gateway": "inspect provider and model route, then explain routing path",
            "observability": "read usage logs and summary, then point to request_id for tracing",
            "general": "answer from platform context and suggest the nearest console area",
        }
        return _append_step(state, "plan", plans[intent])

    def _respond(self, state: AgentState) -> AgentState:
        intent = state["intent"]
        answers = {
            "billing": "我会优先看钱包余额、冻结额度和流水，再判断这次 AI 调用是否已经完成扣费。",
            "api_key": "API Key 应只在创建时展示完整值，后续通过前缀、状态和 last_used_at 做运维排查。",
            "model_gateway": "模型请求会先按 model_code 进入 Model Router，再转到对应 Provider Adapter。",
            "observability": "排查调用时先拿 request_id，再看 usage log 的 success、error_code、tokens 和 charge_credits。",
            "general": "当前 Demo Agent 已接入 LangGraph 流程，可用于验证 Java 到 Python 的基础编排链路。",
        }
        return _append_step({**state, "answer": answers[intent]}, "respond", "demo response generated")


agent_service = AgentService()
