# Judge Q&A

## Why blockchain?

The participating organizations need shared workflow history and organization-backed authorization without giving one agency unilateral control of the canonical audit database. Fabric provides MSP identity, endorsement, deterministic transitions, commit confirmation, and replicated history. Matching and payload exchange remain off-chain.

## Why not a central database or NRDEX/API alone?

A conventional API remains part of DefChain, but its single operator could change the only shared audit trail and become a high-value intelligence custodian. DefChain does not replace an exchange/API; it adds a jointly governed state machine for attestations and disclosure decisions while preserving local databases.

## What is on-chain and off-chain?

On-chain: opaque case reference, purpose, organizations, scopes, match result, decision/reason codes, expiry, payload hash/signature, Fabric metadata. Off-chain: raw identifier/token/key, provider record, justification, encrypted/plain payload, credentials and private keys.

## Who are peers and orderers?

Lite has PoliceMSP and RABMSP peers plus one etcdraft orderer. Full adds BGBMSP/CustomsMSP peers and two more etcdraft orderers. Both modes were clean-bootstrapped and exercised locally on 2026-09-03; this is prototype evidence, not a production deployment claim.

## How are transactions verified?

Fabric Gateway endorses/submits, waits for commit status, and returns the chaincode record containing Fabric’s transaction ID and timestamp. The UI queries the workflow back. The leakage script independently exports/decodes blocks with official tooling.

## How does identity work?

Demo application users authenticate with bcrypt-hashed passwords/JWT. The server maps them to role/organization and selects server-held X.509 Fabric identities. Browser code never receives Fabric private keys. Production would use governed Fabric CAs, IdP/MFA, CRLs, and HSM custody.

## How does the provider retain control?

Its adapter owns the local database and provider signing/Fabric path. Chaincode requires provider MSP for MatchAttestation, AuthorizationDecision, and DisclosureReceipt. It can approve, narrow, or deny scopes and only approved fields are encrypted/released.

## Can Police forge a RAB match?

Not with a PoliceMSP identity: chaincode rejects an invoker MSP that differs from `providerOrg`. Compromise of a valid RAB identity remains an organizational security/governance risk.

## What if a peer or HMAC key is compromised?

A peer compromise requires certificate revocation, incident investigation, identity/key rotation, and potentially channel/chaincode governance action. A shared HMAC key compromise enables dictionary/equality attacks against the low-entropy identifier domain; the demo uses epochs but production should use provider-specific VOPRF/PSI and HSM/KMS custody.

## Does a match prove guilt?

No. It only says a provider’s approved synthetic matching process found a corresponding identifier. It does not prove identity correctness, source truth, relevance, guilt, or disclosure entitlement.

## How are keys rotated or revoked?

The demo records a token epoch and regenerates ignored local signing material on reset, but has no production rotation/CRL workflow. Production requires overlapping reindex windows, KMS/HSM versioning, Fabric CA revocation/CRLs, monitored expiry, and independently authorized custody.

## What governance body adds/removes members?

A proposed formally chartered multi-agency consortium would approve channel changes and membership through threshold signatures and documented legal/security onboarding/offboarding. That governance body is proposed, not an existing government partnership.

## What is implemented versus proposed?

Implemented and locally verified: TypeScript CCAAS chaincode, MSP checks, immutable transitions, Fabric Gateway path, isolated SQLite adapters, HMAC matching, auth/budgets/events, AES-GCM disclosure, Ed25519 receipts, role-aware UI, scripts/tests/docs, and lite/full Fabric networks. Proposed only: production CA/HSM/KMS/mTLS/IdP, VOPRF/PSI, formal consortium/legal deployment, HA/scale.
