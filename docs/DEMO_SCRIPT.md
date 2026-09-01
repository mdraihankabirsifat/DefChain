# 9-minute demo script

## 0:00–0:45 — Frame the problem

Show the login page and synthetic-prototype label. Say: “Agencies retain their databases. DefChain shares a provider-backed match and an auditable authorization workflow—not a common intelligence database.” State that the scenario/data are hypothetical and synthetic.

## 0:45–1:30 — Prove the network

Log in as `police.investigator` / `PoliceDemo!2026`. Show Fabric Connected, `defchain-channel`, MSP identity, and query budget. Copy a displayed real transaction ID only after the network has been verified.

## 1:30–3:00 — Protected discovery

Open Discovery. Select active case `P-2026-014`, purpose `ACTIVE_INVESTIGATION`, identifier `TEST-NID-0001`, and RAB/BGB/Customs. Submit. Explain that the browser sends the synthetic identifier to the gateway, which canonicalizes/HMACs it in memory; only the protected token reaches isolated adapters and never Fabric/logs. Show RAB MATCH, BGB/Customs NO_MATCH, and attestation tx IDs. Read the “MATCH is not guilt” notice.

## 3:00–4:10 — Scoped request

Request `IDENTITY_CONFIRMATION` and `CASE_REFERENCE` from RAB with a purpose-bound synthetic justification. Show AccessRequest tx ID. Point out that the ledger stores only its SHA-256 justification hash and scopes.

## 4:10–5:20 — Provider control

Switch actor to `rab.officer` / `RabDemo!2026`. Open Provider inbox. PARTIAL a request to identity confirmation or APPROVE both scopes. Create a second request and DENY it with `SCOPE_NOT_JUSTIFIED`. Show both real decision tx IDs.

## 5:20–6:25 — Encrypted disclosure

Switch back to Police. Enter the approved request ID and execute disclosure. Show only approved fields, encryption verified, signature verified, payload hash, and DisclosureReceipt tx ID. Explain AES-256-GCM off-chain delivery, SHA-256 hash, and Ed25519 provider signature.

## 6:25–7:20 — Audit timeline

Open Audit timeline using the query ID. Walk through QueryRequest → MatchAttestation → AccessRequest → AuthorizationDecision → DisclosureReceipt, each with organization, safe timestamp, real Fabric tx ID, and verification badge.

## 7:20–8:10 — Abuse controls

Submit `MISSING-CASE` (404) or closed case; then log in as `budget.exhausted` / `BudgetDemo!2026` to show 429, and briefly show revoked login rejection. As auditor (`auditor` / `AuditDemo!2026`), show safe security events. No raw identifier should appear there.

## 8:10–9:00 — Architecture, governance, limits

Show Architecture and Security/Governance. Answer why Fabric is used: mutually governed identity/transitions/history, not matching or truth. State HMAC linkability/shared-key limitations, simulated topology, and VOPRF/PSI plus HSM/mTLS/CA governance as future work.

If Fabric health is unavailable, do not present this as the final blockchain demo. Show the honest fail-closed state and fix Docker/network before submission.
