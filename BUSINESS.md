# PathIQ — business, market, and regulatory outline

This document is a working **YC-style** brief: who pays, why now, how you go to market, and how you stay on the right side of FDA rules. **Numbers below are illustrative placeholders**—replace with primary sources before investor diligence.

---

## Problem and market (lead the pitch with this)

Digital IHC and whole-slide imaging are scaling faster than pathologist headcount in many regions. Labs face **rising slide volume**, **multi-marker panels**, and pressure on turnaround—while hiring remains competitive. AI-assisted **scoring, triage, and QC** are among the few levers that scale without adding a pathologist FTE for every incremental case.

ZNF835 / colorectal biology is the **origin story and research credibility**; the **product** is generalized IHC decision-support for labs, not a single-gene diagnostic.

---

## Target customer (v1)

**Primary:** independent reference / regional pathology labs and digital-pathology-forward groups with **lower procurement friction** than full IDN central purchasing.

**Secondary (later):** academic medical centers and hospital systems (longer sales cycles, IT/security gates).

**Buyer:** lab director or lead pathologist with budget for workflow software; IT approves hosting (SaaS or VPC).

---

## Pricing (example to stress-test with customers)

Illustrative starting point for conversation (not a quote):

- **~$500 / seat / month** per pathologist power-user on the analysis console, with annual commit; or
- **Per-slide / per-block** metering for high-volume send-out labs.

Adjust after 10–15 discovery calls. Anchor value on **hours saved per week** and **report consistency**, not raw model accuracy.

---

## Go-to-market (first 90 days)

1. **Ship a live demo** (`/demo` + trained weights)—YC partners will tap it before reading the appendix.
2. **One design-partner lab** (e.g. pilot with a UPMC-adjacent or regional lab given CMU/UPMC proximity): scoped LOI, defined success metrics (time-on-task, within-1 agreement with reference reads on a fixed panel).
3. **90-second Loom** of: upload → tissue + intensity + uncertainty + Grad-CAM on a **public** IHC patch dataset (see `docs/PUBLIC_IHC_DATASETS.md`).
4. **Replace bootstrap synthetic weights** with a small **real** public cohort (even ~200 patches) before broad investor outreach.

---

## Regulatory path (high level — **not legal advice**)

**Positioning:** PathIQ is **clinical decision support (CDS)**—it **assists** pathologists with quantification and visualization; it does **not** replace independent clinical judgment for primary diagnosis.

**FDA framing (typical paths to discuss with regulatory counsel):**

- Many CDS products are regulated as **medical devices** when they drive time-sensitive decisions; the **FDA’s CDS guidance** (e.g. transparency, explainability, and “not intended to acquire, process, or analyze medical images” carve-outs) determines whether software falls outside device definition or requires marketing authorization.
- When image analysis software **is** a device, **Class II via 510(k)** is often the relevant path for moderate-risk diagnostic/quantification software—**order-of-magnitude 12–18 months** to clearance for well-scoped predicates and datasets, vs **Class III PMA** timelines (multi-year) for novel high-risk diagnostics.

**Table stakes for investors:** show you know the difference between **workflow / CDS** claims vs **standalone diagnostic** claims, and that you will **engage FDA-qualified regulatory counsel** before commercial distribution.

---

## Unfair advantage (draft)

- **Deep research narrative** on ZNF835, IHC, and AI-enhanced histology (peer-style paper + lab fluency).
- **CMU / UPMC proximity** for clinical advisors, pilot design, and talent.
- **Engineering velocity:** production API + UI + uncertainty + Grad-CAM in one stack.

---

## Early customer evidence (add as you collect it)

YC cares about **“someone who would pay”** or **“someone who would use it.”** Even informal signal counts.

**Template for your first pathologist note (email / Slack / LOI):**

> “I would use PathIQ for [QC / triage / batch scoring] on [marker / case type] because [specific workflow pain]. I understand this is decision-support and not a primary diagnosis.”  
> — Name, credential, institution, date.

Paste the quote (with permission) into this section when ready.

---

## What to validate next

- [ ] Replace synthetic bootstrap weights with **public IHC** training run + hold-out metrics.
- [ ] One signed or verbal **design partner** + success criteria.
- [ ] **Regulatory memo** from counsel (1–2 pages) on device vs non-device CDS for your exact UX copy and outputs.
