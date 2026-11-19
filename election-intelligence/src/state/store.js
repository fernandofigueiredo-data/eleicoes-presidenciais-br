/**
 * Estado global da aplicação com sincronização na URL (/pagina?t=...&uf=...).
 * Cada página tem endereço próprio (/mapa, /turnos...), que os buscadores indexam; a Visão Nacional é a raiz.
 * Links antigos por hash (/#/turnos?uf=SP) continuam valendo: são convertidos para o endereço novo na carga.
 * Os filtros persistem ao trocar de página, como a segmentação de turno sincronizada do PBIX.
 */
export const PAGES = [
  { id: 'nacional', n: '01', label: 'Visão Nacional' },
  { id: 'mapa', n: '02', label: 'Mapa dos Vencedores' },
  { id: 'participacao', n: '03', label: 'Comparecimento e Abstenção' },
  { id: 'mudancas', n: '04', label: 'Mudanças entre Eleições' },
  { id: 'turnos', n: '05', label: '1º e 2º Turno' },
  { id: 'perfil', n: '06', label: 'Perfil Socioeconômico' },
  { id: 'comparar', n: '07', label: 'Comparar' },
  { id: 'sobre', n: '08', label: 'Sobre e contato' },
];

const KEYS = { turno: 't', regiao: 'r', uf: 'uf', mun: 'm', cand: 'c', partido: 'p', modo: 'modo', cmpC: 'cc', cmpT: 'ct', secao: 's' };

/** Seções da página Sobre e contato que aceitam link direto (/sobre?s=citar). */
export const SECOES_SOBRE = ['aviso', 'o-que-e', 'dados', 'citar', 'metodologia', 'faq', 'licencas', 'contato', 'privacidade', 'conferencia'];

/**
 * Prefixo do site: "/" na Vercel, "/eleicoes-presidenciais-br/" no GitHub Pages.
 * O build usa base relativa (./) e todos os HTML ficam na raiz de dist/, então o prefixo sai do endereço
 * dos scripts (dist/assets/*.js fica logo abaixo dele).
 */
function prefixo() {
  const b = import.meta.env?.BASE_URL || '/';
  if (b.startsWith('/')) return b;
  try {
    const u = new URL('../', import.meta.url);
    if (/^https?:$/.test(u.protocol)) return u.pathname;
  } catch { /* fora do navegador */ }
  return '/';
}
export const BASE = prefixo();

/** Caminho da página, sem filtros: a Visão Nacional fica na raiz. */
export const caminhoDe = (page, base = BASE) => (page === 'nacional' ? base : `${base}${page}`);

/**
 * Lê página e parâmetros de um endereço. Aceita o formato atual (/turnos?uf=SP) e o antigo por hash
 * (/?utm_source=x#/turnos?uf=SP); no antigo, os parâmetros antes e depois do # se somam.
 * Devolve null se o caminho não for uma página do site.
 */
export function lerEndereco(href, base = BASE) {
  const u = new URL(href, 'https://x.invalid');
  const q = new URLSearchParams(u.search);
  let page;
  const m = u.hash.match(/^#\/([^?]*)\??(.*)$/);
  if (m) {
    page = m[1] || 'nacional';
    for (const [k, v] of new URLSearchParams(m[2])) q.set(k, v);
  } else {
    let rest = u.pathname.startsWith(base) ? u.pathname.slice(base.length) : u.pathname === base.replace(/\/$/, '') ? '' : null;
    if (rest == null) return null;
    rest = rest.replace(/\/$/, '').replace(/\.html$/, '').replace(/^index$/, '');
    page = rest || 'nacional';
  }
  if (!PAGES.some((p) => p.id === page)) return null;
  return { page, q, legado: !!m };
}

/** Endereço sem parâmetros de campanha (utm_*), para que o link compartilhado não herde a origem de quem o recebeu. */
export function semUtm(href) {
  const [base, ...hash] = href.split('#');
  const u = new URL(base);
  for (const k of [...u.searchParams.keys()]) if (/^utm_/i.test(k)) u.searchParams.delete(k);
  return u.toString() + (hash.length ? '#' + hash.join('#') : '');
}

export function createStore(E, defaults) {
  const listeners = new Set();
  let state = { page: 'nacional', ...defaults };

  const validTurno = (t) => E.turnoByKey.has(t);
  const ufRegiao = (uf) => E.meta.ufs.find((u) => u.sigla === uf)?.regiao ?? null;

  /** Aplica regras de cascata e descarta valores inválidos. */
  function normalize(s, prev = state) {
    const n = { ...s };
    if (!PAGES.some((p) => p.id === n.page)) n.page = 'nacional';
    if (!validTurno(n.turno)) n.turno = defaults.turno;
    if (n.page !== 'sobre' || !SECOES_SOBRE.includes(n.secao)) n.secao = null;
    if (n.regiao && !E.meta.regioes[n.regiao]) n.regiao = null;
    if (n.uf && !E.meta.ufs.some((u) => u.sigla === n.uf)) n.uf = null;
    if (n.mun != null) {
      const i = E.idxByTse.get(Number(n.mun));
      if (i == null) n.mun = null;
      else {
        n.mun = Number(n.mun);
        // município escolhido define UF e região
        if (n.mun !== prev.mun || !n.uf) { n.uf = E.mun.uf[i]; n.regiao = ufRegiao(n.uf); }
      }
    }
    if (n.uf && n.regiao && ufRegiao(n.uf) !== n.regiao) {
      if (n.regiao !== prev.regiao) { n.uf = null; n.mun = null; } else n.regiao = ufRegiao(n.uf);
    }
    if (n.uf && !n.regiao) n.regiao = ufRegiao(n.uf);
    if (n.mun != null && n.uf && E.mun.uf[E.idxByTse.get(n.mun)] !== n.uf) n.mun = null;
    // candidato pertence a um ano: ao trocar de ano, tenta o mesmo nome; senão limpa
    if (n.cand) {
      const c = E.candByKey.get(n.cand);
      const ano = E.anoDe(n.turno);
      if (!c) n.cand = null;
      else if (c.ano !== ano) {
        const mesmo = E.meta.candidatos.find((x) => x.ano === ano && x.nome === c.nome);
        n.cand = mesmo ? mesmo.chave : null;
      }
    }
    if (n.partido && !E.meta.candidatos.some((c) => c.partido === n.partido)) n.partido = null;
    n.cmpC = (n.cmpC || []).filter((k) => E.candByKey.has(k) && E.candByKey.get(k).ano === E.anoDe(n.turno)).slice(0, 4);
    n.cmpT = (n.cmpT || []).filter(Boolean).slice(0, 4);
    return n;
  }

  function toUrl(s) {
    const q = new URLSearchParams();
    for (const [k, short] of Object.entries(KEYS)) {
      let v = s[k];
      if (Array.isArray(v)) v = v.join(',');
      if (v != null && v !== '' && !(k === 'turno' && v === defaults.turno) && !(k === 'modo' && v === defaults.modo)) q.set(short, v);
    }
    const qs = q.toString();
    return `${caminhoDe(s.page)}${qs ? '?' + qs : ''}`;
  }

  /** Os utm_* do link de chegada continuam no endereço ao navegar (a medição lê a origem dali). */
  function comUtm(url) {
    const utm = [...new URLSearchParams(location.search)].filter(([k]) => /^utm_/i.test(k));
    if (!utm.length) return url;
    const [caminho, qs] = url.split('?');
    return `${caminho}?${new URLSearchParams(utm).toString()}${qs ? '&' + qs : ''}`;
  }

  function fromLocation(href) {
    const r = lerEndereco(href);
    const s = { ...defaults, page: r?.page || 'nacional' };
    const q = r?.q || new URLSearchParams();
    for (const [k, short] of Object.entries(KEYS)) {
      if (!q.has(short)) continue;
      const v = q.get(short);
      if (k === 'cmpC' || k === 'cmpT') s[k] = v ? v.split(',') : [];
      else s[k] = v;
    }
    return s;
  }

  const atual = () => location.pathname + location.search + location.hash;
  function escrever(push) {
    const url = comUtm(toUrl(state));
    if (url !== atual()) history[push ? 'pushState' : 'replaceState'](null, '', url);
  }

  function emit(prev) { for (const fn of listeners) fn(state, prev); }

  return {
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set(patch, { push = false } = {}) {
      const prev = state;
      state = normalize({ ...state, ...patch }, prev);
      escrever(push);
      emit(prev);
    },
    /** Lê a URL atual (carga inicial e botão voltar). */
    syncFromUrl() {
      const prev = state;
      state = normalize(fromLocation(location.href), prev);
      escrever(false);
      emit(prev);
    },
    clearFilters() { this.set({ regiao: null, uf: null, mun: null, cand: null, partido: null }); },
    hrefFor(page, patch = {}) { return toUrl(normalize({ ...state, ...patch, page })); },
    shareUrl() { return semUtm(location.origin + toUrl(state)); },
  };
}
