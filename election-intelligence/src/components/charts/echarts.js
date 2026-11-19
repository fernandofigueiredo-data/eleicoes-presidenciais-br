/**
 * Gráficos: API síncrona para as páginas, com o ECharts carregado sob demanda (echartsCore.js).
 * Enquanto o módulo não chega, as opções ficam guardadas e a última é aplicada ao criar o gráfico.
 * Assim o título, os indicadores e as tabelas aparecem sem esperar o ECharts.
 */
let modulo = null;
const carregar = () => (modulo ||= import('./echartsCore.js'));

export function chart(container, option, opts = {}) {
  let real = null, ultimo = [option, true], destruido = false;
  carregar().then((m) => {
    if (destruido) return;
    real = m.chart(container, ultimo[0], opts);
    if (ultimo[0] !== option) real.set(...ultimo);
  }).catch((e) => console.error(e));
  return {
    set(opt, notMerge = true) { if (real) real.set(opt, notMerge); else ultimo = [opt, notMerge]; },
    destroy() { destruido = true; real?.destroy(); },
  };
}

/** HTML do tooltip (não depende do ECharts). */
export const tipBox = (title, rows) =>
  `<div style="font-weight:600;margin-bottom:4px">${title}</div>` +
  rows.map(([k, v, c]) => `<div style="display:flex;gap:14px;justify-content:space-between">${c ? `<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c};margin-right:6px"></span>${k}</span>` : `<span style="color:#c9d1de">${k}</span>`}<b style="font-variant-numeric:tabular-nums;font-weight:600">${v}</b></div>`).join('');
