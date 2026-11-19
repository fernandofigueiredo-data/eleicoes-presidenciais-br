// Números citados no FAQ, no press kit, no vídeo e nas imagens de divulgação, recalculados a partir da base do site.
// Se os dados mudarem, estes testes falham: revise docs/divulgacao-election-intelligence/ (09_FAQ, 12_VERIFICACAO_MIDIA).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createEngine } from '../src/services/engine.js';
import { classificarViradas, contarViradas, linhasCsvViradas } from '../src/services/viradas.js';
import { FAQ_VIRADAS } from '../src/content/faq.js';

const root = join(import.meta.dirname, '..');
const repo = join(root, '..');
const j = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
let E, rows, c;
const LULA = new Set(['2026-13']);

beforeAll(() => {
  const meta = j('public/data/meta.json');
  const mun = j('public/data/municipios.json');
  const turnos = Object.fromEntries(meta.turnos.map((t) => [t.chave, j(`public/data/turnos/${t.chave}.json`)]));
  E = createEngine({ meta, mun, turnos });
  rows = classificarViradas(E, 2026);
  c = contarViradas(rows);
});

describe('Viradas de 2026: três critérios (nota do FAQ)', () => {
  it('compara os 5.571 municípios do Brasil (sem exterior)', () => {
    expect(c.municipios).toBe(5571);
  });
  it('regra do DAX (site): 215, com o empate contando para os dois lados', () => {
    expect(c.dax).toBe(215);
    expect(c.dax).toBe(E.MunicipiosQueViraram({ turno: '2026-2', exterior: false }));
    expect(c.daxPorVencedor2).toEqual({ Lula: 213, 'Flavio Bolsonaro': 1, 'Flavio Bolsonaro / Lula': 1 });
  });
  it('contagem estrita (sem empate em nenhum turno): 212, sendo 211 para Lula e 1 para Flavio Bolsonaro', () => {
    expect(c.estrita).toBe(212);
    expect(c.estritaPorVencedor2).toEqual({ Lula: 211, 'Flavio Bolsonaro': 1 });
  });
  it('regra do banco SQL (desempate pelo número do candidato): 213, sendo 212 para Lula e 1 para Flavio Bolsonaro', () => {
    expect(c.sql).toBe(213);
    expect(c.sqlPorVencedor2).toEqual({ Lula: 212, 'Flavio Bolsonaro': 1 });
  });
  it('os 3 municípios com empate explicam a diferença entre 212 e 215', () => {
    const empates = c.comEmpate.map((r) => `${r.nome} (${r.uf}) ${r.ibge} ${r.empate1 ? '1T' : '2T'}`).sort();
    expect(empates).toEqual(['Crixás do Tocantins (TO) 1706258 1T', 'Marquinho (PR) 4115457 2T', 'Trabiju (SP) 3554755 1T']);
    expect(c.empates2).toBe(1);
    expect(c.dax - c.estrita).toBe(c.comEmpate.length);
  });
  it('a única virada de Flavio Bolsonaro é Uirapuru (GO)', () => {
    const f = rows.filter((r) => r.estrita && r.v2 === 'Flavio Bolsonaro');
    expect(f.map((r) => [r.nome, r.uf, r.ibge])).toEqual([['Uirapuru', 'GO', 5221577]]);
  });
  it('o texto do FAQ usa as contagens recalculadas', () => {
    expect(FAQ_VIRADAS.contagens).toEqual({ dax: c.dax, estrita: c.estrita, estritaLula: 211, estritaFlavio: 1, sql: c.sql, sqlLula: 212, daxLula: 213, empates: 3 });
  });
  it('o CSV de critérios versionado bate com as contagens', () => {
    const csv = readFileSync(join(repo, 'docs/divulgacao-election-intelligence/viradas_criterios.csv'), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
    const head = csv[0].split(';');
    const lin = csv.slice(1).map((l) => Object.fromEntries(l.split(';').map((v, i) => [head[i], v])));
    expect(lin).toHaveLength(linhasCsvViradas(rows, 2026).length);
    expect(lin.filter((r) => r.contagem_estrita === 'sim')).toHaveLength(212);
    expect(lin.filter((r) => r.regra_dax === 'sim')).toHaveLength(215);
    expect(lin.filter((r) => r.regra_sql === 'sim')).toHaveLength(213);
    expect(lin.filter((r) => r.empate === 'sim')).toHaveLength(3);
  });
});

describe('Números do roteiro do vídeo e das imagens', () => {
  it('2º turno de 2026: 2.875 municípios para Lula, 2.695 para Flavio Bolsonaro e 1 empate (2.876 e 2.696 com o empate para os dois)', () => {
    const res = E.resumoMunicipios('2026-2');
    const n = { Lula: 0, 'Flavio Bolsonaro': 0, empate: 0 };
    for (let i = 0; i < E.N; i++) if (!E.mun.exterior[i] && res[i]?.vencedor) n[res[i].chaves.length > 1 ? 'empate' : res[i].vencedor]++;
    expect(n).toEqual({ Lula: 2875, 'Flavio Bolsonaro': 2695, empate: 1 });
    expect(E.MunicipiosVencidos({ turno: '2026-2', exterior: false, cand: { chaves: LULA } })).toBe(2876);
    expect(E.MunicipiosVencidos({ turno: '2026-2', exterior: false, cand: { chaves: new Set(['2026-22']) } })).toBe(2696);
  });
  it('Minas Gerais: 76 dos 853 municípios trocaram de vencedor, todos de Flavio Bolsonaro para Lula', () => {
    const mg = rows.filter((r) => r.uf === 'MG');
    expect(mg).toHaveLength(853);
    expect(mg.filter((r) => r.estrita)).toHaveLength(76);
    expect(mg.filter((r) => r.dax)).toHaveLength(76);
    expect(new Set(mg.filter((r) => r.dax).map((r) => `${r.v1}>${r.v2}`))).toEqual(new Set(['Flavio Bolsonaro>Lula']));
  });
  it('os 5 maiores (por eleitores aptos) que viraram em Minas ficam na Grande BH', () => {
    const top = rows.filter((r) => r.uf === 'MG' && r.dax).map((r) => ({ nome: r.nome, aptos: E.turnos['2026-2'].comp.aptos[E.idxByTse.get(r.tse)] })).sort((a, b) => b.aptos - a.aptos).slice(0, 5).map((r) => r.nome);
    expect(top).toEqual(['Ribeirão das Neves', 'Santa Luzia', 'Ibirité', 'Sabará', 'Nova Lima']);
  });
  it('abstenção no 2º turno de 2026: menor no Ceará (13,89%) e maior no Acre (26,08%)', () => {
    const ab = E.meta.ufs.filter((u) => u.sigla !== 'ZZ').map((u) => [u.sigla, E.PctAbstencao({ turno: '2026-2', uf: u.sigla })]).sort((a, b) => a[1] - b[1]);
    expect(ab[0][0]).toBe('CE');
    expect((ab[0][1] * 100).toFixed(2)).toBe('13.89');
    expect(ab.at(-1)[0]).toBe('AC');
    expect((ab.at(-1)[1] * 100).toFixed(2)).toBe('26.08');
  });
  it('Lula tem 73,9% no quartil de menor PIB per capita e 44,1% no de maior', () => {
    const pctQ = (q) => {
      const set = new Set();
      for (let i = 0; i < E.N; i++) if (E.mun.qPib[i] === q) set.add(i);
      return (E.PctVotosValidos({ turno: '2026-2', munSet: set, cand: { chaves: LULA } }) * 100).toFixed(1);
    };
    expect(pctQ('1º quartil (menor PIB)')).toBe('73.9');
    expect(pctQ('4º quartil (maior PIB)')).toBe('44.1');
  });
  it('resultado nacional: 47,03% de Flavio Bolsonaro no 1º turno e 51,79% de Lula no 2º', () => {
    expect((E.PctVotosValidos({ turno: '2026-1', cand: { chaves: new Set(['2026-22']) } }) * 100).toFixed(2)).toBe('47.03');
    expect((E.PctVotosValidos({ turno: '2026-2', cand: { chaves: LULA } }) * 100).toFixed(2)).toBe('51.79');
  });
});

describe('Documentos de divulgação espelhados', () => {
  it('09_FAQ.md está igual ao FAQ do site (rode npm run docs:divulgacao)', async () => {
    const { faqMarkdown } = await import('../scripts/gerar_docs_divulgacao.mjs');
    expect(readFileSync(join(repo, 'docs/divulgacao-election-intelligence/09_FAQ.md'), 'utf8')).toBe(faqMarkdown());
  });
  it('links_uf.csv tem as 27 UFs, gerado da base', () => {
    const csv = readFileSync(join(repo, 'docs/divulgacao-election-intelligence/links_uf.csv'), 'utf8').trim().split(/\r?\n/);
    expect(csv).toHaveLength(28);
  });
});

describe('Medição de acessos (Google Analytics 4)', () => {
  it('envia só a rota e os utm_* do link, sem filtros nem outros parâmetros', async () => {
    const { urlMedida } = await import('../src/services/medicao.js');
    expect(urlMedida('https://eleicoes-presidenciais-br.vercel.app/?utm_source=nicolau&utm_medium=substack&utm_campaign=lancamento-2026-11&utm_content=a1&fbclid=x#/turnos?uf=MG&m=123'))
      .toBe('https://eleicoes-presidenciais-br.vercel.app/turnos?utm_source=nicolau&utm_medium=substack&utm_campaign=lancamento-2026-11&utm_content=a1');
    expect(urlMedida('https://eleicoes-presidenciais-br.vercel.app/#/sobre?s=citar')).toBe('https://eleicoes-presidenciais-br.vercel.app/sobre');
    expect(urlMedida('https://eleicoes-presidenciais-br.vercel.app/?utm_source=a%40b.com#/nacional')).toBe('https://eleicoes-presidenciais-br.vercel.app/nacional');
  });
  it('sem ID válido do GA4, a medição fica desligada', async () => {
    const { idGa4, medicaoAtiva, avisoConsentimento } = await import('../src/services/medicao.js');
    expect(medicaoAtiva({})).toBe(false);
    expect(idGa4({ __EI_GA4_ID__: 'UA-123' })).toBe('');
    expect(idGa4({ __EI_GA4_ID__: 'G-ABC1234' })).toBe('G-ABC1234');
    expect(avisoConsentimento(null, {})).toBeNull();
  });
  it('o texto de privacidade muda com a medição ligada e descreve o que é enviado', async () => {
    const { textoPrivacidade } = await import('../src/content/projeto.js');
    expect(textoPrivacidade(false).join(' ')).toContain('não mede acessos');
    const t = textoPrivacidade(true).join(' ');
    for (const trecho of ['se você aceitar', 'Google Analytics 4', 'cookies', '13 meses', 'sem os filtros', 'parâmetros utm', 'endereço IP', 'Preferências de medição']) expect(t.toLowerCase()).toContain(trecho.toLowerCase());
  });
});

describe('Vídeo e imagens (T4): números e legendas', () => {
  it('todo número do roteiro, dos cartões e das imagens está na lista conferida na base', async () => {
    const { LEGENDAS, CARTOES, IMAGENS, FINAL } = await import('../scripts/midia/roteiro.mjs');
    const res = E.resumoMunicipios('2026-2');
    const venc = { Lula: 0, Flavio: 0, empate: 0 };
    for (let i = 0; i < E.N; i++) if (!E.mun.exterior[i] && res[i]?.vencedor) venc[res[i].chaves.length > 1 ? 'empate' : res[i].vencedor === 'Lula' ? 'Lula' : 'Flavio']++;
    const ab = (uf) => `${(E.PctAbstencao({ turno: '2026-2', uf }) * 100).toFixed(2).replace('.', ',')}%`;
    const fmt = (n) => n.toLocaleString('pt-BR');
    const mg = rows.filter((r) => r.uf === 'MG');
    // valores recalculados aqui; os da regressão (8,8 e 1,7) são recalculados no pytest tests/test_divulgacao.py
    const conferidos = new Set([fmt(venc.Lula), fmt(venc.Flavio), String(venc.empate), String(mg.filter((r) => r.estrita).length), fmt(mg.length),
      ab('CE'), ab('AC'), `${(E.PctAbstencao({ turno: '2026-2' }) * 100).toFixed(2).replace('.', ',')}%`, '73,9%', '44,1%', '8,8', '1,7', '−8,8', '−1,7']);
    expect([...conferidos].slice(0, 7)).toEqual(['2.875', '2.695', '1', '76', '853', '13,89%', '26,08%']);
    const textos = [...LEGENDAS.map((l) => l.texto), ...CARTOES.flatMap((c) => [c.titulo, ...c.linhas]), ...Object.values(IMAGENS).flatMap((t) => [t.titulo, t.linha, t.nota]), FINAL.aviso];
    const numeros = textos.flatMap((t) => t.match(/−?\d[\d.,]*\d%?|−?\d%?/g) || []).filter((n) => !/^20(14|18|22|26)$/.test(n));
    const ordinais = textos.join(' ').match(/\d[ºª]/g) || [];
    expect(ordinais.every((o) => ['1º', '2º'].includes(o))).toBe(true);
    const fora = numeros.filter((n) => !conferidos.has(n) && !['1', '2'].includes(n));
    expect(fora).toEqual([]);
  });
  it('legendas: dentro dos 75 s, sem sobreposição, e o .srt versionado está atualizado', async () => {
    const { LEGENDAS, CENAS, DURACAO, srt } = await import('../scripts/midia/roteiro.mjs');
    expect(CENAS.at(-1).fim).toBe(DURACAO);
    expect(CENAS.map((c) => [c.ini, c.fim])).toEqual([[0, 8], [8, 20], [20, 38], [38, 50], [50, 63], [63, 71], [71, 75]]);
    LEGENDAS.forEach((l, i) => {
      expect(l.ini).toBeGreaterThanOrEqual(0);
      expect(l.fim).toBeLessThanOrEqual(DURACAO);
      if (i) expect(l.ini).toBeGreaterThanOrEqual(LEGENDAS[i - 1].fim);
    });
    expect(readFileSync(join(repo, 'docs/divulgacao-election-intelligence/assets/video/legendas_pt-BR.srt'), 'utf8')).toBe(srt());
  });
});
