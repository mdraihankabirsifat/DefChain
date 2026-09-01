# Agent instructions

- Treat `PROGRESS.md` as the resumable source of implementation status.
- Never add a fake/in-memory/SQLite blockchain fallback. Fabric-unavailable writes must fail closed.
- Never place or log raw identifiers, protected HMAC tokens, provider payloads, passwords, JWTs, keys, or authorization headers.
- Keep the five ledger record names frozen: `QueryRequest`, `MatchAttestation`, `AccessRequest`, `AuthorizationDecision`, `DisclosureReceipt`.
- Use only clearly synthetic identifiers such as `TEST-NID-0001`.
- Update `PROGRESS.md` after major checkpoints and record only commands/tests actually run.
