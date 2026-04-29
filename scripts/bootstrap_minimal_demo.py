#!/usr/bin/env python3
"""
Create a tiny synthetic IHC-style dataset and train intensity + tissue models so a fresh clone
can run /analyze and /demo without proprietary data. For investor demos only—replace with
public IHC cohorts (see docs/PUBLIC_IHC_DATASETS.md) before any clinical claim.

Requires: repo root as CWD, backend venv with tensorflow, `pip install pillow` if needed.
"""
from __future__ import annotations

import argparse
import runpy
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTENSITY_DIRS = ("0_negative", "1_weak", "2_moderate", "3_strong")
TISSUE_NAMES = (
    "tumor",
    "stroma",
    "adipose",
    "lympho",
    "mucosa",
    "debris",
    "empty",
    "complex",
)


def write_patches(out_root: Path, per_intensity: int, per_tissue: int) -> None:
    ns = runpy.run_path(str(ROOT / "scripts" / "generate_synthetic_patch.py"))
    make_patch = ns["make_patch"]

    for lab in INTENSITY_DIRS:
        d = out_root / lab
        d.mkdir(parents=True, exist_ok=True)
        for i in range(per_intensity):
            seed = hash((lab, i)) % (2**31)
            make_patch(seed).save(d / f"patch_{i:02d}.png")

    troot = out_root / "tissue"
    for ti, name in enumerate(TISSUE_NAMES):
        d = troot / name
        d.mkdir(parents=True, exist_ok=True)
        for i in range(per_tissue):
            seed = hash((name, i)) % (2**31) + ti * 1000
            make_patch(seed).save(d / f"patch_{i:02d}.png")


def run(cmd: list[str], cwd: Path) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=cwd)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out_data", type=Path, default=Path("data/bootstrap_demo"))
    ap.add_argument("--artifacts", type=Path, default=Path("backend/model/artifacts"))
    ap.add_argument("--intensity_epochs", type=int, default=4)
    ap.add_argument("--tissue_epochs", type=int, default=4)
    # Sklearn stratified splits need enough samples per class (see train.py / train_tissue.py).
    ap.add_argument("--per_intensity", type=int, default=12)
    ap.add_argument("--per_tissue", type=int, default=5)
    args = ap.parse_args()

    if not (ROOT / "backend" / "model" / "train.py").exists():
        print("Run from repository root.", file=sys.stderr)
        sys.exit(1)

    args.out_data.mkdir(parents=True, exist_ok=True)
    write_patches(args.out_data, args.per_intensity, args.per_tissue)

    args.artifacts.mkdir(parents=True, exist_ok=True)

    py = sys.executable
    run(
        [
            py,
            "-m",
            "backend.model.train",
            "--data_dir",
            str(args.out_data),
            "--output_dir",
            str(args.artifacts),
            "--epochs",
            str(args.intensity_epochs),
            "--batch_size",
            "4",
        ],
        cwd=ROOT,
    )
    run(
        [
            py,
            "-m",
            "backend.model.train_tissue",
            "--data_dir",
            str(args.out_data / "tissue"),
            "--output_dir",
            str(args.artifacts),
            "--epochs",
            str(args.tissue_epochs),
            "--batch_size",
            "4",
        ],
        cwd=ROOT,
    )

    # Public /demo thumbnails (copy first intensity patch of each class for variety)
    demo_dir = ROOT / "frontend" / "public" / "demo"
    demo_dir.mkdir(parents=True, exist_ok=True)
    for i, lab in enumerate(INTENSITY_DIRS):
        src = args.out_data / lab / "patch_00.png"
        if src.exists():
            shutil.copy(src, demo_dir / f"slide{i + 1}.png")
    print("\nDone. Start backend: uvicorn backend.api:app --reload")
    print("Open /demo in the frontend to try preloaded slides.")


if __name__ == "__main__":
    main()
