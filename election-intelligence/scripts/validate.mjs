#!/usr/bin/env node
// Compara os indicadores calculados pelo motor JavaScript com os valores avaliados no PBIX pelo PBIX-MCP.
// Saída: docs/validacao_resultados.json e tabela no terminal. Código de saída 1 se houver divergência.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../src/services/engine.js';
import { buildCases } from '../src/services/validation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const j = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
export function loadEngine() {
  const meta = j('public/data/meta.json');
  const mun = j('public/data/municipios.json');
  const turnos = Object.fromEntries(meta.turnos.map((t) => [t.chave, j(`public/data/turnos/${t.chave}.json`)]));
  return createEngine({ meta, mun, turnos });
}

const E = loadEngine();
const ref = j('data/metadata/referencia_mcp.json');
const cases = buildCases(E, ref);
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs/validacao_resultados.json'), JSON.stringify({ gerado_em: new Date().toISOString(), total: cases.length, divergentes: cases.filter((c) => c.status !== 'VALIDADO').length, casos: cases }, null, 1));
const bad = cases.filter((c) => c.status !== 'VALIDADO');
for (const c of bad) console.log('DIVERGENTE', c.grupo, '|', c.medida, '|', c.contexto, '| MCP=', c.mcp, '| JS=', c.js);
console.log(`${cases.length - bad.length}/${cases.length} indicadores validados contra o PBIX-MCP.`);
process.exit(bad.length ? 1 : 0);
