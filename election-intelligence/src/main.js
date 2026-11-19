import '@fontsource-variable/ibm-plex-sans';
import '@fontsource-variable/source-serif-4';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import { loadAll } from './services/data.js';
import { createEngine } from './services/engine.js';
import { createApp } from './app.js';
import { avisoConsentimento, paginaVista } from './services/medicao.js';

const loader = document.getElementById('loader');
const bar = loader?.querySelector('.loader__bar span');
const msg = loader?.querySelector('.loader__msg');
const progress = (p, text) => { if (bar) bar.style.width = `${Math.round(p * 100)}%`; if (msg) msg.textContent = text; };

loadAll(progress)
  .then((data) => {
    progress(0.95, 'Preparando indicadores…');
    const E = createEngine(data);
    const app = createApp(E, document.getElementById('app'));
    window.__EI__ = { E, store: app.store }; // usado pelos testes de ponta a ponta
    window.addEventListener('ei:pagina', () => paginaVista());
    avisoConsentimento();
    progress(1, 'Pronto');
    loader?.classList.add('is-done');
    setTimeout(() => loader?.remove(), 400);
  })
  .catch((err) => {
    console.error(err);
    if (!msg) return;
    // Erro com saída: explica o que falhou e oferece nova tentativa.
    msg.textContent = 'Não foi possível carregar os dados. Verifique a conexão e tente de novo.';
    const retry = document.createElement('button');
    retry.className = 'btn';
    retry.type = 'button';
    retry.textContent = 'Tentar de novo';
    retry.addEventListener('click', () => location.reload());
    msg.after(retry);
    retry.focus();
  });
