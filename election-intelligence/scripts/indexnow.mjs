/**
 * Avisa o IndexNow (Bing, Yandex, Naver, Seznam e outros; o Google não participa) de que as páginas
 * do site mudaram. O Bing alimenta a busca do ChatGPT e do Copilot.
 *
 * Uso, depois que a mudança estiver no ar: `npm run indexnow`
 * (`npm run indexnow -- --teste` só mostra o que seria enviado).
 *
 * A chave é o arquivo public/<32 caracteres hex>.txt, publicado na raiz do site: é por ele que o
 * IndexNow confirma que o pedido vem do dono do domínio. Não é segredo.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from '../src/state/store.js';
import { urlCanonica } from '../src/services/seo.js';
import { PROJETO } from '../src/content/projeto.js';

const publico = join(import.meta.dirname, '..', 'public');
const arquivo = readdirSync(publico).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!arquivo) throw new Error('Arquivo de chave do IndexNow não encontrado em public/.');
const key = readFileSync(join(publico, arquivo), 'utf8').trim();
if (`${key}.txt` !== arquivo) throw new Error(`${arquivo} deve conter só a própria chave.`);

const host = new URL(PROJETO.site).host;
const corpo = { host, key, keyLocation: `${PROJETO.site}${arquivo}`, urlList: PAGES.map((p) => urlCanonica(p.id)) };

if (process.argv.includes('--teste')) {
  console.log(JSON.stringify(corpo, null, 2));
  process.exit(0);
}

// a chave precisa estar no ar antes do envio, senão o IndexNow recusa (403)
const noAr = await fetch(corpo.keyLocation);
if (!noAr.ok || (await noAr.text()).trim() !== key) throw new Error(`A chave não está no ar em ${corpo.keyLocation}: publique antes de enviar.`);

const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(corpo),
});
// 200: aceito; 202: aceito, chave ainda em validação; 4xx: recusado
console.log(`IndexNow: HTTP ${r.status} para ${corpo.urlList.length} URLs`);
if (r.status >= 400) {
  console.error(await r.text());
  process.exit(1);
}
