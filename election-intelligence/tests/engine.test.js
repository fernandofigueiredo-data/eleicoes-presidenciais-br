// Testes do motor de medidas: comparação com o PBIX-MCP, integridade e semântica DAX.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createEngine } from '../src/services/engine.js';
import { buildCases } from '../src/services/validation.js';

const root = join(import.meta.dirname, '..');
const j = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
let E, ref, manifest;

beforeAll(() => {
  const meta = j('public/data/meta.json');
  const mun = j('public/data/municipios.json');
  const turnos = Object.fromEntries(meta.turnos.map((t) => [t.chave, j(`public/data/turnos/${t.chave}.json`)]));
  E = createEngine({ meta, mun, turnos });
  ref = j('data/metadata/referencia_mcp.json');
  manifest = j('public/data/manifest.json');
});

describe('Comparação com o PBIX-MCP', () => {
  it('todos os indicadores de referência batem', () => {
    const cases = buildCases(E, ref);
    const bad = cases.filter((c) => c.status !== 'VALIDADO');
    expect(cases.length).toBeGreaterThan(300);
    expect(bad).toEqual([]);
  });
});

describe('Integridade dos dados', () => {
  it('mantém o número de linhas do PBIX', () => {
    expect(manifest.linhas_origem).toEqual({ dTurno: 8, dCandidato: 47, dMunicipio: 5766, fComparecimento: 45834, fVotos: 309308, PartidoCores: 27 });
    expect(E.N).toBe(5766);
  });
  it('a soma dos candidatos é igual aos votos válidos em todos os turnos', () => {
    for (const t of E.meta.turnos) expect(E.VotosTodosCandidatos({ turno: t.chave })).toBe(E.VotosValidos({ turno: t.chave }));
  });
  it('somas de controle do pipeline batem com o motor', () => {
    for (const [t, c] of Object.entries(manifest.controle_por_turno)) {
      expect(E.Comparecimento({ turno: t })).toBe(c.comparecimento);
      expect(E.Votos({ turno: t })).toBe(c.qt_votos_nominais);
    }
  });
  it('5.571 municípios no Brasil e 195 no exterior', () => {
    expect(E.Municipios({})).toBe(5571);
    expect(E.mun.exterior.filter(Boolean).length).toBe(195);
  });
});

describe('Indicadores por estado e por município', () => {
  it('soma das UFs + exterior = Brasil', () => {
    const tk = '2026-2';
    let s = 0;
    for (const u of E.meta.ufs) s += E.Aptos({ turno: tk, uf: u.sigla }) ?? 0;
    expect(s).toBe(E.Aptos({ turno: tk }));
  });
  it('vencedor do município é o mais votado', () => {
    const i = E.idxByTse.get(71072);
    const r = E.resumoMunicipios('2026-2')[i];
    expect(r.vencedor).toBe('Lula');
    expect(r.max).toBe(Math.max(...Object.values(E.turnos['2026-2'].votos).map((v) => v[i] ?? 0)));
  });
  it('filtro de região restringe as UFs', () => {
    const ne = E.selection({ regiao: 'NE' });
    expect(new Set(ne.map((i) => E.mun.uf[i]))).toEqual(new Set(['MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA']));
  });
});

describe('Semântica DAX', () => {
  it('DIVIDE devolve vazio quando o denominador é zero ou vazio', () => {
    expect(E.PctAbstencao({ turno: '2026-2', uf: 'ZZ', mun: 99999999 })).toBeNull();
  });
  it('2014 não tem eleição anterior (BLANK)', () => {
    expect(E.PctAbstencaoEleicaoAnterior({ turno: '2014-1' })).toBeNull();
    expect(E.VariacaoAbstencaoPP({ turno: '2014-1' })).toBeNull();
    expect(E.MunicipiosQueMudaram({ turno: '2014-2', exterior: false })).toBeNull();
  });
  it('PSL de 2018 e PL contam como o mesmo campo', () => {
    // em 2022, municípios que votaram Bolsonaro nas duas eleições não contam como mudança
    let n = 0;
    for (let i = 0; i < E.N; i++) {
      if (E.partidoVencedor1T(2018, i) === 'PSL' && E.partidoVencedor1T(2022, i) === 'PL') { n++; expect(E.mudouPartidoMun(2022, i)).toBe(0); }
    }
    expect(n).toBeGreaterThan(1000);
  });
  it('variação p.p. do PL em 2022 usa o resultado do PSL em 2018', () => {
    const ctx = { turno: '2022-1', cand: { partidos: new Set(['PL']) } };
    const psl = E.PctVotosValidos({ turno: '2018-1', cand: { partidos: new Set(['PSL']) } });
    expect(E.PctVotosValidosEleicaoAnterior(ctx)).toBeCloseTo(psl, 12);
  });
  it('empate conta para os dois candidatos em Municípios Vencidos', () => {
    const ctx = { turno: '2026-2', exterior: false };
    const a = E.MunicipiosVencidos({ ...ctx, cand: { chaves: new Set(['2026-13']) } });
    const b = E.MunicipiosVencidos({ ...ctx, cand: { chaves: new Set(['2026-22']) } });
    expect(a + b).toBe(5572); // 5.571 municípios + 1 empate
  });
});
