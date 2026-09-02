import { z } from "zod";
import { DISCLOSURE_SCOPES, ORGANIZATIONS, PURPOSE_CODES } from "./types.js";

const id = z
  .string()
  .trim()
  .min(8)
  .max(96)
  .regex(/^[A-Za-z0-9_-]+$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const organizationSchema = z.enum(ORGANIZATIONS);
export const purposeCodeSchema = z.enum(PURPOSE_CODES);
export const scopeSchema = z.enum(DISCLOSURE_SCOPES);

export const loginSchema = z
  .object({
    username: z.string().min(3).max(64),
    password: z.string().min(8).max(128),
  })
  .strict();

export const queryInputSchema = z
  .object({
    queryId: id,
    requesterOrg: organizationSchema,
    opaqueCaseRef: z.string().min(16).max(128),
    purposeCode: purposeCodeSchema,
    targetOrganizations: z.array(organizationSchema).min(1).max(4),
    policyVersion: z.string().min(1).max(24),
    createdByRole: z.literal("INVESTIGATOR"),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.targetOrganizations).size ===
      value.targetOrganizations.length,
    {
      message: "Target organizations must be unique",
    },
  );

export const matchInputSchema = z
  .object({
    attestationId: id,
    queryId: id,
    providerOrg: organizationSchema,
    result: z.enum(["MATCH", "NO_MATCH"]),
    eligibilityCode: z.string().max(48).optional(),
    policyVersion: z.string().min(1).max(24),
  })
  .strict();

export const accessInputSchema = z
  .object({
    requestId: id,
    queryId: id,
    requesterOrg: organizationSchema,
    providerOrg: organizationSchema,
    requestedScopes: z.array(scopeSchema).min(1).max(4),
    purposeCode: purposeCodeSchema,
    justificationHash: hash,
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.requestedScopes).size === value.requestedScopes.length,
    {
      message: "Requested scopes must be unique",
    },
  )
  .refine((value) => value.requesterOrg !== value.providerOrg, {
    message: "Provider must differ from requester",
  });

export const decisionInputSchema = z
  .object({
    decisionId: id,
    requestId: id,
    providerOrg: organizationSchema,
    decision: z.enum(["APPROVE", "PARTIAL", "DENY"]),
    approvedScopes: z.array(scopeSchema).max(4),
    reasonCode: z.string().min(2).max(48),
    expiresAt: z.string().datetime(),
    policyVersion: z.string().min(1).max(24),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.approvedScopes).size !== value.approvedScopes.length)
      ctx.addIssue({
        code: "custom",
        message: "Approved scopes must be unique",
      });
    if (value.decision === "DENY" && value.approvedScopes.length)
      ctx.addIssue({ code: "custom", message: "DENY cannot include scopes" });
    if (value.decision !== "DENY" && !value.approvedScopes.length)
      ctx.addIssue({ code: "custom", message: "Approval requires scopes" });
  });

export const receiptInputSchema = z
  .object({
    receiptId: id,
    requestId: id,
    providerOrg: organizationSchema,
    requesterOrg: organizationSchema,
    payloadHash: hash,
    providerSignature: z.string().min(40).max(512),
    signatureAlgorithm: z.literal("Ed25519"),
  })
  .strict();

export const apiQuerySchema = z
  .object({
    caseId: z.string().min(4).max(64),
    purposeCode: purposeCodeSchema,
    syntheticIdentifier: z.string().regex(/^TEST-NID-[0-9]{4}$/),
    targetOrganizations: z.array(organizationSchema).min(1).max(4),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.targetOrganizations).size ===
      value.targetOrganizations.length,
    {
      message: "Target organizations must be unique",
    },
  );

export const apiAccessSchema = z
  .object({
    queryId: id,
    providerOrg: organizationSchema,
    requestedScopes: z.array(scopeSchema).min(1).max(4),
    justification: z.string().min(12).max(500),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.requestedScopes).size === value.requestedScopes.length,
    {
      message: "Requested scopes must be unique",
    },
  );

export const apiDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "PARTIAL", "DENY"]),
    approvedScopes: z.array(scopeSchema).max(4),
    reasonCode: z.string().min(2).max(48),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.approvedScopes).size !== value.approvedScopes.length)
      ctx.addIssue({
        code: "custom",
        message: "Approved scopes must be unique",
      });
    if (value.decision === "DENY" && value.approvedScopes.length)
      ctx.addIssue({ code: "custom", message: "DENY cannot include scopes" });
    if (value.decision !== "DENY" && !value.approvedScopes.length)
      ctx.addIssue({ code: "custom", message: "Approval requires scopes" });
  });

export function validateDecisionScopes(
  decision: "APPROVE" | "PARTIAL" | "DENY",
  approvedScopes: readonly string[],
  requestedScopes: readonly string[],
): void {
  const approved = new Set(approvedScopes);
  const requested = new Set(requestedScopes);
  if (approved.size !== approvedScopes.length)
    throw new Error("DUPLICATE_APPROVED_SCOPE");
  if ([...approved].some((scopeValue) => !requested.has(scopeValue)))
    throw new Error("UNREQUESTED_APPROVED_SCOPE");
  if (decision === "DENY" && approved.size !== 0)
    throw new Error("DENY_MUST_APPROVE_NO_SCOPES");
  if (
    decision === "APPROVE" &&
    (approved.size !== requested.size ||
      [...requested].some((scopeValue) => !approved.has(scopeValue)))
  )
    throw new Error("APPROVE_MUST_GRANT_EXACT_REQUESTED_SCOPES");
  if (
    decision === "PARTIAL" &&
    (approved.size === 0 || approved.size >= requested.size)
  )
    throw new Error("PARTIAL_MUST_GRANT_NONEMPTY_PROPER_SUBSET");
}
