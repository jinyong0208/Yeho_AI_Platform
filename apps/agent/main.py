from fastapi import FastAPI

from app.api.routes import api_router
from app.core.config import settings

app = FastAPI(
    title="Yeho AI Agent",
    version="0.1.0",
    description="FastAPI service for Agent, RAG and Workflow orchestration.",
)


@app.get("/health", tags=["health"])
async def root_health() -> dict[str, str]:
    return {"status": "UP", "service": settings.service_name}


app.include_router(api_router, prefix="/api/v1")
