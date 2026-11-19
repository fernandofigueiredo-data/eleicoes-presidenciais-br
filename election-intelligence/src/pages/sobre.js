// 08 — Sobre os Dados: fontes, metodologia, dicionário de indicadores e conferência ao vivo.
import { h } from '../utils/dom.js';
import { int, pct, escapeHtml } from '../utils/format.js';
import { panel } from '../components/ui/ui.js';
import { dataTable } from '../components/tables/dataTable.js';
import { buildCases } from '../services/validation.js';
import { pageHead } from './shared.js';

const BASE = `${import.meta.env.BASE_URL}data/`;

export function mount(root, { E }) {
  root.innerHTML = '';
  root.append(h(`<div>${pageHead('Sobre os dados', 'Fontes, método e conferência', 'Os números deste site saem do relatório Power BI do projeto, extraídos com o PBIX-MCP e recalculados em JavaScript. Esta página mostra as fontes, as regras de cálculo, as limitações e a conferência dos resultados.')}</div>`));

  const g = h('<div class="grid grid--2"></div>');
  const pFontes = panel({ title: 'Fontes e metodologia' });
  pFontes.body.innerHTML = `<div class="prose">
    <h3>Fontes</h3>
    <ul>
      <li><strong>TSE</strong>: Portal de Dados Abertos (licença CC-BY): votação por zona eleitoral, eleitorado apto, comparecimento, abstenção, brancos e nulos. Eleições de 2014, 2018, 2022 e 2026, 1º e 2º turnos.</li>
      <li><strong>IBGE</strong>: Censo 2022 (SIDRA 4709: população; SIDRA 9543: alfabetização de 15 anos ou mais) e PIB dos Municípios (SIDRA 5938; PIB de 2023 para 2022 e 2026).</li>
      <li><strong>Malhas territoriais</strong>: IBGE, API de Malhas v3 (TopoJSON, qualidade mínima), ligadas pelo código IBGE de 7 dígitos.</li>
    </ul>
    <h3>Como os números são produzidos</h3>
    <ul>
      <li>As 6 tabelas do modelo (fVotos, fComparecimento, dMunicipio, dCandidato, dTurno, PartidoCores) foram exportadas do PBIX pelo <strong>PBIX-MCP</strong> sem alteração de valores.</li>
      <li>As 55 medidas DAX foram reescritas em JavaScript com a mesma semântica (BLANK, DIVIDE, TOPN com empates, REMOVEFILTERS) e conferidas contra valores avaliados no próprio PBIX.</li>
      <li>Percentuais são sempre razão de somas (nunca média de percentuais). % votos válidos = votos do candidato ÷ votos de todos os candidatos.</li>
      <li>PIB per capita e alfabetização de um recorte são ponderados pela população: Σ(indicador × população) ÷ Σ população dos municípios com dado.</li>
      <li>"Mudou de partido vencedor" compara o 1º turno do ano com o 1º turno de 4 anos antes; PSL (2018) e PL contam como o mesmo campo. "Virou no 2º turno" compara os vencedores dos dois turnos do mesmo ano; empate conta como virada.</li>
    </ul>
    <h3>Limitações</h3>
    <ul>
      <li>O exterior não tem dados do IBGE; em 2014 e 2018 faltam 684 e 470 eleitores aptos de zonas do exterior onde ninguém votou. Mapas e rankings territoriais deixam o exterior de fora.</li>
      <li>Boa Esperança do Norte (MT) foi criado depois do Censo 2022: não tem indicadores do IBGE nem polígono na malha usada; aparece em tabelas, não no mapa.</li>
      <li>O PBIX converte a alfabetização para número inteiro no Power Query (tipo Int64). O site reproduz o PBIX; o valor com decimais está em <code>data/limpo/dMunicipio.csv</code> do repositório.</li>
      <li>Empates: o DAX não define a ordem dos nomes empatados; aqui a ordem é alfabética.</li>
      <li>O 2º turno de 2026 (25/10/2026) vem dos arquivos publicados pelo TSE em 28/10/2026.</li>
      <li>Os indicadores descrevem municípios, não eleitores: associação não é causalidade, e resultados agregados não mostram transferência individual de votos entre turnos.</li>
    </ul></div>`;
  const pConf = panel({ title: 'Conferência com o TSE', sub: 'Calculada ao vivo no navegador: comparecimento = válidos + brancos + nulos; soma dos candidatos = válidos' });
  g.append(pFontes.el, pConf.el);
  root.appendChild(g);

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
    pUpd.body.querySelector('#manifest-note').textContent = `Dados gerados em ${new Date(m.gerado_em).toLocaleString('pt-BR')} · linhas de origem: ${Object.entries(m.linhas_origem).map(([k, v]) => `${k} ${v.toLocaleString('pt-BR')}`).join(' · ')}`;
  });

  return { update() {}, destroy() {} };
}
