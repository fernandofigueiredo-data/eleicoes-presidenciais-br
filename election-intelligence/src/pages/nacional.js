// 01 — Visão Nacional
import { h, emptyState } from '../utils/dom.js';
import { C, VIZ } from '../styles/tokens.js';
import { int, pct, escapeHtml } from '../utils/format.js';
import { panel, kpi, csvButton } from '../components/ui/ui.js';
import { chart, tipBox } from '../components/charts/echarts.js';
import { dataTable } from '../components/tables/dataTable.js';
import { tileGridSVG } from '../components/maps/tileGrid.js';
import { downloadCSV } from '../utils/csv.js';
import { geoCtx, ranking, scopeLabel, pageHead, winnerColor, noEscopo } from './shared.js';
import { isDark } from '../utils/colors.js';

export function mount(root, { E, store, dados }) {
  root.innerHTML = '';
  const head = h('<div></div>');
  const lede = h('<section class="lede" aria-label="Resumo do resultado"></section>');
  const kpis = h('<section class="grid grid--kpis" aria-label="Indicadores gerais"></section>');
  const row1 = h('<div class="grid grid--2 section-gap"></div>');
  const row2 = h('<div class="grid grid--wide-narrow section-gap"></div>');
  const pVotos = panel({ title: 'Votos válidos por candidato', sub: 'Clique numa barra para selecionar o candidato', tools: csvButton() });
  const pMun = panel({ title: 'Municípios vencidos', sub: 'Sem o exterior. Um empate conta para os dois candidatos.', tools: csvButton() });
  const pPart = panel({ title: 'Participação ao longo das eleições', sub: 'Todos os turnos, no território escolhido. O turno em foco fica destacado.', tools: csvButton() });
  const pUF = panel({ title: 'Distribuição territorial', sub: 'Vencedor em cada UF. Tom mais claro, vitória mais apertada. Clique para filtrar.' });
  const pTab = panel({ title: 'Ranking de candidatos', sub: '' });
  row1.append(pVotos.el, pMun.el);
  row2.append(pPart.el, pUF.el);
  root.append(head, lede, kpis, row1, row2, h('<div class="section-gap"></div>'), pTab.el);

  const elV = h('<div class="chart chart--tall"></div>'); pVotos.body.appendChild(elV);
  const elM = h('<div class="chart chart--tall"></div>'); pMun.body.appendChild(elM);
  const elP = h('<div class="chart"></div>'); pPart.body.appendChild(elP);
  const espera = h('<div class="chart-wait" role="status">Carregando os resultados dos outros turnos…</div>'); pPart.body.prepend(espera);
  const elU = h('<div></div>'); pUF.body.appendChild(elU);

  const toggleCand = (chave) => { const s = store.get(); store.set({ cand: s.cand === chave ? null : chave }); };
  const cV = chart(elV, {}, { onClick: (p) => p.data?.chave && toggleCand(p.data.chave) });
  const cM = chart(elM, {}, { onClick: (p) => p.data?.chave && toggleCand(p.data.chave) });
  const cP = chart(elP, {});
  elU.addEventListener('click', (ev) => { const uf = ev.target.closest('[data-uf]')?.dataset.uf; if (uf) store.set({ uf: store.get().uf === uf ? null : uf, mun: null }); });
  elU.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); } if (ev.key === 'Enter' || ev.key === ' ') ev.target.closest('[data-uf]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

  let rows = [], partRows = [], munRows = [];
  const table = dataTable(pTab.body, {
    filename: 'ranking-candidatos',
    rowKey: (r) => r.chave,
    onRowClick: (r) => toggleCand(r.chave),
    sort: { key: 'votos', dir: 'desc' },
    columns: [
      { key: 'pos', label: 'Posição', align: 'r', value: (r) => r.pos },
      { key: 'nome', label: 'Candidato', value: (r) => r.c.nome, format: (v, r) => `<span class="swatch" style="background:${E.corPartido(r.c.partido)}"></span> ${escapeHtml(v)}` },
      { key: 'partido', label: 'Partido', value: (r) => r.c.partido },
      { key: 'votos', label: 'Votos', align: 'r', value: (r) => r.votos, format: int },
      { key: 'pct', label: '% votos válidos', align: 'r', value: (r) => r.pct, format: (v) => `<span class="bar-cell" style="width:${Math.round((v || 0) * 80)}px;background:var(--navy-800)"></span>${pct(v)}` },
      { key: 'mv', label: 'Municípios vencidos', align: 'r', value: (r) => r.mv, format: int },
      { key: 'sit', label: 'Situação no turno', value: (r) => r.sit },
    ],
  });

  pVotos.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('votos-por-candidato', [{ label: 'Candidato', value: (r) => r.c.nome }, { label: 'Partido', value: (r) => r.c.partido }, { label: 'Votos', value: (r) => r.votos }, { label: '% votos válidos', value: (r) => r.pct }], rows));
  pMun.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('municipios-vencidos', [{ label: 'Candidato', value: (r) => r.c.nome }, { label: 'Partido', value: (r) => r.c.partido }, { label: 'Municípios vencidos', value: (r) => r.mv }], munRows));
  pPart.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('participacao-turnos', [{ label: 'Turno', key: 'rotulo' }, { label: '% Abstenção', key: 'abst' }, { label: '% Brancos', key: 'br' }, { label: '% Nulos', key: 'nu' }], partRows));

  function update(s) {
    const g = geoCtx(s);
    const ctx = { turno: s.turno, ...g };
    const escopo = scopeLabel(E, s);
    // ranking
    const rk = ranking(E, ctx).filter((r) => r.votos != null);
    const posicoes = E.Posicao(ctx);
    const mvCtx = { turno: s.turno, ...g, exterior: false };
    rows = rk.map((r) => ({ ...r, pos: posicoes.get(r.c.nome) ?? null, mv: E.MunicipiosVencidos({ ...mvCtx, cand: { chaves: new Set([r.chave]) } }) ?? 0, sit: E.meta.situacao[s.turno]?.[r.chave] ?? '' }));
    const w = rows[0], r2 = rows[1];

    // título jornalístico: o resultado é a notícia; o rótulo da eleição vai para o sobretítulo
    const venc = E.Vencedor(ctx);
    const pv = E.PctDoVencedor(ctx);
    const onde = escopo !== 'Brasil' ? ` ${escapeHtml(noEscopo(E, s))}` : '';
    const eleito = w && /eleito/i.test(w.sit) && !/não/i.test(w.sit) && escopo === 'Brasil';
    const verbo = E.nrDe(s.turno) === 2 || eleito ? 'vence' : 'lidera';
    const titulo = venc ? `${escapeHtml(venc)} ${verbo}${onde} com ${pct(pv)} dos votos válidos` : 'Sem votos registrados para o recorte';
    const dek = w && r2
      ? `${escapeHtml(r2.c.nome)} teve ${pct(r2.pct)}. A diferença foi de <strong>${int(w.votos - r2.votos)} votos</strong> (${pct(E.MargemDeVitoria(ctx))} dos válidos). Compareceram ${pct(E.PctComparecimento(ctx))} dos eleitores aptos.`
      : '';
    head.innerHTML = pageHead('Visão nacional', titulo, dek, escapeHtml(E.TituloEleicao(ctx)), escapeHtml(escopo));

    // faixa do resultado: os dois primeiros nas pontas, barra com todos, marca de 50% no 2º turno
    const top = rows.slice(0, 5), outros = rows.slice(5).reduce((a, r) => a + (r.pct || 0), 0);
    const end = (r, right = false) => `<div class="lede__cand ${right ? 'lede__cand--right' : ''}">
        <span class="lede__name"><span class="swatch" style="background:${E.corPartido(r.c.partido)}"></span>${escapeHtml(r.c.nome)} <small>${escapeHtml(r.c.partido)}</small></span>
        <span class="lede__pct" style="color:${E.corPartido(r.c.partido)}">${pct(r.pct)}</span>
        <span class="lede__votes">${int(r.votos)} votos · ${int(r.mv)} municípios</span></div>`;
    const segs = [...top.slice(0, 1), ...top.slice(2), ...top.slice(1, 2)]; // 2º colocado na ponta direita
    const bar = `<div class="lede__bar" role="img" aria-label="Divisão dos votos válidos: ${top.map((r) => `${escapeHtml(r.c.nome)} ${pct(r.pct)}`).join(', ')}">${segs.map((r, k) => (k === segs.length - 1 && outros > 0 ? `<span style="width:${outros * 100}%;background:${C.gray300}"></span>` : '') + `<span title="${escapeHtml(r.c.nome)} ${pct(r.pct)}" style="width:${(r.pct || 0) * 100}%;background:${E.corPartido(r.c.partido)}"></span>`).join('')}${E.nrDe(s.turno) === 2 ? '<i class="lede__mid" aria-hidden="true"></i>' : ''}</div>`;
    const resto = [...top.slice(2)];
    lede.innerHTML = w && r2 ? `<div class="lede__ends">${end(w)}${end(r2, true)}</div>${bar}
      ${resto.length || outros > 0 ? `<div class="lede__legend">${resto.map((r) => `<span><span class="swatch" style="background:${E.corPartido(r.c.partido)}"></span> ${escapeHtml(r.c.nome)} <b>${pct(r.pct)}</b></span>`).join('')}${outros > 0 ? `<span><span class="swatch" style="background:${C.gray300}"></span> Outros ${rows.length - 5} <b>${pct(outros)}</b></span>` : ''}</div>` : ''}`
      : emptyState('Sem votos para o recorte', 'Escolha outro território ou turno.');

    kpis.innerHTML = [
      kpi({ label: 'Eleitores aptos', value: int(E.Aptos(ctx)), foot: `${int(E.Municipios(ctx))} municípios` }),
      kpi({ label: 'Comparecimento', value: int(E.Comparecimento(ctx)), foot: `${pct(E.PctComparecimento(ctx))} dos aptos` }),
      kpi({ label: 'Votos válidos', value: int(E.VotosValidos(ctx)), foot: `${pct((E.VotosValidos(ctx) ?? 0) / (E.Comparecimento(ctx) || NaN))} do comparecimento` }),
      kpi({ label: 'Abstenção', value: pct(E.PctAbstencao(ctx)), foot: `${int(E.Abstencoes(ctx))} eleitores` }),
      kpi({ label: 'Votos brancos', value: pct(E.PctBrancos(ctx)), foot: `${int(E.VotosBrancos(ctx))} votos` }),
      kpi({ label: 'Votos nulos', value: pct(E.PctNulos(ctx)), foot: `${int(E.VotosNulos(ctx))} votos` }),
    ].join('');

    const sel = s.cand;
    const bars = [...rows].sort((a, b) => (a.votos || 0) - (b.votos || 0));
    const itemStyle = (r) => ({ color: E.corPartido(r.c.partido), opacity: sel && sel !== r.chave ? 0.28 : 1, borderRadius: [0, 4, 4, 0] });
    cV.set({
      grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', max: 1, axisLabel: { formatter: (v) => pct(v, 0) } },
      yAxis: { type: 'category', data: bars.map((r) => r.c.nome) },
      tooltip: { trigger: 'item', formatter: (p) => { const r = p.data.r; return tipBox(r.c.nome, [['Partido', r.c.partido], ['Votos', int(r.votos)], ['% votos válidos', pct(r.pct)], ['Municípios vencidos', int(r.mv)]]); } },
      series: [{ type: 'bar', barMaxWidth: 26, data: bars.map((r) => ({ value: r.pct, chave: r.chave, r, itemStyle: itemStyle(r) })), label: { show: true, position: 'right', formatter: (p) => pct(p.value), fontSize: 11, color: C.gray700 } }],
    });
    munRows = rows.filter((r) => r.mv > 0).sort((a, b) => a.mv - b.mv);
    cM.set({
      grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { formatter: (v) => int(v) } },
      yAxis: { type: 'category', data: munRows.map((r) => r.c.nome) },
      tooltip: { trigger: 'item', formatter: (p) => tipBox(p.data.r.c.nome, [['Municípios vencidos', int(p.value)], ['Partido', p.data.r.c.partido]]) },
      series: [{ type: 'bar', barMaxWidth: 26, data: munRows.map((r) => ({ value: r.mv, chave: r.chave, r, itemStyle: itemStyle(r) })), label: { show: true, position: 'right', formatter: (p) => int(p.value), fontSize: 11, color: C.gray700 } }],
    });

    // participação (não filtrada por turno — interação NoFilter no PBIX). Usa os 8 turnos: espera todos chegarem.
    const completo = !dados || dados.todos();
    espera.hidden = completo;
    elP.style.visibility = completo ? 'visible' : 'hidden';
    pPart.tools.querySelector('[data-action=csv]').disabled = !completo;
    if (completo) partRows = E.meta.turnos.map((t) => { const c = { ...g, turno: t.chave }; return { chave: t.chave, rotulo: t.rotulo, abst: E.PctAbstencao(c), br: E.PctBrancos(c), nu: E.PctNulos(c) }; });
    const cur = (k) => partRows.map((r) => ({ value: r[k], itemStyle: { opacity: r.chave === s.turno ? 1 : 0.55 } }));
    if (completo) cP.set({
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
      legend: { top: 0, left: 0 },
      xAxis: { type: 'category', data: partRows.map((r) => r.rotulo.replace(' · ', '\n')) },
      yAxis: { type: 'value', axisLabel: { formatter: (v) => pct(v, 0) } },
      tooltip: { trigger: 'axis', valueFormatter: (v) => pct(v) },
      series: [
        { name: '% Abstenção', type: 'bar', data: cur('abst'), itemStyle: { color: VIZ.abstention } },
        { name: '% Brancos', type: 'bar', data: cur('br'), itemStyle: { color: VIZ.blank } },
        { name: '% Nulos', type: 'bar', data: cur('nu'), itemStyle: { color: VIZ.null } },
      ],
    });

    // cartograma de UFs
    const items = new Map();
    for (const u of E.meta.ufs) {
      if (u.sigla === 'ZZ') continue;
      const c = { turno: s.turno, uf: u.sigla, exterior: false };
      const partido = E.PartidoVencedor(c), pctV = E.PctDoVencedor(c);
      const color = winnerColor(E, partido, pctV);
      items.set(u.sigla, { color: s.regiao && u.regiao !== s.regiao ? VIZ.outOfScope : color, dark: isDark(color), sub: pct(pctV, 0), title: `${u.nome}: ${E.Vencedor(c) ?? '—'} ${pct(pctV)}` });
    }
    elU.innerHTML = tileGridSVG(items, { selected: s.uf }) + `<div class="map-legend">${[...new Set(rows.slice(0, 4).map((r) => r.c.partido))].map((p) => `<span class="item"><span class="swatch" style="background:${E.corPartido(p)}"></span>${escapeHtml(p)}</span>`).join('')}</div>`;

    pTab.setSub(`${escapeHtml(E.turnoByKey.get(s.turno).rotulo)} · ${escapeHtml(escopo)} · clique numa linha para selecionar`);
    table.update(rows, { selectedKey: s.cand });
  }

  return { update, aoCarregarTudo: update, destroy() { cV.destroy(); cM.destroy(); cP.destroy(); } };
}
