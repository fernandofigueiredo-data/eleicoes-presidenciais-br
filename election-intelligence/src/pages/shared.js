// Utilidades compartilhadas pelas páginas.
import { tint } from '../utils/colors.js';
import { VIZ } from '../styles/tokens.js';
import { int, pct, brl, pct1raw, escapeHtml, pp } from '../utils/format.js';
import { tipTable } from '../components/ui/ui.js';

/** Contexto territorial (dMunicipio) a partir do estado global. */
export const geoCtx = (s) => ({ regiao: s.regiao, uf: s.uf, mun: s.mun });
/** Filtro de candidato (dCandidato) a partir do estado global. */
export const candFilter = (s) => (s.cand ? { chaves: new Set([s.cand]) } : s.partido ? { partidos: new Set([s.partido]) } : null);

export function scopeLabel(E, s) {
  if (s.mun != null) { const i = E.idxByTse.get(s.mun); return `${E.mun.nome[i]} (${E.mun.uf[i]})`; }
  if (s.uf) return E.meta.ufs.find((u) => u.sigla === s.uf)?.nome ?? s.uf;
  if (s.regiao) return E.meta.regioes[s.regiao];
  return 'Brasil';
}

const PREP_UF = { BA: 'na', PB: 'na', AL: 'em', GO: 'em', MG: 'em', PE: 'em', RO: 'em', RR: 'em', SC: 'em', SP: 'em', SE: 'em' };
/** Recorte com a preposição certa: "no Brasil", "no Nordeste", "na Bahia", "em São Paulo", "em Recife (PE)". */
export function noEscopo(E, s) {
  if (s.mun != null) return `em ${scopeLabel(E, s)}`;
  if (s.uf) return s.uf === 'ZZ' ? 'no exterior' : `${PREP_UF[s.uf] || 'no'} ${scopeLabel(E, s)}`;
  if (s.regiao) return s.regiao === 'EX' ? 'no exterior' : `no ${scopeLabel(E, s)}`;
  return 'no Brasil';
}
/** Mesma ideia com "de": "do Brasil", "da Bahia", "de São Paulo". */
export const doEscopo = (E, s) => noEscopo(E, s).replace(/^no /, 'do ').replace(/^na /, 'da ').replace(/^em /, 'de ');

/** Cor do vencedor com intensidade pela % do vencedor (0,5 -> clara; 0,8+ -> cheia). */
export function winnerColor(E, partido, pctV, byMargin = true) {
  if (!partido) return VIZ.noData;
  const base = partido.includes(' / ') ? VIZ.tie : E.corPartido(partido);
  if (!byMargin || pctV == null) return base;
  const t = Math.max(0.28, Math.min(1, (pctV - 0.4) / 0.4));
  return tint(base, t);
}

/** Resultado de candidatos para um contexto, ordenado por votos. */
export function ranking(E, ctx) {
  const sel = E.selection(ctx);
  const votos = E.votosPorCandidato(ctx.turno, sel, null);
  let total = 0;
  for (const v of votos.values()) total += v || 0;
  return [...votos.entries()]
    .map(([k, v]) => ({ chave: k, c: E.candByKey.get(k), votos: v, pct: total ? (v || 0) / total : null }))
    .sort((a, b) => (b.votos || 0) - (a.votos || 0));
}

/** HTML do tooltip de município (equivalente à página "Dica do município"). */
export function municipioTip(E, s, i, extra = []) {
  const ctx = { turno: s.turno, mun: E.mun.tse[i] };
  const res = E.resumoMunicipios(s.turno)[i];
  return tipTable(`${E.mun.nome[i]} (${E.mun.uf[i]})`, [
    ['Vencedor', res?.vencedor ?? '—'],
    ['% do vencedor', pct(res?.pct)],
    ['Margem de vitória', pct(res?.margem)],
    ['% Abstenção', pct(E.PctAbstencao(ctx))],
    ['PIB per capita', brl(E.mun.pibpc[i])],
    ...extra,
  ]);
}

/** Painel de detalhe do município selecionado. */
export function municipioDetail(E, s) {
  if (s.mun == null) return '';
  const i = E.idxByTse.get(s.mun);
  const ctx = { turno: s.turno, mun: s.mun };
  const res = E.resumoMunicipios(s.turno)[i];
  const rk = ranking(E, ctx).filter((r) => r.votos != null).slice(0, 5);
  const venc = res?.vencedor;
  return `<section class="panel detail" aria-label="Município selecionado">
    <div class="page-kicker">Município selecionado <span class="sep">·</span> ${escapeHtml(E.turnoByKey.get(s.turno).rotulo)}</div>
    <div class="detail__head"><h2 class="detail__name">${escapeHtml(E.mun.nome[i])} <small>${E.mun.uf[i]}</small></h2></div>
    ${venc ? `<div class="detail__winner">Vencedor: <strong>${escapeHtml(venc)}</strong>, margem de ${pct(res?.margem)}</div>` : '<div class="detail__winner">Sem votos registrados neste turno.</div>'}
    ${rk.map((r) => `<div class="result-row"><span><span class="swatch" style="background:${E.corPartido(r.c.partido)}"></span> ${escapeHtml(r.c.nome)} <small style="color:var(--text-3)">${escapeHtml(r.c.partido)}</small></span><b class="num" style="font-weight:600">${pct(r.pct)} <small style="color:var(--text-3);font-weight:400">${int(r.votos)}</small></b><div class="bar"><span style="width:${(r.pct || 0) * 100}%;background:${E.corPartido(r.c.partido)}"></span></div></div>`).join('')}
    <dl class="detail__grid">
      <div><dt>Eleitores aptos</dt><dd>${int(E.Aptos(ctx))}</dd></div>
      <div><dt>Abstenção</dt><dd>${pct(E.PctAbstencao(ctx))} <small style="color:var(--text-3);font-weight:400">${pp(E.VariacaoAbstencaoPP(ctx))}</small></dd></div>
      <div><dt>Brancos e nulos</dt><dd>${pct(E.PctBrancosNulos(ctx))}</dd></div>
      <div><dt>População 2022</dt><dd>${int(E.mun.pop[i])}</dd></div>
      <div><dt>PIB per capita</dt><dd>${brl(E.mun.pibpc[i])}</dd></div>
      <div><dt>Alfabetização</dt><dd>${pct1raw(E.mun.alfab[i])}</dd></div>
    </dl>
    <div class="actions"><button class="btn" data-act="cmp-mun" type="button">Comparar com outros territórios</button><button class="btn btn--ghost" data-act="clear-mun" type="button">Limpar seleção</button></div>
  </section>`;
}

export function bindDetailActions(root, store, E) {
  root.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-act]')?.dataset.act;
    if (a === 'clear-mun') store.set({ mun: null });
    if (a === 'cmp-mun') {
      const s = store.get();
      const key = `m:${s.mun}`;
      const cmpT = [...new Set([...(s.cmpT || []), key])].slice(-4);
      store.set({ cmpT, page: 'comparar' }, { push: true });
    }
  });
}

/**
 * Cabeçalho de página. O sobretítulo traz o contexto que muda (seção · turno · recorte),
 * sem repetir o título e sem numeração (as páginas não são uma sequência).
 */
export function pageHead(secao, title, dek, ...contexto) {
  const parts = [secao.replace(/^\d+\s*·\s*/, ''), ...contexto.filter(Boolean)].map((p, i) => `<span class="${i === 0 ? 'page-kicker__section' : ''}">${p}</span>`).join('');
  return `<header class="page-head"><div class="page-kicker">${parts}</div><h1 class="page-title">${title}</h1>${dek ? `<p class="page-dek">${dek}</p>` : ''}</header>`;
}

export const partyLegend = (E, partidos) => partidos.map((p) => `<span class="item"><span class="swatch" style="background:${E.corPartido(p)}"></span>${escapeHtml(p)}</span>`).join('');
