// T4: grava as cenas do vídeo de 75 s, renderiza legendas e cartões e gera as 4 imagens em 2 formatos.
// Uso: PW_CHANNEL=chrome npx playwright test -c playwright.midia.config.js
// Depois: FFMPEG=/caminho/do/ffmpeg node scripts/midia/compor.mjs
// A gravação usa capturas sequenciais pelo CDP, sem o ffmpeg próprio do Playwright.
// Tudo sai do próprio site (capturas). Os números dos textos estão em roteiro.mjs e TEXTOS_IMAGENS,
// conferidos em docs/divulgacao-election-intelligence/12_VERIFICACAO_MIDIA.md.
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CENAS, LEGENDAS, CARTOES, FINAL, IMAGENS } from './roteiro.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const RAW = join(ROOT, 'test-results', 'midia-raw');
const IMG = join(ROOT, '..', 'docs', 'divulgacao-election-intelligence', 'assets', 'imagens');
const BASE = 'http://localhost:4173/';
mkdirSync(RAW, { recursive: true });
mkdirSync(IMG, { recursive: true });

const fonte = (f) => readFileSync(join(ROOT, 'node_modules', '@fontsource-variable', f)).toString('base64');
const FONTES = `@font-face{font-family:Plex;src:url(data:font/woff2;base64,${fonte('ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2')}) format('woff2');font-weight:100 700}
@font-face{font-family:Serif4;src:url(data:font/woff2;base64,${fonte('source-serif-4/files/source-serif-4-latin-wght-normal.woff2')}) format('woff2');font-weight:200 900}`;
const meta = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'meta.json'), 'utf8'));
const COR = { lula: meta.partidoCores.PT, flavio: meta.partidoCores.PL, empate: '#8a8f98', virou: '#e3b505', manteve: '#c9ced6' };
const RODAPE = 'Fonte: TSE e IBGE · Elaboração: ELECTION INTELLIGENCE · Projeto não oficial';
const SITE = 'eleicoes-presidenciais-br.vercel.app';

async function carregar(page, rota) {
  await page.goto(BASE + rota);
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.page-title')).toBeVisible();
  await page.waitForTimeout(1200);
}
/** Rola suavemente até que o elemento fique logo abaixo dos cabeçalhos fixos. */
async function rolarAte(page, locator, ms = 1500) {
  const alvo = await locator.evaluate((el) => {
    const topo = document.querySelector('.filterbar')?.getBoundingClientRect().bottom ?? 0;
    return window.scrollY + el.getBoundingClientRect().top - topo - 16;
  });
  const de = await page.evaluate(() => window.scrollY);
  const passos = Math.max(1, Math.round(ms / 33));
  for (let i = 1; i <= passos; i++) {
    const t = i / passos, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    await page.evaluate((y) => window.scrollTo(0, y), de + (alvo - de) * e);
    await page.waitForTimeout(33);
  }
}
async function passear(page, locator, pontos, ms) {
  const b = await locator.boundingBox();
  for (const [x, y] of pontos) { await page.mouse.move(b.x + b.width * x, b.y + b.height * y, { steps: 12 }); await page.waitForTimeout(ms); }
}

/** Ações de cada cena, cronometradas para a duração dela. */
const ACOES = {
  async s1(page) { await page.waitForTimeout(2500); await rolarAte(page, page.locator('.grid').first(), 2500); await page.waitForTimeout(3200); },
  async s2(page) {
    const mapa = page.locator('.map-wrap').first();
    await page.waitForTimeout(1500); await rolarAte(page, mapa, 1500);
    await passear(page, mapa.locator('canvas').first(), [[0.62, 0.38], [0.7, 0.55], [0.45, 0.62], [0.55, 0.8], [0.35, 0.45]], 1500);
    await page.mouse.move(5, 5); await page.waitForTimeout(800);
  },
  async s3(page) {
    await page.waitForTimeout(5000);
    await rolarAte(page, page.locator('.grid--map'), 2500);
    await page.waitForTimeout(2500);
    const linha = page.locator('.panel', { hasText: 'Lista de municípios que viraram' }).locator('tbody tr').first();
    await linha.hover(); await page.waitForTimeout(1200); await linha.click();
    await page.waitForTimeout(6500);
  },
  async s4(page) { await page.waitForTimeout(4000); await rolarAte(page, page.locator('.panel', { hasText: 'Abstenção por UF' }), 2000); await page.waitForTimeout(6200); },
  async s5(page) { await page.waitForTimeout(3500); await rolarAte(page, page.locator('.panel', { hasText: 'Votos por faixa de PIB per capita' }), 2000); await page.waitForTimeout(7700); },
  async s6(page) {
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Copiar link com os filtros atuais' }).click();
    await page.waitForTimeout(2500);
    const lista = page.locator('.panel', { hasText: 'Lista de municípios que viraram' });
    await rolarAte(page, page.locator('.grid--map'), 1500);
    const csv = lista.getByRole('button', { name: /Exportar CSV/ });
    await csv.hover(); await page.waitForTimeout(600);
    const dl = page.waitForEvent('download');
    await csv.click(); await dl;
    await page.waitForTimeout(3200);
  },
};

const FORMATOS_VIDEO = {
  horizontal: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, size: { width: 1920, height: 1080 } },
  vertical: { viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, size: { width: 1080, height: 1920 } },
};

/**
 * Grava a página com capturas sequenciais (CDP Page.captureScreenshot), que respeitam a densidade de
 * pixels: no formato vertical, 432×768 a 2,5× dá quadros nítidos de 1080×1920. Cada quadro guarda o
 * instante da captura; o ffmpeg usa esses instantes para montar 30 fps.
 */
async function gravar(ctx, page, dir, escala = 1) {
  mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(page);
  const quadros = [];
  let ligado = true;
  const laco = (async () => {
    while (ligado) {
      let clip;
      if (escala > 1) {
        const m = await cdp.send('Page.getLayoutMetrics').catch(() => null);
        const v = m?.cssVisualViewport;
        if (v) clip = { x: v.pageX, y: v.pageY, width: v.clientWidth, height: v.clientHeight, scale: escala };
      }
      const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true, ...(clip ? { clip } : {}) }).catch(() => null);
      if (!r) break;
      const arq = join(dir, `q${String(quadros.length).padStart(5, '0')}.jpg`);
      writeFileSync(arq, Buffer.from(r.data, 'base64'));
      quadros.push({ arq, t: Date.now() / 1000 });
    }
  })();
  return { async parar() { ligado = false; await laco; return quadros; } };
}

for (const [nome, f] of Object.entries(FORMATOS_VIDEO)) {
  test(`cenas do vídeo (${nome})`, async ({ browser }) => {
    const cenas = [];
    for (const c of CENAS.filter((x) => x.rota)) {
      const ctx = await browser.newContext({ viewport: f.viewport, deviceScaleFactor: f.deviceScaleFactor, isMobile: f.isMobile, hasTouch: f.hasTouch, locale: 'pt-BR', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
      const page = await ctx.newPage();
      await carregar(page, c.rota);
      const rec = await gravar(ctx, page, join(RAW, nome, c.id), f.deviceScaleFactor);
      await page.waitForTimeout(300);
      const t0 = Date.now() / 1000;
      await ACOES[c.id](page);
      const t1 = Date.now() / 1000;
      await page.waitForTimeout(300);
      const quadros = await rec.parar();
      await ctx.close();
      cenas.push({ id: c.id, t0, t1, gravado: t1 - t0, duracao: c.fim - c.ini, quadros });
    }
    writeFileSync(join(RAW, `cenas-${nome}.json`), JSON.stringify(cenas, null, 1));
    for (const c of cenas) expect(c.gravado, `cena ${c.id} curta demais`).toBeGreaterThanOrEqual(c.duracao);
  });
}

/** Legendas, cartões e quadro final como PNG transparente, com a fonte do site. */
test('legendas e quadros', async ({ browser }) => {
  for (const [nome, w, hgt, fs] of [['horizontal', 1920, 1080, 44], ['vertical', 1080, 1920, 50]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt } });
    const page = await ctx.newPage();
    const css = `${FONTES} html,body{margin:0;background:transparent;width:${w}px;height:${hgt}px;font-family:Plex,sans-serif}`;
    const shot = async (html, arq) => { await page.setContent(`<style>${css}</style>${html}`); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: join(RAW, `${nome}-${arq}.png`), omitBackground: true }); };
    for (const [i, l] of LEGENDAS.entries()) {
      await shot(`<div style="position:absolute;left:0;right:0;bottom:${nome === 'vertical' ? 260 : 64}px;display:flex;justify-content:center;padding:0 48px">
        <div style="background:rgba(12,21,36,.86);color:#fff;font-size:${fs}px;line-height:1.3;font-weight:500;padding:14px 28px;border-radius:12px;max-width:${w - 160}px;text-align:center">${l.texto}</div></div>`, `legenda-${i}`);
    }
    for (const [i, c] of CARTOES.entries()) {
      await shot(`<div style="position:absolute;${nome === 'vertical' ? 'left:60px;right:60px;top:300px' : 'left:80px;top:300px;width:720px'};background:#fff;border:3px solid #002776;border-radius:18px;padding:32px 36px;box-shadow:0 12px 40px rgba(12,21,36,.25)">
        <div style="font-family:Serif4,serif;font-size:${fs}px;font-weight:700;color:#0c1524;line-height:1.15;margin-bottom:18px">${c.titulo}</div>
        ${c.linhas.map((x, k) => `<div style="font-size:${fs - 6}px;color:${k === 2 ? '#6b5100' : '#0c1524'};font-weight:${k === 2 ? 700 : 500};margin:8px 0">${x}</div>`).join('')}
        <div style="font-size:${Math.round(fs * 0.5)}px;color:#5b6676;margin-top:16px">${c.fonte}</div></div>`, `cartao-${i}`);
    }
    await shot(`<div style="position:absolute;inset:0;background:#002776;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px">
      <svg width="${fs * 3}" height="${fs * 3}" viewBox="0 0 40 40"><rect width="40" height="40" rx="9" fill="#009C3B"/><path d="M20 6 35 20 20 34 5 20Z" fill="#E3B505"/><circle cx="20" cy="20" r="7.5" fill="#002776"/></svg>
      <div style="font-weight:700;letter-spacing:.06em;font-size:${fs}px;margin-top:28px">ELECTION INTELLIGENCE</div>
      <div style="font-family:Serif4,serif;font-weight:700;font-size:${Math.round(fs * 1.5)}px;margin-top:36px;color:#fff">${FINAL.endereco}</div>
      <div style="font-size:${Math.round(fs * 0.85)}px;margin-top:40px;background:#fbf3d2;color:#3d3000;padding:14px 28px;border-radius:10px;font-weight:600">${FINAL.aviso}</div></div>`, 'final');
    await ctx.close();
  }
});

// ---------------------------------------------------------------- imagens (1200×630 e 1080×1350)
// textos e números das imagens: roteiro.mjs (IMAGENS); aqui só as cores das legendas
const TEXTOS_IMAGENS = Object.fromEntries(Object.entries(IMAGENS).map(([id, t]) => [id, { ...t, legenda: t.legenda.map(([k, n]) => [COR[k], n]), link: `${SITE}/${t.rota}` }]));

const FORMATOS_IMG = { og: { w: 1200, h: 630 }, feed: { w: 1080, h: 1350 } };

function modelo(t, png, f) {
  const og = f.w > f.h;
  const s = og ? { k: 20, t: 40, l: 22, n: 17, r: 17, pad: 44 } : { k: 30, t: 58, l: 32, n: 26, r: 24, pad: 64 };
  const chips = t.legenda.map(([c, n]) => `<span style="display:inline-flex;align-items:center;gap:8px;margin-right:18px"><span style="width:${s.n}px;height:${s.n}px;border-radius:4px;background:${c};border:1px solid #0c152433"></span>${n}</span>`).join('');
  const texto = `<div style="font-size:${s.k}px;color:#007a2e;font-weight:600">${t.kicker}</div>
    <div style="font-family:Serif4,serif;font-size:${s.t}px;line-height:1.12;font-weight:700;color:#0c1524;margin:${og ? 8 : 14}px 0 ${og ? 10 : 18}px">${t.titulo}</div>
    <div style="font-size:${s.l}px;line-height:1.35;color:#172133">${t.linha}</div>
    ${chips ? `<div style="font-size:${s.n}px;color:#172133;margin-top:${og ? 14 : 22}px">${chips}</div>` : ''}
    <div style="font-size:${s.n}px;color:${t.ressalva ? '#4a3a00' : '#3d4859'};${t.ressalva ? 'background:#fbf3d2;padding:8px 12px;border-radius:8px;font-weight:600;' : ''}margin-top:${og ? 12 : 18}px">${t.nota}</div>`;
  const imagem = `<div style="flex:1;min-height:0;min-width:0;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:12px;overflow:hidden"><img src="data:image/png;base64,${png}" style="max-width:100%;max-height:100%;object-fit:contain"></div>`;
  return `<div style="width:${f.w}px;height:${f.h}px;box-sizing:border-box;background:#f6f7f9;display:flex;flex-direction:column;font-family:Plex,sans-serif">
    <div style="flex:1;min-height:0;display:flex;${og ? 'flex-direction:row;gap:28px' : 'flex-direction:column;gap:24px'};padding:${s.pad}px ${s.pad}px ${og ? 20 : 28}px">
      <div style="${og ? 'width:470px;flex:none;display:flex;flex-direction:column;justify-content:center' : ''}">${texto}</div>${imagem}</div>
    <div style="flex:none;background:#002776;color:#fff;padding:${og ? '12px 44px' : '22px 64px'};font-size:${s.r}px;line-height:1.4;display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 20px">
      <span>${RODAPE}</span><span style="font-weight:600">${t.link}</span></div></div>`;
}

test('imagens: 4 temas em 2 formatos', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, locale: 'pt-BR' });
  const page = await ctx.newPage();
  const capturas = {};
  for (const [id, t] of Object.entries(TEXTOS_IMAGENS)) {
    await carregar(page, t.rota);
    const alvo = typeof t.alvo === 'string' ? page.locator(t.alvo).first() : page.locator('.panel', { hasText: t.alvo.panel }).first();
    await alvo.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(1200);
    // sem controles de zoom nem dicas na captura do mapa
    await page.addStyleTag({ content: '.map-controls,.map-hint,.map-crumbs,.tooltip,.panel__tools{display:none!important}' });
    capturas[id] = (await alvo.screenshot()).toString('base64');
  }
  await ctx.close();
  for (const [fmt, f] of Object.entries(FORMATOS_IMG)) {
    const c2 = await browser.newContext({ viewport: { width: f.w, height: f.h }, deviceScaleFactor: 1 });
    const p2 = await c2.newPage();
    for (const [id, t] of Object.entries(TEXTOS_IMAGENS)) {
      await p2.setContent(`<style>${FONTES} html,body{margin:0}</style>${modelo(t, capturas[id], f)}`);
      await p2.evaluate(() => document.fonts.ready);
      await p2.waitForTimeout(200);
      await p2.screenshot({ path: join(IMG, `${id}_${f.w}x${f.h}.png`) });
    }
    await c2.close();
  }
});
