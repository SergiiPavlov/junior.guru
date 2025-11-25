import { test, expect } from '@playwright/test';

test.describe('Jobs smoke (uk locale)', () => {
  test('list → search → detail → back', async ({ page }) => {
    await page.goto('/uk/jobs');

    const list = page.locator('main [data-testid="job-card"], main article');
    await expect(list.first()).toBeVisible();

    const searchInput = page.locator('input[name="q"], input[placeholder*="Пошук"], input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Junior');
    await Promise.all([
      page.waitForURL(/\/uk\/jobs.*q=Junior/i),
      searchInput.press('Enter')
    ]);

    const firstCard = page.locator('[data-testid="job-card"], main article').first();
    await expect(firstCard).toBeVisible();

    const firstCardTitle = firstCard.locator('h3, h2').first();
    await expect(firstCardTitle).toBeVisible();

    const detailLink = firstCard.locator('[data-testid="job-card-link"], a[href*="/jobs/"]').first();
    await expect(detailLink).toBeVisible();

    await detailLink.click();
    await expect(page).toHaveURL(/\/uk\/jobs\//);

    const title = page.locator('h1, h2').first();
    await expect(title).toBeVisible();

    const openOriginal = page.getByRole('link', { name: /Відкрити оригінал|Open original|Open on site/i });
    await expect(openOriginal).toBeVisible();
    const originalHref = await openOriginal.getAttribute('href');
    expect(originalHref).toBeTruthy();
    expect(originalHref).not.toContain('jobs.example');

    await page.goBack();
    await expect(page).toHaveURL(/\/uk\/jobs.*q=Junior/i);
    await expect(searchInput).toHaveValue(/Junior/i);
  });
});
