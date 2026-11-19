// 06 — Perfil Socioeconômico
import { h } from '../utils/dom.js';
import { C, VIZ } from '../styles/tokens.js';
import { int, pct, brl, pct1raw, escapeHtml } from '../utils/format.js';
import { panel, kpi, csvButton } from '../components/ui/ui.js';
import { chart, tipBox } from '../components/charts/echarts.js';
import { dataTable } from '../components/tables/dataTable.js';
import { downloadCSV } from '../utils/csv.js';
import { geoCtx, scopeLabel, pageHead, ranking, municipioDetail, bindDetailActions, noEscopo } from './shared.js';

const ABREV = { '1º quartil (menor PIB)': '1º quartil\n(menor PIB)', '4º quartil (maior PIB)': '4º quartil\n(maior PIB)', '1º quartil (menor alfabetização)': '1º quartil\n(menor alfab.)', '4º quartil (maior alfabetização)': '4º quartil\n(maior alfab.)' };

export function mount(root, { E, store }) {
  root.innerHTML = '';
  const head = h('<div></div>');
  const note = h('<p class="callout callout--warn"><strong>Os indicadores descrevem o município, não o eleitor.</strong> Uma relação entre PIB e voto não mostra como cada pessoa votou, nem que uma coisa cause a outra. Quartis calculados sobre todos os municípios com dado (PERCENTILE.INC do PBIX); o PBIX guarda a alfabetização como número inteiro.</p>');
  const kpis = h('<section class="grid grid--kpis-4" aria-label="Perfil do recorte"></section>');
  const g1 = h('<div class="grid grid--3 section-gap"></div>');
  const pPib = panel({ title: 'Votos por faixa de PIB per capita', sub: '% dos votos válidos · quartis de municípios', tools: csvButton() });
  const pAlf = panel({ title: 'Votos por faixa de alfabetização', sub: '% dos votos válidos · quartis de municípios', tools: csvButton() });
  const pPop = panel({ title: 'Votos por porte de município', sub: '% dos votos válidos · população 2022', tools: csvButton() });
  g1.append(pPib.el, pAlf.el, pPop.el);
  const pSc = panel({ title: 'PIB per capita × votação por município', sub: '' });
  const detail = h('<div class="section-gap"></div>');
  const pTab = panel({ title: 'Resumo por quartil de PIB per capita', sub: 'Quantos municípios, quantas pessoas e como votaram' });
  root.append(head, note, kpis, g1, h('<div class="section-gap"></div>'), pSc.el, detail, h('<div class="section-gap"></div>'), pTab.el);
  bindDetailActions(detail, store, E);

  const mk = (p) => { const el = h('<div class="chart"></div>'); p.body.appendChild(el); return chart(el, {}); };
  const cPib = mk(pPib), cAlf = mk(pAlf), cPop = mk(pPop);
  const elSc = h('<div class="chart chart--tall"></div>'); pSc.body.appendChild(elSc);
  const cSc = chart(elSc, {}, { onClick: (p) => p.data?.tse && store.set({ mun: p.data.tse }) });
  const data = { pib: [], alf: [], pop: [] };
  const exp = (k, name) => () => downloadCSV(name, [{ label: 'Grupo', key: 'grupo' }, ...data.cands.map((c) => ({ label: `% ${c.nome}`, value: (r) => r[c.chave] }))], data[k]);
  pPib.tools.querySelector('[data-action=csv]').addEventListener('click', exp('pib', 'votos-por-quartil-pib'));
  pAlf.tools.querySelector('[data-action=csv]').addEventListener('click', exp('alf', 'votos-por-quartil-alfabetizacao'));
  pPop.tools.querySelector('[data-action=csv]').addEventListener('click', exp('pop', 'votos-por-porte'));

  const table = dataTable(pTab.body, { filename: 'resumo-quartil-pib', pageSize: 10, columns: [] });
  let tableCols = '';

  function grupos(s, campo, ordem, sel) {
    const out = [];
    for (const gname of ordem) {
      const set = new Set(sel.filter((i) => E.mun[campo][i] === gname));
      if (set.size) out.push({ grupo: gname, set });
    }
    return out;
  }
  function bars(c, rows, cands, s) {
    c.set({
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true }, legend: { top: 0, type: 'scroll' },
      xAxis: { type: 'category', data: rows.map((r) => ABREV[r.grupo] || r.grupo), axisLabel: { fontSize: 10, interval: 0 } },
      yAxis: { type: 'value', max: 1, axisLabel: { formatter: (v) => pct(v, 0) } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => pct(v) },
      series: cands.map((cd) => ({ name: cd.nome, type: 'bar', barMaxWidth: 22, itemStyle: { color: E.corPartido(cd.partido), opacity: s.cand && s.cand !== cd.chave ? 0.3 : 1 }, data: rows.map((r) => r[cd.chave]) })),
    });
  }

  function update(s) {
    const g = { ...geoCtx(s), mun: null, exterior: false };
    const escopo = scopeLabel(E, { ...s, mun: null });
    const ctx = { turno: s.turno, ...g };
    const cands = ranking(E, ctx).filter((r) => r.votos).slice(0, E.nrDe(s.turno) === 2 ? 2 : 3).map((r) => r.c);
    if (s.cand && !cands.some((c) => c.chave === s.cand)) cands.push(E.candByKey.get(s.cand));
    data.cands = cands;
    const alvo = E.candByKey.get(s.cand) || cands[0];
    const sel = E.selection(g).filter((i) => E.mun.qPib[i] !== 'Sem dado'); // filtro do PBIX nos 3 gráficos
    const calc = (gs) => gs.map(({ grupo, set }) => {
      const r = { grupo, n: set.size };
      for (const cd of cands) r[cd.chave] = E.PctVotosValidos({ ...ctx, munSet: set, cand: { chaves: new Set([cd.chave]) } });
      return r;
    });
    data.pib = calc(grupos(s, 'qPib', E.meta.quartisPib.filter((q) => q !== 'Sem dado'), sel));
    data.alf = calc(grupos(s, 'qAlf', E.meta.quartisAlf.filter((q) => q !== 'Sem dado'), sel));
    data.pop = calc(grupos(s, 'faixa', E.meta.faixas.filter((f) => f !== 'Sem dado'), sel));
    bars(cPib, data.pib, cands, s); bars(cAlf, data.alf, cands, s); bars(cPop, data.pop, cands, s);

    const q1 = data.pib[0], q4 = data.pib.at(-1);
    head.innerHTML = pageHead('Perfil socioeconômico', 'O voto e o perfil dos municípios',
      alvo && q1 && q4 ? `No ${escapeHtml(E.turnoByKey.get(s.turno).rotulo)}, <strong>${escapeHtml(alvo.nome)}</strong> teve <strong>${pct(q1[alvo.chave], 1)}</strong> dos válidos no quarto de municípios com menor PIB per capita e <strong>${pct(q4[alvo.chave], 1)}</strong> no quarto com maior PIB per capita, ${escapeHtml(noEscopo(E, { ...s, mun: null }))}.` : '',
      escapeHtml(E.turnoByKey.get(s.turno).rotulo), escapeHtml(escopo));
    kpis.innerHTML = [
      kpi({ label: 'PIB per capita', value: brl(E.PIBperCapita(g)), foot: 'PIB total ÷ população (PIB 2023)' }),
      kpi({ label: 'Alfabetização', value: pct1raw(E.Alfabetizacao(g)), foot: '15 anos ou mais, ponderada pela população' }),
      kpi({ label: 'População 2022', value: int(E.Populacao(g)), foot: 'Censo 2022' }),
      kpi({ label: 'Municípios', value: int(E.Municipios(g)), foot: escapeHtml(escopo) }),
    ].join('');

    // dispersão — segue o filtro de candidato (interação do PBIX)
    const pts = [];
    const t = E.turnos[s.turno];
    const res = E.resumoMunicipios(s.turno);
    for (const i of E.selection(g)) {
      const pc = E.mun.pibpc[i], r = res[i];
      if (pc == null || !r || !r.total) continue;
      const v = t.votos[alvo.chave]?.[i];
      if (v == null) continue;
      const on = s.mun === E.mun.tse[i];
      pts.push({ value: [pc, v / r.total, E.mun.pop[i]], tse: E.mun.tse[i], nome: `${E.mun.nome[i]} (${E.mun.uf[i]})`, itemStyle: { color: E.corPartido(alvo.partido), opacity: on ? 1 : 0.45, borderColor: on ? C.ink : undefined, borderWidth: on ? 2 : 0 } });
    }
    pSc.setSub(`% dos votos válidos de <strong>${escapeHtml(alvo.nome)}</strong> (escolha outro no filtro Candidato) · eixo X em escala logarítmica · tamanho = população · ${escapeHtml(escopo)}`);
    cSc.set({
      grid: { left: 8, right: 20, top: 16, bottom: 32, containLabel: true },
      xAxis: { type: 'log', name: 'PIB per capita (R$, escala log)', nameLocation: 'middle', nameGap: 26, axisLabel: { formatter: (v) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : v) }, min: 3000 },
      yAxis: { type: 'value', min: 0, max: 1, axisLabel: { formatter: (v) => pct(v, 0) } },
      tooltip: { trigger: 'item', formatter: (p) => tipBox(p.data.nome, [['PIB per capita', brl(p.value[0])], [`% ${alvo.nome}`, pct(p.value[1])], ['População 2022', int(p.value[2])]]) },
      series: [{ type: 'scatter', data: pts, progressive: 0, symbolSize: (v) => Math.max(3, Math.min(30, Math.sqrt(v[2] || 0) / 28)) }],
    });
    detail.innerHTML = municipioDetail(E, s);

    // resumo por quartil
    const colsKey = cands.map((c) => c.chave).join(',');
    const cols = [
      { key: 'grupo', label: 'Quartil de PIB per capita' },
      { key: 'n', label: 'Municípios', align: 'r', format: int },
      { key: 'pop', label: 'População', align: 'r', format: int },
      { key: 'pibpc', label: 'PIB per capita', align: 'r', format: brl },
      ...cands.map((c) => ({ key: c.chave, label: `% ${c.nome}`, align: 'r', format: (v) => pct(v) })),
    ];
    if (colsKey !== tableCols) { pTab.body.innerHTML = ''; tableCols = colsKey; Object.assign(table, dataTable(pTab.body, { filename: 'resumo-quartil-pib', pageSize: 10, columns: cols })); }
    const gsAll = grupos(s, 'qPib', E.meta.quartisPib, E.selection(g));
    table.update(gsAll.map(({ grupo, set }) => {
      const r = { grupo, n: set.size, pop: E.Populacao({ munSet: set }), pibpc: E.PIBperCapita({ munSet: set }) };
      for (const c of cands) r[c.chave] = E.PctVotosValidos({ ...ctx, munSet: set, cand: { chaves: new Set([c.chave]) } });
      return r;
    }));
  }

  return { update, destroy() { cPib.destroy(); cAlf.destroy(); cPop.destroy(); cSc.destroy(); } };
}
