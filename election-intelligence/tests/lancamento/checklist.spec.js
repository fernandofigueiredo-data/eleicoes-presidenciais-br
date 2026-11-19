// Checklist de lançamento: roda contra o site publicado (BASE_URL) e grava o resultado em
// test-status/lancamento/checklist-<host>.json, usado em docs/.../14_CHECKLIST_LANCAMENTO.md.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROTAS = ['nacional', 'mapa', 'participacao', 'mudancas', 'turnos', 'perfil', 'comparar', 'sobre', 'turnos?uf=MG'];
const OUT = join(import.meta.dirname, '..', '..', 'test-status', 'lancamento');
const resultado = {};
const salvar = (base) => { mkdirSync(OUT, { recursive: true }); writeFileSync(join(OUT, `checklist-${new URL(base).host}.json`), JSON.stringify(resultado, null, 1)); };
const SUSPEITOS = /lorem|ipsum|dolor sit|placeholder|todo:|fixme|\bx{3,}\b|teste123|asdf/i;
const SUSPEITOS_EXATOS = /\bNaN\b|\bundefined\b|\bnull\b|\[object Object\]/;

async function paginas(page, baseURL) {
  const erros = [], http = [], misto = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) http.push(`${r.status()} ${r.url()}`); });
  page.on('request', (r) => { if (r.url().startsWith('http://') && !r.url().startsWith('http://localhost')) misto.push(r.url()); });
  const links = new Set(), suspeitos = [], noindex = [];
  for (const rota of ROTAS) {
    const resp = await page.goto(rota === 'nacional' ? '/' : `/${rota}`);
    if (rota === 'nacional') {
      const xr = resp.headers()['x-robots-tag'];
      if (xr) noindex.push(`X-Robots-Tag: ${xr}`);
    }
    await expect(page.locator('#loader')).toHaveCount(0, { timeout: 60_000 });
    await expect(page.locator('.page-title')).toBeVisible();
    await page.waitForTimeout(1500);
    const meta = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.content ?? null);
    if (meta && /noindex/i.test(meta)) noindex.push(`meta robots: ${meta}`);
    for (const a of await page.locator('a[href]').evaluateAll((els) => els.map((e) => e.href))) links.add(a);
    const texto = await page.locator('body').innerText();
    const m = texto.match(SUSPEITOS) || texto.match(SUSPEITOS_EXATOS);
    if (m) suspeitos.push(`${rota}: "${texto.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}"`);
  }
  Object.assign(resultado, { base: baseURL, erros, http, misto, noindex, suspeitos, links: [...links].sort() });
  salvar(baseURL);
  expect.soft(erros).toEqual([]);
  expect.soft(http).toEqual([]);
  expect.soft(misto).toEqual([]);
  expect.soft(noindex).toEqual([]);
  expect.soft(suspeitos).toEqual([]);
}

async function links(page, request, baseURL) {
  const quebrados = [], limitados = [];
  for (const href of resultado.links || []) {
    const u = new URL(href);
    if (u.protocol === 'mailto:') { if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(decodeURIComponent(u.pathname))) quebrados.push(`mailto inválido: ${href}`); continue; }
    if (u.origin === new URL(baseURL).origin && !/^\/(data|assets|og|geo)\//.test(u.pathname) && !/\.[a-z0-9]+$/i.test(u.pathname)) {
      await page.goto(href);
      const ok = await page.locator('.page-title').waitFor({ state: 'visible', timeout: 30_000 }).then(() => true).catch(() => false);
      if (!ok) quebrados.push(`rota interna sem conteúdo: ${href}`);
      continue;
    }
    if (u.protocol === 'blob:' || u.protocol === 'data:') continue;
    let r = await request.head(href, { failOnStatusCode: false, maxRedirects: 5, timeout: 20_000 }).catch((e) => ({ status: () => `erro ${e.message.split('\n')[0]}` }));
    if (typeof r.status() !== 'number' || r.status() >= 400) r = await request.get(href, { failOnStatusCode: false, maxRedirects: 5, timeout: 20_000 }).catch((e) => ({ status: () => `erro ${e.message.split('\n')[0]}` }));
    if (r.status() === 429) { limitados.push(href); continue; } // limite de requisições do servidor, não é link quebrado
    if (typeof r.status() !== 'number' || r.status() >= 400) quebrados.push(`${r.status()} ${href}`);
  }
  resultado.quebrados = quebrados;
  resultado.limitados = limitados;
  salvar(baseURL);
  expect.soft(quebrados).toEqual([]);
}

/** LCP medido pelo navegador, sem cache, com rede e CPU limitadas no perfil de celular. */
async function lcp(browser, perfil) {
  const ctx = await browser.newContext(perfil.ctx);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (perfil.rede) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...perfil.rede });
  if (perfil.cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: perfil.cpu });
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  const t0 = Date.now();
  await page.goto('/');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 120_000 });
  const pronto = (Date.now() - t0) / 1000;
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({ lcp: window.__lcp / 1000, bytes: performance.getEntriesByType('resource').reduce((a, e) => a + (e.transferSize || 0), 0) }));
  await ctx.close();
  return { ...r, pronto };
}

async function desempenho(browser, baseURL) {
  const perfis = {
    desktop: { ctx: { viewport: { width: 1440, height: 900 } } },
    celular_4g: { ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, rede: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }, cpu: 4 },
  };
  resultado.desempenho = {};
  for (const [nome, p] of Object.entries(perfis)) resultado.desempenho[nome] = await lcp(browser, p);
  salvar(baseURL);
  expect.soft(resultado.desempenho.desktop.lcp).toBeLessThan(4);
}

async function rastreamento(request, baseURL) {
  const robots = await request.get('/robots.txt', { failOnStatusCode: false });
  const sitemap = await request.get('/sitemap.xml', { failOnStatusCode: false });
  const html = await (await request.get('/')).text();
  const verif = await request.get('/google18c225c689ba1d80.html', { failOnStatusCode: false });
  resultado.rastreamento = {
    robots: robots.status(), robotsBloqueia: /Disallow:\s*\/\s*$/m.test(await robots.text()), sitemap: sitemap.status(),
    sitemapValido: /<urlset[\s\S]*<loc>https:\/\/eleicoes-presidenciais-br\.vercel\.app\/<\/loc>/.test(await sitemap.text()),
    canonical: /rel="canonical"/.test(html), searchConsole: verif.status() === 200 && (await verif.text()).includes('google-site-verification: google18c225c689ba1d80.html'), ogImage: (html.match(/property="og:image" content="([^"]+)"/) || [])[1] || null,
  };
  if (resultado.rastreamento.ogImage) resultado.rastreamento.ogImageStatus = (await request.get(resultado.rastreamento.ogImage, { failOnStatusCode: false })).status();
  salvar(baseURL);
  expect.soft(resultado.rastreamento).toMatchObject({ robots: 200, robotsBloqueia: false, sitemap: 200, sitemapValido: true, canonical: true, searchConsole: true });
}

test('checklist de lançamento: páginas, links e desempenho', async ({ page, request, browser, baseURL }) => {
  await rastreamento(request, baseURL);
  await paginas(page, baseURL);
  await links(page, request, baseURL);
  await desempenho(browser, baseURL);
});
