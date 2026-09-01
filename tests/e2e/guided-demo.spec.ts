import { test, expect } from '@playwright/test';

test('login page labels the prototype and offers all actors', async ({page}) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByText('Synthetic Data / Competition Prototype')).toBeVisible();
  await expect(page.getByRole('button', {name: /Police investigator/})).toBeVisible();
  await expect(page.getByRole('button', {name: /Independent auditor/})).toBeVisible();
});
