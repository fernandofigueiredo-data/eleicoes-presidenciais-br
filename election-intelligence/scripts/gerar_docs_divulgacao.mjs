#!/usr/bin/env node
// Gera, a partir da base do site, os arquivos de divulgação que dependem dos dados:
//   docs/divulgacao-election-intelligence/viradas_criterios.csv  (e cópia em public/data/ para download no FAQ)
//   docs/divulgacao-election-intelligence/09_FAQ.md              (espelho de src/content/faq.js)
//   docs/divulgacao-election-intelligence/links_uf.csv e links_uf.md (27 links por UF, com o resultado do teste)
// O resultado dos testes por UF vem de test-status/links-uf/*.json, gravado por tests/e2e/links-uf.spec.js.
// Uso: npm run docs:divulgacao   (rode de novo depois de npx playwright test tests/e2e/links-uf.spec.js)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../src/services/engine.js';
import { classificarViradas, linhasCsvViradas, COLUNAS_CSV_VIRADAS } from '../src/services/viradas.js';
import { linksUf } from '../src/services/links.js';
import { FAQ } from '../src/content/faq.js';
import { PROJETO } from '../src/content/projeto.js';
import { toCSV } from '../src/utils/csv.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, '..', 'docs', 'divulgacao-election-intelligence');
mkdirSync(docs, { recursive: true });
const j = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

export function carregarMotor() {
  const meta = j('public/data/meta.json');
  const mun = j('public/data/municipios.json');
  const turnos = Object.fromEntries(meta.turnos.map((t) => [t.chave, j(`public/data/turnos/${t.chave}.json`)]));
  return createEngine({ meta, mun, turnos });
}

/** HTML simples dos textos do FAQ para Markdown. */
export const htmlParaMd = (s) => s
  .replace(/<a href="([^"]+)">(.*?)<\/a>/g, '[$2]($1)')
  .replace(/<\/?strong>/g, '**').replace(/<\/?em>/g, '*').replace(/<\/?code>/g, '`');

export function faqMarkdown() {
  const out = ['# 09. Perguntas frequentes (FAQ)', '',
    'Espelho da seção "Perguntas frequentes" da página Sobre e contato do site',
    `(${PROJETO.site}sobre?s=faq). Gerado por \`npm run docs:divulgacao\` a partir de`,
    '`election-intelligence/src/content/faq.js`: edite lá, não aqui. As contagens de viradas são',
    'recalculadas pelo teste `election-intelligence/tests/divulgacao.test.js`.', ''];
  for (const q of FAQ) {
    out.push(`## ${q.pergunta}`, '');
    for (const p of q.texto) out.push(htmlParaMd(p), '');
    if (q.tabela) {
      out.push(`| ${q.tabela.colunas.join(' | ')} |`, `|${q.tabela.colunas.map(() => '---').join('|')}|`);
      for (const l of q.tabela.linhas) out.push(`| ${l.join(' | ')} |`);
      out.push('');
    }
    for (const p of q.depois || []) out.push(htmlParaMd(p), '');
  }
  return out.join('\n');
}

function statusUf() {
  const dir = join(root, 'test-status', 'links-uf');
  const m = new Map();
  if (!existsSync(dir)) return m;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const r = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const cur = m.get(r.uf) || {};
    cur[r.largura] = r;
    m.set(r.uf, cur);
  }
  return m;
}

export function gerar() {
  const E = carregarMotor();
  // 1. viradas_criterios.csv
  const linhas = linhasCsvViradas(classificarViradas(E, 2026), 2026);
  const csv = toCSV(COLUNAS_CSV_VIRADAS.map((k) => ({ label: k, key: k })), linhas);
  writeFileSync(join(docs, 'viradas_criterios.csv'), csv);
  writeFileSync(join(root, 'public', 'data', 'viradas_criterios.csv'), csv);
  // 2. FAQ
  writeFileSync(join(docs, '09_FAQ.md'), faqMarkdown());
  // 3. links por UF
  const st = statusUf();
  const ufs = linksUf(E).map((u) => {
    const s = st.get(u.uf) || {};
    const res = (k) => (s[k] ? (s[k].ok ? 'ok' : 'falha') : 'não testado');
    const obs = ['1440', '390'].map((k) => s[k]?.obs).filter(Boolean).join(' / ');
    const ok = res('1440') === 'ok' && res('390') === 'ok';
    return { ...u, teste_1440: res('1440'), teste_390: res('390'), resultado: ok ? 'ok' : res('1440') === 'não testado' ? 'não testado' : 'falha', observacao: obs };
  });
  const cols = [
    { label: 'uf', key: 'uf' }, { label: 'estado', key: 'nome' }, { label: 'url', key: 'url' }, { label: 'municipios', key: 'municipios' },
    { label: 'viradas_lula_estrita', key: 'lula' }, { label: 'viradas_flavio_estrita', key: 'flavio' }, { label: 'viradas_regra_dax', key: 'dax' },
    { label: 'teste_1440px', key: 'teste_1440' }, { label: 'teste_390px', key: 'teste_390' }, { label: 'resultado', key: 'resultado' }, { label: 'observacao', key: 'observacao' },
  ];
  writeFileSync(join(docs, 'links_uf.csv'), toCSV(cols, ufs));
  const ok = ufs.filter((u) => u.resultado === 'ok').length;
  const md = ['# Links por UF (27)', '',
    `Gerado por \`npm run docs:divulgacao\` a partir da base do site. Resultado dos testes: **${ok} de ${ufs.length} ok**`,
    '(teste `election-intelligence/tests/e2e/links-uf.spec.js`, em 1440 px e 390 px, em contexto novo).', '',
    'Viradas pela contagem estrita (sem empates). "Regra DAX" é o número que o cartão da página mostra.',
    'Para medir a origem do acesso, use o link com UTM gerado por `tools/gerar_utm.py` (`utm_links.csv`), e não o link limpo.', '',
    '| UF | Estado | Link | Municípios | Viradas Lula | Viradas Flavio | Regra DAX | Teste |', '|---|---|---|---:|---:|---:|---:|---|',
    ...ufs.map((u) => `| ${u.uf} | ${u.nome} | ${u.url} | ${u.municipios} | ${u.lula} | ${u.flavio} | ${u.dax} | ${u.resultado} |`), ''];
  writeFileSync(join(docs, 'links_uf.md'), md.join('\n'));
  return { viradas: linhas.length, ufs: ufs.length, ufsOk: ok };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(gerar());
