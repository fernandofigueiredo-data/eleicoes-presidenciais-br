/**
 * Motor de medidas — reprodução em JavaScript das medidas DAX do PBIX.
 *
 * Cada função pública leva o nome da medida DAX que reproduz (ver docs/METODOLOGIA.md).
 * O motor não depende do DOM: roda no navegador e no Node (testes e validação).
 *
 * Semântica DAX preservada:
 *  - SUM sobre zero linhas = BLANK  -> aqui `null`.
 *  - DIVIDE(a, b) com b = 0/BLANK   -> `null`.
 *  - TOPN(1, ...) com empate devolve todos os empatados; CONCATENATEX junta com " / ".
 *    O DAX não fixa a ordem dos empatados; aqui a ordem é alfabética (determinística).
 *  - Medidas de dMunicipio (PIB per capita, Alfabetização, População) não são filtradas
 *    por turno (a relação dTurno -> fatos não chega a dMunicipio).
 *
 * Contexto de filtro (ctx):
 *  {
 *    turno: '2026-2',                    // dTurno (obrigatório nas medidas de fato)
 *    exterior: true|false|undefined,     // dMunicipio[exterior] = valor (undefined = sem filtro)
 *    regiao: 'SE'|null, uf: 'SP'|null,   // dMunicipio[sg_regiao] / [sg_uf]
 *    mun: <cd_municipio_tse>|null,       // dMunicipio[cd_municipio_tse]
 *    munSet: Set<idx>|null,              // filtro livre por índice de município (agrupamentos)
 *    cand: { chaves?:Set, nomes?:Set, partidos?:Set } | null   // filtros em dCandidato
 *  }
 */

const SEP = ' / ';

export function createEngine({ meta, mun, turnos }) {
  const N = mun.tse.length;
  const idxByTse = new Map(mun.tse.map((t, i) => [t, i]));
  const idxByIbge = new Map();
  mun.ibge.forEach((c, i) => c != null && idxByIbge.set(c, i));
  const ufInfo = new Map(meta.ufs.map((u) => [u.sigla, u]));
  const regiaoDe = mun.uf.map((u) => ufInfo.get(u)?.regiao ?? null);
  const candByKey = new Map(meta.candidatos.map((c) => [c.chave, c]));
  const turnoByKey = new Map(meta.turnos.map((t) => [t.chave, t]));
  const turnoKey = (ano, nr) => `${ano}-${nr}`;
  const hasTurno = (k) => turnoByKey.has(k) && !!turnos[k];

  // ---------------------------------------------------------------- seleção de municípios
  const selCache = new Map();
  function selection(ctx = {}) {
    const key = [ctx.exterior, ctx.regiao, ctx.uf, ctx.mun, ctx.munSetKey].join('|');
    if (!ctx.munSet && selCache.has(key)) return selCache.get(key);
    const out = [];
    for (let i = 0; i < N; i++) {
      if (ctx.exterior !== undefined && ctx.exterior !== null && !!mun.exterior[i] !== ctx.exterior) continue;
      if (ctx.regiao && regiaoDe[i] !== ctx.regiao) continue;
      if (ctx.uf && mun.uf[i] !== ctx.uf) continue;
      if (ctx.mun != null && mun.tse[i] !== ctx.mun) continue;
      if (ctx.munSet && !ctx.munSet.has(i)) continue;
      out.push(i);
    }
    if (!ctx.munSet) selCache.set(key, out);
    return out;
  }

  function candPasses(c, f) {
    if (!f) return true;
    if (f.chaves && f.chaves.size && !f.chaves.has(c.chave)) return false;
    if (f.nomes && f.nomes.size && !f.nomes.has(c.nome)) return false;
    if (f.partidos && f.partidos.size && !f.partidos.has(c.partido)) return false;
    return true;
  }

  /** Candidatos que têm linhas em fVotos no turno. */
  function candidatosDoTurno(tk) {
    const t = turnos[tk];
    return t ? Object.keys(t.votos).map((k) => candByKey.get(k)) : [];
  }

  // ---------------------------------------------------------------- somas básicas
  function sumComp(tk, field, sel) {
    const t = turnos[tk];
    if (!t) return null;
    const v = t.comp[field];
    let s = 0, any = false;
    for (const i of sel) {
      const x = v[i];
      if (x != null) { s += x; any = true; }
    }
    return any ? s : null;
  }

  /** Map chave_candidato -> soma de votos (null se não houver linhas). */
  function votosPorCandidato(tk, sel, candFilter = null) {
    const t = turnos[tk];
    const out = new Map();
    if (!t) return out;
    for (const [ck, vec] of Object.entries(t.votos)) {
      const c = candByKey.get(ck);
      if (!candPasses(c, candFilter)) continue;
      let s = 0, any = false;
      for (const i of sel) {
        const x = vec[i];
        if (x != null) { s += x; any = true; }
      }
      out.set(ck, any ? s : null);
    }
    return out;
  }

  const DIVIDE = (a, b) => (a == null || b == null || b === 0 ? null : a / b);
  const sumMap = (m) => {
    let s = 0, any = false;
    for (const v of m.values()) if (v != null) { s += v; any = true; }
    return any ? s : null;
  };

  // ---------------------------------------------------------------- 1. Eleitorado
  const Aptos = (ctx) => sumComp(ctx.turno, 'aptos', selection(ctx));
  const Comparecimento = (ctx) => sumComp(ctx.turno, 'comp', selection(ctx));
  const Abstencoes = (ctx) => sumComp(ctx.turno, 'abst', selection(ctx));
  const VotosValidos = (ctx) => sumComp(ctx.turno, 'validos', selection(ctx));
  const VotosBrancos = (ctx) => sumComp(ctx.turno, 'brancos', selection(ctx));
  const VotosNulos = (ctx) => sumComp(ctx.turno, 'nulos', selection(ctx));
  const PctAbstencao = (ctx) => DIVIDE(Abstencoes(ctx), Aptos(ctx));
  const PctComparecimento = (ctx) => DIVIDE(Comparecimento(ctx), Aptos(ctx));
  const PctBrancos = (ctx) => DIVIDE(VotosBrancos(ctx), Comparecimento(ctx));
  const PctNulos = (ctx) => DIVIDE(VotosNulos(ctx), Comparecimento(ctx));
  const PctBrancosNulos = (ctx) => {
    const b = VotosBrancos(ctx), n = VotosNulos(ctx);
    return DIVIDE(b == null && n == null ? null : (b || 0) + (n || 0), Comparecimento(ctx));
  };
  /** % Abstenção Nacional = CALCULATE([% Abstenção], REMOVEFILTERS(dMunicipio[sg_uf])) */
  const PctAbstencaoNacional = (ctx) => PctAbstencao({ ...ctx, uf: null, mun: null });

  // ---------------------------------------------------------------- 2. Votos
  const Votos = (ctx) => sumMap(votosPorCandidato(ctx.turno, selection(ctx), ctx.cand));
  /** CALCULATE([Votos], REMOVEFILTERS(dCandidato)) */
  const VotosTodosCandidatos = (ctx) => sumMap(votosPorCandidato(ctx.turno, selection(ctx), null));
  const PctVotosValidos = (ctx) => DIVIDE(Votos(ctx), VotosTodosCandidatos(ctx));

  /** Posição = RANKX(ALLSELECTED(nm_urna), [Votos], , DESC, DENSE) — devolve Map nome -> posição. */
  function Posicao(ctx) {
    const porNome = agrupar(votosPorCandidato(ctx.turno, selection(ctx), ctx.cand), 'nome');
    const vals = [...new Set([...porNome.values()].filter((v) => v != null))].sort((a, b) => b - a);
    const out = new Map();
    for (const [nome, v] of porNome) if (v != null) out.set(nome, vals.indexOf(v) + 1);
    return out;
  }

  // ---------------------------------------------------------------- 3. Vencedores
  function agrupar(mapVotos, campo) {
    const g = new Map();
    for (const [ck, v] of mapVotos) {
      const key = candByKey.get(ck)[campo];
      const prev = g.get(key);
      g.set(key, prev == null ? v : v == null ? prev : prev + v);
    }
    return g;
  }
  function topN1(grupo) {
    let best = null;
    for (const v of grupo.values()) if (v != null && (best == null || v > best)) best = v;
    if (best == null) return [];
    return [...grupo.entries()].filter(([, v]) => v === best).map(([k]) => k).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  function vencedorPor(campo, tk, sel, candFilter) {
    const todos = sumMap(votosPorCandidato(tk, sel, null));
    if (!(todos > 0)) return null;
    const ganhadores = topN1(agrupar(votosPorCandidato(tk, sel, candFilter), campo));
    return ganhadores.length ? ganhadores.join(SEP) : null;
  }
  const Vencedor = (ctx) => vencedorPor('nome', ctx.turno, selection(ctx), ctx.cand);
  const PartidoVencedor = (ctx) => vencedorPor('partido', ctx.turno, selection(ctx), ctx.cand);

  function PctDoVencedor(ctx) {
    const sel = selection(ctx);
    const m = votosPorCandidato(ctx.turno, sel, ctx.cand);
    let best = null;
    for (const v of m.values()) if (v != null && (best == null || v > best)) best = v;
    return DIVIDE(best, sumMap(votosPorCandidato(ctx.turno, sel, null)));
  }

  function MargemDeVitoria(ctx) {
    const sel = selection(ctx);
    // TOPN(2, VALUES(chave_candidato), [Votos]); MAXX/MINX ignoram BLANK.
    // COUNTROWS(doisPrimeiros) >= 2 exige ao menos 2 candidatos no contexto de dCandidato.
    if (candidatosFiltrados(ctx.cand) < 2) return null;
    const reais = [...votosPorCandidato(ctx.turno, sel, ctx.cand).values()].filter((v) => v != null).sort((a, b) => b - a);
    if (!reais.length) return null;
    const primeiro = reais[0];
    const segundo = reais.length >= 2 ? reais[1] : reais[0];
    return DIVIDE(primeiro - segundo, sumMap(votosPorCandidato(ctx.turno, sel, null)));
  }
  function candidatosFiltrados(f) {
    let n = 0;
    for (const c of meta.candidatos) if (candPasses(c, f)) n++;
    return n;
  }

  // Resumo por município (cache por turno): vencedor, partido, votos do 1º e 2º colocados.
  const resumoCache = new Map();
  function resumoMunicipios(tk) {
    if (resumoCache.has(tk)) return resumoCache.get(tk);
    const t = turnos[tk];
    const entries = Object.entries(t.votos).map(([ck, vec]) => [candByKey.get(ck), vec]);
    const out = new Array(N);
    for (let i = 0; i < N; i++) {
      let total = 0, any = false, max = null;
      for (const [, vec] of entries) {
        const x = vec[i];
        if (x != null) { any = true; total += x; if (max == null || x > max) max = x; }
      }
      if (!any) { out[i] = null; continue; }
      const nomes = [], partidos = new Set(), chaves = [];
      const vals = [];
      for (const [c, vec] of entries) {
        const x = vec[i];
        if (x != null) vals.push(x);
        if (x != null && x === max) { nomes.push(c.nome); partidos.add(c.partido); chaves.push(c.chave); }
      }
      vals.sort((a, b) => b - a);
      const segundo = vals.length >= 2 ? vals[1] : null;
      out[i] = {
        total,
        max,
        segundo,
        chaves,
        vencedor: total > 0 ? nomes.sort((a, b) => a.localeCompare(b, 'pt-BR')).join(SEP) : null,
        partido: total > 0 ? [...partidos].sort((a, b) => a.localeCompare(b, 'pt-BR')).join(SEP) : null,
        pct: total > 0 ? max / total : null,
        margem: total > 0 && segundo != null ? (max - segundo) / total : null,
      };
    }
    resumoCache.set(tk, out);
    return out;
  }

  /** Municípios Vencidos (para o filtro de candidato do contexto). */
  function MunicipiosVencidos(ctx) {
    const t = turnos[ctx.turno];
    if (!t) return null;
    const sel = selection(ctx);
    const chaves = Object.keys(t.votos).filter((k) => candPasses(candByKey.get(k), ctx.cand));
    const res = resumoMunicipios(ctx.turno);
    let n = 0;
    for (const i of sel) {
      const r = res[i];
      if (!r) continue;
      let v = null;
      for (const k of chaves) { const x = t.votos[k][i]; if (x != null) v = (v || 0) + x; }
      if (v != null && v > 0 && v === r.max) n++;
    }
    return n || null;
  }
  /** Denominador: DISTINCTCOUNT(fVotos[cd_municipio_tse]) sem filtro de candidato. */
  function municipiosComVotos(ctx) {
    const res = resumoMunicipios(ctx.turno);
    let n = 0;
    for (const i of selection(ctx)) if (res[i]) n++;
    return n;
  }
  const PctMunicipiosVencidos = (ctx) => DIVIDE(MunicipiosVencidos(ctx), municipiosComVotos(ctx));

  // ---------------------------------------------------------------- 4. Comparação entre eleições
  const anoDe = (tk) => turnoByKey.get(tk)?.ano ?? null;
  const nrDe = (tk) => turnoByKey.get(tk)?.nr ?? null;

  /** Partido vencedor do 1º turno do ano `ano` para um município (índice). */
  function partidoVencedor1T(ano, i) {
    const k = turnoKey(ano, 1);
    if (!hasTurno(k)) return null;
    return resumoMunicipios(k)[i]?.partido ?? null;
  }
  function vencedor1T(ano, i) {
    const k = turnoKey(ano, 1);
    if (!hasTurno(k)) return null;
    return resumoMunicipios(k)[i]?.vencedor ?? null;
  }
  /** Mudou Partido Vencedor (por município). PSL e PL contam como o mesmo campo. */
  function mudouPartidoMun(ano, i) {
    const atual = partidoVencedor1T(ano, i);
    const anterior = partidoVencedor1T(ano - 4, i);
    if (atual == null || anterior == null) return null;
    const norm = (s) => s.replaceAll('PSL', 'PL');
    return norm(atual) !== norm(anterior) ? 1 : 0;
  }
  /** Indicador derivado (não existe no PBIX): mudou o CANDIDATO vencedor do 1º turno. */
  function mudouCandidatoMun(ano, i) {
    const atual = vencedor1T(ano, i), anterior = vencedor1T(ano - 4, i);
    if (atual == null || anterior == null) return null;
    return atual !== anterior ? 1 : 0;
  }
  function somaPorMunicipio(ctx, fn) {
    let s = 0, n = 0, any = false;
    for (const i of selection(ctx)) {
      const v = fn(i);
      if (v != null) { any = true; s += v; n++; }
    }
    return { soma: any ? s : null, validos: n };
  }
  function MunicipiosQueMudaram(ctx) {
    const ano = anoDe(ctx.turno);
    return somaPorMunicipio(ctx, (i) => mudouPartidoMun(ano, i)).soma;
  }
  function PctMunicipiosQueMudaram(ctx) {
    const ano = anoDe(ctx.turno);
    const r = somaPorMunicipio(ctx, (i) => mudouPartidoMun(ano, i));
    return DIVIDE(r.soma, r.validos || null);
  }
  function MunicipiosQueMudaramCandidato(ctx) {
    const ano = anoDe(ctx.turno);
    return somaPorMunicipio(ctx, (i) => mudouCandidatoMun(ano, i)).soma;
  }

  /** % Votos Válidos em outro turno, com o mesmo filtro de candidato/território. */
  function pctValidosEm(tk, ctx, candFilter) {
    if (!hasTurno(tk)) return null;
    const sel = selection(ctx);
    return DIVIDE(sumMap(votosPorCandidato(tk, sel, candFilter)), sumMap(votosPorCandidato(tk, sel, null)));
  }
  function PctVotosValidosEleicaoAnterior(ctx) {
    const ano = anoDe(ctx.turno), nr = nrDe(ctx.turno);
    if (ano == null) return null;
    const anoAnterior = ano - 4;
    const partidos = ctx.cand?.partidos;
    const unico = partidos && partidos.size === 1 ? [...partidos][0] : null;
    let f = ctx.cand;
    if (unico === 'PL' && anoAnterior === 2018) f = { ...ctx.cand, partidos: new Set(['PSL']) };
    return pctValidosEm(turnoKey(anoAnterior, nr), ctx, f);
  }
  function VariacaoPP(ctx) {
    const atual = PctVotosValidos(ctx), anterior = PctVotosValidosEleicaoAnterior(ctx);
    return atual != null && anterior != null ? (atual - anterior) * 100 : null;
  }
  function PctAbstencaoEleicaoAnterior(ctx) {
    const ano = anoDe(ctx.turno), nr = nrDe(ctx.turno);
    const k = turnoKey(ano - 4, nr);
    if (!hasTurno(k)) return null;
    return PctAbstencao({ ...ctx, turno: k });
  }
  function VariacaoAbstencaoPP(ctx) {
    const anterior = PctAbstencaoEleicaoAnterior(ctx);
    if (anterior == null) return null;
    const atual = PctAbstencao(ctx);
    return ((atual ?? 0) - anterior) * 100;
  }

  // ---------------------------------------------------------------- 5. Comparação entre turnos
  function vencedorTurnoMun(ano, nr, i) {
    const k = turnoKey(ano, nr);
    if (!hasTurno(k)) return null;
    return resumoMunicipios(k)[i]?.vencedor ?? null;
  }
  function virouMun(ano, i) {
    const a = vencedorTurnoMun(ano, 1, i), b = vencedorTurnoMun(ano, 2, i);
    if (a == null || b == null) return null;
    return a !== b ? 1 : 0;
  }
  function MunicipiosQueViraram(ctx) {
    const ano = anoDe(ctx.turno);
    return somaPorMunicipio(ctx, (i) => virouMun(ano, i)).soma;
  }
  function PctMunicipiosQueViraram(ctx) {
    const ano = anoDe(ctx.turno);
    const r = somaPorMunicipio(ctx, (i) => virouMun(ano, i));
    return DIVIDE(r.soma, r.validos || null);
  }
  const Vencedor1T = (ctx) => Vencedor({ ...ctx, turno: turnoKey(anoDe(ctx.turno), 1) });
  const Vencedor2T = (ctx) => (hasTurno(turnoKey(anoDe(ctx.turno), 2)) ? Vencedor({ ...ctx, turno: turnoKey(anoDe(ctx.turno), 2) }) : null);
  const Votos1T = (ctx) => Votos({ ...ctx, turno: turnoKey(anoDe(ctx.turno), 1) });
  const Votos2T = (ctx) => (hasTurno(turnoKey(anoDe(ctx.turno), 2)) ? Votos({ ...ctx, turno: turnoKey(anoDe(ctx.turno), 2) }) : null);
  function VotosGanhos2T(ctx) {
    const s = Votos2T(ctx);
    return s == null ? null : s - (Votos1T(ctx) ?? 0);
  }
  const PctVotosValidos1T = (ctx) => PctVotosValidos({ ...ctx, turno: turnoKey(anoDe(ctx.turno), 1) });
  const PctVotosValidos2T = (ctx) => (hasTurno(turnoKey(anoDe(ctx.turno), 2)) ? PctVotosValidos({ ...ctx, turno: turnoKey(anoDe(ctx.turno), 2) }) : null);
  function VariacaoEntreTurnosPP(ctx) {
    const a = PctVotosValidos1T(ctx), b = PctVotosValidos2T(ctx);
    return a != null && b != null ? (b - a) * 100 : null;
  }

  // ---------------------------------------------------------------- 6. Perfil dos municípios
  function Municipios(ctx) {
    let n = 0;
    for (const i of selection(ctx)) if (!mun.exterior[i]) n++;
    return n || null;
  }
  function Populacao(ctx) {
    let s = 0, any = false;
    for (const i of selection(ctx)) { const p = mun.pop[i]; if (p != null) { s += p; any = true; } }
    return any ? s : null;
  }
  function ponderado(ctx, campo) {
    let num = 0, den = 0, anyN = false;
    for (const i of selection(ctx)) {
      const v = mun[campo][i], p = mun.pop[i];
      if (v != null && p != null) { num += v * p; anyN = true; }
      if (v != null && p != null) den += p;
    }
    return anyN ? DIVIDE(num, den) : null;
  }
  const PIBperCapita = (ctx) => ponderado(ctx, 'pibpc');
  const Alfabetizacao = (ctx) => ponderado(ctx, 'alfab');

  // ---------------------------------------------------------------- 7. Qualidade dos dados
  function DiferencaApuracao(ctx) {
    const c = Comparecimento(ctx);
    return (c ?? 0) - ((VotosValidos(ctx) ?? 0) + (VotosBrancos(ctx) ?? 0) + (VotosNulos(ctx) ?? 0));
  }
  const ConferenciaValidos = (ctx) => (VotosTodosCandidatos(ctx) === VotosValidos(ctx) ? '✔ confere' : '✖ diferente');

  // ---------------------------------------------------------------- 8. Cores e textos
  const corPartido = (p) => {
    if (!p) return meta.corPadrao;
    return meta.partidoCores[p] ?? meta.corPadrao;
  };
  const corCandidato = (ck) => corPartido(candByKey.get(ck)?.partido);
  function TituloEleicao(ctx) {
    const t = turnoByKey.get(ctx.turno);
    return 'Eleição presidencial · ' + (t ? t.rotulo : 'Selecione uma eleição e um turno');
  }

  // ---------------------------------------------------------------- utilitários de agrupamento
  /** Avalia `fn(ctxGrupo)` para cada grupo de municípios (por UF, região, faixa, quartil...). */
  function porGrupo(ctx, chaveFn, fn) {
    const grupos = new Map();
    for (const i of selection(ctx)) {
      const k = chaveFn(i);
      if (!grupos.has(k)) grupos.set(k, new Set());
      grupos.get(k).add(i);
    }
    const out = [];
    for (const [k, set] of grupos) out.push({ chave: k, valor: fn({ ...ctx, munSet: set }) });
    return out;
  }

  return {
    meta, mun, turnos, N,
    idxByTse, idxByIbge, regiaoDe, candByKey, turnoByKey, turnoKey, hasTurno, anoDe, nrDe,
    selection, candidatosDoTurno, votosPorCandidato, resumoMunicipios, porGrupo, candPasses,
    // medidas (nomes DAX)
    Aptos, Comparecimento, Abstencoes, VotosValidos, VotosBrancos, VotosNulos,
    PctAbstencao, PctComparecimento, PctBrancos, PctNulos, PctBrancosNulos, PctAbstencaoNacional,
    Votos, VotosTodosCandidatos, PctVotosValidos, Posicao,
    Vencedor, PartidoVencedor, PctDoVencedor, MargemDeVitoria, MunicipiosVencidos, PctMunicipiosVencidos,
    partidoVencedor1T, vencedor1T, mudouPartidoMun, mudouCandidatoMun,
    MunicipiosQueMudaram, PctMunicipiosQueMudaram, MunicipiosQueMudaramCandidato,
    PctVotosValidosEleicaoAnterior, VariacaoPP, PctAbstencaoEleicaoAnterior, VariacaoAbstencaoPP,
    vencedorTurnoMun, virouMun, MunicipiosQueViraram, PctMunicipiosQueViraram,
    Vencedor1T, Vencedor2T, Votos1T, Votos2T, VotosGanhos2T, PctVotosValidos1T, PctVotosValidos2T, VariacaoEntreTurnosPP,
    Municipios, Populacao, PIBperCapita, Alfabetizacao,
    DiferencaApuracao, ConferenciaValidos,
    corPartido, corCandidato, TituloEleicao,
  };
}
