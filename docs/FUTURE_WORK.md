# Future work

Priority improvements after the mandatory real-Fabric proof:

1. Replace the shared-key HMAC lookup with a reviewed VOPRF or PSI protocol so requesters cannot build reusable equality tokens and a compromised shared key does not expose the full identifier index.
2. Use provider- and requester-specific authenticated envelope encryption with mTLS, KMS/HSM custody, automated rotation, certificate revocation, and hardware-backed Fabric signing.
3. Tighten endorsement/state-based endorsement for provider-owned records after verifying lifecycle stability across all four MSPs.
4. Add a production IdP with MFA, persistent nonce/replay storage, managed policy engine, SIEM integration, case-system authorization evidence, and independent auditor access.
5. Conduct legal/privacy impact assessment, red-team testing, usability research, failure exercises, accessibility audit, and realistic scale tests on synthetic data.

VOPRF and PSI are documentation-only in this MVP. No zero-knowledge proof is implemented or implied.
