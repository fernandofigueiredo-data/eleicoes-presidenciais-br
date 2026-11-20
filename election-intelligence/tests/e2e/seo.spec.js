// SEO: cada página tem endereço próprio e HTML estático (scripts/prerender.mjs) que robôs sem JavaScript leem,
// com título, descrição, canonical, JSON-LD e um resumo com os números da base. O painel atualiza os metadados ao navegar.
import { test, expect } from '@playwright/test';

const SITE = 'https://eleicoes-presidenciais-br.vercel.app/';
const ROTAS = { nacional: '/', mapa: '/mapa', participacao: '/participacao', mudancas: '/mudancas', turnos: '/turnos', perfil: '/perfil', comparar: '/comparar', sobre: '/sobre' };
const pega = (html, re) => (html.match(re) || [])[1];

test('cada página entrega HTML próprio, sem depender de JavaScript', async ({ request }) => {
  const titulos = new Set(), descricoes = new Set();
  for (const [id, rota] of Object.entries(ROTAS)) {
    const r = await request.get(rota);
    expect(r.status(), rota).toBe(200);
    const html = await r.text();
    const canonical = pega(html, /<link rel="canonical" href="([^"]+)"/);
    expect(canonical, rota).toBe(id === 'nacional' ? SITE : `${SITE}${id}`);
    expect(pega(html, /<meta property="og:url" content="([^"]+)"/)).toBe(canonical);
    titulos.add(pega(html, /<title>([^<]+)<\/title>/));
    descricoes.add(pega(html, /<meta name="description" content="([^"]+)"/));
    // resumo estático: um h1 e texto de verdade dentro de #app (o painel o substitui ao carregar)
    const resumo = pega(html, /<main id="conteudo-estatico">([\s\S]*?)<\/main>/);
    expect(resumo, rota).toMatch(/<h1>[^<]{10,}<\/h1>/);
    expect(resumo.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length, rota).toBeGreaterThan(60);
    expect(resumo, 'sem travessão').not.toContain('—');
    // links internos rastreáveis para as oito páginas
    for (const p of Object.keys(ROTAS)) expect(html).toContain(`href="./${p === 'nacional' ? '' : p}"`);
    // JSON-LD válido, com WebSite e a página
    const ld = JSON.parse(pega(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/));
    const tipos = ld['@graph'].map((g) => g['@type']);
    expect(tipos).toContain('WebSite');
    expect(tipos).toContain(id === 'sobre' ? 'AboutPage' : 'WebPage');
    if (id === 'nacional' || id === 'sobre') expect(tipos).toContain('Dataset');
  }
  expect(titulos.size).toBe(8);
  expect(descricoes.size).toBe(8);
});

test('o resumo estático traz os números da base', async ({ request }) => {
  expect(await (await request.get('/')).text()).toContain('Lula vence com 51,79% dos votos válidos no 2º turno de 2026');
  const turnos = await (await request.get('/turnos')).text();
  for (const n of ['212 viradas pela contagem estrita', '213 pela regra do banco SQL', '215 pela regra do Power BI']) expect(turnos).toContain(n);
  expect(await (await request.get('/mudancas')).text()).toMatch(/2022 para 2026<\/th><td>716</);
});

test('sitemap com as oito páginas, llms.txt e 404 fora do índice', async ({ request }) => {
  const sm = await (await request.get('/sitemap.xml')).text();
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual(Object.keys(ROTAS).map((id) => (id === 'nacional' ? SITE : `${SITE}${id}`)));
  const llms = await request.get('/llms.txt');
  expect(llms.status()).toBe(200);
  const txt = await llms.text();
  expect(txt).toMatch(/^# ELECTION INTELLIGENCE/);
  expect(txt).not.toContain('—');
  const n = await (await request.get('/404.html')).text();
  expect(n).toContain('<meta name="robots" content="noindex" />');
  expect(n).not.toContain('<script type="module"');
});

test('chave do IndexNow publicada na raiz', async ({ request }) => {
  const { readdirSync } = await import('node:fs');
  const arquivo = readdirSync(new URL('../../public/', import.meta.url)).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  expect(arquivo).toBeTruthy();
  const r = await request.get(`/${arquivo}`);
  expect(r.status()).toBe(200);
  expect((await r.text()).trim()).toBe(arquivo.replace('.txt', ''));
});

test('ao navegar, título, descrição e canonical acompanham a página', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await page.locator('.tab[data-page="turnos"]').click();
  await expect(page).toHaveURL(/\/turnos$/);
  await expect(page).toHaveTitle('Viradas entre o 1º e o 2º turno por município · ELECTION INTELLIGENCE');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}turnos`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /vencedor do 1º turno perdeu o 2º turno/);
  await page.goBack();
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE);
});
