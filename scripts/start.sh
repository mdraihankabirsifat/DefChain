#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
docker info >/dev/null 2>&1 || { echo 'Docker unavailable; refusing to start with a fake ledger.' >&2; exit 1; }
bash blockchain/network/network.sh up "${FABRIC_NETWORK_MODE:-lite}"
npm run dev
