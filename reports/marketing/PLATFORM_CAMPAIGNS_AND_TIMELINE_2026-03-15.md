# PMS Platform Campaigns & 12-Week Timeline
**Date:** 2026-03-15  
**Release context:** Current status is **NO-GO** (`reports/RELEASE_GO_NO_GO_DECISION_2026-03-15.md`)  
**Purpose:** Execution-ready marketing plan by platform, sequenced around release remediation gates.

---

## 0) Planning assumptions and guardrails

1. **No external “GA launch” messaging** until P0 blockers are closed with evidence.
2. Public claims must follow launch-safe language in `reports/release/launch-messaging-pack.md` and verified-claims discipline in:
   - `reports/release/marketing-claims-verification.md`
   - `reports/release/marketing-freshness-check.md`
3. Any quantitative claims without evidence are labeled **Estimate** or removed.
4. Contact and pricing publication is blocked until owner sign-off and endpoint validation.

---

## 1) Dependency gating (what cannot go live before P0/P1 closure)

## P0 gates (hard blockers)

### P0-A Security remediation (critical)
- **Required closure:** rotate/revoke exposed key material, remove secrets, enforce secret scanning, publish remediation note.
- **Blocks:**
  - Website launch page and trust/security copy
  - Press/social “launch” announcement
  - Partner/community amplification
  - Sales outbound at scale

### P0-B Ops readiness
- **Required closure:** production payment config verified, backup+restore drill evidence, rollback SOP evidence.
- **Blocks:**
  - Any campaign promising payment workflow readiness in production
  - Demo-to-pilot conversion campaigns
  - Paid acquisition to live trial/signup flow

### P0-C QA smoke gate
- **Required closure:** full core-flow smoke pass evidence (auth, property/unit CRUD, app→lease, payment, maintenance, inspection, mobile checks).
- **Blocks:**
  - Public “MVP ready for rollout” CTA
  - Webinars/live demos to external audiences
  - SDR/AE high-volume outreach

## P1 gates (conditional blockers)

### P1-D Evidence and claims freshness
- **Required closure:** stale paths fixed; claims classified verified/estimate/future; latest dates attached.
- **Blocks until closed:**
  - Detailed comparison pages
  - KPI-heavy case-study style assets

### P1-E Pricing/contact validation
- **Required closure:** pricing owner approval + effective date; email/phone/URL/social endpoint smoke check.
- **Blocks until closed:**
  - Pricing page publication
  - Paid campaigns with direct “Book now / Contact sales” CTA

### P1-F Compliance-sensitive wording sign-off
- **Required closure:** legal/security owner review for compliance/SLA/security superlatives.
- **Blocks until closed:**
  - Security/compliance landing pages and outbound claims

---

## 2) 12-week timeline by phase

## Phase 1: Prelaunch remediation + demand warming (Weeks 1–4)
**Objective:** Close P0; keep audience warm with educational/problem-led content that avoids over-claiming.

| Week | Milestone | Key outputs | Gate dependency |
|---|---|---|---|
| W1 | Remediation sprint kickoff | Message matrix v1, claims register, asset backlog, owner assignment | None |
| W2 | Security/Ops/QA evidence capture | Internal readiness update, demo script freeze, website placeholder refresh | P0 progress required |
| W3 | Soft prelaunch content starts | Thought leadership posts, waitlist email, SEO pillar draft pages | No GA claims |
| W4 | Launch readiness checkpoint | Go-live asset pack final (copy, visuals, webinar deck, enablement), channel dry run | **All P0 closure required to advance** |

## Phase 2: Launch window (Weeks 5–6)
**Objective:** Execute coordinated launch once P0 closed and launch decision flips to GO.

| Week | Milestone | Key outputs | Gate dependency |
|---|---|---|---|
| W5 | Launch week | Website launch page, LinkedIn/X launch threads, launch email #1, webinar #1, partner posts | **P0-A/B/C closed** |
| W6 | Launch sustain | Customer-question content, objection handling, launch email #2, retargeting/remarketing setup | P1-D/E/F in progress or closed |

## Phase 3: Post-launch optimization (Weeks 7–12)
**Objective:** Improve conversion efficiency and pipeline quality; expand proof assets once P1 closes.

| Week | Milestone | Key outputs | Gate dependency |
|---|---|---|---|
| W7–W8 | Message refinement | A/B test hero/value prop, update nurture emails, refine social hooks | P1-D preferred |
| W9–W10 | Proof scaling | Publish validated use-case pages, webinar #2, partner co-marketing | P1-D + P1-F |
| W11–W12 | Scale + planning | Q2 campaign plan, budget rebalance, sales feedback integration, KPI retro | P1-E closed for pricing-led pushes |

---

## 3) Platform campaign breakdown (execution-ready)

## 3.1 LinkedIn
- **Objective:** Build credibility with PM principals/operators; drive demo requests.
- **Audience:** Property managers, broker-owners, operations leads, proptech buyers (SMB-mid market).
- **Content pillars:**
  1. Operational pain points and workflow breakdowns
  2. Product walkthrough snippets (leases, maintenance, payments)
  3. Launch/process transparency (what’s verified now)
- **Cadence:**
  - Prelaunch: 3 posts/week
  - Launch: daily for 5 business days
  - Post-launch: 2–3 posts/week
- **Sample assets:** Founder POV post, carousel “Lease→Maintenance→Payment flow”, 45–60s product clip, customer-question response post.
- **KPI targets (non-fabricated):**
  - Posting consistency: >=90% of planned posts published
  - CTR to site/demo page
  - Qualified inbound demo requests attributed to LinkedIn
  - Engagement rate trend week-over-week
- **Owner role:** Content Lead + PMM (Product Marketing Manager)

## 3.2 X / Twitter
- **Objective:** Real-time awareness + conversation with proptech/build-in-public audience.
- **Audience:** Founders, operators, indie builders, proptech community.
- **Content pillars:**
  1. Build/release updates
  2. Short tactical threads for property ops workflows
  3. Webinar/event reminders and recap clips
- **Cadence:**
  - Prelaunch: 1 thread/week + 4–6 short posts/week
  - Launch: 2 posts/day
  - Post-launch: 1 thread/week + daily short posts (weekdays)
- **Sample assets:** Launch thread, before/after ops workflow graphic, short demo GIFs, AMA post.
- **KPI targets:**
  - Link clicks and profile-to-site visits
  - Reply quality (qualified questions)
  - Webinar registrations from X
- **Owner role:** Social Media Manager

## 3.3 Email
- **Objective:** Convert known leads/waitlist to demos and pilot conversations.
- **Audience:** Existing contacts, waitlist, partner referrals, prior demo attendees.
- **Content pillars:**
  1. Launch narrative and problem/solution fit
  2. Role-based use cases (manager/admin/tenant)
  3. Objection handling and implementation readiness
- **Cadence:**
  - Prelaunch: 1 nurture email/week
  - Launch: 2 emails in launch week
  - Post-launch: 1 email/week + behavioral triggers
- **Sample assets:** Launch announcement, “Top 5 workflow wins” email, post-webinar follow-up, re-engagement sequence.
- **KPI targets:**
  - Open rate trend
  - CTR to booking page
  - Meeting-booked conversion from email clicks
  - Unsubscribe/spam complaint thresholds monitored weekly
- **Owner role:** Lifecycle Marketing Manager

## 3.4 Website / SEO
- **Objective:** Convert intent traffic and create durable discovery for core use cases.
- **Audience:** High-intent buyers searching property management operations software + use-case queries.
- **Content pillars:**
  1. Core product pages (lease, maintenance, payments)
  2. Comparison/problem pages (once claims validated)
  3. Educational blog content and glossary pieces
- **Cadence:**
  - Prelaunch: 2 landing pages + 2 SEO articles
  - Launch: hero relaunch + launch page
  - Post-launch: 1–2 SEO articles/week + monthly page refresh
- **Sample assets:** Launch hero page, role-based solution pages, FAQ hub, webinar replay page.
- **KPI targets:**
  - Organic sessions trend
  - Conversion rate to demo form
  - Bounce/engagement on launch pages
  - Keyword ranking movement for target queries
- **Owner role:** Growth Marketing Manager + Web/SEO Specialist

## 3.5 YouTube / Webinar
- **Objective:** Demonstrate product credibility and shorten sales cycle via visual proof.
- **Audience:** Evaluation-stage prospects; partner and community audiences.
- **Content pillars:**
  1. Guided product walkthroughs
  2. Workflow deep dives by role
  3. Q&A / objection handling clips
- **Cadence:**
  - Prelaunch: 1 teaser video + webinar registration push
  - Launch: 1 flagship webinar + recording snippets
  - Post-launch: 2 videos/month + 1 webinar/month
- **Sample assets:** 30-min live demo webinar deck, 3–5 short clips, FAQ episode.
- **KPI targets:**
  - Registrations and attendance rate
  - Watch time and retention
  - Demo meetings sourced post-event
- **Owner role:** PMM + Solutions Engineer

## 3.6 Communities / Partnerships
- **Objective:** Earn trust via third-party channels and co-marketing.
- **Audience:** Property management communities, operator groups, ecosystem partners.
- **Content pillars:**
  1. Educational workshops and playbooks
  2. Partner co-authored insights
  3. Office-hours style Q&A
- **Cadence:**
  - Prelaunch: identify 10 target communities/partners + outreach wave 1
  - Launch: 2 partner/community announcements
  - Post-launch: 1 joint activity every 2 weeks
- **Sample assets:** Partner kit (copy + visuals), community AMA prompt pack, co-branded webinar one-pager.
- **KPI targets:**
  - Number of active partners/communities
  - Referral traffic and referred opportunities
  - Co-marketing event attendance
- **Owner role:** Partnerships Manager

## 3.7 Sales enablement
- **Objective:** Ensure sales can convert demand with consistent, compliant messaging.
- **Audience:** SDR, AE, Solutions, RevOps.
- **Content pillars:**
  1. ICP and discovery framework
  2. Objection handling and proof mapping
  3. Demo script + follow-up sequence
- **Cadence:**
  - Prelaunch: weekly enablement sync
  - Launch: daily 15-min standup for first 2 weeks
  - Post-launch: weekly win/loss review
- **Sample assets:** Battlecard, one-page product narrative, persona-based email templates, call script, FAQ/claims sheet.
- **KPI targets:**
  - % reps trained/certified on launch messaging
  - Lead-to-meeting and meeting-to-opportunity conversion trend
  - Sales cycle length trend by source
- **Owner role:** Sales Enablement Lead + PMM

---

## 4) Budget bands (12-week)

> Bands are planning envelopes (not performance promises). Use based on cash/risk tolerance.

| Band | Total (12 weeks) | Channel mix guidance |
|---|---:|---|
| Lean | USD 12k–25k | Content-heavy organic: LinkedIn/X, email, SEO, 1 webinar, minimal paid boosts/tools |
| Standard | USD 30k–70k | Balanced: content + webinar + moderate paid distribution + design/video contractors |
| Aggressive | USD 90k–180k | Multi-channel scale: paid social/search, partner sponsorships, higher video cadence, CRO tooling |

### Suggested allocation by band (% of total)
| Channel | Lean | Standard | Aggressive |
|---|---:|---:|---:|
| LinkedIn + X distribution | 15% | 18% | 22% |
| Email + automation tooling | 10% | 10% | 8% |
| Website/SEO/CRO | 30% | 25% | 20% |
| YouTube/Webinar production | 20% | 20% | 18% |
| Communities/Partnerships | 10% | 12% | 15% |
| Sales enablement assets/training | 15% | 15% | 17% |

---

## 5) Measurement framework

## North-star metric
- **Qualified Pipeline Created from Marketing-Sourced and Marketing-Influenced Opportunities (12-week cumulative).**

## Channel KPI framework
- **LinkedIn/X:** reach quality, CTR, qualified inbound demo requests, conversation quality.
- **Email:** open rate, CTR, meeting-booked conversion, unsubscribe/spam health.
- **Website/SEO:** demo-form conversion rate, organic growth trend, landing-page engagement.
- **YouTube/Webinar:** registration-to-attendance, watch-time retention, post-event meeting conversion.
- **Communities/Partnerships:** partner-sourced opportunities, referral traffic quality, joint activity output.
- **Sales enablement:** rep certification completion, stage conversion trend, win/loss reason tagging.

## Weekly review rhythm (operating cadence)
- **Monday (30 min):** KPI scoreboard + prior-week variance review.
- **Wednesday (30 min):** Content/campaign execution standup; unblock dependencies.
- **Friday (45 min):** Revenue-marketing sync (pipeline quality, objections, message tweaks).
- **Every 2 weeks:** Channel budget rebalance decision.
- **End of Phase checkpoints:** W4 (go/no-go), W6 (launch performance), W12 (retro + next-quarter plan).

---

## 6) Phase-based execution checklist

## Prelaunch (W1–W4)
- [ ] Build claims register (Verified / Estimate / Future / Unverified)
- [ ] Freeze launch-safe messaging pack
- [ ] Complete P0 remediation evidence links
- [ ] QA smoke evidence attached
- [ ] Contact endpoint validation completed
- [ ] Pricing publication approval documented

## Launch (W5–W6)
- [ ] Publish launch page and announce across LinkedIn/X/Email
- [ ] Run webinar #1 and push clips
- [ ] Activate sales outbound sequence with approved claims
- [ ] Start weekly KPI operating rhythm

## Post-launch optimization (W7–W12)
- [ ] A/B test top 3 conversion pages/emails
- [ ] Refresh underperforming channels every 2 weeks
- [ ] Add validated proof assets as P1 items close
- [ ] Produce W12 performance retrospective + next plan

---

## 7) Immediate next actions (next 7 days)
1. Appoint owners for each platform and set weekly publishing SLAs.
2. Create a single source-of-truth claims sheet tied to evidence paths.
3. Complete P0 closure tracker and attach links in launch runbook.
4. Prepare launch-day content in draft status (do not publish until GO).
5. Finalize budget band selection and procurement (tools/contractors/creative).
