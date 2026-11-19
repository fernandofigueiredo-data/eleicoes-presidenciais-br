/**
 * Integração com Apache ECharts (import modular para reduzir o bundle) e tema editorial.
 * Cores e fonte vêm de src/styles/tokens.js.
 */
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, DataZoomComponent, AriaComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { onResize } from '../../utils/dom.js';
import { C, VIZ, FONT_SANS, reducedMotion } from '../../styles/tokens.js';

echarts.use([BarChart, LineChart, ScatterChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, DataZoomComponent, AriaComponent, CanvasRenderer]);

echarts.registerTheme('ei', {
  color: VIZ.series,
  textStyle: { fontFamily: FONT_SANS, color: C.gray700 },
  legend: { textStyle: { color: C.gray700, fontSize: 13 }, itemWidth: 12, itemHeight: 12, itemGap: 16, icon: 'roundRect' },
  categoryAxis: { axisLine: { lineStyle: { color: C.gray300 } }, axisTick: { show: false }, axisLabel: { color: C.gray600, fontSize: 12 }, splitLine: { show: false } },
  valueAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: C.gray600, fontSize: 12 }, splitLine: { lineStyle: { color: C.gray100 } }, nameTextStyle: { color: C.gray600, fontSize: 12 } },
  logAxis: { axisLabel: { color: C.gray600, fontSize: 12 }, splitLine: { lineStyle: { color: C.gray100 } }, nameTextStyle: { color: C.gray600, fontSize: 12 } },
  tooltip: { backgroundColor: C.ink, borderWidth: 0, textStyle: { color: C.white, fontSize: 13, fontFamily: FONT_SANS }, extraCssText: 'border-radius:6px;box-shadow:0 8px 24px rgba(12,21,36,.18);' },
});

const base = () => ({ aria: { enabled: true }, animation: !reducedMotion(), animationDuration: 300, animationDurationUpdate: 250, textStyle: { fontFamily: FONT_SANS } });

export function chart(container, option, { onClick } = {}) {
  const inst = echarts.init(container, 'ei', { renderer: 'canvas' });
  inst.setOption({ ...base(), ...option });
  if (onClick) {
    inst.on('click', onClick);
    container.style.cursor = 'pointer';
  }
  const off = onResize(container, () => inst.resize());
  return {
    inst,
    set(opt, notMerge = true) { inst.setOption({ ...base(), ...opt }, notMerge); },
    destroy() { off(); inst.dispose(); },
  };
}

export const tipBox = (title, rows) =>
  `<div style="font-weight:600;margin-bottom:4px">${title}</div>` +
  rows.map(([k, v, c]) => `<div style="display:flex;gap:14px;justify-content:space-between">${c ? `<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c};margin-right:6px"></span>${k}</span>` : `<span style="color:#c9d1de">${k}</span>`}<b style="font-variant-numeric:tabular-nums;font-weight:600">${v}</b></div>`).join('');

export { echarts };
