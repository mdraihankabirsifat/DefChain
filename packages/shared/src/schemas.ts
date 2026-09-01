import { z } from 'zod';
import { DISCLOSURE_SCOPES, ORGANIZATIONS, PURPOSE_CODES } from './types.js';

const id = z.string().trim().min(8).max(96).regex(/^[A-Za-z0-9_-]+$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const organizationSchema = z.enum(ORGANIZATIONS);
export const purposeCodeSchema = z.enum(PURPOSE_CODES);
export const scopeSchema = z.enum(DISCLOSURE_SCOPES);

export const loginSchema = z.object({username: z.string().min(3).max(64), password: z.string().min(8).max(128)}).strict();

export const queryInputSchema = z.object({
  queryId: id,
  requesterOrg: organizationSchema,
  opaqueCaseRef: z.string().min(16).max(128),
  purposeCode: purposeCodeSchema,
  targetOrganizations: z.array(organizationSchema).min(1).max(4),
  policyVersion: z.string().min(1).max(24),
  createdByRole: z.literal('INVESTIGATOR'),
}).strict();

export const matchInputSchema = z.object({
  attestationId: id,
  queryId: id,
  providerOrg: organizationSchema,
  result: z.enum(['MATCH', 'NO_MATCH']),
  eligibilityCode: z.string().max(48).optional(),
  policyVersion: z.string().min(1).max(24),
}).strict();

export const accessInputSchema = z.object({
  requestId: id,
  queryId: id,
  requesterOrg: organizationSchema,
  providerOrg: organizationSchema,
  requestedScopes: z.array(scopeSchema).min(1).max(4),
  purposeCode: purposeCodeSchema,
  justificationHash: hash,
}).strict().refine((value) => value.requesterOrg !== value.providerOrg, {message: 'Provider must differ from requester'});

export const decisionInputSchema = z.object({
  decisionId: id,
  requestId: id,
  providerOrg: organizationSchema,
  decision: z.enum(['APPROVE', 'PARTIAL', 'DENY']),
  approvedScopes: z.array(scopeSchema).max(4),
  reasonCode: z.string().min(2).max(48),
  expiresAt: z.string().datetime(),
  policyVersion: z.string().min(1).max(24),
}).strict().superRefine((value, ctx) => {
  if (value.decision === 'DENY' && value.approvedScopes.length) ctx.addIssue({code: 'custom', message: 'DENY cannot include scopes'});
  if (value.decision !== 'DENY' && !value.approvedScopes.length) ctx.addIssue({code: 'custom', message: 'Approval requires scopes'});
});

export const receiptInputSchema = z.object({
  receiptId: id,
  requestId: id,
  providerOrg: organizationSchema,
  requesterOrg: organizationSchema,
  payloadHash: hash,
  providerSignature: z.string().min(40).max(512),
  signatureAlgorithm: z.literal('Ed25519'),
}).strict();

export const apiQuerySchema = z.object({
  caseId: z.string().min(4).max(64),
  purposeCode: purposeCodeSchema,
  syntheticIdentifier: z.string().regex(/^TEST-NID-[0-9]{4}$/),
  targetOrganizations: z.array(organizationSchema).min(1).max(4),
}).strict();

export const apiAccessSchema = z.object({
  queryId: id,
  providerOrg: organizationSchema,
  requestedScopes: z.array(scopeSchema).min(1).max(4),
  justification: z.string().min(12).max(500),
}).strict();

export const apiDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'PARTIAL', 'DENY']),
  approvedScopes: z.array(scopeSchema).max(4),
  reasonCode: z.string().min(2).max(48),
}).strict();
