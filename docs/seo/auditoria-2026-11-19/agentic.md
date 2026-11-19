# Agent readiness: https://eleicoes-presidenciais-br.vercel.app/ (claude-seo 2.6.2, seo-agentic)

**Agentic score: 62/100** (analyst judgement: 100 on the a11y tree, one failed P0 on no-JS content, no access policy or discovery layer).
- Lighthouse Agentic Browsing X/N: NOT MEASURED. PSI returned HTTP 429 (daily quota, mobile and desktop). Fix: Google API key (/seo google setup), or `npx lighthouse@latest <url> --only-categories=agentic-browsing --output=json` then `--from-json`.
- Agent-UX heuristic (separate from Lighthouse): 100/100, complete, on `/#/nacional` (rendered). 715 a11y nodes, 68 interactive (45 buttons, 17 links), 0 unnamed interactive, 14 landmarks, 0 div-onclick widgets. One input lacks aria (inputs_without_aria=1).
- Raw tool output: audit/raw/{check,ux,lh}.json

## Findings by priority

### P0-1 Primary content absent without JavaScript (server-rendered: FAIL)
Evidence: agentic_check.py counted 11 words without JS, js_shell_marker=true. Source `election-intelligence/index.html` is `<div id="app"></div>` plus `<noscript>Este painel precisa de JavaScript habilitado.</noscript>`; all content is built in `src/app.js` and hash routes (#/nacional, #/mapa...). Fetchers that do not run JS (many agent and crawler fetchers) see only the shell. Hash routes also mean every "page" has the same URL path and the same HTML.
Fix (repo files):
1. `index.html`: put real static content inside `#app` (or a sibling `<main>`) that `src/main.js` replaces on boot: h1, 2-3 sentence description of the dashboard, key headline numbers, and links to each route. Expand the `<noscript>` into a short summary plus links to the data files.
2. Better: build-time prerender of the home/nacional view (vite-plugin-ssg or a small prerender script in the build), and move from hash routes to path routes with `vercel.json` rewrites so each page has a distinct crawlable HTML. (Larger change; the first item is the cheap win.)
3. Confirm by rerunning `agentic_check.py` (server-rendered should pass, >= ~100 words).

### P1-1 Machine-readable data exists but is undiscoverable
Source has `public/data` and `public/geo` (served with 1h cache, see `vercel.json`). Nothing points agents to them. Opportunity, not defect: list them in the static content above, and optionally in llms.txt (below). Verify actual file names in `public/data` before linking.

### P1-2 No llms.txt (info; Lighthouse: not-applicable)
`/llms.txt` and `/llms-full.txt` return 404 (HTML). Optional. Add `public/llms.txt` with a title, a one-paragraph summary, links to the route pages, `sobre#citar` (methodology/how to cite) and the data files. Note: Google Search ignores it; no consumer agent is confirmed to read it. Careful: a catch-all 200 would hurt; currently unknown URLs correctly return 404 (http-404 pass).

### P1-3 Markdown delivery absent (info)
`Accept: text/markdown` returns HTML, no `Vary: Accept`. Opportunity only. Low value for a hash-routed SPA until path routes exist.

### P1-4 Content-Signal absent; robots.txt has only the `*` group (info)
`public/robots.txt` is `User-agent: * / Allow: /` plus Sitemap. All AI agents fall through to `*`. This is a coherent open policy; add named groups or `Content-Signal` only if the owner wants a different training / search / user-triggered stance (owner decision, not drafted here).

### P2/P3 Not applicable / absent (no action needed)
WebMCP: 0 registerTool call sites, 0 forms, no document/navigator.modelContext (draft, W3C CG, checked 2026-09-23; a read-only dashboard has no transactions, so skip). Absent and N/A: API Catalog, OAuth metadata, A2A card, UCP, ai-catalog.json.

### Minor
One input without aria attributes (a11y heuristic): likely the search/filter field; add `aria-label` in the component under `src/components/filters` or `navigation`. Not manually verified which input.

## Passes
robots.txt reachable (200, 1 group); unknown URLs return real 404; `<html lang="pt-BR">`, canonical set; sitemap.xml 200; real buttons/links with names; user-triggered agents not blocked at root.

## Access policy (separate lines)
- Training: allowed by default (no named group, no Content-Signal).
- Search: allowed (`Allow: /`).
- User-triggered agents: not blocked; per vendor docs ChatGPT-User may not apply robots, Claude-User honours, Perplexity-User and Google-Agent generally ignore. Nothing in the site is private.
- WAF/UA matrix: not tested (no authorization given).

## Not measured / caveats
Lighthouse fraction (PSI 429). CLS, WAF behaviour, hover/focus-trap checks not tested. Agent-UX only inspected the rendered #/nacional route, not #/mapa, #/turnos, #/sobre. Standards (WebMCP, Content-Signal, ARD) are drafts as of 2026-09-23.

## Structured findings (AI Search Readiness)
- {title: "Main content requires JavaScript", severity: "high", recommendation: "Static content in index.html #app / prerender"}
- {title: "No access policy beyond User-agent *", severity: "info"}
- {title: "No llms.txt / Markdown / data discovery", severity: "low"}
- {title: "Lighthouse Agentic fraction not measured (PSI 429)", severity: "info"}
