/**
 * Camada de dados: carrega os JSON processados (public/data) com cache e progresso.
 * Para atualizar os dados basta substituir public/data/* (ver docs/METODOLOGIA.md) — o frontend não muda.
 */
const BASE = `${import.meta.env.BASE_URL}data/`;
const cache = new Map();

async function getJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(BASE + path, { cache: 'force-cache' }).then((r) => {
    if (!r.ok) throw new Error(`Falha ao carregar ${path} (${r.status})`);
    return r.json();
  });
  cache.set(path, p);
  return p;
}

export async function loadAll(onProgress = () => {}) {
  onProgress(0.05, 'Carregando metadados…');
  const [meta, mun] = await Promise.all([getJSON('meta.json'), getJSON('municipios.json')]);
  onProgress(0.25, 'Carregando resultados por turno…');
  let done = 0;
  const total = meta.turnos.length;
  const pares = await Promise.all(meta.turnos.map(async (t) => {
    const d = await getJSON(`turnos/${t.chave}.json`);
    done++;
    onProgress(0.25 + 0.65 * (done / total), `Resultados ${t.rotulo}`);
    return [t.chave, d];
  }));
  return { meta, mun, turnos: Object.fromEntries(pares) };
}

export const loadManifest = () => getJSON('manifest.json');
