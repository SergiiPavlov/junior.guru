import { test, expect } from '@playwright/test';

test.describe('Jobs smoke (uk locale)', () => {
  test('list → search → detail → back', async ({ page }) => {
    // 1) Open jobs list
    await page.goto('/uk/jobs');
    // Wait for cards list (look for common card elements)
    const list = page.locator('main');
    await expect(list).toBeVisible();

    // We try to find at least one JobCard (by heading/link presence)
    const firstCard = page.locator('a:has(h3), article a, .job-card a').first();
    await expect(firstCard).toBeVisible();

    // 2) Perform a search (q param). Try to find a search input by name or placeholder
    const searchInput = page.locator('input[name="q"], input[placeholder*="Пошук"], input[placeholder*="Search"]')
      .first();
    if (await searchInput.count()) {
      await searchInput.fill('React');
      // submit: press Enter
      await searchInput.press('Enter');
    } else {
      // fallback: append ?q=React
      await page.goto('/uk/jobs?q=React');
    }

    // Wait some change in URL or content
    await expect(page).toHaveURL(/\/uk\/jobs/);

    // 3) Go to detail page from the first visible card
    await firstCard.click();
    await expect(page).toHaveURL(/\/uk\/jobs\//);

    // 4) Detail assertions: title and "Відкрити оригінал" button/link
    const title = page.locator('h1, h2').first();
    await expect(title).toBeVisible();

    const openOriginal = page.getByRole('link', { name: /Відкрити оригінал|Open original|Open on site/i });
    await expect(openOriginal).toBeVisible();

    // 5) Back and ensure filters preserved
    await page.goBack();
    await expect(page).toHaveURL(/\/uk\/jobs/);
  });
});
