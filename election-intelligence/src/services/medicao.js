/**
 * Medição de acessos (desligada por padrão: MEDICAO.ativa em src/content/projeto.js).
 *
 * Proposta: Vercel Web Analytics, que não usa cookies. No plano Hobby o painel de UTM não existe
 * e o painel "Pages" mostra o caminho sem a query string. Por isso, antes do envio, o endereço é
 * reescrito para levar a origem da campanha no caminho:
 *
 *   https://site/?utm_source=nicolau&utm_medium=substack&utm_campaign=lancamento-2026-11#/turnos?uf=MG
 *   -> https://site/campanha/nicolau/turnos?utm_source=nicolau&utm_medium=substack&utm_campaign=lancamento-2026-11
 *
 * Os filtros (uf, município, candidato) e qualquer outro parâmetro são descartados: só a rota e os
 * parâmetros utm_* chegam à ferramenta. Nada é gravado no navegador.
 */
import { MEDICAO } from '../content/projeto.js';

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
const LIMPO = /^[a-z0-9-]{1,40}$/;

/** Endereço reportado à ferramenta de medição. */
export function urlMedida(href) {
  const u = new URL(href);
  const rota = (u.hash.match(/^#\/([a-z]+)/) || [])[1] || 'nacional';
  const q = new URLSearchParams();
  for (const k of UTM) {
    const v = (u.searchParams.get(k) || '').toLowerCase();
    if (LIMPO.test(v)) q.set(k, v);
  }
  const fonte = q.get('utm_source');
  const caminho = fonte ? `/campanha/${fonte}/${rota}` : `/${rota}`;
  const qs = q.toString();
  return `${u.origin}${caminho}${qs ? `?${qs}` : ''}`;
}

/** Carrega o script da Vercel só se a medição estiver ligada e o site estiver na Vercel (não em localhost nem no GitHub Pages). */
export function iniciarMedicao(m = MEDICAO, doc = document, win = window) {
  if (!m.ativa || !/\.vercel\.app$/.test(win.location?.hostname || '')) return false;
  win.va = win.va || function va(...a) { (win.vaq = win.vaq || []).push(a); };
  win.va('beforeSend', (ev) => ({ ...ev, url: urlMedida(ev.url) }));
  const s = doc.createElement('script');
  s.defer = true;
  s.src = m.script || '/_vercel/insights/script.js';
  doc.head.appendChild(s);
  return true;
}
