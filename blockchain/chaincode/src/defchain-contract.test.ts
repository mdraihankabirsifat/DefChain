import { beforeEach, describe, expect, it } from "vitest";
import { DefChainContract } from "./defchain-contract";

const query = {
  queryId: "query_12345678",
  requesterOrg: "PoliceMSP",
  opaqueCaseRef: "opaque_case_reference",
  purposeCode: "ACTIVE_INVESTIGATION",
  targetOrganizations: ["RABMSP"],
  policyVersion: "demo-1",
  createdByRole: "INVESTIGATOR",
};
const match = {
  attestationId: "attest_12345678",
  queryId: query.queryId,
  providerOrg: "RABMSP",
  result: "MATCH",
  policyVersion: "demo-1",
};
const access = {
  requestId: "request_12345678",
  queryId: query.queryId,
  requesterOrg: "PoliceMSP",
  providerOrg: "RABMSP",
  requestedScopes: ["IDENTITY_CONFIRMATION", "CASE_REFERENCE"],
  purposeCode: "ACTIVE_INVESTIGATION",
  justificationHash: "b".repeat(64),
};

function harness(initialMsp = "PoliceMSP") {
  const state = new Map<string, Buffer>();
  const msp = { value: initialMsp };
  let tx = 0;
  let seconds = 1_700_000_000;
  const iterator = (rows: Array<[string, Buffer]>) => {
    let index = 0;
    return {
      next: async () =>
        index < rows.length
          ? {
              done: false,
              value: { key: rows[index]![0], value: rows[index++]![1] },
            }
          : { done: true },
    };
  };
  const ctx = {
    clientIdentity: { getMSPID: () => msp.value },
    stub: {
      getTxID: () => (++tx).toString(16).padStart(64, "0"),
      getTxTimestamp: () => ({
        seconds: { toNumber: () => seconds },
        nanos: 0,
      }),
      getState: async (key: string) => state.get(key) ?? Buffer.alloc(0),
      putState: async (key: string, value: Buffer) => {
        state.set(key, value);
        seconds += 1;
      },
      setEvent: () => undefined,
      getStateByRange: async (start: string, end: string) =>
        iterator(
          [...state.entries()]
            .filter(([key]) => (!start || key >= start) && (!end || key < end))
            .sort(([a], [b]) => a.localeCompare(b)),
        ),
      getHistoryForKey: async (key: string) =>
        iterator(state.has(key) ? [[key, state.get(key)!]] : []),
    },
  };
  return {
    ctx: ctx as never,
    as: (value: string) => (msp.value = value),
    at: (value: number) => (seconds = value),
  };
}

async function createThroughAccess(
  contract: DefChainContract,
  h: ReturnType<typeof harness>,
) {
  await contract.CreateQueryRequest(h.ctx, JSON.stringify(query));
  h.as("RABMSP");
  await contract.CreateMatchAttestation(h.ctx, JSON.stringify(match));
  h.as("PoliceMSP");
  await contract.CreateAccessRequest(h.ctx, JSON.stringify(access));
}

describe("DefChainContract lifecycle and invariants", () => {
  let contract: DefChainContract;
  beforeEach(() => (contract = new DefChainContract()));

  it("runs the full five-record lifecycle and queries it back", async () => {
    const h = harness();
    await createThroughAccess(contract, h);
    h.as("RABMSP");
    await contract.RecordAuthorizationDecision(
      h.ctx,
      JSON.stringify({
        decisionId: "decision_12345678",
        requestId: access.requestId,
        providerOrg: "RABMSP",
        decision: "APPROVE",
        approvedScopes: [...access.requestedScopes].reverse(),
        reasonCode: "POLICY_CHECK_PASSED",
        expiresAt: "2023-11-14T22:30:00.000Z",
        policyVersion: "demo-1",
      }),
    );
    await contract.RecordDisclosureReceipt(
      h.ctx,
      JSON.stringify({
        receiptId: "receipt_12345678",
        requestId: access.requestId,
        providerOrg: "RABMSP",
        requesterOrg: "PoliceMSP",
        payloadHash: "c".repeat(64),
        providerSignature: "s".repeat(64),
        signatureAlgorithm: "Ed25519",
      }),
    );
    const records = JSON.parse(
      await contract.GetWorkflow(h.ctx, query.queryId),
    );
    expect(
      records.map((record: { recordType: string }) => record.recordType),
    ).toEqual([
      "QueryRequest",
      "MatchAttestation",
      "AccessRequest",
      "AuthorizationDecision",
      "DisclosureReceipt",
    ]);
    expect(
      new Set(records.map((record: { txId: string }) => record.txId)).size,
    ).toBe(5);
  });

  it("rejects wrong-MSP actions", async () => {
    const h = harness("RABMSP");
    await expect(
      contract.CreateQueryRequest(h.ctx, JSON.stringify(query)),
    ).rejects.toThrow("ERR_WRONG_MSP");
    h.as("PoliceMSP");
    await expect(
      contract.CreateMatchAttestation(h.ctx, JSON.stringify(match)),
    ).rejects.toThrow("ERR_WRONG_MSP");
  });

  it("rejects duplicate immutable keys", async () => {
    const h = harness();
    await contract.CreateQueryRequest(h.ctx, JSON.stringify(query));
    await expect(
      contract.CreateQueryRequest(h.ctx, JSON.stringify(query)),
    ).rejects.toThrow("ERR_DUPLICATE_ID");
  });

  it("rejects missing predecessors and non-targeted attestations", async () => {
    const h = harness("RABMSP");
    await expect(
      contract.CreateMatchAttestation(h.ctx, JSON.stringify(match)),
    ).rejects.toThrow("ERR_NOT_FOUND");
    h.as("PoliceMSP");
    await contract.CreateQueryRequest(
      h.ctx,
      JSON.stringify({ ...query, targetOrganizations: ["BGBMSP"] }),
    );
    h.as("RABMSP");
    await expect(
      contract.CreateMatchAttestation(h.ctx, JSON.stringify(match)),
    ).rejects.toThrow("Provider was not targeted");
  });

  it("requires MATCH before an access request", async () => {
    const h = harness();
    await contract.CreateQueryRequest(h.ctx, JSON.stringify(query));
    h.as("RABMSP");
    await contract.CreateMatchAttestation(
      h.ctx,
      JSON.stringify({ ...match, result: "NO_MATCH" }),
    );
    h.as("PoliceMSP");
    await expect(
      contract.CreateAccessRequest(h.ctx, JSON.stringify(access)),
    ).rejects.toThrow("Access requires MATCH");
  });

  it("rejects unrequested and duplicate approved scopes", async () => {
    const h = harness();
    await createThroughAccess(contract, h);
    h.as("RABMSP");
    const base = {
      decisionId: "decision_12345678",
      requestId: access.requestId,
      providerOrg: "RABMSP",
      decision: "PARTIAL",
      reasonCode: "NARROWED",
      expiresAt: "2023-11-14T22:30:00.000Z",
      policyVersion: "demo-1",
    };
    await expect(
      contract.RecordAuthorizationDecision(
        h.ctx,
        JSON.stringify({ ...base, approvedScopes: ["CONTACT_CHANNEL"] }),
      ),
    ).rejects.toThrow("ERR_SCOPE_ESCALATION");
    await expect(
      contract.RecordAuthorizationDecision(
        h.ctx,
        JSON.stringify({
          ...base,
          approvedScopes: ["IDENTITY_CONFIRMATION", "IDENTITY_CONFIRMATION"],
        }),
      ),
    ).rejects.toThrow();
  });

  it("enforces APPROVE exact-set, PARTIAL proper-subset, and DENY empty", async () => {
    for (const [decision, scopes] of [
      ["APPROVE", ["IDENTITY_CONFIRMATION"]],
      ["PARTIAL", [...access.requestedScopes]],
      ["PARTIAL", []],
      ["DENY", ["IDENTITY_CONFIRMATION"]],
    ] as const) {
      const h = harness();
      await createThroughAccess(contract, h);
      h.as("RABMSP");
      await expect(
        contract.RecordAuthorizationDecision(
          h.ctx,
          JSON.stringify({
            decisionId: "decision_12345678",
            requestId: access.requestId,
            providerOrg: "RABMSP",
            decision,
            approvedScopes: scopes,
            reasonCode: "POLICY_RESULT",
            expiresAt: "2023-11-14T22:30:00.000Z",
            policyVersion: "demo-1",
          }),
        ),
      ).rejects.toThrow();
    }
  });

  it("rejects expired approval and receipt without a decision", async () => {
    const h = harness();
    await createThroughAccess(contract, h);
    h.as("RABMSP");
    await expect(
      contract.RecordAuthorizationDecision(
        h.ctx,
        JSON.stringify({
          decisionId: "decision_12345678",
          requestId: access.requestId,
          providerOrg: "RABMSP",
          decision: "APPROVE",
          approvedScopes: access.requestedScopes,
          reasonCode: "POLICY_RESULT",
          expiresAt: "2020-01-01T00:00:00.000Z",
          policyVersion: "demo-1",
        }),
      ),
    ).rejects.toThrow("ERR_INVALID_EXPIRY");
    await expect(
      contract.RecordDisclosureReceipt(
        h.ctx,
        JSON.stringify({
          receiptId: "receipt_12345678",
          requestId: access.requestId,
          providerOrg: "RABMSP",
          requesterOrg: "PoliceMSP",
          payloadHash: "c".repeat(64),
          providerSignature: "s".repeat(64),
          signatureAlgorithm: "Ed25519",
        }),
      ),
    ).rejects.toThrow("ERR_NOT_FOUND");
  });

  it("rejects malformed, unexpected, and duplicate target fields", async () => {
    const h = harness();
    await expect(
      contract.CreateQueryRequest(h.ctx, "not-json"),
    ).rejects.toThrow("ERR_INVALID_JSON");
    await expect(
      contract.CreateQueryRequest(
        h.ctx,
        JSON.stringify({ ...query, syntheticIdentifier: "TEST-NID-0001" }),
      ),
    ).rejects.toThrow();
    await expect(
      contract.CreateQueryRequest(
        h.ctx,
        JSON.stringify({ ...query, targetOrganizations: ["RABMSP", "RABMSP"] }),
      ),
    ).rejects.toThrow();
  });
});
