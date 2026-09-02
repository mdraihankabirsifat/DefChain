import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { app, dependencies } from "./server.js";

const api = supertest(app);
let policeToken = "";
const queryBody = {
  caseId: "P-2026-014",
  purposeCode: "ACTIVE_INVESTIGATION",
  syntheticIdentifier: "TEST-NID-0001",
  targetOrganizations: ["RABMSP"],
};
const committedQuery = {
  schemaVersion: "1.0",
  recordType: "QueryRequest",
  queryId: "query_1234567890abcdef",
  requesterOrg: "PoliceMSP",
  opaqueCaseRef: "case_opaque_6a58a441e3c507c8",
  purposeCode: "ACTIVE_INVESTIGATION",
  targetOrganizations: ["RABMSP"],
  policyVersion: "demo-1",
  status: "CREATED",
  createdByRole: "INVESTIGATOR",
  txId: "a".repeat(64),
  ledgerTimestamp: "2026-09-02T00:00:00.000Z",
};
const attestation = {
  schemaVersion: "1.0",
  recordType: "MatchAttestation",
  attestationId: "attest_1234567890abcdef",
  queryId: committedQuery.queryId,
  providerOrg: "RABMSP",
  result: "MATCH",
  policyVersion: "demo-1",
  txId: "b".repeat(64),
  ledgerTimestamp: "2026-09-02T00:00:01.000Z",
};

describe("gateway API controls and query outcomes", () => {
  beforeAll(async () => {
    const response = await api.post("/api/v1/auth/login").send({
      username: "police.investigator",
      password: "PoliceDemo!2026",
    });
    policeToken = response.body.token;
  });
  beforeEach(() => {
    vi.restoreAllMocks();
    dependencies.database.resetDemo();
  });

  it("publishes server-authoritative lite-mode configuration", async () => {
    const response = await api.get("/api/v1/config");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      mode: "lite",
      modeLabel: "Lite Demo",
      providers: ["RABMSP"],
    });
  });

  it("authenticates without exposing password data and rejects revoked users", async () => {
    const me = await api
      .get("/api/v1/auth/me")
      .set("authorization", `Bearer ${policeToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user).not.toHaveProperty("password_hash");
    const revoked = await api
      .post("/api/v1/auth/login")
      .send({ username: "revoked.user", password: "RevokedDemo!2026" });
    expect(revoked.status).toBe(403);
    expect(revoked.body.error.code).toBe("USER_REVOKED");
  });

  it("rejects missing cases and budget exhaustion before blockchain writes", async () => {
    const submit = vi.spyOn(dependencies.fabric, "submit");
    const missing = await api
      .post("/api/v1/queries")
      .set("authorization", `Bearer ${policeToken}`)
      .send({ ...queryBody, caseId: "MISSING-CASE" });
    expect(missing.status).toBe(404);
    const login = await api
      .post("/api/v1/auth/login")
      .send({ username: "budget.exhausted", password: "BudgetDemo!2026" });
    const exhausted = await api
      .post("/api/v1/queries")
      .set("authorization", `Bearer ${login.body.token}`)
      .send(queryBody);
    expect(exhausted.status).toBe(429);
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects a full-only provider in lite mode before blockchain writes", async () => {
    const submit = vi.spyOn(dependencies.fabric, "submit");
    const response = await api
      .post("/api/v1/queries")
      .set("authorization", `Bearer ${policeToken}`)
      .send({ ...queryBody, targetOrganizations: ["BGBMSP"] });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("PROVIDER_UNAVAILABLE_IN_MODE");
    expect(submit).not.toHaveBeenCalled();
  });

  it("returns 201 for a committed query with all attestations", async () => {
    vi.spyOn(dependencies.fabric, "submit").mockResolvedValue(
      committedQuery as never,
    );
    vi.spyOn(dependencies, "callAdapter").mockResolvedValue({
      attestation,
    } as never);
    const response = await api
      .post("/api/v1/queries")
      .set("authorization", `Bearer ${policeToken}`)
      .send(queryBody);
    expect(response.status).toBe(201);
    expect(response.body.partial).toBe(false);
    expect(response.body.providerResults[0].status).toBe("ATTESTED");
  });

  it("returns 503 and no committed object when QueryRequest commit fails", async () => {
    vi.spyOn(dependencies.fabric, "submit").mockRejectedValue(
      new Error("BLOCKCHAIN_UNAVAILABLE_OR_REJECTED"),
    );
    const adapter = vi.spyOn(dependencies, "callAdapter");
    const response = await api
      .post("/api/v1/queries")
      .set("authorization", `Bearer ${policeToken}`)
      .send(queryBody);
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("BLOCKCHAIN_UNAVAILABLE");
    expect(response.body).not.toHaveProperty("query");
    expect(adapter).not.toHaveBeenCalled();
  });

  it("returns 207 with the committed query when provider attestation fails", async () => {
    vi.spyOn(dependencies.fabric, "submit").mockResolvedValue(
      committedQuery as never,
    );
    vi.spyOn(dependencies, "callAdapter").mockRejectedValue(
      new Error("provider unavailable"),
    );
    const response = await api
      .post("/api/v1/queries")
      .set("authorization", `Bearer ${policeToken}`)
      .send(queryBody);
    expect(response.status).toBe(207);
    expect(response.body.query.txId).toBe(committedQuery.txId);
    expect(response.body.partial).toBe(true);
    expect(response.body.providerResults[0]).toMatchObject({
      providerOrg: "RABMSP",
      status: "FAILED",
      error: { code: "PROVIDER_ATTESTATION_FAILED" },
    });
    expect(JSON.stringify(response.body)).not.toContain("provider unavailable");
  });

  it("reports Fabric health honestly without a fake ledger", async () => {
    vi.spyOn(dependencies.fabric, "health").mockResolvedValue({
      available: false,
      message: "Fabric unavailable",
    });
    const response = await api.get("/api/v1/health");
    expect(response.status).toBe(503);
    expect(response.body.blockchain.available).toBe(false);
  });
});
