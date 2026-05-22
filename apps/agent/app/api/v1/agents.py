from fastapi import APIRouter

from app.core.config import settings
from app.schemas.agent import AgentRunRequest, AgentRunResponse
from app.services.agent_service import agent_service

router = APIRouter()


@router.get("/demo")
async def demo_agent() -> dict[str, object]:
    return {
        "agentCode": settings.demo_agent_code,
        "status": agent_service.status(),
        "workflow": "langgraph-demo",
        "capabilities": ["intent_classification", "guided_response", "java_bridge_smoke"],
    }


@router.post("/demo/run", response_model=AgentRunResponse)
async def run_demo_agent(request: AgentRunRequest) -> AgentRunResponse:
    return agent_service.run(request)
