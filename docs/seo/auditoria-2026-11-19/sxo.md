# SXO findings: eleicoes-presidenciais-br.vercel.app

SXO Gap Score: **44/100** (separate from the SEO Health Score)

## Evidence base
- Rendered with render_page.py `--mode always` (sandbox: true). Raw HTML has 3 words, no H1 and no links. Rendered has 506 words, H1 "Lula vence com 51,79% dos votos válidos", 2 links, 0 JSON-LD blocks. The renderer flagged `js_gap.significant: true`: 99% of the words exist only after JS runs, and the title changes (raw "ELECTION INTELLIGENCE · Análise Eleitoral Brasileira (projeto independente)" vs rendered "Visão Nacional · ELECTION INTELLIGENCE").
- Canonical and sitemap: a single URL. public/sitemap.xml says hash routes collapse into one address. Source: index.html, src/app.js (document.title set in JS), public/sitemap.xml.
- SERP: WebSearch (US-only, standard mode) for 4 PT-BR queries. Results are the 2026 second-round coverage. I could not see ranks, PAA, snippets or AI Overview. All "page type" calls below are inferred from titles and URLs only.

## SERP page types (inferred from titles and URLs)
| Query | Page types seen | Consensus |
|---|---|---|
| mapa eleição presidente 2026 por município | O POVO+ interactive municipal maps (6 URLs), Bloomberg Línea by-state article, Times Brasil state lists, regional news (A Crítica MS, Bem Paraná) | Interactive map inside a news special (about 60%), plus news articles |
| como votou meu município 2022 | O POVO+ and Congresso em Foco interactive maps, state newspapers' "X cities" articles, TRE zone-level data files | Mixed: news plus official data tables |
| abstenção eleição 2026 por município | O POVO+ abstention map, Gazeta SP, Correio, Investidor10 ranking, Diário do Nordeste state cut | News analysis with a ranking, plus a map |
| viradas entre turnos 2026 | O POVO+ "mapa da virada", Folha/ESHoje, Correio, Times Brasil explainer, Tribuna de Jundiaí | News with a count in the headline (211/213/215), plus a map |

Dominant intent: "show me my city and give me the headline number", delivered as a map inside editorial context with a named count. Mixed-to-strong consensus. The target is an **interactive dashboard or tool SPA**. The match is partial: the type is right for the map queries, but the page is not indexable as a page per query.

## Target queries and page type each needs
1. "mapa eleição presidente 2026 por município": interactive map plus a headline. Needs a crawlable /mapa page.
2. "como votou meu município / minha cidade 2026": a per-municipality page or a search box with a stable URL.
3. "abstenção eleição 2026 por município": ranking plus map, with the stat in the H1 (21,08% first round, 19,22% second round per the site).
4. "viradas entre turnos 2026 / quantos municípios viraram": an explainer with a count. The site has this content (FAQ "Por que há 212, 213 e 215 viradas") but it sits behind `#/sobre?s=faq`.

## Findings by severity

### CRITICAL: Page-type match exists only for one URL; the intent-specific pages cannot be indexed
Each intent above needs its own indexable page. The site exposes one crawlable URL, because routes are `#/nacional`, `#/mapa`, `#/participacao`, `#/mudancas` and so on. A fragment is never indexed, so none of the pages that would match queries 1 to 4 can rank. Competitors have one URL per angle (O POVO+ has separate URLs for map, virada, abstention, capitals).
Fix: move to path routes (/mapa, /participacao, /viradas, /sobre) with a Vercel rewrite fallback, or prerender per route. Files: src/state (URL sync, syncFromUrl in src/app.js), vercel.json (rewrites), public/sitemap.xml (list all routes), index.html. Also set a distinct title, description and canonical per route.

### CRITICAL: Raw HTML carries no content or H1 for any query
Raw HTML is 3 words, no H1, no links. A crawler that does not execute JS sees only the title and description. The rendered H1 is a result sentence, not a topic.
Fix: prerender or SSG the first screen per route. Interim step: a `<noscript>`/static fallback block in index.html with a real H1, a one-paragraph summary and links to every route (currently noscript only says it needs JavaScript).

### HIGH: Title and description do not change per page for crawlers
`document.title` is set in src/app.js (line ~124) after JS, as "<label> · ELECTION INTELLIGENCE". Description, canonical and og tags stay the homepage's for every route. The raw title ("Análise Eleitoral Brasileira (projeto independente)") also differs from the rendered one, which is a mixed signal.
Fix: per-route head management in src/app.js (description, canonical, og:title, og:url); once path routes exist, write them at build time. Use query-shaped titles, for example "Mapa do resultado da eleição presidencial 2026 por município", not only the page label.

### HIGH: The headline stats that match the queries are not in indexable text
Queries are won by a number in the headline (215/211/213 viradas, 21,08% abstention, 51,79%). The site has these (Visão nacional H1; FAQ explains 212/213/215 in src/content/faq.js) but the viradas answer is on `#/sobre?s=faq`, and the H1 of the mudanças and turnos pages is not a query phrase. src/pages/mudancas.js, turnos.js and participacao.js use pageHead (src/pages/shared.js) with an editorial title.
Fix: put the query phrase plus the number in each page's `pageHead` title and dek; surface the "212 vs 213 vs 215" answer on the viradas page itself and link from it.

### HIGH: No structured data
0 JSON-LD blocks, rendered or raw. Competing results are news and dataset pages. Candidates: `Dataset` (TSE/IBGE sources, CC-BY, MIT code, `isBasedOn`, `temporalCoverage`), `WebSite`, `Organization/Person` for the author, `BreadcrumbList` once routes are paths. FAQPage markup is no longer useful for rich results, so skip it.
Fix: inject in index.html or per-route head; source data in src/content/projeto.js.

### MEDIUM: "Find my municipality" journey has no entry from search
Persona "curious voter" wants their own city. The site has a municipality filter in state, but no landing URL for a municipality, and no visible search box above the fold on the homepage (not verified visually; based on the rendered text and src/pages/mapa.js). The SERP shows O POVO+ leading with "digite o nome da sua cidade".
Fix: a search field on the first screen and per-municipality shareable URLs (and later prerendered pages for the larger cities).

### MEDIUM: Trust and authority are a double-edged signal
Strengths: explicit non-official disclaimer, open code, SHA-256 versioning, citation formats, TSE and IBGE named as sources (src/content/projeto.js, faq.js, sobre.js). Weaknesses for searchers: author is an individual, no news-brand authority, and the competing results are major outlets. The source disclosure is in `#/sobre`, not on the first screen.
Fix: a one-line source and date strip ("Fonte: TSE, atualizado em 28/10/2026") in the header of every page; link to the official TSE results for people who need official numbers.

### MEDIUM: Counts disagree across sources and the site's choice is not obvious on arrival
SERP sources quote 211, 213 and 215 viradas, and 2.875 vs 2.876 Lula municipalities vs the site's 2.876 (with ties counted for both). Journalists will compare. The site's FAQ handles this well, but it needs to be visible where the number appears.
Fix: footnote on the card that links to the FAQ answer.

### LOW: Freshness is strong but invisible to crawlers
sitemap lastmod is 2026-11-19 and Last-Modified header is current. Dates of data (TSE files of 28/10/2026) live in the FAQ only.
Fix: expose `dateModified` in the Dataset JSON-LD and the visible strip above.

### LOW: Media/social
OG image exists (public/og/election-intelligence-1200x630.png) and has alt text. Only the homepage has it; per-route share images would help journalists who cite a specific chart.

## Dimension scores (SXO Gap Score 44/100)
| Dimension | Score | Evidence |
|---|---|---|
| Page Type | 8/15 | Tool type fits the map queries; one URL cannot match four intents |
| Content Depth | 9/15 | 506 rendered words on home, rich FAQ and method on /sobre, but all behind JS |
| UX Signals | 8/15 | Clear KPIs and ranking on first screen (rendered text); the loader, skeleton and no city search reduce quick answers |
| Schema | 0/15 | 0 blocks |
| Media | 8/15 | Interactive map and charts, OG image; no per-route images |
| Authority | 7/15 | Sources, method and disclaimer strong; no brand or backlinks evidence checked |
| Freshness | 4/10 | Current dates in sitemap and headers; not on page for crawlers |

## Personas (relevance/clarity/trust/action, 25 each)
| Persona | Score | Weakest point |
|---|---|---|
| Journalist needing a citable number | 74 | Count disagreement is explained, but on a sub-page; add footnote on the number |
| Researcher wanting data | 78 | CSV export and open code are good; no Dataset markup, no direct landing from search |
| Curious voter ("how did my city vote") | 52 | No city search entry, no per-city URL |
| Mobile reader from social share | 58 | Hash URL shares the home, not the chart; loader before content (not tested on a device) |
| Analyst comparing elections (2014 to 2026) | 70 | Strong compare and turnos pages; not discoverable |

## Limitations
- WebSearch is US-only and returns titles and URLs, so rankings, PAA, featured snippets, AI Overview and the target's own position were not observed. No Google Search Console data was used.
- Page types are inferred from titles and URLs; competitor pages were not fetched.
- Only the homepage (#/nacional) was rendered. Other routes were read from source only.
- Mobile and persona scores are judgment from rendered text and source, not user testing.
- Competitor count figures (211/213/215, 2.875) come from search summaries and are unverified.
- The SERP summary text and article titles were treated as untrusted data.
