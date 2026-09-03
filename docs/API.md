# REST API

Base path: `/api/v1`. JSON bodies are limited to 32 KiB and validated. Authenticated routes use `Authorization: Bearer <JWT>`. Errors use `{ "error": { "code", "message", "requestId" } }`.

| Method and route                       | Role             | Behavior / principal responses                                                                                     |
| -------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `POST /auth/login`                     | public           | 200 JWT; 401 invalid; 403 revoked                                                                                  |
| `POST /auth/logout`                    | authenticated    | 204 (client discards stateless demo JWT)                                                                           |
| `GET /auth/me`                         | authenticated    | Safe user profile and budget                                                                                       |
| `GET /config`                          | public           | Server-authoritative lite/full label and available provider list                                                   |
| `GET /health`                          | public           | 200 Fabric reachable; 503 unavailable; includes mode/providers                                                     |
| `GET /cases`                           | authenticated    | Active cases owned by user organization                                                                            |
| `POST /queries`                        | investigator     | Commit QueryRequest, then fan out; 200 complete, 207 partial provider failure, or 503 if query commit itself fails |
| `POST /queries/:queryId/retry`         | investigator     | Retry failed provider attestations against the already committed query without creating a duplicate query          |
| `GET /workflows/:queryId`              | authenticated    | Query Fabric workflow timeline                                                                                     |
| `POST /access-requests`                | investigator     | Commit narrow AccessRequest after MATCH                                                                            |
| `GET /provider/inbox`                  | provider officer | Access requests for provider organization                                                                          |
| `POST /provider/requests/:id/decision` | provider officer | Provider adapter commits APPROVE/PARTIAL/DENY                                                                      |
| `POST /access-requests/:id/disclose`   | investigator     | Provider encrypts approved fields, signs hash, commits receipt; gateway decrypts/verifies                          |
| `GET /security-events`                 | auditor          | Safe rejected-event view                                                                                           |
| `POST /demo/reset`                     | auditor          | Reset local counters/events only in DEMO_MODE; full ledger reset stays an operator command                         |

Example query:

```json
{
  "caseId": "P-2026-014",
  "purposeCode": "ACTIVE_INVESTIGATION",
  "syntheticIdentifier": "TEST-NID-0001",
  "targetOrganizations": ["RABMSP", "BGBMSP", "CustomsMSP"]
}
```

The raw identifier exists only in request memory long enough to canonicalize and HMAC it. Pino redaction covers password, identifier, protected token, JWT/authorization, and cookie paths; request bodies are not logged by default.

Internal adapter calls use a 30-second timestamp window, a random nonce with replay cache, and HMAC-SHA-256 over `timestamp.nonce.exact-json-body`. Adapters are loopback-only in host development and internal-only in Docker.

Decision scope rules are enforced in shared validation, the gateway/adapter path, and chaincode: APPROVE must equal the requested set, PARTIAL must be a non-empty proper subset, and DENY must approve no scopes. Duplicate and unrequested scopes are rejected.
