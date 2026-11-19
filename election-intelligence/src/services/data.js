/**
 * Camada de dados: carrega os JSON processados (public/data) sob demanda.
 * Para atualizar os dados basta substituir public/data/* (ver docs/METODOLOGIA.md) — o frontend não muda.
 *
 * A carga inicial traz só os metadados e os municípios. Os arquivos de turno são pedidos por
 * `garantir(chaves)` (as páginas dizem quais precisam, em services/requisitos.js) e o restante vem
 * em segundo plano por `carregarRestante()`. Os turnos entram no mesmo objeto que o motor recebe,
 * então o motor passa a enxergá-los assim que chegam.
 */
const BASE = `${import.meta.env.BASE_URL}data/`;
const cache = new Map();

async function getJSON(path) {
  if (cache.has(path)) return cache.get(path);
  // sem opção de cache: o pedido precisa casar com o <link rel="preload"> do index.html
  const p = fetch(BASE + path).then((r) => {
    if (!r.ok) throw new Error(`Falha ao carregar ${path} (${r.status})`);
    return r.json();
  });
  cache.set(path, p);
  p.catch(() => cache.delete(path)); // permite tentar de novo depois de uma falha de rede
  return p;
}

/** Metadados e municípios: o mínimo para criar o motor e o roteador. */
export async function loadBase(onProgress = () => {}) {
  onProgress(0.1, 'Carregando metadados…');
  const [meta, mun] = await Promise.all([getJSON('meta.json'), getJSON('municipios.json')]);
  onProgress(0.5, 'Carregando resultados…');
  return { meta, mun, turnos: {} };
}

/** Carregador dos arquivos de turno, ligado ao objeto `turnos` que o motor usa. */
export function criarCarregador(meta, turnos, onProgress = () => {}) {
  const todas = meta.turnos.map((t) => t.chave);
  const avisar = () => window.dispatchEvent(new CustomEvent('ei:dados', { detail: { carregados: Object.keys(turnos) } }));
  async function um(k) {
    if (turnos[k]) return;
    turnos[k] = await getJSON(`turnos/${k}.json`);
  }
  return {
    tem: (chaves) => chaves.every((k) => !!turnos[k]),
    todos: () => todas.every((k) => !!turnos[k]),
    async garantir(chaves) {
      const faltam = chaves.filter((k) => !turnos[k]);
      if (!faltam.length) return;
      let n = 0;
      await Promise.all(faltam.map((k) => um(k).then(() => onProgress(0.5 + 0.45 * (++n / faltam.length), 'Carregando resultados…'))));
      avisar();
    },
    /** Os turnos que faltam, um de cada vez, para não disputar a rede com o que o visitante pede. */
    async carregarRestante() {
      for (const k of todas) {
        if (turnos[k]) continue;
        try { await um(k); } catch { return; } // sem rede: tenta de novo quando uma página pedir
      }
      avisar();
    },
  };
}

export const loadManifest = () => getJSON('manifest.json');
