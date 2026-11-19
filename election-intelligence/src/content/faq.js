/**
 * Perguntas frequentes. Fonte única: a página Sobre e contato (#/sobre?s=faq) e o documento
 * docs/divulgacao-election-intelligence/09_FAQ.md (gerado por scripts/gerar_docs_divulgacao.mjs).
 *
 * As contagens de FAQ_VIRADAS são recalculadas pelo teste tests/divulgacao.test.js:
 * se os dados mudarem, o teste falha e este texto precisa ser revisto.
 * Marcação permitida nos textos: <strong>, <em>, <code> e <a href="...">.
 */
const REPO = 'https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br';

export const FAQ_VIRADAS = {
  contagens: { dax: 215, estrita: 212, estritaLula: 211, estritaFlavio: 1, sql: 213, sqlLula: 212, daxLula: 213, empates: 3 },
  tabela: {
    colunas: ['Critério', 'Regra', 'Viradas em 2026', 'Onde aparece'],
    linhas: [
      ['Contagem estrita', 'Vencedor único nos dois turnos, e diferente entre eles. Municípios com empate ficam de fora.', '212 (211 para Lula, 1 para Flavio Bolsonaro)', 'Press kit; rodapé do cartão "Municípios que viraram" na página 1º e 2º turno'],
      ['Regra do DAX (site e Power BI)', 'O empate conta para os dois lados: se o vencedor de um turno foi "empate", o município conta como virada.', '215 (213 com Lula vencedor no 2º turno, 1 com Flavio Bolsonaro, 1 com empate no 2º turno)', 'Cartão, mapa e lista da página 1º e 2º turno; Power BI'],
      ['Regra do banco SQL', 'No empate, vence o candidato de menor número (Lula, 13, antes de Flavio Bolsonaro, 22).', '213 (212 para Lula, 1 para Flavio Bolsonaro)', 'View v_virada_municipio do repositório'],
    ],
  },
  empates: [
    ['Marquinho (PR)', '4115457', 'Flavio Bolsonaro venceu o 1º turno; o 2º turno empatou'],
    ['Trabiju (SP)', '3554755', 'o 1º turno empatou; Lula venceu o 2º turno'],
    ['Crixás do Tocantins (TO)', '1706258', 'o 1º turno empatou; Lula venceu o 2º turno'],
  ],
};

export const FAQ = [
  {
    id: 'origem', pergunta: 'Qual é a origem dos dados?',
    texto: [`Portal de Dados Abertos do TSE (licença CC-BY), com a votação por zona eleitoral, e IBGE: API de Localidades, Censo 2022 (população e alfabetização), PIB dos Municípios (PIB de 2023) e API de Malhas Territoriais (o mapa).`],
  },
  {
    id: 'eleicoes', pergunta: 'Quais eleições estão no site?',
    texto: ['Presidente, 1º e 2º turnos de 2014, 2018, 2022 e 2026, em 5.571 municípios e 195 cidades do exterior. Não há governador, Senado nem Câmara.'],
  },
  {
    id: 'versao', pergunta: 'Qual é a versão dos dados?',
    texto: ['O 2º turno de 2026 (25/10/2026) vem dos arquivos que o TSE publicou em 28/10/2026, baixados no mesmo dia. Se o TSE republicar os arquivos, os números podem mudar; o repositório guarda o registro de versão (SHA-256) de cada arquivo.'],
  },
  {
    id: 'metodologia', pergunta: 'Qual é a metodologia?',
    texto: ['Coleta automatizada com registro de versão (SHA-256), limpeza em modelo estrela, banco SQL e 55 medidas DAX do Power BI recalculadas no navegador. Percentuais são sempre razão de somas, e não média de percentuais: um município de mil eleitores não pesa o mesmo que um de milhões.'],
  },
  {
    id: 'indicadores', pergunta: 'Como são calculados os indicadores?',
    texto: ['Votos e comparecimento ficam em tabelas separadas, porque no arquivo do TSE o total da zona se repete em cada linha de candidato. % dos votos válidos = votos do candidato ÷ votos de todos os candidatos. PIB per capita e alfabetização de um recorte são ponderados pela população.'],
  },
  {
    id: 'viradas', pergunta: 'Por que há 212, 213 e 215 viradas em 2026?', destaque: true,
    texto: [
      'Os três números estão certos: cada um usa uma regra diferente para os municípios em que houve <strong>empate</strong> em um dos turnos. Em 2026, foram 3 municípios.',
      '<strong>Ao citar, informe o critério.</strong> Para um número sem empates, use a contagem estrita: <strong>212 municípios trocaram de vencedor entre os turnos</strong>, 211 de Flavio Bolsonaro para Lula e 1 de Lula para Flavio Bolsonaro (Uirapuru, GO).',
    ],
    tabela: FAQ_VIRADAS.tabela,
    depois: [
      '<strong>De 212 para 215.</strong> A regra do DAX soma os 3 municípios com empate: Marquinho (PR), em que o 2º turno empatou; Trabiju (SP) e Crixás do Tocantins (TO), em que o 1º turno empatou e Lula venceu o 2º.',
      '<strong>E o 213?</strong> É a cifra citada pela CNN Brasil e pela BBC. <em>Verificado na base:</em> a regra do banco SQL do projeto dá 213 (212 para Lula e 1 para Flavio Bolsonaro), porque desempata Marquinho (PR) a favor de Lula. <em>Verificado na base:</em> 213 também é o número de municípios em que Lula foi o vencedor único do 2º turno sem ter sido o vencedor único do 1º. <em>Não explicado:</em> a base não permite saber qual critério a CNN Brasil e a BBC usaram.',
      `Lista completa, com o critério de cada município: <a href="${REPO}/blob/main/docs/divulgacao-election-intelligence/viradas_criterios.csv">viradas_criterios.csv</a>.`,
    ],
  },
  {
    id: 'territorio', pergunta: 'Como funciona a exploração territorial?',
    texto: ['Mapa com 5.570 polígonos de municípios, ligado pelo código do IBGE, com filtros por região, UF e município. Os filtros ficam gravados no link: para reproduzir um recorte, copie o endereço da página ou use o botão Compartilhar.'],
  },
  {
    id: 'limitacoes', pergunta: 'Quais são as limitações?',
    texto: [
      'Só presidente; sem recorte por local de votação ou bairro. Indicadores descrevem o município, não o eleitor: os resultados agregados não mostram para onde foi o voto de cada pessoa entre os turnos.',
      'Associação não é causalidade. O modelo de renda e voto não inclui religião, idade nem urbanização. A alfabetização aparece arredondada no site (como no Power BI). Não há dados do IBGE para o exterior e para Boa Esperança do Norte (MT). O 2º turno de 2026 usa arquivos do TSE de 28/10/2026.',
    ],
  },
  {
    id: 'gratuito', pergunta: 'É gratuito?',
    texto: [`Sim. O código está sob licença MIT, no <a href="${REPO}">repositório do projeto</a>.`],
  },
  {
    id: 'reportagens', pergunta: 'Os dados podem ser usados em reportagens?',
    texto: ['Sim, citando o TSE e o IBGE como fontes dos dados e o projeto como ferramenta (veja "Como citar"). Os números oficiais devem ser confirmados no TSE antes da publicação.'],
  },
  {
    id: 'parcerias', pergunta: 'Há parcerias?',
    texto: ['Nenhuma parceria institucional existe hoje. O projeto não tem vínculo institucional com o TSE nem com o IBGE. O responsável está aberto a conversar.'],
  },
];
