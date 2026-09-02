import { test, expect } from "@playwright/test";

test("completes the real lite workflow through the UI", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Competition Prototype · Lite Demo/)).toBeVisible();
  await expect(page.getByRole("button", { name: /BGB provider officer/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Police investigator/ }).click();
  await expect(page.getByText("Fabric online")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Discovery" }).click();
  await page.getByRole("button", { name: /Create protected query/ }).click();
  await expect(page.getByText("QueryRequest committed")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("MATCH", { exact: true })).toBeVisible();
  const queryId = await page.evaluate(() => localStorage.getItem("defchain_query_id"));
  expect(queryId).toMatch(/^query_[a-f0-9]{32}$/);

  await page.getByRole("button", { name: "Disclosure" }).click();
  await page.getByRole("button", { name: /Commit AccessRequest/ }).click();
  await expect(page.locator("pre.output")).toContainText("AccessRequest", { timeout: 60_000 });
  const requestId = await page.evaluate(() => localStorage.getItem("defchain_request_id"));
  expect(requestId).toMatch(/^request_[a-f0-9]{32}$/);

  await page.getByRole("button", { name: /Switch actor/ }).click();
  await page.getByRole("button", { name: /RAB provider officer/ }).click();
  await page.getByRole("button", { name: "Provider inbox" }).click();
  await expect(page.getByText("Access request")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/No pending access requests/)).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: /Switch actor/ }).click();
  await page.getByRole("button", { name: /Police investigator/ }).click();
  await page.getByRole("button", { name: "Disclosure" }).click();
  await page.getByRole("button", { name: "Receive approved disclosure" }).click();
  await page.getByRole("button", { name: /Verify and receive/ }).click();
  await expect(page.locator("pre.output")).toContainText('"signatureVerified": true', { timeout: 60_000 });
  await expect(page.locator("pre.output")).toContainText("DisclosureReceipt");

  await page.getByRole("button", { name: "Audit timeline" }).click();
  await page.getByRole("button", { name: "Verify workflow" }).click();
  for (const recordType of ["QueryRequest", "MatchAttestation", "AccessRequest", "AuthorizationDecision", "DisclosureReceipt"])
    await expect(page.getByText(recordType, { exact: true })).toBeVisible({ timeout: 60_000 });
});
