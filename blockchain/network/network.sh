#!/usr/bin/env bash
set -Eeuo pipefail
ACTION="${1:-up}"
MODE="${2:-${FABRIC_NETWORK_MODE:-lite}}"
NETWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$NETWORK_DIR/../.." && pwd)"
export PATH="$ROOT/.fabric/bin:$PATH"
export FABRIC_CFG_PATH="$ROOT/.fabric/config"
export FABRIC_VERSION="${FABRIC_VERSION:-2.5.12}"
CHANNEL="${FABRIC_CHANNEL:-defchain-channel}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1. Run npm run bootstrap:lite first." >&2; exit 1; }; }
compose() { if [ "$MODE" = full ]; then docker compose -f "$NETWORK_DIR/docker-compose.yml" --profile full "$@"; else docker compose -f "$NETWORK_DIR/docker-compose.yml" "$@"; fi; }

set_peer() {
  local org="$1" domain port
  case "$org" in
    PoliceMSP) domain=police.defchain.local; port=7051;;
    RABMSP) domain=rab.defchain.local; port=8051;;
    BGBMSP) domain=bgb.defchain.local; port=9051;;
    CustomsMSP) domain=customs.defchain.local; port=10051;;
    *) echo "Unknown MSP: $org" >&2; exit 1;;
  esac
  export CORE_PEER_LOCALMSPID="$org"
  export CORE_PEER_ADDRESS="localhost:$port"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK_DIR/organizations/peerOrganizations/$domain/peers/peer0.$domain/tls/ca.crt"
  export CORE_PEER_MSPCONFIGPATH="$NETWORK_DIR/organizations/peerOrganizations/$domain/users/Admin@$domain/msp"
}

wait_port() {
  local host="$1" port="$2" label="$3"
  for _ in $(seq 1 40); do (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1 && return 0; sleep 1; done
  echo "$label did not open $host:$port" >&2; compose logs --tail=80; exit 1
}

join_orderer() {
  local name="$1" admin_port="$2"
  local tls="$NETWORK_DIR/organizations/ordererOrganizations/defchain.local/orderers/$name.defchain.local/tls"
  local result
  for _ in $(seq 1 20); do
    if result="$(osnadmin channel list -o "localhost:$admin_port" --ca-file "$tls/ca.crt" --client-cert "$tls/server.crt" --client-key "$tls/server.key" 2>/dev/null)"; then
      grep -q "$CHANNEL" <<<"$result" && return 0
      break
    fi
    sleep 1
  done
  result="$(osnadmin channel join --channelID "$CHANNEL" --config-block "$CHANNEL_BLOCK" -o "localhost:$admin_port" --ca-file "$tls/ca.crt" --client-cert "$tls/server.crt" --client-key "$tls/server.key" 2>&1)" || {
    grep -q 'channel already exists' <<<"$result" && return 0
    printf '%s\n' "$result" >&2
    return 1
  }
}

join_peer() {
  set_peer "$1"
  if peer channel list 2>/dev/null | grep -q "$CHANNEL"; then return; fi
  peer channel join -b "$CHANNEL_BLOCK"
}

if [ "$ACTION" = down ]; then
  need docker
  docker compose -f "$NETWORK_DIR/docker-compose.yml" --profile full --profile chaincode down --volumes --remove-orphans || true
  while read -r container; do
    [ -n "$container" ] || continue
    name="$(docker inspect --format '{{.Name}}' "$container" 2>/dev/null || true)"
    if [[ "$name" == *defchain* ]]; then docker rm -f "$container" >/dev/null; fi
  done < <(docker ps -aq --filter name=dev-peer0 2>/dev/null)
  echo 'DefChain Fabric containers and named volumes stopped.'
  exit 0
fi

[ "$ACTION" = up ] || { echo 'Usage: network.sh up [lite|full] | down' >&2; exit 2; }
for command in docker cryptogen configtxgen osnadmin peer; do need "$command"; done
docker info >/dev/null 2>&1 || { echo 'Docker daemon unavailable; no mock ledger will be started.' >&2; exit 1; }
mkdir -p "$NETWORK_DIR/organizations" "$NETWORK_DIR/channel-artifacts"
if [ ! -d "$NETWORK_DIR/organizations/peerOrganizations" ]; then
  (cd "$NETWORK_DIR" && cryptogen generate --config=crypto-config.yaml --output=organizations)
fi
profile=DefChainLite
[ "$MODE" = full ] && profile=DefChainFull
CHANNEL_BLOCK="$NETWORK_DIR/channel-artifacts/$CHANNEL-$MODE.block"
if [ ! -f "$CHANNEL_BLOCK" ]; then
  (cd "$NETWORK_DIR" && FABRIC_CFG_PATH="$NETWORK_DIR" configtxgen -profile "$profile" -outputBlock "channel-artifacts/$CHANNEL-$MODE.block" -channelID "$CHANNEL")
fi
compose up -d
wait_port localhost 7053 orderer0
wait_port localhost 7051 Police-peer
wait_port localhost 8051 RAB-peer
join_orderer orderer0 7053
join_peer PoliceMSP
join_peer RABMSP
if [ "$MODE" = full ]; then
  wait_port localhost 8053 orderer1
  wait_port localhost 9053 orderer2
  wait_port localhost 9051 BGB-peer
  wait_port localhost 10051 Customs-peer
  join_orderer orderer1 8053
  join_orderer orderer2 9053
  join_peer BGBMSP
  join_peer CustomsMSP
fi
echo "DefChain $MODE Fabric network is running on channel $CHANNEL."
