"""Generate small synthetic RGB pathology-style patches (for bootstrap training + /demo UI)."""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def make_patch(seed: int, w: int = 224, h: int = 224) -> Image.Image:
    rng = np.random.default_rng(seed)
    base = np.stack(
        [
            180 + 40 * rng.random((h, w)),
            120 + 50 * rng.random((h, w)),
            140 + 45 * rng.random((h, w)),
        ],
        axis=-1,
    ).astype(np.float32)
    # soft oval mask
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cy, cx = h / 2, w / 2
    d = np.sqrt((yy - cy) ** 2 / (cy**2) + (xx - cx) ** 2 / (cx**2))
    mask = np.clip(1.2 - d, 0, 1)[..., None]
    arr = base * mask + 40 * (1 - mask)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, mode="RGB")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out_dir", type=Path, default=Path("frontend/public/demo"))
    p.add_argument("--count", type=int, default=4)
    args = p.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for i in range(args.count):
        img = make_patch(seed=1000 + i * 17)
        img.save(args.out_dir / f"slide{i + 1}.png", format="PNG")
    print(f"Wrote {args.count} PNGs to {args.out_dir}")


if __name__ == "__main__":
    main()
