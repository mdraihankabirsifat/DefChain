import { describe, expect, it } from "vitest";
import {
  FABRIC_TRANSACTION_ID_QUERY_MESSAGE,
  INVALID_QUERY_ID_MESSAGE,
  queryIdValidationMessage,
} from "./query-id";

describe("application Query ID validation", () => {
  it("accepts the application query identifier", () => {
    expect(queryIdValidationMessage(`query_${"a".repeat(32)}`)).toBe("");
  });

  it("rejects a Fabric transaction ID with a clear message", () => {
    expect(queryIdValidationMessage("b".repeat(64))).toBe(
      FABRIC_TRANSACTION_ID_QUERY_MESSAGE,
    );
  });

  it("rejects other identifiers that do not begin with query_", () => {
    expect(queryIdValidationMessage("request_1234567890abcdef")).toBe(
      INVALID_QUERY_ID_MESSAGE,
    );
  });
});
