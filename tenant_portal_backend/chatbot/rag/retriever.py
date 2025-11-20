"""Retriever and lightweight RAG pipeline."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Iterable, List, Sequence, Tuple

from .document_store import Document, DocumentStore


def _tokenize(text: str) -> List[str]:
    return [token for token in re.findall(r"[a-zA-Z0-9]+", text.lower()) if token]


def _normalize(counter: Counter[str]) -> Counter[str]:
    if not counter:
        return counter
    max_freq = max(counter.values())
    return Counter({term: freq / max_freq for term, freq in counter.items()})


class Retriever:
    """Very small TF/IDF style retriever for the knowledge base."""

    def __init__(self, documents: Sequence[Document]) -> None:
        self.documents = list(documents)
        self.doc_term_freqs = {doc.id: Counter(_tokenize(doc.content)) for doc in self.documents}
        self.doc_norm_freqs = {doc_id: _normalize(counter) for doc_id, counter in self.doc_term_freqs.items()}
        self.idf = self._build_idf()

    def _build_idf(self) -> Counter[str]:
        doc_count = len(self.documents) or 1
        idf: Counter[str] = Counter()
        for counter in self.doc_term_freqs.values():
            for term in counter:
                idf[term] += 1
        return Counter({term: math.log(doc_count / (1 + freq)) for term, freq in idf.items()})

    def score(self, query: str, document: Document) -> float:
        query_terms = Counter(_tokenize(query))
        doc_vector = self.doc_norm_freqs.get(document.id, Counter())
        score = 0.0
        for term, freq in query_terms.items():
            score += freq * self.idf.get(term, 0.0) * doc_vector.get(term, 0.0)
        return score

    def top_k(self, query: str, k: int = 3) -> List[Tuple[Document, float]]:
        scored = [(doc, self.score(query, doc)) for doc in self.documents]
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:k]


class RAGPipeline:
    """Entry point for querying the tenant chatbot knowledge base."""

    def __init__(self, store: DocumentStore | None = None) -> None:
        self.store = store or DocumentStore()
        self.retriever = Retriever(self.store.documents)

    def retrieve(self, query: str, top_k: int = 3) -> List[Document]:
        return [doc for doc, score in self.retriever.top_k(query, top_k) if score > 0]

    def build_context(self, query: str, top_k: int = 3) -> str:
        documents = self.retrieve(query, top_k)
        return "\n".join(f"{doc.title}: {doc.content}" for doc in documents)

