# Performance audit: eleicoes-presidenciais-br.vercel.app (status: COMPLETE)

Date: 2026-11-19. Target: `/` (hash route `#/nacional`). Source: `election-intelligence/` (read-only).

## Score and method

**Estimated performance score: 68/100.** This is my estimate from the lab metrics below, not a Lighthouse score. The PSI API returned 429 (keyless daily quota exhausted) and CrUX returned 403 (no key). `npx lighthouse` was blocked by the permission system, so I did not run it.

**Field data: none available** (CrUX denied, and the site likely has too little traffic for CrUX anyway). Everything below is **lab data**: Playwright with system Chrome, CDP throttling, cache disabled, 3 mobile runs and 1 desktop run. Script: `scratchpad/audit/lab/lab.py`.
- Mobile profile: 412x823 at DPR 2.625, Slow 4G (1.6 Mbps down x 0.9, 150 ms RTT), 4x CPU.
- Desktop profile: 1350x940, 10 Mbps, 40 ms RTT.

| Metric (lab) | Mobile Slow 4G, 4x CPU | Desktop | Status |
|---|---|---|---|
| LCP | 3.60 / 3.94 / 3.95 s (3 runs). Element is a `<p>` | 1.97 s (`h1.page-title`) | Mobile NEEDS IMPROVEMENT (limit 2.5 s, poor above 4.0 s); desktop GOOD |
| CLS | 0.284 (identical in 3 runs) | 0.157 | Mobile POOR (limit 0.25); desktop NEEDS IMPROVEMENT (limit 0.1) |
| INP (proxy) | about 80 ms (first click on `#/mapa`; later clicks 32 and 16 ms) | 64 ms | GOOD. This is lab interaction timing, not field INP |
| FCP | 0.68 to 0.94 s | 0.29 s | Good |
| TTFB | 203 ms | 197 ms | Good (Vercel edge, `x-vercel-cache: HIT`) |
| Long tasks (mobile) | 4 tasks (51, 123, 94, 174 ms); about 170 to 240 ms over the 50 ms budget | none | OK |
| DOM nodes | 459 | 461 | Good (under 1,500) |

The owner's earlier 8.1 s to 3.2 s improvement is consistent with what I see (3.6 to 3.95 s). Mobile LCP is still above 2.5 s and CLS regressed to poor.

## Payload (brotli transfer sizes, live)

| Resource | Raw | Brotli |
|---|---|---|
| `index.html` | n/a | 1.5 KB |
| `assets/index-DK0mtzeI.js` (entry) | 44.6 KB | 17.7 KB |
| `assets/index-BiqjeNeQ.css` | 31.7 KB | 8.1 KB |
| IBM Plex Sans latin woff2 | n/a | 45.9 KB |
| Source Serif 4 latin woff2 | n/a | 51.0 KB |
| `data/meta.json` | 8.9 KB | 2.3 KB |
| `data/municipios.json` | 740 KB | 167 KB |
| `data/turnos/2026-2.json` | 220 KB | 98 KB |
| `data/turnos/2026-1.json` | 371 KB | 153 KB |
| `assets/echarts-BDQMxDcN.js` (lazy) | 576 KB | 198 KB |
| Other lazy chunks (nacional, shared, dataTable, echartsCore) | n/a | about 10 KB total |

- **Critical path to the first screen:** about 17.7 + 8.1 + 46 + 51 + 2.3 + 167 + 98 + 153 KB, roughly **545 KB brotli** before the Nacional page can mount.
- **ECharts adds another 198 KB** after that.
- **Background prefetch:** `carregarRestante()` then pulls the other 6 turnos (about 777 KB brotli) once the first screen is done.
- **Total observed in 7 s on mobile:** 1.19 MB over 21 requests. Desktop: 1.53 MB over 24 requests.
- Compression is brotli on every text resource.

## Caching headers (live)

- `/` HTML: `public, max-age=0, must-revalidate`, ETag, served from the Vercel CDN (HIT). Correct for the HTML.
- `/assets/*` (hashed): `public, max-age=31536000, immutable`. Correct, set in `vercel.json`.
- `/data/*.json`: `public, max-age=3600`. Not hashed. This is acceptable, but see finding 6.
- Preloads: all four use `as=fetch crossorigin=anonymous`. `src/services/data.js` fetches without custom options, so they match. No "preloaded but not used" warning pattern was seen.

## Findings, ranked by severity

### 1. HIGH: CLS 0.284 mobile and 0.157 desktop, caused by the footer being visible while `<main>` is a skeleton

- **Evidence:** `PerformanceObserver` layout-shift sources. On mobile, `FOOTER.app-footer` moves y=314 to y=734 at 3.28 s (0.176), then out of the viewport at 3.59 s (0.108). Desktop has the same pattern: 0.060 plus 0.097.
- **Cause:** `src/app.js` appends header, filterBar, an empty `<main>` and the footer. While the data is loading, the footer sits high on the page. `showPage()` then puts in `<div class="skeleton" style="height:420px">`, and then the real page, which pushes the footer down.
- **Why it matters:** the fixed `#loader` overlay hides this from the user, but the browser still counts the shifts.
- **Fix (pick one):**
  - In `src/styles/layout.css`, add `#conteudo { min-height: 100vh; }`, or reserve about 1200 px on mobile.
  - In `src/app.js`, create the footer with the `hidden` attribute and remove it on the `ei:primeira` event, or from `fimPrimeira()`.
  - Also reserve the skeleton height per page so it matches the real content.
- **Expected impact:** CLS falls to about 0.0 to 0.01. This is the cheapest fix with the largest effect.

### 2. HIGH: mobile LCP 3.6 to 3.95 s because the first screen waits for about 420 KB of JSON that is parsed and decoded before the page mounts

- **Evidence:** the entry JS finishes at 0.87 s, but the four data files finish at 2.5 to 3.2 s and share bandwidth with the JS, CSS and font. The Nacional chunk is only requested at 3.35 s, after the data has resolved. LCP lands at 3.95 s.
- **Request waterfall:**
  - `index.html` plus the 4 preloads and the JS start together at 0.24 s.
  - The page chunk (`nacional`, `shared`, `dataTable`) starts at 3.35 s.
  - ECharts (198 KB) runs from 3.58 s to 6.0 s.
- **Cause:** `src/main.js` calls `loadBase()` and only then `createApp()`. The dynamic `import('./pages/nacional.js')` in `src/app.js` is not started until the data is ready.
- **Fixes:**
  - **a) Parallelise the chunk download.** In `src/main.js`, start `import('./pages/nacional.js')` (and the `echarts*` chunk) immediately, in parallel with `loadBase()`. Alternatively, emit `<link rel="modulepreload">` for the Nacional chunk via a small Vite plugin using `transformIndexHtml`. This removes about 0.4 to 2.6 s of serial waiting on slow networks.
  - **b) Split `municipios.json`.** It is 740 KB raw, and the home page does not need every column. The keys `qPib` (136 KB), `qAlf` (193 KB), `pibpc` (103 KB), `faixa` (84 KB) and `nome` (98 KB) are the biggest. Move the socio-economic columns used only by `#/perfil` into a separate file, loaded lazily by that page. This is the repo's own data pipeline, so it is a larger change.
  - **c) Reduce `2026-1.json` for Nacional.** The page uses a pair of rounds, but Nacional may only need aggregate figures, not the per-municipality arrays. Precompute national totals into `meta.json` so that the first screen can render without the two turn files.
- **Expected impact:** (a) alone should plausibly bring mobile LCP close to 3 s. (b) and (c) are needed to reach 2.5 s on Slow 4G.

### 2b. MEDIUM: ECharts (198 KB) is loaded after data resolution, and charts fill in late

- **Evidence:** `echarts-BDQMxDcN.js` ends at 6.0 s (mobile). A long task of 174 ms at about 6.0 s is the chart initialisation.
- **Not a regression:** this is intentional, as documented in `src/components/charts/echartsCore.js`. It keeps the LCP element clear of the 576 KB parse cost.
- **Cheap improvement:** start the chunk download early (see 2a) so that it overlaps the JSON download. Charts are not the LCP element, so this does not hurt LCP.

### 3. MEDIUM: background prefetch of the 6 remaining turnos (about 777 KB brotli) competes for the network right after first render

- **Evidence:** `setTimeout(() => dados.carregarRestante(), 300)` in `src/app.js` (`fimPrimeira`). On mobile, `2014-1`, `2014-2` and `2018-1` start at 3.97 s, 5.97 s and 6.68 s, overlapping with ECharts (3.58 to 6.0 s).
- **Cost:** this delays chart rendering and the first interactions on slow connections. It is also wasteful for users on metered data, since most visitors look at one page.
- **Fix:** delay the prefetch until `requestIdleCallback` plus `navigator.connection.saveData` is false and `effectiveType` is `4g`, or only after the first user interaction. `src/app.js` is the place to change.

### 4. LOW: the font is discovered late

- **Evidence:** IBM Plex latin starts at 0.66 s (after the CSS), Source Serif latin at 3.64 s. Both use `font-display: swap`, which is good.
- **Fix:** add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the IBM Plex latin woff2 in `index.html`. The hashed file name changes each build, so this needs the same Vite `transformIndexHtml` hook as in 2a.
- **Impact:** small, because the loader overlay covers the text-swap shift anyway.

### 5. LOW: the loader overlay is a fixed full-screen element with `z-index: 200` that covers the page for the whole load

- It is correct to avoid a flash of an empty app. It does mean that real users see a spinner for about 3 to 4 s on a slow phone, not the content.
- **Optional:** render a lightweight static first-screen shell in `index.html` (title and KPI placeholders), so that the LCP element exists at first paint.

### 6. LOW: `/data/*` cache is only 1 hour and files are not versioned

- **Evidence:** `Cache-Control: public, max-age=3600`.
- **Trade-off:** safe for a site whose data changes rarely. Returning visitors revalidate after 1 hour and re-download about 420 KB if the ETag changed.
- **Fix:** `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` in `vercel.json`. Optionally, hash the data file names via the build step (`manifest.json` already exists).

### 7. INFO: INP and long tasks are healthy

- **Evidence:** about 80 ms for the first navigation click on a 4x-throttled phone, and 16 to 32 ms for the following clicks. No long task over 174 ms.
- **Remaining risk:** the 174 ms task at ECharts init, and rendering the municipal map (`#/mapa`) on low-end phones. I did not profile the map with heavy zoom or pan.

## Caveats

- Lab numbers vary by a few hundred ms between runs. The mobile CLS value was identical in all 3 runs, so it is reliable. LCP is a range, not a point.
- The local `dist/` is not the deployed build: the live entry is `index-DK0mtzeI.js` while the local one is `index-CJNdk9m5.js`. The audit uses live sizes.
- I could not verify real-user (field) numbers. After the CLS fix, a confirming Lighthouse or PSI run with an API key is recommended.
- The page was rendered with system Chrome through Playwright. No browser-sandbox warning was recorded in the stderr of these runs.

## Prioritised fix list

1. **CLS:** `min-height` on `#conteudo` or hide the footer until `ei:primeira` (`src/styles/layout.css`, `src/app.js`). Cost: 10 minutes.
2. **LCP:** start the Nacional and ECharts chunk imports in parallel with `loadBase()` (`src/main.js`, `src/app.js`). Cost: under 1 hour.
3. **Network contention:** defer `carregarRestante()` to idle and respect Save-Data (`src/app.js`).
4. **Data weight:** slim `municipios.json` and the Nacional turn files (data pipeline, `public/data`).
5. **Fonts and cache:** font preload, and `stale-while-revalidate` on `/data/*` (`index.html`, `vercel.json`).
