# BCOLBD scoring checklist

## Problem & Solution — 40

- [x] Frontend communicates “share the match, not the database” (`apps/web`, Architecture view).
- [x] Separate discovery, disclosure, accountability (`docs/ARCHITECTURE.md`, five ledger objects).
- [x] Deterministic synthetic Police/RAB/BGB/Customs scenario (`data/seeds/agencies.json`).
- [x] Guided positive and abuse paths (`docs/DEMO_SCRIPT.md`).
- [ ] Capture final UI evidence with real transaction IDs after Docker setup.

## Privacy & Security Risks — 20

- [x] Raw identifiers/tokens/payload forbidden from common ledger (`docs/DATA_MODEL.md`).
- [x] HMAC epoch baseline, AES-256-GCM, SHA-256, Ed25519, redaction, internal replay protection (`packages/shared`, services).
- [x] Case/purpose/budget/revoked/role controls and safe SecurityEvents (gateway API and tests).
- [x] Explicit HMAC/metadata/key/peer compromise residual risks (`docs/THREAT_MODEL.md`, `docs/LIMITATIONS.md`).
- [ ] Run decoded-block leakage proof after real network startup (`scripts/verify-ledger-leakage.sh`).

## Architecture — 20

- [x] React/Vite, Express, reusable adapters, separate SQLite custody, Fabric Gateway, TypeScript chaincode.
- [x] Lite and full Fabric configuration (`blockchain/network`), one channel, Raft, X.509 MSPs.
- [x] MSP-enforced provider actions and legal transitions (`defchain-contract.ts`, unit/integration tests).
- [x] Fail-closed blockchain status in API/UI.
- [ ] Prove chaincode lifecycle, commit/query/restart and full topology on Docker.

## Governance — 20

- [x] Requester/provider/auditor responsibilities and provider authority (`docs/GOVERNANCE.md`).
- [x] Membership, policy versioning, incident/offboarding/retention proposal clearly distinguished from demo.
- [x] Limitations avoid government partnership or factual-truth claims.
- [x] Auditor UI and safe event endpoint.
- [ ] Obtain formal legal/privacy/governance review before any real-world claim or deployment.

## Current evidence status

`npm run build`, 12 workspace tests, and 2 security tests passed on 2026-09-01. Runtime UI/API/adapters started; login and rejection paths passed. The mandatory actual-blockchain-write gate is not yet evidenced because Docker is not installed. See `docs/TEST_RESULTS.md` and `PROGRESS.md`.
