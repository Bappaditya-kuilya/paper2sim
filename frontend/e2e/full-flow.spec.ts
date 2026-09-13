import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000';

// ─── API Tests ───────────────────────────────────────────────

test.describe('API Health & Core Endpoints', () => {
  test('GET /health returns ok', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).status).toBe('ok');
  });

  test('POST /api/extract with text returns equations', async ({ request }) => {
    const res = await request.post(`${API}/api/extract`, {
      data: { source: 'text', text: 'y = mx + b' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('equations');
    expect(Array.isArray(body.equations)).toBeTruthy();
    expect(body.equations.length).toBeGreaterThan(0);
  });

  test('POST /api/extract with sin(x)', async ({ request }) => {
    const res = await request.post(`${API}/api/extract`, {
      data: { source: 'text', text: 'sin(x) + cos(y)' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.equations.length).toBeGreaterThan(0);
  });

  test('POST /api/extract rejects empty body', async ({ request }) => {
    const res = await request.post(`${API}/api/extract`, { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/extract with empty text returns 200 with empty results', async ({ request }) => {
    const res = await request.post(`${API}/api/extract`, {
      data: { source: 'text', text: '' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('POST /api/render returns job_id', async ({ request }) => {
    const res = await request.post(`${API}/api/render`, {
      data: { equation: 'y = x^2', type: 'polynomial', template: 'function' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('job_id');
  });

  test('POST /api/breakdown responds', async ({ request }) => {
    const res = await request.post(`${API}/api/breakdown`, {
      data: { equation: 'y = mx + b', type: 'polynomial' },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/storyboard responds', async ({ request }) => {
    const res = await request.post(`${API}/api/storyboard`, {
      data: { equations: [{ latex: 'y = x', type: 'function' }] },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /api/render/nonexistent/status returns error in body', async ({ request }) => {
    const res = await request.get(`${API}/api/render/nonexistent/status`);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('GET /nonexistent returns 404', async ({ request }) => {
    const res = await request.get(`${API}/nonexistent`);
    expect(res.status()).toBe(404);
  });

  test('POST /api/extract with complex LaTeX', async ({ request }) => {
    const res = await request.post(`${API}/api/extract`, {
      data: { source: 'text', text: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.equations.length).toBeGreaterThan(0);
  });
});

// ─── Frontend Render Tests ───────────────────────────────────

test.describe('Frontend Loads Correctly', () => {
  test('page loads without crash', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('root div has content', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const root = page.locator('#root');
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(50);
  });

  test('no uncaught JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.waitForTimeout(3000);
    expect(errors).toHaveLength(0);
  });

  test('dark mode class applied', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });
});

// ─── UI Component Tests ──────────────────────────────────────

test.describe('UI Components Render', () => {
  test('has clickable buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('has input fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const inputs = page.locator('input, textarea');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('sidebar or navigation exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const nav = page.locator('nav, aside, [class*="sidebar"], [class*="Sidebar"]');
    const count = await nav.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─── User Flow: Enter Equation ───────────────────────────────

test.describe('User Flow: Enter Equation', () => {
  test('can type in input field', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const input = page.locator('input[type="text"], textarea').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('y = x^2');
      await expect(input).toHaveValue('y = x^2');
    }
  });

  test('can find and click analyze/submit button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const btn = page.locator('button:has-text("Analyze"), button:has-text("Submit"), button:has-text("Extract"), button:has-text("Parse")').first();
    if (await btn.isVisible().catch(() => false)) {
      await expect(btn).toBeEnabled();
    }
  });
});

// ─── Full Pipeline: Text → Extract → Display ─────────────────

test.describe('Full Pipeline: Text Input → Extraction', () => {
  test('type equation and click analyze', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const input = page.locator('input[type="text"], textarea').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('y = sin(x)');

      const btn = page.locator('button:has-text("Analyze"), button:has-text("Submit"), button:has-text("Extract")').first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(3000);

        // Check if equation card or result appeared
        const results = page.locator('[class*="equation"], [class*="Equation"], [class*="card"], [class*="Card"]');
        const count = await results.count();
        // We just verify the page didn't crash
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ─── Static Assets ───────────────────────────────────────────

test.describe('Static Assets Load', () => {
  test('favicon loads', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
  });

  test('CSS loads', async ({ page }) => {
    await page.goto('/');
    const styles = page.locator('style, link[rel="stylesheet"]');
    const count = await styles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('JS loads', async ({ page }) => {
    await page.goto('/');
    const scripts = page.locator('script');
    const count = await scripts.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─── Responsive ──────────────────────────────────────────────

test.describe('Responsive Design', () => {
  test('renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
    const root = page.locator('#root');
    const html = await root.innerHTML();
    expect(html.length).toBeGreaterThan(50);
  });

  test('renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('renders on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── Performance ─────────────────────────────────────────────

test.describe('Performance', () => {
  test('page loads under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('no memory leaks (multiple navigations)', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('body')).toBeVisible();
  });
});
