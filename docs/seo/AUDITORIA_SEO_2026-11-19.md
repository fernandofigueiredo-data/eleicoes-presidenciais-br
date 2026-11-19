# Auditoria de SEO do ELECTION INTELLIGENCE (19/11/2026)

Site auditado: https://eleicoes-presidenciais-br.vercel.app/ (produção, antes das correções).
Ferramenta: plugin [claude-seo](https://github.com/AgriciDaniel/claude-seo) v2.6.2, com 10 agentes especialistas:
técnico, conteúdo, dados estruturados, sitemap, desempenho, visual e imagens, GEO (busca por IA),
agentes de IA, SXO (experiência de busca) e backlinks. Os relatórios de cada agente estão em
[`auditoria-2026-11-19/`](auditoria-2026-11-19/), em inglês, como os agentes os escreveram.

Sem chave de API do Google: não há dados de campo (CrUX, Search Console). Os números de desempenho
são de laboratório (Playwright com rede e CPU limitadas).

## Nota geral: 55 de 100 (antes das correções)

| Categoria | Peso | Nota | Agente |
|---|---|---|---|
| SEO técnico | 22% | 58 | seo-technical |
| Qualidade do conteúdo | 23% | 66 | seo-content (E-E-A-T 68) |
| SEO na página (título, descrição, H1, links internos) | 20% | 50 | estimativa a partir de technical, content e sxo |
| Dados estruturados | 10% | 15 | seo-schema |
| Desempenho (Core Web Vitals, laboratório) | 10% | 68 | seo-performance |
| Prontidão para busca por IA | 10% | 52 | média de seo-geo (41) e seo-agentic (62) |
| Imagens | 5% | 70 | seo-visual |

Outras notas: sitemap 55, SXO 44, visual 82. Backlinks: sem dados suficientes (o site não está no
grafo do Common Crawl; nenhum link tóxico).

## O problema central (apontado por 9 dos 10 agentes)

As oito páginas eram rotas por hash (`/#/mapa`, `/#/turnos`). O que vem depois do `#` não chega ao
servidor, então, para o Google e para os robôs de IA, o site tinha **um único endereço**. E esse
endereço entregava um HTML com cerca de 3 palavras ("Carregando…"), sem H1, sem links e sem dados
estruturados: todo o conteúdo dependia de JavaScript. Robôs que não executam JavaScript (ChatGPT,
Perplexity, Claude, prévias de link) não viam nada para citar.

## O que foi corrigido (branch `fix/seo-auditoria`)

1. **Endereço próprio para cada página.** `/`, `/mapa`, `/participacao`, `/mudancas`, `/turnos`,
   `/perfil`, `/comparar` e `/sobre`, com os filtros na query (`/turnos?uf=MG`).
   Os links antigos por hash continuam valendo: `/?utm_source=x#/turnos?uf=MG` vira
   `/turnos?utm_source=x&uf=MG` na carga, sem perder o UTM nem o filtro
   (`src/state/store.js`, `src/app.js`).
2. **HTML estático por página** (`scripts/prerender.mjs`, roda no `npm run build`): título,
   descrição, canonical e prévia de link próprios, e um resumo em texto com H1, tabelas e os números
   da base, calculados pelo mesmo motor do site (por exemplo, "Lula vence com 51,79% dos votos
   válidos", "212, 213 e 215 viradas", "716 municípios mudaram de partido"). Quando o JavaScript
   carrega, o painel substitui o resumo. A página Sobre traz no HTML o aviso, o "O que é", as
   perguntas frequentes, os formatos de citação e as licenças.
3. **Dados estruturados (JSON-LD)** em todas as páginas: WebSite, WebPage (AboutPage em /sobre),
   Person (autor), BreadcrumbList e, na raiz e em /sobre, **Dataset** com os arquivos para download
   (para o Google Dataset Search). FAQPage não foi usado: o Google deixou de mostrar esse resultado.
4. **Metadados acompanham a navegação** no navegador: título, descrição, canonical e og:url mudam a
   cada troca de página (`src/services/seo.js`).
5. **sitemap.xml com as 8 páginas**, gerado no build, com a data da última geração dos dados.
6. **llms.txt** (resumo em Markdown para assistentes de IA), gerado dos mesmos textos e números.
7. **404 de verdade** (`404.html`, fora do índice) para endereços inexistentes.
8. **Cabeçalhos de segurança** na Vercel (`vercel.json`): nosniff, Referrer-Policy,
   X-Frame-Options e Permissions-Policy; `cleanUrls` e sem barra no fim; `/nacional` redireciona
   para `/`; dados com `stale-while-revalidate`.
9. **Desempenho:** o conteúdo reserva a altura da tela, para o rodapé não pular enquanto a página
   carrega (CLS no celular era 0,284); o código da página aberta é pedido junto com os dados, e não
   depois deles.
10. **Links da campanha** (`tools/gerar_utm.py`, `utm_links.csv`, links por UF, press kit, README e
    roteiro do vídeo) passaram para o formato novo. Os links antigos já distribuídos continuam
    funcionando.

## O que ficou de fora (precisa de decisão ou de outro trabalho)

| Item | Por quê |
|---|---|
| Domínio próprio | Subdomínio `vercel.app` não acumula autoridade própria. É compra; melhor decidir antes da campanha de 27/11, para os links ganhos já apontarem para o domínio definitivo. |
| Chave de API do Google (PageSpeed, CrUX, Search Console) | Para medir Core Web Vitals de campo e indexação. |
| Páginas por UF (`/uf/sp`) | Os agentes de sitemap e SXO recomendam; cada uma precisa de texto e dados próprios do estado. Páginas por município (5.570): não agora (risco de conteúdo raso). |
| Aviso de cookies menor no celular | Cobre 24% da primeira tela (seo-visual). Mudança de interface. |
| Barra de filtros no celular e na página Sobre | Ocupa cerca de 270 px antes do conteúdo; não faz nada em /sobre. |
| Alvos de toque menores que 44 px | Botões segmentados (38 px), ordenação das tabelas (24 px), links do rodapé (29 px). |
| `favicon.ico`, `apple-touch-icon` e `site.webmanifest` | Retornam 404. |
| Vídeo e imagens de divulgação | Já gravados com o link antigo (`#/turnos?uf=MG`), que continua funcionando. Regravar só se quiser o endereço novo na tela. |
| `municipios.json` (740 KB) | Separar as colunas usadas só no Perfil reduziria a primeira carga. Mexe no pipeline de dados. |
| Licença do conjunto de dados no JSON-LD | O site diz "CC-BY" sem versão; o campo `license` ficou de fora até confirmar a versão no portal do TSE. |

## Depois do deploy

1. No Google Search Console, enviar `https://eleicoes-presidenciais-br.vercel.app/sitemap.xml` e
   pedir a indexação das 8 páginas.
2. Conferir o JSON-LD no [Teste de pesquisa aprimorada](https://search.google.com/test/rich-results)
   e no [validador do schema.org](https://validator.schema.org/).
3. Rodar o PageSpeed Insights no celular e comparar com o laboratório (LCP de 3,6 a 3,9 s e CLS de
   0,284 antes das correções).
