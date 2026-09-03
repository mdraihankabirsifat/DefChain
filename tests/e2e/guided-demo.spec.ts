import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const mode = process.env.EXPECTED_DEMO_MODE === "full" ? "full" : "lite";
const screenshotDirectory = "assets/screenshots";

test(`completes the real ${mode} workflow through the UI`, async ({ page }) => {
  await mkdir(screenshotDirectory, { recursive: true });
  await page.goto("/");
  await expect(
    page.getByText(
      new RegExp(
        `Competition Prototype.*${mode === "full" ? "Full" : "Lite"} Demo`,
      ),
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /BGB provider officer/ }),
  ).toHaveCount(mode === "full" ? 1 : 0);
  await page.getByRole("button", { name: /Police investigator/ }).click();
  await expect(page.getByText("Fabric online")).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({
    path: `${screenshotDirectory}/01-${mode}-dashboard.png`,
    fullPage: true,
  });

  await page.getByRole("button", { name: "Discovery" }).click();
  await page.getByRole("button", { name: /Create protected query/ }).click();
  await expect(page.getByText("QueryRequest committed")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("MATCH", { exact: true })).toBeVisible();
  const queryId = await page.evaluate(() =>
    localStorage.getItem("defchain_query_id"),
  );
  expect(queryId).toMatch(/^query_[a-f0-9]{32}$/);
  await page.screenshot({
    path: `${screenshotDirectory}/02-${mode}-discovery.png`,
    fullPage: true,
  });

  await page.getByRole("button", { name: "Disclosure" }).click();
  await page.getByRole("button", { name: /Commit AccessRequest/ }).click();
  await expect(page.locator("pre.output")).toContainText("AccessRequest", {
    timeout: 60_000,
  });
  const requestId = await page.evaluate(() =>
    localStorage.getItem("defchain_request_id"),
  );
  expect(requestId).toMatch(/^request_[a-f0-9]{32}$/);

  await page.getByRole("button", { name: /Switch actor/ }).click();
  await page.getByRole("button", { name: /RAB provider officer/ }).click();
  await page.getByRole("button", { name: "Provider inbox" }).click();
  await expect(page.getByText("Access request")).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/No pending access requests/)).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole("button", { name: /Switch actor/ }).click();
  await page.getByRole("button", { name: /Police investigator/ }).click();
  await page.getByRole("button", { name: "Disclosure" }).click();
  await page
    .getByRole("button", { name: "Receive approved disclosure" })
    .click();
  await page.getByRole("button", { name: /Verify and receive/ }).click();
  await expect(page.locator("pre.output")).toContainText(
    '"signatureVerified": true',
    { timeout: 60_000 },
  );
  await expect(page.locator("pre.output")).toContainText("DisclosureReceipt");

  await page.getByRole("button", { name: "Audit timeline" }).click();
  await page.getByRole("button", { name: "Verify workflow" }).click();
  for (const recordType of [
    "QueryRequest",
    "MatchAttestation",
    "AccessRequest",
    "AuthorizationDecision",
    "DisclosureReceipt",
  ])
    await expect(
      page.getByText(recordType, { exact: true }).first(),
    ).toBeVisible({ timeout: 60_000 });
  await page.screenshot({
    path: `${screenshotDirectory}/03-${mode}-audit.png`,
    fullPage: true,
  });
});
