# Limitations

- All people, identifiers, records, cases, users, and organizations are synthetic/simulated. The motivating Police–RAB scenario is hypothetical.
- No access to Police, RAB, BGB, Customs, classified systems, national registries, production topology, or formal government partnership is claimed.
- HMAC exact matching reveals equality within an epoch and is vulnerable if its shared key or low-entropy identifier domain is compromised. It is a competition baseline, not private-set-intersection privacy.
- Cryptogen identities, local PEM keys, shared demo secrets, loopback/internal-network authentication, bcrypt/JWT accounts, and local SQLite are not production identity/key operations.
- Both checked-in Fabric topologies have been exercised locally, including real transactions, query-back, restart persistence, decoded-block leakage scans, browser screenshots, and a small latency sample. This is single-machine prototype evidence, not an independent audit, production benchmark, or deployment-readiness claim.
- One-peer-per-member topology and baseline OR endorsement favor demo availability over Byzantine compromise resistance. Three Raft orderers tolerate crash failures in full mode, not malicious consensus participants.
- A MATCH does not prove guilt, identity correctness, record accuracy, relevance, legal authority, or entitlement. Blockchain records statements and decisions; it does not establish factual truth.
- Organization/timing/purpose/scope/result metadata is visible to common-channel members.
- Shared demo disclosure encryption is not requester-specific key agreement. Production needs recipient-specific authenticated key exchange/envelope encryption.
- Audit immutability does not prevent poor source data or discriminatory/harmful human decisions.
- Legal authority, admissibility, privacy impact, records retention/deletion, procurement, hosting accreditation, and operational governance require formal Bangladesh-specific validation and approval.
- VOPRF, PSI, ZKP, production Fabric CA/HSM/KMS, monitoring, HA, disaster recovery, and scale engineering are not implemented.
