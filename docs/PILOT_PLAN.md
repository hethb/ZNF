# PathIQ pilot plan

This is the operating plan for turning PathIQ from a credible prototype into a design-partner-ready B2B SaaS product. The near-term goal is not broad clinical deployment. The goal is one narrow IHC workflow with measurable value, explicit limitations, and a lab partner willing to keep testing.

## Pilot wedge

Start with one biomarker panel and one specimen class where manual IHC scoring is repetitive and common enough to matter. HER2-style zero-to-three-plus scoring is the cleanest software wedge because the UI, labels, uncertainty, heatmaps, and benchmark metrics already match that workflow.

ZNF835 remains the research lineage and colorectal-cancer credibility story. The product wedge should be framed as IHC scoring decision support for digital pathology labs.

## Design partner profile

- Independent or regional pathology lab with digital slide access and lower procurement friction than a large hospital system.
- Lab director or lead pathologist can approve a retrospective evaluation.
- The lab can provide de-identified patches, ROIs, or exported slide regions with reference reads.
- The lab agrees that PathIQ is decision support only during pilot use.

## Five-week pilot

| Phase | Output | Success signal |
|---|---|---|
| Week 0: scope | Marker, specimen class, label schema, and data transfer path | A written pilot brief from the lab |
| Weeks 1-2: retrospective benchmark | Hold-out metrics, confusion matrix, kappa, uncertainty review rate | Weighted kappa >= 0.75 or a clear path to it |
| Weeks 3-4: shadow workflow | Case queue used beside normal review | Repetitive scoring time reduced by ~30% on target cases |
| Week 5: expansion decision | Pilot readout and next scope | LOI, paid pilot, or permissioned quote |

## Metrics to report

- Exact agreement against pathologist reference labels.
- Within-one agreement for zero-to-three-plus intensity.
- Cohen kappa or weighted kappa.
- Percentage of regions routed to manual review after uncertainty calibration.
- Average review time per case with and without PathIQ.
- Error analysis by tissue bucket, stain intensity, and image quality.

## Product requirements before a paid pilot

- Case-level upload and CSV export.
- Batch benchmark mode with label CSV.
- Clear uncertainty flagging and review-first sorting.
- Grad-CAM or equivalent visual explanation for selected regions.
- Audit-friendly copy: no standalone diagnostic claims.
- A short deployment/security answer: local demo now, VPC or customer cloud later.

## Claims discipline

Use:

- "Decision support for IHC scoring."
- "Flags uncertain regions for pathologist review."
- "Retrospective benchmark against reference reads."

Avoid until validated and reviewed by counsel:

- "Diagnoses cancer."
- "FDA-cleared."
- "Replaces pathologist review."
- "Works on every biomarker or tissue type."

## YC readiness checklist

- [ ] Live demo works from a fresh clone.
- [ ] Public IHC weights replace synthetic demo weights for external investor demos.
- [ ] One pathologist quote or LOI is captured in `BUSINESS.md`.
- [ ] Pilot target list has at least 20 named labs/pathologists.
- [ ] A 90-second demo video shows upload, scoring, uncertainty, heatmap, and CSV export.
- [ ] README and UI state that PathIQ is not FDA-cleared and not for standalone diagnosis.
