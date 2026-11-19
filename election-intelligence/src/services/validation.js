/**
 * Casos de validação: cada caso compara um valor avaliado pelo PBIX-MCP (referência)
 * com o mesmo indicador calculado pelo motor JavaScript.
 * Usado por scripts/validate.mjs, pelos testes (tests/engine.test.js) e pela página "Sobre os dados".
 */
const TOL_ABS = 1e-9; // números inteiros devem bater exatamente; razões até 1e-9

export function buildCases(E, ref) {
  const cases = [];
  const add = (grupo, medida, contexto, mcp, js) => cases.push({ grupo, medida, contexto, mcp, js });
  const sem = {};

  const mapa = {
    'Aptos': E.Aptos, 'Comparecimento': E.Comparecimento, 'Abstenções': E.Abstencoes,
    'Votos Válidos': E.VotosValidos, 'Votos Brancos': E.VotosBrancos, 'Votos Nulos': E.VotosNulos,
    '% Abstenção': E.PctAbstencao, '% Comparecimento': E.PctComparecimento, '% Brancos': E.PctBrancos,
    '% Nulos': E.PctNulos, '% Brancos e Nulos': E.PctBrancosNulos, 'Votos Todos os Candidatos': E.VotosTodosCandidatos,
    'Diferença de Apuração': E.DiferencaApuracao, 'Conferência Válidos': E.ConferenciaValidos,
    'Vencedor': E.Vencedor, '% do Vencedor': E.PctDoVencedor, 'Margem de Vitória': E.MargemDeVitoria,
    'Municípios': E.Municipios,
  };
  for (const [tk, linha] of Object.entries(ref.nacional_por_turno.linhas)) {
    for (const [medida, mcp] of Object.entries(linha)) {
      add('Nacional por turno', medida, `${tk}`, mcp, mapa[medida]({ ...sem, turno: tk }));
    }
  }
  for (const tk of ['2026-2', '2026-1']) {
    for (const [ck, vals] of Object.entries(ref.candidatos[tk])) {
      const ctx = { turno: tk, cand: { chaves: new Set([ck]) } };
      add('Candidatos', 'Votos', `${tk} · ${E.candByKey.get(ck).nome}`, vals['Votos'], E.Votos(ctx));
      add('Candidatos', '% Votos Válidos', `${tk} · ${E.candByKey.get(ck).nome}`, vals['% Votos Válidos'], E.PctVotosValidos(ctx));
      if (vals['Posição'] != null) add('Candidatos', 'Posição', `${tk} · ${E.candByKey.get(ck).nome}`, vals['Posição'], E.Posicao(ctx).get(E.candByKey.get(ck).nome));
    }
  }
  for (const [k, vals] of Object.entries(ref.municipios_vencidos)) {
    if (k === 'contexto') continue;
    const [tk, ck] = k.split('|');
    const ctx = { turno: tk, exterior: false, cand: { chaves: new Set([ck]) } };
    const nome = E.candByKey.get(ck).nome;
    add('Municípios vencidos', 'Municípios Vencidos', `${tk} · ${nome} · sem exterior`, vals['Municípios Vencidos'], E.MunicipiosVencidos(ctx));
    if (vals['% Municípios Vencidos'] != null) add('Municípios vencidos', '% Municípios Vencidos', `${tk} · ${nome} · sem exterior`, vals['% Municípios Vencidos'], E.PctMunicipiosVencidos(ctx));
    if (vals['Votos'] != null) add('Municípios vencidos', 'Votos', `${tk} · ${nome} · sem exterior`, vals['Votos'], E.Votos(ctx));
    if (vals['% Votos Válidos'] != null) add('Municípios vencidos', '% Votos Válidos', `${tk} · ${nome} · sem exterior`, vals['% Votos Válidos'], E.PctVotosValidos(ctx));
  }
  const cmp = {
    'Municípios que Viraram': E.MunicipiosQueViraram, '% Municípios que Viraram': E.PctMunicipiosQueViraram,
    'Municípios que Mudaram': E.MunicipiosQueMudaram, '% Municípios que Mudaram': E.PctMunicipiosQueMudaram,
    'PIB per capita': E.PIBperCapita, 'Alfabetização': E.Alfabetizacao, 'Municípios': E.Municipios,
    'População 2022': E.Populacao, 'Variação Abstenção p.p.': E.VariacaoAbstencaoPP,
    '% Abstenção Eleição Anterior': E.PctAbstencaoEleicaoAnterior,
  };
  for (const [tk, vals] of Object.entries(ref.comparacoes)) {
    if (tk === 'contexto') continue;
    for (const [medida, mcp] of Object.entries(vals)) add('Comparações', medida, `${tk} · sem exterior`, mcp, cmp[medida]({ turno: tk, exterior: false }));
  }
  for (const [uf, [abst, venc, pct, margem]] of Object.entries(ref.uf_2026_2.linhas)) {
    const ctx = { turno: '2026-2', exterior: false, uf };
    add('UF (2026 · 2º turno)', '% Abstenção', uf, abst, E.PctAbstencao(ctx));
    add('UF (2026 · 2º turno)', 'Vencedor', uf, venc, E.Vencedor(ctx));
    add('UF (2026 · 2º turno)', '% do Vencedor', uf, pct, E.PctDoVencedor(ctx));
    add('UF (2026 · 2º turno)', 'Margem de Vitória', uf, margem, E.MargemDeVitoria(ctx));
  }
  const lula = { turno: '2026-2', exterior: false, cand: { chaves: new Set(['2026-13']) } };
  for (const [q, v] of Object.entries(ref.perfil_2026_2_lula['Quartil PIB per capita'])) {
    const set = new Set(E.selection(lula).filter((i) => E.mun.qPib[i] === q));
    add('Perfil (Lula, 2026 · 2º)', '% Votos Válidos', `Quartil PIB: ${q}`, v, E.PctVotosValidos({ ...lula, munSet: set, munSetKey: 'q' + q }));
  }
  for (const [f, v] of Object.entries(ref.perfil_2026_2_lula.faixa_populacao)) {
    const set = new Set(E.selection(lula).filter((i) => E.mun.faixa[i] === f));
    add('Perfil (Lula, 2026 · 2º)', '% Votos Válidos', `Faixa: ${f}`, v, E.PctVotosValidos({ ...lula, munSet: set, munSetKey: 'f' + f }));
  }
  const t = ref.turnos_2026_lula;
  const ctxT = { turno: '2026-2', cand: { chaves: new Set(['2026-13']) } };
  add('Turnos (Lula, 2026)', 'Votos 1º Turno', '2026', t['Votos 1º Turno'], E.Votos1T(ctxT));
  add('Turnos (Lula, 2026)', 'Votos 2º Turno', '2026', t['Votos 2º Turno'], E.Votos2T(ctxT));
  add('Turnos (Lula, 2026)', 'Votos Ganhos no 2º Turno', '2026', t['Votos Ganhos no 2º Turno'], E.VotosGanhos2T(ctxT));
  add('Turnos (Lula, 2026)', '% Votos Válidos 1º Turno', '2026', t['% Votos Válidos 1º Turno'], E.PctVotosValidos1T(ctxT));
  add('Turnos (Lula, 2026)', '% Votos Válidos 2º Turno', '2026', t['% Votos Válidos 2º Turno'], E.PctVotosValidos2T(ctxT));
  add('Turnos (Lula, 2026)', 'Variação entre Turnos p.p.', '2026', t['Variação entre Turnos p.p.'], E.VariacaoEntreTurnosPP(ctxT));
  const v = ref.variacao_pl_sp_2026_2;
  const ctxV = { turno: '2026-2', exterior: false, uf: 'SP', cand: { partidos: new Set(['PL']) } };
  add('Variação (PL, SP, 2026 · 2º)', '% Votos Válidos', 'SP · PL', v['% Votos Válidos'], E.PctVotosValidos(ctxV));
  add('Variação (PL, SP, 2026 · 2º)', '% Votos Válidos Eleição Anterior', 'SP · PL', v['% Votos Válidos Eleição Anterior'], E.PctVotosValidosEleicaoAnterior(ctxV));
  add('Variação (PL, SP, 2026 · 2º)', 'Variação p.p.', 'SP · PL', v['Variação p.p.'], E.VariacaoPP(ctxV));
  add('Variação (PL, SP, 2026 · 2º)', '% Abstenção Eleição Anterior', 'SP', v['% Abstenção Eleição Anterior'], E.PctAbstencaoEleicaoAnterior(ctxV));
  add('Variação (PL, SP, 2026 · 2º)', 'Variação Abstenção p.p.', 'SP', v['Variação Abstenção p.p.'], E.VariacaoAbstencaoPP(ctxV));
  const sp = ref.municipio_sao_paulo_2026_2;
  const ctxM = { turno: '2026-2', mun: 71072 };
  const iSP = E.idxByTse.get(71072);
  const fm = {
    'Vencedor': () => E.Vencedor(ctxM), '% do Vencedor': () => E.PctDoVencedor(ctxM), 'Margem de Vitória': () => E.MargemDeVitoria(ctxM),
    '% Abstenção': () => E.PctAbstencao(ctxM), 'PIB per capita': () => E.PIBperCapita(ctxM), 'Alfabetização': () => E.Alfabetizacao(ctxM),
    'Vencedor 1º Turno': () => E.Vencedor1T(ctxM), 'Vencedor 2º Turno': () => E.Vencedor2T(ctxM), 'Virou no 2º Turno': () => E.virouMun(2026, iSP),
    'Partido Vencedor 1º Turno': () => E.partidoVencedor1T(2026, iSP), 'Partido Vencedor 1º Turno Anterior': () => E.partidoVencedor1T(2022, iSP),
    'Mudou Partido Vencedor': () => E.mudouPartidoMun(2026, iSP),
  };
  for (const [medida, mcp] of Object.entries(sp)) if (fm[medida]) add('Município (São Paulo, 2026 · 2º)', medida, 'São Paulo (SP)', mcp, fm[medida]());

  if (ref.verificacao_cega_2018_1_sul) {
    const ctxS = { turno: '2018-1', exterior: false, regiao: 'S' };
    const fx = { 'Municípios que Mudaram': E.MunicipiosQueMudaram, '% Municípios que Mudaram': E.PctMunicipiosQueMudaram, 'Municípios que Viraram': E.MunicipiosQueViraram, 'Vencedor': E.Vencedor, '% do Vencedor': E.PctDoVencedor, 'Margem de Vitória': E.MargemDeVitoria, '% Abstenção': E.PctAbstencao, 'PIB per capita': E.PIBperCapita };
    for (const [medida, mcp] of Object.entries(ref.verificacao_cega_2018_1_sul)) if (fx[medida]) add('Verificação cega (2018 · 1º, Sul)', medida, 'Região Sul · sem exterior', mcp, fx[medida](ctxS));
  }

  return cases.map((c) => {
    let diff = null, ok;
    if (typeof c.mcp === 'number' && typeof c.js === 'number') {
      diff = c.js - c.mcp;
      ok = Math.abs(diff) <= TOL_ABS * Math.max(1, Math.abs(c.mcp));
    } else ok = c.mcp === c.js;
    return { ...c, diff, status: ok ? 'VALIDADO' : 'DIVERGENTE' };
  });
}
