import { z } from "zod";

const organizations = ["PoliceMSP", "RABMSP", "BGBMSP", "CustomsMSP"] as const;
const purposes = [
  "ACTIVE_INVESTIGATION",
  "BORDER_SCREENING",
  "CUSTOMS_INQUIRY",
] as const;
const scopes = [
  "IDENTITY_CONFIRMATION",
  "CASE_REFERENCE",
  "CONTACT_CHANNEL",
  "ELIGIBILITY_CATEGORY",
] as const;
type Organization = (typeof organizations)[number];
type Scope = (typeof scopes)[number];
const id = z
  .string()
  .trim()
  .min(8)
  .max(96)
  .regex(/^[A-Za-z0-9_-]+$/);
const organization = z.enum(organizations);
const purpose = z.enum(purposes);
const scope = z.enum(scopes);
const hash = z.string().regex(/^[a-f0-9]{64}$/);

export const queryInputSchema = z
  .object({
    queryId: id,
    requesterOrg: organization,
    opaqueCaseRef: z.string().min(16).max(128),
    purposeCode: purpose,
    targetOrganizations: z.array(organization).min(1).max(4),
    policyVersion: z.string().min(1).max(24),
    createdByRole: z.enum(["INVESTIGATOR", "PROVIDER_OFFICER"]),
  })
  .strict()
  .refine(
    (v) => new Set(v.targetOrganizations).size === v.targetOrganizations.length,
  );
export const matchInputSchema = z
  .object({
    attestationId: id,
    queryId: id,
    providerOrg: organization,
    result: z.enum(["MATCH", "NO_MATCH"]),
    eligibilityCode: z.string().max(48).optional(),
    policyVersion: z.string().min(1).max(24),
  })
  .strict();
export const accessInputSchema = z
  .object({
    requestId: id,
    queryId: id,
    requesterOrg: organization,
    providerOrg: organization,
    requestedScopes: z.array(scope).min(1).max(4),
    purposeCode: purpose,
    justificationHash: hash,
  })
  .strict()
  .refine((v) => new Set(v.requestedScopes).size === v.requestedScopes.length)
  .refine((v) => v.requesterOrg !== v.providerOrg);
export const decisionInputSchema = z
  .object({
    decisionId: id,
    requestId: id,
    providerOrg: organization,
    decision: z.enum(["APPROVE", "PARTIAL", "DENY"]),
    approvedScopes: z.array(scope).max(4),
    reasonCode: z.string().min(2).max(48),
    expiresAt: z.string().datetime(),
    policyVersion: z.string().min(1).max(24),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (new Set(v.approvedScopes).size !== v.approvedScopes.length)
      ctx.addIssue({
        code: "custom",
        message: "Approved scopes must be unique",
      });
    if (v.decision === "DENY" && v.approvedScopes.length)
      ctx.addIssue({ code: "custom", message: "DENY cannot include scopes" });
    if (v.decision !== "DENY" && !v.approvedScopes.length)
      ctx.addIssue({ code: "custom", message: "Approval requires scopes" });
  });
export const receiptInputSchema = z
  .object({
    receiptId: id,
    requestId: id,
    providerOrg: organization,
    requesterOrg: organization,
    payloadHash: hash,
    providerSignature: z.string().min(40).max(512),
    signatureAlgorithm: z.literal("Ed25519"),
  })
  .strict();

interface Base {
  schemaVersion: "1.0";
  recordType: string;
  txId: string;
  ledgerTimestamp: string;
}
export interface QueryRequest extends Base {
  recordType: "QueryRequest";
  queryId: string;
  requesterOrg: Organization;
  opaqueCaseRef: string;
  purposeCode: (typeof purposes)[number];
  targetOrganizations: Organization[];
  policyVersion: string;
  status: "CREATED";
  createdByRole: "INVESTIGATOR" | "PROVIDER_OFFICER";
}
export interface MatchAttestation extends Base {
  recordType: "MatchAttestation";
  attestationId: string;
  queryId: string;
  providerOrg: Organization;
  result: "MATCH" | "NO_MATCH";
  eligibilityCode?: string;
  policyVersion: string;
}
export interface AccessRequest extends Base {
  recordType: "AccessRequest";
  requestId: string;
  queryId: string;
  requesterOrg: Organization;
  providerOrg: Organization;
  requestedScopes: Scope[];
  purposeCode: (typeof purposes)[number];
  justificationHash: string;
  status: "PENDING";
}
export interface AuthorizationDecision extends Base {
  recordType: "AuthorizationDecision";
  decisionId: string;
  requestId: string;
  providerOrg: Organization;
  decision: "APPROVE" | "PARTIAL" | "DENY";
  approvedScopes: Scope[];
  reasonCode: string;
  expiresAt: string;
  policyVersion: string;
}
export interface DisclosureReceipt extends Base {
  recordType: "DisclosureReceipt";
  receiptId: string;
  requestId: string;
  providerOrg: Organization;
  requesterOrg: Organization;
  payloadHash: string;
  providerSignature: string;
  signatureAlgorithm: "Ed25519";
}
export type LedgerRecord =
  | QueryRequest
  | MatchAttestation
  | AccessRequest
  | AuthorizationDecision
  | DisclosureReceipt;
