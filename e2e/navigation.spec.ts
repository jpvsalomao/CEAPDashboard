import { test, expect } from '@playwright/test';

/**
 * Navigation E2E Tests
 *
 * Tests critical navigation paths through the CEAP dashboard.
 */

test.describe('Navigation', () => {
  test('homepage loads with key metrics', async ({ page }) => {
    await page.goto('/');

    // Wait for data to load - use first() for multiple matches
    await expect(page.getByText('Visao Geral').first()).toBeVisible();

    // Check key metrics are displayed
    await expect(page.getByText(/R\$/).first()).toBeVisible();
  });

  test('can navigate to deputies page', async ({ page }) => {
    await page.goto('/');

    // Click on deputies link in sidebar (use specific emoji prefix)
    await page.getByRole('link', { name: /👤.*Deputados/i }).click();

    // Should show deputies list
    await expect(page).toHaveURL(/\/deputados/);
  });

  test('can navigate to analysis page', async ({ page }) => {
    await page.goto('/');

    // Navigate to analysis (use emoji prefix)
    await page.getByRole('link', { name: /🔍.*Padroes/i }).click();

    await expect(page).toHaveURL(/\/padroes/);
  });

  test('can navigate to methodology page', async ({ page }) => {
    await page.goto('/metodologia');

    // Should show methodology content
    await expect(page.getByText('Metodologia').first()).toBeVisible();
    await expect(page.getByText(/HHI|Herfindahl/i).first()).toBeVisible();
    await expect(page.getByText(/Benford/i).first()).toBeVisible();
  });

  test('404 page shows for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');

    // Should show 404 or redirect - use first() for multiple matches
    await expect(page.getByText(/nao encontrad|404|not found/i).first()).toBeVisible();
  });
});
