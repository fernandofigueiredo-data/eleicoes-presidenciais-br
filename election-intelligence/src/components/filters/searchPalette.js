/**
 * Busca inteligente (Ctrl/⌘+K ou "/"): candidatos, partidos, municípios, UFs, regiões e páginas.
 */
import { h } from '../../utils/dom.js';
import { escapeHtml, norm } from '../../utils/format.js';
import { PAGES } from '../../state/store.js';

export function searchPalette(E, store) {
  const index = [];
  for (const p of PAGES) index.push({ g: 'Páginas', label: p.label, hint: p.n, s: norm(p.label), act: () => store.set({ page: p.id }, { push: true }) });
  for (const c of E.meta.candidatos) {
    index.push({ g: 'Candidatos', label: c.nome, hint: `${c.partido} · ${c.ano}`, color: E.corPartido(c.partido), s: norm(`${c.nome} ${c.partido} ${c.ano}`),
      act: () => { const nr = E.nrDe(store.get().turno); const has2 = E.turnos[`${c.ano}-2`]?.votos[c.chave]; const t = nr === 2 && has2 ? `${c.ano}-2` : `${c.ano}-1`; store.set({ turno: t, cand: c.chave }); } });
  }
  for (const p of [...new Set(E.meta.candidatos.map((c) => c.partido))].sort()) {
    const anos = [...new Set(E.meta.candidatos.filter((c) => c.partido === p).map((c) => c.ano))].join(', ');
    index.push({ g: 'Partidos', label: p, hint: anos, color: E.corPartido(p), s: norm(p), act: () => store.set({ partido: p }) });
  }
  for (const [k, v] of Object.entries(E.meta.regioes)) index.push({ g: 'Regiões', label: v, hint: k, s: norm(v), act: () => store.set({ regiao: k, uf: null, mun: null }) });
  for (const u of E.meta.ufs) index.push({ g: 'Estados', label: u.nome, hint: u.sigla, s: norm(`${u.nome} ${u.sigla}`), act: () => store.set({ uf: u.sigla, mun: null }) });
  for (let i = 0; i < E.N; i++) {
    const tse = E.mun.tse[i];
    index.push({ g: 'Municípios', label: E.mun.nome[i], hint: E.mun.uf[i], s: norm(`${E.mun.nome[i]} ${E.mun.uf[i]}`),
      act: () => { const pg = store.get().page; store.set({ mun: tse, page: ['sobre', 'comparar'].includes(pg) ? 'mapa' : pg }, { push: pg !== store.get().page }); } });
  }

  let backdrop = null, opener = null;
  function close() { backdrop?.remove(); backdrop = null; opener?.focus?.(); opener = null; }
  function open() {
    if (backdrop) return;
    opener = document.activeElement;
    backdrop = h(`<div class="palette-backdrop" role="dialog" aria-modal="true" aria-label="Buscar">
      <div class="palette"><input class="palette__input" type="search" placeholder="Buscar candidato, partido, município, estado…" aria-label="Buscar" role="combobox" aria-expanded="true" aria-controls="pal-list" autocomplete="off">
      <ul class="palette__list" id="pal-list" role="listbox"></ul>
      <div class="palette__foot"><span>↑ ↓ para navegar</span><span>Enter para abrir</span><span>Esc para fechar</span></div></div></div>`);
    document.body.appendChild(backdrop);
    const input = backdrop.querySelector('input');
    const list = backdrop.querySelector('ul');
    let results = [], active = 0;
    const render = () => {
      const q = norm(input.value);
      if (!q) results = index.filter((x) => x.g === 'Páginas' || (x.g === 'Candidatos' && x.hint.endsWith(String(E.anoDe(store.get().turno)))));
      else {
        const starts = [], contains = [];
        for (const x of index) { const p = x.s.indexOf(q); if (p === 0 || x.s.includes(' ' + q)) starts.push(x); else if (p > 0) contains.push(x); }
        results = [...starts, ...contains].slice(0, 40);
      }
      active = 0;
      let g = '';
      list.innerHTML = results.length ? results.map((x, i) => {
        const head = x.g !== g ? `<li class="palette__group" role="presentation">${(g = x.g)}</li>` : '';
        return `${head}<li class="palette__item" role="option" id="pal-${i}" data-i="${i}" aria-selected="${i === 0}">${x.color ? `<span class="swatch" style="background:${x.color}"></span>` : ''}<span>${escapeHtml(x.label)}</span><small>${escapeHtml(x.hint || '')}</small></li>`;
      }).join('') : '<li class="combo__empty">Nada encontrado</li>';
    };
    const choose = (i) => { const x = results[i]; if (!x) return; close(); x.act(); };
    const mark = () => { list.querySelectorAll('[data-i]').forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === active))); list.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', `pal-${active}`); };
    input.addEventListener('input', render);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); active = Math.min(results.length - 1, active + 1); mark(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); active = Math.max(0, active - 1); mark(); }
      else if (ev.key === 'Enter') { ev.preventDefault(); choose(active); }
      else if (ev.key === 'Escape') close();
      else if (ev.key === 'Tab') ev.preventDefault(); // foco preso no campo do diálogo
    });
    list.addEventListener('click', (ev) => { const li = ev.target.closest('[data-i]'); if (li) choose(Number(li.dataset.i)); });
    backdrop.addEventListener('mousedown', (ev) => { if (ev.target === backdrop) close(); });
    render();
    input.focus();
  }
  document.addEventListener('keydown', (ev) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if ((ev.key === 'k' && (ev.metaKey || ev.ctrlKey)) || (ev.key === '/' && !typing)) { ev.preventDefault(); open(); }
  });
  return { open, close };
}
