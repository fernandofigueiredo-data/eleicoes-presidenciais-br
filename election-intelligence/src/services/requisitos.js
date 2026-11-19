/**
 * Quais arquivos de turno cada página precisa para mostrar números completos.
 * A página só é montada (ou atualizada) depois que esses turnos estão carregados; os demais vêm
 * em segundo plano. Assim a primeira tela não espera os 8 turnos (cerca de 1 MB compactado).
 *
 *  - par:      1º e 2º turno do ano escolhido (todas as páginas).
 *  - anterior: 1º e 2º turno da eleição de 4 anos antes. Mudanças sempre usa; mapa, 1º e 2º turno
 *              e perfil só usam no detalhe do município selecionado (variação da abstenção).
 *  - todos:    páginas com séries de todos os turnos ou conferência completa.
 * A Visão Nacional usa só o par; o gráfico de participação ao longo do tempo espera os 8 turnos.
 */
const SO_PAR = new Set(['nacional']);
const ANTERIOR_SO_COM_MUNICIPIO = new Set(['mapa', 'turnos', 'perfil']);
const TODOS = new Set(['participacao', 'comparar', 'sobre']);

export function turnosNecessarios(page, turno, meta, mun = null) {
  const existe = new Set(meta.turnos.map((t) => t.chave));
  if (TODOS.has(page)) return [...existe];
  const ano = Number(String(turno).split('-')[0]);
  const chaves = [`${ano}-1`, `${ano}-2`];
  const anterior = !SO_PAR.has(page) && (!ANTERIOR_SO_COM_MUNICIPIO.has(page) || mun != null);
  if (anterior) chaves.push(`${ano - 4}-1`, `${ano - 4}-2`);
  return chaves.filter((k) => existe.has(k));
}
