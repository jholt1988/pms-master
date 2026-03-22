# Property Management Suite (PMS) Owner Approval SLA Kit


> **Branding Standard — Keyring OS**
>
> **Product Name:** Keyring OS  
> **Tagline:** *The Operating System for Real Estate*  
> **Positioning:** Control plane for real-estate intelligence (analytical, operational, enterprise-ready).  
> **Voice:** Technical, calm, confident, outcomes-focused. Avoid hype/cyberpunk language.  
> **Visual cues:** Dark layered UI, module signal colors, restrained motion, data-first layouts.

## For Property Management Principals

**Purpose:** Reduce owner-approval delays (and resulting maintenance disruption) from days to hours using clear approval rules, decision-ready packets, and a proof-first closeout standard in **Property Management Suite (PMS)**.

**Who this is for:** Small-to-mid property management companies (roughly 50–500 doors) where principals still absorb too much day-to-day operations coordination.

---

## 1) The Promise (Owner-Facing Standard)

Use this as your owner-facing commitment statement:

- **Response SLA:** Maintenance requests receive a same-business-day response (emergencies immediately).
- **Approval SLA:** For qualifying repairs, owner approvals are targeted within **4 business hours**.
- **No-Surprise Policy:** Repairs above threshold always include photos, scope, and cost range before dispatch.
- **Proof Pack Standard:** Every completed job includes before/after photos, invoice, and timeline.

**Plain-language version:**
> “No more long email threads. You approve with one link and pictures. Everything is documented.”

---

## 2) Approval Thresholds (Simple Rule Set)

Pick one default policy, then customize per owner profile.

### Recommended Default
- **Auto-approve under:** **$250** (repairs only, not upgrades)
- **Owner approval required at/over:** **$250**
- **Emergency override:** Dispatch immediately for health/safety/property-damage risk; notify owner as soon as practical
- **Preferred vendors:** Pre-approved list with defined scope categories

### Optional Second Tier (Larger Owners)
- Under **$250**: auto-approve
- **$250–$1,000**: owner approval via link
- Over **$1,000**: owner approval + 2 bids (unless emergency)

### Emergency Definition (Document Explicitly)
- Active leak / flooding
- No heat (winter) / no AC (heat wave, vulnerable tenants)
- Electrical burning smell / sparks
- Sewage backup
- Broken exterior door lock / security risk

---

## 3) Decision Packet Template (Approve in ~20 Seconds)

### Decision Packet — Required Fields
- **What happened (1 sentence):**
- **Risk if delayed (1 sentence):**
- **Scope (max 3 bullets):**
- **Cost range + expected midpoint:**
- **Earliest schedule window:**
- **Photos/video:** before (required), after (required at close)
- **Assigned vendor:** name + license/insurance status (if applicable)

### Suggested Structure (Copy/Paste)
**Issue:** {{short_title}}  
**Location:** {{property}} / {{unit}}  
**Risk if delayed:** {{risk}}  
**Recommended action:** {{repair_or_replace}}  
**Scope:**
- {{scope_1}}
- {{scope_2}}
- {{scope_3}}
**Estimate:** {{low}}–{{high}} (expected {{midpoint}})  
**Schedule:** {{soonest_window}}  
**Approve / deny:** {{approval_link}}

---

## 4) Owner Messaging Scripts (SMS + Email)

### A) Approval Request (SMS)
> “Approval needed: {{property}} {{unit}} — {{issue}}. Est: {{low}}–{{high}} (exp {{mid}}). Photos included. Approve/deny: {{link}}”

### B) Approval Request (Email)
**Subject:** Approval needed — {{property}} {{unit}} — {{issue}}

**Body:**
- What happened: {{one_sentence}}  
- Risk if delayed: {{one_sentence}}  
- Estimate: {{low}}–{{high}} (expected {{mid}})  
- Photos: {{link_or_embeds}}  
- Approve/deny: {{approval_link}}

### C) Auto-Approval Notice (SMS)
> “FYI: We dispatched {{vendor}} for {{issue}} at {{property}} {{unit}} under your auto-approval threshold. Proof Pack will follow on completion.”

### D) Completion + Proof Pack Delivery (Email)
**Subject:** Completed — {{property}} {{unit}} — Proof Pack

**Body:**
- Completed work: {{summary}}  
- Total cost: {{final_total}}  
- Before/after photos: {{link}}  
- Invoice: {{link}}  
- Timeline: {{created}} → {{approved}} → {{scheduled}} → {{completed}}

---

## 5) Proof Pack Standard (Dispute Prevention)

### Minimum Closeout Requirements
- Before photos (clear, 2–4)
- After photos (matching angles)
- Invoice attached (or itemized receipt)
- Work notes: what was completed + parts used
- Completion timestamp

### Quality Controls
- No “job complete” without after photos.
- No invoice payment without invoice attachment.
- Any variance > **15%** above approved midpoint triggers owner notification (or re-approval, based on policy).

---

## 6) Internal SLA Scoreboard (Weekly)

Track these metrics by property manager / maintenance coordinator:
- **Time to first response** (request → first update)
- **Time to approval** (packet sent → owner decision)
- **Work order cycle time** (opened → completed)
- **Reopen rate** (closed → reopened within 14 days)
- **Proof Pack completeness rate**

### Starter Targets
- First response: same business day
- Approval: <4 business hours
- Proof Pack completeness: >90%

---

## 7) 7-Day Rollout Plan

**Day 1–2:**
- Finalize approval thresholds (default + exceptions)
- Finalize emergency definition

**Day 3:**
- Standardize one Decision Packet template

**Day 4:**
- Train staff on rule: “No packet, no approval request.”

**Day 5:**
- Pilot in one building

**Day 6:**
- Tune thresholds and packet format using owner feedback

**Day 7:**
- Roll out to all owners and send launch communication

---

## 8) Owner Announcement Email (Copy/Paste)

**Subject:** Faster maintenance approvals + clearer documentation

Hi {{OwnerName}},

We’re rolling out a faster, clearer maintenance approval process in Property Management Suite.

What changes:
- You’ll receive a simple approval link for repairs above your threshold.
- Every approval request includes photos, scope, and a cost range.
- Every completed job includes a **Proof Pack** (before/after photos + invoice + timeline).

The goal is fewer surprises and faster issue resolution.

Reply with your preferred approval threshold (we recommend $250), and any vendors you want pre-approved.

Thanks,  
{{PMCompany}}

---

## 9) PMS Feature Mapping (Automation Targets)

This SLA kit maps directly to PMS maintenance workflow features:
- One-tap **Send Decision Packet**
- Approve / deny / request changes from SMS or email link
- Auto-approval rules by owner and property
- Proof Pack auto-generation on closeout
- Always-visible audit timeline
