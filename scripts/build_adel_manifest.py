#!/usr/bin/env python3
"""
Build a PathIQ training manifest from ADEL (Zenodo) `labels.csv`.

Expected layout (after `unzip her2_dataset.zip`):
  her2_dataset/labels.csv   — columns: fname,HER2score (0–3 integers)
  her2_dataset/images/*.png

Output CSV columns: image_path,label
  image_path is relative to the her2_dataset/ directory (used as --source_root).
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--adel_dir",
        type=Path,
        required=True,
        help="Path to extracted her2_dataset/ folder (contains images/ and labels.csv).",
    )
    ap.add_argument(
        "--out_csv",
        type=Path,
        default=Path("data/manifests/adel_her2.csv"),
        help="Manifest path to write (image_path relative to --adel_dir).",
    )
    args = ap.parse_args()

    labels_path = args.adel_dir / "labels.csv"
    images_dir = args.adel_dir / "images"
    if not labels_path.is_file():
        print(f"Missing labels: {labels_path}", file=sys.stderr)
        sys.exit(1)
    if not images_dir.is_dir():
        print(f"Missing images dir: {images_dir}", file=sys.stderr)
        sys.exit(1)

    args.out_csv.parent.mkdir(parents=True, exist_ok=True)
    rows_out = 0
    with labels_path.open(newline="", encoding="utf-8") as fin, args.out_csv.open(
        "w", newline="", encoding="utf-8"
    ) as fout:
        reader = csv.DictReader(fin)
        fieldnames = {n.strip().lower(): n for n in (reader.fieldnames or [])}
        if "fname" not in fieldnames or "her2score" not in fieldnames:
            print(
                "Expected columns fname,HER2score in labels.csv; got "
                f"{reader.fieldnames!r}",
                file=sys.stderr,
            )
            sys.exit(1)
        fname_key = fieldnames["fname"]
        score_key = fieldnames["her2score"]
        w = csv.DictWriter(fout, fieldnames=["image_path", "label"])
        w.writeheader()
        for row in reader:
            fname = (row.get(fname_key) or "").strip()
            score_raw = (row.get(score_key) or "").strip()
            if not fname or not score_raw:
                continue
            img_rel = Path("images") / fname
            if not (args.adel_dir / img_rel).is_file():
                print(f"Skip missing file row: {img_rel}", file=sys.stderr)
                continue
            w.writerow({"image_path": str(img_rel).replace("\\", "/"), "label": score_raw})
            rows_out += 1

    print(f"Wrote {rows_out} rows to {args.out_csv.resolve()}")


if __name__ == "__main__":
    main()
