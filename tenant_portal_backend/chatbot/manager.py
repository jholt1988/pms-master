"""Conversation manager for the tenant chatbot."""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .llm_client import LLMClient, LLMConfig
from .rag.document_store import Document
from .rag.retriever import RAGPipeline

logger = logging.getLogger("tenant_portal.chatbot.manager")


@dataclass
class ConversationTurn:
    role: str
    content: str
    intent: str
    timestamp: float
    actions: List[str] = field(default_factory=list)


@dataclass
class ConversationSession:
    user_id: str
    session_id: str
    turns: List[ConversationTurn] = field(default_factory=list)
    pending_workflows: List[str] = field(default_factory=list)

    def add_turn(self, turn: ConversationTurn, max_turns: int = 20) -> None:
        self.turns.append(turn)
        if len(self.turns) > max_turns:
            self.turns = self.turns[-max_turns:]


class ChatbotAnalytics:
    """Very small analytics sink to capture structured events."""

    def __init__(self) -> None:
        self.events: List[Dict[str, str]] = []

    def track_event(self, name: str, payload: Dict[str, str]) -> None:
        payload_with_name = {"event": name, **payload}
        self.events.append(payload_with_name)
        logger.debug("analytics event=%s payload=%s", name, payload)


class ConversationManager:
    def __init__(
        self,
        *,
        llm_client: Optional[LLMClient] = None,
        rag_pipeline: Optional[RAGPipeline] = None,
        analytics: Optional[ChatbotAnalytics] = None,
    ) -> None:
        self.llm = llm_client or LLMClient(LLMConfig())
        self.rag = rag_pipeline or RAGPipeline()
        self.analytics = analytics or ChatbotAnalytics()
        self.sessions: Dict[str, ConversationSession] = {}

    def _get_session(self, user_id: str) -> ConversationSession:
        if user_id not in self.sessions:
            self.sessions[user_id] = ConversationSession(user_id=user_id, session_id=str(uuid.uuid4()))
        return self.sessions[user_id]

    def _classify_intent(self, message: str) -> str:
        lowered = message.lower()
        if any(keyword in lowered for keyword in ("repair", "fix", "leak", "broken")):
            return "maintenance_request"
        if any(keyword in lowered for keyword in ("pay", "rent", "autopay")):
            return "rent_question"
        if any(keyword in lowered for keyword in ("renew", "extend", "lease")):
            return "lease_question"
        return "general"

    def _trigger_workflow(self, session: ConversationSession, intent: str, documents: List[Document], message: str) -> Optional[str]:
        workflow = None
        if intent == "maintenance_request":
            workflow = "maintenance_request"
        elif intent == "rent_question" and "late" in message.lower():
            workflow = "rent_reminder"
        elif intent == "lease_question" and any("renewal" in doc.content.lower() for doc in documents):
            workflow = "renewal_offer"

        if workflow:
            session.pending_workflows.append(workflow)
            self.analytics.track_event(
                "chatbot.workflow_triggered",
                {"workflow": workflow, "session_id": session.session_id, "intent": intent},
            )
        return workflow

    def handle_message(self, user_id: str, message: str) -> Dict[str, object]:
        session = self._get_session(user_id)
        intent = self._classify_intent(message)
        retrieved_docs = self.rag.retrieve(message)
        context = self.rag.build_context(message)

        start_time = time.time()
        response = self.llm.generate_response(
            message,
            context=context,
            history=[{"role": turn.role, "content": turn.content} for turn in session.turns[-6:]],
        )
        latency_ms = int((time.time() - start_time) * 1000)

        workflow = self._trigger_workflow(session, intent, retrieved_docs, message)

        session.add_turn(
            ConversationTurn(role="user", content=message, intent=intent, timestamp=time.time())
        )
        session.add_turn(
            ConversationTurn(
                role="assistant",
                content=response.get("content", ""),
                intent=intent,
                timestamp=time.time(),
                actions=[workflow] if workflow else [],
            )
        )

        self.analytics.track_event(
            "chatbot.message",
            {
                "intent": intent,
                "session_id": session.session_id,
                "latency_ms": str(latency_ms),
                "workflow": workflow or "",
            },
        )

        return {
            "session_id": session.session_id,
            "intent": intent,
            "workflow": workflow,
            "response": response,
            "documents": [doc.title for doc in retrieved_docs],
            "history_length": len(session.turns),
        }

