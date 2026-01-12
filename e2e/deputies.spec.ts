import { test, expect } from '@playwright/test';

/**
 * Deputies Page E2E Tests
 *
 * Tests the deputies listing and filtering functionality.
 */

test.describe('Deputies Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deputados');
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
  });

  test('displays list of deputies', async ({ page }) => {
    // Should have the page title
    await expect(page.getByText('Deputados').first()).toBeVisible();

    // Should show the subtitle with deputy count
    await expect(page.getByText(/parlamentares/).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows deputy stats', async ({ page }) => {
    // Should show key stats cards
    await expect(page.getByText('Gasto medio').first()).toBeVisible();
    await expect(page.getByText('Casos criticos').first()).toBeVisible();
  });

  test('has search functionality', async ({ page }) => {
    // Should have search input
    const searchInput = page.getByPlaceholder(/Buscar por nome/i);
    await expect(searchInput).toBeVisible();

    // Can type in search
    await searchInput.fill('Test');
    await expect(searchInput).toHaveValue('Test');
  });

  test('displays table headers', async ({ page }) => {
    // Should show sortable table headers
    await expect(page.getByText('Deputado').first()).toBeVisible();
    await expect(page.getByText('UF').first()).toBeVisible();
    await expect(page.getByText('Total Gasto').first()).toBeVisible();
    await expect(page.getByText('Risco').first()).toBeVisible();
  });

  test('shows risk levels', async ({ page }) => {
    // Should show at least one risk indicator
    await expect(
      page.getByText(/CRITICO|ALTO|MEDIO|BAIXO/).first()
    ).toBeVisible();
  });

  test('can navigate to deputy profile', async ({ page }) => {
    // Find a deputy link and click it
    // Links use /deputado/ pattern
    const deputyLink = page.locator('a[href^="/deputado/"]').first();

    if (await deputyLink.isVisible()) {
      await deputyLink.click();
      await expect(page).toHaveURL(/\/deputado\/\d+/);
    }
  });
});
