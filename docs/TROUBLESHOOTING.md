# Troubleshooting

## `docker: command not found` or daemon unavailable

Install/start Docker Desktop, enable Ubuntu WSL integration, reopen the WSL terminal, and verify `docker info` plus `docker compose version`. DefChain will not start a fake ledger.

## WSL says access denied

Run `wsl --status` from a normal Windows terminal. If Windows itself denies access, enable/update WSL from an elevated terminal and reboot if requested. Tool sandboxes can also deny WSL enumeration even when WSL is installed.

## `npm.ps1 cannot be loaded`

Use `npm.cmd` in PowerShell or, preferably, use native npm inside WSL. Do not weaken machine-wide execution policy just for DefChain.

## Missing `jq`, Node, peer, or configtxlator

Install Node 20/22 LTS and jq inside Ubuntu. `npm run bootstrap:lite` downloads official project-local Fabric tools only after Docker/tool checks pass.

## Port conflict

Stop the conflicting process or DefChain (`npm run stop`). Required host ports include 4000, 4101–4104, 5173, 7050/7051, 8050/8051, 9050/9051, and 10051 in full mode.

## Chaincode build/container exits

Run `npm run build -w @defchain/chaincode`, inspect `docker logs <chaincode-container>`, then increment `CHAINCODE_SEQUENCE` and run `npm run chaincode:deploy`. Keep Fabric 2.5.12 and `fabric-contract-api`/`fabric-shim` 2.5.8 aligned.

## `BLOCKCHAIN_UNAVAILABLE`

This is intentional fail-closed behavior. Confirm the network is up, channel/chaincode exist, generated organization material is present, peer TLS ports are reachable, and the API process was started from the repository. Do not add a fallback ledger.

## Reset conflicts

Run `npm run network:down`, verify only DefChain containers remain, then `npm run reset`. If switching lite/full, stop the old topology first because both use the same channel name/ports.
