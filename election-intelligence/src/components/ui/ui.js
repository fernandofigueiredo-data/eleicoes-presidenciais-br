import { h, ICONS, emptyState } from '../../utils/dom.js';
import { escapeHtml } from '../../utils/format.js';

// ---------------------------------------------------------------- tooltip único
let tipEl = null;
export function tooltip() {
  if (!tipEl) {
    tipEl = h('<div class="tooltip" role="tooltip" aria-hidden="true"></div>');
    document.body.appendChild(tipEl);
  }
  return {
    show(html, ev) {
      tipEl.innerHTML = html;
      tipEl.classList.add('is-on');
      const pad = 14;
      const r = tipEl.getBoundingClientRect();
      let x = ev.clientX + pad, y = ev.clientY + pad;
      if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - pad;
      if (y + r.height > window.innerHeight - 8) y = ev.clientY - r.height - pad;
      tipEl.style.left = `${Math.max(8, x)}px`;
      tipEl.style.top = `${Math.max(8, y)}px`;
    },
    hide() { tipEl.classList.remove('is-on'); },
  };
}
export function tipTable(title, rows) {
  return `<h4>${escapeHtml(title)}</h4><table>${rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td class="r">${escapeHtml(v)}</td></tr>`).join('')}</table>`;
}

// ---------------------------------------------------------------- toast
let toastsEl = null;
export function toast(msg, type = 'info', ms = 2600) {
  if (!toastsEl) { toastsEl = h('<div class="toasts" aria-live="polite"></div>'); document.body.appendChild(toastsEl); }
  const t = h(`<div class="toast ${type === 'error' ? 'toast--error' : ''}" role="status">${escapeHtml(msg)}</div>`);
  toastsEl.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ---------------------------------------------------------------- painel
export function panel({ title, sub = '', tools = '', id = '', cls = '' }) {
  const el = h(`<section class="panel ${cls}" ${id ? `id="${id}"` : ''} aria-label="${escapeHtml(title)}">
    <div class="panel__head"><div><h2 class="panel__title">${escapeHtml(title)}</h2>${sub ? `<div class="panel__sub">${sub}</div>` : ''}</div><div class="panel__tools">${tools}</div></div>
    <div class="panel__body"></div></section>`);
  return { el, body: el.querySelector('.panel__body'), tools: el.querySelector('.panel__tools'), setSub(s) { let x = el.querySelector('.panel__sub'); if (!x) { x = h('<div class="panel__sub"></div>'); el.querySelector('.panel__head > div').appendChild(x); } x.innerHTML = s; } };
}

export const csvButton = (label = 'CSV') => `<button class="btn btn--ghost" data-action="csv" title="Baixar dados em CSV" aria-label="Baixar dados em CSV">${ICONS.download}<span>${label}</span></button>`;

// ---------------------------------------------------------------- KPI
/** Cartão de indicador. `swatch` só quando a cor identifica algo (candidato, partido). */
export function kpi({ label, value, foot = '', swatch = '', hero = false, title = '' }) {
  return `<div class="kpi ${hero ? 'kpi--hero' : ''}" ${title ? `title="${escapeHtml(title)}"` : ''}>
    <div class="kpi__label">${swatch ? `<span class="swatch" style="background:${swatch}"></span>` : ''}${escapeHtml(label)}</div><div class="kpi__value">${value}</div>${foot ? `<div class="kpi__foot">${foot}</div>` : ''}</div>`;
}

export { emptyState };

// ---------------------------------------------------------------- controle segmentado
export function segmented(options, value, onChange, label = '') {
  const el = h(`<div class="seg" role="group" ${label ? `aria-label="${escapeHtml(label)}"` : ''}>${options.map((o) => `<button type="button" data-v="${escapeHtml(o.value)}" aria-pressed="${o.value === value}">${escapeHtml(o.label)}</button>`).join('')}</div>`);
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    onChange(b.dataset.v);
  });
  return el;
}
