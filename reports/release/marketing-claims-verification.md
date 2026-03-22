# Marketing Claims Verification (Goal D)


> **Branding Standard — Keyring OS**
>
> **Product Name:** Keyring OS  
> **Tagline:** *The Operating System for Real Estate*  
> **Positioning:** Control plane for real-estate intelligence (analytical, operational, enterprise-ready).  
> **Voice:** Technical, calm, confident, outcomes-focused. Avoid hype/cyberpunk language.  
> **Visual cues:** Dark layered UI, module signal colors, restrained motion, data-first layouts.

Date: 2026-03-15
Reviewer: marketing-validation-agent
Scope: Validate major claims in `clawdbot_remote/pms-plans/marketing/PROPERTY_MANAGEMENT_SUITE_MARKETING.md` against currently available product/release evidence.

## Tag legend
- **Verified**: Evidence exists in current code/docs.
- **Estimate**: Plausible business projection, but not backed by measured release evidence.
- **Future**: Explicitly roadmap/future work.
- **Unverified**: No reliable evidence found in current release packet/code scan.

## Claims matrix
| Claim | Tag | Evidence / Notes |
|---|---|---|
| MVP/demo readiness passed (19/19 acceptance) | **Verified** | `clawdbot_remote/pms-plans/strategy/MVP_LAUNCH_READINESS.md` shows 19 PASS / 0 FAIL. |
| Core PMS flows (property/lease/maintenance/payments) are implemented | **Verified** | Backend modules and frontend routes exist: `pms-master/tenant_portal_backend/src/app.module.ts`, `pms-master/tenant_portal_app/src/App.tsx`, payments/lease/maintenance pages/services under `tenant_portal_app/src/*`. |
| FAQ-based AI chatbot with intent/session/action suggestions | **Verified** | `pms-master/tenant_portal_app/src/domains/shared/ai-services/chatbot/ChatbotService.ts`, `faqDatabase.ts`, `README.md`; backend chatbot endpoint used in `ChatbotService.ts` and app module includes `ChatbotModule`. |
| “30+ FAQs” coverage | **Verified** | Stated in `pms-master/tenant_portal_app/src/domains/shared/ai-services/chatbot/README.md` and supported by extensive FAQ database in `faqDatabase.ts`. |
| LLM expansion is future capability | **Future** | Explicitly described as extension in chatbot README (`designed to be extended with LLM integration`). |
| Role-based access (tenant/PM/admin) | **Verified** | Route guards and role-based shells present (`tenant_portal_app/src/App.tsx`, `components/ui/Sidebar.tsx`, auth modules in backend). |
| JWT + bcrypt auth security | **Verified** | `tenant_portal_backend/src/auth/auth.module.ts`, `auth.service.ts`, `jwt.strategy.ts`, package includes bcrypt. |
| “24-hour token expiration” | **Unverified** | Marketing says 24h; backend default currently `60m` in `auth.module.ts` unless env override. |
| Optional TOTP MFA | **Unverified** | No clear active TOTP/2FA module found in release evidence scan. |
| SLA-based maintenance workflows | **Verified** | SLA policy creation and monitoring code exists (`prisma/seed.ts`, `src/jobs/maintenance-monitoring.service.ts`, maintenance modules). |
| Published SLA table (1h/4h/24h/72h etc.) | **Unverified** | SLA mechanisms exist, but exact public timings in marketing doc were not verified as current default policy values in release packet. |
| Rent optimization module exists | **Verified** | Rent optimization service/components present (`tenant_portal_app/src/domains/shared/ai-services/rent-optimization/*`). |
| XGBoost model with R² 0.85 / MAE $298 / 27 features | **Unverified** | No current release artifact in `pms-master` proving these exact benchmark values. |
| Live Rentcast-driven comparables in production | **Unverified** | Config mentions providers including rentcast, but no release evidence proving live production integration status (`ai-services/config.ts`). |
| Predictive maintenance model 65%+ accuracy and 20–30% cost reduction | **Future** | Marketing itself labels predictive maintenance as enhancement/roadmap; code/docs still indicate TODO/future maturity in places. |
| Payment processing + autopay workflows | **Verified** | Payment endpoints/pages, Stripe checkout session usage, and payment method flows exist (`tenant_portal_app/src/domains/tenant/features/payments/PaymentsPage.tsx`, backend payments modules). |
| “Reduce late payments 35%, collections overhead 50%” | **Estimate** | No measured KPI evidence in release packet; keep as estimate. |
| “Reduce support tickets 40–60%” | **Estimate** | No measured post-launch support analytics in release packet. |
| “Increase rental revenue 15–20%” | **Estimate** | No audited production KPI report in release packet. |
| “141+ unit tests, 20+ E2E, 161+ total” | **Unverified** | Historical/marketing mention exists; current release packet does not include fresh test-count evidence snapshot. |
| “99.9% uptime, <200ms API, 1,000+ concurrent users” | **Unverified** | No load/perf/SLO evidence bundle in release packet. |
| GDPR/SOC2/audits/encryption compliance claims | **Unverified** | Security controls exist in codebases (e.g., MIL AES-256-GCM components), but formal compliance attestations are not in release packet. |
| Customer case studies with specific outcomes | **Unverified** | No attributable customer evidence in current repo/release docs. |
| Suggested pricing tiers ($99/$299/$699) are official | **Unverified** | Marketing labels them as “Suggested”; no commercial/pricing source of truth found in release packet. |

## Legal/compliance-sensitive claims requiring owner sign-off
1. **Security/compliance assertions**: GDPR compliance, SOC2 readiness/certification, quarterly third-party pentests, encryption statements as public guarantees.
2. **Performance/SLA guarantees**: 99.9% uptime, response-time guarantees, concrete SLA response/resolution commitments.
3. **ROI and quantified outcomes**: revenue uplift %, ticket reduction %, cost savings %, case-study outcomes.
4. **“Bank-level security” and similar superlatives** without third-party substantiation.

## Practical recommendation (concise)
- Ship launch copy using only **Verified + clearly-labeled Future** claims.
- Move all KPI deltas (%, $ savings, MAE/R²) to **“Estimated / pilot benchmark”** labels until proof pack exists.
- Add a one-page **public claims appendix** linking each number to an artifact path before external launch.
