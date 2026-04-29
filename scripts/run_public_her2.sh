#!/usr/bin/env bash
set -euo pipefail

# One-command helper around scripts/train_public_her2.py
# Usage:
#   bash scripts/run_public_her2.sh /abs/path/to/manifest.csv /abs/path/to/dataset_root
#
# Optional env vars:
#   INTENSITY_EPOCHS=20 TISSUE_EPOCHS=12 BATCH_SIZE=16

if [[ $# -lt 2 ]]; then
  echo "Usage: bash scripts/run_public_her2.sh /abs/path/to/manifest.csv /abs/path/to/dataset_root"
  exit 1
fi

MANIFEST="$1"
SOURCE_ROOT="$2"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Manifest not found: $MANIFEST"
  exit 1
fi

if [[ ! -d "$SOURCE_ROOT" ]]; then
  echo "Source root not found: $SOURCE_ROOT"
  exit 1
fi

if [[ ! -f "backend/.venv/bin/activate" ]]; then
  echo "Missing backend venv at backend/.venv. Create it first."
  exit 1
fi

source backend/.venv/bin/activate

python scripts/train_public_her2.py \
  --manifest_csv "$MANIFEST" \
  --source_root "$SOURCE_ROOT" \
  --staging_dir data/public_her2_staged \
  --artifacts backend/model/artifacts \
  --intensity_epochs "${INTENSITY_EPOCHS:-20}" \
  --tissue_epochs "${TISSUE_EPOCHS:-12}" \
  --batch_size "${BATCH_SIZE:-16}"

echo ""
echo "Training complete."
echo "Start backend with: uvicorn backend.api:app --reload"
