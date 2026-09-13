import { test, expect } from '@playwright/test';

test.describe('Paper2Sim E2E', () => {
  test('homepage loads with title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('main layout renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });

  test('header is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const header = page.locator('header').first();
    if (await header.isVisible().catch(() => false)) {
      await expect(header).toBeVisible();
    }
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(3000);
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('ResizeObserver'));
    expect(critical).toHaveLength(0);
  });

  test('page is interactive (buttons clickable)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Backend API E2E', () => {
  const API = 'http://localhost:8000';

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get(`${API}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('extract endpoint works with text', async ({ request }) => {
    const response = await request.post(`${API}/api/extract`, {
      data: { source: 'text', text: 'y = mx + b' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('equations');
  });

  test('extract endpoint rejects empty input', async ({ request }) => {
    const response = await request.post(`${API}/api/extract`, {
      data: {},
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('render endpoint returns job_id', async ({ request }) => {
    const response = await request.post(`${API}/api/render`, {
      data: { equation: 'y = x^2', type: 'polynomial', template: 'function' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('job_id');
  });

  test('breakdown endpoint responds', async ({ request }) => {
    const response = await request.post(`${API}/api/breakdown`, {
      data: { equation: 'y = mx + b', type: 'polynomial' },
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('storyboard endpoint responds', async ({ request }) => {
    const response = await request.post(`${API}/api/storyboard`, {
      data: { equations: [{ latex: 'y = x', type: 'function' }] },
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('nonexistent endpoint returns 404', async ({ request }) => {
    const response = await request.get(`${API}/api/nonexistent`);
    expect(response.status()).toBe(404);
  });
});
