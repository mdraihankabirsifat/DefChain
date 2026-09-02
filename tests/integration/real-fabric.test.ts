import { describe, expect, it } from "vitest";
import { FabricClient } from "@defchain/fabric-client";
import { safeRandomId } from "@defchain/shared";

const enabled = process.env.RUN_REAL_FABRIC_TESTS === "true";
describe.skipIf(!enabled)("real Fabric integration", () => {
  const fabric = new FabricClient(process.cwd());

  it("commits and queries the complete five-record lite workflow", async () => {
    const queryId = safeRandomId("query");
    const requestId = safeRandomId("request");
    const query = await fabric.submit<{ txId: string }>("PoliceMSP", "CreateQueryRequest", JSON.stringify({
      queryId, requesterOrg: "PoliceMSP", opaqueCaseRef: "integration_opaque_case_ref",
      purposeCode: "ACTIVE_INVESTIGATION", targetOrganizations: ["RABMSP"], policyVersion: "demo-1", createdByRole: "INVESTIGATOR",
    }));
    const match = await fabric.submit<{ txId: string }>("RABMSP", "CreateMatchAttestation", JSON.stringify({
      attestationId: safeRandomId("attest"), queryId, providerOrg: "RABMSP", result: "MATCH", policyVersion: "demo-1",
    }));
    const access = await fabric.submit<{ txId: string }>("PoliceMSP", "CreateAccessRequest", JSON.stringify({
      requestId, queryId, requesterOrg: "PoliceMSP", providerOrg: "RABMSP",
      requestedScopes: ["IDENTITY_CONFIRMATION", "CASE_REFERENCE"], purposeCode: "ACTIVE_INVESTIGATION", justificationHash: "a".repeat(64),
    }));
    const decision = await fabric.submit<{ txId: string }>("RABMSP", "RecordAuthorizationDecision", JSON.stringify({
      decisionId: safeRandomId("decision"), requestId, providerOrg: "RABMSP", decision: "PARTIAL",
      approvedScopes: ["IDENTITY_CONFIRMATION"], reasonCode: "INTEGRATION_POLICY", expiresAt: new Date(Date.now() + 600_000).toISOString(), policyVersion: "demo-1",
    }));
    const receipt = await fabric.submit<{ txId: string }>("RABMSP", "RecordDisclosureReceipt", JSON.stringify({
      receiptId: safeRandomId("receipt"), requestId, providerOrg: "RABMSP", requesterOrg: "PoliceMSP",
      payloadHash: "b".repeat(64), providerSignature: "c".repeat(64), signatureAlgorithm: "Ed25519",
    }));
    const records = await fabric.evaluate<Array<{ recordType: string; txId: string }>>("PoliceMSP", "GetWorkflow", queryId);
    expect(records.map((record) => record.recordType)).toEqual([
      "QueryRequest", "MatchAttestation", "AccessRequest", "AuthorizationDecision", "DisclosureReceipt",
    ]);
    const txIds = [query.txId, match.txId, access.txId, decision.txId, receipt.txId];
    expect(txIds.every((txId) => /^[a-f0-9]{64}$/.test(txId))).toBe(true);
    expect(records.map((record) => record.txId)).toEqual(txIds);
  }, 120_000);

  it("enforces MSP authority and immutable duplicate keys on the real network", async () => {
    const queryId = safeRandomId("query");
    const input = { queryId, requesterOrg: "PoliceMSP", opaqueCaseRef: "integration_negative_case_ref", purposeCode: "ACTIVE_INVESTIGATION", targetOrganizations: ["RABMSP"], policyVersion: "demo-1", createdByRole: "INVESTIGATOR" };
    await fabric.submit("PoliceMSP", "CreateQueryRequest", JSON.stringify(input));
    await expect(fabric.submit("PoliceMSP", "CreateQueryRequest", JSON.stringify(input))).rejects.toThrow("BLOCKCHAIN_UNAVAILABLE_OR_REJECTED");
    await expect(fabric.submit("PoliceMSP", "CreateMatchAttestation", JSON.stringify({ attestationId: safeRandomId("attest"), queryId, providerOrg: "RABMSP", result: "MATCH", policyVersion: "demo-1" }))).rejects.toThrow("BLOCKCHAIN_UNAVAILABLE_OR_REJECTED");
    await expect(fabric.evaluate("PoliceMSP", "GetRecord", `MATCH::${queryId}::RABMSP`)).rejects.toThrow();
  }, 120_000);
});
