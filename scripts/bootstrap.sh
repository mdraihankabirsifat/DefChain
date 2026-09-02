#!/usr/bin/env bash
set -Eeuo pipefail
MODE="${1:-lite}"
export FABRIC_NETWORK_MODE="$MODE"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() { echo "[DefChain bootstrap] ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "Missing '$1'. See docs/QUICKSTART.md."; }

for command in docker node npm curl jq openssl git; do need "$command"; done
docker info >/dev/null 2>&1 || fail 'Docker daemon unavailable. Start Docker Desktop and enable WSL integration.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required.'
[ -f .env ] || cp .env.example .env

for port in 4000 4101 4102 4103 4104 5173 7050 7051; do
  if command -v ss >/dev/null && ss -ltn "sport = :$port" | tail -n +2 | grep -q .; then fail "Port $port is already in use."; fi
done

mkdir -p .fabric/bin .fabric/config config/runtime data/runtime
if [ ! -x .fabric/bin/peer ]; then
  FABRIC_VERSION="${FABRIC_VERSION:-2.5.12}"
  echo "Downloading official Hyperledger Fabric $FABRIC_VERSION tooling locally..."
  archive="/tmp/hyperledger-fabric-${FABRIC_VERSION}.tar.gz"
  curl -fL "https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/hyperledger-fabric-linux-amd64-${FABRIC_VERSION}.tar.gz" -o "$archive"
  tar -xzf "$archive" -C .fabric
  rm -f "$archive"
  for image in peer orderer tools ccenv; do docker pull "hyperledger/fabric-${image}:${FABRIC_VERSION}"; done
  FABRIC_RUNTIME_VERSION="${FABRIC_RUNTIME_VERSION:-2.5}"
  for image in nodeenv baseos; do docker pull "hyperledger/fabric-${image}:${FABRIC_RUNTIME_VERSION}"; done
fi
FABRIC_RUNTIME_VERSION="${FABRIC_RUNTIME_VERSION:-2.5}"
for image in nodeenv baseos; do
  docker image inspect "hyperledger/fabric-${image}:${FABRIC_RUNTIME_VERSION}" >/dev/null 2>&1 ||
    docker pull "hyperledger/fabric-${image}:${FABRIC_RUNTIME_VERSION}"
done

npm install
bash scripts/generate-demo-secrets.sh
npm run build
bash blockchain/network/network.sh up "$MODE"
bash scripts/deploy-chaincode.sh
npm run seed
bash scripts/demo.sh --smoke
echo 'DefChain bootstrap complete. Run: npm run dev'
