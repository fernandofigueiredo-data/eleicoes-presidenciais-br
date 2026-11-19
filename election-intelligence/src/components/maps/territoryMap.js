/**
 * Mapa territorial com navegação Brasil -> Região -> UF -> Município.
 * O enquadramento segue os filtros globais (região, UF, município) e os cliques atualizam esses filtros.
 */
import { createCanvasMap } from './canvasMap.js';
import { C, VIZ } from '../../styles/tokens.js';
import { loadUFs, loadMunicipios } from '../../services/geo.js';
import { tooltip } from '../ui/ui.js';
import { h, ICONS, emptyState } from '../../utils/dom.js';
import { escapeHtml } from '../../utils/format.js';

const FADE = VIZ.outOfScope;

export function territoryMap(container, { E, store, level = 'mun', fillMun, fillUF, tipMun, tipUF, label = 'Mapa', short = false, allowLevel = true, onLevel }) {
  const wrap = h(`<div class="map-wrap ${short ? 'map-wrap--short' : ''}">
    <nav class="map-crumbs" aria-label="Navegação territorial"></nav>
    <div class="map-controls">
      <button class="btn btn--icon" data-z="in" aria-label="Aproximar" title="Aproximar">${ICONS.plus}</button>
      <button class="btn btn--icon" data-z="out" aria-label="Afastar" title="Afastar">${ICONS.minus}</button>
      <button class="btn btn--icon" data-z="home" aria-label="Voltar ao Brasil" title="Voltar ao Brasil">${ICONS.home}</button>
    </div>
    <div class="map-hint" aria-hidden="true">Clique para detalhar. Arraste e role para navegar.</div>
    <p class="map-notice callout" hidden></p>
    <div class="skeleton" style="position:absolute;inset:0"></div>
  </div>`);
  container.appendChild(wrap);
  const tip = tooltip();
  let geo = null, muns = null, cur = { level };
  let destroyed = false;

  const map = createCanvasMap(wrap, {
    ariaLabel: `${label}. Setas movem o mapa, mais e menos aproximam. Para escolher um município pelo teclado, use o filtro Município ou a tabela da página.`,
    onHover(f, ev) {
      if (!f || !ev) return tip.hide();
      const html = cur.level === 'mun' ? tipMun?.(f.id) : tipUF?.(f.id);
      if (html) tip.show(html, ev); else tip.hide();
    },
    onClick(f) {
      tip.hide();
      const s = store.get();
      if (!f) return;
      if (cur.level === 'uf') {
        store.set({ uf: f.id, mun: null });
        if (allowLevel) setLevel('mun');
      } else {
        const tse = E.mun.tse[f.id];
        store.set({ mun: s.mun === tse ? null : tse });
      }
    },
  });

  wrap.addEventListener('click', (ev) => {
    const z = ev.target.closest('[data-z]')?.dataset.z;
    if (z === 'in') map.zoomBy(1.6);
    else if (z === 'out') map.zoomBy(1 / 1.6);
    else if (z === 'home') store.set({ regiao: null, uf: null, mun: null });
    const c = ev.target.closest('[data-crumb]')?.dataset.crumb;
    if (c === 'br') store.set({ regiao: null, uf: null, mun: null });
    else if (c === 'regiao') store.set({ uf: null, mun: null });
    else if (c === 'uf') store.set({ mun: null });
  });

  function inScope(i, s) {
    if (s.regiao && E.regiaoDe[i] !== s.regiao) return false;
    if (s.uf && E.mun.uf[i] !== s.uf) return false;
    return true;
  }

  function crumbs(s) {
    const parts = [s.regiao || s.uf ? '<button data-crumb="br">Brasil</button>' : '<strong>Brasil</strong>'];
    if (s.regiao) parts.push('<span class="sep">›</span>', s.uf ? `<button data-crumb="regiao">${escapeHtml(E.meta.regioes[s.regiao])}</button>` : `<strong>${escapeHtml(E.meta.regioes[s.regiao])}</strong>`);
    if (s.uf) parts.push('<span class="sep">›</span>', s.mun != null ? `<button data-crumb="uf">${escapeHtml(s.uf)}</button>` : `<strong>${escapeHtml(s.uf)}</strong>`);
    if (s.mun != null) parts.push('<span class="sep">›</span>', `<strong>${escapeHtml(E.mun.nome[E.idxByTse.get(s.mun)])}</strong>`);
    wrap.querySelector('.map-crumbs').innerHTML = parts.join('');
  }

  function layers() {
    const s = store.get();
    if (cur.level === 'uf') {
      return {
        fills: [{ features: geo.ufs, interactive: true, stroke: C.white, strokeWidth: 1.1, fill: (f) => ((s.regiao && f.properties.regiao !== s.regiao) ? FADE : fillUF(f.id)) }],
        lines: [],
      };
    }
    return {
      fills: [{ features: muns, interactive: true, stroke: 'rgba(255,255,255,0.55)', strokeWidth: 0.35, fill: (f) => (inScope(f.id, s) ? fillMun(f.id) : FADE) }],
      lines: [{ geom: geo.borders, color: 'rgba(12,21,36,0.55)', width: 0.8 }, { geom: geo.outline, color: 'rgba(12,21,36,0.6)', width: 0.9 }],
    };
  }

  function focusFeatures(s) {
    if (s.mun != null) return geo.ufs.filter((f) => f.id === s.uf);
    if (s.uf) return geo.ufs.filter((f) => f.id === s.uf);
    if (s.regiao) return geo.ufs.filter((f) => f.properties.regiao === s.regiao);
    return geo.ufs;
  }

  let lastFocusKey = null;
  function update({ animate = true } = {}) {
    if (!geo || (cur.level === 'mun' && !muns) || destroyed) return;
    const s = store.get();
    map.setLayers(layers(), { extent: geo.ufs });
    crumbs(s);
    const notice = wrap.querySelector('.map-notice');
    const exterior = s.uf === 'ZZ' || s.regiao === 'EX';
    notice.hidden = !exterior;
    if (exterior) notice.textContent = 'O exterior não aparece no mapa: as cidades fora do Brasil não têm malha do IBGE. Os números do exterior estão nos cartões e nas tabelas.';
    const fkey = [s.regiao, s.uf, s.mun != null ? 'm' : ''].join('|');
    if (fkey !== lastFocusKey) { map.focus(focusFeatures(s), animate && lastFocusKey !== null); lastFocusKey = fkey; }
    map.setSelected(cur.level === 'mun' && s.mun != null ? E.idxByTse.get(s.mun) : cur.level === 'uf' ? s.uf : null);
  }

  async function setLevel(l) {
    cur.level = l;
    onLevel?.(l);
    if (l === 'mun' && !muns) muns = (await loadMunicipios(E)).filter((f) => !E.mun.exterior[f.id]);
    update();
  }

  (async () => {
    geo = await loadUFs(E);
    if (cur.level === 'mun') muns = (await loadMunicipios(E)).filter((f) => !E.mun.exterior[f.id]);
    if (destroyed) return;
    wrap.querySelector('.skeleton')?.remove();
    update({ animate: false });
  })().catch(() => {
    wrap.querySelector('.skeleton')?.remove();
    const box = h(`<div style="position:absolute;inset:0;background:var(--surface)">${emptyState('Não foi possível carregar o mapa.', 'A malha territorial do IBGE não chegou. Os números da página continuam válidos.', { act: 'retry-geo', label: 'Recarregar a página' })}</div>`);
    box.querySelector('[data-act=retry-geo]').addEventListener('click', () => location.reload());
    wrap.appendChild(box);
  });

  return {
    el: wrap,
    update,
    setLevel,
    get level() { return cur.level; },
    destroy() { destroyed = true; tip.hide(); map.destroy(); },
  };
}
