export const ORGANIZATIONS = [
  "PoliceMSP",
  "RABMSP",
  "BGBMSP",
  "CustomsMSP",
] as const;
export type Organization = (typeof ORGANIZATIONS)[number];

export const LEDGER_RECORD_TYPES = [
  "QueryRequest",
  "MatchAttestation",
  "AccessRequest",
  "AuthorizationDecision",
  "DisclosureReceipt",
] as const;
export type LedgerRecordType = (typeof LEDGER_RECORD_TYPES)[number];

export const PURPOSE_CODES = [
  "ACTIVE_INVESTIGATION",
  "BORDER_SCREENING",
  "CUSTOMS_INQUIRY",
] as const;
export const DISCLOSURE_SCOPES = [
  "IDENTITY_CONFIRMATION",
  "CASE_REFERENCE",
  "CONTACT_CHANNEL",
  "ELIGIBILITY_CATEGORY",
] as const;
export type DisclosureScope = (typeof DISCLOSURE_SCOPES)[number];

export type UserRole = "INVESTIGATOR" | "PROVIDER_OFFICER" | "AUDITOR";

export interface LedgerBase {
  schemaVersion: "1.0";
  recordType: LedgerRecordType;
  txId: string;
  ledgerTimestamp: string;
}

export interface QueryRequest extends LedgerBase {
  recordType: "QueryRequest";
  queryId: string;
  requesterOrg: Organization;
  opaqueCaseRef: string;
  purposeCode: (typeof PURPOSE_CODES)[number];
  targetOrganizations: Organization[];
  policyVersion: string;
  status: "CREATED";
  createdByRole: "INVESTIGATOR";
}

export interface MatchAttestation extends LedgerBase {
  recordType: "MatchAttestation";
  attestationId: string;
  queryId: string;
  providerOrg: Organization;
  result: "MATCH" | "NO_MATCH";
  eligibilityCode?: string;
  policyVersion: string;
}

export interface AccessRequest extends LedgerBase {
  recordType: "AccessRequest";
  requestId: string;
  queryId: string;
  requesterOrg: Organization;
  providerOrg: Organization;
  requestedScopes: DisclosureScope[];
  purposeCode: (typeof PURPOSE_CODES)[number];
  justificationHash: string;
  status: "PENDING";
}

export interface AuthorizationDecision extends LedgerBase {
  recordType: "AuthorizationDecision";
  decisionId: string;
  requestId: string;
  providerOrg: Organization;
  decision: "APPROVE" | "PARTIAL" | "DENY";
  approvedScopes: DisclosureScope[];
  reasonCode: string;
  expiresAt: string;
  policyVersion: string;
}

export interface DisclosureReceipt extends LedgerBase {
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

export interface SecurityEvent {
  eventId: string;
  actorId?: string;
  actorOrg?: Organization;
  type:
    | "MISSING_CASE"
    | "INACTIVE_CASE"
    | "BUDGET_EXCEEDED"
    | "INVALID_SCOPE"
    | "REVOKED_USER"
    | "UNAUTHORIZED_ACTION";
  safeContext: Record<string, string | number | boolean>;
  createdAt: string;
}
