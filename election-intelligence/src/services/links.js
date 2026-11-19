/**
 * Links da campanha de divulgação: um por UF, para a página 1º e 2º turno filtrada pelo estado.
 * A lista de UFs sai da base (municípios do Brasil), não de uma lista escrita à mão.
 */
import { classificarViradas } from './viradas.js';
import { PROJETO } from '../content/projeto.js';

export const ROTA_UF = (uf) => `turnos?uf=${uf}`;

export function linksUf(E, ano = 2026, site = PROJETO.site) {
  const siglas = [...new Set(E.mun.uf.filter((u, i) => !E.mun.exterior[i]))].sort();
  if (siglas.length !== 27) throw new Error(`A base tem ${siglas.length} UFs, e não 27: confira antes de gerar os links.`);
  const rows = classificarViradas(E, ano);
  return siglas.map((uf) => {
    const r = rows.filter((x) => x.uf === uf);
    return {
      uf, nome: E.meta.ufs.find((u) => u.sigla === uf)?.nome ?? uf, url: `${site}${ROTA_UF(uf)}`,
      municipios: E.selection({ uf, exterior: false }).length,
      comparaveis: r.length,
      lula: r.filter((x) => x.estrita && x.v2 === 'Lula').length,
      flavio: r.filter((x) => x.estrita && x.v2 === 'Flavio Bolsonaro').length,
      estrita: r.filter((x) => x.estrita).length,
      dax: r.filter((x) => x.dax).length,
    };
  });
}
