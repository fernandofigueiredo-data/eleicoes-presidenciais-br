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
 * Texto de privacidade. `ativa`: há ID do Google Analytics configurado (src/services/medicao.js).
 * Descreve exatamente o que é medido; o teste da página Sobre confere os dois estados.
 */
export function textoPrivacidade(ativa = false) {
  if (!ativa) {
    return [
      'Este site não usa cookies, não guarda nada no seu navegador e, no momento, não mede acessos.',
      'Os filtros que você escolhe ficam só no endereço (URL) da página, para que o link possa ser compartilhado.',
      'O site é hospedado na Vercel, que, como qualquer serviço de hospedagem, processa as requisições para entregar as páginas.',
    ];
  }
  return [
    'O site só mede acessos se você aceitar, no aviso que aparece na primeira visita. Se recusar, o Google Analytics nem é carregado e nada é enviado ao Google.',
    'Se aceitar, usamos o Google Analytics 4, do Google, que grava cookies próprios no seu navegador, com um identificador aleatório e validade de até 13 meses. A cada página aberta, enviamos: a página (sem os filtros que você escolheu), os parâmetros utm do link que você recebeu (para saber de qual divulgação veio o acesso), o site de onde veio o link e dados técnicos que o Google coleta para estatística, como tipo de dispositivo, navegador, idioma e localização aproximada.',
    'Não enviamos nome, e-mail nem os municípios ou filtros consultados. Os recursos de publicidade e o Google signals ficam desligados. Como em qualquer acesso a um serviço na internet, o Google recebe o endereço IP do seu dispositivo; o projeto não vê nem guarda esse endereço.',
    'Sua escolha fica guardada só neste navegador e pode ser mudada a qualquer momento no botão "Preferências de medição", abaixo. Se você recusar depois de ter aceitado, os cookies do Google Analytics deste site são apagados.',
    'Os filtros ficam só no endereço (URL) da página. O site é hospedado na Vercel, que processa as requisições para entregar as páginas.',
  ];
}
