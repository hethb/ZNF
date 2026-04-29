# Grad-CAM qualitative validation protocol

Before showing PathIQ to clinical users, run a qualitative heatmap audit on **real** public tissue data.

## Minimum protocol

1. Select 20-30 patches from a public cohort (e.g. HER2/TUPAC-like labels).
2. Run `/analyze` and save:
   - original patch
   - predicted class and confidence
   - Grad-CAM overlay
3. Have a pathology-informed reviewer label each heatmap:
   - `sensible` (focuses on plausible tumor/staining regions)
   - `borderline`
   - `nonsensical` (background/edge/artifact dominant)
4. Record failure patterns (edge effects, blank regions, scanner artifacts).

## Pass criteria (v1 demo gate)

- At least 80% `sensible` across the audited sample.
- Zero critical failures on obvious tumor-rich examples.

If criteria fail, do not use Grad-CAM for investor/clinical demos until retraining or preprocessing fixes are applied.
