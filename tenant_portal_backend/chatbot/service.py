"""FastAPI wrapper for the tenant chatbot RAG pipeline."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .manager import ConversationManager

app = FastAPI(title="Tenant Chatbot RAG Service", version="1.0.0")
manager = ConversationManager()


class ChatRequest(BaseModel):
    user_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    intent: str
    workflow: Optional[str]
    response: Dict[str, Any]
    documents: List[str]
    history_length: Optional[int] = None


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/message", response_model=ChatResponse)
def handle_message(request: ChatRequest) -> Dict[str, Any]:
    try:
        return manager.handle_message(request.user_id, request.message)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("tenant_portal_backend.chatbot.service:app", host="0.0.0.0", port=9000, reload=False)
