"""Document store helpers for the chatbot RAG pipeline."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Sequence


@dataclass
class Document:
    """Knowledge base document."""

    id: str
    title: str
    content: str
    tags: Sequence[str] = field(default_factory=list)
    workflows: Sequence[str] = field(default_factory=list)


class DocumentStore:
    """Loads and indexes chatbot documents from disk."""

    def __init__(self, source_path: str | Path | None = None) -> None:
        base_path = Path(source_path or Path(__file__).resolve().parent / "knowledge_base.json")
        if not base_path.exists():
            raise FileNotFoundError(f"Document source not found: {base_path}")

        with base_path.open("r", encoding="utf-8") as handle:
            raw_documents = json.load(handle)

        self._documents: List[Document] = [Document(**doc) for doc in raw_documents]

    @property
    def documents(self) -> Sequence[Document]:
        return tuple(self._documents)

    def find_by_tag(self, tag: str) -> List[Document]:
        tag_lower = tag.lower()
        return [doc for doc in self._documents if any(t.lower() == tag_lower for t in doc.tags)]

    def __iter__(self) -> Iterable[Document]:
        return iter(self._documents)

