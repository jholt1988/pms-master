# Getting Started

Quick setup for the Property Management Suite.

## Prerequisites

- Node.js 20+, pnpm
- PostgreSQL 15+
- Python 3.9+ (for ML service)
- Docker (optional)

## Steps

1. Clone: `git clone https://github.com/jholt1988/pms-master.git`
2. Backend: `cd tenant_portal_backend && cp .env.example .env && pnpm install && pnpm prisma:generate && pnpm dev`
3. Operator app: `cd operator_app && pnpm install && pnpm dev`
4. Mobile: `cd tenant_portal_mobile && pnpm install && pnpm start`
5. ML service: `cd rent_optimization_ml && python -m venv venv && pip install -r requirements.txt && python main.py`

See [Backend Environment Setup](../../setup/environment-setup-backend.md) and [Complete Execution Guide](../../setup/complete-execution-guide.md).
