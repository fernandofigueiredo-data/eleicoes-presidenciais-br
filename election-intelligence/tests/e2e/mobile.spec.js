// Responsividade em celular (Pixel 5).
import { test, expect } from '@playwright/test';

const PAGES = ['nacional', 'mapa', 'participacao', 'mudancas', 'turnos', 'perfil', 'comparar', 'sobre'];

test('todas as páginas cabem na largura do celular', async ({ page }) => {
  await page.goto('/#/nacional');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  for (const p of PAGES) {
    await page.goto(`/#/${p}`);
    await expect(page.locator('.page-title')).toBeVisible();
    await page.waitForTimeout(500);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw, `página ${p}`).toBeLessThanOrEqual(cw);
  }
});

test('filtros recolhidos abrem com "Mais filtros"', async ({ page }) => {
  await page.goto('/#/nacional');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByLabel('Região', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: /Mais filtros/ }).click();
  await expect(page.getByLabel('Região', { exact: true })).toBeVisible();
  await page.getByLabel('Região', { exact: true }).selectOption('S');
  await expect(page.locator('.page-head')).toContainText('Sul');
});

test('mapa responde ao toque no celular', async ({ page }) => {
  await page.goto('/#/mapa');
  await expect(page.locator('.map-wrap .skeleton')).toHaveCount(0, { timeout: 30_000 });
  const canvas = page.locator('.map-wrap canvas').first();
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const b = await canvas.boundingBox();
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.45);
  await expect(page).toHaveURL(/m=\d+/);
});
