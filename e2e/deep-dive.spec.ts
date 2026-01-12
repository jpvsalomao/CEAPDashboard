import { test, expect } from '@playwright/test';

/**
 * Deep Dive E2E Tests
 *
 * Tests the deep dive case study pages.
 * This also validates the useRef hook fix doesn't cause crashes.
 */

test.describe('Deep Dive Pages', () => {
  test('Sostenes Cavalcante deep dive loads', async ({ page }) => {
    await page.goto('/deepdive/sostenes-cavalcante');
    await page.waitForLoadState('networkidle');

    // Should show deputy name in title
    await expect(page.getByText(/Sostenes/i).first()).toBeVisible();

    // Should show methodology section
    await expect(page.getByText(/Metodologia/i).first()).toBeVisible();

    // Page should not crash (validates useRef fix)
    await expect(page.locator('body')).toBeVisible();
  });

  test('Carlos Jordy deep dive loads', async ({ page }) => {
    await page.goto('/deepdive/carlos-jordy');
    await page.waitForLoadState('networkidle');

    // Should show deputy name or Benford mention
    await expect(page.getByText(/Carlos Jordy|Benford/i).first()).toBeVisible();

    // Page should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('invalid deep dive shows not found message', async ({ page }) => {
    await page.goto('/deepdive/non-existent-case');
    await page.waitForLoadState('networkidle');

    // Should show not found message
    await expect(
      page.getByText(/nao encontrado|not found|nao existe/i).first()
    ).toBeVisible();
  });

  test('deep dive has breadcrumb navigation', async ({ page }) => {
    await page.goto('/deepdive/sostenes-cavalcante');
    await page.waitForLoadState('networkidle');

    // Should have breadcrumb with link to Deep Dives
    await expect(page.getByRole('link', { name: /Deep Dives/i }).first()).toBeVisible();
  });

  test('deep dive shows external context section', async ({ page }) => {
    await page.goto('/deepdive/sostenes-cavalcante');
    await page.waitForLoadState('networkidle');

    // Should show external context
    await expect(page.getByText(/Contexto Externo/i).first()).toBeVisible();
  });
});
