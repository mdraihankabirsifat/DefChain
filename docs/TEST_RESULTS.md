# Test results

Date: 2026-09-01 (Asia/Dhaka)  
Host: Windows 11, Node 26.5.0, npm 11.17.0, Git 2.50.1; WSL2 Ubuntu present.  
Critical environment fact: Docker is not installed on Windows or WSL; Ubuntu also lacks native Node and jq.

## Actually run and passed

| Command/check                           | Result                                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd install`                       | 434 packages audited after quality tooling; 0 npm-reported vulnerabilities                                                                     |
| `npm.cmd run seed`                      | Four separate agency SQLite databases seeded with one protected synthetic record each                                                          |
| `npm.cmd run build`                     | Shared, Fabric client, chaincode, adapter, API TypeScript builds passed; Vite production build passed (217.10 kB JS, 11.51 kB CSS before gzip) |
| `npm.cmd test`                          | 12 tests passed across shared crypto (3), chaincode (2), adapter DB (1), gateway API (5), web client (1)                                       |
| `npm.cmd run test:security`             | 2 tests passed: HMAC non-disclosure shape; Ed25519 correct/modified receipt behavior                                                           |
| `npm.cmd run lint`                      | ESLint TypeScript-aware pass completed with zero errors/warnings                                                                               |
| `npm.cmd run format:check`              | All matched source/config/documentation files pass Prettier check                                                                              |
| `bash -n` over all shell scripts        | All checked shell scripts passed syntax validation                                                                                             |
| `npm.cmd run test:integration`          | Suite loaded successfully; 2 real-Fabric tests skipped by explicit `RUN_REAL_FABRIC_TESTS` gate                                                |
| Running `npm.cmd run dev`               | API on 4000, RAB/BGB/Customs adapters on 4102–4104, Vite on `localhost:5173`                                                                   |
| Running API login                       | 200 for `police.investigator`; safe profile returned                                                                                           |
| Missing case runtime request            | 404 `CASE_NOT_FOUND`; safe event created before Fabric call                                                                                    |
| Active-case request while Fabric absent | 503 `BLOCKCHAIN_UNAVAILABLE`; no fallback transaction                                                                                          |
| API health while Fabric absent          | 503 with `blockchain.available: false`                                                                                                         |
| WSL `bash scripts/bootstrap.sh lite`    | Exited non-zero with clear `Missing 'docker'` message before partial setup                                                                     |

The current unit total is 14 when workspace and root security suites are combined.

## Not passed / not run

The following mandatory acceptance evidence is blocked by missing Docker and is not claimed:

- Fabric network/container startup, channel creation, chaincode lifecycle deployment, real write/commit/query, restart persistence, and real transaction ID.
- Real wrong-MSP/provider success, approval/partial/deny/disclosure transition suite.
- Decoded exported block leakage scan (`verify-ledger-leakage.sh`).
- Reset/restart rehearsal against live Fabric.
- Playwright browser E2E/screenshots and honest latency benchmark.
- Full four-peer/three-orderer runtime proof.

## Next verification commands after Docker setup

```bash
npm run bootstrap:lite
npm run dev
RUN_REAL_FABRIC_TESTS=true npm run test:integration
npm run test:e2e
npm run verify
npm run benchmark
npm run reset
```

Record the first queried-back real transaction ID in `PROGRESS.md`, capture command output, and update this file without converting skipped tests into passes unless they actually execute.
