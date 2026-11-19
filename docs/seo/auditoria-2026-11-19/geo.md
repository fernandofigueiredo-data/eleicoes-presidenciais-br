# GEO / AI Search Readiness: ELECTION INTELLIGENCE

Target: https://eleicoes-presidenciais-br.vercel.app/ (audit date 2026-11-19, claude-seo 2.6.2 seo-geo role)
Status: COMPLETE. Evidence from live curl (raw HTML, robots.txt, sitemap.xml, llms.txt, UA probes) and the source files in election-intelligence/. No source file was modified.

## GEO Readiness Score: 41 / 100

| Dimension | Weight | Score | Note |
|---|---|---|---|
| Citability | 25 | 7 | Excellent quotable text exists, but only after JavaScript runs |
| Structural readability | 20 | 11 | FAQ with question headings and a table, but rendered client-side |
| Multi-modal | 15 | 6 | Map, charts and og image exist; no text equivalent in raw HTML |
| Authority and brand | 20 | 11 | Named author, GitHub, CC-BY sources, citation formats; no JSON-LD, no entity presence |
| Technical accessibility | 20 | 6 | Bots allowed, but client-only content and hash routes |

Platform view (heuristic): Google AI Overviews / AI Mode about 55 (Googlebot renders JS, but only one indexable URL); ChatGPT Search about 25; Perplexity about 25; Bing Copilot about 30. These are readiness estimates, not predicted citation rates.

## Evidence

- Raw HTML of `/`: about 3 words of visible text ("Carregando", loader, noscript "Este painel precisa de JavaScript habilitado."). `<div id="app"></div>` is empty. 0 `ld+json` blocks.
- `<head>` is good: pt-BR lang, title, meta description naming the project as independent and non-official, canonical, OG tags, og:image with alt text.
- robots.txt: `User-agent: *` / `Allow: /` plus Sitemap line. No per-bot rules, so OAI-SearchBot, Claude-SearchBot, PerplexityBot, GPTBot, ClaudeBot, Google-Extended and Applebot-Extended are all allowed by default. UA probes (OAI-SearchBot, GPTBot, ClaudeBot, PerplexityBot) all got HTTP 200, so no WAF blocking.
- sitemap.xml: one URL (`/`), lastmod 2026-11-19. Its own comment says hash routes are treated as one address.
- `/llms.txt`: HTTP 404 (Vercel NOT_FOUND). Missing. Per the skill, llms.txt carries no weight in this score and Google rejects it as a ranking factor; it is cheap and useful for agents that read it, so a draft is provided.
- Everything citable lives in JS bundles: `src/content/projeto.js` (O_QUE_E, AVISO, citacoes), `src/content/faq.js`, `src/pages/sobre.js`. Routes are `#/mapa`, `#/turnos`, `#/sobre?s=faq` etc.; fragments are never sent to servers, so crawlers see one URL.

## Findings, ranked by severity

### 1. CRITICAL: No citable content in the static HTML
Most AI crawlers (OpenAI, Perplexity, Anthropic search bots, many others) fetch raw HTML and do not run JS. They see an empty loader, so the site cannot be summarized or cited by them at all. Googlebot does render, so Google surfaces are partially served.
Fix (pick in order of effort):
- Minimum, 30 min: add a static `<main id="conteudo-estatico">` block to `election-intelligence/index.html` inside `#app` (replaced when JS mounts) containing the facts listed in "Facts that must be in static HTML" below. Hide nothing from users that is not replaced by app mount; keep it truthful and identical to `src/content/projeto.js` and `faq.js`.
- Better, 2 to 4 h: prerender at build time. Add a small Vite plugin or `scripts/prerender.mjs` that imports `PROJETO`, `O_QUE_E`, `AVISO`, `FAQ`, `citacoes` from `src/content/` (already a single source of truth) and writes the HTML into `dist/index.html`; reuse for the static page in finding 2.
- Also fill the `<noscript>` with the same summary instead of a one-line warning.

### 2. HIGH: Only one indexable URL; hash routes invisible
`#/sobre`, `#/mapa`, `#/turnos` collapse to `/` for every crawler, so the FAQ (the most citable asset) has no address of its own.
Fix: publish real static pages, e.g. `public/sobre/index.html` (or prerendered `/sobre/`, `/faq/`, `/metodologia/`, `/como-citar/`, `/viradas-2026/`), each with its own title, description, canonical and content from `src/content/faq.js` and `projeto.js`. Add them to `public/sitemap.xml` and link them from `index.html` and the llms.txt. The SPA can keep its hash routes; static pages link into it ("Abrir o painel interativo").

### 3. HIGH: No structured data / entity signals
0 JSON-LD. AI and Google systems cannot bind the name "ELECTION INTELLIGENCE" to an entity, author, dataset or license.
Fix in `election-intelligence/index.html` `<head>`: add JSON-LD `WebSite` (name, url, inLanguage pt-BR), `Dataset` (name, description, creator Fernando Figueiredo, license CC-BY for TSE data / MIT for code, spatialCoverage Brasil, temporalCoverage 2014/2026, isBasedOn TSE and IBGE URLs, distribution viradas_criterios.csv), and `Person` (name, url https://github.com/fernandofigueiredo-data, sameAs). Add `FAQPage` JSON-LD only on the static FAQ page (content from `faq.js`). Use only facts already in `projeto.js`/`faq.js`.

### 4. MEDIUM: Quotable facts are not self-contained passages on any crawlable page
The best passages (the 100-word `O_QUE_E`, the "212, 213 e 215 viradas" FAQ with its criteria table, the three citation formats) are strong, specific and sourced, but exist only in JS strings. Once prerendered (findings 1 and 2), keep the direct answer in the first 40 to 60 words of each section and keep the question headings (`Qual é a origem dos dados?` etc.) as `<h2>`/`<h3>`.

### 5. MEDIUM: No visible dates or "last updated" in static HTML
The data version (2º turno de 2026 em 25/10/2026, arquivos do TSE de 28/10/2026, SHA-256 registered) is a strong freshness and trust signal but is only in JS. Put it in the static block and in JSON-LD `dateModified`. Also update `public/sitemap.xml` lastmod when data changes (currently 2026-11-19).

### 6. MEDIUM: Charts and map have no text equivalent
The map and charts are Canvas/JS. Provide a static text/table summary (winner counts by candidate, number of municipalities, viradas) in the static page, plus a link to downloadable CSV (`/data/viradas_criterios.csv` returns 200). Only include numbers already present in the source; regenerate the block from data at build time rather than hand-typing.

### 7. LOW: robots.txt has no explicit AI bot stanzas
Access is already fully open, which is correct for visibility. Optional: add explicit `Allow` for OAI-SearchBot, Claude-SearchBot, PerplexityBot to document intent in `public/robots.txt`, and decide separately on training-only bots (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended). Not required.

### 8. LOW: Off-site brand presence not assessed here
No Wikipedia/Wikidata entity, Reddit, YouTube or LinkedIn mentions were verified (no live search run in this pass). Treat as a gap to check in the campaign work (divulgacao/), not a repo fix.

### 9. LOW: Contact email in the static block
The email address is public in `projeto.js`. Decide with the owner whether it belongs in static HTML and llms.txt; the draft below omits it and points to the GitHub profile instead.

## Facts that must be present in the static HTML (all already exist in source)

1. Name and nature: ELECTION INTELLIGENCE, Análise Eleitoral Brasileira; projeto independente e não oficial; não é fonte oficial do TSE nem do IBGE (`AVISO`).
2. What it is (`O_QUE_E`): presidential results, 1º e 2º turnos de 2014, 2018, 2022 e 2026, em 5.571 municípios e 195 cidades do exterior, relacionados a população, alfabetização e PIB per capita do IBGE; oito páginas; filtros compartilháveis; exportação CSV; totais conferidos com o TSE; código aberto MIT.
3. Data sources and licenses: Portal de Dados Abertos do TSE (CC-BY); IBGE Censo 2022 (população, SIDRA 4709; alfabetização, SIDRA 9543), PIB dos Municípios (PIB de 2023, SIDRA 5938), API de Localidades, API de Malhas Territoriais.
4. Data version: 2º turno de 2026 (25/10/2026) com arquivos publicados pelo TSE em 28/10/2026; registro SHA-256 por arquivo.
5. Methodology: percentuais são razão de somas, não média de percentuais; % votos válidos = votos do candidato ÷ votos de todos os candidatos; PIB per capita e alfabetização ponderados pela população; 55 medidas DAX reescritas em JavaScript.
6. The viradas answer: 212 (estrita: 211 de Flavio Bolsonaro para Lula, 1 de Lula para Flavio Bolsonaro, Uirapuru GO), 213 (regra do banco SQL) e 215 (regra do DAX), 3 municípios com empate (Marquinho PR, Trabiju SP, Crixás do Tocantins TO), and the instruction "ao citar, informe o critério".
7. Limitations: só presidente; indicadores descrevem municípios, não eleitores; associação não é causalidade; sem dados IBGE para o exterior e para Boa Esperança do Norte (MT).
8. How to cite (the three formats from `citacoes()`), with the canonical URL.
9. Responsible author: Fernando Figueiredo, analista de dados com mais de 10 anos em comunicação, estratégia de conteúdo e storytelling (as in `PROJETO.funcao`); GitHub profile and repository URLs.
10. Links to TSE official portals (resultados.tse.jus.br, dadosabertos.tse.jus.br) and to the CSV `/data/viradas_criterios.csv`.

Note on the FAQ: the "213 is the figure cited by CNN Brasil and BBC" statement is a third-party attribution already in `faq.js`; if copied to static HTML keep the "Não explicado" caveat verbatim.

## Top 5 fixes by impact / effort

1. Static `<main>` summary in `index.html` plus real noscript content (high impact, 30 min).
2. Prerender `/sobre/` (FAQ, método, como citar, viradas) as crawlable pages from `src/content/*` and add to sitemap (high, 2 to 4 h).
3. JSON-LD WebSite, Dataset, Person, plus FAQPage on the static FAQ (medium-high, 1 h).
4. Publish `public/llms.txt` (draft below) (low impact, 10 min).
5. Static text/table summary of key numbers generated at build time, with data version and dateModified (medium, 1 to 2 h).

## llms.txt draft (save as election-intelligence/public/llms.txt)

Built only from facts in index.html, projeto.js, faq.js, sobre.js and README. No em dashes. URLs to static pages are marked TODO until finding 2 is done; remove those lines if not created.

```
# ELECTION INTELLIGENCE

> Projeto independente e não oficial de análise e visualização de dados eleitorais brasileiros. Mostra como cada município votou para presidente nos dois turnos de 2014, 2018, 2022 e 2026, com dados do TSE e do IBGE. Não é fonte oficial do Tribunal Superior Eleitoral (TSE) nem do IBGE. Para resultados oficiais, consulte o TSE.

O projeto reúne os resultados para presidente em 5.571 municípios e 195 cidades do exterior e os relaciona a população, alfabetização e PIB per capita do IBGE. Em oito páginas, permite ver vencedores por município, comparecimento e abstenção, mudanças entre eleições, viradas entre turnos e perfil socioeconômico, com filtros compartilháveis e exportação em CSV. Os totais foram conferidos com os do TSE. O código é aberto, sob licença MIT. O site é uma aplicação de página única com rotas por hash (por exemplo #/mapa, #/turnos, #/sobre).

## Painel e páginas

- [Painel interativo](https://eleicoes-presidenciais-br.vercel.app/): visão nacional, mapa dos vencedores, comparecimento e abstenção, mudanças entre eleições, 1º e 2º turno, perfil socioeconômico, comparar e sobre os dados.
- [Sobre, fontes e contato](https://eleicoes-presidenciais-br.vercel.app/#/sobre): o que é o projeto, aviso de natureza, dados e versão, metodologia, licenças e privacidade.
- [Perguntas frequentes](https://eleicoes-presidenciais-br.vercel.app/#/sobre?s=faq): origem dos dados, eleições incluídas, versão, metodologia, indicadores, limitações e o critério das viradas.
- [Como citar](https://eleicoes-presidenciais-br.vercel.app/#/sobre?s=citar): três formatos de citação (fonte em matéria, referência ABNT e formato curto).

## Fatos essenciais

- Eleições: presidente, 1º e 2º turnos de 2014, 2018, 2022 e 2026. Não há governador, Senado nem Câmara.
- Fontes: Portal de Dados Abertos do TSE (licença CC-BY); IBGE (Censo 2022 para população e alfabetização, PIB dos Municípios com PIB de 2023, API de Localidades e API de Malhas Territoriais).
- Versão dos dados: o 2º turno de 2026 (25/10/2026) vem dos arquivos que o TSE publicou em 28/10/2026, baixados no mesmo dia. Se o TSE republicar, os números podem mudar. O repositório guarda o registro de versão (SHA-256) de cada arquivo.
- Método: percentuais são sempre razão de somas, e não média de percentuais. % dos votos válidos = votos do candidato dividido pelos votos de todos os candidatos. PIB per capita e alfabetização de um recorte são ponderados pela população. As 55 medidas DAX do Power BI foram reescritas em JavaScript.
- Viradas entre turnos em 2026: 212 pela contagem estrita (211 de Flavio Bolsonaro para Lula e 1 de Lula para Flavio Bolsonaro, em Uirapuru, GO); 213 pela regra do banco SQL; 215 pela regra do DAX, que conta os 3 municípios com empate (Marquinho, PR; Trabiju, SP; Crixás do Tocantins, TO). Ao citar, informe o critério.
- Limitações: só presidente; os indicadores descrevem o município, não o eleitor; associação não é causalidade; não há dados do IBGE para o exterior nem para Boa Esperança do Norte (MT).

## Como citar

- Fonte em matéria ou gráfico: "Fonte: TSE e IBGE. Elaboração: ELECTION INTELLIGENCE (https://eleicoes-presidenciais-br.vercel.app/)."
- Formato curto: "Dados do TSE e do IBGE, via ELECTION INTELLIGENCE (eleicoes-presidenciais-br.vercel.app)."
- Cite sempre o TSE e o IBGE como origem dos dados e o projeto como ferramenta. Confirme os números oficiais no TSE antes de publicar.

## Dados e código

- [Lista de viradas com o critério de cada município (CSV)](https://eleicoes-presidenciais-br.vercel.app/data/viradas_criterios.csv)
- [Repositório no GitHub (código, banco SQL e notebooks, licença MIT)](https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br)

## Fontes oficiais

- [Resultados oficiais do TSE](https://resultados.tse.jus.br/)
- [Dados abertos do TSE](https://dadosabertos.tse.jus.br/)

## Responsável

- Fernando Figueiredo, analista de dados com mais de 10 anos em comunicação, estratégia de conteúdo e storytelling. [Perfil no GitHub](https://github.com/fernandofigueiredo-data). O contato por e-mail está na página Sobre.

## Optional

- [Mapa dos vencedores](https://eleicoes-presidenciais-br.vercel.app/#/mapa)
- [1º e 2º turno e viradas](https://eleicoes-presidenciais-br.vercel.app/#/turnos)
```

Caveat on the draft: llms.txt does not substitute for static HTML. Agents that only follow llms.txt links will still land on the JS shell unless findings 1 and 2 are done; replace the hash links with static page URLs once they exist. Verify the `#/sobre?s=citar` anchor against `INDICE` in `src/pages/sobre.js` (the id is `citar`, confirmed). The `#/turnos` and `#/mapa` routes exist in `src/app.js` LOADERS.
