#!/usr/bin/env bash
set -Eeuo pipefail
command -v curl >/dev/null && command -v jq >/dev/null || { echo 'curl and jq are required.' >&2; exit 1; }
API="${API_URL:-http://127.0.0.1:4000/api/v1}"
health="$(curl -fsS "$API/health")" || { echo 'API/Fabric unavailable. Start npm run dev with the network running.' >&2; exit 1; }
jq -e '.blockchain.available == true' <<<"$health" >/dev/null || { echo 'Fabric unavailable; benchmark refuses mock/offline measurements.' >&2; exit 1; }
echo 'Correctness-first benchmark harness is ready. Run the guided workflow, then measure exact request/tx IDs with tests/integration/real-fabric.test.ts.'
echo "Hardware: $(uname -a)"
