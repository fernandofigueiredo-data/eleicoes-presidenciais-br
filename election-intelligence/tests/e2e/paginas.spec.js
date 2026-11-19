// Verificação das 8 páginas em 1440 px e em 390 px: erros de console, requisições falhas,
// rolagem horizontal, tela vazia e link para "Sobre e contato" no menu e no rodapé.
import { test, expect } from '@playwright/test';

const PAGES = ['nacional', 'mapa', 'participacao', 'mudancas', 'turnos', 'perfil', 'comparar', 'sobre'];
const LARGURAS = [{ nome: 'desktop', width: 1440, height: 900 }, { nome: 'celular', width: 390, height: 844 }];

for (const v of LARGURAS) {
  test.describe(`páginas em ${v.width} px`, () => {
    test.use({ viewport: { width: v.width, height: v.height } });
    for (const p of PAGES) {
      test(`#/${p} abre sem erro (${v.nome})`, async ({ page }) => {
        const erros = [];
        const falhas = [];
        page.on('pageerror', (e) => erros.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
        page.on('requestfailed', (r) => falhas.push(`${r.url()} ${r.failure()?.errorText}`));
        page.on('response', (r) => { if (r.status() >= 400) falhas.push(`${r.url()} HTTP ${r.status()}`); });
        await page.goto(`/#/${p}`);
        await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
        await expect(page.locator('.page-title')).toBeVisible();
        await page.waitForTimeout(800);
        // conteúdo renderizado: a página não ficou só com o esqueleto de carregamento
        await expect(page.locator('main .skeleton')).toHaveCount(0);
        expect((await page.locator('main').innerText()).length).toBeGreaterThan(200);
        const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        expect(sw, 'rolagem horizontal').toBeLessThanOrEqual(cw);
        expect(erros).toEqual([]);
        expect(falhas).toEqual([]);
        await page.screenshot({ path: test.info().outputPath(`${p}-${v.width}.png`) });
        // link para Sobre e contato no menu e no rodapé
        await expect(page.locator('nav.tabs a.tab[data-page="sobre"]')).toHaveText('Sobre e contato');
        await expect(page.locator('footer a[href^="#/sobre"]', { hasText: 'Sobre e contato' })).toHaveCount(1);
      });
    }
  });
}

for (const v of LARGURAS) {
  test(`a barra de filtros fixa não fica sob as abas ao rolar (${v.nome})`, async ({ page }) => {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.goto('/#/turnos?uf=MG');
    await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(300);
    const [cab, filtros] = await page.evaluate(() => [document.querySelector('.app-header').getBoundingClientRect().bottom, document.querySelector('.filterbar').getBoundingClientRect().top]);
    expect(Math.abs(filtros - cab)).toBeLessThanOrEqual(1);
  });
}

test('"Pular para o conteúdo" leva o foco ao conteúdo sem trocar de página', async ({ page }) => {
  await page.goto('/#/mapa');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.page-title')).toBeVisible();
  // o foco inicial do Tab varia entre navegadores (no Chromium da CI não começa no documento):
  // o que se testa é o efeito de ativar o link pelo teclado
  await page.locator('.skip-link').focus();
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#conteudo')).toBeFocused();
  await expect(page).toHaveURL(/#\/mapa$/);
  await expect(page.locator('.tab[data-page="mapa"]')).toHaveAttribute('aria-current', 'page');
});

test('arquivo de verificação do Google Search Console é servido na raiz', async ({ request }) => {
  const r = await request.get('/google18c225c689ba1d80.html');
  expect(r.status()).toBe(200);
  expect((await r.text()).trim()).toBe('google-site-verification: google18c225c689ba1d80.html');
});
