import { beforeAll, describe, expect, it } from "vitest";
import supertest from "supertest";
import { app } from "./server.js";

const api = supertest(app);
let policeToken = "";

describe("gateway API controls", () => {
  beforeAll(async () => {
    const response = await api
      .post("/api/v1/auth/login")
      .send({ username: "police.investigator", password: "PoliceDemo!2026" });
    policeToken = response.body.token;
  });

  it("authenticates a seeded active demo user without exposing password data", async () => {
    const response = await api
      .get("/api/v1/auth/me")
      .set("authorization", `Bearer ${policeToken}`);
    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe("police.investigator");
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  it("rejects a revoked user", async () => {
    const response = await api
      .post("/api/v1/auth/login")
      .send({ username: "revoked.user", password: "RevokedDemo!2026" });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("USER_REVOKED");
  });

  it("rejects a missing case before attempting a blockchain write", async () => {
    const response = await api
      .post("/api/v1/queries")
      .set("authorization", `Bearer ${policeToken}`)
      .send({
        caseId: "MISSING-CASE",
        purposeCode: "ACTIVE_INVESTIGATION",
        syntheticIdentifier: "TEST-NID-0001",
        targetOrganizations: ["RABMSP"],
      });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("CASE_NOT_FOUND");
  });

  it("rejects budget exhaustion before a blockchain write", async () => {
    const login = await api
      .post("/api/v1/auth/login")
      .send({ username: "budget.exhausted", password: "BudgetDemo!2026" });
    const response = await api
      .post("/api/v1/queries")
      .set("authorization", `Bearer ${login.body.token}`)
      .send({
        caseId: "P-2026-014",
        purposeCode: "ACTIVE_INVESTIGATION",
        syntheticIdentifier: "TEST-NID-0001",
        targetOrganizations: ["RABMSP"],
      });
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("QUERY_BUDGET_EXCEEDED");
  });

  it("reports unavailable Fabric honestly instead of returning fake health", async () => {
    const response = await api.get("/api/v1/health");
    expect(response.status).toBe(503);
    expect(response.body.blockchain.available).toBe(false);
  });
});
