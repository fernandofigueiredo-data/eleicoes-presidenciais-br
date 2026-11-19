// 04 — Mudanças entre Eleições
import { h, emptyState } from '../utils/dom.js';
import { C, VIZ } from '../styles/tokens.js';
import { int, pct, pp, escapeHtml } from '../utils/format.js';
import { panel, kpi, tipTable, csvButton } from '../components/ui/ui.js';
import { chart, tipBox } from '../components/charts/echarts.js';
import { territoryMap } from '../components/maps/territoryMap.js';
import { dataTable } from '../components/tables/dataTable.js';
import { ramp, RAMP_DIVERGE } from '../utils/colors.js';
import { downloadCSV } from '../utils/csv.js';
import { geoCtx, scopeLabel, pageHead, municipioDetail, bindDetailActions, doEscopo } from './shared.js';

const empate = (x) => !!x && x.includes(' / ');
const GOLD = VIZ.changed, GRAY = VIZ.unchanged, NODATA = C.gray100;
const div = ramp(RAMP_DIVERGE);
const CATS = [
  { k: 'cont', label: 'Mesmo partido e mesmo candidato', color: VIZ.sameAll },
  { k: 'cand', label: 'Mesmo partido, outro candidato', color: VIZ.sameParty },
  { k: 'part', label: 'Outro partido, mesmo candidato', color: VIZ.sameCandidate },
  { k: 'ambos', label: 'Mudaram partido e candidato', color: GOLD },
];

export function mount(root, { E, store }) {
  root.innerHTML = '';
  const head = h('<div></div>');
  const note = h('<p class="callout"><strong>Como ler:</strong> cards, mapa e tabelas comparam o <strong>1º turno</strong> do ano escolhido com o 1º turno de 4 anos antes (PSL 2018 e PL contam como o mesmo campo, porque Bolsonaro trocou de sigla). A matriz segue o turno selecionado e o filtro de partido. Municípios no exterior ficam de fora.</p>');
  const kpis = h('<section class="grid grid--kpis" aria-label="Indicadores de mudança"></section>');
  const body = h('<div></div>');
  root.append(head, note, kpis, body);

  const g1 = h('<div class="grid grid--map section-gap"></div>');
  const pMap = panel({ title: 'Municípios que mudaram de partido vencedor', sub: '' });
  const side = h('<div class="stack"></div>');
  const detail = h('<div></div>');
  const pTrans = panel({ title: 'Transições de partido vencedor', sub: 'De → para, em número de municípios', tools: csvButton() });
  const pCat = panel({ title: 'Mudança de partido × mudança de candidato', sub: 'Classificação dos municípios com resultado nos dois anos' });
  side.append(detail, pCat.el, pTrans.el);
  g1.append(pMap.el, side);
  const g2 = h('<div class="grid grid--2 section-gap"></div>');
  const pTab = panel({ title: 'Municípios que mudaram de partido vencedor', sub: '' });
  const pUF = panel({ title: 'Mudanças por UF', sub: '% dos municípios da UF em que o partido vencedor mudou', tools: csvButton() });
  g2.append(pTab.el, pUF.el);
  const pMx = panel({ title: 'Variação por UF (p.p.)', sub: '', tools: csvButton() });
  body.append(g1, g2, h('<div class="section-gap"></div>'), pMx.el);
  bindDetailActions(detail, store, E);

  const map = territoryMap(pMap.body, {
    E, store, label: 'Mapa de mudança de partido vencedor',
    fillMun: (i) => { const v = E.mudouPartidoMun(E.anoDe(store.get().turno), i); return v == null ? NODATA : v ? GOLD : GRAY; },
    fillUF: () => GRAY,
    tipMun: (i) => {
      const ano = E.anoDe(store.get().turno);
      return tipTable(`${E.mun.nome[i]} (${E.mun.uf[i]})`, [[`Partido vencedor ${ano - 4}`, E.partidoVencedor1T(ano - 4, i) ?? '—'], [`Partido vencedor ${ano}`, E.partidoVencedor1T(ano, i) ?? '—'], [`Candidato ${ano - 4}`, E.vencedor1T(ano - 4, i) ?? '—'], [`Candidato ${ano}`, E.vencedor1T(ano, i) ?? '—'], ['Mudou o partido?', ({ 1: 'Sim', 0: 'Não' })[E.mudouPartidoMun(ano, i)] ?? '—']]);
    },
  });
  pMap.body.insertAdjacentHTML('beforeend', `<div class="map-legend"><span class="item"><span class="swatch" style="background:${GOLD}"></span>Mudou de partido vencedor</span><span class="item"><span class="swatch" style="background:${GRAY}"></span>Manteve o partido vencedor</span><span class="item"><span class="swatch" style="background:${NODATA};border:1px solid ${C.gray300}"></span>Sem comparação</span></div>`);

  const elTrans = h('<div class="chart chart--short"></div>'); pTrans.body.appendChild(elTrans);
  const cTrans = chart(elTrans, {});
  const elUF = h('<div class="chart chart--tall"></div>'); pUF.body.appendChild(elUF);
  const cUF = chart(elUF, {}, { onClick: (p) => p.name && store.set({ uf: store.get().uf === p.name ? null : p.name, mun: null }) });
  let transRows = [], ufRows = [], mx = { rows: [], cols: [] };
  pTrans.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('transicoes-partido', [{ label: 'De', key: 'de' }, { label: 'Para', key: 'para' }, { label: 'Municípios', key: 'n' }], transRows));
  pUF.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('mudancas-por-uf', [{ label: 'UF', key: 'uf' }, { label: 'Municípios que mudaram', key: 'n' }, { label: '% que mudaram', key: 'p' }], ufRows));
  pMx.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('variacao-pp-uf-partido', [{ label: 'UF', key: 'uf' }, ...mx.cols.map((c) => ({ label: c, value: (r) => r[c] }))], mx.rows));

  const table = dataTable(pTab.body, {
    filename: 'municipios-que-mudaram', searchKeys: ['nome', 'uf', 'de', 'para'], rowKey: (r) => r.tse, sort: { key: 'nome', dir: 'asc' },
    onRowClick: (r) => store.set({ mun: store.get().mun === r.tse ? null : r.tse }),
    columns: [
      { key: 'nome', label: 'Município' }, { key: 'uf', label: 'UF' },
      { key: 'de', label: 'Partido anterior', format: (v) => `<span class="swatch" style="background:${E.corPartido(v)}"></span> ${escapeHtml(v)}` },
      { key: 'para', label: 'Partido atual', format: (v) => `<span class="swatch" style="background:${E.corPartido(v)}"></span> ${escapeHtml(v)}` },
      { key: 'cde', label: 'Candidato anterior' }, { key: 'cpara', label: 'Candidato atual' },
    ],
  });
  const mxWrap = h('<div class="dtable-wrap" style="--table-max:640px"></div>'); pMx.body.appendChild(mxWrap);

  function update(s) {
    const ano = E.anoDe(s.turno);
    const g = { ...geoCtx(s), mun: null, exterior: false };
    const escopo = scopeLabel(E, { ...s, mun: null });
    const temAnterior = E.hasTurno(`${ano - 4}-1`);
    head.innerHTML = pageHead('Mudanças entre eleições', 'Onde o partido vencedor mudou',
      temAnterior ? `Do 1º turno de ${ano - 4} para o de ${ano}, o partido vencedor mudou em <strong>${int(E.MunicipiosQueMudaram({ turno: s.turno, ...g }))}</strong> municípios (${pct(E.PctMunicipiosQueMudaram({ turno: s.turno, ...g }))}) ${escapeHtml(doEscopo(E, { ...s, mun: null }))}.` : `${ano} é a primeira eleição da base: não há eleição anterior para comparar.`,
      escapeHtml(E.turnoByKey.get(s.turno).rotulo), escapeHtml(escopo));
    if (!temAnterior) {
      kpis.innerHTML = '';
      body.hidden = true;
      kpis.innerHTML = `<div style="grid-column:1/-1">${emptyState('Sem eleição anterior na base', 'Escolha 2018, 2022 ou 2026 no filtro de eleição.')}</div>`;
      return;
    }
    body.hidden = false;
    const sel = E.selection(g);
    const cats = { cont: 0, cand: 0, part: 0, ambos: 0 };
    const trans = new Map();
    const paresCand = new Map();
    let porEmpate = 0;
    const rows = [];
    const ufCount = new Map();
    for (const i of sel) {
      const mp = E.mudouPartidoMun(ano, i);
      if (mp == null) continue;
      const mc = E.mudouCandidatoMun(ano, i);
      cats[mp ? (mc ? 'ambos' : 'part') : mc ? 'cand' : 'cont']++;
      if (!mp && mc) { const k = `${E.vencedor1T(ano - 4, i)} → ${E.vencedor1T(ano, i)}`; paresCand.set(k, (paresCand.get(k) || 0) + 1); }
      const uf = E.mun.uf[i];
      const u = ufCount.get(uf) || { n: 0, tot: 0 }; u.tot++; if (mp) u.n++; ufCount.set(uf, u);
      if (mp) {
        const de = E.partidoVencedor1T(ano - 4, i), para = E.partidoVencedor1T(ano, i);
        trans.set(`${de}→${para}`, (trans.get(`${de}→${para}`) || 0) + 1);
        if (empate(de) || empate(para)) porEmpate++;
        rows.push({ tse: E.mun.tse[i], nome: E.mun.nome[i], uf, de, para, cde: E.vencedor1T(ano - 4, i), cpara: E.vencedor1T(ano, i) });
      }
    }
    const total = cats.cont + cats.cand + cats.part + cats.ambos;
    const parCand = [...paresCand.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const ctx = { turno: s.turno, ...g };
    kpis.innerHTML = [
      kpi({ label: 'Mudaram de partido vencedor', value: int(E.MunicipiosQueMudaram(ctx)), foot: `de ${int(total)} municípios comparáveis${porEmpate ? ` · ${int((E.MunicipiosQueMudaram(ctx) ?? 0) - porEmpate)} sem contar ${porEmpate === 1 ? 'o empate' : `os ${porEmpate} empates`}` : ''}`, hero: true }),
      kpi({ label: '% que mudaram', value: pct(E.PctMunicipiosQueMudaram(ctx)), foot: `${ano - 4} → ${ano} · 1º turno` }),
      kpi({ label: 'Continuidade partidária', value: int(total - (E.MunicipiosQueMudaram(ctx) ?? 0)), foot: pct(total ? 1 - (E.MunicipiosQueMudaram(ctx) ?? 0) / total : null) }),
      kpi({ label: 'Mudaram de candidato vencedor', value: int(E.MunicipiosQueMudaramCandidato(ctx)), foot: '<span class="tag-derived">derivado</span> não está no PBIX' }),
      kpi({ label: 'Mesmo partido, outro candidato', value: int(cats.cand), foot: parCand ? `principal: ${escapeHtml(parCand)}` : '—' }),
    ].join('');
    pMap.setSub(`${ano - 4} → ${ano} · 1º turno · ${escapeHtml(escopo)}`);
    map.update();
    detail.innerHTML = municipioDetail(E, s);

    pCat.body.innerHTML = `<div class="lede__bar" role="img" aria-label="Classificação das mudanças">${CATS.map((c) => `<span title="${c.label}: ${int(cats[c.k])}" style="width:${total ? (cats[c.k] / total) * 100 : 0}%;background:${c.color}"></span>`).join('')}</div>
      <div style="margin-top:12px;display:grid;gap:6px">${CATS.map((c) => `<div class="result-row" style="margin:0"><span><span class="swatch" style="background:${c.color}"></span> ${c.label}</span><b class="num">${int(cats[c.k])} <small style="color:var(--text-3);font-weight:500">${pct(total ? cats[c.k] / total : null, 1)}</small></b></div>`).join('')}</div>
      <p class="panel__note">"Mudança de partido" é a medida do PBIX (Mudou Partido Vencedor). "Mudança de candidato" compara o nome de urna do vencedor; é um indicador complementar desta aplicação.</p>`;

    transRows = [...trans.entries()].map(([k, n]) => { const [de, para] = k.split('→'); return { de, para, n }; }).sort((a, b) => b.n - a.n);
    const topT = transRows.slice(0, 8).reverse();
    cTrans.set({
      grid: { left: 8, right: 40, top: 4, bottom: 4, containLabel: true },
      xAxis: { type: 'value', axisLabel: { formatter: (v) => int(v) } },
      yAxis: { type: 'category', data: topT.map((r) => `${r.de} → ${r.para}`) },
      tooltip: { trigger: 'item', formatter: (p) => tipBox(p.name, [['Municípios', int(p.value)]]) },
      series: [{ type: 'bar', barMaxWidth: 18, data: topT.map((r) => ({ value: r.n, itemStyle: { color: E.corPartido(r.para), borderRadius: [0, 3, 3, 0] } })), label: { show: true, position: 'right', fontSize: 11, formatter: (p) => int(p.value) } }],
    });

    pTab.setSub(`${int(rows.length)} municípios · ${ano - 4} → ${ano} (1º turno)`);
    table.update(rows, { selectedKey: s.mun });

    ufRows = [...ufCount.entries()].map(([uf, u]) => ({ uf, n: u.n, p: u.tot ? u.n / u.tot : null })).sort((a, b) => a.p - b.p);
    cUF.set({
      grid: { left: 8, right: 52, top: 4, bottom: 4, containLabel: true },
      xAxis: { type: 'value', axisLabel: { formatter: (v) => pct(v, 0) } },
      yAxis: { type: 'category', data: ufRows.map((r) => r.uf), axisLabel: { fontSize: 10 } },
      tooltip: { trigger: 'item', formatter: (p) => tipBox(p.name, [['% que mudaram', pct(p.value)], ['Municípios', int(ufRows[p.dataIndex].n)]]) },
      series: [{ type: 'bar', barMaxWidth: 14, data: ufRows.map((r) => ({ value: r.p, itemStyle: { color: GOLD, opacity: s.uf && s.uf !== r.uf ? 0.3 : 1, borderRadius: [0, 3, 3, 0] } })), label: { show: true, position: 'right', fontSize: 10, formatter: (p) => pct(p.value, 1) } }],
    });

    // Matriz Variação p.p. (segue o turno e o filtro de partido; oculta células vazias)
    const partidosAno = [...new Set(E.candidatosDoTurno(s.turno).map((c) => c.partido))];
    const cols = (s.partido ? [s.partido] : partidosAno).filter((p) => partidosAno.includes(p));
    const ufs = E.meta.ufs.filter((u) => u.sigla !== 'ZZ' && (!s.regiao || u.regiao === s.regiao) && (!s.uf || u.sigla === s.uf));
    const mrows = ufs.map((u) => {
      const r = { uf: u.sigla };
      for (const p of cols) r[p] = E.VariacaoPP({ turno: s.turno, uf: u.sigla, exterior: false, cand: { partidos: new Set([p]) } });
      return r;
    });
    const total_ = { uf: 'Total' };
    for (const p of cols) total_[p] = E.VariacaoPP({ turno: s.turno, ...g, cand: { partidos: new Set([p]) } });
    const visCols = cols.filter((p) => mrows.some((r) => r[p] != null));
    mx = { rows: [...mrows, total_], cols: visCols };
    pMx.setSub(`% dos votos válidos no ${escapeHtml(E.turnoByKey.get(s.turno).rotulo)} menos o de ${ano - 4} (mesmo turno), por partido${s.partido ? ` · filtro: ${escapeHtml(s.partido)}` : ''}. Partidos sem eleição anterior não aparecem.`);
    mxWrap.innerHTML = visCols.length ? `<table class="dtable matrix"><thead><tr><th>UF</th>${visCols.map((c) => `<th class="r"><span class="swatch" style="background:${E.corPartido(c)}"></span> ${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${mx.rows.map((r) => `<tr${r.uf === 'Total' ? ' style="font-weight:700"' : ''}><td>${r.uf}</td>${visCols.map((c) => { const v = r[c]; const bg = v == null ? 'transparent' : div(0.5 + Math.max(-1, Math.min(1, v / 20)) / 2); return `<td class="cell" style="background:${bg};color:${v != null && Math.abs(v) > 12 ? '#fff' : 'inherit'}">${pp(v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>` : emptyState('Sem variação para mostrar', 'O partido escolhido não disputou o mesmo turno 4 anos antes.');
  }

  return { update, destroy() { map.destroy(); cTrans.destroy(); cUF.destroy(); } };
}
