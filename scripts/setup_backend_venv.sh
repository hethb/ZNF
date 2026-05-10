#!/usr/bin/env bash
# Create backend/.venv using the newest TensorFlow-supported Python on PATH (3.12 > 3.11 > 3.10).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

pick_python() {
  for cmd in python3.12 python3.11 python3.10; do
    if command -v "$cmd" >/dev/null 2>&1; then
      echo "$cmd"
      return 0
    fi
  done
  # Homebrew Apple Silicon default paths (adjust if your brew prefix differs)
  for p in /opt/homebrew/opt/python@3.12/bin/python3.12 \
           /usr/local/opt/python@3.12/bin/python3.12; do
    if [[ -x "$p" ]]; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

PY="$(pick_python || true)"
if [[ -z "${PY:-}" ]]; then
  echo "No Python 3.12/3.11/3.10 found. Install 3.12, e.g.: brew install python@3.12" >&2
  exit 1
fi

echo "Using: $PY — $($PY -V)"
if [[ -d .venv ]]; then
  echo "Removing existing .venv (recreate if you switched Python versions)."
  rm -rf .venv
fi
"$PY" -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
python -V
pip install -U pip
pip install -r requirements.txt
echo "Done. Activate later with: source backend/.venv/bin/activate"
