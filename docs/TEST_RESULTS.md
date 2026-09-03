# Test results

Date: 2026-09-03 (Asia/Dhaka)  
Host: Windows 11 with WSL2 Ubuntu; Docker Desktop 4.89.0, Engine 29.7.2, Compose 5.5.0; native WSL Node 22.23.2, npm 10.9.8, jq 1.8.1; Hyperledger Fabric 2.5.12.

## Actually run and passed

| Command/check                                              | Observed result                                                                                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install` in WSL                                       | 400 packages audited after the final dependency update; 0 npm-reported vulnerabilities                                                         |
| `npm run typecheck`                                        | All six TypeScript workspaces passed                                                                                                           |
| `npm run build`                                            | All packages/services and the Vite production build passed; latest web output was 219.65 kB JS and 12.46 kB CSS before gzip                    |
| `npm test`                                                 | 24 workspace tests passed: shared 3, chaincode 9, adapter 1, gateway 8, web 3                                                                  |
| `npm run test:security`                                    | 2 root security tests passed                                                                                                                   |
| `npm run lint` / `npm run format:check`                    | ESLint and Prettier passed                                                                                                                     |
| `bash -n` over shell scripts                               | All checked scripts passed syntax validation                                                                                                   |
| `bash scripts/bootstrap.sh lite`                           | Police/RAB peers, one Raft orderer, channel, CCAAS chaincode, seed, VALID smoke commit, and query-back passed                                  |
| `RUN_REAL_FABRIC_TESTS=true npm run test:integration`      | 2 real-Fabric tests passed: complete five-record lifecycle plus wrong-MSP/duplicate-key negatives                                              |
| Playwright in `mcr.microsoft.com/playwright:v1.62.1-noble` | Earlier real lite/full workflows passed; the final full production-routed workflow passed once in 18.2 seconds and produced eight screenshots  |
| `bash scripts/verify-production-routing.sh`                | SPA fallback and `/api` proxy behavior passed in both lite and full modes                                                                      |
| `bash scripts/verify-ledger-leakage.sh`                    | Lite scan passed over 25 decoded blocks; final full scan passed over 27 decoded blocks with no configured identifier/token/payload/key markers |
| `bash scripts/verify-persistence.sh`                       | Existing query returned the same transaction ID after all Fabric and CCAAS containers restarted                                                |
| `FABRIC_NETWORK_MODE=lite bash scripts/reset.sh`           | Destructive volume/runtime reset followed by clean bootstrap, VALID commit, and query-back passed                                              |
| `FABRIC_NETWORK_MODE=full bash scripts/reset.sh`           | Four peers, three Raft orderers, four MSP approvals, CCAAS chaincode, seed, VALID commit, and query-back passed from clean volumes             |
| Full adapter/API checks                                    | RAB, BGB, and Customs adapters each reported Fabric reachable; `/api/v1/config` reported `full` with exactly those three providers             |
| `bash scripts/benchmark.sh`                                | 10 Fabric-backed health evaluations: 55.863 ms average, 54.067 ms p50, 60.873 ms p95                                                           |

The benchmark is single-client gateway-to-Fabric evaluation latency on one WSL2 laptop. It is not a throughput, scalability, or production-capacity result.

## Transaction evidence

- Latest clean full bootstrap: query `query_smoke_99fb2d3795c17ca48e9e2322`, transaction `91c99f210801b77dc3ae51cb8105d8cb5b2acfd2fa9180d2055d0d92465cc914`.
- Clean lite reset before switching modes: query `query_smoke_bd70d33bceab5b04c1ccf1a8`, transaction `9246c92a3ab2bad5cd8462b0fb7bd0cb10edd537fc40c1e405ecaaf05d4cbd92`.
- Persistence rehearsal before the intentional reset: query `query_smoke_ce2eac5d6212f76f3a1ad1d9`, unchanged transaction `e5c2715f23f4b6283242d72414ec4c7b81dcabf437ceab7e6268f86d56c30510`.

Each smoke transaction was reported VALID by the peer and then read back from Fabric. Reset intentionally removes prior ledger volumes, so the first persistence record is historical evidence rather than present state.

## Issues found and corrected during rehearsal

- Docker Engine 29 exposes an API newer than Fabric 2.5’s embedded Docker client. Chaincode deployment was moved to Fabric CCAAS with no peer access to the Docker socket.
- Persistence originally selected the first installed package when historical packages existed. It now selects the package ID approved in the channel definition.
- Network shutdown originally left the profile-gated CCAAS container attached. It now brings down full and chaincode profiles before removing volumes, and the clean full reset passed afterward.
- Full audit contains one MatchAttestation per provider. The browser assertion was corrected to handle the expected multiple records.

## Final screenshot evidence

The final full-mode Playwright run produced exactly these eight screenshots under `assets/screenshots/`:

1. `01-login-full-demo.png`
2. `02-fabric-connected-overview.png`
3. `03-provider-discovery-results.png`
4. `04-scoped-access-request.png`
5. `05-provider-authorization-decision.png`
6. `06-verified-disclosure-receipt.png`
7. `07-five-stage-audit-timeline.png`
8. `08-abuse-control-or-fail-closed.png`

All eight were visually inspected for legibility, correct full/Fabric-connected state, the requested workflow stage, synthetic identifiers, and absence of raw secrets or provider payloads. The previous three screenshots were removed only after this inspection.

## Submission artifact boundary

The repository and likely Windows Downloads locations were audited. No final DefChain whitepaper, corrected poster, pitch deck, or 600-second MP4 was found, so none is claimed as verified or submission-ready. `submission/DefChain_Demo_Credential.txt` was created and verified as a secret-free local run/judge handoff. See `docs/SUBMISSION_CHECKLIST.md` for the exact human actions and known poster repair requirements.
