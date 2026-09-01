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

The current machine is missing Docker and a native Node installation inside WSL. Run `npm run preflight` from Windows for exact remediation before attempting Fabric startup. DefChain never falls back to a mock ledger: ledger-changing UI/API actions are blocked when Fabric is unavailable.

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
