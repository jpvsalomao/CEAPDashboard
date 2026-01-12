import { test, expect } from '@playwright/test';

/**
 * Deputy Profile E2E Tests
 *
 * Tests the individual deputy profile page and its components.
 */

test.describe('Deputy Profile', () => {
  // Use a known deputy ID (Sostenes Cavalcante - PL-RJ)
  const DEPUTY_ID = 786;

  test.beforeEach(async ({ page }) => {
    // Note: profile uses /deputado/ not /deputados/
    await page.goto(`/deputado/${DEPUTY_ID}`);
    await page.waitForLoadState('networkidle');
  });

  test('displays deputy basic information', async ({ page }) => {
    // Wait for data to load - look for R$ values which indicate data loaded
    await expect(page.getByText(/R\$/).first()).toBeVisible({ timeout: 15000 });

    // Should show deputy name (Sóstenes with accent) or Cavalcante
    await expect(page.getByText(/stenes|Cavalcante/i).first()).toBeVisible();
  });

  test('displays KPI cards', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByText(/R\$/).first()).toBeVisible({ timeout: 15000 });

    // Should show key metrics
    await expect(page.getByText('Total Gasto').first()).toBeVisible();
    await expect(page.getByText('Transacoes').first()).toBeVisible();
    await expect(page.getByText('Fornecedores').first()).toBeVisible();
  });

  test('displays comparison section', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByText(/R\$/).first()).toBeVisible({ timeout: 15000 });

    // Should show comparison with peers
    await expect(page.getByText(/Comparacao|Pares/i).first()).toBeVisible();
  });

  test('displays analysis sections', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByText(/R\$/).first()).toBeVisible({ timeout: 15000 });

    // Should show risk or concentration analysis
    await expect(page.getByText(/Concentracao|Risco|HHI/i).first()).toBeVisible();
  });

  test('displays suppliers section', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByText(/R\$/).first()).toBeVisible({ timeout: 15000 });

    // Should show suppliers
    await expect(
      page.getByText(/Fornecedor/i).first()
    ).toBeVisible();
  });

  test('has back navigation', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByText(/R\$/).first()).toBeVisible({ timeout: 15000 });

    // Should have link back to deputies list
    const backLink = page.getByRole('link', { name: /Deputados/i }).first();
    await expect(backLink).toBeVisible();
  });
});
