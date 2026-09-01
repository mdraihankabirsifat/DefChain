#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[ "$ROOT" != "/" ] || { echo 'Refusing unsafe reset target.' >&2; exit 1; }
bash blockchain/network/network.sh down
find "$ROOT/data/runtime" -mindepth 1 -maxdepth 1 -type f -delete 2>/dev/null || true
find "$ROOT/config/runtime" -mindepth 1 -maxdepth 1 -type f -delete 2>/dev/null || true
bash scripts/bootstrap.sh "${FABRIC_NETWORK_MODE:-lite}"
