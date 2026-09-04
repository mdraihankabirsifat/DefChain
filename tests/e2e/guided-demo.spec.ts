import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const mode = process.env.EXPECTED_DEMO_MODE === "full" ? "full" : "lite";
const screenshotDirectory = "assets/screenshots";

test(`completes the real ${mode} workflow through the UI`, async ({ page }) => {
  await mkdir(screenshotDirectory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
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
  await page.screenshot({
    path: `${screenshotDirectory}/01-login-full-demo.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Police investigator/ }).click();
  await expect(page.getByText("Fabric online")).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({
    path: `${screenshotDirectory}/02-fabric-connected-overview.png`,
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
  await expect(page.getByTestId("discovery-query-id")).toHaveText(queryId!);
  await expect(
    page.getByText("Fabric transaction ID", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshotDirectory}/03-provider-discovery-results.png`,
    fullPage: true,
  });

  await expect(
    page.getByRole("button", { name: /Request access from/ }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Request access from RAB" }).click();
  await expect(page.locator('input[name="queryId"]')).toHaveValue(queryId!);
  await expect(page.locator('input[name="providerOrg"]')).toHaveValue("RABMSP");
  await page.getByRole("button", { name: /Commit AccessRequest/ }).click();
  await expect(page.locator("pre.output")).toContainText("AccessRequest", {
    timeout: 60_000,
  });
  const requestId = await page.evaluate(() =>
    localStorage.getItem("defchain_request_id"),
  );
  expect(requestId).toMatch(/^request_[a-f0-9]{32}$/);
  await expect(page.getByTestId("access-proof")).toBeVisible();
  await page.screenshot({
    path: `${screenshotDirectory}/04-scoped-access-request.png`,
    fullPage: true,
    mask: [page.locator("pre.output")],
    maskColor: "#06111c",
  });

  await page.getByRole("button", { name: /Switch actor/ }).click();
  await page.getByRole("button", { name: /RAB provider officer/ }).click();
  await page.getByRole("button", { name: "Provider inbox" }).click();
  const requestCard = page
    .locator("article.request")
    .filter({ hasText: requestId!.slice(0, 10) });
  await expect(requestCard).toBeVisible({ timeout: 60_000 });
  await requestCard
    .getByRole("checkbox", {
      name: "Include IDENTITY_CONFIRMATION for Partial",
    })
    .check();
  await expect(
    requestCard.getByText("Valid non-empty proper subset selected."),
  ).toBeVisible();
  await requestCard.getByRole("button", { name: "Partial" }).click();
  await expect(requestCard).toHaveCount(0, { timeout: 60_000 });
  await expect(
    page.getByText("Valid non-empty proper subset selected."),
  ).toHaveCount(0);
  await expect(page.getByText("PARTIAL decision committed")).toBeVisible();
  await page.screenshot({
    path: `${screenshotDirectory}/05-provider-authorization-decision.png`,
    fullPage: true,
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
  await expect(page.getByTestId("verified-receipt")).toBeVisible();
  await page.screenshot({
    path: `${screenshotDirectory}/06-verified-disclosure-receipt.png`,
    fullPage: true,
    mask: [page.locator("pre.output")],
    maskColor: "#06111c",
  });

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
    path: `${screenshotDirectory}/07-five-stage-audit-timeline.png`,
    fullPage: true,
  });

  await page.getByRole("button", { name: "Discovery" }).click();
  await page.locator('select[name="caseId"]').evaluate((select) => {
    const option = new Option("MISSING-CASE", "MISSING-CASE", true, true);
    (select as HTMLSelectElement).add(option);
  });
  await page.getByRole("button", { name: /Create protected query/ }).click();
  await expect(page.getByText("Case not found")).toBeVisible();
  await page.screenshot({
    path: `${screenshotDirectory}/08-abuse-control-or-fail-closed.png`,
    fullPage: true,
  });
});
