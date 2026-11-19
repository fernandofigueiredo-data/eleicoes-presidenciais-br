# Visual + Images audit (seo-visual) - eleicoes-presidenciais-br.vercel.app

Status: COMPLETE. Date 2026-11-19. Rendered with Playwright (system Chrome), sandbox on.
Screenshots: /private/tmp/claude-501/-Users-fernandofigueiredo--claude-spares-spare-Oei6ZX/641aaa63-5d42-4ea0-80c0-ae0d1cc57390/scratchpad/audit/screenshots/
(root: *_desktop|laptop|tablet|mobile.png; per route in nacional/ mapa/ turnos/ sobre/, desktop + mobile)
Probe scripts/raw output: .../audit/tmp/probe.py, probe.out, cls.py

## Scores
- Visual: 82/100
- Images: 70/100 (no raster content images exist, so the score rests on OG image, favicon and chart alternatives)

## Above the fold

Desktop 1920x1080 (/):
- Header + 8-tab nav + 7-control filter bar take ~190px; H1 "Lula vence com 51,79% dos votos válidos" sits at y~275, fully visible. Lead text, candidate share bar and 6 KPI cards fit in the first screen. Strong hierarchy (serif H1, navy header, red/blue candidate colours).
- No marketing CTA by design (data tool). The primary actions (filters, "Buscar Ctrl K", "Compartilhar") are visible.
- The cookie banner (fixed, 720x93, y 971-1064) overlaps the bottom of the first screen on every route, covering the first charts' lower edge.
- Charts "Votos válidos por candidato" / "Municípios vencidos" start at y~700 and are cut by the fold. Acceptable.

Mobile 375x812:
- Header (112px) + tab bar (98px) + filters (Eleição, Turno, "Mais filtros", "Limpar") ~270px: the H1 starts at y~300 (of 812). H1 and lead are visible, the candidate card is visible, KPI cards are not.
- The cookie banner is 191px tall at y 605-796, i.e. 24% of the viewport, covering the candidate card and all KPIs until the user answers. On /#/mapa it hides the map controls; the map itself is entirely below the fold on mobile (it only appears after the H1, lead, 3 control groups and a checkbox).
- On /#/sobre the global filter block (Eleição/Turno/Mais filtros) is rendered although it does not affect that page; it pushes the "Projeto independente, não oficial" notice down by ~270px.
- Primary nav is horizontally scrollable with the last tab cut off ("Compare..."): reasonable affordance, but no fade or arrow hint.

## Layout / responsiveness checks (measured)
- Horizontal scroll: none on any of 5 routes at 375px or 1920px (scrollWidth == viewport).
- Overlaps/cut-off text: none observed in screenshots. Table headers and map render correctly.
- Base font 16px; most UI text 14px; 11-12px used for tile sublabels, chart axes and table meta (about 27 + 43 text nodes on /). Documented as intentional in tokens.css (--fs-xs 12px).
- Landmarks: header, nav, main (1), footer present; lang="pt-BR"; skip link present; focus-visible outline 2px defined (base.css:19); prefers-reduced-motion handled (base.css:28).
- Touch targets (<44px) on mobile: 38px segmented buttons (1º/2º turno, Vencedor, Município...), 24px-high table sort buttons, 18x18 checkbox ("Tom pela % do vencedor"), 41x41 UF cartogram tiles, footer links 29px high, "Saiba mais" 18px. WCAG 2.2 SC 2.5.8 (24px) is met except the 15px-wide "UF" sort button and the 24x18 "TSE" link; Google's/Lighthouse 48px guideline is not met. tokens.css already defines --target-touch: 44px, but it is not applied to these controls.
- Layout shift: desktop CLS = 0.108 (reproducible, 3 runs: 0.037 at ~205ms + 0.071 at ~260-400ms, source `.app-footer`); mobile CLS = 0. Slightly above the 0.1 "good" threshold on desktop. Cause: the footer is inserted/moved when #app content renders after the loader.
- Dark mode: no prefers-color-scheme styles (light only). Not an SEO issue.

## Images category
- Rendered DOM contains 0 `<img>` elements on all 5 routes (desktop and mobile). Visuals are inline SVG (cartogram, role="group" aria-label="Cartograma das UFs"; UF tiles carry aria-labels such as "Piauí: Lula 75,88%") and a canvas map (`.map-wrap canvas`, keyboard focusable). Consequence: no alt-text problems, but also no indexable image content for Google Images beyond the OG image.
- Other charts (bars, lines): ECharts-style containers; I did not find SVG title/desc on them (only the cartogram has an accessible name). The map canvas has a focus style but I did not verify an aria-label.
- OG image: /og/election-intelligence-1200x630.png -> HTTP 200, image/png, 1200x630 (matches og:image:width/height), 229,052 bytes, served with access-control-allow-origin *. Content is clear: title "Quem venceu em cada município", legend, map, source footer, URL. Legible at thumbnail scale; text is large (>= 28px headline). Problem: cache-control `public, max-age=0, must-revalidate` (fine for freshness, but costs a revalidation per crawl) and the image bakes in "2º turno de 2026" numbers (2.875/2.695) while the site shows 2.876/2.696 (the site counts the tie for both; the OG says "1 empatou"). Consistent but easy to read as a mismatch.
- og:image:alt present and descriptive (pt-BR). Twitter: only `twitter:card=summary_large_image`; no twitter:image/title/description (X falls back to og:*, so OK).
- Favicon: `<link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">`; file exists (217 bytes, 40x40 viewBox, brand diamond), served image/svg+xml. Missing: /favicon.ico (404), apple-touch-icon.png (404), site.webmanifest (404), no PNG fallback. The favicon is under /assets/ which vercel.json caches `immutable, max-age=31536000` while the file name is not hashed, so a future favicon change will not reach returning visitors/crawlers for up to a year.

## Findings by severity

### Medium
1. Cookie banner covers 24% of the mobile first screen and ~9% on desktop on every route, hiding the lead KPIs/map and shifting the perceived first view. Evidence: mobile banner top 605, height 191 of 812. Fix: make it a slim bottom bar on <=600px (single line + two buttons, collapse the "Saiba mais" text), or render it in flow below the header; default to reduced height. Files: banner markup/styles in src (search `Google Analytics` in src/*.js) and src/styles/components.css.
2. Mobile fold is dominated by chrome: ~270px of filters before the page content, and the map on /#/mapa is below the fold. Fix: collapse Eleição/Turno into the "Mais filtros" sheet or make the filter bar non-sticky/shorter on <=600px; on /#/mapa move the map above the "Colorir por / Nível / Tom" controls or reduce their stacking. Hide the filter bar entirely on /#/sobre. Files: src/app.js (filter bar render), src/styles/layout.css.
3. Touch targets under 44px on mobile (segmented buttons 38px, sort buttons 24px, checkbox 18px, footer links 29px, tiles 41px). Fix: apply `min-height: var(--target-touch)` under `@media (pointer: coarse)` to .seg button, .dtable th button, checkbox label, .app-footer a; enlarge hit area of "TSE" and "Saiba mais" links with padding. Files: src/styles/components.css, layout.css (token exists in tokens.css).

### Low
4. Desktop CLS 0.108 from `.app-footer` (reproducible). Fix: give `#app` a `min-height: 100vh` (or render the footer only after the first view mounts) and keep the loader overlay until the footer exists. Files: index.html (#app), src/styles/layout.css, src/app.js:42.
5. Favicon: add `/favicon.ico` (or PNG 48x48/192x192), `apple-touch-icon.png` (180x180) and a minimal manifest; move favicon out of the immutable-cached /assets/ path or version the filename. Files: public/assets/favicon.svg, index.html, vercel.json (header rule for /assets/(.*)).
6. Only the cartogram has an accessible name; other charts/canvas lack title/desc or aria-label (not verified for canvas). Add `role="img"` + `aria-label` summary (e.g. "Lula 51,79%, Flavio Bolsonaro 48,21%") to chart containers and the map canvas, and keep a visible data table (already present on most pages). Files: src/ chart modules.
7. Small text: 11-12px in cartogram sublabels and chart axes. Contrast tokens are good (gray-500 5.2:1, documented), but 11px is below common 12px minimum on mobile. Raise .tilegrid text.sub to 12px (components.css:166) at least on mobile.
8. OG image: add `twitter:image`, `twitter:title`, `twitter:description` for deterministic cards; consider a short `cache-control` of 1 day plus `stale-while-revalidate` for /og/ via vercel.json; keep the OG wording "2.876 (incl. 1 empate)" aligned with the site's counting rule. Files: index.html, vercel.json, public/og/.
9. Mobile tab bar: add a right-edge fade/scroll hint so users know there are 6 more sections. Files: src/styles/layout.css.

### Positives (keep)
- No horizontal overflow on any route/viewport; semantic landmarks, skip link, focus-visible and reduced-motion support; strong typographic hierarchy; OG image is high quality, correct size, and has alt text; colour tokens documented with contrast ratios; keyboard-focusable map.

## Structured findings for audit-data.json (Visual / Images)
```json
{"visual":{"score":82,"findings":[
{"id":"vis-cookie-banner-fold","severity":"medium","evidence":"mobile banner y605 h191 of 812","fix":"slim banner on mobile"},
{"id":"vis-mobile-filter-chrome","severity":"medium","evidence":"~270px filters before H1/map; map below fold on #/mapa; filters shown on #/sobre","fix":"collapse filters into sheet, hide on sobre"},
{"id":"vis-touch-targets","severity":"medium","evidence":"38px segs, 24px sort buttons, 18px checkbox, 29px footer links","fix":"min-height var(--target-touch) on coarse pointers"},
{"id":"vis-cls-desktop","severity":"low","evidence":"CLS 0.108 from .app-footer (3 runs)","fix":"min-height on #app / delay footer"},
{"id":"vis-small-text","severity":"low","evidence":"11-12px chart/tile labels","fix":"12px min on mobile"}]},
"images":{"score":70,"findings":[
{"id":"img-no-favicon-fallbacks","severity":"low","evidence":"/favicon.ico, apple-touch-icon.png, site.webmanifest all 404; svg under immutable /assets/","fix":"add PNG/ICO + versioned name"},
{"id":"img-chart-alt","severity":"low","evidence":"0 img elements; only cartogram has aria-label","fix":"role=img+aria-label on charts and canvas"},
{"id":"img-twitter-tags","severity":"low","evidence":"only twitter:card present","fix":"add twitter:image/title/description"},
{"id":"img-og-ok","severity":"info","evidence":"200 image/png 1200x630 229KB, og:image:alt present"}]}}
```
