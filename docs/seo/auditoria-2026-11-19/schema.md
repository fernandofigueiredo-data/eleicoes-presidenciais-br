# Schema / Structured Data audit: eleicoes-presidenciais-br.vercel.app

**Score: 15/100** (no structured data at all; strong foundation of facts available to fix it quickly)
Tool: render_page.py (Playwright, sandbox: true). Rendered DOM and raw HTML both show `structured_data.block_count = 0`. No Microdata/RDFa found either.

## Detection
| Format | Raw HTML | Rendered DOM |
|---|---|---|
| JSON-LD | 0 | 0 |
| Microdata / RDFa | 0 | 0 |

Raw HTML is a 3-word SPA shell (index.html), so JSON-LD must be placed statically in `index.html`'s `<head>` (server-rendered), not injected by JS.

## Findings (by severity)
1. **HIGH: No JSON-LD at all.** Evidence: block_count 0. Missing: WebSite, Dataset (Google Dataset Search is the one schema surface that matters here), author Person, WebApplication.
2. **HIGH: Dataset markup absent despite real downloadable files.** `public/data/viradas_criterios.csv` and `public/data/turnos/{2014..2026}-{1,2}.json` return 200 with correct content types (verified by curl and filesystem), so a Dataset with `distribution` is truthful and eligible. Google requires `name` + `description`; recommended `license`, `creator`, `distribution`, `temporalCoverage`, `spatialCoverage`, `keywords`.
3. **MEDIUM: Hash routes limit per-page schema.** `#/nacional`, `#/mapa` etc. share one URL for crawlers (sitemap says so too). Schema belongs to `/` only; do not add per-route schema. Stable entity `@id`s anchored on `/#fragment` avoid conflicts.
4. **MEDIUM: Authorship/entity signals not machine-readable.** Author, repo, MIT license and citation text exist in `src/content/projeto.js` but only in the JS-rendered Sobre page. Person node with sameAs to GitHub fixes this.
5. **LOW: FAQ is user-visible (`#/sobre?s=faq`, 11 Q&As) but not marked up.** See FAQPage verdict below.
6. **INFO: No Organization/logo schema.** Correct to skip: single-author project, no organization, only an SVG favicon (Google logo guidance wants raster, 112px+). Do not invent an Organization.

## FAQPage verdict: do NOT add
Google retired FAQ rich results for all sites on 2026-05-07 (per plugin rules; earlier restricted to gov/health in Aug 2023). No SERP benefit; AI/GEO benefit unconfirmed. Also, the FAQ lives on a hash route (`#/sobre?s=faq`) and is rendered client-side, so markup on `/` would describe content not present on that URL's initial HTML (and would risk a content/markup mismatch). Skip. If anything, the CSV/JSON files plus Dataset description carry the same information better. (Not a QAPage case either: no user-submitted Q&A.)

## Validation of proposed block
- Valid JSON; single `@graph`, `@context` "https://schema.org"; 6 nodes; 0 unresolved `@id` refs; 0 placeholders; all URLs absolute; all 9 distribution URLs exist locally and return 200 live (CSV `text/csv`, JSON `application/json`).
- Types used are all active (none deprecated). Dataset has no Search rich result; consumed by Dataset Search only.
- Google Rich Results Test does not cover Dataset; validate with schema.org validator (validator.schema.org) and check Dataset Search eligibility after indexing.
- Only facts present in source were used (projeto.js, faq.js, README, LICENSE, meta.json, index.html meta tags).

## Items to confirm before pasting
1. **Dataset license version.** README says only "TSE ... licença CC-BY" (no version). I used `creativecommons.org/licenses/by/4.0/`; confirm the TSE portal states 4.0. If unsure, drop `license` from Dataset (only warning, not an error). Derived-data licensing for the project's own JSON/CSV is also not stated: README says "Os dados seguem as licenças das fontes", which is consistent with CC-BY attribution.
2. **IBGE URL** `https://www.ibge.gov.br/` and TSE `https://www.tse.jus.br/` are canonical home pages added by me (not in source); correct but not from repo files.
3. **No datePublished/dateModified/version** on purpose: no authoritative publish date in source. `public/data/meta.json` has `gerado_em` 2026-11-19T00:11:28+00:00; if you want `dateModified`, generate it at build time from that field, otherwise it goes stale.
4. **Person.description** copies `PROJETO.funcao` (marked in source as "só o que consta do perfil público no GitHub"). Email deliberately omitted (spam); add `"email": "mailto:..."` only if desired.
5. `applicationCategory: ReferenceApplication` and `operatingSystem` are my choices; WebApplication has no Google rich result, so low risk.
6. Dataset `url` points to `/` (the only indexable URL). Sitemap lists only `/`.
7. Counts in descriptions (5.571 municipios, 195 exterior) come from `O_QUE_E`/FAQ; README says 5.570 map polygons (consistent: 5.570 with map vs 5.571 in data). Re-check if data changes.

## Implementation
Paste inside `<head>` of `index.html`, e.g. after the `twitter:card` meta, as `<script type="application/ld+json">…</script>`. Vite keeps it verbatim in the build. Add a test (like `tests/divulgacao.test.js`) asserting the block parses and that `distribution` files exist in `public/data`. Optional hygiene: add `<meta name="author" content="Fernando Figueiredo">`.

## JSON-LD (ready to paste)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://eleicoes-presidenciais-br.vercel.app/#website",
      "url": "https://eleicoes-presidenciais-br.vercel.app/",
      "name": "ELECTION INTELLIGENCE",
      "alternateName": "ELECTION INTELLIGENCE · Análise Eleitoral Brasileira",
      "description": "Projeto independente e não oficial: como cada município votou para presidente em 2014, 2018, 2022 e 2026, com dados do TSE e do IBGE.",
      "inLanguage": "pt-BR",
      "publisher": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#autor" },
      "creator": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#autor" }
    },
    {
      "@type": "WebPage",
      "@id": "https://eleicoes-presidenciais-br.vercel.app/#webpage",
      "url": "https://eleicoes-presidenciais-br.vercel.app/",
      "name": "ELECTION INTELLIGENCE · Análise Eleitoral Brasileira (projeto independente)",
      "description": "Projeto independente e não oficial: como cada município votou para presidente em 2014, 2018, 2022 e 2026, com dados do TSE e do IBGE. Mapa, viradas entre turnos, abstenção, perfil socioeconômico, como citar e contato.",
      "inLanguage": "pt-BR",
      "isPartOf": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#website" },
      "about": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#dataset" },
      "mainEntity": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#app" },
      "primaryImageOfPage": {
        "@type": "ImageObject",
        "url": "https://eleicoes-presidenciais-br.vercel.app/og/election-intelligence-1200x630.png",
        "width": 1200,
        "height": 630,
        "caption": "Mapa do Brasil por município com o vencedor do 2º turno de 2026: vermelho para Lula, azul para Flavio Bolsonaro."
      }
    },
    {
      "@type": "WebApplication",
      "@id": "https://eleicoes-presidenciais-br.vercel.app/#app",
      "name": "ELECTION INTELLIGENCE",
      "url": "https://eleicoes-presidenciais-br.vercel.app/",
      "description": "Painel interativo com os resultados para presidente nos dois turnos de 2014, 2018, 2022 e 2026 em 5.571 municípios e 195 cidades do exterior, relacionados a população, alfabetização e PIB per capita do IBGE. Vencedores por município, comparecimento e abstenção, mudanças entre eleições, viradas entre turnos e perfil socioeconômico, com filtros compartilháveis e exportação em CSV.",
      "inLanguage": "pt-BR",
      "applicationCategory": "ReferenceApplication",
      "operatingSystem": "Qualquer sistema com navegador web",
      "browserRequirements": "Requer JavaScript habilitado",
      "isAccessibleForFree": true,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL" },
      "license": "https://opensource.org/licenses/MIT",
      "author": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#autor" },
      "isBasedOn": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#dataset" },
      "sameAs": "https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br"
    },
    {
      "@type": "Dataset",
      "@id": "https://eleicoes-presidenciais-br.vercel.app/#dataset",
      "name": "Resultados das eleições presidenciais por município (2014, 2018, 2022 e 2026) com indicadores do IBGE",
      "alternateName": "ELECTION INTELLIGENCE · base de resultados por município",
      "description": "Resultados para presidente do Brasil nos dois turnos de 2014, 2018, 2022 e 2026, por município (5.571 municípios e 195 cidades do exterior), com comparecimento, abstenção, votos brancos e nulos, e relacionados a população, alfabetização (Censo 2022) e PIB per capita do IBGE. Elaborado por projeto independente a partir dos dados abertos do TSE; não é fonte oficial. Os números oficiais devem ser confirmados no TSE.",
      "url": "https://eleicoes-presidenciais-br.vercel.app/",
      "inLanguage": "pt-BR",
      "keywords": [
        "eleições presidenciais",
        "resultados por município",
        "TSE",
        "IBGE",
        "abstenção",
        "comparecimento",
        "viradas entre turnos",
        "perfil socioeconômico",
        "Brasil",
        "2014",
        "2018",
        "2022",
        "2026"
      ],
      "temporalCoverage": "2014/2026",
      "spatialCoverage": { "@type": "Place", "name": "Brasil" },
      "isAccessibleForFree": true,
      "license": "https://creativecommons.org/licenses/by/4.0/",
      "creator": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#autor" },
      "publisher": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#autor" },
      "isBasedOn": [
        {
          "@type": "Dataset",
          "name": "Portal de Dados Abertos do TSE: votação por zona eleitoral",
          "url": "https://dadosabertos.tse.jus.br/",
          "creator": { "@type": "GovernmentOrganization", "name": "Tribunal Superior Eleitoral (TSE)", "url": "https://www.tse.jus.br/" }
        },
        {
          "@type": "Dataset",
          "name": "IBGE: Censo 2022 (população e alfabetização), PIB dos Municípios e Malhas Territoriais",
          "url": "https://www.ibge.gov.br/",
          "creator": { "@type": "GovernmentOrganization", "name": "Instituto Brasileiro de Geografia e Estatística (IBGE)", "url": "https://www.ibge.gov.br/" }
        }
      ],
      "citation": "Fonte: TSE e IBGE. Elaboração: ELECTION INTELLIGENCE (https://eleicoes-presidenciais-br.vercel.app/).",
      "variableMeasured": [
        "Votos válidos por candidato e município",
        "Comparecimento e abstenção",
        "Votos brancos e nulos",
        "População (Censo 2022)",
        "Alfabetização (Censo 2022)",
        "PIB per capita"
      ],
      "distribution": [
        { "@type": "DataDownload", "name": "Critérios de viradas entre turnos por município (2026)", "encodingFormat": "text/csv", "contentUrl": "https://eleicoes-presidenciais-br.vercel.app/data/viradas_criterios.csv" },
        { "@type": "DataDownload", "name": "Resultados 2014, 1º turno (JSON)", "encodingFormat": "application/json", "contentUrl": "https://eleicoes-presidenciais-br.vercel.app/data/turnos/2014-1.json" },
        { "@type": "DataDownload", "name": "Resultados 2014, 2º turno (JSON)", "encodingFormat": "application/json", "contentUrl": "https://eleicoes-presidenciais-br.vercel.app/data/turnos/2014-2.json" },
        { "@type": "DataDownload", "name": "Resultados 2018, 1º turno (JSON)", "encodingFormat": "application/json", "contentUrl": "https://eleicoes-presidenciais-br.vercel.app/data/turnos/2018-1.json" },
        { "@type": "DataDownload", "name": "Resultados 2018, 2º turno (JSON)", "encodingFormat": "application/json", "contentUrl": "https://eleicoes-presidenciais-br.vercel.app/data/turnos/2018-2.json" },
        { "@type": "DataDownload", "name": "Resultados 2022, 1º turno (JSON)", "encodingFormat": "application/json", "contentUrl": "https://eleicoes-presidenciais-br.vercel.app/data/turnos/2022-1.json" },
        { "@type": "DataDownload", "name": "Resultados 2022, 2º turno (JSON)", "encodingFormat": "application/json", "contentUrl": "https://eleicoes-presidenciais-br.vercel.app/data/turnos/2022-2.json" },
        { "@type": "DataDownload", "name": "Resultados 2026, 1º turno (JSON)", "encodingFormat": "application/json", "contentUrl": "https://eleicoes-presidenciais-br.vercel.app/data/turnos/2026-1.json" },
        { "@type": "DataDownload", "name": "Resultados 2026, 2º turno (JSON)", "encodingFormat": "application/json", "contentUrl": "https://eleicoes-presidenciais-br.vercel.app/data/turnos/2026-2.json" }
      ],
      "sameAs": "https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br"
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": "https://eleicoes-presidenciais-br.vercel.app/#codigo",
      "name": "eleicoes-presidenciais-br",
      "codeRepository": "https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br",
      "programmingLanguage": "JavaScript",
      "license": "https://opensource.org/licenses/MIT",
      "author": { "@id": "https://eleicoes-presidenciais-br.vercel.app/#autor" }
    },
    {
      "@type": "Person",
      "@id": "https://eleicoes-presidenciais-br.vercel.app/#autor",
      "name": "Fernando Figueiredo",
      "url": "https://github.com/fernandofigueiredo-data",
      "description": "Analista de dados com mais de 10 anos em comunicação, estratégia de conteúdo e storytelling.",
      "sameAs": ["https://github.com/fernandofigueiredo-data"]
    }
  ]
}
</script>
```
