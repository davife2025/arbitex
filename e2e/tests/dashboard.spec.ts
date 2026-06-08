import { test, expect, type Page } from '@playwright/test'

// Helper to mock a logged-in session via localStorage/cookie
// In real CI, you'd use a test Supabase account via env vars
async function mockAuthSession(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    // Simulate a minimal Supabase session so middleware passes
    // Replace with real test credentials in CI via E2E_TEST_EMAIL / E2E_TEST_PASSWORD
    localStorage.setItem('arbitex-auth-bypass', 'true')
  })
}

test.describe('Landing page', () => {
  test('feature badges are visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Live Market Data')).toBeVisible()
    await expect(page.locator('text=AI Signal Generation')).toBeVisible()
    await expect(page.locator('text=Automated Execution')).toBeVisible()
    await expect(page.locator('text=Real-time WebSocket')).toBeVisible()
  })

  test('CTA buttons are visible and linked correctly', async ({ page }) => {
    await page.goto('/')
    const dashboardLink = page.locator('a:has-text("Open Dashboard")')
    const signInLink = page.locator('a:has-text("Sign In")')
    await expect(dashboardLink).toHaveAttribute('href', '/dashboard')
    await expect(signInLink).toHaveAttribute('href', '/auth/login')
  })

  test('tech stack footer is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Next.js')).toBeVisible()
    await expect(page.locator('text=Supabase')).toBeVisible()
    await expect(page.locator('text=Kimi K2')).toBeVisible()
  })
})

test.describe('404 page', () => {
  test('shows not found page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.locator('text=404')).toBeVisible()
    await expect(page.locator('text=Page not found')).toBeVisible()
    await expect(page.locator('a:has-text("Back to Dashboard")')).toBeVisible()
  })
})

test.describe('Auth login page UI', () => {
  test('all form elements render', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('text=Arbitex')).toBeVisible()
    await expect(page.locator('text=AI-Powered Trading Infrastructure')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('enter key submits form', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', 'password')
    await page.press('input[type="password"]', 'Enter')
    // Should attempt login (error will appear since credentials are fake)
    await expect(page.locator('.text-danger, [class*="danger"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('buttons are not disabled initially', async ({ page }) => {
    await page.goto('/auth/login')
    const btn = page.locator('button:has-text("Sign In")')
    await expect(btn).not.toBeDisabled()
  })
})
