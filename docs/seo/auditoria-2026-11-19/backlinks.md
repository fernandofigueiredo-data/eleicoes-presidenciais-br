# Backlink Profile: eleicoes-presidenciais-br.vercel.app

Date: 2026-11-19. Tier 0 (Common Crawl + verification crawler). No Moz, Bing or DataForSEO keys.

## Score: N/A (INSUFFICIENT DATA)
Tier 0 gives no data for referring domains, quality distribution, anchors, toxicity, velocity or follow ratio. Fewer than 4 scoring factors have data, so a numeric score would mislead.

## Measured
| Metric | Result | Source / confidence |
|---|---|---|
| Host in Common Crawl web graph | Not found (not in crawl, not in rankings) | Common Crawl, release cc-main-2026-jul-aug-sep (0.50) |
| PageRank / harmonic centrality | null / null | same |
| Referring domains, anchors, spam score | Not measured (no source) | n/a |
| `vercel.app` (platform, for context only) | PageRank rank 352, harmonic rank 685, 140,004 hosts | CC (0.50) |
| Home page fetch | HTTP 200, canonical self-referencing, SPA shell (raw HTML about 3 KB, `is_spa: true`) | Parsed (0.95) |

"Not found" means the host is absent from a quarterly graph built from crawls up to about September 2026. It is consistent with a brand-new site. It is NOT proof of zero backlinks. Links added after the crawl cutoff, or on pages not crawled, would not show.

The raw HTML is a JS shell, so I could not confirm outbound links, JSON-LD or Dataset markup from it. Treat those as unverified; `/seo technical` should check them on the rendered page.

## Findings
1. **High: no measurable link profile.** Expected for a project launched in Nov 2026. Nothing to clean up, nothing toxic to disavow.
2. **High: shared `vercel.app` subdomain limits authority.**
   - The `vercel.app` metrics above belong to the platform. They do not transfer to this subdomain, which is a separate host with its own (empty) link profile.
   - Links to it accrue to this host only. If the project later moves to a custom domain, earned links stay on the old host unless 301-redirected, and ranking signals must be rebuilt.
   - Journalists, universities and Wikipedia editors often treat a free-host subdomain as lower trust. Some directories and Wikipedia-style citation policies discount such sources.
   - I could not verify this site's `robots` or Search Console state; that is out of scope here.
3. **Medium: a custom domain now is cheaper than later.** Buy a `.com.br` or `.org`, attach it in Vercel, 301 the vercel.app host, and update canonicals, sitemap and any links already shared. Do this before outreach so early links land on the permanent host.

## Recommendations (link-earning, realistic for a data project)
Priority High
- **Custom domain first** (see finding 3), then do outreach to it.
- **Publish the data openly.** Provide downloadable CSV/JSON with a licence (for example CC BY 4.0), a data dictionary and `schema.org/Dataset` JSON-LD in server-rendered HTML so Google Dataset Search can index it. Dataset pages get cited as sources.
- **GitHub repository as a link asset.** README with a clear description, link to the site, citation instructions, `CITATION.cff` and topics (eleições, TSE, dados abertos). Releases of the data with a DOI via Zenodo give a citable, permanent link.
- **Cite primary sources visibly** (TSE open data, IBGE). Being a clean derivative of official data makes it easier for others to reference you.

Priority Medium
- **Open-data and civic-tech lists:** awesome-lists for Brazilian open data, Dados Abertos / civic-tech communities, Kaggle dataset with a link back, Hugging Face dataset card.
- **Academic citation:** deposit a short methods note (SciELO Preprints, SocArXiv, Zenodo) with the data DOI; contact political-science and data-journalism courses, which often link tools and datasets.
- **Press and data journalism:** send a one-paragraph, finding-led pitch with an embeddable chart and downloadable data to data desks and fact-checkers (for example Aos Fatos, Lupa, Núcleo, Nexo). Offer exclusive, verifiable numbers rather than a project announcement.
- **Embeddable charts** with attribution link, so reuse produces backlinks.

Priority Low
- Answer questions on Reddit (r/brasil, r/datascience), Stack Exchange or LinkedIn by linking to the relevant dataset page where it genuinely helps. Expect nofollow; the value is discovery.
- Avoid paid links, link exchanges and directory spam. They carry penalty risk and are poor value for a new project.

## Re-measure
Re-run Common Crawl after the next release (about 3 months). For real referring-domain counts, add a free Moz key (2,500 rows/month) or verify Bing Webmaster ownership, and verify specific earned links with `verify_backlinks.py`.

## Skipped checks
Referring domains, anchors, toxicity, velocity, follow ratio and geography: no Tier 0 source. Pre-delivery validator not run, because no report JSON with scored factors exists.
