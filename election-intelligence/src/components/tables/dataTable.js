/**
 * Tabela ordenável com busca, paginação incremental, seleção de linha e exportação CSV.
 * columns: [{ key, label, value:(row)=>raw, format:(raw,row)=>html, align:'r', csv:(row)=>raw, sortable }]
 */
import { h, ICONS, debounce } from '../../utils/dom.js';
import { downloadCSV } from '../../utils/csv.js';
import { escapeHtml, norm } from '../../utils/format.js';

export function dataTable(container, { columns, rows = [], filename = 'dados', searchKeys = null, pageSize = 50, sort = null, onRowClick = null, selectedKey = null, rowKey = null, maxHeight = null, caption = '', emptyText = 'Nada para mostrar com os filtros atuais. Ajuste ou limpe os filtros.' }) {
  let state = { sort: sort || null, q: '', limit: pageSize };
  let data = rows;
  const el = h(`<div class="dtable-block">
    <div class="dtable-tools">
      ${searchKeys ? `<input class="input" type="search" placeholder="Buscar na tabela…" aria-label="Buscar na tabela">` : ''}
      <span class="dtable-count" aria-live="polite"></span>
      <button class="btn" data-action="csv" type="button">${ICONS.download}<span>Exportar CSV</span></button>
    </div>
    <div class="dtable-wrap" ${maxHeight ? `style="--table-max:${maxHeight}px"` : ''}><table class="dtable">${caption ? `<caption class="sr-only">${escapeHtml(caption)}</caption>` : ''}<thead><tr></tr></thead><tbody></tbody></table></div>
    <div class="dtable-more" hidden><button class="btn" type="button">Mostrar mais</button></div>
  </div>`);
  container.appendChild(el);
  const thead = el.querySelector('thead tr');
  const tbody = el.querySelector('tbody');
  const count = el.querySelector('.dtable-count');
  const more = el.querySelector('.dtable-more');
  const val = (c, r) => (c.value ? c.value(r) : r[c.key]);

  function filtered() {
    let out = data;
    if (state.q && searchKeys) {
      const q = norm(state.q);
      out = out.filter((r) => searchKeys.some((k) => norm(typeof k === 'function' ? k(r) : r[k]).includes(q)));
    }
    if (state.sort) {
      const c = columns.find((x) => x.key === state.sort.key);
      if (c) {
        const dir = state.sort.dir === 'asc' ? 1 : -1;
        out = [...out].sort((a, b) => {
          const va = val(c, a), vb = val(c, b);
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR')) * dir;
        });
      }
    }
    return out;
  }

  function renderHead() {
    thead.innerHTML = columns.map((c) => {
      const s = state.sort?.key === c.key ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      return `<th scope="col" class="${c.align === 'r' ? 'r' : ''}" aria-sort="${s}">${c.sortable === false ? escapeHtml(c.label) : `<button type="button" data-k="${escapeHtml(c.key)}">${escapeHtml(c.label)}</button>`}</th>`;
    }).join('');
  }

  function renderBody() {
    const all = filtered();
    const shown = all.slice(0, state.limit);
    tbody.innerHTML = shown.length ? shown.map((r) => {
      const key = rowKey ? rowKey(r) : null;
      return `<tr ${onRowClick ? 'data-clickable tabindex="0"' : ''} ${key != null ? `data-key="${escapeHtml(key)}"` : ''} class="${key != null && key === selectedKey ? 'is-selected' : ''}">${columns.map((c) => {
        const raw = val(c, r);
        const out = c.format ? c.format(raw, r) : escapeHtml(raw ?? '—');
        return `<td class="${c.align === 'r' ? 'r' : ''}">${out}</td>`;
      }).join('')}</tr>`;
    }).join('') : `<tr><td colspan="${columns.length}" class="dtable-empty">${escapeHtml(state.q ? `Nenhuma linha contém "${state.q}".` : emptyText)}</td></tr>`;
    count.textContent = `${all.length.toLocaleString('pt-BR')} ${all.length === 1 ? 'linha' : 'linhas'}`;
    more.hidden = all.length <= state.limit;
    tbody._rows = shown;
  }

  thead.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    state.sort = state.sort?.key === k ? { key: k, dir: state.sort.dir === 'desc' ? 'asc' : 'desc' } : { key: k, dir: 'desc' };
    renderHead(); renderBody();
  });
  const search = el.querySelector('input[type=search]');
  search?.addEventListener('input', debounce(() => { state.q = search.value; state.limit = pageSize; renderBody(); }, 150));
  more.querySelector('button').addEventListener('click', () => { state.limit += pageSize * 2; renderBody(); });
  el.querySelector('[data-action=csv]').addEventListener('click', () => downloadCSV(filename, columns.map((c) => ({ label: c.label, value: (r) => (c.csv ? c.csv(r) : val(c, r)) })), filtered()));
  if (onRowClick) {
    const handler = (ev) => {
      const tr = ev.target.closest('tr[data-clickable]');
      if (!tr) return;
      const i = [...tbody.children].indexOf(tr);
      onRowClick(tbody._rows[i]);
    };
    tbody.addEventListener('click', handler);
    tbody.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') handler(ev); });
  }
  renderHead(); renderBody();
  return {
    el,
    update(nextRows, opts = {}) { data = nextRows; if ('selectedKey' in opts) selectedKey = opts.selectedKey; state.limit = Math.max(pageSize, state.limit); renderBody(); },
    exportCSV() { el.querySelector('[data-action=csv]').click(); },
  };
}
