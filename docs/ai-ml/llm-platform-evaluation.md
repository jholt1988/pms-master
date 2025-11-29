# LLM Platform Evaluation and Selection

To support the upgraded tenant assistance chatbot we evaluated the managed LLM platforms already approved for the Property Management Suite. The goal was to balance response quality, safety, pricing, and enterprise controls.

## Evaluation Criteria
- **Response quality & multimodal context** – accuracy on leasing, rent, and maintenance prompts plus support for injecting structured knowledge base context.
- **Latency & throughput** – ability to return helpful answers in <2s median with concurrency headroom for peak tenant traffic.
- **Security & compliance** – SOC 2/Type II reports, data retention controls, and fine-grained API-key scoping.
- **Cost controls** – predictable per-token pricing, native rate limiting, and usage dashboards.
- **Extensibility** – streaming APIs, tool invocation, and lightweight SDKs for our Python (RAG + orchestration) service and TypeScript frontend.

## Platforms Considered
| Platform | Strengths | Limitations |
| --- | --- | --- |
| **Azure OpenAI (GPT-4o mini)** | High-quality answers, robust streaming support, enterprise compliance, managed network isolation. | Requires Azure enrollment; higher per-token cost than smaller models. |
| **Anthropic Claude Sonnet** | Strong reasoning and safety guardrails, JSON mode for workflows. | Slightly longer latency for long responses; limited availability in some regions. |
| **Mistral Large** | Competitive pricing, deployable in EU regions with on-prem options. | Fewer turnkey moderation endpoints and smaller ecosystem. |

## Selected Platform
Azure OpenAI (GPT-4o mini) offers the best combination of response quality, latency, and enterprise governance. The new chatbot backend loads the API key at runtime via `AZURE_OPENAI_KEY` / `LLM_API_KEY` environment variables and signs requests with the regional endpoint. We continue to expose a mock/fallback implementation for offline development and unit testing.

## Operational Controls
- **Security** – No API keys are stored in source control. Keys are pulled from environment variables and validated before issuing a request.
- **Safety & guardrails** – Inputs are run through lightweight moderation checks and redaction filters before dispatch. Responses are audited and any workflow triggers are logged.
- **Cost management** – Client-level rate limiting (60 RPM default) plus analytics emitted from the conversation manager keep usage within our budget envelopes.
- **Observability** – Structured logging (LLM latency, token counts, triggered workflows) flows through the chatbot manager and can be shipped to the existing ELK/Sentry stacks.
