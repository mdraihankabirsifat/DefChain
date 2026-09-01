# Data model

All ledger records are immutable/write-once, `schemaVersion: "1.0"`, and receive `txId` plus `ledgerTimestamp` from Fabric. Suggested keys are implemented exactly.

| Record / key                                           | Safe fields                                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `QueryRequest` / `QUERY::<queryId>`                    | requesterOrg, opaqueCaseRef, purposeCode, targetOrganizations, policyVersion, status, createdByRole |
| `MatchAttestation` / `MATCH::<queryId>::<providerOrg>` | providerOrg, MATCH/NO_MATCH, optional narrow eligibilityCode, policyVersion                         |
| `AccessRequest` / `ACCESS::<requestId>`                | queryId, requesterOrg, providerOrg, requestedScopes, purposeCode, justificationHash, status         |
| `AuthorizationDecision` / `DECISION::<requestId>`      | providerOrg, APPROVE/PARTIAL/DENY, approvedScopes, reasonCode, expiresAt, policyVersion             |
| `DisclosureReceipt` / `RECEIPT::<requestId>`           | parties, SHA-256 payloadHash, Ed25519 providerSignature, algorithm                                  |

## State transitions

`QueryRequest → MatchAttestation → AccessRequest → AuthorizationDecision(APPROVE|PARTIAL) → DisclosureReceipt`

- An AccessRequest requires an existing MATCH from the selected provider.
- APPROVE must grant all requested scopes; PARTIAL grants a non-empty subset; DENY grants none.
- A receipt requires a non-expired APPROVE/PARTIAL and matching parties.
- Duplicate keys, provider scope escalation, wrong MSP, missing predecessors, and illegal transitions fail.

DENY is terminal and auditable. NO_MATCH ends the selected provider branch. Local pre-ledger rejections are safe `SecurityEvent` rows, not ledger objects.

## Forbidden common-ledger data

Raw or canonical identifiers, HMAC tokens/keys, raw provider records, dossier/narrative text, raw justification, encrypted or plaintext disclosure payloads, passwords, JWTs, encryption keys, private keys, and authorization headers must never be transaction arguments, state, or events.

## Off-chain SQLite

Each provider database has `protected_records(protected_token, eligibility_code, fields_json, key_epoch)` and `query_matches(query_id, protected_token, matched, created_at)`. The gateway database contains application users, cases, counters, and safe security events only.
