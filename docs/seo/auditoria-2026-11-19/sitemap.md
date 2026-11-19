# Sitemap audit - eleicoes-presidenciais-br.vercel.app

Score: 55/100 (file is valid, but it covers 1 URL; 8 views are invisible to search)

## Evidence
- sitemap_discovery.py --expand: 1 sitemap (robots.txt-declared, HTTP 200, valid urlset), 1 URL, 342 bytes, no duplicates, no invalid loc, 1 lastmod (2026-11-19). Common-path probes (sitemap_index, sitemap-index, wp-sitemap) return 404, which is expected.
- robots.txt: `Allow: /` + Sitemap line, correct.
- Live HTTP: `/` 200; `/mapa`, `/turnos`, `/uf/sp` all 404 (text/plain). Vercel has no SPA rewrite, so path URLs do not exist today.
- Root HTML: canonical = root, title present, only ~17 visible words in the raw HTML (JS-rendered shell).
- vercel.json: only cache headers for /assets and /data. No rewrites, no cleanUrls.
- store.js: routes are `#/<id>` parsed from location.hash (8 pages), default 'nacional'. Fragments are not sent to the server and Google ignores them.

## Findings (by severity)
1. HIGH - Only 1 of 9 logical pages is indexable. #/mapa, #/turnos etc. cannot be in a sitemap (fragments are ignored; listing them is invalid-in-effect). The sitemap is correct for what exists, but coverage is ~11%.
2. HIGH - Path URLs would 404 today (confirmed /mapa 404). Moving to real paths requires a build-time prerender per page (not just a rewrite to index.html, which gives empty-shell soft-duplicates with the same canonical) plus a legacy `#/x` -> `/x` client redirect, self-referencing canonicals and per-page title/description/H1.
3. MEDIUM - Raw HTML has almost no text; prerendered pages must contain real text (heading, methodology summary, key numbers/table) in the HTML, not only canvas/chart output.
4. LOW - lastmod equals today's date (2026-11-19), likely stamped at build/deploy. Google ignores lastmod it finds unreliable. Use the date the underlying data/content last changed (e.g. TSE data refresh), per page.
5. INFO - Comment inside sitemap.xml is fine. No priority/changefreq (good).

## Which URLs deserve to be in the sitemap
| Candidate | Count | Verdict |
|---|---|---|
| Root `/` (Visao Nacional) | 1 | Yes, already there |
| 7 other views as prerendered paths (/mapa, /participacao, /mudancas, /turnos, /perfil, /comparar, /sobre) | 7 | Yes, if each has unique text + metadata. /comparar is a tool: include only if it ships a useful default-state static content; otherwise leave out or noindex parameter variants |
| UF pages /uf/xx | 27 | Yes, worth it. Real search demand ("votos presidente SP 2022"), unique data per state (results per election, winner shift, turnout, top/bottom municipalities), 27 is below the 30-page warning threshold. Gate: each page needs state-specific narrative/data, not a swapped name |
| Municipality pages | ~5,570 | NOT now. Exceeds the 50-page hard-stop threshold; needs explicit justification |

## Quality gates for the municipality idea (5,570 pages)
Triggers the plugin's HARD STOP (50+ location pages): require explicit justification. Programmatic/doorway risk is high because most pages would be one data row with a swapped name. Only proceed if ALL hold:
1. Each page has >=60% unique content: per-municipality results for 2014/2018/2022 (+2026 when available), winner flips, turnout, margin, comparison to the UF and national average, rank within UF - computed text, not a template with a name swap.
2. >=200-300 words of genuinely data-driven prose in the HTML plus a data table, rendered server-side/prerendered.
3. Unique title/meta/H1 and structured data (Dataset/BreadcrumbDescription) per page; self-canonical.
4. Internal linking: breadcrumbs Brasil > UF > municipality, links to neighbours/UF; no orphan pages (orphan = not worth indexing).
5. Staged rollout: pilot 100-200 largest municipalities (capitals, top turnout), measure indexation and impressions in Search Console for 4-6 weeks before expanding. Small municipalities with near-identical profiles: noindex or leave out of the sitemap.
6. Sitemap index with files of <=50,000 URLs (5,570 fits one file, but split by type: pages / uf / municipios) so indexation per type is visible in Search Console.
7. Build/perf: 5,570 prerendered pages must keep Vercel build time and deploy size reasonable; prefer generating from the existing /data JSON.
8. Kill switch: if "Crawled - currently not indexed" exceeds ~50% after the pilot, noindex the long tail.
Recommendation: do (7+1 pages) now, UF pages next, municipality pilot last and only if search demand/analytics justify it.

## Proposed sitemap.xml (after migrating to prerendered paths; lastmod values are placeholders - replace with real content-change dates)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://eleicoes-presidenciais-br.vercel.app/</loc><lastmod>2026-11-19</lastmod></url>
  <url><loc>https://eleicoes-presidenciais-br.vercel.app/mapa</loc><lastmod>2026-11-19</lastmod></url>
  <url><loc>https://eleicoes-presidenciais-br.vercel.app/participacao</loc><lastmod>2026-11-19</lastmod></url>
  <url><loc>https://eleicoes-presidenciais-br.vercel.app/mudancas</loc><lastmod>2026-11-19</lastmod></url>
  <url><loc>https://eleicoes-presidenciais-br.vercel.app/turnos</loc><lastmod>2026-11-19</lastmod></url>
  <url><loc>https://eleicoes-presidenciais-br.vercel.app/perfil</loc><lastmod>2026-11-19</lastmod></url>
  <url><loc>https://eleicoes-presidenciais-br.vercel.app/comparar</loc><lastmod>2026-11-19</lastmod></url>
  <url><loc>https://eleicoes-presidenciais-br.vercel.app/sobre</loc><lastmod>2026-11-19</lastmod></url>
  <!-- phase 2: 27 x /uf/{ac,al,ap,am,ba,ce,df,es,go,ma,mt,ms,mg,pa,pb,pr,pe,pi,rj,rn,rs,ro,rr,sc,sp,se,to} -->
</urlset>
```
Phase 3 (only after pilot): sitemap index -> sitemap-paginas.xml, sitemap-uf.xml, sitemap-municipios.xml.

## Implementation notes
- Add vercel.json `cleanUrls`/`trailingSlash:false` and either per-route prerendered HTML (e.g. vite-ssg / prerender script) or rewrites; verify each path returns 200 with distinct HTML and self-canonical.
- Keep hash links working: on load, map `#/x` to `/x` via history.replaceState to avoid duplicate/broken old shares.
- Update robots.txt only if needed (already fine); keep Sitemap line.
- Submit the sitemap in Search Console after migration; keep sitemap.xml under public/.
