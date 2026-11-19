// 02 — Mapa dos Vencedores
import { h } from '../utils/dom.js';
import { C, VIZ } from '../styles/tokens.js';
import { int, pct, escapeHtml } from '../utils/format.js';
import { panel, segmented, tipTable } from '../components/ui/ui.js';
import { territoryMap } from '../components/maps/territoryMap.js';
import { dataTable } from '../components/tables/dataTable.js';
import { tint, ramp } from '../utils/colors.js';
import { geoCtx, scopeLabel, pageHead, winnerColor, municipioTip, municipioDetail, bindDetailActions, ranking, noEscopo } from './shared.js';

const RAMP_MARGEM = ramp(VIZ.rampMargin);

export function mount(root, { E, store }) {
  root.innerHTML = '';
  let modo = store.get().modo || 'vencedor';
  let porMargem = true;
  const head = h('<div></div>');
  const controls = h('<div class="toolbar" role="toolbar" aria-label="Opções do mapa"></div>');
  const grid = h('<div class="grid grid--map"></div>');
  const pMap = panel({ title: 'Vencedor por município', sub: '' });
  const side = h('<div class="stack"></div>');
  const detail = h('<div></div>');
  const pUF = panel({ title: 'Resultado por UF', sub: 'Sem o exterior. Clique numa UF para detalhar.' });
  side.append(detail, pUF.el);
  grid.append(pMap.el, side);
  const pMun = panel({ title: 'Ranking territorial dos municípios', sub: '' });
  root.append(head, controls, grid, h('<div class="section-gap"></div>'), pMun.el);
  bindDetailActions(detail, store, E);

  const modoSeg = segmented([{ value: 'vencedor', label: 'Vencedor' }, { value: 'candidato', label: '% do candidato' }, { value: 'margem', label: 'Margem' }], modo, (v) => { modo = v; store.set({ modo: v }); }, 'Modo do mapa');
  const levelSeg = segmented([{ value: 'mun', label: 'Municípios' }, { value: 'uf', label: 'Estados' }], 'mun', (v) => map.setLevel(v), 'Nível territorial');
  const chk = h('<label class="check"><input type="checkbox" checked> Tom pela % do vencedor</label>');
  chk.querySelector('input').addEventListener('change', (e) => { porMargem = e.target.checked; map.update(); renderLegend(store.get()); });
  const grp = (label, el) => { const g = h(`<div class="toolbar__group"><span class="toolbar__label">${label}</span></div>`); g.appendChild(el); return g; };
  controls.append(grp('Colorir por', modoSeg), grp('Nível', levelSeg), chk);

  const legend = h('<div class="map-legend"></div>');
  let candAlvo = null; // candidato do modo "% do candidato"
  let ufCache = new Map(), ufKey = '';

  function ufVals(s, uf) {
    const k = `${s.turno}|${candAlvo}`;
    if (k !== ufKey) { ufCache = new Map(); ufKey = k; }
    if (!ufCache.has(uf)) {
      const c = { turno: s.turno, uf, exterior: false };
      ufCache.set(uf, {
        partido: E.PartidoVencedor(c), venc: E.Vencedor(c), pct: E.PctDoVencedor(c), margem: E.MargemDeVitoria(c), abst: E.PctAbstencao(c),
        share: candAlvo ? E.PctVotosValidos({ ...c, cand: { chaves: new Set([candAlvo]) } }) : null,
      });
    }
    return ufCache.get(uf);
  }
  const shareMun = (s, i) => {
    const t = E.turnos[s.turno];
    const res = E.resumoMunicipios(s.turno)[i];
    const v = t.votos[candAlvo]?.[i];
    return res && res.total > 0 && v != null ? v / res.total : null;
  };
  const candColor = () => E.corCandidato(candAlvo);

  const map = territoryMap(pMap.body, {
    E, store, label: 'Mapa dos vencedores por município',
    fillMun(i) {
      const s = store.get();
      const r = E.resumoMunicipios(s.turno)[i];
      if (!r || r.total === 0) return VIZ.noData;
      if (modo === 'candidato') { const v = shareMun(s, i); return v == null ? VIZ.noData : tint(candColor(), Math.max(0.06, v)); }
      if (modo === 'margem') return RAMP_MARGEM(Math.min(1, (r.margem ?? 0) / 0.6));
      return winnerColor(E, r.partido, r.pct, porMargem);
    },
    fillUF(uf) {
      const s = store.get();
      const v = ufVals(s, uf);
      if (modo === 'candidato') return v.share == null ? VIZ.noData : tint(candColor(), Math.max(0.06, v.share));
      if (modo === 'margem') return RAMP_MARGEM(Math.min(1, (v.margem ?? 0) / 0.6));
      return winnerColor(E, v.partido, v.pct, porMargem);
    },
    tipMun(i) {
      const s = store.get();
      const extra = candAlvo && modo === 'candidato' ? [[`% ${E.candByKey.get(candAlvo).nome}`, pct(shareMun(s, i))]] : [];
      return municipioTip(E, s, i, [['Aptos', int(E.turnos[s.turno].comp.aptos[i])], ...extra]);
    },
    tipUF(uf) {
      const s = store.get(); const v = ufVals(s, uf);
      const extra = candAlvo && modo === 'candidato' ? [[`% ${E.candByKey.get(candAlvo).nome}`, pct(v.share)]] : [];
      return tipTable(E.meta.ufs.find((u) => u.sigla === uf)?.nome ?? uf, [['Vencedor', v.venc ?? '—'], ['% do vencedor', pct(v.pct)], ['Margem de vitória', pct(v.margem)], ['% Abstenção', pct(v.abst)], ...extra]);
    },
    onLevel(l) { levelSeg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === l))); pMap.el.querySelector('.panel__title').textContent = l === 'uf' ? 'Vencedor por UF' : 'Vencedor por município'; },
  });
  pMap.body.appendChild(legend);

  function renderLegend(s) {
    if (modo === 'candidato') {
      const c = E.candByKey.get(candAlvo);
      legend.innerHTML = `<span class="item"><b>${escapeHtml(c?.nome ?? '')}</b> · % dos votos válidos</span><span class="item">0%</span><span class="ramp" style="background:linear-gradient(90deg, ${tint(candColor(), 0.06)}, ${candColor()})"></span><span class="item">100%</span>`;
    } else if (modo === 'margem') {
      legend.innerHTML = `<span class="item">Margem de vitória</span><span class="item">0 p.p.</span><span class="ramp" style="background:linear-gradient(90deg, ${RAMP_MARGEM(0)}, ${RAMP_MARGEM(0.5)}, ${RAMP_MARGEM(1)})"></span><span class="item">60+ p.p.</span>`;
    } else {
      const rk = ranking(E, { turno: s.turno }).filter((r) => r.votos).slice(0, 6);
      const partidos = [...new Set(rk.map((r) => r.c.partido))];
      legend.innerHTML = partidos.map((p) => `<span class="item"><span class="swatch" style="background:${E.corPartido(p)}"></span>${escapeHtml(p)}</span>`).join('') +
        `<span class="item"><span class="swatch" style="background:${VIZ.tie}"></span>Empate</span><span class="item"><span class="swatch" style="background:${VIZ.noData}"></span>Sem votos</span>` +
        (porMargem ? '<span class="item">Tom mais claro: vitória mais apertada</span>' : '');
    }
  }

  const ufTable = dataTable(pUF.body, {
    filename: 'resultado-por-uf', maxHeight: 420, pageSize: 30, rowKey: (r) => r.uf, sort: { key: 'pct', dir: 'desc' },
    onRowClick: (r) => store.set({ uf: store.get().uf === r.uf ? null : r.uf, mun: null }),
    columns: [
      { key: 'uf', label: 'UF' },
      { key: 'venc', label: 'Vencedor', format: (v, r) => `<span class="swatch" style="background:${winnerColor(E, r.partido, null, false)}"></span> ${escapeHtml(v ?? '—')}` },
      { key: 'pct', label: '% do vencedor', align: 'r', format: (v) => pct(v) },
      { key: 'margem', label: 'Margem', align: 'r', format: (v) => pct(v) },
      { key: 'abst', label: '% Abstenção', align: 'r', format: (v) => pct(v) },
    ],
  });

  const munTable = dataTable(pMun.body, {
    filename: 'municipios-vencedores', searchKeys: ['nome', 'uf', 'venc'], rowKey: (r) => r.tse, sort: { key: 'aptos', dir: 'desc' },
    onRowClick: (r) => store.set({ mun: store.get().mun === r.tse ? null : r.tse }),
    columns: [
      { key: 'nome', label: 'Município' }, { key: 'uf', label: 'UF' },
      { key: 'venc', label: 'Vencedor', format: (v, r) => `<span class="swatch" style="background:${winnerColor(E, r.partido, null, false)}"></span> ${escapeHtml(v ?? '—')}` },
      { key: 'partido', label: 'Partido' },
      { key: 'pct', label: '% do vencedor', align: 'r', format: (v) => pct(v) },
      { key: 'margem', label: 'Margem', align: 'r', format: (v) => pct(v) },
      { key: 'share', label: '% do candidato', align: 'r', format: (v) => pct(v) },
      { key: 'aptos', label: 'Aptos', align: 'r', format: int },
      { key: 'abst', label: '% Abstenção', align: 'r', format: (v) => pct(v) },
    ],
  });

  function update(s) {
    modo = s.modo || 'vencedor';
    modoSeg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === modo)));
    const nat = ranking(E, { turno: s.turno });
    candAlvo = s.cand || nat[0]?.chave;
    const escopo = scopeLabel(E, { ...s, mun: null });
    const g = { turno: s.turno, ...geoCtx(s), mun: null, exterior: false };
    const top2 = ranking(E, g).filter((r) => r.votos).slice(0, 2);
    const resumo = top2.map((r) => `<strong>${escapeHtml(r.c.nome)}</strong> venceu em <strong>${int(E.MunicipiosVencidos({ ...g, cand: { chaves: new Set([r.chave]) } }))}</strong> municípios`).join('; ');
    head.innerHTML = pageHead('Mapa dos vencedores', 'Onde cada candidato venceu', `${resumo}${escopo !== 'Brasil' ? ` ${escapeHtml(noEscopo(E, { ...s, mun: null }))}` : ''}.`, escapeHtml(E.turnoByKey.get(s.turno).rotulo), escapeHtml(escopo));
    pMap.setSub(modo === 'candidato' ? `% dos votos válidos de ${escapeHtml(E.candByKey.get(candAlvo)?.nome ?? '')} · escolha outro candidato no filtro` : modo === 'margem' ? 'Diferença entre 1º e 2º colocados, em % dos votos válidos' : 'Cor do partido vencedor; empates em cinza');
    map.update();
    renderLegend(s);
    detail.innerHTML = municipioDetail(E, s);

    const ufs = E.meta.ufs.filter((u) => u.sigla !== 'ZZ' && (!s.regiao || u.regiao === s.regiao)).map((u) => ({ uf: u.sigla, ...ufVals(s, u.sigla) }));
    ufTable.update(ufs.map((r) => ({ ...r, venc: r.venc })), { selectedKey: s.uf });

    const res = E.resumoMunicipios(s.turno);
    const rows = [];
    for (const i of E.selection({ ...geoCtx(s), mun: null, exterior: false })) {
      const r = res[i];
      rows.push({ tse: E.mun.tse[i], nome: E.mun.nome[i], uf: E.mun.uf[i], venc: r?.vencedor, partido: r?.partido, pct: r?.pct, margem: r?.margem, share: candAlvo ? shareMun(s, i) : null, aptos: E.turnos[s.turno].comp.aptos[i], abst: E.turnos[s.turno].comp.abst[i] != null && E.turnos[s.turno].comp.aptos[i] ? E.turnos[s.turno].comp.abst[i] / E.turnos[s.turno].comp.aptos[i] : null });
    }
    pMun.setSub(`${escapeHtml(escopo)} · ${int(rows.length)} municípios · coluna "% do candidato" = ${escapeHtml(E.candByKey.get(candAlvo)?.nome ?? '—')}`);
    munTable.update(rows, { selectedKey: s.mun });
  }

  return { update, destroy() { map.destroy(); } };
}
