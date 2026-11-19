import { VIZ } from '../styles/tokens.js';
// Utilidades de cor para mapas e gráficos.
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
/** Mistura `hex` com branco: t=0 -> branco, t=1 -> cor cheia. */
export function tint(hex, t) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(255 + (r - 255) * t, 255 + (g - 255) * t, 255 + (b - 255) * t);
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
/** Escala sequencial interpolada por paradas. */
export function ramp(stops) {
  return (t) => {
    if (t == null || Number.isNaN(t)) return null;
    const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    return mix(stops[i], stops[i + 1], x - i);
  };
}
export const RAMP_ABST = VIZ.rampAbstention;
export const RAMP_DIVERGE = VIZ.rampDiverge;
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const isDark = (hex) => luminance(hex) < 0.42;
