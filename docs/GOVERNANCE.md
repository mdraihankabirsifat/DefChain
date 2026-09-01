# Governance

## Implemented demo controls

- Cryptographic MSP identity distinguishes PoliceMSP, RABMSP, BGBMSP, and CustomsMSP.
- Chaincode requires the invoker MSP to equal requesterOrg for requester writes and providerOrg for provider attestations, decisions, and receipts.
- Provider organizations decide disclosure scope and may APPROVE, PARTIAL, or DENY.
- Application users are role/organization mapped; revoked users and wrong roles are rejected.
- Policy version `demo-1`, purpose codes, scope allowlists, expiry, query budgets, and immutable transitions are recorded/enforced where applicable.
- Auditor is read-only at the application layer and can inspect workflows/security events.

## Production governance proposal (not implemented)

A formally chartered consortium body—not any single member—would approve membership, policy releases, channel configuration, and incident actions. Onboarding should require legal authority, security assessment, approved operating contacts, Fabric CA enrollment, endpoint/anchor-peer approval, and threshold channel-configuration signatures. Offboarding should coordinate certificate revocation/CRLs, identity and HSM key destruction, endpoint removal, data-retention obligations, and continuity of historical audit access.

Member responsibilities:

- Requester: demonstrate active lawful purpose, minimize targets/scopes, prevent fishing, and protect received disclosure.
- Provider: operate the matching policy, validate source context, decide disclosure, retain raw data, and report compromise.
- Auditor/oversight: inspect safe metadata, investigate anomalies, review budgets/policy versions, and avoid obtaining payloads by default.
- Consortium operator: coordinate releases and incidents without becoming a master intelligence-data custodian.

Policy updates should be versioned, reviewed by legal/privacy/security stakeholders, tested in a separate channel, and activated through signed channel/chaincode governance. Emergency suspension should disable application users, revoke certificates, and pause affected workflows; it cannot erase already committed history.

## Retention and exit

The prototype does not implement production retention. A deployment must define common-ledger retention, local security-event retention, disclosure destruction/return, legal holds, subject rights, audit access after member exit, and jurisdiction-specific admissibility. Immutability can conflict with deletion duties, so the common ledger deliberately contains only minimized workflow metadata.
