// 05 — Primeiro e Segundo Turno
import { h, emptyState } from '../utils/dom.js';
import { C, VIZ } from '../styles/tokens.js';
import { int, pct, pp, signedInt, escapeHtml } from '../utils/format.js';
import { panel, kpi, tipTable, csvButton } from '../components/ui/ui.js';
import { chart, tipBox } from '../components/charts/echarts.js';
import { territoryMap } from '../components/maps/territoryMap.js';
import { dataTable } from '../components/tables/dataTable.js';
import { downloadCSV } from '../utils/csv.js';
import { geoCtx, scopeLabel, pageHead, municipioDetail, bindDetailActions, noEscopo } from './shared.js';

const empate = (x) => !!x && x.includes(' / ');
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const GOLD = VIZ.changed, GRAY = VIZ.unchanged, NODATA = C.gray100;

export function mount(root, { E, store }) {
  root.innerHTML = '';
  const head = h('<div></div>');
  const note = h('<p class="callout"><strong>Como ler:</strong> compara o vencedor de cada município no 1º e no 2º turno do mesmo ano. Empate em um dos turnos conta como virada (regra do PBIX). Municípios no exterior ficam de fora. Os números são agregados: não mostram para onde foi o voto de cada eleitor.</p>');
  const kpis = h('<section class="grid grid--kpis" aria-label="Indicadores de virada"></section>');
  const pCand = panel({ title: 'Candidatos no 2º turno', sub: 'Votos e % dos válidos nos dois turnos (sem exterior)' });
  const g1 = h('<div class="grid grid--map section-gap"></div>');
  const pMap = panel({ title: 'Municípios que viraram no 2º turno', sub: '' });
  const side = h('<div class="stack"></div>');
  const detail = h('<div></div>');
  const pTab = panel({ title: 'Lista de municípios que viraram', sub: '' });
  side.append(detail, pTab.el);
  g1.append(pMap.el, side);
  const g2 = h('<div class="grid grid--2 section-gap"></div>');
  const pVar = panel({ title: 'Variação por UF (p.p.)', sub: '% dos válidos no 2º turno menos no 1º turno', tools: csvButton() });
  const pFlip = panel({ title: 'Viradas por UF', sub: 'Número de municípios que trocaram de vencedor', tools: csvButton() });
  g2.append(pVar.el, pFlip.el);
  pCand.el.classList.add('section-gap');
  root.append(head, note, kpis, pCand.el, g1, g2);
  bindDetailActions(detail, store, E);

  const map = territoryMap(pMap.body, {
    E, store, label: 'Mapa de viradas no 2º turno',
    fillMun: (i) => { const v = E.virouMun(E.anoDe(store.get().turno), i); return v == null ? NODATA : v ? GOLD : GRAY; },
    fillUF: () => GRAY,
    tipMun: (i) => { const ano = E.anoDe(store.get().turno); const r2 = E.resumoMunicipios(`${ano}-2`)[i]; return tipTable(`${E.mun.nome[i]} (${E.mun.uf[i]})`, [['Vencedor 1º turno', E.vencedorTurnoMun(ano, 1, i) ?? '—'], ['Vencedor 2º turno', E.vencedorTurnoMun(ano, 2, i) ?? '—'], ['Margem no 2º turno', pct(r2?.margem)], ['Virou?', ({ 1: 'Sim', 0: 'Não' })[E.virouMun(ano, i)] ?? '—']]); },
  });
  pMap.body.insertAdjacentHTML('beforeend', `<div class="map-legend"><span class="item"><span class="swatch" style="background:${GOLD}"></span>Virou no 2º turno</span><span class="item"><span class="swatch" style="background:${GRAY}"></span>Manteve o vencedor</span><span class="item"><span class="swatch" style="background:${NODATA};border:1px solid ${C.gray300}"></span>Sem comparação</span></div>`);

  const candTable = dataTable(pCand.body, {
    filename: 'candidatos-1o-e-2o-turno', pageSize: 10, sort: { key: 'v2', dir: 'desc' },
    columns: [
      { key: 'nome', label: 'Candidato', format: (v, r) => `<span class="swatch" style="background:${E.corPartido(r.partido)}"></span> ${escapeHtml(v)}` },
      { key: 'v1', label: 'Votos 1º turno', align: 'r', format: int }, { key: 'v2', label: 'Votos 2º turno', align: 'r', format: int },
      { key: 'ganho', label: 'Votos ganhos no 2º turno', align: 'r', format: signedInt },
      { key: 'p1', label: '% válidos 1º turno', align: 'r', format: (v) => pct(v) }, { key: 'p2', label: '% válidos 2º turno', align: 'r', format: (v) => pct(v) },
      { key: 'var', label: 'Variação', align: 'r', format: pp },
    ],
  });
  const flipTable = dataTable(pTab.body, {
    filename: 'municipios-que-viraram', searchKeys: ['nome', 'uf', 'v1', 'v2'], maxHeight: 360, rowKey: (r) => r.tse, sort: { key: 'aptos', dir: 'desc' },
    onRowClick: (r) => store.set({ mun: store.get().mun === r.tse ? null : r.tse }),
    columns: [{ key: 'nome', label: 'Município' }, { key: 'uf', label: 'UF' }, { key: 'v1', label: 'Vencedor 1º turno' }, { key: 'v2', label: 'Vencedor 2º turno' }, { key: 'm2', label: 'Margem 2º', align: 'r', format: (v) => pct(v) }, { key: 'aptos', label: 'Aptos', align: 'r', format: int }],
  });
  const elVar = h('<div class="chart chart--tall"></div>'); pVar.body.appendChild(elVar);
  const elFlip = h('<div class="chart chart--tall"></div>'); pFlip.body.appendChild(elFlip);
  const cVar = chart(elVar, {}, { onClick: (p) => p.name && store.set({ uf: store.get().uf === p.name ? null : p.name, mun: null }) });
  const cFlip = chart(elFlip, {}, { onClick: (p) => p.name && store.set({ uf: store.get().uf === p.name ? null : p.name, mun: null }) });
  let varRows = [], flipRows = [], finalistas = [];
  pVar.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('variacao-turnos-uf', [{ label: 'UF', key: 'uf' }, ...finalistas.map((c) => ({ label: c.nome, value: (r) => r[c.chave] }))], varRows));
  pFlip.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('viradas-por-uf', [{ label: 'UF', key: 'uf' }, { label: 'Municípios que viraram', key: 'n' }, { label: '% dos municípios', key: 'p' }], flipRows));

  function update(s) {
    const ano = E.anoDe(s.turno);
    const t2 = `${ano}-2`;
    const g = { ...geoCtx(s), mun: null, exterior: false };
    const escopo = scopeLabel(E, { ...s, mun: null });
    const ctx = { turno: s.turno, ...g };
    if (!E.hasTurno(t2)) { head.innerHTML = pageHead('1º e 2º turno', 'Do 1º ao 2º turno', `${ano} não teve 2º turno na base.`); kpis.innerHTML = emptyState('Sem 2º turno'); return; }
    finalistas = Object.keys(E.turnos[t2].votos).map((k) => E.candByKey.get(k));
    const sel = E.selection(g);
    const flips = [];
    const porDirecao = new Map();
    const ufC = new Map();
    let validos = 0, porEmpate = 0;
    for (const i of sel) {
      const v = E.virouMun(ano, i);
      if (v == null) continue;
      validos++;
      const uf = E.mun.uf[i];
      const u = ufC.get(uf) || { n: 0, tot: 0 }; u.tot++;
      if (v) {
        u.n++;
        const v2 = E.vencedorTurnoMun(ano, 2, i);
        if (empate(v2) || empate(E.vencedorTurnoMun(ano, 1, i))) porEmpate++;
        porDirecao.set(v2, (porDirecao.get(v2) || 0) + 1);
        flips.push({ tse: E.mun.tse[i], nome: E.mun.nome[i], uf, v1: E.vencedorTurnoMun(ano, 1, i), v2, m2: E.resumoMunicipios(t2)[i]?.margem, aptos: E.turnos[t2].comp.aptos[i] });
      }
      ufC.set(uf, u);
    }
    const nVir = E.MunicipiosQueViraram(ctx) ?? 0;
    const direcoes = [...porDirecao.entries()].sort((a, b) => b[1] - a[1]);
    head.innerHTML = pageHead('1º e 2º turno', 'Onde o vencedor virou no 2º turno',
      `${escapeHtml(cap(noEscopo(E, { ...s, mun: null })))}, <strong>${int(nVir)}</strong> municípios (${pct(E.PctMunicipiosQueViraram(ctx))}) trocaram de vencedor entre os turnos de ${ano}. ${direcoes.map(([n, c]) => (empate(n) ? `em ${int(c)} o 2º turno empatou` : `${escapeHtml(n)} virou em ${int(c)}`)).join('; ')}.`,
      escapeHtml(E.turnoByKey.get(s.turno).rotulo), escapeHtml(escopo));
    const rowsCand = finalistas.map((c) => {
      const cc = { ...ctx, cand: { chaves: new Set([c.chave]) } };
      return { chave: c.chave, nome: c.nome, partido: c.partido, v1: E.Votos1T(cc), v2: E.Votos2T(cc), ganho: E.VotosGanhos2T(cc), p1: E.PctVotosValidos1T(cc), p2: E.PctVotosValidos2T(cc), var: E.VariacaoEntreTurnosPP(cc) };
    }).sort((a, b) => b.v2 - a.v2);
    kpis.innerHTML = [
      kpi({ label: 'Municípios que viraram', value: int(nVir), foot: `de ${int(validos)} com resultado nos dois turnos${porEmpate ? ` · ${int(nVir - porEmpate)} sem contar ${porEmpate === 1 ? 'o empate' : `os ${porEmpate} empates`}` : ''}`, hero: true }),
      kpi({ label: '% que viraram', value: pct(E.PctMunicipiosQueViraram(ctx)), foot: `${ano} · 1º → 2º turno` }),
      kpi({ label: 'Mantiveram o vencedor', value: int(validos - nVir), foot: pct(validos ? (validos - nVir) / validos : null) }),
      ...rowsCand.slice(0, 2).map((r) => kpi({ label: `Votos ganhos · ${r.nome}`, value: signedInt(r.ganho), foot: `${pct(r.p1)} → ${pct(r.p2)} (${pp(r.var)})`, swatch: E.corPartido(r.partido) })),
    ].join('');
    candTable.update(rowsCand);
    pMap.setSub(`${ano} · ${escapeHtml(escopo)}`);
    map.update();
    detail.innerHTML = municipioDetail(E, s);
    pTab.setSub(`${int(flips.length)} municípios · clique para selecionar`);
    flipTable.update(flips, { selectedKey: s.mun });

    const ufs = E.meta.ufs.filter((u) => u.sigla !== 'ZZ' && (!s.regiao || u.regiao === s.regiao));
    varRows = ufs.map((u) => { const r = { uf: u.sigla }; for (const c of finalistas) r[c.chave] = E.VariacaoEntreTurnosPP({ turno: s.turno, uf: u.sigla, exterior: false, cand: { chaves: new Set([c.chave]) } }); return r; });
    cVar.set({
      grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true }, legend: { top: 0 },
      xAxis: { type: 'value', axisLabel: { formatter: (v) => `${v > 0 ? '+' : ''}${v} p.p.` } },
      yAxis: { type: 'category', data: varRows.map((r) => r.uf), inverse: true, axisLabel: { fontSize: 10 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => pp(v) },
      series: finalistas.map((c) => ({ name: c.nome, type: 'bar', barMaxWidth: 9, data: varRows.map((r) => ({ value: r[c.chave], itemStyle: { opacity: s.uf && s.uf !== r.uf ? 0.3 : 1 } })), itemStyle: { color: E.corPartido(c.partido) } })),
    });
    flipRows = [...ufC.entries()].map(([uf, u]) => ({ uf, n: u.n, p: u.tot ? u.n / u.tot : null })).sort((a, b) => a.n - b.n);
    cFlip.set({
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { formatter: (v) => int(v) } },
      yAxis: { type: 'category', data: flipRows.map((r) => r.uf), axisLabel: { fontSize: 10 } },
      tooltip: { trigger: 'item', formatter: (p) => tipBox(p.name, [['Municípios que viraram', int(p.value)], ['% dos municípios da UF', pct(flipRows[p.dataIndex].p)]]) },
      series: [{ type: 'bar', barMaxWidth: 14, data: flipRows.map((r) => ({ value: r.n, itemStyle: { color: GOLD, opacity: s.uf && s.uf !== r.uf ? 0.3 : 1, borderRadius: [0, 3, 3, 0] } })), label: { show: true, position: 'right', fontSize: 10, formatter: (p) => int(p.value) } }],
    });
  }

  return { update, destroy() { map.destroy(); cVar.destroy(); cFlip.destroy(); } };
}
