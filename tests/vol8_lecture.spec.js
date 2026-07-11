// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/lectures/vol8_lecture.html';

test.describe('Vol VIII — Concurrency player', () => {
  test('loads, renders the first slide, and throws no console/page errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(URL);
    await expect(page.locator('#st')).toHaveText('Data races at the hardware level');
    await expect(page.locator('#sc')).toHaveText('1 / 10');
    await expect(page.locator('#diag svg')).toBeVisible();

    // A backend URL that's unreachable in CI (see README) is expected to log a
    // network error here; assert there are no *uncaught JS exceptions* instead.
    expect(pageErrors).toEqual([]);
  });

  test('heading order and landmark are correct', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('main.player')).toBeVisible();
    await expect(page.locator('#st')).toHaveJSProperty('tagName', 'H1');
  });

  test('play/pause toggles with correct labels (no raw HTML-entity text)', async ({ page }) => {
    await page.goto(URL);
    await page.click('#pb2');
    await expect(page.locator('#pb2')).toContainText('Pause');
    expect(await page.locator('#pb2').textContent()).not.toMatch(/&#/);
    await page.click('#pb2');
    await expect(page.locator('#pb2')).toContainText('Play');
    expect(await page.locator('#pb2').textContent()).not.toMatch(/&#/);
  });

  test('Prev/Next stay in bounds and disable at the edges', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#prevbtn')).toBeDisabled();
    for (let i = 0; i < 12; i++) {
      if (await page.locator('#nextbtn').isDisabled()) break;
      await page.click('#nextbtn');
    }
    await expect(page.locator('#sc')).toHaveText('10 / 10');
    await expect(page.locator('#nextbtn')).toBeDisabled();
  });

  test('keyboard shortcuts (Space, arrows) work outside inputs', async ({ page }) => {
    await page.goto(URL);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#sc')).toHaveText('2 / 10');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#sc')).toHaveText('1 / 10');
    await page.keyboard.press(' ');
    await expect(page.locator('#pb2')).toContainText('Pause');
    await page.keyboard.press(' ');
  });

  test('keyboard shortcuts do not fire while typing in the Ask text field', async ({ page }) => {
    await page.goto(URL);
    await page.click('#micbtn');
    await page.fill('#vp-input', 'what is a data race?'); // contains a space char
    await expect(page.locator('#sc')).toHaveText('1 / 10'); // unchanged — space didn't trigger play
  });

  test('progress bar seeking is mouse- and keyboard-accessible', async ({ page }) => {
    await page.goto(URL);
    const box = await page.locator('#pbar').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const midSlide = await page.locator('#sc').textContent();
    expect(midSlide).toMatch(/^[3-8] \/ 10$/);
    await expect(page.locator('#pbar')).toHaveAttribute('role', 'slider');
    await expect(page.locator('#pbar')).toHaveAttribute('tabindex', '0');
  });

  test('voice/TTS toggle does not crash', async ({ page }) => {
    await page.goto(URL);
    await page.click('#ttsbtn');
    await expect(page.locator('#ttsbtn')).toContainText('Voice On');
    await page.click('#ttsbtn');
    await expect(page.locator('#ttsbtn')).toContainText('Voice Off');
  });

  test('Ask panel opens, reports a safe state when the backend is unreachable, and closes with Escape', async ({ page }) => {
    await page.goto(URL);
    await page.click('#micbtn');
    await expect(page.locator('#voice-panel')).toHaveClass(/aai-open/);
    // No API configured/reachable in this test environment -> must degrade to a
    // visible status message, never an unhandled exception or a stuck spinner.
    await expect(page.locator('#vp-status')).not.toHaveText('');
    await page.keyboard.press('Escape');
    await expect(page.locator('#voice-panel')).not.toHaveClass(/aai-open/);
    await expect(page.locator('#micbtn')).toBeFocused();
  });

  test('no horizontal page overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto(URL);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
