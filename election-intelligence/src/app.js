/**
 * Shell da aplicação: cabeçalho, abas, filtros, roteamento por hash e ciclo de vida das páginas.
 * Cada página é carregada sob demanda (code splitting do Vite).
 */
import { h, ICONS, emptyState } from './utils/dom.js';
import { createStore, PAGES } from './state/store.js';
import { filterBar } from './components/filters/filterBar.js';
import { searchPalette } from './components/filters/searchPalette.js';
import { toast } from './components/ui/ui.js';

const LOADERS = {
  nacional: () => import('./pages/nacional.js'),
  mapa: () => import('./pages/mapa.js'),
  participacao: () => import('./pages/participacao.js'),
  mudancas: () => import('./pages/mudancas.js'),
  turnos: () => import('./pages/turnos.js'),
  perfil: () => import('./pages/perfil.js'),
  comparar: () => import('./pages/comparar.js'),
  sobre: () => import('./pages/sobre.js'),
};

const LOGO = `<svg class="brand__mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#009C3B"/><path d="M20 6 35 20 20 34 5 20Z" fill="#E3B505"/><circle cx="20" cy="20" r="7.5" fill="#002776"/><path d="M13 19.2c4.4-1.6 9.6-1.3 14 .9" stroke="#fff" stroke-width="1.6" fill="none"/></svg>`;

export function createApp(E, rootEl) {
  const store = createStore(E, { turno: '2026-2', regiao: null, uf: null, mun: null, cand: null, partido: null, modo: 'vencedor', cmpC: [], cmpT: [] });

  rootEl.innerHTML = '';
  const header = h(`<header class="app-header">
    <div class="app-header__bar">
      <a class="brand" href="#/nacional" aria-label="ELECTION INTELLIGENCE — início">${LOGO}<span class="brand__text"><span class="brand__name">ELECTION INTELLIGENCE</span><span class="brand__sub">Análise Eleitoral Brasileira · Presidente 2014–2026</span></span></a>
      <div class="header-actions">
        <button class="header-btn" type="button" data-act="search" aria-label="Buscar (Ctrl+K)">${ICONS.search}<span class="label">Buscar</span><kbd>Ctrl K</kbd></button>
        <button class="header-btn" type="button" data-act="share" aria-label="Copiar link com os filtros atuais">${ICONS.link}<span class="label">Compartilhar</span></button>
      </div>
    </div>
    <nav class="tabs" aria-label="Páginas"><div class="tabs__inner">${PAGES.map((p) => `<a class="tab" data-page="${p.id}" href="#/${p.id}">${p.label}</a>`).join('')}</div></nav>
  </header>`);
  const main = h('<main id="conteudo" tabindex="-1"></main>');
  const footer = h(`<footer class="app-footer"><div class="app-footer__inner">
    <span><strong>ELECTION INTELLIGENCE</strong> · dados do TSE (CC-BY) e do IBGE, reconstruídos do relatório Power BI do projeto. Site independente do Power BI.</span>
    <span class="footer-links"><a href="#/sobre">Fontes, metodologia e conferência</a><a href="https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br" target="_blank" rel="noopener">Código e documentação no GitHub</a></span></div></footer>`);
  rootEl.append(h('<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>'), header, filterBar(E, store), main, footer);

  const palette = searchPalette(E, store);
  header.querySelector('[data-act=search]').addEventListener('click', () => palette.open());
  header.querySelector('[data-act=share]').addEventListener('click', async () => {
    const url = store.shareUrl();
    try { await navigator.clipboard.writeText(url); toast('Link copiado com os filtros atuais'); }
    catch { window.prompt('Copie o link:', url); }
  });
  // links internos preservam filtros
  header.querySelector('.tabs').addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-page]');
    if (!a) return;
    ev.preventDefault();
    store.set({ page: a.dataset.page }, { push: true });
  });
  rootEl.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href^="#/"]');
    if (!a || a.closest('.tabs')) return;
    ev.preventDefault();
    const page = a.getAttribute('href').slice(2).split('?')[0];
    store.set({ page }, { push: true });
  });

  let current = null, currentId = null, token = 0, navigated = false;
  async function showPage(s) {
    const my = ++token;
    header.querySelectorAll('[data-page]').forEach((a) => {
      a.href = store.hrefFor(a.dataset.page);
      if (a.dataset.page === s.page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (currentId === s.page && current) { current.update(s); return; }
    current?.destroy?.();
    current = null; currentId = s.page;
    main.innerHTML = '<div class="skeleton" style="height:420px"></div>';
    try {
      const mod = await LOADERS[s.page]();
      if (my !== token) return;
      main.innerHTML = '';
      current = mod.mount(main, { E, store });
      current.update(store.get());
      document.title = `${PAGES.find((p) => p.id === s.page).label} · ELECTION INTELLIGENCE`;
      // navegação entre páginas: leva o foco ao conteúdo (leitores de tela anunciam a página nova)
      if (navigated) main.focus({ preventScroll: true });
      navigated = true;
      header.querySelector(`[data-page="${s.page}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch (err) {
      console.error(err);
      main.innerHTML = emptyState('Não foi possível abrir esta página.', 'A conexão pode ter caído no meio do carregamento.', { act: 'retry-page', label: 'Tentar de novo' });
      main.querySelector('[data-act=retry-page]').addEventListener('click', () => { currentId = null; showPage(store.get()); });
    }
  }

  let pending = 0;
  store.subscribe((s, prev) => {
    if (s.page !== prev?.page) { window.scrollTo({ top: 0 }); showPage(s); return; }
    // agrupa mudanças de filtro em sequência; setTimeout (e não rAF) para funcionar também em abas ocultas
    clearTimeout(pending);
    pending = setTimeout(() => showPage(store.get()), 0);
  });
  window.addEventListener('popstate', () => store.syncFromUrl());
  window.addEventListener('hashchange', () => store.syncFromUrl());
  store.syncFromUrl();
  return { store };
}
