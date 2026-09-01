#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p config/runtime data/runtime
[ -f .env ] || cp .env.example .env
node scripts/generate-demo-secrets.mjs
