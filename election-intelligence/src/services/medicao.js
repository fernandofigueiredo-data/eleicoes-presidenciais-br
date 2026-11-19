/**
 * Medição de acessos com o Google Analytics 4 (GA4), só depois do consentimento do visitante.
 *
 * - O ID da propriedade vem da variável de build VITE_GA4_ID (definida na Vercel). Sem ID, nada é
 *   carregado, não aparece aviso e a página de privacidade diz que o site não mede acessos.
 * - Modo básico de consentimento do Google: a tag (gtag.js) só é carregada depois que o visitante
 *   clica em "Aceitar". Quem recusa não envia nada ao Google.
 * - Só é enviada a rota (sem os filtros) e os parâmetros utm_* do link; Google signals e
 *   personalização de anúncios ficam desligados; o cookie dura no máximo 13 meses.
 * - A escolha do visitante fica só neste navegador (localStorage, chave CHAVE_CONSENTIMENTO).
 */
import { h } from '../utils/dom.js';
import { lerEndereco } from '../state/store.js';

export const CHAVE_CONSENTIMENTO = 'ei-consentimento-medicao';
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const LIMPO = /^[a-z0-9-]{1,40}$/;
const ID_VALIDO = /^G-[A-Z0-9]{4,20}$/;
const TREZE_MESES = 395 * 24 * 3600;

/** ID do GA4 configurado no build (ou, nos testes, injetado antes do carregamento). */
export function idGa4(win = window) {
  const id = (import.meta.env?.VITE_GA4_ID || win.__EI_GA4_ID__ || '').trim();
  return ID_VALIDO.test(id) ? id : '';
}
export const medicaoAtiva = (win = window) => !!idGa4(win);

/** Endereço enviado ao GA4: só a rota e os utm_* do link (sem filtros nem outros parâmetros). */
export function urlMedida(href) {
  const u = new URL(href);
  const rota = lerEndereco(href)?.page || 'nacional'; // endereço atual (/turnos) ou antigo (/#/turnos)
  const q = new URLSearchParams();
  for (const k of UTM) {
    const v = (u.searchParams.get(k) || '').toLowerCase();
    if (LIMPO.test(v)) q.set(k, v);
  }
  const qs = q.toString();
  return `${u.origin}/${rota}${qs ? `?${qs}` : ''}`;
}

function lerEscolha(win) {
  try { return win.localStorage.getItem(CHAVE_CONSENTIMENTO); } catch { return null; }
}
function gravarEscolha(win, v) {
  try { win.localStorage.setItem(CHAVE_CONSENTIMENTO, v); } catch { /* navegador sem armazenamento: vale só nesta visita */ }
}

/** Carrega o gtag.js e envia a primeira página vista. Só é chamado depois do aceite. */
function carregarGa4(id, doc, win) {
  if (win.__EI_GA4_CARREGADO__) return;
  win.__EI_GA4_CARREGADO__ = true;
  win.dataLayer = win.dataLayer || [];
  win.gtag = function gtag() { win.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
  win.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
  win.gtag('consent', 'update', { analytics_storage: 'granted' });
  win.gtag('js', new Date());
  win.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: TREZE_MESES });
  const s = doc.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  doc.head.appendChild(s);
  paginaVista(win);
}

/** Recusa depois de ter aceitado: para a coleta e apaga os cookies do Google Analytics deste site. */
function revogar(doc, win) {
  if (typeof win.gtag === 'function') win.gtag('consent', 'update', { analytics_storage: 'denied' });
  win.__EI_GA4_CARREGADO__ = false;
  const host = win.location.hostname;
  for (const c of (doc.cookie || '').split(';')) {
    const nome = c.split('=')[0].trim();
    if (!/^_ga/.test(nome)) continue;
    for (const dom of ['', `; domain=${host}`, `; domain=.${host}`]) doc.cookie = `${nome}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${dom}`;
  }
}

let ultima = null;
/** Registra uma página vista (na carga e a cada troca de rota), sem repetir a mesma rota em seguida. */
export function paginaVista(win = window) {
  if (!win.__EI_GA4_CARREGADO__ || typeof win.gtag !== 'function') return false;
  const loc = urlMedida(win.location.href);
  if (loc === ultima) return false;
  ultima = loc;
  win.gtag('event', 'page_view', { page_location: loc, page_title: win.document.title });
  return true;
}

/** Aviso de consentimento (só quando há ID e o visitante ainda não escolheu). */
export function avisoConsentimento(doc = document, win = window, { forcar = false } = {}) {
  const id = idGa4(win);
  if (!id) return null;
  const escolha = lerEscolha(win);
  if (escolha === 'aceito') carregarGa4(id, doc, win);
  if (escolha && !forcar) return null;
  doc.querySelector('.consent')?.remove();
  const el = h(`<section class="consent" role="region" aria-label="Medição de acessos">
    <p>Este site pode contar visitas com o <strong>Google Analytics</strong>, que grava cookies no seu navegador. Só contamos a página aberta e de onde veio o link; nada sobre os filtros que você usa. <a href="#/sobre?s=privacidade">Saiba mais</a>.</p>
    <div class="consent__acoes"><button class="btn btn--primary" type="button" data-consent="aceito">Aceitar</button><button class="btn" type="button" data-consent="recusado">Recusar</button></div>
  </section>`);
  el.addEventListener('click', (ev) => {
    const v = ev.target.closest('[data-consent]')?.dataset.consent;
    if (!v) return;
    gravarEscolha(win, v);
    el.remove();
    if (v === 'aceito') carregarGa4(id, doc, win);
    else revogar(doc, win);
  });
  doc.body.appendChild(el);
  return el;
}

/** Estado atual, para a página de privacidade. */
export const escolhaAtual = (win = window) => lerEscolha(win);
