# DefChain

> Share the match, not the database.

DefChain is a privacy-conscious, permissioned inter-agency discovery and disclosure workflow prototype for the Blockchain Olympiad Bangladesh 2026. Each simulated agency retains its own synthetic database. Hyperledger Fabric records jointly governed workflow facts—queries, match attestations, access requests, decisions, and disclosure receipts—while identifiers and provider payloads stay off the common ledger.

This is a competition prototype using synthetic data and a hypothetical Police/RAB/BGB/Customs scenario. It does not claim government access, partnership, production readiness, factual correctness of intelligence, or perfect privacy.

## Quick start

The supported path is WSL2 Ubuntu with Docker Desktop WSL integration enabled:

```bash
cp .env.example .env
npm install
npm run bootstrap:lite
npm run dev
```

Open `http://localhost:5173`. API health is at `http://localhost:4000/api/v1/health`.

The implementation machine has Docker Desktop, native Node 22/npm 10 and the project-local Fabric 2.5.12 tools available in WSL2. Run `npm run preflight` from Windows to check another machine. DefChain never falls back to a mock ledger: ledger-changing UI/API actions are blocked when Fabric is unavailable.

## Repository map

- `apps/web` — React/Vite role-aware competition dashboard.
- `services/gateway-api` — authentication, case/query orchestration, Fabric Gateway, audit API.
- `services/agency-adapter` — reusable, separately launched provider matching/disclosure service.
- `blockchain/chaincode` — TypeScript Fabric contract for the five immutable ledger object types.
- `blockchain/network` — real Fabric lite/full topology configuration and lifecycle scripts.
- `packages/shared` — shared enums, Zod schemas, DTOs, cryptographic helpers.
- `data/seeds` — explicitly synthetic deterministic fixtures.
- `docs` — architecture, governance, threat model, API, tests, demo, and judging evidence.

Full startup, demo accounts, verified topology, test commands, limitations, and troubleshooting are documented in [docs/QUICKSTART.md](docs/QUICKSTART.md). Current implementation truth and blockers are in [PROGRESS.md](PROGRESS.md).

## Demo accounts

| Actor                 | Username              | Password           | Organization / role      |
| --------------------- | --------------------- | ------------------ | ------------------------ |
| Police investigator   | `police.investigator` | `PoliceDemo!2026`  | PoliceMSP / investigator |
| RAB officer           | `rab.officer`         | `RabDemo!2026`     | RABMSP / provider        |
| BGB officer           | `bgb.officer`         | `BgbDemo!2026`     | BGBMSP / provider        |
| Customs officer       | `customs.officer`     | `CustomsDemo!2026` | CustomsMSP / provider    |
| Independent auditor   | `auditor`             | `AuditDemo!2026`   | read-only auditor        |
| Revoked test user     | `revoked.user`        | `RevokedDemo!2026` | disabled                 |
| Exhausted-budget user | `budget.exhausted`    | `BudgetDemo!2026`  | zero query budget        |

These credentials are local demonstration fixtures, not production defaults.

## Guided path

1. Log in as Police and query `TEST-NID-0001` under active case `P-2026-014` and purpose `ACTIVE_INVESTIGATION`.
2. In lite mode, observe the RAB `MATCH`; in full mode, target all providers and also observe BGB/Customs `NO_MATCH` attestations. Every attestation has a real Fabric transaction ID.
3. Request `IDENTITY_CONFIRMATION` and `CASE_REFERENCE` from RAB.
4. Switch to the RAB officer and APPROVE or PARTIAL the request. Use a second request to demonstrate DENY.
5. Switch back to Police, execute disclosure, and verify AES-GCM integrity, Ed25519 signature, payload hash, and receipt transaction ID.
6. Open Audit timeline and query the workflow. Then demonstrate missing case, budget exhaustion, and revoked-user rejection.

## On-chain boundary

| Common Fabric ledger                                                                                                                                                 | Kept off-chain                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Opaque case reference, purpose, organizations, requested/approved scopes, MATCH/NO_MATCH, decision/reason codes, payload hash/signature, timestamps, transaction IDs | Raw identifier, HMAC token/key, provider record, justification text, encrypted/plain payload, passwords/JWTs, encryption/private keys |

## Topology and commands

- Lite target: PoliceMSP peer, RABMSP peer, one real etcdraft/Raft orderer.
- Full target: PoliceMSP, RABMSP, BGBMSP, and CustomsMSP peers plus three etcdraft/Raft orderers.
- Channel: `defchain-channel`; chaincode: `defchain`.
- Both topologies are runtime-verified on this machine. The latest clean full bootstrap committed and queried back transaction `91c99f210801b77dc3ae51cb8105d8cb5b2acfd2fa9180d2055d0d92465cc914`; see the test evidence for scope and date.

```bash
npm run build
npm test
npm run test:security
RUN_REAL_FABRIC_TESTS=true npm run test:integration
FABRIC_NETWORK_MODE=full npm run verify:production
npm run verify
npm run benchmark
npm run reset
```

See [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) for results actually observed and [docs/LIMITATIONS.md](docs/LIMITATIONS.md) for residual risks.
