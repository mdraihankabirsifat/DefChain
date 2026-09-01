#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK="$ROOT/blockchain/network"
export PATH="$ROOT/.fabric/bin:$PATH" FABRIC_CFG_PATH="$ROOT/.fabric/config"
export CORE_PEER_LOCALMSPID=PoliceMSP CORE_PEER_ADDRESS=localhost:7051 CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK/organizations/peerOrganizations/police.defchain.local/peers/peer0.police.defchain.local/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$NETWORK/organizations/peerOrganizations/police.defchain.local/users/User1@police.defchain.local/msp"
CHANNEL="${FABRIC_CHANNEL:-defchain-channel}"; NAME="${FABRIC_CHAINCODE:-defchain}"
ORDERER_CA="$NETWORK/organizations/ordererOrganizations/defchain.local/orderers/orderer0.defchain.local/tls/ca.crt"
query_id="query_smoke_$(openssl rand -hex 12)"
payload="$(jq -cn --arg id "$query_id" '{queryId:$id,requesterOrg:"PoliceMSP",opaqueCaseRef:"case_opaque_smoke_reference",purposeCode:"ACTIVE_INVESTIGATION",targetOrganizations:["RABMSP"],policyVersion:"demo-1",createdByRole:"INVESTIGATOR"}')"
ctor="$(jq -cn --arg p "$payload" '{function:"CreateQueryRequest",Args:[$p]}')"
output="$(peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer0.defchain.local --tls --cafile "$ORDERER_CA" --waitForEvent -C "$CHANNEL" -n "$NAME" -c "$ctor" 2>&1)"
echo "$output"
record="$(peer chaincode query -C "$CHANNEL" -n "$NAME" -c "$(jq -cn --arg key "QUERY::$query_id" '{function:"GetRecord",Args:[$key]}')")"
tx_id="$(printf '%s' "$record" | jq -r .txId)"
[[ "$tx_id" =~ ^[a-f0-9]{64}$ ]] || { echo 'Smoke write did not return a real Fabric transaction ID.' >&2; exit 1; }
mkdir -p "$ROOT/data/runtime"
printf '%s\n' "$tx_id" > "$ROOT/data/runtime/last-fabric-tx-id.txt"
echo "Queried committed QueryRequest $query_id; Fabric tx ID: $tx_id"
