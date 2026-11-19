// Google Analytics 4 só depois do consentimento. O ID é de teste e as requisições ao Google são
// interceptadas: nada sai da máquina.
import { test, expect } from '@playwright/test';

const UTM = '?utm_source=nicolau&utm_medium=substack&utm_campaign=lancamento-2026-11&utm_content=a1';

async function preparar(page) {
  const pedidos = [];
  await page.addInitScript(() => { window.__EI_GA4_ID__ = 'G-TESTE12345'; });
  await page.route(/google-analytics\.com|googletagmanager\.com|doubleclick\.net/, (route) => {
    pedidos.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* gtag de teste */' });
  });
  return pedidos;
}
const eventos = (page) => page.evaluate(() => (window.dataLayer || []).map((a) => Array.from(a)));
const carregar = async (page, url) => {
  await page.goto(url);
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.page-title')).toBeVisible();
};

test('sem aceite, o Google Analytics não é carregado e nada é enviado', async ({ page }) => {
  const pedidos = await preparar(page);
  await carregar(page, `/${UTM}#/turnos?uf=MG`);
  await expect(page.getByRole('region', { name: 'Medição de acessos' })).toBeVisible();
  await page.waitForTimeout(800);
  expect(pedidos).toEqual([]);
  expect(await page.evaluate(() => [typeof window.gtag, document.cookie])).toEqual(['undefined', '']);
  await page.getByRole('button', { name: 'Recusar' }).click();
  await expect(page.getByRole('region', { name: 'Medição de acessos' })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(800);
  await expect(page.getByRole('region', { name: 'Medição de acessos' })).toHaveCount(0);
  expect(pedidos).toEqual([]);
});

test('com aceite: consentimento, configuração sem publicidade e página vista com UTM, sem filtros', async ({ page }) => {
  const pedidos = await preparar(page);
  await carregar(page, `/${UTM}#/turnos?uf=MG`);
  await page.getByRole('button', { name: 'Aceitar' }).click();
  await expect.poll(() => pedidos.length).toBeGreaterThan(0);
  expect(pedidos[0]).toContain('googletagmanager.com/gtag/js?id=G-TESTE12345');
  const ev = await eventos(page);
  expect(ev[0]).toEqual(['consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]);
  expect(ev[1]).toEqual(['consent', 'update', { analytics_storage: 'granted' }]);
  const config = ev.find((e) => e[0] === 'config');
  expect(config[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const vistas = () => eventos(page).then((x) => x.filter((e) => e[0] === 'event' && e[1] === 'page_view').map((e) => e[2].page_location));
  expect(await vistas()).toEqual([`http://localhost:4173/turnos${UTM}`]);
  // troca de página: nova página vista, ainda com a origem da campanha e sem os filtros
  await page.locator('.tab[data-page="nacional"]').click();
  await expect.poll(vistas).toEqual([`http://localhost:4173/turnos${UTM}`, `http://localhost:4173/nacional${UTM}`]);
  // na volta, o aviso não aparece de novo
  await page.reload();
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole('region', { name: 'Medição de acessos' })).toHaveCount(0);
});

test('privacidade descreve a medição e permite mudar a escolha; recusar depois apaga os cookies _ga', async ({ page, context }) => {
  await preparar(page);
  await carregar(page, '/sobre?s=privacidade');
  await page.getByRole('button', { name: 'Aceitar' }).click();
  const priv = page.getByTestId('privacidade');
  await expect(priv).toContainText('Google Analytics 4');
  await expect(priv).toContainText('endereço IP');
  await context.addCookies([{ name: '_ga', value: 'GA1.1.123.456', url: 'http://localhost:4173' }]);
  await page.getByRole('button', { name: 'Preferências de medição' }).click();
  await page.getByRole('region', { name: 'Medição de acessos' }).getByRole('button', { name: 'Recusar' }).click();
  expect((await context.cookies()).filter((c) => c.name.startsWith('_ga'))).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('ei-consentimento-medicao'))).toBe('recusado');
});

test('o aviso de medição cabe no celular e não cobre o aviso de projeto não oficial', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparar(page);
  await carregar(page, '/sobre');
  const consent = await page.getByRole('region', { name: 'Medição de acessos' }).boundingBox();
  const aviso = await page.locator('#sec-aviso').boundingBox();
  expect(consent.y).toBeGreaterThan(aviso.y + aviso.height);
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw);
});
