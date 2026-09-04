import { describe, expect, it } from "vitest";
import {
  formatLedgerTimestamp,
  sortByLedgerTimestampNewest,
} from "./query-history";

describe("Fabric query history presentation", () => {
  it("sorts a copy of the query list by ledger timestamp newest first", () => {
    const queries = [
      { queryId: "query_old", ledgerTimestamp: "2026-09-04T12:00:00.000Z" },
      { queryId: "query_new", ledgerTimestamp: "2026-09-04T14:00:00.000Z" },
    ];

    expect(
      sortByLedgerTimestampNewest(queries).map((item) => item.queryId),
    ).toEqual(["query_new", "query_old"]);
    expect(queries[0]?.queryId).toBe("query_old");
  });

  it("formats the original Fabric timestamp in local time", () => {
    const localTime = new Date(2026, 8, 4, 21, 42).toISOString();
    expect(formatLedgerTimestamp(localTime)).toBe("04 Sep 2026, 9:42 PM");
  });
});
