#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
MODE="${FABRIC_NETWORK_MODE:-lite}"
compose=(docker compose -f docker-compose.app.yml)
[ "$MODE" = full ] && compose+=(--profile full)
cleanup() { "${compose[@]}" down >/dev/null 2>&1 || true; }
trap cleanup EXIT
"${compose[@]}" up -d --build
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:5173/api/v1/config >/tmp/defchain-production-config.json; then break; fi
  sleep 2
done
jq -e --arg mode "$MODE" '.mode == $mode and (.providers | length >= 1)' /tmp/defchain-production-config.json >/dev/null
curl -fsS http://127.0.0.1:5173/nonexistent-spa-route | grep -q '<div id="root"></div>'
status="$(curl -sS -o /tmp/defchain-api-missing.json -w '%{http_code}' http://127.0.0.1:5173/api/v1/does-not-exist)"
[ "$status" = 404 ]
if grep -q '<div id="root"></div>' /tmp/defchain-api-missing.json; then
  echo 'API route incorrectly fell back to index.html.' >&2
  exit 1
fi
echo "PASS: production SPA and /api routing verified through port 5173 in $MODE mode."
