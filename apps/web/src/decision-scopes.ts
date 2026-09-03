export const PARTIAL_SCOPE_EMPTY_MESSAGE =
  "Select at least one requested scope for a partial approval.";
export const PARTIAL_SCOPE_COMPLETE_MESSAGE =
  "Leave at least one requested scope unselected, or use Approve.";

export function partialScopeValidationMessage(
  requestedScopes: string[],
  selectedScopes: string[],
): string {
  const requested = new Set(requestedScopes);
  const selected = new Set(selectedScopes);
  if ([...selected].some((scope) => !requested.has(scope)))
    return "Select only scopes included in this access request.";
  if (selected.size === 0) return PARTIAL_SCOPE_EMPTY_MESSAGE;
  if (selected.size >= requested.size) return PARTIAL_SCOPE_COMPLETE_MESSAGE;
  return "";
}
