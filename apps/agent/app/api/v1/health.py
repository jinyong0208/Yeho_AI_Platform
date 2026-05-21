from fastapi import APIRouter

from app.core.config import settings
from app.services.agent_service import agent_service

router = APIRouter()


@router.get("")
async def health() -> dict[str, str]:
    return {
        "status": "UP",
        "service": settings.service_name,
        "agent": agent_service.status(),
    }
