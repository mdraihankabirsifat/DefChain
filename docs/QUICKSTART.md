# Quick start

## Required environment

Use WSL2 Ubuntu, not native PowerShell, for Fabric scripts. Install Node.js 20 or 22 LTS, npm 10+, Docker Desktop with Ubuntu WSL integration, Git, curl, jq, and OpenSSL. Docker Compose v2 is required. Allocate enough Docker resources for at least two peers and one orderer.

Run this from Windows first:

```powershell
npm.cmd run preflight
```

On the verified implementation machine, Docker Desktop 4.89.0/Engine 29.7.2, Compose 5.5.0, native WSL Node 22.23.2/npm 10.9.8, and jq 1.8.1 are installed. If `docker info` fails inside WSL, enable Ubuntu under Docker Desktop → Settings → Resources → WSL Integration and reopen the terminal.

## Lite bootstrap (recommended first proof)

Open this repository inside WSL Ubuntu, then:

```bash
cp .env.example .env
npm install
npm run bootstrap:lite
npm run dev
```

Bootstrap pins Fabric 2.5.12, downloads official Linux binaries into ignored `.fabric/`, pulls official Fabric images, generates demo X.509 material, creates `defchain-channel`, deploys TypeScript chaincode as an external CCAAS service, seeds four separate SQLite files, and commits/queries a smoke `QueryRequest`.

Open:

- Frontend: http://localhost:5173
- API health: http://localhost:4000/api/v1/health
- RAB adapter health (host development only): http://localhost:4102/internal/health

Health must say Fabric is available before any ledger action is enabled. There is no mock fallback.

## Full topology

To switch from lite to a clean full topology:

```bash
FABRIC_NETWORK_MODE=full npm run reset
npm run dev:full
```

The full topology adds BGBMSP and CustomsMSP peers and two additional Raft orderers. It was clean-bootstrapped and exercised through the production-routed browser workflow on 2026-09-03. Use `npm run dev:full`; the default `npm run dev` intentionally stays in lite mode.

## Reset and restart

```bash
npm run stop
npm run network:up:lite
npm run dev
npm run reset
```

`network:down` removes DefChain Compose volumes and DefChain-named chaincode containers only. `reset` clears ignored runtime databases/keys, then bootstraps a known state. Review the resolved repository path before changing reset logic.

## Accounts and fixtures

Use the credential table in the root README. The happy path is `P-2026-014` + `TEST-NID-0001`: Police has no corresponding record, RAB has a protected match, and BGB/Customs return no match. `P-2026-CLOSED`, `MISSING-CASE`, `revoked.user`, and `budget.exhausted` exercise rejection paths.

## Verification

```bash
npm run build
npm test
npm run test:security
RUN_REAL_FABRIC_TESTS=true npm run test:integration
npm run verify
FABRIC_NETWORK_MODE=full npm run verify:production
npm run benchmark
```

`verify-ledger-leakage.sh` exports every Fabric block, decodes it with official `configtxlator`, and fails if configured raw identifier, protected-token, payload, or key markers are present.
