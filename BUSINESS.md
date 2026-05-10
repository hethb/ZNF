# PathIQ — business, market, and regulatory outline

This is a working YC-style brief: who pays, why now, how we sell, and how we de-risk regulation. This document is intentionally concrete where we have hypotheses and explicit where we still need evidence.

---

## Problem and market (lead the pitch with this)

Cancer burden growth increases downstream pathology work. WHO/IARC reports **20M** new cancer cases (2022) and projects **35M by 2050 (+77%)** ([IARC, 2024](https://www.iarc.who.int/wp-content/uploads/2024/02/pr345_E.pdf)). On workforce, CAP-backed pathology workforce modeling projected US pathologist supply decline from ~17,500 FTE (2010) to ~14,000 by 2030 under constrained replacement assumptions ([Arch Pathol Lab Med, 2015](https://meridian.allenpress.com/aplm/article/139/11/1413/132505/The-Pathologist-Workforce-in-the-United-States-II)); CAP still describes demand outpacing supply ([CAP, 2026](https://www.cap.org/advocacy/latest-news-and-practice-data/cap-engages-with-hrsa-on-pathologist-workforce-projections)).

Labs face higher slide volume, multi-marker workflows, and turnaround pressure. AI-assisted scoring/triage/QC is one of the few scalable levers that does not require linear growth in pathologist FTE.

ZNF835 / colorectal biology is the **origin story and research credibility**; the **product** is generalized IHC decision-support for labs, not a single-gene diagnostic.

---

## Target customer (v1)

**Primary:** independent reference / regional pathology labs and digital-pathology-forward groups with **lower procurement friction** than full IDN central purchasing.

**Secondary (later):** academic medical centers and hospital systems (longer sales cycles, IT/security gates).

**Buyer:** lab director or lead pathologist with budget for workflow software; IT approves hosting (SaaS or VPC).

---

## Pricing hypothesis (explicitly testable)

Current hypothesis for independent/regional labs:

- **$500 / seat / month** per pathologist power-user on annual contract.
- Alternative for high-volume send-out groups: per-slide metering.

Validation plan (next 4–6 weeks):

- Price-test in discovery calls at **$300, $500, $800 / seat / month**.
- Anchor value on measurable workflow outcomes: minutes/case saved, batch turnaround, and within-1 agreement consistency.
- Lock first pilot pricing only after 10+ buyer calls.

---

## Go-to-market (first 90 days)

1. **Ship a live demo** (`/demo` + trained weights)—YC partners will tap it before reading the appendix.
2. **One design-partner lab** (e.g. pilot with a UPMC-adjacent or regional lab given CMU/UPMC proximity): scoped LOI, defined success metrics (time-on-task, within-1 agreement with reference reads on a fixed panel).
3. **90-second Loom** of: upload → tissue + intensity + uncertainty + Grad-CAM on a **public** IHC patch dataset (see `docs/PUBLIC_IHC_DATASETS.md`).
4. **Replace synthetic weights with public IHC weights before investor outreach**; first target is TUPAC16/HER2-style data (or equivalent public HER2 cohort), then report hold-out confusion matrix + kappa.

See `docs/PILOT_PLAN.md` for the concrete five-week pilot sequence, success thresholds, and claims discipline to use in lab conversations.

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

### Outreach tracker (start with 10 this week)

| Name | Role | Institution | Date sent | Response | Quote/next step |
|---|---|---|---|---|---|
| _TBD_ |  |  |  |  |  |
| _TBD_ |  |  |  |  |  |
| _TBD_ |  |  |  |  |  |

Paste first permissioned quote directly under this table.

---

## What to validate next

- [ ] Replace synthetic bootstrap weights with **public IHC** training run + hold-out metrics (target: TUPAC16/HER2 first).
- [ ] One signed or verbal **design partner** + success criteria.
- [ ] **Regulatory memo** from counsel (1–2 pages) on device vs non-device CDS for your exact UX copy and outputs.
- [ ] Rename GitHub repo from `ZNF` to `pathiq` before external outreach.
