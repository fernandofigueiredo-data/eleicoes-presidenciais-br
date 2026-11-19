// 03 — Comparecimento e Abstenção
import { h } from '../utils/dom.js';
import { C, VIZ } from '../styles/tokens.js';
import { int, pct, pp, pct1raw, escapeHtml } from '../utils/format.js';
import { panel, kpi, segmented, tipTable, csvButton } from '../components/ui/ui.js';
import { chart, tipBox } from '../components/charts/echarts.js';
import { territoryMap } from '../components/maps/territoryMap.js';
import { dataTable } from '../components/tables/dataTable.js';
import { ramp, RAMP_ABST } from '../utils/colors.js';
import { downloadCSV } from '../utils/csv.js';
import { geoCtx, scopeLabel, pageHead, municipioDetail, bindDetailActions, noEscopo, doEscopo } from './shared.js';

const REG_COLORS = VIZ.region;
const scale = ramp(RAMP_ABST);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const DOM = [0.1, 0.32];
const colorAbst = (v) => (v == null ? VIZ.noData : scale((v - DOM[0]) / (DOM[1] - DOM[0])));

export function mount(root, { E, store }) {
  root.innerHTML = '';
  const head = h('<div></div>');
  const kpis = h('<section class="grid grid--kpis" aria-label="Indicadores de participação"></section>');
  const g1 = h('<div class="grid grid--2 section-gap"></div>');
  const pMap = panel({ title: 'Abstenção por território', sub: 'Parcela dos eleitores aptos que não votou. Sem o exterior.' });
  const pUF = panel({ title: 'Abstenção por UF', sub: 'Linha amarela = média Brasil (sem exterior) · clique para filtrar', tools: csvButton() });
  g1.append(pMap.el, pUF.el);
  const detail = h('<div class="section-gap"></div>');
  const g2 = h('<div class="grid grid--2 section-gap"></div>');
  const pSc = panel({ title: 'Abstenção × alfabetização', sub: 'Cada ponto é um município (tamanho = aptos) · clique para selecionar' });
  const pLine = panel({ title: 'Abstenção por região ao longo do tempo', sub: 'Todos os turnos · não segue o filtro de turno', tools: csvButton() });
  g2.append(pSc.el, pLine.el);
  const g3 = h('<div class="grid grid--wide-narrow section-gap"></div>');
  const pTab = panel({ title: 'Comparação entre municípios', sub: '' });
  const pBN = panel({ title: 'Brancos e nulos', sub: 'Todos os turnos · % do comparecimento', tools: csvButton() });
  g3.append(pTab.el, pBN.el);
  root.append(head, kpis, g1, detail, g2, g3);
  bindDetailActions(detail, store, E);

  let level = 'uf';
  const map = territoryMap(pMap.body, {
    E, store, level: 'uf', short: true, label: 'Mapa de abstenção',
    fillUF: (uf) => colorAbst(E.PctAbstencao({ turno: store.get().turno, uf, exterior: false })),
    fillMun: (i) => { const c = E.turnos[store.get().turno].comp; return colorAbst(c.aptos[i] ? c.abst[i] / c.aptos[i] : null); },
    tipUF: (uf) => { const c = { turno: store.get().turno, uf, exterior: false }; return tipTable(E.meta.ufs.find((u) => u.sigla === uf).nome, [['% Abstenção', pct(E.PctAbstencao(c))], ['Aptos', int(E.Aptos(c))], ['Comparecimento', int(E.Comparecimento(c))], ['Variação vs. anterior', pp(E.VariacaoAbstencaoPP(c))]]); },
    tipMun: (i) => { const s = store.get(); const c = { turno: s.turno, mun: E.mun.tse[i] }; return tipTable(`${E.mun.nome[i]} (${E.mun.uf[i]})`, [['% Abstenção', pct(E.PctAbstencao(c))], ['Aptos', int(E.Aptos(c))], ['Variação vs. anterior', pp(E.VariacaoAbstencaoPP(c))], ['Alfabetização', pct1raw(E.mun.alfab[i])]]); },
    onLevel: (l) => { level = l; seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === l))); },
  });
  const seg = segmented([{ value: 'uf', label: 'Estados' }, { value: 'mun', label: 'Municípios' }], 'uf', (v) => map.setLevel(v), 'Nível territorial');
  pMap.tools.appendChild(seg);
  pMap.body.insertAdjacentHTML('beforeend', `<div class="map-legend"><span class="item">${pct(DOM[0], 0)}</span><span class="ramp" style="background:linear-gradient(90deg, ${colorAbst(DOM[0])}, ${colorAbst(0.21)}, ${colorAbst(DOM[1])})"></span><span class="item">${pct(DOM[1], 0)} ou mais</span><span class="item"><span class="swatch" style="background:${VIZ.noData}"></span>sem dado</span></div>`);

  const elUF = h('<div class="chart chart--tall"></div>'); pUF.body.appendChild(elUF);
  const elSc = h('<div class="chart"></div>'); pSc.body.appendChild(elSc);
  const elLine = h('<div class="chart"></div>'); pLine.body.appendChild(elLine);
  const elBN = h('<div class="chart"></div>'); pBN.body.appendChild(elBN);
  const cUF = chart(elUF, {}, { onClick: (p) => p.name && store.set({ uf: store.get().uf === p.name ? null : p.name, mun: null }) });
  const cSc = chart(elSc, {}, { onClick: (p) => p.data?.tse && store.set({ mun: p.data.tse }) });
  const cLine = chart(elLine, {});
  const cBN = chart(elBN, {});
  let ufRows = [], lineRows = [], bnRows = [];
  pUF.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('abstencao-por-uf', [{ label: 'UF', key: 'uf' }, { label: '% Abstenção', key: 'v' }], ufRows));
  pLine.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('abstencao-por-regiao', [{ label: 'Turno', key: 'rotulo' }, ...Object.keys(REG_COLORS).map((r) => ({ label: E.meta.regioes[r], key: r }))], lineRows));
  pBN.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('brancos-e-nulos', [{ label: 'Turno', key: 'rotulo' }, { label: '% Brancos', key: 'br' }, { label: '% Nulos', key: 'nu' }], bnRows));

  const table = dataTable(pTab.body, {
    filename: 'participacao-municipios', searchKeys: ['nome', 'uf'], rowKey: (r) => r.tse, sort: { key: 'abst', dir: 'desc' },
    onRowClick: (r) => store.set({ mun: store.get().mun === r.tse ? null : r.tse }),
    columns: [
      { key: 'nome', label: 'Município' }, { key: 'uf', label: 'UF' },
      { key: 'aptos', label: 'Aptos', align: 'r', format: int },
      { key: 'abst', label: '% Abstenção', align: 'r', format: (v) => pct(v) },
      { key: 'ant', label: '% Abst. anterior', align: 'r', format: (v) => pct(v) },
      { key: 'var', label: 'Variação', align: 'r', format: pp },
      { key: 'br', label: '% Brancos', align: 'r', format: (v) => pct(v) },
      { key: 'nu', label: '% Nulos', align: 'r', format: (v) => pct(v) },
      { key: 'alf', label: 'Alfabetização', align: 'r', format: pct1raw },
    ],
  });

  function update(s) {
    const g = geoCtx(s);
    const ctx = { turno: s.turno, ...g };
    const escopo = scopeLabel(E, s);
    const t = E.turnoByKey.get(s.turno);
    const ufVals = E.meta.ufs.filter((u) => u.sigla !== 'ZZ').map((u) => ({ uf: u.sigla, regiao: u.regiao, v: E.PctAbstencao({ turno: s.turno, uf: u.sigla, exterior: false }) }));
    const sorted = [...ufVals].sort((a, b) => b.v - a.v);
    const varAbst = E.VariacaoAbstencaoPP(ctx);
    head.innerHTML = pageHead('Comparecimento e abstenção', 'Quem foi votar e quem ficou em casa',
      `${escapeHtml(cap(noEscopo(E, s)))}, a abstenção foi de <strong>${pct(E.PctAbstencao(ctx))}</strong> no ${escapeHtml(t.rotulo)}${varAbst != null ? ` (${pp(varAbst)} em relação a ${t.ano - 4})` : ''}. Entre as UFs, foi maior em <strong>${sorted[0].uf}</strong> (${pct(sorted[0].v)}) e menor em <strong>${sorted.at(-1).uf}</strong> (${pct(sorted.at(-1).v)}).`,
      escapeHtml(E.turnoByKey.get(s.turno).rotulo), escapeHtml(escopo));
    kpis.innerHTML = [
      kpi({ label: 'Abstenção', value: pct(E.PctAbstencao(ctx)), foot: `${int(E.Abstencoes(ctx))} eleitores` }),
      kpi({ label: 'Variação vs. eleição anterior', value: pp(varAbst), foot: varAbst == null ? `${t.ano - 4} não está na base` : `${pct(E.PctAbstencaoEleicaoAnterior(ctx))} em ${t.ano - 4}` }),
      kpi({ label: 'Comparecimento', value: pct(E.PctComparecimento(ctx)), foot: `${int(E.Comparecimento(ctx))} de ${int(E.Aptos(ctx))} aptos` }),
      kpi({ label: 'Brancos', value: pct(E.PctBrancos(ctx)), foot: `${int(E.VotosBrancos(ctx))} votos` }),
      kpi({ label: 'Nulos', value: pct(E.PctNulos(ctx)), foot: `${int(E.VotosNulos(ctx))} votos` }),
      kpi({ label: 'Brancos + nulos', value: pct(E.PctBrancosNulos(ctx)), foot: 'do comparecimento' }),
    ].join('');
    map.update();
    detail.innerHTML = municipioDetail(E, s);

    const media = E.PctAbstencao({ turno: s.turno, exterior: false });
    ufRows = sorted;
    const asc = [...sorted].reverse();
    cUF.set({
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { formatter: (v) => pct(v, 0) } },
      yAxis: { type: 'category', data: asc.map((r) => r.uf), axisLabel: { fontSize: 10 } },
      tooltip: { trigger: 'item', formatter: (p) => tipBox(p.name, [['% Abstenção', pct(p.value)], ['Média Brasil', pct(media)]]) },
      series: [{ type: 'bar', barMaxWidth: 14, data: asc.map((r) => ({ value: r.v, itemStyle: { color: colorAbst(r.v), opacity: (s.uf && s.uf !== r.uf) || (s.regiao && s.regiao !== r.regiao) ? 0.3 : 1, borderRadius: [0, 3, 3, 0] } })),
        label: { show: true, position: 'right', fontSize: 10, formatter: (p) => pct(p.value, 1), color: C.gray600 },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: C.gold500, width: 2, type: 'solid' }, label: { formatter: () => `Brasil ${pct(media)}`, position: 'end', color: '#6b5100', fontWeight: 700 }, data: [{ xAxis: media }] } }],
    });

    // dispersão por município
    const pts = [];
    const comp = E.turnos[s.turno].comp;
    for (const i of E.selection({ ...g, mun: null, exterior: false })) {
      if (!comp.aptos[i] || E.mun.alfab[i] == null) continue;
      pts.push({ value: [E.mun.alfab[i], comp.abst[i] / comp.aptos[i], comp.aptos[i]], tse: E.mun.tse[i], nome: `${E.mun.nome[i]} (${E.mun.uf[i]})`, itemStyle: { color: REG_COLORS[E.regiaoDe[i]], opacity: s.mun === E.mun.tse[i] ? 1 : 0.5, borderColor: s.mun === E.mun.tse[i] ? C.ink : undefined, borderWidth: s.mun === E.mun.tse[i] ? 2 : 0 } });
    }
    cSc.set({
      grid: { left: 8, right: 16, top: 28, bottom: 28, containLabel: true },
      legend: { show: false },
      xAxis: { type: 'value', name: 'Alfabetização (%)', nameLocation: 'middle', nameGap: 24, scale: true },
      yAxis: { type: 'value', name: '% Abstenção', axisLabel: { formatter: (v) => pct(v, 0) }, scale: true },
      tooltip: { trigger: 'item', formatter: (p) => tipBox(p.data.nome, [['% Abstenção', pct(p.value[1])], ['Alfabetização', pct1raw(p.value[0])], ['Aptos', int(p.value[2])]]) },
      series: [{ type: 'scatter', progressive: 0, data: pts, symbolSize: (v) => Math.max(3, Math.min(26, Math.sqrt(v[2]) / 22)) }],
    });
    pSc.setSub(`Cada ponto é um município ${escapeHtml(doEscopo(E, { ...s, mun: null }))}. Tamanho: eleitores aptos. Cor: região. Clique para selecionar. A alfabetização vem inteira do PBIX.`);

    // séries temporais por região (NoFilter de turno)
    lineRows = E.meta.turnos.map((tt) => {
      const r = { rotulo: tt.rotulo };
      for (const reg of Object.keys(REG_COLORS)) r[reg] = E.PctAbstencao({ turno: tt.chave, regiao: reg, exterior: false });
      return r;
    });
    cLine.set({
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      legend: { top: 0 },
      xAxis: { type: 'category', data: lineRows.map((r) => r.rotulo.replace(' · ', '\n')) },
      yAxis: { type: 'value', scale: true, axisLabel: { formatter: (v) => pct(v, 0) } },
      tooltip: { trigger: 'axis', valueFormatter: (v) => pct(v) },
      series: Object.keys(REG_COLORS).map((reg) => ({ name: E.meta.regioes[reg], type: 'line', smooth: false, symbolSize: 6, data: lineRows.map((r) => r[reg]), lineStyle: { width: s.regiao === reg ? 4 : 2, opacity: s.regiao && s.regiao !== reg ? 0.3 : 1 }, itemStyle: { color: REG_COLORS[reg], opacity: s.regiao && s.regiao !== reg ? 0.3 : 1 } })),
    });

    bnRows = E.meta.turnos.map((tt) => { const c = { ...g, turno: tt.chave, exterior: false }; return { chave: tt.chave, rotulo: tt.rotulo, br: E.PctBrancos(c), nu: E.PctNulos(c) }; });
    cBN.set({
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
      legend: { top: 0 },
      xAxis: { type: 'category', data: bnRows.map((r) => r.rotulo.replace(' · ', '\n')) },
      yAxis: { type: 'value', axisLabel: { formatter: (v) => pct(v, 0) } },
      tooltip: { trigger: 'axis', valueFormatter: (v) => pct(v) },
      series: [
        { name: '% Brancos', type: 'bar', stack: 'bn', data: bnRows.map((r) => ({ value: r.br, itemStyle: { opacity: r.chave === s.turno ? 1 : 0.55 } })), itemStyle: { color: VIZ.blank } },
        { name: '% Nulos', type: 'bar', stack: 'bn', data: bnRows.map((r) => ({ value: r.nu, itemStyle: { opacity: r.chave === s.turno ? 1 : 0.55 } })), itemStyle: { color: VIZ.null } },
      ],
    });

    // tabela de municípios
    const ant = E.hasTurno(`${t.ano - 4}-${t.nr}`) ? E.turnos[`${t.ano - 4}-${t.nr}`].comp : null;
    const rows = [];
    for (const i of E.selection({ ...g, mun: null, exterior: false })) {
      if (!comp.aptos[i]) continue;
      const a = comp.abst[i] / comp.aptos[i];
      const b = ant && ant.aptos[i] ? ant.abst[i] / ant.aptos[i] : null;
      rows.push({ tse: E.mun.tse[i], nome: E.mun.nome[i], uf: E.mun.uf[i], aptos: comp.aptos[i], abst: a, ant: b, var: b != null ? (a - b) * 100 : null, br: comp.comp[i] ? comp.brancos[i] / comp.comp[i] : null, nu: comp.comp[i] ? comp.nulos[i] / comp.comp[i] : null, alf: E.mun.alfab[i] });
    }
    pTab.setSub(`${escapeHtml(escopo)} · ${int(rows.length)} municípios · ordene pelas colunas`);
    table.update(rows, { selectedKey: s.mun });
  }

  return { update, destroy() { map.destroy(); cUF.destroy(); cSc.destroy(); cLine.destroy(); cBN.destroy(); } };
}
