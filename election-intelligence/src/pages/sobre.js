// 08 · Sobre e contato: o que é o projeto, aviso de natureza, dados e versão, como citar, metodologia,
// perguntas frequentes, licenças, contato, privacidade e a conferência ao vivo com o TSE e o PBIX.
import { h } from '../utils/dom.js';
import { int, pct, escapeHtml } from '../utils/format.js';
import { panel, toast } from '../components/ui/ui.js';
import { dataTable } from '../components/tables/dataTable.js';
import { buildCases } from '../services/validation.js';
import { pageHead } from './shared.js';
import { PROJETO, TSE, AVISO, O_QUE_E, citacoes, mailto, textoPrivacidade } from '../content/projeto.js';
import { FAQ } from '../content/faq.js';

const BASE = `${import.meta.env.BASE_URL}data/`;

const INDICE = [
  ['o-que-e', 'O que é'], ['dados', 'Dados e versão'], ['citar', 'Como citar'], ['metodologia', 'Metodologia'],
  ['faq', 'Perguntas frequentes'], ['licencas', 'Licenças'], ['contato', 'Contato'], ['privacidade', 'Privacidade'], ['conferencia', 'Conferência'],
];

/** Copia texto para a área de transferência, com alternativa para navegadores sem a API. */
export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

const tabelaHtml = (t) => `<div class="table-scroll"><table class="faq-table"><thead><tr>${t.colunas.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join('')}</tr></thead>
  <tbody>${t.linhas.map((l) => `<tr>${l.map((v, i) => (i === 0 ? `<th scope="row">${escapeHtml(v)}</th>` : `<td>${escapeHtml(v)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;

function faqHtml() {
  return FAQ.map((q) => `<details class="faq" id="faq-${q.id}" ${q.destaque ? 'open' : ''}>
    <summary>${escapeHtml(q.pergunta)}</summary>
    <div class="faq__body">${q.texto.map((p) => `<p>${p}</p>`).join('')}${q.tabela ? tabelaHtml(q.tabela) : ''}${(q.depois || []).map((p) => `<p>${p}</p>`).join('')}
    ${q.id === 'viradas' ? `<p><a class="btn" href="${BASE}viradas_criterios.csv" download="viradas_criterios.csv">Baixar a lista dos municípios (CSV)</a></p>` : ''}</div>
  </details>`).join('');
}

export function mount(root, { E }) {
  root.innerHTML = '';
  const cites = citacoes(new Date());
  root.append(h(`<div class="sobre">
    ${pageHead('Sobre e contato', 'Sobre o projeto, fontes e contato', '')}
    <aside class="aviso" id="sec-aviso" role="note" aria-labelledby="aviso-titulo">
      <h2 class="aviso__title" id="aviso-titulo">Projeto independente, não oficial</h2>
      <p>${escapeHtml(AVISO)}</p>
      <p class="aviso__links">Resultados oficiais: <a href="${TSE.resultados}" target="_blank" rel="noopener">resultados.tse.jus.br</a> · Dados abertos do TSE: <a href="${TSE.dadosAbertos}" target="_blank" rel="noopener">dadosabertos.tse.jus.br</a></p>
    </aside>
    <nav class="sobre-index" aria-label="Nesta página">${INDICE.map(([id, l]) => `<a href="#/sobre?s=${id}">${l}</a>`).join('')}</nav>
  </div>`));

  const g1 = h('<div class="grid grid--2"></div>');
  const pQue = panel({ title: 'O que é', id: 'sec-o-que-e' });
  pQue.body.innerHTML = `<div class="prose"><p>${escapeHtml(O_QUE_E)}</p></div>`;
  const pContato = panel({ title: 'Responsável e contato', id: 'sec-contato' });
  pContato.body.innerHTML = `<div class="prose">
    <p><strong>${escapeHtml(PROJETO.responsavel)}</strong>, ${escapeHtml(PROJETO.funcao)}. <a href="${PROJETO.github}" target="_blank" rel="noopener">Perfil no GitHub</a>.</p>
    <p>E-mail: <a href="${mailto()}" data-testid="email-link">${escapeHtml(PROJETO.email)}</a></p>
    <div class="actions"><a class="btn btn--primary" href="${mailto()}">Escrever e-mail</a><button class="btn" type="button" data-copy="email" aria-label="Copiar e-mail ${escapeHtml(PROJETO.email)}">Copiar e-mail</button></div>
    <p class="panel__note">As respostas podem levar alguns dias. Críticas de método e correções são bem-vindas.</p></div>`;
  g1.append(pQue.el, pContato.el);

  const pDados = panel({ title: 'De onde vêm os dados e qual é a versão', id: 'sec-dados' });
  pDados.body.innerHTML = `<div class="prose"><ul>
    <li><strong>TSE</strong>, Portal de Dados Abertos: votação por candidato e detalhe da votação por zona eleitoral, um arquivo por eleição (2014, 2018, 2022 e 2026, 1º e 2º turnos).</li>
    <li><strong>Versão de 2026:</strong> os arquivos do 2º turno (25/10/2026) são os que o TSE publicou em 28/10/2026, baixados no mesmo dia. Se o TSE republicar, os números podem mudar; o repositório guarda o registro de versão (SHA-256) de cada arquivo.</li>
    <li><strong>IBGE</strong>: Censo 2022 (população, SIDRA 4709; alfabetização, SIDRA 9543), PIB dos Municípios (PIB de 2023, SIDRA 5938), API de Localidades e API de Malhas Territoriais, consultados em 28/10/2026.</li>
  </ul><p class="panel__note" id="manifest-data"></p></div>`;

  const pCitar = panel({ title: 'Como citar', id: 'sec-citar', sub: 'Cite sempre o TSE e o IBGE como origem dos dados e o projeto como ferramenta' });
  pCitar.body.innerHTML = `<div class="cites">${cites.map((c) => `<div class="cite">
      <h3 class="cite__title" id="cite-t-${c.id}">${escapeHtml(c.titulo)}</h3>
      <p class="cite__text" data-testid="cite-${c.id}">${escapeHtml(c.texto)}</p>
      <button class="btn" type="button" data-copy="${c.id}" aria-label="Copiar: ${escapeHtml(c.titulo)}" aria-describedby="cite-t-${c.id}">Copiar</button>
    </div>`).join('')}</div>
    <div class="prose"><h3>Orientações</h3><ul>
      <li>Cite o TSE e o IBGE como fontes dos dados e o ELECTION INTELLIGENCE como ferramenta de análise.</li>
      <li>Confirme os números oficiais no <a href="${TSE.resultados}" target="_blank" rel="noopener">portal de resultados do TSE</a> antes de publicar.</li>
      <li>Para reproduzir um recorte, copie o link da página com os filtros: eles ficam gravados no endereço. O botão Compartilhar, no topo, faz isso.</li>
      <li>Ao citar viradas entre turnos, informe o critério (veja <a href="#/sobre?s=faq">Perguntas frequentes</a>).</li>
    </ul></div>`;

  const pMet = panel({ title: 'Metodologia e limitações', id: 'sec-metodologia' });
  pMet.body.innerHTML = `<div class="prose">
    <h3>Como os números são produzidos</h3>
    <ul>
      <li>As 6 tabelas do modelo (fVotos, fComparecimento, dMunicipio, dCandidato, dTurno, PartidoCores) foram exportadas do PBIX pelo <strong>PBIX-MCP</strong> sem alteração de valores.</li>
      <li>As 55 medidas DAX foram reescritas em JavaScript com a mesma semântica (BLANK, DIVIDE, TOPN com empates, REMOVEFILTERS) e conferidas contra valores avaliados no próprio PBIX.</li>
      <li>Percentuais são sempre razão de somas (nunca média de percentuais). % votos válidos = votos do candidato ÷ votos de todos os candidatos.</li>
      <li>PIB per capita e alfabetização de um recorte são ponderados pela população: Σ(indicador × população) ÷ Σ população dos municípios com dado.</li>
      <li>"Mudou de partido vencedor" compara o 1º turno do ano com o 1º turno de 4 anos antes; PSL (2018) e PL contam como o mesmo campo. "Virou no 2º turno" compara os vencedores dos dois turnos do mesmo ano; empate conta como virada (regra do DAX; veja a nota sobre 212, 213 e 215 nas perguntas frequentes).</li>
    </ul>
    <h3>Limitações</h3>
    <ul>
      <li>O exterior não tem dados do IBGE; em 2014 e 2018 faltam 684 e 470 eleitores aptos de zonas do exterior onde ninguém votou. Mapas e rankings territoriais deixam o exterior de fora.</li>
      <li>Boa Esperança do Norte (MT) foi criado depois do Censo 2022: não tem indicadores do IBGE nem polígono na malha usada; aparece em tabelas, não no mapa.</li>
      <li>O PBIX converte a alfabetização para número inteiro no Power Query (tipo Int64). O site reproduz o PBIX; o valor com decimais está em <code>data/limpo/dMunicipio.csv</code> do repositório.</li>
      <li>Empates: o DAX não define a ordem dos nomes empatados; aqui a ordem é alfabética.</li>
      <li>Os indicadores descrevem municípios, não eleitores: associação não é causalidade, e resultados agregados não mostram transferência individual de votos entre turnos.</li>
    </ul>
    <p>Detalhes no <a href="${PROJETO.repositorio}" target="_blank" rel="noopener">repositório do projeto</a>, com o código, o banco SQL e os notebooks.</p></div>`;

  const pFaq = panel({ title: 'Perguntas frequentes', id: 'sec-faq' });
  pFaq.body.innerHTML = `<div class="prose faq-list">${faqHtml()}</div>`;

  const g2 = h('<div class="grid grid--2"></div>');
  const pLic = panel({ title: 'Licenças', id: 'sec-licencas' });
  pLic.body.innerHTML = `<div class="prose"><ul>
    <li><strong>Código:</strong> licença MIT (<a href="${PROJETO.repositorio}/blob/main/LICENSE" target="_blank" rel="noopener">texto da licença</a>).</li>
    <li><strong>Dados do TSE:</strong> Portal de Dados Abertos, licença CC-BY. Cite o TSE.</li>
    <li><strong>Dados do IBGE:</strong> dados públicos. Cite o IBGE como fonte.</li></ul></div>`;
  const pPriv = panel({ title: 'Privacidade', id: 'sec-privacidade' });
  pPriv.body.innerHTML = `<div class="prose" data-testid="privacidade">${textoPrivacidade().map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</div>`;
  g2.append(pLic.el, pPriv.el);

  const pConf = panel({ title: 'Conferência com o TSE', id: 'sec-conferencia', sub: 'Calculada ao vivo no navegador: comparecimento = válidos + brancos + nulos; soma dos candidatos = válidos' });
  root.append(g1, h('<div class="section-gap"></div>'), pDados.el, h('<div class="section-gap"></div>'), pCitar.el, h('<div class="section-gap"></div>'), pMet.el,
    h('<div class="section-gap"></div>'), pFaq.el, h('<div class="section-gap"></div>'), g2, h('<div class="section-gap"></div>'), pConf.el);

  // copiar e-mail e citações
  const textos = { email: PROJETO.email, ...Object.fromEntries(cites.map((c) => [c.id, c.texto])) };
  root.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-copy]');
    if (!b) return;
    const ok = await copiar(textos[b.dataset.copy]);
    toast(ok ? (b.dataset.copy === 'email' ? 'E-mail copiado' : 'Citação copiada') : 'Não foi possível copiar; selecione o texto', ok ? 'info' : 'error');
  });

  const confRows = E.meta.turnos.map((t) => {
    const c = { turno: t.chave };
    return { rotulo: t.rotulo, comp: E.Comparecimento(c), validos: E.VotosValidos(c), todos: E.VotosTodosCandidatos(c), conf: E.ConferenciaValidos(c), dif: E.DiferencaApuracao(c), venc: E.Vencedor(c), pv: E.PctDoVencedor(c) };
  });
  dataTable(pConf.body, {
    filename: 'conferencia-tse', pageSize: 10, rows: confRows,
    columns: [
      { key: 'rotulo', label: 'Turno' }, { key: 'comp', label: 'Comparecimento', align: 'r', format: int },
      { key: 'validos', label: 'Votos válidos', align: 'r', format: int }, { key: 'todos', label: 'Soma dos candidatos', align: 'r', format: int },
      { key: 'conf', label: 'Conferência', format: (v) => `<span class="badge ${v.startsWith('✔') ? 'badge--ok' : 'badge--bad'}">${escapeHtml(v)}</span>` },
      { key: 'dif', label: 'Diferença de apuração', align: 'r', format: int },
      { key: 'venc', label: 'Vencedor', }, { key: 'pv', label: '% do vencedor', align: 'r', format: (v) => pct(v) },
    ],
  });
  pConf.body.insertAdjacentHTML('beforeend', '<p class="panel__note">A diferença de 746 votos em 2018 · 1º turno vem do arquivo do TSE (comparecimento maior que válidos + brancos + nulos) e também aparece no PBIX.</p>');

  const pVal = panel({ title: 'Validação contra o PBIX-MCP', sub: 'Cada linha compara um valor avaliado no PBIX pelo PBIX-MCP com o mesmo indicador recalculado agora, no seu navegador' });
  root.append(h('<div class="section-gap"></div>'), pVal.el);
  const summary = h('<div class="grid grid--kpis-4" style="margin-bottom:12px"></div>');
  pVal.body.appendChild(summary);
  fetch(BASE + 'referencia_mcp.json').then((r) => r.json()).then((ref) => {
    const cases = buildCases(E, ref);
    const ok = cases.filter((c) => c.status === 'VALIDADO').length;
    summary.innerHTML = `<div class="kpi"><div class="kpi__label">Indicadores validados</div><div class="kpi__value" data-testid="val-ok">${int(ok)} / ${int(cases.length)}</div><div class="kpi__foot">tolerância 1e-9 (inteiros exatos)</div></div>
      <div class="kpi"><div class="kpi__label">Divergências</div><div class="kpi__value" data-testid="val-bad">${int(cases.length - ok)}</div><div class="kpi__foot">${ok === cases.length ? 'nenhuma' : 'ver tabela'}</div></div>`;
    const fmt = (v) => (typeof v === 'number' ? (Math.abs(v) < 1 && v !== 0 && !Number.isInteger(v) ? v.toFixed(10) : int(v)) : escapeHtml(v ?? '—'));
    dataTable(pVal.body, {
      filename: 'validacao-pbix-mcp', searchKeys: ['grupo', 'medida', 'contexto'], pageSize: 25, maxHeight: 480,
      columns: [
        { key: 'grupo', label: 'Grupo' }, { key: 'medida', label: 'Medida' }, { key: 'contexto', label: 'Contexto' },
        { key: 'mcp', label: 'PBIX-MCP', align: 'r', format: fmt }, { key: 'js', label: 'JavaScript', align: 'r', format: fmt },
        { key: 'diff', label: 'Diferença', align: 'r', format: (v) => (v == null ? '—' : v === 0 ? '0' : v.toExponential(2)) },
        { key: 'status', label: 'Status', format: (v) => `<span class="badge ${v === 'VALIDADO' ? 'badge--ok' : 'badge--bad'}">${v}</span>` },
      ],
      rows: cases,
    });
  }).catch((e) => { summary.innerHTML = `<p>Não foi possível carregar a referência: ${escapeHtml(e.message)}</p>`; });

  const pDic = panel({ title: 'Dicionário de indicadores (medidas DAX do PBIX)', sub: 'Expressões extraídas do modelo pelo PBIX-MCP (TMDL). Cada uma tem um equivalente em src/services/engine.js.' });
  root.append(h('<div class="section-gap"></div>'), pDic.el);
  fetch(BASE + 'medidas.json').then((r) => r.json()).then((ms) => {
    const pastas = [...new Set(ms.map((m) => m.pasta))].sort();
    pDic.body.innerHTML = pastas.map((p) => `<h3 class="dict-group">${escapeHtml(p.replace(/^\d+\.\s*/, ''))}</h3>` + ms.filter((m) => m.pasta === p).map((m) => `<details class="dax"><summary>${escapeHtml(m.nome)}${m.formato ? `<small>formato ${escapeHtml(m.formato)}</small>` : ''}</summary><pre class="code">${escapeHtml(m.dax)}</pre></details>`).join('')).join('');
  });

  const pUpd = panel({ title: 'Atualização dos dados', sub: 'Sem reconstruir o frontend' });
  root.append(h('<div class="section-gap"></div>'), pUpd.el);
  pUpd.body.innerHTML = `<div class="prose"><ol>
    <li>Atualize o PBIX no Power BI Desktop e abra-o com o PBIX-MCP.</li>
    <li>Exporte as tabelas com <code>pbix_export_all_tables_csv</code> para <code>data/raw/</code>.</li>
    <li>Rode <code>npm run data</code> (gera <code>public/data/*.json</code>) e <code>npm run validate</code>.</li>
    <li>Publique só a pasta <code>data/</code> do site (ou rode <code>npm run build</code>). O código não muda.</li></ol>
    <p class="panel__note" id="manifest-note"></p></div>`;
  fetch(BASE + 'manifest.json').then((r) => r.json()).then((m) => {
    const quando = new Date(m.gerado_em).toLocaleString('pt-BR');
    pUpd.body.querySelector('#manifest-note').textContent = `Dados gerados em ${quando} · linhas de origem: ${Object.entries(m.linhas_origem).map(([k, v]) => `${k} ${v.toLocaleString('pt-BR')}`).join(' · ')}`;
    pDados.body.querySelector('#manifest-data').textContent = `Arquivos do site gerados em ${quando}.`;
  });

  function irPara(secao) {
    const el = secao && root.querySelector(`#sec-${secao}`);
    if (!el) return;
    const topo = document.querySelector('.filterbar')?.getBoundingClientRect().bottom ?? 0;
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - Math.max(0, topo) - 12 });
    if (secao === 'faq') root.querySelector('#faq-viradas')?.setAttribute('open', '');
  }
  return {
    update(s) { if (s.secao) requestAnimationFrame(() => irPara(s.secao)); },
    destroy() {},
  };
}
