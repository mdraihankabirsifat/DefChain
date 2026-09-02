#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; NETWORK="$ROOT/blockchain/network"
export PATH="$ROOT/.fabric/bin:$PATH" FABRIC_CFG_PATH="$ROOT/.fabric/config"
export CORE_PEER_LOCALMSPID=PoliceMSP CORE_PEER_ADDRESS=localhost:7051 CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK/organizations/peerOrganizations/police.defchain.local/peers/peer0.police.defchain.local/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$NETWORK/organizations/peerOrganizations/police.defchain.local/users/Admin@police.defchain.local/msp"
CHANNEL="${FABRIC_CHANNEL:-defchain-channel}"
out="$ROOT/data/runtime/decoded-blocks"; mkdir -p "$out"; find "$out" -mindepth 1 -maxdepth 1 -type f -delete
height="$(peer channel getinfo -c "$CHANNEL" | sed -n 's/.*"height":\([0-9]*\).*/\1/p')"
[[ "$height" =~ ^[0-9]+$ ]] || { echo 'Could not determine ledger height.' >&2; exit 1; }
for ((i=0;i<height;i++)); do
  peer channel fetch "$i" "$out/$i.block" -c "$CHANNEL" -o localhost:7050 --ordererTLSHostnameOverride orderer0.defchain.local --tls --cafile "$NETWORK/organizations/ordererOrganizations/defchain.local/orderers/orderer0.defchain.local/tls/ca.crt" >/dev/null 2>&1
  configtxlator proto_decode --input "$out/$i.block" --type common.Block --output "$out/$i.json"
done
forbidden=('TEST-NID-' 'SYN-RAB-' 'identityConfirmation' 'ciphertext' 'MATCH_HMAC_KEY' 'BEGIN PRIVATE KEY' 'FULL_DOSSIER')
if [ -f "$ROOT/.env" ]; then
  key="$(sed -n 's/^MATCH_HMAC_KEY=//p' "$ROOT/.env" | head -n1)"; epoch="$(sed -n 's/^TOKEN_EPOCH=//p' "$ROOT/.env" | head -n1)"
  if [ -n "$key" ] && [ -n "$epoch" ]; then forbidden+=("$(printf 'defchain:identifier:%s:TEST-NID-0001' "$epoch" | openssl dgst -sha256 -hmac "$key" -hex | awk '{print $NF}')"); fi
fi
for marker in "${forbidden[@]}"; do
  if grep -RIlF -- "$marker" "$out"/*.json >/dev/null; then echo "FORBIDDEN LEDGER MARKER DETECTED: $marker" >&2; exit 1; fi
done
echo "PASS: decoded $height Fabric blocks; no configured raw identifier, token, payload, or key markers detected."
