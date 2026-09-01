#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK="$ROOT/blockchain/network"
export PATH="$ROOT/.fabric/bin:$PATH"
export FABRIC_CFG_PATH="$ROOT/.fabric/config"
CHANNEL="${FABRIC_CHANNEL:-defchain-channel}"
NAME="${FABRIC_CHAINCODE:-defchain}"
MODE="${FABRIC_NETWORK_MODE:-lite}"
SEQUENCE="${CHAINCODE_SEQUENCE:-1}"
LABEL="${NAME}_${SEQUENCE}"
PACKAGE="$NETWORK/channel-artifacts/${LABEL}.tar.gz"
ORDERER_CA="$NETWORK/organizations/ordererOrganizations/defchain.local/orderers/orderer0.defchain.local/tls/ca.crt"

set_peer() {
  local org="$1" domain port
  case "$org" in PoliceMSP) domain=police.defchain.local;port=7051;; RABMSP) domain=rab.defchain.local;port=8051;; BGBMSP) domain=bgb.defchain.local;port=9051;; CustomsMSP) domain=customs.defchain.local;port=10051;; esac
  export CORE_PEER_LOCALMSPID="$org" CORE_PEER_ADDRESS="localhost:$port" CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK/organizations/peerOrganizations/$domain/peers/peer0.$domain/tls/ca.crt"
  export CORE_PEER_MSPCONFIGPATH="$NETWORK/organizations/peerOrganizations/$domain/users/Admin@$domain/msp"
}

orgs=(PoliceMSP RABMSP)
policy="OR('PoliceMSP.peer','RABMSP.peer')"
if [ "$MODE" = full ]; then orgs+=(BGBMSP CustomsMSP); policy="OR('PoliceMSP.peer','RABMSP.peer','BGBMSP.peer','CustomsMSP.peer')"; fi
npm run build -w @defchain/chaincode
mkdir -p "$NETWORK/channel-artifacts"
rm -f "$PACKAGE"
peer lifecycle chaincode package "$PACKAGE" --path "$ROOT/blockchain/chaincode" --lang node --label "$LABEL"
for org in "${orgs[@]}"; do
  set_peer "$org"
  peer lifecycle chaincode install "$PACKAGE" 2>&1 | tee "$NETWORK/logs-${org}-install.txt" || grep -q 'already successfully installed' "$NETWORK/logs-${org}-install.txt"
done
set_peer PoliceMSP
PACKAGE_ID="$(peer lifecycle chaincode queryinstalled | sed -n "s/^Package ID: \([^,]*\), Label: $LABEL$/\1/p" | head -n1)"
[ -n "$PACKAGE_ID" ] || { echo 'Could not resolve installed chaincode package ID.' >&2; exit 1; }
for org in "${orgs[@]}"; do
  set_peer "$org"
  peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer0.defchain.local --tls --cafile "$ORDERER_CA" --channelID "$CHANNEL" --name "$NAME" --version 0.1 --package-id "$PACKAGE_ID" --sequence "$SEQUENCE" --signature-policy "$policy"
done
set_peer PoliceMSP
peer_args=()
for org in "${orgs[@]}"; do
  set_peer "$org"
  peer_args+=(--peerAddresses "$CORE_PEER_ADDRESS" --tlsRootCertFiles "$CORE_PEER_TLS_ROOTCERT_FILE")
done
set_peer PoliceMSP
if ! peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$NAME" 2>/dev/null | grep -q "Sequence: $SEQUENCE"; then
  peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer0.defchain.local --tls --cafile "$ORDERER_CA" --channelID "$CHANNEL" --name "$NAME" --version 0.1 --sequence "$SEQUENCE" --signature-policy "$policy" "${peer_args[@]}"
fi
peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$NAME"
echo "Chaincode '$NAME' sequence $SEQUENCE deployed with package $PACKAGE_ID"
