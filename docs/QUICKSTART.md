# Quick start

## Required environment

Use WSL2 Ubuntu, not native PowerShell, for Fabric scripts. Install Node.js 20 or 22 LTS, npm 10+, Docker Desktop with Ubuntu WSL integration, Git, curl, jq, and OpenSSL. Docker Compose v2 is required. Allocate enough Docker resources for at least two peers and one orderer.

Run this from Windows first:

```powershell
npm.cmd run preflight
```

On the implementation machine, WSL2 exists but Docker is not installed, Ubuntu has no native Node binary, and `jq` is missing. The required human action is to install Docker Desktop, enable Ubuntu under Docker Desktop → Settings → Resources → WSL Integration, and install Node LTS plus jq inside Ubuntu. This is the only confirmed blocker to a real Fabric run.

## Lite bootstrap (recommended first proof)

Open this repository inside WSL Ubuntu, then:

```bash
cp .env.example .env
npm install
npm run bootstrap:lite
npm run dev
```

Bootstrap pins Fabric 2.5.12, downloads official Linux binaries into ignored `.fabric/`, pulls official Fabric images, generates demo X.509 material, creates `defchain-channel`, deploys TypeScript chaincode, seeds four separate SQLite files, and commits/queries a smoke `QueryRequest`.

Open:

- Frontend: http://localhost:5173
- API health: http://localhost:4000/api/v1/health
- RAB adapter health (host development only): http://localhost:4102/internal/health

Health must say Fabric is available before any ledger action is enabled. There is no mock fallback.

## Full topology

After proving lite mode:

```bash
npm run network:down
FABRIC_NETWORK_MODE=full npm run network:up
FABRIC_NETWORK_MODE=full npm run chaincode:deploy
npm run dev
```

The full topology adds BGBMSP and CustomsMSP peers and two additional Raft orderers. It is a checked-in strong target, not a topology verified on the current Docker-less machine.

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
```

`verify-ledger-leakage.sh` exports every Fabric block, decodes it with official `configtxlator`, and fails if configured raw identifier, protected-token, payload, or key markers are present.
