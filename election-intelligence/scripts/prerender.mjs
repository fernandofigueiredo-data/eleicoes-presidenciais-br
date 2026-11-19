/**
 * Pré-renderização (roda depois do `vite build`): grava um HTML estático por página em dist/.
 *
 * Por quê: o painel é montado por JavaScript, e muitos robôs (de IA e de prévia de link) não executam
 * JavaScript. Cada página passa a ter endereço próprio (/mapa, /turnos...), com título, descrição,
 * canonical, dados estruturados (JSON-LD) e um resumo em texto com os números da própria base,
 * calculados pelo mesmo motor do site (src/services/engine.js). Quando o JavaScript carrega, o painel
 * substitui esse resumo.
 *
 * Gera também sitemap.xml, llms.txt e 404.html. Os textos vêm de src/content (fonte única).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createEngine } from '../src/services/engine.js';
import { classificarViradas, contarViradas } from '../src/services/viradas.js';
import { PAGES } from '../src/state/store.js';
import { PAGINAS_SEO, urlCanonica, tituloCompleto, MARCA } from '../src/services/seo.js';
import { PROJETO, TSE, AVISO, O_QUE_E, citacoes } from '../src/content/projeto.js';
import { FAQ, FAQ_VIRADAS } from '../src/content/faq.js';
import { int, pct, escapeHtml } from '../src/utils/format.js';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const j = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
// links internos relativos: todos os HTML ficam na raiz de dist/, então "./mapa" funciona na Vercel (/mapa)
// e no GitHub Pages (/eleicoes-presidenciais-br/mapa)
const BASE = './';
const SITE = PROJETO.site;
const ANOS = [2014, 2018, 2022, 2026];
const ATUAL = '2026-2';

if (!existsSync(join(dist, 'index.html'))) throw new Error('Rode o vite build antes (dist/index.html não existe).');
const modelo = readFileSync(join(dist, 'index.html'), 'utf8');

const meta = j('public/data/meta.json');
const mun = j('public/data/municipios.json');
const turnos = Object.fromEntries(meta.turnos.map((t) => [t.chave, j(`public/data/turnos/${t.chave}.json`)]));
const E = createEngine({ meta, mun, turnos });
const DATA_DADOS = meta.gerado_em.slice(0, 10); // dia em que public/data foi gerado

const caminho = (page) => (page === 'nacional' ? BASE : `${BASE}${page}`);
const nomeDe = (k) => E.candByKey.get(k)?.nome ?? k;
const rotulo = (t) => E.turnoByKey.get(t).rotulo.replace(' · ', ', ');

/** Candidatos de um recorte, do mais ao menos votado (mesma conta da Visão Nacional). */
function ranking(ctx) {
  const votos = E.votosPorCandidato(ctx.turno, E.selection(ctx), null);
  let total = 0;
  for (const v of votos.values()) total += v || 0;
  return [...votos.entries()].map(([k, v]) => ({ k, nome: nomeDe(k), partido: E.candByKey.get(k)?.partido, votos: v || 0, pct: total ? (v || 0) / total : null }))
    .sort((a, b) => b.votos - a.votos);
}
const vencidos = (turno, k) => E.MunicipiosVencidos({ turno, exterior: false, cand: { chaves: new Set([k]) } }) ?? 0;

const tabela = (legenda, cols, linhas) => `<table><caption>${legenda}</caption><thead><tr>${cols.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>
<tbody>${linhas.map((l) => `<tr>${l.map((v, i) => (i === 0 ? `<th scope="row">${v}</th>` : `<td>${v}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;

// ---------- conteúdo de cada página ----------
function nacional() {
  const ctx = { turno: ATUAL };
  const [w, r2] = ranking(ctx);
  const h1 = `${escapeHtml(w.nome)} vence com ${pct(w.pct)} dos votos válidos no 2º turno de 2026`;
  const linhas = ANOS.map((ano) => {
    const [a, b] = ranking({ turno: `${ano}-2` });
    return [String(ano), `${escapeHtml(a.nome)} (${escapeHtml(a.partido)}), ${pct(a.pct)}`, `${escapeHtml(b.nome)} (${escapeHtml(b.partido)}), ${pct(b.pct)}`, pct(E.PctAbstencao({ turno: `${ano}-2` }))];
  });
  return {
    h1,
    corpo: `<p>${escapeHtml(r2.nome)} teve ${pct(r2.pct)}. A diferença foi de ${int(w.votos - r2.votos)} votos (${pct(E.MargemDeVitoria(ctx))} dos válidos). Compareceram ${pct(E.PctComparecimento(ctx))} dos ${int(E.Aptos(ctx))} eleitores aptos.</p>
<p>${escapeHtml(O_QUE_E)}</p>
${tabela('Resultado do 2º turno para presidente, Brasil (votos válidos)', ['Eleição', 'Vencedor', '2º colocado', 'Abstenção'], linhas)}`,
  };
}

function mapa() {
  const linhas = ANOS.map((ano) => {
    const t = `${ano}-2`;
    const [a, b] = ranking({ turno: t });
    return [String(ano), `${escapeHtml(a.nome)}: ${int(vencidos(t, a.k))}`, `${escapeHtml(b.nome)}: ${int(vencidos(t, b.k))}`];
  });
  const t = ATUAL, [a, b] = ranking({ turno: t });
  return {
    h1: 'Mapa da eleição para presidente por município',
    corpo: `<p>No 2º turno de 2026, ${escapeHtml(a.nome)} venceu em ${int(vencidos(t, a.k))} municípios e ${escapeHtml(b.nome)} em ${int(vencidos(t, b.k))}. O mapa interativo mostra o vencedor, a % de cada candidato e a margem de vitória em cada município, com filtros por região, UF e município.</p>
${tabela('Municípios vencidos no 2º turno, por candidato (sem o exterior)', ['Eleição', 'Vencedor no Brasil', '2º colocado no Brasil'], linhas)}`,
  };
}

function participacao() {
  const linhas = meta.turnos.map((t) => [rotulo(t.chave), pct(E.PctComparecimento({ turno: t.chave })), pct(E.PctAbstencao({ turno: t.chave })), pct(E.PctBrancos({ turno: t.chave })), pct(E.PctNulos({ turno: t.chave }))]);
  // só as 27 UFs (o exterior fica de fora do ranking, como na página)
  const doBrasil = new Set(E.mun.uf.filter((_, i) => !E.mun.exterior[i]));
  const ufs = meta.ufs.filter((u) => doBrasil.has(u.sigla)).map((u) => ({ ...u, a: E.PctAbstencao({ turno: ATUAL, uf: u.sigla }) })).filter((u) => u.a != null).sort((x, y) => y.a - x.a);
  const maior = ufs[0], menor = ufs[ufs.length - 1];
  return {
    h1: 'Comparecimento e abstenção na eleição para presidente',
    corpo: `<p>No 2º turno de 2026, a abstenção foi de ${pct(E.PctAbstencao({ turno: ATUAL }))} no Brasil: ${int(E.Abstencoes({ turno: ATUAL }))} eleitores aptos não votaram. Entre as UFs, a maior abstenção foi em ${escapeHtml(maior.nome)} (${pct(maior.a)}) e a menor em ${escapeHtml(menor.nome)} (${pct(menor.a)}).</p>
${tabela('Participação por turno, Brasil (brancos e nulos em % do comparecimento)', ['Turno', 'Comparecimento', 'Abstenção', 'Brancos', 'Nulos'], linhas)}`,
  };
}

function mudancas() {
  const linhas = ANOS.slice(1).map((ano) => [`${ano - 4} para ${ano}`, int(E.MunicipiosQueMudaram({ turno: `${ano}-2`, exterior: false })), pct(E.PctMunicipiosQueMudaram({ turno: `${ano}-2`, exterior: false }))]);
  return {
    h1: 'Municípios que mudaram de partido vencedor entre eleições',
    corpo: `<p>Compara o partido vencedor do 1º turno em cada município com o da eleição anterior. PSL (2018) e PL contam como o mesmo campo, porque Bolsonaro trocou de sigla. Pela regra do Power BI, um empate em qualquer das duas eleições conta como mudança. Municípios no exterior ficam de fora.</p>
${tabela('Municípios em que o partido vencedor do 1º turno mudou', ['Eleições', 'Municípios', '% dos municípios'], linhas)}`,
  };
}

function turnosPg() {
  const c = contarViradas(classificarViradas(E, 2026));
  const v = FAQ_VIRADAS.contagens;
  const linhas = ANOS.map((ano) => [String(ano), int(E.MunicipiosQueViraram({ turno: `${ano}-2`, exterior: false }))]);
  return {
    h1: 'Viradas entre o 1º e o 2º turno por município',
    corpo: `<p>Virada é o município em que o vencedor do 1º turno perdeu o 2º turno. Em 2026, dos ${int(c.municipios)} municípios do Brasil, houve ${v.estrita} viradas pela contagem estrita (${v.estritaLula} para Lula e ${v.estritaFlavio} para Flavio Bolsonaro), ${v.sql} pela regra do banco SQL e ${v.dax} pela regra do Power BI, que conta os ${v.empates} municípios com empate. Ao citar, informe o critério.</p>
${tabela(FAQ_VIRADAS.tabela.colunas[0] + 's de contagem das viradas de 2026', FAQ_VIRADAS.tabela.colunas.slice(0, 3), FAQ_VIRADAS.tabela.linhas.map((l) => l.slice(0, 3).map(escapeHtml)))}
${tabela('Viradas por eleição, regra do Power BI (sem o exterior)', ['Eleição', 'Municípios que viraram'], linhas)}
<p><a href="${BASE}data/viradas_criterios.csv">Baixar a lista dos municípios de 2026 com os três critérios (CSV)</a></p>`,
  };
}

const perfil = () => ({
  h1: 'Voto para presidente por renda, alfabetização e porte do município',
  corpo: '<p>Agrupa os municípios por quartil de PIB per capita, por quartil de alfabetização (Censo 2022) e por porte de população, e mostra a % de votos válidos de cada candidato em cada grupo, de 2014 a 2026. Os indicadores descrevem municípios, não eleitores: associação não é causalidade.</p>',
});

const comparar = () => ({
  h1: 'Comparar candidatos e territórios',
  corpo: '<p>Coloque lado a lado até quatro candidatos da mesma eleição ou até quatro territórios (Brasil, regiões, UFs e municípios) e compare votos, % dos votos válidos, municípios vencidos, comparecimento e abstenção.</p>',
});

function sobre() {
  const faq = FAQ.map((q) => `<section><h3>${escapeHtml(q.pergunta)}</h3>${[...q.texto, ...(q.depois || [])].map((p) => `<p>${p}</p>`).join('')}</section>`).join('\n');
  return {
    h1: 'Sobre o ELECTION INTELLIGENCE',
    corpo: `<p><strong>${escapeHtml(AVISO)}</strong> Resultados oficiais: <a href="${TSE.resultados}">resultados.tse.jus.br</a>.</p>
<h2>O que é</h2><p>${escapeHtml(O_QUE_E)}</p>
<h2>Responsável</h2><p>${escapeHtml(PROJETO.responsavel)}, ${escapeHtml(PROJETO.funcao)}. Código no <a href="${PROJETO.repositorio}">GitHub</a>. Contato: <a href="mailto:${PROJETO.email}">${escapeHtml(PROJETO.email)}</a>.</p>
<h2>Como citar</h2><ul>${citacoes(new Date(`${DATA_DADOS}T12:00:00`)).map((c) => `<li><strong>${escapeHtml(c.titulo)}:</strong> ${escapeHtml(c.texto)}</li>`).join('')}</ul>
<h2>Perguntas frequentes</h2>
${faq}
<h2>Licenças</h2><p>Código: licença MIT. Dados do TSE: Portal de Dados Abertos, licença CC-BY.</p>`,
  };
}

const CONTEUDO = { nacional, mapa, participacao, mudancas, turnos: turnosPg, perfil, comparar, sobre };

// ---------- dados estruturados ----------
const ID = (frag) => `${SITE}#${frag}`;
const AUTOR = { '@type': 'Person', '@id': ID('autor'), name: PROJETO.responsavel, url: PROJETO.github, description: `${PROJETO.funcao[0].toUpperCase()}${PROJETO.funcao.slice(1)}.`, sameAs: [PROJETO.github] };
const DATASET = {
  '@type': 'Dataset', '@id': ID('dataset'),
  name: 'Resultados das eleições para presidente por município (2014, 2018, 2022 e 2026) com indicadores do IBGE',
  description: 'Resultados para presidente do Brasil nos dois turnos de 2014, 2018, 2022 e 2026, por município (5.571 municípios e 195 cidades do exterior), com comparecimento, abstenção, votos brancos e nulos, relacionados a população, alfabetização (Censo 2022) e PIB per capita do IBGE. Elaborado por projeto independente a partir dos dados abertos do TSE; não é fonte oficial.',
  url: SITE, inLanguage: 'pt-BR', dateModified: DATA_DADOS, temporalCoverage: '2014/2026',
  spatialCoverage: { '@type': 'Place', name: 'Brasil' }, isAccessibleForFree: true,
  keywords: ['eleição para presidente', 'resultados por município', 'TSE', 'IBGE', 'abstenção', 'viradas entre turnos', 'Brasil'],
  creator: { '@id': ID('autor') }, publisher: { '@id': ID('autor') },
  isBasedOn: [
    { '@type': 'Dataset', name: 'Portal de Dados Abertos do TSE: votação por zona eleitoral', url: TSE.dadosAbertos },
    { '@type': 'Dataset', name: 'IBGE: Censo 2022 (população e alfabetização), PIB dos Municípios e Malhas Territoriais', url: 'https://www.ibge.gov.br/' },
  ],
  citation: citacoes()[0].texto,
  variableMeasured: ['Votos por candidato e município', 'Comparecimento e abstenção', 'Votos brancos e nulos', 'População', 'Alfabetização', 'PIB per capita'],
  distribution: [
    { '@type': 'DataDownload', name: 'Viradas entre turnos por município, 2026 (CSV)', encodingFormat: 'text/csv', contentUrl: `${SITE}data/viradas_criterios.csv` },
    ...meta.turnos.map((t) => ({ '@type': 'DataDownload', name: `Resultados por município, ${rotulo(t.chave)} (JSON)`, encodingFormat: 'application/json', contentUrl: `${SITE}data/turnos/${t.chave}.json` })),
  ],
  sameAs: PROJETO.repositorio,
};

function jsonLd(page) {
  const url = urlCanonica(page);
  const pagina = {
    '@type': page === 'sobre' ? 'AboutPage' : 'WebPage', '@id': `${url}#pagina`, url, name: tituloCompleto(page),
    description: PAGINAS_SEO[page].descricao, inLanguage: 'pt-BR', isPartOf: { '@id': ID('website') }, about: { '@id': ID('dataset') },
    dateModified: DATA_DADOS,
    primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE}og/election-intelligence-1200x630.png`, width: 1200, height: 630 },
  };
  const graph = [
    { '@type': 'WebSite', '@id': ID('website'), url: SITE, name: MARCA, alternateName: `${MARCA} · ${PROJETO.subtitulo}`, inLanguage: 'pt-BR', publisher: { '@id': ID('autor') } },
    pagina, AUTOR,
  ];
  if (page !== 'nacional') {
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: MARCA, item: SITE },
      { '@type': 'ListItem', position: 2, name: PAGES.find((p) => p.id === page).label, item: url },
    ] });
  }
  if (page === 'nacional' || page === 'sobre') graph.push(DATASET);
  if (page === 'nacional') {
    graph.push({ '@type': 'SoftwareSourceCode', '@id': ID('codigo'), name: 'eleicoes-presidenciais-br', codeRepository: PROJETO.repositorio, programmingLanguage: 'JavaScript', license: 'https://opensource.org/licenses/MIT', author: { '@id': ID('autor') } });
  }
  // "<" escapado: o JSON nunca fecha o <script> por acidente
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}

// ---------- montagem do HTML ----------
const navegacao = (atual) => `<nav aria-label="Páginas"><ul>${PAGES.map((p) => `<li><a href="${caminho(p.id)}"${p.id === atual ? ' aria-current="page"' : ''}>${p.label}</a></li>`).join('')}</ul></nav>`;

function estatico(page, { h1, corpo }) {
  return `<div class="estatico">
<header><p><a href="${BASE}"><strong>${MARCA}</strong></a> · ${PROJETO.subtitulo} · Presidente 2014 a 2026</p>${navegacao(page)}</header>
<main id="conteudo-estatico">
<h1>${h1}</h1>
${corpo}
<p>Fonte: TSE e IBGE. Dados atualizados em ${DATA_DADOS.split('-').reverse().join('/')}. ${escapeHtml(AVISO)}</p>
</main>
<footer><p><a href="${BASE}sobre">Sobre e contato</a> · <a href="${BASE}sobre?s=citar">Como citar</a> · <a href="${BASE}sobre?s=faq">Perguntas frequentes</a> · <a href="${PROJETO.repositorio}">Código no GitHub</a></p></footer>
</div>`;
}

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
function substituir(html, re, novo) {
  if (!re.test(html)) throw new Error(`Modelo sem ${re}`);
  return html.replace(re, novo);
}

function pagina(page) {
  const t = attr(tituloCompleto(page)), d = attr(PAGINAS_SEO[page].descricao), u = urlCanonica(page);
  let html = modelo;
  html = substituir(html, /<title>[^<]*<\/title>/, `<title>${t}</title>`);
  html = substituir(html, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${d}" />`);
  html = substituir(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${u}" />`);
  html = substituir(html, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${t}" />`);
  html = substituir(html, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${d}" />`);
  html = substituir(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${u}" />`);
  html = substituir(html, /<\/head>/, `    ${jsonLd(page)}\n  </head>`);
  html = substituir(html, /<div id="app"><\/div>/, `<div id="app">${estatico(page, CONTEUDO[page]())}</div>`);
  return html;
}

for (const { id } of PAGES) {
  const arquivo = id === 'nacional' ? 'index.html' : `${id}.html`;
  writeFileSync(join(dist, arquivo), pagina(id));
}

// 404: página de verdade (status 404 na Vercel e no GitHub Pages), fora do índice
let html404 = modelo
  .replace(/<title>[^<]*<\/title>/, `<title>Página não encontrada · ${MARCA}</title>`)
  .replace(/<link rel="canonical"[^>]*>/, '<meta name="robots" content="noindex" />')
  .replace(/<div id="loader"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '')
  .replace(/<script type="module"[^>]*><\/script>/g, '')
  .replace(/<link rel="(?:modulepreload|preload)"[^>]*>\s*/g, '')
  .replace(/<div id="app"><\/div>/, `<div id="app"><div class="estatico"><main><h1>Página não encontrada</h1><p>Este endereço não existe no ${MARCA}. Escolha uma das páginas:</p>${navegacao(null)}</main></div></div>`);
writeFileSync(join(dist, '404.html'), html404);

// sitemap: as oito páginas, com a data da última geração dos dados
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url>\n    <loc>${urlCanonica(p.id)}</loc>\n    <lastmod>${DATA_DADOS}</lastmod>\n  </url>`).join('\n')}
</urlset>
`);

// llms.txt: resumo em Markdown para assistentes de IA, com os mesmos textos e números do site
const v = FAQ_VIRADAS.contagens;
const [w26, r26] = ranking({ turno: ATUAL });
writeFileSync(join(dist, 'llms.txt'), `# ${MARCA}

> ${AVISO} Mostra como cada município votou para presidente nos dois turnos de 2014, 2018, 2022 e 2026, com dados do TSE e do IBGE.

${O_QUE_E}

Principais números (2º turno de 2026, Brasil): ${w26.nome} ${pct(w26.pct)} e ${r26.nome} ${pct(r26.pct)} dos votos válidos; abstenção de ${pct(E.PctAbstencao({ turno: ATUAL }))}. Viradas entre turnos em 2026: ${v.estrita} pela contagem estrita, ${v.sql} pela regra do banco SQL e ${v.dax} pela regra do Power BI (ao citar, informe o critério). Dados atualizados em ${DATA_DADOS}.

## Páginas

${PAGES.map((p) => `- [${p.label}](${urlCanonica(p.id)}): ${PAGINAS_SEO[p.id].descricao}`).join('\n')}

## Dados

- [Viradas entre turnos por município, 2026 (CSV)](${SITE}data/viradas_criterios.csv)
${meta.turnos.map((t) => `- [Resultados por município, ${rotulo(t.chave)} (JSON)](${SITE}data/turnos/${t.chave}.json)`).join('\n')}
- [Municípios e indicadores do IBGE (JSON)](${SITE}data/municipios.json)

## Como citar

${citacoes(new Date(`${DATA_DADOS}T12:00:00`)).map((c) => `- ${c.titulo}: ${c.texto}`).join('\n')}

## Fontes oficiais

- [Resultados do TSE](${TSE.resultados})
- [Dados abertos do TSE](${TSE.dadosAbertos})
- [Código do projeto (MIT)](${PROJETO.repositorio})
`);

console.log(`prerender: ${PAGES.length} páginas, 404.html, sitemap.xml e llms.txt em dist/ (base ${BASE}, dados de ${DATA_DADOS})`);
