/**
 * Cartograma de UFs em grade (cada UF ocupa o mesmo espaço; útil para estados pequenos).
 * Posições aproximam a geografia do Brasil.
 */
import { escapeHtml } from '../../utils/format.js';
import { C, VIZ } from '../../styles/tokens.js';

export const TILE_POS = {
  RR: [2, 0], AP: [4, 0],
  AM: [1, 1], PA: [3, 1], MA: [4, 1], CE: [5, 1], RN: [6, 1],
  AC: [0, 2], RO: [1, 2], MT: [2, 2], TO: [3, 2], PI: [4, 2], PE: [5, 2], PB: [6, 2],
  MS: [1, 3], GO: [2, 3], DF: [3, 3], BA: [4, 3], SE: [5, 3], AL: [6, 3],
  PR: [2, 4], SP: [3, 4], MG: [4, 4], ES: [5, 4],
  SC: [2, 5], RJ: [4, 5],
  RS: [2, 6],
};

/** items: Map uf -> { color, sub, title } */
export function tileGridSVG(items, { selected = null, size = 56, gap = 4 } = {}) {
  const cols = 7, rows = 7;
  const w = cols * (size + gap), hgt = rows * (size + gap);
  const tiles = Object.entries(TILE_POS).map(([uf, [c, r]]) => {
    const it = items.get(uf) || {};
    const x = c * (size + gap), y = r * (size + gap);
    const textFill = it.dark === false ? C.ink : C.white;
    return `<g class="tile ${uf === selected ? 'is-selected' : ''}" data-uf="${uf}" tabindex="0" role="button" aria-label="${escapeHtml(it.title || uf)}">
      <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="7" fill="${it.color || VIZ.noData}"></rect>
      <text x="${x + size / 2}" y="${y + size / 2 - (it.sub ? 3 : -4)}" text-anchor="middle" style="fill:${textFill}">${uf}</text>
      ${it.sub ? `<text class="sub" x="${x + size / 2}" y="${y + size / 2 + 12}" text-anchor="middle" style="fill:${textFill}">${escapeHtml(it.sub)}</text>` : ''}
    </g>`;
  }).join('');
  return `<svg class="tilegrid" viewBox="0 0 ${w} ${hgt}" role="group" aria-label="Cartograma das UFs">${tiles}</svg>`;
}
