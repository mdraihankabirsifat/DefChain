#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK="$ROOT/blockchain/network"
export PATH="$ROOT/.fabric/bin:$PATH" FABRIC_CFG_PATH="$ROOT/.fabric/config"
export CORE_PEER_LOCALMSPID=PoliceMSP CORE_PEER_ADDRESS=localhost:7051 CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK/organizations/peerOrganizations/police.defchain.local/peers/peer0.police.defchain.local/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$NETWORK/organizations/peerOrganizations/police.defchain.local/users/Admin@police.defchain.local/msp"
query_id="$(<"$ROOT/data/runtime/last-fabric-query-id.txt")"
expected_tx_id="$(<"$ROOT/data/runtime/last-fabric-tx-id.txt")"

query_tx_id() {
  local ctor
  ctor="$(jq -cn --arg key "QUERY::$query_id" '{function:"GetRecord",Args:[$key]}')"
  peer chaincode query -C "${FABRIC_CHANNEL:-defchain-channel}" -n "${FABRIC_CHAINCODE:-defchain}" -c "$ctor" | jq -r .txId
}

[ "$(query_tx_id)" = "$expected_tx_id" ] || { echo 'Pre-restart record mismatch.' >&2; exit 1; }
docker compose -f "$NETWORK/docker-compose.yml" --profile chaincode stop
bash "$NETWORK/network.sh" up "${FABRIC_NETWORK_MODE:-lite}"
set +e
for _ in $(seq 1 30); do
  package_id="$(peer lifecycle chaincode queryapproved -C "${FABRIC_CHANNEL:-defchain-channel}" -n "${FABRIC_CHAINCODE:-defchain}" --sequence 1 2>/dev/null | sed -n 's/.*package-id: \([^,]*\),.*/\1/p' | head -n1)"
  if [ -n "$package_id" ]; then
    CHAINCODE_ID="$package_id" docker compose -f "$NETWORK/docker-compose.yml" --profile chaincode up -d defchain-chaincode >/dev/null
    sleep 2
    actual="$(query_tx_id 2>/dev/null)"
    if [ "$actual" = "$expected_tx_id" ]; then
      set -e
      echo "PASS: Fabric record $query_id persisted across container restart with unchanged transaction ID."
      exit 0
    fi
  fi
  sleep 1
done
set -e
echo 'Post-restart Fabric record could not be verified.' >&2
exit 1
