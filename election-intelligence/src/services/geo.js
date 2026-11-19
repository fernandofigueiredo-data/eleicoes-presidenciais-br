/**
 * Geometrias oficiais do IBGE (API de Malhas v3) em TopoJSON, carregadas sob demanda (lazy).
 * Municípios ligam-se aos dados por cd_municipio_ibge (= codarea); UFs por código IBGE da UF.
 */
import { feature, mesh, merge } from 'topojson-client';

const BASE = `${import.meta.env.BASE_URL}geo/`;
const UF_COD = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };
export const UF_POR_CODIGO = UF_COD;

let ufP = null;
let munP = null;

export function loadUFs(E) {
  if (!ufP) {
    ufP = fetch(BASE + 'ufs.topo.json').then((r) => r.json()).then((topo) => {
      const obj = topo.objects[Object.keys(topo.objects)[0]];
      const fc = feature(topo, obj);
      fc.features.forEach((f) => {
        const uf = UF_COD[Number(f.properties.codarea)];
        f.id = uf;
        f.properties = { uf, nome: E.meta.ufs.find((u) => u.sigla === uf)?.nome, regiao: E.meta.ufs.find((u) => u.sigla === uf)?.regiao };
      });
      const regioes = Object.keys(E.meta.regioes).filter((r) => r !== 'EX').map((r) => {
        const geoms = obj.geometries.filter((g) => E.meta.ufs.find((u) => u.sigla === UF_COD[Number(g.properties.codarea)])?.regiao === r);
        return { type: 'Feature', id: r, properties: { regiao: r, nome: E.meta.regioes[r] }, geometry: merge(topo, geoms) };
      });
      const borders = mesh(topo, obj, (a, b) => a !== b);
      const outline = mesh(topo, obj, (a, b) => a === b);
      return { ufs: fc.features, regioes, borders, outline };
    });
  }
  return ufP;
}

export function loadMunicipios(E) {
  if (!munP) {
    munP = fetch(BASE + 'municipios.topo.json').then((r) => r.json()).then((topo) => {
      const obj = topo.objects[Object.keys(topo.objects)[0]];
      const fc = feature(topo, obj);
      const out = [];
      for (const f of fc.features) {
        const idx = E.idxByIbge.get(Number(f.properties.codarea));
        if (idx == null) continue;
        f.id = idx; // índice do município na camada de dados
        f.properties = { idx, uf: E.mun.uf[idx] };
        out.push(f);
      }
      return out;
    });
  }
  return munP;
}
