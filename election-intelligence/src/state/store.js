/**
 * Estado global da aplicação com sincronização na URL (#/pagina?t=...&uf=...).
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
  { id: 'sobre', n: '08', label: 'Sobre os Dados' },
];

const KEYS = { turno: 't', regiao: 'r', uf: 'uf', mun: 'm', cand: 'c', partido: 'p', modo: 'modo', cmpC: 'cc', cmpT: 'ct' };

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

  function toHash(s) {
    const q = new URLSearchParams();
    for (const [k, short] of Object.entries(KEYS)) {
      let v = s[k];
      if (Array.isArray(v)) v = v.join(',');
      if (v != null && v !== '' && !(k === 'turno' && v === defaults.turno) && !(k === 'modo' && v === defaults.modo)) q.set(short, v);
    }
    const qs = q.toString();
    return `#/${s.page}${qs ? '?' + qs : ''}`;
  }

  function fromHash(hash) {
    const m = (hash || '').match(/^#\/([^?]*)\??(.*)$/);
    const s = { ...defaults, page: m?.[1] || 'nacional' };
    const q = new URLSearchParams(m?.[2] || '');
    for (const [k, short] of Object.entries(KEYS)) {
      if (!q.has(short)) continue;
      const v = q.get(short);
      if (k === 'cmpC' || k === 'cmpT') s[k] = v ? v.split(',') : [];
      else s[k] = v;
    }
    return s;
  }

  function emit(prev) { for (const fn of listeners) fn(state, prev); }

  return {
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set(patch, { push = false } = {}) {
      const prev = state;
      state = normalize({ ...state, ...patch }, prev);
      const hash = toHash(state);
      if (hash !== location.hash) history[push ? 'pushState' : 'replaceState'](null, '', hash);
      emit(prev);
    },
    /** Lê a URL atual (carga inicial e botão voltar). */
    syncFromUrl() {
      const prev = state;
      state = normalize(fromHash(location.hash), prev);
      const hash = toHash(state);
      if (hash !== location.hash) history.replaceState(null, '', hash);
      emit(prev);
    },
    clearFilters() { this.set({ regiao: null, uf: null, mun: null, cand: null, partido: null }); },
    hrefFor(page, patch = {}) { return toHash(normalize({ ...state, ...patch, page })); },
    shareUrl() { return location.href.split('#')[0] + toHash(state); },
  };
}
