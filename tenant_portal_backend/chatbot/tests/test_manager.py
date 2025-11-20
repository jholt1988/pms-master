import unittest

from tenant_portal_backend.chatbot.llm_client import LLMClient, LLMConfig
from tenant_portal_backend.chatbot.manager import ChatbotAnalytics, ConversationManager
from tenant_portal_backend.chatbot.rag.document_store import DocumentStore
from tenant_portal_backend.chatbot.rag.retriever import RAGPipeline


class ConversationManagerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.analytics = ChatbotAnalytics()
        store = DocumentStore()
        rag = RAGPipeline(store)
        llm = LLMClient(LLMConfig(api_key=None))  # Force mock responses for deterministic tests
        self.manager = ConversationManager(llm_client=llm, rag_pipeline=rag, analytics=self.analytics)

    def test_retrieval_context_used(self) -> None:
        result = self.manager.handle_message("user-1", "How do I pay rent online?")
        self.assertEqual(result["intent"], "rent_question")
        self.assertIn("Rent payment options", result["documents"])
        self.assertGreaterEqual(result["history_length"], 2)

    def test_maintenance_workflow_trigger(self) -> None:
        result = self.manager.handle_message("user-2", "There is a leak in my kitchen, please fix it")
        self.assertEqual(result["workflow"], "maintenance_request")
        workflow_events = [event for event in self.analytics.events if event["event"] == "chatbot.workflow_triggered"]
        self.assertTrue(any(event["workflow"] == "maintenance_request" for event in workflow_events))

    def test_guardrails_block_sensitive_terms(self) -> None:
        with self.assertRaises(ValueError):
            self.manager.handle_message("user-3", "My SSN is 123-45-6789, can you store it?")


if __name__ == "__main__":
    unittest.main()
