from abc import ABC, abstractmethod
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    content: str


class AiProviderAdapter(ABC):
    @abstractmethod
    async def chat(self, request: ChatRequest) -> ChatResponse:
        raise NotImplementedError
