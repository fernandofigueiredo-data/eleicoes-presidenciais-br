/**
 * Dados institucionais do projeto: contato, endereços, aviso de natureza e formatos de citação.
 * Fonte única para a página "Sobre e contato", o rodapé, os testes e os documentos de divulgação.
 */
export const PROJETO = {
  nome: 'ELECTION INTELLIGENCE',
  subtitulo: 'Análise Eleitoral Brasileira',
  site: 'https://eleicoes-presidenciais-br.vercel.app/',
  siteCurto: 'eleicoes-presidenciais-br.vercel.app',
  repositorio: 'https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br',
  responsavel: 'Fernando Figueiredo',
  // Regra 11 do briefing: só o que consta do perfil público no GitHub.
  funcao: 'analista de dados com mais de 10 anos em comunicação, estratégia de conteúdo e storytelling',
  github: 'https://github.com/fernandofigueiredo-data',
  email: 'fernandofigueiredo123@gmail.com',
  assuntoEmail: 'Contato sobre o ELECTION INTELLIGENCE',
  ano: 2026,
};

export const mailto = (p = PROJETO) => `mailto:${p.email}?subject=${encodeURIComponent(p.assuntoEmail)}`;

/** Portais oficiais do TSE (endereços conferidos em 19/11/2026). */
export const TSE = {
  resultados: 'https://resultados.tse.jus.br/',
  dadosAbertos: 'https://dadosabertos.tse.jus.br/',
};

export const AVISO = 'O ELECTION INTELLIGENCE é um projeto independente de análise e visualização de dados. Não é fonte oficial do Tribunal Superior Eleitoral (TSE) nem do IBGE. Para resultados oficiais, consulte o TSE.';

/** Texto institucional de 100 palavras (Anexo A do briefing), conferido com o produto. */
export const O_QUE_E = 'O ELECTION INTELLIGENCE é um projeto independente de análise e visualização de dados eleitorais brasileiros. Reúne os resultados para presidente nos dois turnos de 2014, 2018, 2022 e 2026, em 5.571 municípios e 195 cidades do exterior, e os relaciona a população, alfabetização e PIB per capita do IBGE. Em oito páginas, permite ver vencedores por município, comparecimento e abstenção, mudanças entre eleições, viradas entre turnos e perfil socioeconômico, com filtros compartilháveis e exportação em CSV. Os totais foram conferidos com os do TSE. O código é aberto, sob licença MIT. O projeto não é fonte oficial do TSE.';

const MESES_ABNT = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
/** Data no padrão da ABNT (NBR 6023): "19 nov. 2026". */
export const dataAbnt = (d) => `${d.getDate()} ${MESES_ABNT[d.getMonth()]} ${d.getFullYear()}`;

/** Os três formatos de citação. `hoje` preenche o "Acesso em" da referência ABNT. */
export function citacoes(hoje = new Date(), p = PROJETO) {
  return [
    { id: 'fonte', titulo: 'Fonte em matéria ou gráfico', texto: `Fonte: TSE e IBGE. Elaboração: ${p.nome} (${p.site}).` },
    { id: 'abnt', titulo: 'Referência (ABNT)', texto: `FIGUEIREDO, Fernando. ${p.nome}: ${p.subtitulo.toLowerCase()}. [S. l.], ${p.ano}. Disponível em: ${p.site}. Acesso em: ${dataAbnt(hoje)}.` },
    { id: 'curta', titulo: 'Formato curto (texto corrido ou rede social)', texto: `Dados do TSE e do IBGE, via ${p.nome} (${p.siteCurto}).` },
  ];
}

/**
 * Medição de acessos. Desligada até Fernando escolher a ferramenta (ver 13_COMO_LER_OS_RESULTADOS.md).
 * Quando ligada, a página de privacidade troca de texto automaticamente.
 */
export const MEDICAO = { ativa: false, ferramenta: 'Vercel Web Analytics', script: '/_vercel/insights/script.js' };

export function textoPrivacidade(m = MEDICAO) {
  if (!m.ativa) {
    return [
      'Este site não usa cookies, não guarda nada no seu navegador e, no momento, não mede acessos.',
      'Os filtros que você escolhe ficam só no endereço (URL) da página, para que o link possa ser compartilhado.',
      'O site é hospedado na Vercel, que, como qualquer serviço de hospedagem, processa as requisições para entregar as páginas.',
    ];
  }
  return [
    `Este site conta visitas com o ${m.ferramenta}, sem cookies e sem guardar nada no seu navegador.`,
    'Cada visita registra: a página aberta, o site de onde veio o link, o parâmetro utm_source do link (quando houver, para saber de qual divulgação veio o acesso), o país, o tipo de dispositivo, o navegador e o sistema operacional.',
    'Não registramos endereço IP, nome, e-mail ou qualquer dado que identifique você. A ferramenta usa um identificador anônimo, que é descartado em até 24 horas. Os filtros que você escolhe não são registrados.',
  ];
}
