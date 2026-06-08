import { test, expect } from '@playwright/test'

test.describe('Auth flow', () => {
  test('landing page renders correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Arbitex')).toBeVisible()
    await expect(page.locator('text=AI-Powered Trading Infrastructure')).toBeVisible()
    await expect(page.locator('a:has-text("Open Dashboard")')).toBeVisible()
    await expect(page.locator('a:has-text("Sign In")')).toBeVisible()
  })

  test('redirects unauthenticated users from /dashboard to /auth/login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('text=Sign In')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'bad@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button:has-text("Sign In")')
    // Supabase returns an error — check error div appears
    await expect(page.locator('.text-danger, [class*="danger"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('can toggle between sign-in and sign-up modes', async ({ page }) => {
    await page.goto('/auth/login')
    await page.click('button:has-text("Sign Up")')
    await expect(page.locator('button:has-text("Create Account")')).toBeVisible()
    await page.click('button:has-text("Sign In")')
    await expect(page.locator('button:has-text("Sign In")').last()).toBeVisible()
  })
})
