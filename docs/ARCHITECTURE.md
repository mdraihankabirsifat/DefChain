# Architecture

DefChain separates discovery, disclosure, and accountability. Fabric is used for shared organization-backed workflow state; private matching and payload delivery remain provider-controlled and off-chain.

```mermaid
flowchart LR
  UI[React dashboard] --> API[Gateway API\nJWT, cases, budgets]
  API -->|HMAC protected token + signed internal request| RA[RAB adapter]
  API --> BA[BGB adapter]
  API --> CA[Customs adapter]
  RA --> RDB[(RAB.sqlite)]
  BA --> BDB[(BGB.sqlite)]
  CA --> CDB[(Customs.sqlite)]
  API -->|Police X.509| PG[Police Fabric Gateway]
  RA -->|RAB X.509| RG[RAB Fabric Gateway]
  BA -->|BGB X.509| BG[BGB Fabric Gateway]
  CA -->|Customs X.509| CG[Customs Fabric Gateway]
  PG & RG & BG & CG --> CH[defchain-channel\ndefchain chaincode]
```

## Transaction path

```mermaid
sequenceDiagram
  participant P as Police user/API
  participant F as Fabric
  participant R as RAB adapter/DB
  P->>F: QueryRequest (PoliceMSP)
  P->>R: protected token (off-chain, signed request)
  R->>R: local protected lookup
  R->>F: MatchAttestation (RABMSP)
  P->>F: AccessRequest (PoliceMSP)
  R->>F: AuthorizationDecision (RABMSP)
  R-->>P: AES-256-GCM approved payload (off-chain)
  R->>F: DisclosureReceipt (RABMSP)
  P->>F: GetWorkflow audit query
```

## Fabric topology

| Mode | Peers                                             | Orderers                                      | Status here                               |
| ---- | ------------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| Lite | PoliceMSP peer0:7051; RABMSP peer0:8051           | orderer0:7050, etcdraft/Raft                  | Configured; not run because Docker absent |
| Full | Lite + BGBMSP peer0:9051 + CustomsMSP peer0:10051 | orderer0/1/2 on 7050/8050/9050, etcdraft/Raft | Configured strong target; not run here    |

All modes use `defchain-channel`, `defchain` chaincode, cryptogen-generated local X.509 demo identities, TLS, and organization-specific Gateway connections. Chaincode endorsement permits a member peer, while provider-only operations additionally compare the invoker MSP to `providerOrg`. An auditor is an application-level read-only role and has no peer.

## Why not one database/API?

A central API is still useful for user experience, case checks, and routing, but its operator would otherwise control the only shared history. Fabric supplies member identity, endorsement, deterministic transitions, commit confirmation, and a ledger no simulated member can silently rewrite alone. It does not make source data true, decide guilt, compute HMACs, or replace provider authorization.

## Custody boundary

The gateway never opens provider SQLite files. Each adapter process receives only its organization configuration/database and holds its provider identity/signing key. Docker mode keeps adapters on an internal application network without published ports. Host development binds adapters to loopback only.
