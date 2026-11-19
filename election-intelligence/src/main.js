import '@fontsource-variable/ibm-plex-sans';
import '@fontsource-variable/source-serif-4';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import { loadBase, criarCarregador } from './services/data.js';
import { createEngine } from './services/engine.js';
import { createApp } from './app.js';
import { avisoConsentimento, paginaVista } from './services/medicao.js';

const loader = document.getElementById('loader');
const bar = loader?.querySelector('.loader__bar span');
const msg = loader?.querySelector('.loader__msg');
const progress = (p, text) => { if (bar) bar.style.width = `${Math.round(p * 100)}%`; if (msg) msg.textContent = text; };

loadBase(progress)
  .then((data) => {
    const E = createEngine(data);
    const dados = criarCarregador(data.meta, data.turnos, progress);
    // a tela de carregamento sai quando a primeira página estiver montada com os dados dela
    window.addEventListener('ei:primeira', () => {
      progress(1, 'Pronto');
      loader?.classList.add('is-done');
      setTimeout(() => loader?.remove(), 400);
      avisoConsentimento();
    }, { once: true });
    window.addEventListener('ei:pagina', () => paginaVista());
    const app = createApp(E, document.getElementById('app'), dados);
    window.__EI__ = { E, store: app.store, dados }; // usado pelos testes de ponta a ponta
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
