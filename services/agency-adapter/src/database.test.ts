import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { openAgencyDatabase } from "./database.js";

describe("agency database sovereignty", () => {
  it("creates a physically separate SQLite file per organization", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "defchain-adapter-"));
    mkdirSync(path.join(root, "data", "runtime"), { recursive: true });
    const rab = openAgencyDatabase("RABMSP", root);
    rab.close();
    const bgb = openAgencyDatabase("BGBMSP", root);
    bgb.close();
    expect(path.join(root, "data", "runtime", "RABMSP.sqlite")).not.toBe(
      path.join(root, "data", "runtime", "BGBMSP.sqlite"),
    );
    rmSync(root, { recursive: true, force: true });
  });
});
