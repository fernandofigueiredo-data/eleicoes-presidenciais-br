/**
 * Título, descrição e endereço canônico de cada página. Fonte única para:
 * - o HTML estático gerado no build (scripts/prerender.mjs), que é o que buscadores e robôs de IA leem;
 * - a troca de página no navegador (aplicarMetadados), para que título, descrição e canonical acompanhem a rota.
 * Os títulos usam as palavras que as pessoas buscam ("por município", "abstenção", "viradas entre turnos").
 */
import { PROJETO } from '../content/projeto.js';

export const MARCA = PROJETO.nome;

export const PAGINAS_SEO = {
  nacional: {
    titulo: 'Eleição para presidente por município, 2014 a 2026',
    descricao: 'Projeto independente e não oficial: como cada município votou para presidente em 2014, 2018, 2022 e 2026, com dados do TSE e do IBGE. Mapa, viradas entre turnos, abstenção e perfil socioeconômico.',
  },
  mapa: {
    titulo: 'Mapa da eleição para presidente por município',
    descricao: 'Mapa interativo de todos os municípios do Brasil com o vencedor da eleição para presidente em cada turno de 2014 a 2026, a % do candidato e a margem de vitória, por região, UF e município.',
  },
  participacao: {
    titulo: 'Comparecimento e abstenção por município e UF',
    descricao: 'Abstenção, comparecimento, votos brancos e nulos na eleição para presidente de 2014 a 2026, por região, UF e município, com ranking das UFs e relação com a alfabetização.',
  },
  mudancas: {
    titulo: 'Municípios que mudaram de partido vencedor entre eleições',
    descricao: 'Em quais municípios o partido vencedor da eleição para presidente mudou de uma eleição para a seguinte (2014 a 2026): mapa, transições entre partidos e variação por UF.',
  },
  turnos: {
    titulo: 'Viradas entre o 1º e o 2º turno por município',
    descricao: 'Municípios em que o vencedor do 1º turno perdeu o 2º turno da eleição para presidente, de 2014 a 2026: mapa, lista, viradas por UF e os critérios de contagem.',
  },
  perfil: {
    titulo: 'Voto para presidente por renda, alfabetização e porte do município',
    descricao: 'Como votaram os municípios por faixa de PIB per capita, de alfabetização e de população, na eleição para presidente de 2014 a 2026, com dados do IBGE.',
  },
  comparar: {
    titulo: 'Comparar candidatos e territórios na eleição para presidente',
    descricao: 'Compare lado a lado até quatro candidatos ou territórios (Brasil, regiões, UFs e municípios) na eleição para presidente de 2014 a 2026.',
  },
  sobre: {
    titulo: 'Sobre o projeto: dados, metodologia, como citar e contato',
    descricao: 'O que é o ELECTION INTELLIGENCE, de onde vêm os dados (TSE e IBGE), versão dos arquivos, metodologia, perguntas frequentes, como citar, licenças e contato.',
  },
};

/** Endereço público (canônico) da página, sem filtros. */
export const urlCanonica = (page, site = PROJETO.site) => (page === 'nacional' ? site : `${site}${page}`);

/** Título completo da aba e dos resultados de busca. */
export const tituloCompleto = (page) => `${PAGINAS_SEO[page].titulo} · ${MARCA}`;

function meta(doc, sel, attr, valor) {
  const el = doc.head.querySelector(sel);
  if (el) el.setAttribute(attr, valor);
}

/** Atualiza título, descrição, canonical e prévia de link ao trocar de página no navegador. */
export function aplicarMetadados(page, doc = document) {
  if (!PAGINAS_SEO[page]) return;
  const t = tituloCompleto(page), d = PAGINAS_SEO[page].descricao, u = urlCanonica(page);
  doc.title = t;
  meta(doc, 'meta[name="description"]', 'content', d);
  meta(doc, 'link[rel="canonical"]', 'href', u);
  meta(doc, 'meta[property="og:title"]', 'content', t);
  meta(doc, 'meta[property="og:description"]', 'content', d);
  meta(doc, 'meta[property="og:url"]', 'content', u);
}
