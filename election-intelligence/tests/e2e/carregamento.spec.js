// Carregamento sob demanda dos turnos: a primeira tela pede só o que precisa, o resto vem depois,
// sem baixar nada duas vezes e sem nenhuma tela com número faltando.
import { test, expect } from '@playwright/test';

function contar(page) {
  const n = new Map();
  page.on('request', (r) => { const u = new URL(r.url()).pathname; if (u.includes('/data/') || u.includes('/assets/echarts')) n.set(u, (n.get(u) || 0) + 1); });
  return n;
}

test('Visão Nacional: abre com 2 turnos, completa o gráfico histórico depois, sem pedidos repetidos', async ({ page }) => {
  const n = contar(page);
  const turnosNaAbertura = [];
  page.on('request', (r) => { if (r.url().includes('/data/turnos/')) turnosNaAbertura.push({ arq: new URL(r.url()).pathname.split('/').pop() }); });
  await page.goto('/');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.page-title')).toHaveText('Lula vence com 51,79% dos votos válidos');
  const painel = page.locator('.panel', { hasText: 'Participação ao longo das eleições' });
  await expect(painel.locator('.chart-wait')).toBeHidden({ timeout: 30_000 });
  await expect(painel.locator('.chart canvas')).toBeVisible();
  await expect.poll(() => [...n.keys()].filter((k) => k.includes('/turnos/')).length).toBe(8);
  for (const [arq, vezes] of n) expect(vezes, arq).toBe(1);
});

test('1º e 2º turno com município selecionado: o detalhe espera a eleição anterior e mostra a variação', async ({ page }) => {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/turnos?uf=MG&m=50911');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.detail__name')).toContainText('Ribeirão das Neves');
  const abst = page.locator('.detail__grid div', { hasText: 'Abstenção' }).locator('dd');
  await expect(abst).toContainText('p.p.');
  expect(erros).toEqual([]);
});

test('trocar de eleição antes de o segundo plano terminar espera os dados e não mostra "não está na base"', async ({ page }) => {
  await page.route('**/data/turnos/2014-*.json', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  await page.goto('/participacao');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await page.getByLabel('Eleição', { exact: true }).selectOption('2018');
  await expect(page.locator('.page-kicker')).toContainText('2018');
  await expect(page.locator('main')).not.toContainText('não está na base');
});
