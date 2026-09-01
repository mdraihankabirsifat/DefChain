# Security controls

## Implemented

- Zod validation with strict schemas, bounded IDs/strings/scope lists, enum allowlists, and 32 KiB HTTP body limit.
- Helmet headers, strict local CORS, login rate limiting, bcrypt password hashes, JWT issuer/expiry, live active-user lookup, and role/organization enforcement.
- Case status/purpose validation and per-user query budget before Fabric query creation.
- Safe local SecurityEvents for missing/inactive case, budget, revoked user, and unauthorized action; case values are hashed where recorded.
- Pino redaction for authorization/JWT-bearing headers, passwords, identifiers, protected tokens, and cookies. Raw request bodies are not emitted.
- HMAC-SHA-256 protected exact matching with explicit domain and key epoch; tokens are never Fabric arguments.
- Internal adapter HMAC authentication with timestamp, nonce, exact-body signature, timing-safe comparison, timeout, and replay cache.
- AES-256-GCM with random 96-bit IV, authentication tag, SHA-256 payload hash, and Ed25519 provider signature.
- Fabric X.509 identities remain server-side; browser receives only application JWTs.
- Immutable state keys, legal predecessor checks, scope-subset checks, deterministic Fabric timestamp usage, and MSP authorization in chaincode.
- No fake ledger fallback. Fabric errors become `BLOCKCHAIN_UNAVAILABLE` and HTTP 503.

## Production direction

Use an external IdP with MFA and rapid session revocation; per-service mTLS; Fabric CAs with governed registration, CRLs, renewal, and monitoring; HSM/KMS-backed identity, HMAC, encryption, and signing keys; provider-specific secrets; audited rotations; persistent replay protection; transport-level request confidentiality; independent peer/orderer operators; stricter endorsement/state-based endorsement; backup/restore rehearsal; SIEM alerts; code/dependency/container scanning; and formal penetration/privacy/legal assessment.

The demo's shared HMAC and disclosure secrets are intentionally documented weaknesses. They must not be re-used for a real deployment.
