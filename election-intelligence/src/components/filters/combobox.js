/**
 * Combobox acessível com busca (ARIA 1.2 combobox + listbox).
 * options: [{ value, label, hint, search }]
 */
import { h, ICONS } from '../../utils/dom.js';
import { escapeHtml, norm } from '../../utils/format.js';

let uid = 0;
export function combobox({ label, placeholder = 'Todos', options = [], value = null, onChange, max = 80, id }) {
  const cid = id || `cb${++uid}`;
  const el = h(`<div class="filter-field combo-field">
    <label for="${cid}">${escapeHtml(label)}</label>
    <div class="combo">
      <input id="${cid}" class="input" type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="${cid}-list" autocomplete="off" placeholder="${escapeHtml(placeholder)}">
      <button type="button" class="combo__clear" aria-label="Limpar ${escapeHtml(label)}" hidden>${ICONS.x}</button>
      <ul class="combo__list" id="${cid}-list" role="listbox" hidden></ul>
    </div></div>`);
  const input = el.querySelector('input');
  const list = el.querySelector('ul');
  const clear = el.querySelector('.combo__clear');
  const wrap = el.querySelector('.combo');
  let opts = options, current = value, active = -1, shown = [];

  const labelOf = (v) => opts.find((o) => o.value === v)?.label ?? '';
  function sync() {
    input.value = current != null ? labelOf(current) : '';
    clear.hidden = current == null;
    wrap.classList.toggle('is-active', current != null);
  }
  function open() {
    const q = norm(input.value === labelOf(current) ? '' : input.value);
    shown = (q ? opts.filter((o) => norm(o.search || o.label).includes(q)) : opts).slice(0, max);
    active = shown.findIndex((o) => o.value === current);
    list.innerHTML = shown.length
      ? shown.map((o, i) => `<li id="${cid}-o${i}" role="option" class="combo__opt" aria-selected="${i === active}" data-i="${i}"><span>${escapeHtml(o.label)}</span>${o.hint ? `<small>${escapeHtml(o.hint)}</small>` : ''}</li>`).join('')
      : '<li class="combo__empty" role="presentation">Nada encontrado</li>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function choose(o) { current = o ? o.value : null; sync(); close(); onChange?.(current); }
  function move(d) {
    if (list.hidden) open();
    if (!shown.length) return;
    active = (active + d + shown.length) % shown.length;
    [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    list.children[active]?.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', `${cid}-o${active}`);
  }

  input.addEventListener('focus', () => { input.select(); open(); });
  input.addEventListener('input', open);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
    else if (ev.key === 'Enter') { ev.preventDefault(); if (shown[active]) choose(shown[active]); else if (shown.length === 1) choose(shown[0]); }
    else if (ev.key === 'Escape') { sync(); close(); input.blur(); }
  });
  input.addEventListener('blur', () => setTimeout(() => { if (!el.contains(document.activeElement)) { sync(); close(); } }, 120));
  list.addEventListener('mousedown', (ev) => ev.preventDefault());
  list.addEventListener('click', (ev) => { const li = ev.target.closest('[data-i]'); if (li) choose(shown[Number(li.dataset.i)]); });
  clear.addEventListener('click', () => choose(null));
  sync();

  return {
    el,
    setOptions(o) { opts = o; if (current != null && !opts.some((x) => x.value === current)) current = null; sync(); },
    setValue(v) { current = v; sync(); },
  };
}

/** Select nativo estilizado. */
export function selectField({ label, options, value, onChange, allLabel = 'Todos', id }) {
  const sid = id || `sel${++uid}`;
  const el = h(`<div class="filter-field"><label for="${sid}">${escapeHtml(label)}</label><select id="${sid}" class="select"></select></div>`);
  const sel = el.querySelector('select');
  function render(opts, v) {
    sel.innerHTML = (allLabel != null ? `<option value="">${escapeHtml(allLabel)}</option>` : '') + opts.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
    sel.value = v ?? '';
    sel.classList.toggle('is-active', !!v && allLabel != null);
  }
  render(options, value);
  sel.addEventListener('change', () => { sel.classList.toggle('is-active', !!sel.value && allLabel != null); onChange(sel.value || null); });
  return { el, select: sel, setOptions: render, setValue(v) { sel.value = v ?? ''; sel.classList.toggle('is-active', !!v && allLabel != null); } };
}
