// T3: os 27 links por UF (#/turnos?uf=XX), em contexto novo, em 1440 px e 390 px.
// T5: os mesmos links com parâmetros UTM antes do "#".
// Cada teste grava seu resultado em test-status/links-uf/, que `npm run docs:divulgacao` junta em links_uf.csv.
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createEngine } from '../../src/services/engine.js';
import { linksUf, ROTA_UF } from '../../src/services/links.js';

const root = join(import.meta.dirname, '..', '..');
const j = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const meta = j('public/data/meta.json');
const E = createEngine({ meta, mun: j('public/data/municipios.json'), turnos: Object.fromEntries(meta.turnos.map((t) => [t.chave, j(`public/data/turnos/${t.chave}.json`)])) });
const UFS = linksUf(E);
const STATUS = join(root, 'test-status', 'links-uf');
const SHOTS = join(root, '..', 'docs', 'divulgacao-election-intelligence', 'assets', 'uf');
const UTM = '?utm_source=teste&utm_medium=email&utm_campaign=lancamento-2026-11';
const kpi = (page, label) => page.locator('.kpi', { has: page.locator('.kpi__label', { hasText: label }) }).first();
const int = (n) => n.toLocaleString('pt-BR');

function vigiar(page) {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  page.on('requestfailed', (r) => erros.push(`falhou ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) erros.push(`HTTP ${r.status()} ${r.url()}`); });
  return erros;
}

async function conferir(page, u) {
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.page-title')).toHaveText('Onde o vencedor virou no 2º turno');
  // filtro aplicado com o estado certo
  await expect(page.getByLabel('Estado (UF)')).toHaveValue(u.uf);
  await expect(page.locator('.page-kicker')).toContainText(u.nome);
  // mapa e listas renderizados
  await expect(page.locator('.map-wrap .skeleton')).toHaveCount(0);
  await expect(page.locator('.map-wrap canvas').first()).toBeVisible();
  await expect(page.locator('.panel', { hasText: 'Lista de municípios que viraram' }).locator('table')).toBeVisible();
  await expect(page.locator('.panel', { hasText: 'Candidatos no 2º turno' }).locator('tbody tr')).toHaveCount(2);
  // números exibidos = base
  const card = kpi(page, 'Municípios que viraram');
  await expect(card.locator('.kpi__value')).toHaveText(int(u.dax));
  await expect(card.locator('.kpi__foot')).toContainText(`de ${int(u.municipios)} com resultado nos dois turnos`);
  await expect(card.getByTestId('viradas-estrita')).toHaveText(`contagem estrita: ${int(u.estrita)}`);
  await expect(page.locator('.panel', { hasText: 'Lista de municípios que viraram' }).locator('.panel__sub')).toContainText(`${int(u.dax)} municípios`);
}

for (const vp of [{ largura: '1440', width: 1440, height: 900 }, { largura: '390', width: 390, height: 844 }]) {
  test.describe(`links por UF em ${vp.width} px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    for (const u of UFS) {
      test(`${u.uf}: ${ROTA_UF(u.uf)}`, async ({ page }) => {
        const erros = vigiar(page);
        let ok = false, obs = '';
        try {
          await page.goto('/' + ROTA_UF(u.uf));
          await conferir(page, u);
          await page.waitForTimeout(400);
          if (vp.largura === '1440') {
            mkdirSync(SHOTS, { recursive: true });
            // recorte: do título da página ao fim do mapa (indicadores, mapa e lista)
            const topo = await page.locator('.page-head').boundingBox();
            const mapa = await page.locator('.grid--map').boundingBox();
            await page.screenshot({ path: join(SHOTS, `${u.uf}.jpg`), type: 'jpeg', quality: 50, fullPage: true, clip: { x: 0, y: Math.max(0, topo.y - 16), width: vp.width, height: mapa.y + mapa.height - topo.y + 32 } });
          }
          await page.reload();
          await expect(page).toHaveURL(new RegExp(`#/turnos\\?(r=[A-Z]+&)?uf=${u.uf}$`));
          await conferir(page, u);
          expect(erros).toEqual([]);
          ok = true;
        } catch (e) {
          obs = String(e.message).split('\n')[0].slice(0, 160);
          throw e;
        } finally {
          mkdirSync(STATUS, { recursive: true });
          writeFileSync(join(STATUS, `${u.uf}-${vp.largura}.json`), JSON.stringify({ uf: u.uf, largura: vp.largura, ok, obs, quando: new Date().toISOString() }));
        }
      });
    }
  });
}

test.describe('UTM antes do "#" (T5)', () => {
  for (const uf of ['MG', 'RJ', 'DF', 'SP', 'BA']) {
    test(`${uf} com UTM: rota, filtro e recarga funcionam; o link compartilhado sai sem UTM`, async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const u = UFS.find((x) => x.uf === uf);
      const erros = vigiar(page);
      await page.goto(`/${UTM}${ROTA_UF(uf)}`);
      await conferir(page, u);
      expect(new URL(page.url()).searchParams.get('utm_source')).toBe('teste');
      await page.reload();
      await conferir(page, u);
      expect(new URL(page.url()).search).toBe(UTM);
      // navegar para outra página mantém o UTM na URL (não quebra o roteador) e mantém o filtro
      await page.locator('.tab[data-page="nacional"]').click();
      await page.waitForURL(/#\/nacional/);
      expect(page.url()).toContain(`${UTM}#/nacional?`);
      expect(page.url()).toMatch(new RegExp(`uf=${uf}$`));
      await page.getByRole('button', { name: 'Copiar link com os filtros atuais' }).click();
      const copiado = await page.evaluate(() => navigator.clipboard.readText());
      expect(copiado).not.toContain('utm_');
      expect(copiado).toMatch(new RegExp(`/#/nacional\\?(r=[A-Z]+&)?uf=${uf}$`));
      expect(erros).toEqual([]);
    });
  }

  test('página nacional com UTM abre sem erro e não grava nada no navegador', async ({ page }) => {
    const erros = vigiar(page);
    await page.goto('/?utm_source=nicolau&utm_medium=substack&utm_campaign=lancamento-2026-11#/nacional');
    await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.locator('.page-title')).toHaveText('Lula vence com 51,79% dos votos válidos');
    await expect(page).toHaveURL(/\?utm_source=nicolau&utm_medium=substack&utm_campaign=lancamento-2026-11#\/nacional$/);
    const armazenado = await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie]);
    expect(armazenado).toEqual([0, 0, '']);
    expect(erros).toEqual([]);
  });

  test('rota #/mudancas com UTM (ficha B5)', async ({ page }) => {
    const erros = vigiar(page);
    await page.goto('/?utm_source=braga&utm_medium=email&utm_campaign=lancamento-2026-11#/mudancas');
    await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
    await expect(kpi(page, 'Mudaram de partido vencedor').locator('.kpi__value')).toHaveText('716');
    expect(erros).toEqual([]);
  });
});

test('a nota da página 1º e 2º turno leva ao FAQ das viradas', async ({ page }) => {
  await page.goto('/#/turnos');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(kpi(page, 'Municípios que viraram (regra DAX)').locator('.kpi__value')).toHaveText('215');
  await expect(kpi(page, 'Municípios que viraram').getByTestId('viradas-estrita')).toHaveText('contagem estrita: 212');
  await page.getByTestId('link-faq-viradas').click();
  await expect(page).toHaveURL(/#\/sobre\?s=faq$/);
  await expect(page.locator('#faq-viradas')).toHaveAttribute('open', '');
});
