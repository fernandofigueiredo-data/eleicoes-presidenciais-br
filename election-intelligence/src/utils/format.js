// Formatação pt-BR equivalente às formatStrings das medidas no PBIX.
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export const DASH = '—';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** "#,0" */
export const int = (v) => (isNum(v) ? nf0.format(Math.round(v)) : DASH);
/** "0.00%" */
export const pct = (v, d = 2) => (isNum(v) ? (d === 1 ? nf1 : d === 0 ? nf0 : nf2).format(v * 100) + '%' : DASH);
/** "+0.0 p.p." */
export const pp = (v) => (isNum(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + nf1.format(Math.abs(v)) + ' p.p.' : DASH);
/** "+#,0" */
export const signedInt = (v) => (isNum(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + nf0.format(Math.abs(Math.round(v))) : DASH);
/** "R$ #,0" */
export const brl = (v) => (isNum(v) ? 'R$ ' + nf0.format(Math.round(v)) : DASH);
/** "0.0%" (alfabetização já vem em pontos percentuais) */
export const pct1raw = (v) => (isNum(v) ? nf1.format(v) + '%' : DASH);
export const short = (v) => (isNum(v) ? compact.format(v) : DASH);
export const dec1 = (v) => (isNum(v) ? nf1.format(v) : DASH);

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Remove acentos e caixa para busca. */
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
