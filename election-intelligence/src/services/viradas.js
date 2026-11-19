/**
 * Critérios de contagem de viradas entre o 1º e o 2º turno, por município.
 *
 * O motor (engine.js) segue a regra do DAX: o vencedor é o texto com todos os empatados
 * ("Flavio Bolsonaro / Lula"); se o texto muda entre os turnos, o município "virou".
 * Por isso um empate em qualquer turno conta como virada. Este módulo expõe, lado a lado,
 * três critérios para que a página Sobre e o FAQ possam explicar as diferenças:
 *
 *  - dax:     regra do Power BI e do site (empate conta para os dois lados).
 *  - estrita: vencedor único nos dois turnos, e diferente entre eles (empates ficam de fora).
 *  - sql:     regra do banco SQL (v_virada_municipio): no empate, vence o menor número
 *             de candidato (ROW_NUMBER por votos e número); virou se o número muda.
 *
 * Não altera nenhuma regra de cálculo: só lê o resultado do motor.
 * Municípios do exterior (UF ZZ) ficam de fora, como na página 1º e 2º turno.
 */

/** Vencedor pelo desempate do SQL: mais votos e, no empate, menor número de candidato. */
function vencedorSql(E, tk, i) {
  const t = E.turnos[tk];
  let best = null;
  for (const [ck, vec] of Object.entries(t.votos)) {
    const x = vec[i];
    if (x == null) continue;
    const c = E.candByKey.get(ck);
    if (!best || x > best.v || (x === best.v && c.nr < best.c.nr)) best = { v: x, c };
  }
  return best && best.v > 0 ? best.c : null;
}

/**
 * Uma linha por município do Brasil com resultado nos dois turnos do ano.
 * @returns {Array<{tse:number, ibge:number|null, nome:string, uf:string, v1:string, v2:string,
 *   empate1:boolean, empate2:boolean, empate:boolean, dax:boolean, estrita:boolean,
 *   sql:boolean, v1Sql:string, v2Sql:string}>}
 */
export function classificarViradas(E, ano) {
  const t1 = `${ano}-1`, t2 = `${ano}-2`;
  if (!E.hasTurno(t1) || !E.hasTurno(t2)) return [];
  const r1 = E.resumoMunicipios(t1), r2 = E.resumoMunicipios(t2);
  const out = [];
  for (let i = 0; i < E.N; i++) {
    if (E.mun.exterior[i]) continue;
    const a = r1[i], b = r2[i];
    if (!a?.vencedor || !b?.vencedor) continue;
    const empate1 = a.chaves.length > 1, empate2 = b.chaves.length > 1;
    const s1 = vencedorSql(E, t1, i), s2 = vencedorSql(E, t2, i);
    out.push({
      tse: E.mun.tse[i], ibge: E.mun.ibge[i], nome: E.mun.nome[i], uf: E.mun.uf[i],
      v1: a.vencedor, v2: b.vencedor, empate1, empate2, empate: empate1 || empate2,
      dax: E.virouMun(ano, i) === 1,
      estrita: !empate1 && !empate2 && a.vencedor !== b.vencedor,
      sql: s1.nr !== s2.nr, v1Sql: s1.nome, v2Sql: s2.nome,
    });
  }
  return out;
}

const contaPor = (rows, key) => {
  const m = {};
  for (const r of rows) m[r[key]] = (m[r[key]] || 0) + 1;
  return m;
};

/** Contagens de cada critério, com a quebra por vencedor do 2º turno. */
export function contarViradas(rows) {
  const dax = rows.filter((r) => r.dax), estrita = rows.filter((r) => r.estrita), sql = rows.filter((r) => r.sql);
  return {
    municipios: rows.length,
    dax: dax.length, estrita: estrita.length, sql: sql.length,
    daxPorVencedor2: contaPor(dax, 'v2'),
    estritaPorVencedor2: contaPor(estrita, 'v2'),
    sqlPorVencedor2: contaPor(sql, 'v2Sql'),
    empates1: rows.filter((r) => r.empate1).length,
    empates2: rows.filter((r) => r.empate2).length,
    comEmpate: rows.filter((r) => r.empate),
  };
}

/** Linhas do arquivo viradas_criterios.csv (cabeçalhos em português, sim/não). */
export function linhasCsvViradas(rows, ano) {
  const sn = (b) => (b ? 'sim' : 'não');
  return rows
    .filter((r) => r.dax || r.estrita || r.sql)
    .sort((a, b) => a.uf.localeCompare(b.uf, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((r) => ({
      ano, municipio: r.nome, uf: r.uf, codigo_ibge: r.ibge ?? '', codigo_tse: r.tse,
      vencedor_1t: r.v1, vencedor_2t: r.v2, empate: sn(r.empate), empate_1t: sn(r.empate1), empate_2t: sn(r.empate2),
      contagem_estrita: sn(r.estrita), regra_dax: sn(r.dax), regra_sql: sn(r.sql),
    }));
}

export const COLUNAS_CSV_VIRADAS = ['ano', 'municipio', 'uf', 'codigo_ibge', 'codigo_tse', 'vencedor_1t', 'vencedor_2t', 'empate', 'empate_1t', 'empate_2t', 'contagem_estrita', 'regra_dax', 'regra_sql'];
