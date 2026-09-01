import { config as loadEnv } from "dotenv";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FabricClient } from "@defchain/fabric-client";
import {
  decisionInputSchema,
  encryptPayload,
  matchInputSchema,
  receiptInputSchema,
  safeRandomId,
  sha256,
  signReceipt,
  type AccessRequest,
  type AuthorizationDecision,
  type DisclosureScope,
  type Organization,
} from "@defchain/shared";
import { openAgencyDatabase, type ProtectedRecord } from "./database.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
loadEnv({ path: path.join(root, ".env"), quiet: true });
const org = (process.env.ORG_ID ?? "RABMSP") as Organization;
const port = Number(process.env.ADAPTER_PORT ?? 4102);
const internalKey =
  process.env.INTERNAL_ADAPTER_KEY ??
  "defchain-controlled-demo-internal-key-change-me";
const disclosureKey =
  process.env.DISCLOSURE_KEY ??
  "defchain-controlled-demo-disclosure-key-change-me";
const fabric = new FabricClient(root);
const db = openAgencyDatabase(org, root);
const seenNonces = new Map<string, number>();

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const timestamp = String(req.headers["x-defchain-timestamp"] ?? "");
  const nonce = String(req.headers["x-defchain-nonce"] ?? "");
  const signature = String(req.headers["x-defchain-signature"] ?? "");
  const now = Date.now();
  for (const [value, expiry] of seenNonces)
    if (expiry < now) seenNonces.delete(value);
  if (
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 30_000 ||
    !nonce ||
    seenNonces.has(nonce)
  ) {
    res.status(401).json({ error: { code: "INVALID_INTERNAL_AUTH" } });
    return;
  }
  const body = JSON.stringify(req.body ?? {});
  const expected = createHmac("sha256", internalKey)
    .update(`${timestamp}.${nonce}.${body}`)
    .digest("hex");
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    res.status(401).json({ error: { code: "INVALID_INTERNAL_AUTH" } });
    return;
  }
  seenNonces.set(nonce, now + 60_000);
  next();
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.get("/internal/health", async (_req, res) =>
  res.json({ organization: org, fabric: await fabric.health(org) }),
);
app.use("/internal", authenticate);

app.post("/internal/match", async (req, res, next) => {
  try {
    const queryId = String(req.body.queryId ?? "");
    const token = String(req.body.protectedToken ?? "");
    if (!/^query_[a-f0-9]{32}$/.test(queryId) || !/^[a-f0-9]{64}$/.test(token))
      throw new Error("INVALID_MATCH_REQUEST");
    const record = db
      .prepare(
        "SELECT protected_token, eligibility_code, fields_json FROM protected_records WHERE protected_token = ?",
      )
      .get(token) as unknown as ProtectedRecord | undefined;
    db.prepare(
      "INSERT OR IGNORE INTO query_matches (query_id, protected_token, matched, created_at) VALUES (?, ?, ?, ?)",
    ).run(queryId, token, record ? 1 : 0, new Date().toISOString());
    const input = matchInputSchema.parse({
      attestationId: safeRandomId("attest"),
      queryId,
      providerOrg: org,
      result: record ? "MATCH" : "NO_MATCH",
      ...(record ? { eligibilityCode: record.eligibility_code } : {}),
      policyVersion: "demo-1",
    });
    const attestation = await fabric.submit(
      org,
      "CreateMatchAttestation",
      JSON.stringify(input),
    );
    res.json({ attestation });
  } catch (error) {
    next(error);
  }
});

app.post("/internal/decisions", async (req, res, next) => {
  try {
    const input = decisionInputSchema.parse({
      ...req.body,
      decisionId: req.body.decisionId ?? safeRandomId("decision"),
      providerOrg: org,
      expiresAt:
        req.body.expiresAt ?? new Date(Date.now() + 15 * 60_000).toISOString(),
      policyVersion: "demo-1",
    });
    const decision = await fabric.submit(
      org,
      "RecordAuthorizationDecision",
      JSON.stringify(input),
    );
    res.json({ decision });
  } catch (error) {
    next(error);
  }
});

app.post("/internal/disclosures", async (req, res, next) => {
  try {
    const requestId = String(req.body.requestId ?? "");
    const access = await fabric.evaluate<AccessRequest>(
      org,
      "GetRecord",
      `ACCESS::${requestId}`,
    );
    const decision = await fabric.evaluate<AuthorizationDecision>(
      org,
      "GetRecord",
      `DECISION::${requestId}`,
    );
    if (
      access.providerOrg !== org ||
      decision.providerOrg !== org ||
      decision.decision === "DENY" ||
      new Date(decision.expiresAt).getTime() <= Date.now()
    )
      throw new Error("NO_VALID_APPROVAL");
    const mapping = db
      .prepare(
        "SELECT protected_token FROM query_matches WHERE query_id = ? AND matched = 1",
      )
      .get(access.queryId) as { protected_token: string } | undefined;
    if (!mapping) throw new Error("NO_LOCAL_MATCH_CONTEXT");
    const stored = db
      .prepare(
        "SELECT protected_token, eligibility_code, fields_json FROM protected_records WHERE protected_token = ?",
      )
      .get(mapping.protected_token) as unknown as ProtectedRecord;
    const fields = JSON.parse(stored.fields_json) as Record<string, string>;
    const fieldByScope: Record<DisclosureScope, string> = {
      IDENTITY_CONFIRMATION: "identityConfirmation",
      CASE_REFERENCE: "caseReference",
      CONTACT_CHANNEL: "contactChannel",
      ELIGIBILITY_CATEGORY: "eligibilityCategory",
    };
    const payload = Object.fromEntries(
      decision.approvedScopes
        .map((scope) => [fieldByScope[scope], fields[fieldByScope[scope]]])
        .filter((entry) => entry[1] !== undefined),
    );
    const plaintext = JSON.stringify(payload);
    const payloadHash = sha256(plaintext);
    const privateKey = await fs.readFile(
      path.join(
        root,
        "config",
        "runtime",
        `${org.replace("MSP", "").toLowerCase()}-ed25519-private.pem`,
      ),
      "utf8",
    );
    const signature = signReceipt(payloadHash, privateKey);
    const receiptInput = receiptInputSchema.parse({
      receiptId: safeRandomId("receipt"),
      requestId,
      providerOrg: org,
      requesterOrg: access.requesterOrg,
      payloadHash,
      providerSignature: signature,
      signatureAlgorithm: "Ed25519",
    });
    const receipt = await fabric.submit(
      org,
      "RecordDisclosureReceipt",
      JSON.stringify(receiptInput),
    );
    res.json({
      encrypted: encryptPayload(payload, disclosureKey),
      payloadHash,
      signature,
      receipt,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Adapter error";
  res.status(message.includes("BLOCKCHAIN") ? 503 : 400).json({
    error: {
      code: message.split(":")[0],
      message: "Provider operation failed safely",
    },
  });
});

app.listen(port, process.env.BIND_HOST ?? "127.0.0.1", () =>
  console.log(
    `DefChain ${org} adapter listening on ${port}; sensitive request fields are not logged`,
  ),
);
