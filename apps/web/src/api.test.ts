import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "./api";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

describe("web API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    storage.clear();
  });
  it("adds the server-issued bearer token and surfaces safe API errors", async () => {
    storage.set("defchain_token", "demo-token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Blockchain unavailable" } }),
          { status: 503, headers: { "content-type": "application/json" } },
        ),
      );
    await expect(request("/queries", { method: "POST" })).rejects.toThrow(
      "Blockchain unavailable",
    );
    expect(
      (fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>)
        .authorization,
    ).toBe("Bearer demo-token");
  });
});
