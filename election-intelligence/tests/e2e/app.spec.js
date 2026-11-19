// Testes de ponta a ponta da aplicação publicada (build de produção).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const PAGES = ['nacional', 'mapa', 'participacao', 'mudancas', 'turnos', 'perfil', 'comparar', 'sobre'];

async function open(page, rota = '') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/' + rota);
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.page-title')).toBeVisible();
  return errors;
}
const kpiValue = (page, label) => page.locator('.kpi', { has: page.locator('.kpi__label', { hasText: label }) }).first().locator('.kpi__value');

test.describe('Visão Nacional — indicadores conferem com o PBIX-MCP', () => {
  test('2026 · 2º turno (padrão do relatório)', async ({ page }) => {
    const errors = await open(page);
    await expect(page.locator('.page-kicker')).toContainText('Eleição presidencial · 2026 · 2º turno');
    await expect(kpiValue(page, 'Eleitores aptos')).toHaveText('158.745.502');
    await expect(kpiValue(page, 'Comparecimento')).toHaveText('128.236.074');
    await expect(kpiValue(page, 'Votos válidos')).toHaveText('124.082.273');
    await expect(kpiValue(page, 'Abstenção')).toHaveText('19,22%');
    await expect(kpiValue(page, 'Votos brancos')).toHaveText('1,12%');
    await expect(kpiValue(page, 'Votos nulos')).toHaveText('2,12%');
    await expect(page.locator('.page-title')).toHaveText('Lula vence com 51,79% dos votos válidos');
    await expect(page.locator('.lede')).toContainText('2.876');
    expect(errors).toEqual([]);
  });

  test('troca de eleição e turno atualiza os indicadores', async ({ page }) => {
    await open(page);
    await page.getByLabel('Eleição', { exact: true }).selectOption('2022');
    await page.getByRole('button', { name: '1º turno' }).click();
    await expect(page.locator('.page-kicker')).toContainText('Eleição presidencial · 2022 · 1º turno');
    await expect(kpiValue(page, 'Comparecimento')).toHaveText('123.682.372');
    await expect(page.locator('.page-title')).toHaveText('Lula lidera com 48,43% dos votos válidos');
    await expect(page).toHaveURL(/t=2022-1/);
  });
});

test('filtros em cascata: região → UF → município', async ({ page }) => {
  await open(page);
  await page.getByLabel('Região', { exact: true }).selectOption('NE');
  const ufOpts = await page.getByLabel('Estado (UF)').locator('option').allTextContents();
  expect(ufOpts.slice(1).map((t) => t.slice(0, 2)).sort()).toEqual(['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']);
  await page.getByLabel('Estado (UF)').selectOption('PE');
  await expect(page.locator('.page-head')).toContainText('Pernambuco');
  const box = page.getByRole('combobox', { name: 'Município' });
  await box.click();
  await box.fill('Recif');
  const opts = page.locator('#f-mun-list [role=option]');
  await expect(opts).toHaveCount(1);
  await expect(opts.first()).toContainText('Recife');
  await opts.first().click();
  await expect(page).toHaveURL(/m=\d+/);
  await expect(page.locator('.page-head')).toContainText('Recife (PE)');
  // seleção do município atualiza os indicadores territoriais
  const aptos = await kpiValue(page, 'Eleitores aptos').textContent();
  expect(Number(aptos.replace(/\./g, ''))).toBeLessThan(2_000_000);
  // limpar filtros
  await page.getByRole('button', { name: /Limpar filtros/ }).click();
  await expect(kpiValue(page, 'Eleitores aptos')).toHaveText('158.745.502');
});

test('navegação preserva filtros e a URL restaura o estado', async ({ page }) => {
  await open(page, '?t=2018-2&uf=SP');
  await expect(page.locator('.page-kicker')).toContainText('Eleição presidencial · 2018 · 2º turno');
  for (const p of PAGES.slice(1)) {
    await page.locator(`.tab[data-page="${p}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${p}\\?.*t=2018-2`));
    await expect(page).toHaveURL(/uf=SP/);
    await expect(page.locator('.page-title')).toBeVisible();
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/comparar\?/);
});

test('todas as páginas abrem sem erros no console', async ({ page }) => {
  const errors = await open(page);
  for (const p of PAGES) {
    await page.locator(`.tab[data-page="${p}"]`).click();
    await expect(page.locator('.page-title')).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.locator('.empty strong', { hasText: 'Não foi possível' })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('mapa: tooltip, clique seleciona município, migalhas e voltar ao Brasil', async ({ page }) => {
  await open(page, 'mapa');
  const canvas = page.locator('.map-wrap canvas').first();
  await expect(page.locator('.map-wrap .skeleton')).toHaveCount(0);
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const b = await canvas.boundingBox();
  // ponto no interior do Brasil (Centro-Oeste)
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.45);
  await expect(page.locator('.tooltip.is-on')).toContainText('Vencedor');
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.45);
  await expect(page).toHaveURL(/m=\d+/);
  await expect(page.locator('.detail__name')).toBeVisible();
  await expect(page.locator('.map-crumbs')).toContainText('Brasil');
  await page.getByRole('button', { name: 'Voltar ao Brasil' }).click();
  await expect(page).not.toHaveURL(/m=\d+/);
  // nível estados e clique numa UF
  await page.getByRole('button', { name: 'Estados' }).click();
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  // o clique no botão pode rolar a página (cabeçalho e filtros fixos): mede o mapa de novo
  const b2 = await canvas.boundingBox();
  await page.mouse.click(b2.x + b2.width * 0.5, b2.y + b2.height * 0.45);
  await expect(page).toHaveURL(/uf=[A-Z]{2}/);
  // modos do mapa
  await page.getByLabel('Modo do mapa').getByRole('button', { name: '% do candidato' }).click();
  await expect(page.locator('.map-legend').first()).toContainText('% dos votos válidos');
  await page.getByLabel('Modo do mapa').getByRole('button', { name: 'Margem' }).click();
  await expect(page.locator('.map-legend').first()).toContainText('Margem de vitória');
});

test('tabela: ordenação e exportação CSV', async ({ page }) => {
  await open(page, 'mapa');
  const uf = page.locator('.panel', { hasText: 'Resultado por UF' });
  await expect(uf.locator('tbody tr')).toHaveCount(27);
  await uf.getByRole('button', { name: 'UF', exact: true }).click();
  const first = await uf.locator('tbody tr').first().locator('td').first().textContent();
  expect(['TO', 'AC']).toContain(first);
  const [dl] = await Promise.all([page.waitForEvent('download'), uf.getByRole('button', { name: /Exportar CSV/ }).click()]);
  expect(dl.suggestedFilename()).toBe('resultado-por-uf.csv');
  const txt = readFileSync(await dl.path(), 'utf8');
  expect(txt.split('\r\n')[0]).toContain('UF;Vencedor;% do vencedor;Margem;% Abstenção');
  expect(txt.split('\r\n').length).toBe(28);
  expect(txt).toMatch(/PI;Lula;0,758763455066\d*/);
});

test('busca inteligente encontra município, candidato e partido', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Buscar' });
  await input.fill('juazeiro do norte');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/m=\d+/);
  await expect(page.locator('.page-head')).toContainText('Juazeiro do Norte (CE)');
  await page.getByRole('button', { name: /Buscar/ }).click();
  await input.fill('Dilma');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/c=2014-13/);
  await expect(page.locator('.page-kicker')).toContainText('2014');
});

test('seleção cruzada: clicar no candidato destaca e filtra', async ({ page }) => {
  await open(page);
  await page.locator('.panel', { hasText: 'Ranking de candidatos' }).locator('tbody tr').nth(1).click();
  await expect(page).toHaveURL(/c=2026-22/);
  await expect(page.getByLabel('Candidato', { exact: true })).toHaveValue('2026-22');
  await page.locator('.tab[data-page="perfil"]').click();
  await expect(page.locator('.panel', { hasText: 'PIB per capita × votação' })).toContainText('Flavio Bolsonaro');
});

test('mudanças e viradas conferem com o PBIX-MCP', async ({ page }) => {
  await open(page, 'mudancas');
  await expect(kpiValue(page, 'Mudaram de partido vencedor')).toHaveText('716');
  await expect(kpiValue(page, '% que mudaram')).toHaveText('12,85%');
  await page.locator('.tab[data-page="turnos"]').click();
  await expect(kpiValue(page, 'Municípios que viraram')).toHaveText('215');
  await expect(kpiValue(page, '% que viraram')).toHaveText('3,86%');
  await page.getByLabel('Eleição', { exact: true }).selectOption('2014');
  await page.locator('.tab[data-page="mudancas"]').click();
  await expect(page.locator('.empty')).toContainText('Sem eleição anterior');
});

test('comparação de candidatos e territórios', async ({ page }) => {
  await open(page, 'comparar');
  await expect(page.locator('.chip')).toHaveCount(5); // 2 candidatos + 3 territórios padrão
  await page.getByLabel('Eleição', { exact: true }).selectOption('2026');
  await page.getByRole('button', { name: '1º turno' }).click();
  await page.getByLabel('Adicionar candidato').selectOption({ label: 'Zema (NOVO)' });
  await expect(page).toHaveURL(/cc=/);
  const terr = page.getByRole('combobox', { name: 'Adicionar território' });
  await terr.click();
  await terr.fill('Manaus');
  await page.locator('[role=option]', { hasText: 'Manaus' }).first().click();
  await expect(page.locator('.panel', { hasText: 'Comparação territorial' }).locator('thead')).toContainText('Manaus (AM)');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.panel', { hasText: 'Comparação territorial' }).locator('[data-action=csv]').click()]);
  expect(dl.suggestedFilename()).toBe('comparacao-territorial.csv');
});

test('Sobre os dados: validação ao vivo contra o PBIX-MCP sem divergências', async ({ page }) => {
  await open(page, 'sobre');
  await expect(page.getByTestId('val-ok')).toHaveText('340 / 340');
  await expect(page.getByTestId('val-bad')).toHaveText('0');
  await expect(page.locator('.panel', { hasText: 'Conferência com o TSE' }).locator('.badge--ok')).toHaveCount(8);
  await expect(page.locator('details.dax')).toHaveCount(55);
});

test('link de compartilhamento contém os filtros', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, 'participacao?uf=AC');
  await page.getByRole('button', { name: /Copiar link/ }).click();
  await expect(page.locator('.toast')).toContainText('Link copiado');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toMatch(/^http:\/\/localhost:4173\/participacao\?.*uf=AC$/);
});

test('acessibilidade: contraste mínimo dos textos e alvos de toque', async ({ page }) => {
  await open(page);
  const all = [];
  for (const p of PAGES) {
  await page.locator(`.tab[data-page="${p}"]`).click();
  await expect(page.locator('.page-title')).toBeVisible();
  await page.waitForTimeout(700);
  // nenhum texto visível abaixo de 12px nem com contraste < 4,5:1 sobre o fundo efetivo
  const problems = await page.evaluate(() => {
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const bgOf = (el) => { while (el) { const c = parse(getComputedStyle(el).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.9) return c; el = el.parentElement; } return [255, 255, 255]; };
    const out = [];
    for (const el of document.querySelectorAll('main *, header *, .filterbar *')) {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('svg, canvas, .sr-only, [aria-hidden=true]')) continue;
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      const fs = parseFloat(cs.fontSize);
      const a = lum(parse(cs.color)), b = lum(bgOf(el));
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (fs < 12 || ratio < 4.5) out.push(`${el.tagName}.${el.className} "${el.textContent.trim().slice(0, 30)}" ${fs}px ${ratio.toFixed(2)}`);
    }
    return out;
  });
  all.push(...problems.map((x) => `${p}: ${x}`));
  }
  expect([...new Set(all)]).toEqual([]);
  const small = await page.evaluate(() => [...document.querySelectorAll('button, select, input, a.tab')].filter((b) => { const r = b.getBoundingClientRect(); return r.width && (r.height < 24 || r.width < 24); }).map((b) => b.outerHTML.slice(0, 80)));
  expect(small).toEqual([]);
});

test('teclado: mapa responde a setas e +/−; busca devolve o foco', async ({ page }) => {
  await open(page, 'mapa');
  await expect(page.locator('.map-wrap .skeleton')).toHaveCount(0);
  const canvas = page.locator('.map-wrap canvas').first();
  await canvas.focus();
  await page.keyboard.press('+');
  await page.keyboard.press('ArrowLeft');
  await expect(canvas).toBeFocused();
  const btn = page.getByRole('button', { name: /Buscar/ });
  await btn.click();
  await page.keyboard.press('Escape');
  await expect(btn).toBeFocused();
});
