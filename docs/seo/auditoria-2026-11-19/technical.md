# Technical SEO audit: eleicoes-presidenciais-br.vercel.app

Date measured: 2026-11-19. Method: curl, claude-seo `sitemap_discovery.py`, `transport_check.py`, existing `home.json` (render_page.py, Playwright), repo source read-only.
Browser sandbox: the render capture reports `sandbox: True` (no warning).

**Technical score: 58 / 100**

| Category | Status |
|---|---|
| Crawlability (robots, sitemap) | Pass, with a limit (1 URL) |
| Indexability | FAIL for 7 of 8 views (hash routes) |
| Security / HTTPS | Pass on HTTPS/HSTS, headers incomplete |
| URL structure | FAIL (fragment URLs) |
| Mobile | Pass on viewport (not measured further) |
| Core Web Vitals | Not measured (no field/lab data); source looks light |
| Structured data | FAIL (none) |
| JS rendering | FAIL (CSR only, 3 words raw) |
| IndexNow | Not implemented (Low) |

## What works (measured)
- HTTPS valid: TLS 1.3, cert `*.vercel.app` (Google Trust Services), 70 days to expiry (auto-renewed by Vercel). `http://` goes to `https://` in 1 hop, 308 permanent.
- HSTS `max-age=63072000; includeSubDomains; preload`; `meets_preload_requirements: true`.
- robots.txt: 200 `text/plain`, `Allow: /`, valid `Sitemap:` line. `sitemap_discovery.py` found the declared sitemap with `valid: true`, `kind: urlset`.
- `<title>`, meta description, self-referencing canonical, `lang="pt-BR"`, viewport, OG (image 1200x630, PNG 229 KB, 200) and twitter:card present in raw HTML (`index.html`).
- Assets are small and cached: JS 16,965 B gzip (44,629 raw), CSS 7,417 B gzip; `/assets/*` `Cache-Control: public, max-age=31536000, immutable`; raw HTML 3,031 B (far below Googlebot's 2 MB fetch cap).
- Unknown path returns a real 404 (`/nao-existe` gives `404 text/plain`), so there is no soft-404 problem.
- Google Search Console verification file served (`/google18c225c689ba1d80.html` gives 200).
- Rendered with JS, no console errors, `render_ms` about 3.7 s in a headless run (not a CWV measure). Rendered page has a real h1 ("Lula vence com 51,79% dos votos válidos"), 5 h2, and per-view `document.title` ("Visão Nacional · ELECTION INTELLIGENCE").
- `history.pushState/replaceState` use in `src/state/store.js` is state-to-hash sync (replaceState by default, push only on explicit `push: true`). I read it as normal SPA behaviour, not back-button hijacking.

## Issues

### Critical

**C1. Eight views live behind `#/` hash routes, so Google sees one URL.**
Evidence: `home.json` URL is `/#/nacional`; the sitemap itself notes "As páginas do site são rotas por hash... tratam como um só endereço"; sitemap contains 1 `<loc>`. Google ignores fragments, so #/mapa, #/participacao, #/mudancas, #/turnos, #/perfil, #/comparar, #/sobre (FAQ, "como citar") cannot be indexed or ranked separately and cannot carry their own title, description, canonical or backlinks. This caps organic reach at one page for the whole project.
Fix: move to path routes (`/mapa`, `/turnos`, `/sobre/faq`...). Files: `src/state/store.js` (`toHash`/`fromHash`/`hrefFor`/`shareUrl`: switch to `history.pushState` with pathnames and a `popstate` listener), `src/app.js:148` (replace `hashchange` listener), `vercel.json` (add `"rewrites": [{"source": "/((?!assets|data|geo|og|.*\\..*).*)", "destination": "/index.html"}]`, keeping the real 404 for files), `public/sitemap.xml` (one `<loc>` per route), `index.html` canonical (make per-route, see C2). Keep a one-time redirect or hash-to-path shim in `src/main.js` for old shared `#/...` links.

**C2. Content exists only after client-side JS (CSR shell); no pre-rendered HTML.**
Evidence: render capture `js_gap.raw`: 3 words, 0 links, 0 h1, 0 schema types; rendered: `is_spa: True`, about 30 KB of content. `index.html` body is a loader plus `<div id="app"></div>` and a `<noscript>` of one sentence. Googlebot renders JS, but AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot) and most social/preview bots generally do not, so the project is effectively blank to them and the FAQ/cite text is invisible.
Fix: pre-render each route at build time. Options: `vite-plugin-ssg` / `vite-ssg`-style prerender, or a small post-build script in `vite.config.js` that emits `dist/<route>/index.html` with per-route `<title>`, description, canonical, h1 and a static summary (headline numbers from `public/data/meta.json`) plus the FAQ text from `src/content/faq.js` and `src/content/projeto.js`. At minimum, expand the `<noscript>` and add a crawlable static `<nav>` with real `<a href>` links to every route in `index.html`.

### High

**H1. Per-route metadata is not updated; only `document.title` changes.**
Evidence: `src/app.js:124` sets only `document.title`. Rendered DOM keeps the homepage description and `canonical = https://.../` on the #/nacional view (rendered capture shows the same description/canonical). No `og:title/url/description` per view.
Fix: after C1, set `meta[name=description]`, `link[rel=canonical]`, `og:url/title/description` in `src/app.js` (same place as line 124), using a per-page description map added to the `PAGES` definition; the prerender step should write the same values statically.

**H2. No structured data.**
Evidence: `js_gap` raw and rendered `schema_types: []`, `structured_data.block_count: 0`; grep for `ld+json`/`schema.org` over `src/` and `index.html` returns nothing.
Fix: add JSON-LD in `index.html` (and per prerendered route): `WebSite` + `Organization`/author, `Dataset` for the TSE/IBGE data (name, description, `creator`, `temporalCoverage: "2014/2026"`, `spatialCoverage: Brasil`, `isBasedOn` URLs, `license`, `distribution` pointing at `/data/*.json`), and `FAQPage`/`BreadcrumbList` for `#/sobre?s=faq`, from `src/content/faq.js`. Note: Google restricts FAQ rich results to government/health sites, so treat FAQPage as AI/semantic markup, not a rich-result play.

**H3. Sitemap lists a single URL.**
Evidence: `sitemap.xml` has one `<url>`; `lastmod` is `2026-11-19` and is hard-coded in `public/sitemap.xml` (will go stale).
Fix: list all path routes after C1; generate the sitemap at build in `vite.config.js` with real `lastmod` from the data build date (`public/data/meta.json`).

### Medium

**M1. No HTML cache or revalidation tuning for the document and a short TTL for data.**
Evidence: HTML `cache-control: public, max-age=0, must-revalidate` (fine, ETag present). Data JSON `public, max-age=3600`, about 420 KB gzip combined for first screen (170,118 + 99,256 + 152,406 + 2,370 bytes transfer). `index.html` preloads four JSON files via `<link rel=preload as=fetch>`, which is good for LCP but heavy on slow mobile.
Fix: keep preloads; in `vercel.json` raise `/data/(.*)` to `max-age=86400, stale-while-revalidate=604800` (or content-hash the data filenames and use `immutable`). Consider shipping a lighter first-screen payload (aggregate for national view) to protect LCP. Measure with PSI/CrUX before acting: no CWV was measured here.

**M2. Loader overlay and layout shift risk are unmeasured.**
Evidence: `#loader` covers the app until JS and JSON arrive; render took about 3.7 s in headless (render time, not LCP). No lab LCP/CLS/INP captured in this audit.
Fix: run Lighthouse/PageSpeed on the production URL; if LCP element is the headline `h1` or the map, add static critical text in `index.html` (ties in with C2).

**M3. Security headers missing.**
Evidence (`transport_check.py` findings): `csp-missing` (Low), `nosniff-missing` (Low), `clickjacking-protection-missing` (Low), `referrer-policy-missing` and `permissions-policy-missing` (Info). Headers are a trust/security matter, not a ranking signal.
Fix in `vercel.json` `headers` block for `/(.*)`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`; only if embedding is not wanted), `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a CSP tuned to the Vite bundle (self + any analytics host).

### Low

**L1. `access-control-allow-origin: *` on the HTML document.** Evidence: response header on `/`. Harmless for public data JSON; unnecessary on HTML. Fix: scope CORS in `vercel.json` to `/data/(.*)` and `/geo/(.*)` only (Vercel adds `*` for static by default; override only if a stricter policy is wanted).

**L2. `www.` host has no valid certificate** (`tls-sibling-not-covered`, Medium in script). Evidence: SAN is only `*.vercel.app`; `www.eleicoes-presidenciais-br.vercel.app` fails hostname verification. This is a vercel.app subdomain, so a `www.` variant is irrelevant; it only matters once a custom domain is attached. Fix when adding a custom domain: add both apex and `www` in Vercel and redirect one to the other.

**L3. Single social image is reused for all views.** `og:image` is one PNG (229 KB, fine). Fix with C1: per-route OG images where useful (`public/og/`).

**L4. No IndexNow.** Not implemented. Low value for a Google-centric Brazilian audience; Bing/Yandex only. Fix: add a key file in `public/` and ping on deploy if desired.

**L5. `publication_date` in the render capture is `2026-01-01` (inferred by the tool, not from the page).** Add `datePublished`/`dateModified` in the JSON-LD of H2 from `meta.json`.

## Not measured (do not treat as pass)
- Core Web Vitals field data (CrUX) and lab Lighthouse; touch-target sizes; mobile/desktop content parity beyond the viewport tag; Search Console indexing status; redirect behaviour for `/index.html`; `llms.txt`.
- Mixed content (`page_checks.py` not run); no non-HTTPS resource URLs seen in `index.html`.

## Priority order
1. C1 path routes + rewrites + multi-URL sitemap
2. C2 build-time prerender (also fixes AI-crawler visibility)
3. H1 per-route title/description/canonical/OG
4. H2 JSON-LD (Dataset, WebSite, FAQPage)
5. M3 security headers and M1 data caching
