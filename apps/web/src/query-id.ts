const FABRIC_TRANSACTION_ID = /^[a-f0-9]{64}$/i;
const APPLICATION_QUERY_ID = /^query_[a-f0-9]{32}$/;

export const FABRIC_TRANSACTION_ID_QUERY_MESSAGE =
  "Use the application Query ID beginning with query_, not the 64-character Fabric transaction ID.";
export const INVALID_QUERY_ID_MESSAGE =
  "Query ID must begin with query_ and contain the application query identifier.";

export function queryIdValidationMessage(value: string): string {
  const queryId = value.trim();
  if (FABRIC_TRANSACTION_ID.test(queryId))
    return FABRIC_TRANSACTION_ID_QUERY_MESSAGE;
  if (!APPLICATION_QUERY_ID.test(queryId)) return INVALID_QUERY_ID_MESSAGE;
  return "";
}
