#!/usr/bin/env python3
"""
Scaffold for training PathIQ on a real public HER2-style dataset.

Expected input:
- A manifest CSV with at least:
    image_path,label
  where label is one of: 0, 1, 2, 3 (or 0/1+/2+/3+ style strings).

Optional CSV columns:
- tissue_label: mapped into PathIQ tissue buckets for train_tissue.py

This script stages files into PathIQ's expected folder layout, then runs
`backend.model.train` and (optionally) `backend.model.train_tissue`.
"""
from __future__ import annotations

import argparse
import csv
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict

ROOT = Path(__file__).resolve().parents[1]
INTENSITY_MAP: Dict[str, str] = {
    "0": "0_negative",
    "0_negative": "0_negative",
    "negative": "0_negative",
    "1": "1_weak",
    "1+": "1_weak",
    "1_weak": "1_weak",
    "weak": "1_weak",
    "2": "2_moderate",
    "2+": "2_moderate",
    "2_moderate": "2_moderate",
    "moderate": "2_moderate",
    "3": "3_strong",
    "3+": "3_strong",
    "3_strong": "3_strong",
    "strong": "3_strong",
}
VALID_TISSUE = {"tumor", "stroma", "adipose", "lympho", "mucosa", "debris", "empty", "complex"}


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.check_call(cmd, cwd=ROOT)


def normalize_intensity(raw: str) -> str:
    k = str(raw).strip().lower()
    if k not in INTENSITY_MAP:
        raise ValueError(f"Unknown intensity label '{raw}'. Expected 0/1+/2+/3+ style.")
    return INTENSITY_MAP[k]


def stage_from_manifest(manifest_csv: Path, source_root: Path, out_dir: Path) -> tuple[int, int]:
    out_dir.mkdir(parents=True, exist_ok=True)
    copied = 0
    tissue_copied = 0

    with manifest_csv.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {"image_path", "label"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Manifest missing required columns: {sorted(missing)}")

        for i, row in enumerate(reader):
            img_rel = (row.get("image_path") or "").strip()
            lab_raw = (row.get("label") or "").strip()
            if not img_rel or not lab_raw:
                continue

            src = (source_root / img_rel).resolve()
            if not src.exists():
                raise FileNotFoundError(f"Manifest row {i}: image does not exist: {src}")

            intensity_dir = out_dir / normalize_intensity(lab_raw)
            intensity_dir.mkdir(parents=True, exist_ok=True)
            dst = intensity_dir / f"{src.stem}_{i}{src.suffix.lower()}"
            shutil.copy2(src, dst)
            copied += 1

            tissue_raw = (row.get("tissue_label") or "").strip().lower()
            if tissue_raw and tissue_raw in VALID_TISSUE:
                tdir = out_dir / "tissue" / tissue_raw
                tdir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, tdir / f"{src.stem}_{i}{src.suffix.lower()}")
                tissue_copied += 1

    return copied, tissue_copied


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest_csv", type=Path, required=True, help="CSV with image_path,label[,tissue_label]")
    ap.add_argument("--source_root", type=Path, required=True, help="Root directory for image_path in manifest")
    ap.add_argument("--staging_dir", type=Path, default=Path("data/public_her2_staged"))
    ap.add_argument("--artifacts", type=Path, default=Path("backend/model/artifacts"))
    ap.add_argument("--intensity_epochs", type=int, default=20)
    ap.add_argument("--tissue_epochs", type=int, default=12)
    ap.add_argument("--batch_size", type=int, default=16)
    ap.add_argument("--skip_tissue", action="store_true")
    ap.add_argument(
        "--clinical_metrics_path",
        type=Path,
        default=Path("results/her2_holdout_metrics.txt"),
        help="Where to write holdout exact / within-1 / linear kappa (passed to backend.model.train).",
    )
    ap.add_argument(
        "--clinical_metrics_note",
        type=str,
        default="",
        help="Optional note line stored in the metrics file header.",
    )
    args = ap.parse_args()

    if not (ROOT / "backend" / "model" / "train.py").exists():
        print("Run from repository root.", file=sys.stderr)
        sys.exit(1)

    args.staging_dir.mkdir(parents=True, exist_ok=True)
    args.artifacts.mkdir(parents=True, exist_ok=True)
    copied, tissue_copied = stage_from_manifest(args.manifest_csv, args.source_root, args.staging_dir)
    if copied < 40:
        print(
            f"Warning: only {copied} intensity images staged. "
            "Expect poor performance; use more real patches.",
            file=sys.stderr,
        )

    metrics_path = args.clinical_metrics_path
    if not metrics_path.is_absolute():
        metrics_path = ROOT / metrics_path

    py = sys.executable
    train_cmd: list[str] = [
        py,
        "-m",
        "backend.model.train",
        "--data_dir",
        str(args.staging_dir),
        "--output_dir",
        str(args.artifacts),
        "--epochs",
        str(args.intensity_epochs),
        "--batch_size",
        str(args.batch_size),
        "--clinical_metrics_path",
        str(metrics_path),
    ]
    note = (args.clinical_metrics_note or "").strip()
    if note:
        train_cmd.extend(["--clinical_metrics_note", note])
    run(train_cmd)

    if not args.skip_tissue:
        tissue_dir = args.staging_dir / "tissue"
        if tissue_copied == 0 or not tissue_dir.exists():
            print(
                "No tissue_label column (or no valid tissue labels) found; skipping tissue training.",
                file=sys.stderr,
            )
        else:
            run(
                [
                    py,
                    "-m",
                    "backend.model.train_tissue",
                    "--data_dir",
                    str(tissue_dir),
                    "--output_dir",
                    str(args.artifacts),
                    "--epochs",
                    str(args.tissue_epochs),
                    "--batch_size",
                    str(args.batch_size),
                ]
            )

    print("\nDone.")
    print(f"Staged data: {args.staging_dir}")
    print(f"Artifacts: {args.artifacts}")
    print("Run backend: uvicorn backend.api:app --reload")


if __name__ == "__main__":
    main()
