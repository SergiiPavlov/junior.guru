import { test, expect } from '@playwright/test';

test.describe('Home smoke (uk locale)', () => {
  test('home → has hero heading', async ({ page }) => {
    // Open root, rely on Next.js redirect to /uk or /en
    await page.goto('/');

    // Wait until the app is loaded
    await page.waitForLoadState('networkidle');

    // We expect to land on a localized home page like /uk or /en
    await expect(page).toHaveURL(/\/(uk|en)(\/)?$/);

    // Check main heading / hero contains "Junior UA"
    const heading = page.getByRole('heading', { name: /Junior UA/i });
    await expect(heading).toBeVisible();
  });
});
