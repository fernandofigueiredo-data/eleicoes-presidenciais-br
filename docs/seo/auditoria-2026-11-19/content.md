# Content Quality and E-E-A-T: eleicoes-presidenciais-br.vercel.app

Agent: seo-content (claude-seo 2.6.2). Status: COMPLETE (first-pass partial was folded in, because the rate-limit interruption happened before any file existed).
Method: render_page.py --mode always (sandbox: true, no sandbox warning) on home plus #/mapa, #/participacao, #/mudancas, #/turnos, #/perfil, #/comparar, #/sobre, #/sobre?s=citar, #/sobre?s=faq. Raw JSON is in audit/home.json and audit/routes/*.json. Source read-only.

## Scores (heuristic, not Google signals)

| Item | Score |
|---|---|
| Content quality overall | 66/100 |
| E-E-A-T | 68/100 (Experience 14/20, Expertise 16/25, Authoritativeness 12/25, Trust 26/30) |
| AI citation readiness | 58/100 (content is excellent, delivery to crawlers is poor) |

## Measured word counts (rendered extracted_text, includes table text)

| Route | Words | h2 | Title (document.title) |
|---|---|---|---|
| home (#/nacional) | 191 | 5 | Visão Nacional |
| mapa | 1,406 | 3 | Mapa dos Vencedores |
| participacao | 1,227 | 6 | Comparecimento e Abstenção |
| mudancas | 1,279 | 6 | Mudanças entre Eleições |
| turnos | 904 | 5 | 1º e 2º Turno |
| perfil | 280 | 5 | Perfil Socioeconômico |
| comparar | 241 | 2 | Comparar |
| sobre | 3,903 | 13 | Sobre e contato |

Most of the larger counts come from data tables (716 rows on mudancas, 5,571 on participacao), not prose. Raw (pre-JS) HTML: only the head, a loader and a noscript line ("Este painel precisa de JavaScript habilitado."). Word counts are coverage context, not a ranking factor.

## What works

- Trust and transparency are the site's best asset: an explicit "não é fonte oficial do TSE", data version and download dates, SHA-256 per source file, a "Conferência com o TSE" reconciliation table (per election, shows "confere"), documented limitations (exterior, Boa Esperança do Norte, integer literacy), and MIT open code.
- Original, first-hand analysis, which is rare: the 212 / 213 / 215 reconciliation section explains three counting rules, labels each claim "Verificado na base" or "Não explicado", and does not guess at what CNN/BBC used. That is a strong experience signal and a very quotable passage.
- Dynamic headlines are written as complete, citable sentences with numbers (e.g. "Lula vence com 51,79% dos votos válidos...", "o partido vencedor mudou em 716 municípios (12,85%)"). Pages also carry "Os indicadores descrevem o município, não o eleitor" caveats.
- "Como citar" block with ready-made credit line, ABNT reference and short form: unusually good for journalists and for AI citation.
- Honest privacy section; consent-gated analytics; no em dash in any prose (measured, see Low issue 11).
- Static head is well formed: lang pt-BR, unique title, description, canonical, OG image with alt text.
- Freshness is visible ("Arquivos do site gerados em 18/11/2026"), sitemap lastmod 2026-11-19.

## Issues

### High

**H1. Substantive content is invisible to non-JS crawlers and most AI retrievers.** Evidence: raw HTML is a loader plus noscript; all 8 pages render client-side (is_spa true). The quotable material (headlines, FAQ, "Como citar", methodology) only exists after JavaScript runs. Google can render, but many AI crawlers and social unfurlers do not. Fix: put a static, real summary into the noscript/initial HTML (what the site is, 2026 result sentence, links to the 8 sections, citation line), or prerender at build. File: /election-intelligence/index.html (replace the noscript body; optionally a Vite prerender step in vite.config.js).

**H2. Eight pages share one URL, one canonical and one sitemap entry.** Evidence: every route's HTML has `canonical = https://eleicoes-presidenciais-br.vercel.app/`; sitemap.xml has a single `<loc>` with a comment acknowledging hash routes. The FAQ (13 h2 sections on sobre), the 212/213/215 explainer and the per-theme pages cannot rank or be cited as their own pages. Fix: move to path routes (/mapa, /turnos, /sobre/faq) with History API in the router plus a rewrite in vercel.json, one canonical and sitemap `<loc>` per route. Files: /election-intelligence/src/app.js (router, line ~124), /election-intelligence/vercel.json, /election-intelligence/public/sitemap.xml, index.html. This is the highest-leverage fix for both Google and AI answers.

### Medium

**M1. No structured data.** Evidence: structured_data block_count 0 on home; `grep ld+json|schema.org` over src and index.html returns nothing. Fix: add JSON-LD in index.html: WebSite, Person (Fernando Figueiredo, sameAs GitHub), and Dataset (name, description, creator, license CC-BY for TSE data, temporalCoverage 2014/2026, spatialCoverage Brasil, distribution link to the CSVs). FAQPage only helps entity understanding (Google restricts the rich result). Do not add numbers beyond what the page shows.

**M2. Meta description and OG are static for all routes.** Evidence: only `document.title` is updated per route (src/app.js:124); description, og:title, og:url stay the homepage values. Fix: update the description meta and og tags on route change, with one specific sentence per page (e.g. "Onde o vencedor virou no 2º turno de 2026: 215 municípios pela regra do DAX, 212 pela contagem estrita"). Prefer to generate from the same strings already used for the page dek. Note: once H2 is done, these must be in per-route static HTML to matter.

**M3. Homepage never says what the site is.** Evidence: home extracted_text (191 words) starts with the nav label and the result headline; the "projeto independente, não oficial, dados TSE e IBGE" statement exists only in the meta description and on #/sobre. A first-time visitor or an AI summarizer of the page sees a result with no framing. Fix: add a 2-sentence "O que é este painel" intro under the headline (independent, non-official, TSE and IBGE, 2014 to 2026, link to Metodologia). Files: /election-intelligence/src/pages/nacional.js (pageHead call), src/content/projeto.js (reuse the existing "O que é" text).

**M4. Internal tool jargon leaks into reader-facing text.** Evidence (rendered): "Quartis calculados sobre todos os municípios com dado (PERCENTILE.INC do PBIX); o PBIX guarda a alfabetização como número inteiro" (perfil); "regra DAX", "(Mudou Partido Vencedor)", "derivado não está no PBIX", "contagem estrita" (mudancas, turnos). Audience is journalists and curious citizens, not Power BI users. Fix: keep the technical term only in a collapsible "Detalhe técnico" or in the Metodologia section; in the main note write "arredondada para número inteiro" and "empate conta como virada". Files: src/pages/perfil.js, src/pages/mudancas.js, src/pages/turnos.js. Do not change any number.

**M5. Author E-E-A-T is thin for the topic.** Evidence: bio is one line ("analista de dados com mais de 10 anos em comunicação, estratégia de conteúdo e storytelling"), no photo, no role-relevant credential (electoral data, TSE work, publications), contact is a personal gmail address, no LinkedIn or other verifiable profile besides GitHub. The method evidence (SHA-256, reconciliation) is strong, but "Who" is the weakest of Google's Who/How/Why. Fix: expand the "Responsável e contato" block with 2 to 3 verifiable facts (prior data or journalism work, tools, how data checks were done), add a LinkedIn link if the owner wants it, and a domain-based email if one exists. File: src/content/projeto.js and src/pages/sobre.js (lines ~55 onward).

**M6. Several pages are almost all controls and tables, with one sentence of interpretation.** Evidence: perfil 280 words, comparar 241 words; comparar has no dek beyond a how-to line. There is no written "what this shows" (e.g. the 73,9% vs 44,1% PIB quartile gap is stated once, with no reading guide beyond the caveat). Fix: add a short, number-backed "Leitura" paragraph per page, generated from the same computed values (already done for the headline), plus a one-line definition of quartile for lay readers. Files: src/pages/perfil.js, src/pages/comparar.js.

### Low

**L1. Awkward generated grammar.** "No 2026 · 2º turno, Lula teve 73,9%..." and "2026 · 2º turno" used as a noun phrase in sentences (perfil, comparar, participacao). Fix: use "No 2º turno de 2026". Files: the template builders in src/pages/perfil.js and src/pages/participacao.js (and shared.js if the label is built there).

**L2. Rounding of Lula's share differs between pages (51,79% on home vs 51,78% in the turnos candidate table; 53.722.151 and 64.056.078 votes are municipal sums for the municipalities counted).** Evidence: turnos table row "Lula ... 51,78%" while home shows 51,79%. Different scope (exterior excluded on turnos) likely explains it, but nothing on the turnos table says so inline. Fix: add "sem o exterior" to that table's subtitle (the page already says "Municípios no exterior ficam de fora" in the note). Do not change the numbers. File: src/pages/turnos.js.

**L3. No visible publication or "last updated" line on the content pages outside #/sobre.** The generation date appears only in the Sobre section and sitemap. Fix: add "Dados do TSE de 28/10/2026" to the footer or the pageHead context on every page. File: src/pages/shared.js (pageHead).

**L4. Two-letter or empty-value placeholder is a literal em dash character.** House style forbids "—" in user-facing text. Measured rendered text: 0 occurrences in prose; the character appears as an empty-value placeholder in tables (perfil "Sem dado" row, sobre validation table) and tooltips. Source lines: src/pages/shared.js:55, comparar.js:109, mapa.js:86, mudancas.js:53 and :124, sobre.js:170 and :176. Fix: replace the `'—'` fallbacks with "n/d" or "sem dado" (the perfil row likely comes from a shared table formatter; not traced). Source code comments with "—" (file header lines) are not user-facing; leave them.

**L5. llms.txt returns 404.** Optional. Google's own guidance (2026) says no AI-specific files are needed, so do not prioritise this; H1 and H2 matter more.

## Templated metadata check

Not run through metadata_template.py: the site has one real title/description pair (the per-route description is not set, see M2). Titles per route are unique and non-templated ("Mapa dos Vencedores · ELECTION INTELLIGENCE" etc.); the only shared element is the brand suffix, which is normal. No stock CTA phrases found.

## AI-generated content markers

No generic or repetitive filler found. Text is specific, numeric, caveated and internally consistent (home, comparar and participacao totals match: 158.745.502 aptos, 80,78% comparecimento). No verification against TSE was attempted here and none is suggested; numbers should not change.

## Priority order

1. H2 (real URLs and canonicals) with H1 (static summary), then M2 (per-route meta).
2. M1 (JSON-LD Dataset and Person), M3 (what-this-site-is intro).
3. M4 (jargon), M5 (author block), M6 (reading paragraphs).
4. Low items as cleanup.
