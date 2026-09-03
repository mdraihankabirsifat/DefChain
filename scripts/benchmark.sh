#!/usr/bin/env bash
set -Eeuo pipefail
command -v curl >/dev/null && command -v jq >/dev/null || { echo 'curl and jq are required.' >&2; exit 1; }
API="${API_URL:-http://127.0.0.1:4000/api/v1}"
health="$(curl -fsS "$API/health")" || { echo 'API/Fabric unavailable. Start npm run dev with the network running.' >&2; exit 1; }
jq -e '.blockchain.available == true' <<<"$health" >/dev/null || { echo 'Fabric unavailable; benchmark refuses mock/offline measurements.' >&2; exit 1; }
samples="${BENCHMARK_SAMPLES:-10}"
[[ "$samples" =~ ^[1-9][0-9]*$ ]] || { echo 'BENCHMARK_SAMPLES must be a positive integer.' >&2; exit 2; }
results="$(mktemp)"
trap 'rm -f "$results"' EXIT
for _ in $(seq 1 "$samples"); do
  curl -fsS -o /dev/null -w '%{time_total}\n' "$API/health" >>"$results"
done
sort -n "$results" -o "$results"
awk '
  { value[NR]=$1; sum+=$1 }
  END {
    p50=value[int((NR-1)*0.50)+1]; p95=value[int((NR-1)*0.95)+1];
    printf "PASS: %d Fabric-backed health evaluations; average %.3f ms, p50 %.3f ms, p95 %.3f ms.\n", NR, (sum/NR)*1000, p50*1000, p95*1000
  }
' "$results"
echo 'Scope: single-client gateway-to-Fabric evaluation latency; this is not a throughput or production-capacity claim.'
echo "Hardware: $(uname -a)"
