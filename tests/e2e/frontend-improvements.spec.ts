import { expect, test } from "@playwright/test";

test("targets only RAB and completes the Fabric workflow from disclosure history", async ({
  context,
  page,
}) => {
  test.skip(
    process.env.EXPECTED_DEMO_MODE !== "full",
    "Provider selection verification requires full mode.",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Independent auditor/ }).click();
  await page.getByRole("button", { name: "Security & governance" }).click();
  await page.getByRole("button", { name: "Reset local demo" }).click();
  await expect(
    page.getByText("local demo counters and security events"),
  ).toBeVisible();
  await page.getByRole("button", { name: /Switch actor/ }).click();
  await page.getByRole("button", { name: /Police investigator/ }).click();
  await expect(page.getByText("Fabric online")).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Discovery" }).click();
  await expect(page.getByRole("checkbox", { name: "RAB" })).toBeChecked();
  await page.getByRole("checkbox", { name: "BGB" }).uncheck();
  await page.getByText("Customs", { exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Customs" }),
  ).not.toBeChecked();

  const queryRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().endsWith("/api/v1/queries"),
  );
  await page.getByRole("button", { name: /Create protected query/ }).click();
  expect((await queryRequest).postDataJSON().targetOrganizations).toEqual([
    "RABMSP",
  ]);
  await expect(page.getByText("QueryRequest committed")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("MATCH", { exact: true })).toBeVisible();
  const providerResults = page.locator("section.results .attestation");
  await expect(providerResults).toHaveCount(1);
  await expect(providerResults).toContainText("RAB");
  const queryId = await page.getByTestId("discovery-query-id").textContent();
  expect(queryId).toMatch(/^query_[a-f0-9]{32}$/);

  await page.getByRole("button", { name: "Disclosure" }).click();
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.locator('input[name="queryId"]')).toBeHidden();
  const firstHistoryRow = page.locator(".query-history-list article").first();
  await expect(firstHistoryRow).toContainText(queryId!, { timeout: 60_000 });
  await expect(firstHistoryRow).toContainText("Targets: RABMSP");
  await expect(firstHistoryRow.locator("time")).toHaveText(
    /\d{2} [A-Z][a-z]{2} 2026, \d{1,2}:\d{2} [AP]M/,
  );
  await firstHistoryRow.getByRole("button", { name: "Copy Query ID" }).click();
  await expect(page.getByRole("status")).toHaveText("Copied");

  await firstHistoryRow
    .getByRole("button", { name: `Use query ${queryId}` })
    .click();
  await expect(
    page.getByRole("button", { name: "Request scoped access" }),
  ).toHaveClass(/active/);
  await expect(page.locator('input[name="queryId"]')).toHaveValue(queryId!);
  await expect(page.locator('input[name="providerOrg"]')).toHaveValue("RABMSP");
  await page.getByRole("button", { name: /Commit AccessRequest/ }).click();
  await expect(page.getByTestId("access-proof")).toBeVisible({
    timeout: 60_000,
  });
  const requestId = await page.evaluate(() =>
    localStorage.getItem("defchain_request_id"),
  );
  expect(requestId).toMatch(/^request_[a-f0-9]{32}$/);

  await page.getByRole("button", { name: /Switch actor/ }).click();
  await page.getByRole("button", { name: /RAB provider officer/ }).click();
  await page.getByRole("button", { name: "Provider inbox" }).click();
  const requestCard = page
    .locator("article.request")
    .filter({ hasText: requestId!.slice(0, 10) });
  await expect(requestCard).toBeVisible({ timeout: 60_000 });
  await requestCard.getByRole("button", { name: "Approve" }).click();
  await expect(requestCard).toHaveCount(0, { timeout: 60_000 });

  await page.getByRole("button", { name: /Switch actor/ }).click();
  await page.getByRole("button", { name: /Police investigator/ }).click();
  await page.getByRole("button", { name: "Disclosure" }).click();
  await page.getByRole("button", { name: "History" }).click();
  const refreshedHistoryRow = page
    .locator(".query-history-list article")
    .first();
  await expect(refreshedHistoryRow).toContainText(queryId!, {
    timeout: 60_000,
  });
  await refreshedHistoryRow
    .getByRole("button", { name: `Use query ${queryId}` })
    .click();
  await expect(
    page.getByRole("button", { name: "Receive approved disclosure" }),
  ).toHaveClass(/active/);
  await expect(page.locator('input[name="queryId"]')).toHaveValue(queryId!);
  await page.getByRole("button", { name: /Verify and receive/ }).click();
  await expect(page.getByTestId("verified-receipt")).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole("button", { name: "History" }).click();
  await expect(
    page.locator(".query-history-list article").first(),
  ).toContainText(queryId!, { timeout: 60_000 });
});
