#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p config/runtime data/runtime
[ -f .env ] || cp .env.example .env
for org in police rab bgb customs; do
  key="config/runtime/${org}-ed25519-private.pem"
  pub="config/runtime/${org}-ed25519-public.pem"
  if [ ! -f "$key" ]; then
    openssl genpkey -algorithm ED25519 -out "$key"
    openssl pkey -in "$key" -pubout -out "$pub"
    chmod 600 "$key"
  fi
done
