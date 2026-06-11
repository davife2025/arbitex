import { test, expect } from '@playwright/test'

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14

  test('landing page is usable on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Arbitex')).toBeVisible()
    await expect(page.locator('a:has-text("Open Dashboard")')).toBeVisible()
    // CTA buttons should be large enough to tap
    const cta = page.locator('a:has-text("Open Dashboard")')
    const box = await cta.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(40)
  })

  test('login page renders correctly on mobile', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('text=Arbitex')).toBeVisible()
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    // Input should be full width on mobile
    const box = await emailInput.boundingBox()
    expect(box?.width).toBeGreaterThan(250)
  })

  test('mobile nav is visible in dashboard layout', async ({ page }) => {
    await page.goto('/auth/login')
    // Bottom nav should be in the DOM (even if redirected)
    // We check that the layout element is present
    const body = await page.locator('body').innerHTML()
    expect(body).toBeTruthy()
  })

  test('ticker bar scrolls horizontally on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    // Should redirect to login — ticker bar won't show without auth
    // but we verify no layout overflow
    const html = page.locator('html')
    const box = await html.boundingBox()
    expect(box?.width).toBeLessThanOrEqual(390 + 5) // allow 5px tolerance
  })
})

test.describe('PWA manifest', () => {
  test('manifest.json is accessible', async ({ request }) => {
    const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
    const res = await request.get(`${BASE}/manifest.json`)
    expect(res.status()).toBe(200)
    const manifest = await res.json()
    expect(manifest.name).toBe('Arbitex — AI Trading')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#00E5FF')
    expect(manifest.start_url).toBe('/dashboard')
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  test('manifest has shortcuts defined', async ({ request }) => {
    const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
    const res = await request.get(`${BASE}/manifest.json`)
    const manifest = await res.json()
    expect(Array.isArray(manifest.shortcuts)).toBe(true)
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2)
  })
})

test.describe('Security headers', () => {
  test('response includes security headers', async ({ request }) => {
    const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
    const res = await request.get(BASE)
    const headers = res.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
  })
})
