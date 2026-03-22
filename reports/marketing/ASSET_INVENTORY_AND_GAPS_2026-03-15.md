# PMS Marketing Asset Inventory & Gaps


> **Branding Standard — Keyring OS**
>
> **Product Name:** Keyring OS  
> **Tagline:** *The Operating System for Real Estate*  
> **Positioning:** Control plane for real-estate intelligence (analytical, operational, enterprise-ready).  
> **Voice:** Technical, calm, confident, outcomes-focused. Avoid hype/cyberpunk language.  
> **Visual cues:** Dark layered UI, module signal colors, restrained motion, data-first layouts.

Date: 2026-03-15
Prepared by: marketing-asset-inventory-agent
Scope scanned:
- `clawdbot_remote/pms-plans/marketing`
- `pms-master/reports` (marketing/release-relevant docs)
- `pms-master/docs` (marketing-facing docs)
- Referenced media/evidence folders

## 1) Asset inventory (docs/media/copy)

| Type | Asset | Path | Owner (if known) | Freshness | Quality | Status |
|---|---|---|---|---|---|---|
| Core marketing doc | Long-form marketing page (master claims) | `clawdbot_remote/pms-plans/marketing/PROPERTY_MANAGEMENT_SUITE_MARKETING.md` | Unknown | **Stale content markers** (internal footer: `Version 1.0 | November 11, 2025`) | Strong structure, but high claim risk | Draft; **not launch-safe as-is** |
| Core marketing doc (duplicate) | Same long-form copy mirrored in docs | `pms-master/docs/project-management/property-management-suite-marketing.md` | Unknown | Same stale version footer | Duplicate copy increases drift risk | Active duplicate; should be canonicalized |
| Copy pack | MVP launch copy set (landing/email/social) | `clawdbot_remote/pms-plans/marketing/marketing-copy-mvp.md` | Unknown | Current edit date, but placeholder links | Good frameworks (AIDA/PAS), claim-heavy | Draft |
| Copy | Social launch posts | `clawdbot_remote/pms-plans/marketing/social-media-launch-posts.md` | Unknown | Current edit date, placeholders remain | Concise, channel-ready format | Draft |
| Copy | Email launch draft v1 | `clawdbot_remote/pms-plans/marketing/email-launch-announcement-draft.md` | Unknown | Current edit date, placeholders remain | Usable, less polished than v2 | Superseded draft |
| Copy | Email launch draft v2 | `clawdbot_remote/pms-plans/marketing/email-launch-announcement-draft-v2.md` | Unknown | Current edit date, placeholders remain (`[Mailing List]`, `[Link to Demo]`) | Better clarity and CTA | Draft, near-ready |
| Copy | Blog launch draft | `clawdbot_remote/pms-plans/marketing/blog-post-mvp-launch-draft.md` | Unknown | Current edit date, placeholder CTAs | Strong narrative | Draft |
| GTM doc | Product Hunt creative briefs | `clawdbot_remote/pms-plans/marketing/product-hunt-creative-briefs.md` | Unknown | Current edit date | Clear design direction | Ready for design production |
| Design prompt | Hero image generation prompt | `clawdbot_remote/pms-plans/marketing/hero-image-prompt-blog.md` | Unknown | Current edit date | Detailed prompt quality | Ready; **no generated image committed** |
| Brand asset brief | Logo concept (modern) | `clawdbot_remote/pms-plans/marketing/brand-logo-concept-modern.md` | Unknown | Current edit date | Good prompt quality | Concept only; **no logo asset file** |
| Brand asset brief | Logo concept (classic) | `clawdbot_remote/pms-plans/marketing/brand-logo-concept-classic.md` | Unknown | Current edit date | Good prompt quality | Concept only; **no logo asset file** |
| Onboarding copy | Role-based onboarding sequence | `clawdbot_remote/pms-plans/marketing/onboarding-sequence.md` | Unknown | Current edit date | Useful lifecycle map | Draft; not mapped to in-product flows with evidence links |
| Adjacent brand brief | Personal brand launch brief | `clawdbot_remote/pms-plans/marketing/personal-brand-launch-brief-v1.md` | **Jordan + Aden** | Dated `2026-02-28` | Clear but not PMS product-launch specific | Off-scope/adjacent |
| Adjacent brand brief | Production company launch brief | `clawdbot_remote/pms-plans/marketing/production-company-launch-brief-v1.md` | **Jordan + Aden** | Dated `2026-02-28` | Clear but not PMS product-launch specific | Off-scope/adjacent |
| Launch-safe messaging | Claims-sanitized messaging pack | `pms-master/reports/release/launch-messaging-pack.md` | Unknown | Dated `2026-03-15` | High (practical + conservative wording) | **Primary launch-safe copy source** |
| Claims validation | Claim-by-claim verification matrix | `pms-master/reports/release/marketing-claims-verification.md` | **marketing-validation-agent** | Dated `2026-03-15` | High evidence discipline | Ready reference for approvals |
| Freshness validation | Metrics/pricing/contact freshness check | `pms-master/reports/release/marketing-freshness-check.md` | **marketing-validation-agent** | Dated `2026-03-15` | High | Gate shows FAIL pending fixes |
| Sales/ops collateral | Owner Approval SLA Kit | `pms-master/docs/marketing/OWNER_APPROVAL_SLA_KIT_PM_PRINCIPALS.md` | Unknown | Current edit date | Strong practical value | Usable as consideration/conversion collateral |
| Media evidence | MVP screenshots set (all flows) | `pms-master/reports/evidence/screenshots/2026-03-06/` | Unknown | Captured for `2026-03-06` cycle | Good (real product evidence) | Available; not yet packaged into public-facing media kit |
| Design media | UI wireframe SVGs | `pms-master/docs/guides/ui-wireframes/*.svg` | Unknown | Current edit date | Good for internal demos, not polished marketing visuals | Internal-only support assets |

### Direct evidence of unresolved placeholders
- `(555) 123-4567` in `clawdbot_remote/pms-plans/marketing/PROPERTY_MANAGEMENT_SUITE_MARKETING.md`
- `[Link]` / `[Link to Website/Demo]` in blog and social docs
- `[Mailing List]`, `[Your Company Name]`, `[Link to Demo]` in email drafts

## 2) Missing assets by funnel stage

### Awareness
- **Missing:** Final brand kit (approved logo files, favicon, color/typography exports) from logo concepts.
- **Missing:** Produced hero visuals/screens/video cuts (briefs exist; outputs not checked in).
- **Missing:** Public website launch page artifact using launch-safe copy.

### Consideration
- **Missing:** Public proof pack mapping each claim to evidence artifact (called for in validation docs).
- **Missing:** Customer-facing one-pager comparing “Verified / Estimate / Future” capabilities.
- **Missing:** Case study evidence with attributable sources (current case studies are unverified).

### Conversion
- **Missing:** Finalized pricing page/SKU sheet with owner approval and effective date.
- **Missing:** Validated contact endpoints (sales/support email deliverability, phone routing, support portal uptime).
- **Missing:** Live CTA destinations (demo booking URL, trial URL) replacing placeholders.

### Retention
- **Missing:** Lifecycle email templates in final production form (welcome, onboarding milestones, adoption nudges).
- **Missing:** Customer education asset pack (how-to videos, role-based quick-start PDFs) tied to current MVP behavior.
- **Missing:** Published SLA/operations expectations aligned to what is verified in-product.

## 3) Risk flags

1. **Stale metrics/versioning risk**
   - Marketing master doc still carries `Version 1.0 | November 11, 2025` while release docs are `2026-03-15`.
2. **Unverified claim risk (high)**
   - Release verification tags many claims as `Unverified` or `Estimate` (e.g., MAE/R² benchmarks, uptime, ROI percentages, case-study outcomes, test counts, compliance assertions).
3. **Compliance-sensitive wording risk (high)**
   - Phrases like “Bank-level security”, GDPR/SOC2/audit statements require explicit owner/legal sign-off before public use.
4. **Placeholder/public-contact risk (high)**
   - Phone placeholder `(555)` and unresolved links/tokens in launch copy can break trust at launch.
5. **Source-of-truth drift risk**
   - Near-identical long-form marketing copy exists in two locations (`pms-plans/marketing` and `docs/project-management`), raising inconsistency risk.

## 4) Quick-win fixes (next 48h)

1. **Freeze one canonical marketing source**
   - Keep one primary file for public marketing copy and mark the other as mirror/archive.
2. **Patch placeholders immediately**
   - Replace all `[Link]` tokens, `[Mailing List]`, `[Your Company Name]`, and `(555)` with real values or temporary internal-only markers.
3. **Ship launch-safe copy only**
   - Use `pms-master/reports/release/launch-messaging-pack.md` as default external messaging baseline.
4. **Apply claim labels inline**
   - In master marketing doc, tag quantified claims as `Verified`, `Estimate`, or `Future` using the verification matrix.
5. **Publish “Last verified” header**
   - Add verification date + reviewer block at top of each externally used asset.

## 5) Medium-term fixes (2–6 weeks)

1. **Build a formal marketing proof appendix**
   - Claim → evidence path → owner approver → verification date.
2. **Create production media kit**
   - Final logo exports, hero images, screenshot set, social card variants, Product Hunt gallery assets.
3. **Finalize commercial and contact readiness**
   - Pricing governance workflow, owned contact runbook, quarterly contact smoke test.
4. **Legal/compliance review lane**
   - Required approval workflow for security/compliance/SLA/ROI language prior to publication.
5. **Retention content system**
   - Onboarding and lifecycle comms set (email templates + in-app nudges + quick-start docs) tied to measured activation events.

---
## Readiness summary (actionable)
- **What is ready now:** launch-safe positioning/messaging foundation and internal evidence docs.
- **What blocks external marketing quality:** unresolved placeholders, unverified quantified claims, and missing finalized brand/media deliverables.
- **Go-forward recommendation:** external comms should use only the launch-safe messaging pack + verified claims until proof appendix and final media kit are complete.
