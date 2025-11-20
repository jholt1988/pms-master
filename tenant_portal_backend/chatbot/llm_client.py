"""LLM client used by the tenant chatbot orchestration layer."""

from __future__ import annotations

import json
import logging
import os
import re
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

logger = logging.getLogger("tenant_portal.chatbot.llm")


@dataclass
class LLMConfig:
    provider: str = "azure-openai"
    model: str = "gpt-4o-mini"
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    max_requests_per_minute: int = 60
    temperature: float = 0.2
    max_tokens: int = 800


class RateLimiter:
    """Simple leaky bucket rate limiter."""

    def __init__(self, max_calls: int, interval_seconds: int) -> None:
        self.max_calls = max_calls
        self.interval = interval_seconds
        self.calls = deque()

    def acquire(self) -> None:
        now = time.time()
        while self.calls and now - self.calls[0] > self.interval:
            self.calls.popleft()
        if len(self.calls) >= self.max_calls:
            sleep_for = self.interval - (now - self.calls[0])
            logger.debug("Rate limit reached; sleeping for %.2fs", sleep_for)
            time.sleep(max(0, sleep_for))
        self.calls.append(time.time())


class LLMClient:
    """Wrapper that enforces key handling, moderation, and rate limiting."""

    def __init__(self, config: LLMConfig | None = None) -> None:
        self.config = config or LLMConfig()
        self.config.api_key = self.config.api_key or self._load_api_key()
        self.config.endpoint = self.config.endpoint or self._default_endpoint()
        self.rate_limiter = RateLimiter(self.config.max_requests_per_minute, 60)

    def _load_api_key(self) -> Optional[str]:
        env_priority = ["LLM_API_KEY", "AZURE_OPENAI_KEY", "OPENAI_API_KEY"]
        for env_var in env_priority:
            if os.getenv(env_var):
                logger.info("Using API key from %s", env_var)
                return os.getenv(env_var)
        logger.warning("LLM API key not provided; using mock responses")
        return None

    def _default_endpoint(self) -> Optional[str]:
        if self.config.provider == "azure-openai":
            return os.getenv("AZURE_OPENAI_ENDPOINT")
        if self.config.provider == "openai":
            return "https://api.openai.com/v1/chat/completions"
        return None

    def redact_sensitive_data(self, content: str) -> str:
        content = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "***-**-****", content)
        content = re.sub(r"(account|routing) number\s*[:#-]?\s*\d+", "[redacted banking number]", content, flags=re.I)
        return content

    def moderate(self, content: str) -> None:
        banned_keywords = ("password", "ssn", "wire transfer", "credit card")
        lowered = content.lower()
        if any(keyword in lowered for keyword in banned_keywords):
            raise ValueError("Message failed moderation policies")

    def _mock_completion(self, prompt: str, context: str, history: Iterable[Dict[str, str]]) -> Dict[str, Any]:
        context_hint = context or ""
        summary = prompt.strip().split("?", maxsplit=1)[0][:120]
        return {
            "role": "assistant",
            "content": (
                f"Based on our policy library I found: {context_hint}. "
                f"Here's how we can help with '{summary}'."
            ).strip(),
            "usage": {"prompt_tokens": len(prompt.split()), "completion_tokens": len(context_hint.split())},
        }

    def _build_messages(self, prompt: str, context: str, history: Iterable[Dict[str, str]]) -> List[Dict[str, str]]:
        messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": (
                    "You are a property management assistant. Answer with actionable steps, reference policies, and"
                    " trigger workflows when appropriate."
                ),
            }
        ]
        for turn in history:
            messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})
        if context:
            messages.append({"role": "system", "content": f"Context documents:\n{context}"})
        messages.append({"role": "user", "content": prompt})
        return messages

    def generate_response(
        self,
        prompt: str,
        *,
        context: str = "",
        history: Iterable[Dict[str, str]] | None = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        history = history or []
        sanitized_prompt = self.redact_sensitive_data(prompt)
        self.moderate(sanitized_prompt)
        sanitized_history = [
            {"role": turn.get("role", "user"), "content": self.redact_sensitive_data(turn.get("content", ""))}
            for turn in history
        ]
        messages = self._build_messages(sanitized_prompt, context, sanitized_history)

        if not self.config.api_key:
            return self._mock_completion(sanitized_prompt, context, sanitized_history)

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.config.temperature,
            "max_tokens": max_tokens if max_tokens is not None else self.config.max_tokens,
            "stream": False,
        }

        headers = {"Content-Type": "application/json"}
        if self.config.provider in ("azure-openai", "openai"):
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        if self.config.provider == "azure-openai" and self.config.endpoint:
            headers["api-key"] = self.config.api_key

        self.rate_limiter.acquire()
        logger.debug("Dispatching LLM request with %d messages", len(messages))

        try:
            import urllib.request

            request = urllib.request.Request(self.config.endpoint, data=json.dumps(payload).encode("utf-8"), headers=headers)
            with urllib.request.urlopen(request, timeout=15) as response:
                body = json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # pragma: no cover - network disabled in tests
            logger.warning("Falling back to mock completion due to %s", exc)
            return self._mock_completion(sanitized_prompt, context, sanitized_history)

        choice = body.get("choices", [{}])[0]
        message = choice.get("message", {})
        return {
            "role": message.get("role", "assistant"),
            "content": message.get("content", ""),
            "usage": body.get("usage", {}),
        }

