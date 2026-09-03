import { describe, expect, it } from "vitest";
import {
  PARTIAL_SCOPE_COMPLETE_MESSAGE,
  PARTIAL_SCOPE_EMPTY_MESSAGE,
  partialScopeValidationMessage,
} from "./decision-scopes";

describe("provider partial-scope selection", () => {
  const requested = ["IDENTITY_CONFIRMATION", "CASE_REFERENCE"];

  it("accepts only a non-empty proper subset", () => {
    expect(
      partialScopeValidationMessage(requested, ["IDENTITY_CONFIRMATION"]),
    ).toBe("");
    expect(partialScopeValidationMessage(requested, [])).toBe(
      PARTIAL_SCOPE_EMPTY_MESSAGE,
    );
    expect(partialScopeValidationMessage(requested, requested)).toBe(
      PARTIAL_SCOPE_COMPLETE_MESSAGE,
    );
  });

  it("rejects a scope that was not requested", () => {
    expect(
      partialScopeValidationMessage(requested, ["CONTACT_CHANNEL"]),
    ).toMatch(/only scopes included/);
  });
});
