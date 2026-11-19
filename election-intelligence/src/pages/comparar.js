// 07 — Comparar (melhoria funcional: comparação de candidatos e de territórios)
import { h, ICONS } from '../utils/dom.js';
import { C, VIZ } from '../styles/tokens.js';
import { int, pct, pp, brl, pct1raw, escapeHtml } from '../utils/format.js';
import { panel, csvButton, toast } from '../components/ui/ui.js';
import { chart } from '../components/charts/echarts.js';
import { combobox, selectField } from '../components/filters/combobox.js';
import { downloadCSV } from '../utils/csv.js';
import { pageHead, ranking } from './shared.js';

export function mount(root, { E, store }) {
  root.innerHTML = '';
  const head = h('<div></div>');
  const pC = panel({ title: 'Comparação de candidatos', sub: 'Mesma eleição e turno · até 4 candidatos', tools: csvButton() });
  const pT = panel({ title: 'Comparação territorial', sub: 'Brasil, regiões, estados e municípios lado a lado · até 4', tools: csvButton() });
  root.append(head, pC.el, h('<div class="section-gap"></div>'), pT.el);

  // --- candidatos
  const cPick = h('<div class="dtable-tools"></div>');
  const cChips = h('<div style="display:flex;gap:6px;flex-wrap:wrap"></div>');
  const cCards = h('<div class="grid grid--kpis-4" style="margin:12px 0"></div>');
  const elC = h('<div class="chart chart--tall"></div>');
  pC.body.append(cPick, cChips, cCards, elC);
  const chC = chart(elC, {});
  const candSel = selectField({ label: 'Adicionar candidato', allLabel: 'Escolha…', options: [], value: null, onChange: (v) => { if (!v) return; const s = store.get(); const list = [...new Set([...(cur(s)), v])]; if (list.length > 4) toast('Máximo de 4 candidatos'); store.set({ cmpC: list.slice(-4) }); candSel.setValue(null); } });
  cPick.appendChild(candSel.el);
  cChips.addEventListener('click', (ev) => { const k = ev.target.closest('[data-rm]')?.dataset.rm; if (k) store.set({ cmpC: cur(store.get()).filter((x) => x !== k) }); });

  const cur = (s) => {
    if (s.cmpC?.length) return s.cmpC;
    return ranking(E, { turno: s.turno }).filter((r) => r.votos).slice(0, 2).map((r) => r.chave);
  };
  let cRows = [], tRows = [], terrs = [];

  // --- territórios
  const tPick = h('<div class="dtable-tools" style="align-items:flex-end"></div>');
  const tChips = h('<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"></div>');
  const tTable = h('<div class="dtable-wrap" style="--table-max:700px"></div>');
  const elT = h('<div class="chart" style="margin-top:16px"></div>');
  pT.body.append(tPick, tChips, tTable, elT);
  const chT = chart(elT, {});
  const opts = [
    ...Object.entries(E.meta.regioes).filter(([k]) => k !== 'EX').map(([k, v]) => ({ value: `r:${k}`, label: `Região ${v}`, hint: 'região' })),
    ...E.meta.ufs.filter((u) => u.sigla !== 'ZZ').map((u) => ({ value: `u:${u.sigla}`, label: u.nome, hint: u.sigla })),
    ...E.mun.tse.map((t, i) => (E.mun.exterior[i] ? null : { value: `m:${t}`, label: `${E.mun.nome[i]}`, hint: E.mun.uf[i], search: `${E.mun.nome[i]} ${E.mun.uf[i]}` })).filter(Boolean),
  ];
  const terrBox = combobox({ label: 'Adicionar território', placeholder: 'Região, estado ou município…', options: opts, value: null, max: 60, onChange: (v) => { if (!v) return; const s = store.get(); const list = [...new Set([...curT(s), v])]; if (list.length > 4) toast('Máximo de 4 territórios'); store.set({ cmpT: list.slice(-4) }); terrBox.setValue(null); } });
  const addBr = h('<button class="btn" type="button">+ Brasil</button>');
  addBr.addEventListener('click', () => store.set({ cmpT: [...new Set([...curT(store.get()), 'br'])].slice(-4) }));
  tPick.append(terrBox.el, addBr);
  tChips.addEventListener('click', (ev) => { const k = ev.target.closest('[data-rm]')?.dataset.rm; if (k) store.set({ cmpT: curT(store.get()).filter((x) => x !== k) }); });
  const curT = (s) => {
    if (s.cmpT?.length) return s.cmpT;
    const d = ['br'];
    if (s.uf) d.push(`u:${s.uf}`); else d.push('r:NE', 'r:S');
    if (s.mun != null) d.push(`m:${s.mun}`);
    return d;
  };
  const terrInfo = (k) => {
    if (k === 'br') return { label: 'Brasil', ctx: {} };
    const [t, v] = k.split(':');
    if (t === 'r') return { label: E.meta.regioes[v], ctx: { regiao: v } };
    if (t === 'u') return { label: v, ctx: { uf: v } };
    const i = E.idxByTse.get(Number(v));
    return i == null ? null : { label: `${E.mun.nome[i]} (${E.mun.uf[i]})`, ctx: { mun: Number(v) } };
  };

  pC.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('comparacao-candidatos', [{ label: 'UF', key: 'uf' }, ...cRows.cands.map((c) => ({ label: `% ${c.nome}`, value: (r) => r[c.chave] }))], cRows.rows));
  pT.tools.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV('comparacao-territorial', [{ label: 'Indicador', key: 'label' }, ...terrs.map((t, j) => ({ label: t.label, value: (r) => r.raw[j] }))], tRows));

  function update(s) {
    const rot = E.turnoByKey.get(s.turno).rotulo;
    head.innerHTML = pageHead('Comparar', 'Lado a lado', `Compare candidatos e territórios no ${escapeHtml(rot)}. As escolhas ficam na URL e podem ser compartilhadas.`);

    // candidatos
    const all = E.candidatosDoTurno(s.turno).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const chaves = cur(s).filter((k) => all.some((c) => c.chave === k));
    candSel.setOptions(all.filter((c) => !chaves.includes(c.chave)).map((c) => ({ value: c.chave, label: `${c.nome} (${c.partido})` })), null);
    const cands = chaves.map((k) => E.candByKey.get(k));
    cChips.innerHTML = cands.map((c) => `<span class="chip"><span class="swatch" style="background:${E.corPartido(c.partido)}"></span>${escapeHtml(c.nome)}<button type="button" data-rm="${c.chave}" aria-label="Remover ${escapeHtml(c.nome)}">${ICONS.x}</button></span>`).join('');
    cCards.innerHTML = cands.map((c) => {
      const cx = { turno: s.turno, cand: { chaves: new Set([c.chave]) } };
      return `<div class="kpi"><div class="kpi__label"><span class="swatch" style="background:${E.corPartido(c.partido)}"></span>${escapeHtml(c.nome)} · ${escapeHtml(c.partido)}</div><div class="kpi__value">${pct(E.PctVotosValidos(cx))}</div><div class="kpi__foot">${int(E.Votos(cx))} votos · ${int(E.MunicipiosVencidos({ ...cx, exterior: false }))} municípios vencidos</div></div>`;
    }).join('');
    const ufs = E.meta.ufs.filter((u) => u.sigla !== 'ZZ');
    const rows = ufs.map((u) => { const r = { uf: u.sigla }; for (const c of cands) r[c.chave] = E.PctVotosValidos({ turno: s.turno, uf: u.sigla, exterior: false, cand: { chaves: new Set([c.chave]) } }); return r; });
    if (cands[0]) rows.sort((a, b) => (b[cands[0].chave] ?? 0) - (a[cands[0].chave] ?? 0));
    cRows = { rows, cands };
    chC.set({
      grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true }, legend: { top: 0 },
      xAxis: { type: 'category', data: rows.map((r) => r.uf), axisLabel: { interval: 0, fontSize: 10 } },
      yAxis: { type: 'value', max: 1, axisLabel: { formatter: (v) => pct(v, 0) } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => pct(v) },
      series: cands.map((c) => ({ name: c.nome, type: 'bar', barMaxWidth: 12, itemStyle: { color: E.corPartido(c.partido) }, data: rows.map((r) => r[c.chave]) })),
    });
    pC.setSub(`${escapeHtml(rot)} · % dos votos válidos por UF (sem exterior), ordenado pelo 1º candidato`);

    // territórios
    terrs = curT(s).map((k) => ({ k, ...terrInfo(k) })).filter((t) => t.label);
    tChips.innerHTML = terrs.map((t) => `<span class="chip">${escapeHtml(t.label)}<button type="button" data-rm="${escapeHtml(t.k)}" aria-label="Remover ${escapeHtml(t.label)}">${ICONS.x}</button></span>`).join('');
    const top = ranking(E, { turno: s.turno }).filter((r) => r.votos).slice(0, 2).map((r) => r.c);
    const ind = [
      ['Eleitores aptos', (c) => E.Aptos(c), int],
      ['% Comparecimento', (c) => E.PctComparecimento(c), pct],
      ['% Abstenção', (c) => E.PctAbstencao(c), pct],
      ['Variação da abstenção', (c) => E.VariacaoAbstencaoPP(c), pp],
      ['% Brancos', (c) => E.PctBrancos(c), pct],
      ['% Nulos', (c) => E.PctNulos(c), pct],
      ['Vencedor', (c) => E.Vencedor(c), (v) => escapeHtml(v ?? '—')],
      ['% do vencedor', (c) => E.PctDoVencedor(c), pct],
      ['Margem de vitória', (c) => E.MargemDeVitoria(c), pct],
      ...top.map((cd) => [`% ${cd.nome}`, (c) => E.PctVotosValidos({ ...c, cand: { chaves: new Set([cd.chave]) } }), pct]),
      ['População 2022', (c) => E.Populacao(c), int],
      ['PIB per capita', (c) => E.PIBperCapita(c), brl],
      ['Alfabetização', (c) => E.Alfabetizacao(c), pct1raw],
    ];
    const ctxs = terrs.map((t) => ({ turno: s.turno, ...t.ctx }));
    tRows = ind.map(([label, fn, fmt]) => { const raw = ctxs.map(fn); return { label, raw, html: raw.map((v) => fmt(v)) }; });
    tTable.innerHTML = `<table class="dtable"><thead><tr><th>Indicador</th>${terrs.map((t) => `<th class="r">${escapeHtml(t.label)}</th>`).join('')}</tr></thead><tbody>${tRows.map((r) => `<tr><td>${r.label}</td>${r.html.map((v) => `<td class="r">${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    pT.setSub(`${escapeHtml(rot)} · totais incluem o exterior só na coluna Brasil`);
    const metr = ['% Comparecimento', '% Abstenção', '% Brancos', '% Nulos', ...top.map((c) => `% ${c.nome}`)];
    chT.set({
      grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true }, legend: { top: 0 },
      xAxis: { type: 'category', data: metr, axisLabel: { interval: 0, fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v) => pct(v, 0) } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => pct(v) },
      color: [C.navy800, C.green600, C.gold500, VIZ.null],
      series: terrs.map((t, j) => ({ name: t.label, type: 'bar', barMaxWidth: 18, data: metr.map((m) => tRows.find((r) => r.label === m)?.raw[j] ?? null) })),
    });
  }

  return { update, destroy() { chC.destroy(); chT.destroy(); } };
}
