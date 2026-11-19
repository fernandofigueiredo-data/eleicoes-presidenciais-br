# 09. Perguntas frequentes (FAQ)

Espelho da seção "Perguntas frequentes" da página Sobre e contato do site
(https://eleicoes-presidenciais-br.vercel.app/sobre?s=faq). Gerado por `npm run docs:divulgacao` a partir de
`election-intelligence/src/content/faq.js`: edite lá, não aqui. As contagens de viradas são
recalculadas pelo teste `election-intelligence/tests/divulgacao.test.js`.

## Qual é a origem dos dados?

Portal de Dados Abertos do TSE (licença CC-BY), com a votação por zona eleitoral, e IBGE: API de Localidades, Censo 2022 (população e alfabetização), PIB dos Municípios (PIB de 2023) e API de Malhas Territoriais (o mapa).

## Quais eleições estão no site?

Presidente, 1º e 2º turnos de 2014, 2018, 2022 e 2026, em 5.571 municípios e 195 cidades do exterior. Não há governador, Senado nem Câmara.

## Qual é a versão dos dados?

O 2º turno de 2026 (25/10/2026) vem dos arquivos que o TSE publicou em 28/10/2026, baixados no mesmo dia. Se o TSE republicar os arquivos, os números podem mudar; o repositório guarda o registro de versão (SHA-256) de cada arquivo.

## Qual é a metodologia?

Coleta automatizada com registro de versão (SHA-256), limpeza em modelo estrela, banco SQL e 55 medidas DAX do Power BI recalculadas no navegador. Percentuais são sempre razão de somas, e não média de percentuais: um município de mil eleitores não pesa o mesmo que um de milhões.

## Como são calculados os indicadores?

Votos e comparecimento ficam em tabelas separadas, porque no arquivo do TSE o total da zona se repete em cada linha de candidato. % dos votos válidos = votos do candidato ÷ votos de todos os candidatos. PIB per capita e alfabetização de um recorte são ponderados pela população.

## Por que há 212, 213 e 215 viradas em 2026?

Os três números estão certos: cada um usa uma regra diferente para os municípios em que houve **empate** em um dos turnos. Em 2026, foram 3 municípios.

**Ao citar, informe o critério.** Para um número sem empates, use a contagem estrita: **212 municípios trocaram de vencedor entre os turnos**, 211 de Flavio Bolsonaro para Lula e 1 de Lula para Flavio Bolsonaro (Uirapuru, GO).

| Critério | Regra | Viradas em 2026 | Onde aparece |
|---|---|---|---|
| Contagem estrita | Vencedor único nos dois turnos, e diferente entre eles. Municípios com empate ficam de fora. | 212 (211 para Lula, 1 para Flavio Bolsonaro) | Press kit; rodapé do cartão "Municípios que viraram" na página 1º e 2º turno |
| Regra do DAX (site e Power BI) | O empate conta para os dois lados: se o vencedor de um turno foi "empate", o município conta como virada. | 215 (213 com Lula vencedor no 2º turno, 1 com Flavio Bolsonaro, 1 com empate no 2º turno) | Cartão, mapa e lista da página 1º e 2º turno; Power BI |
| Regra do banco SQL | No empate, vence o candidato de menor número (Lula, 13, antes de Flavio Bolsonaro, 22). | 213 (212 para Lula, 1 para Flavio Bolsonaro) | View v_virada_municipio do repositório |

**De 212 para 215.** A regra do DAX soma os 3 municípios com empate: Marquinho (PR), em que o 2º turno empatou; Trabiju (SP) e Crixás do Tocantins (TO), em que o 1º turno empatou e Lula venceu o 2º.

**E o 213?** É a cifra citada pela CNN Brasil e pela BBC. *Verificado na base:* a regra do banco SQL do projeto dá 213 (212 para Lula e 1 para Flavio Bolsonaro), porque desempata Marquinho (PR) a favor de Lula. *Verificado na base:* 213 também é o número de municípios em que Lula foi o vencedor único do 2º turno sem ter sido o vencedor único do 1º. *Não explicado:* a base não permite saber qual critério a CNN Brasil e a BBC usaram.

Lista completa, com o critério de cada município: [viradas_criterios.csv](https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br/blob/main/docs/divulgacao-election-intelligence/viradas_criterios.csv).

## Como funciona a exploração territorial?

Mapa com 5.570 polígonos de municípios, ligado pelo código do IBGE, com filtros por região, UF e município. Os filtros ficam gravados no link: para reproduzir um recorte, copie o endereço da página ou use o botão Compartilhar.

## Quais são as limitações?

Só presidente; sem recorte por local de votação ou bairro. Indicadores descrevem o município, não o eleitor: os resultados agregados não mostram para onde foi o voto de cada pessoa entre os turnos.

Associação não é causalidade. O modelo de renda e voto não inclui religião, idade nem urbanização. A alfabetização aparece arredondada no site (como no Power BI). Não há dados do IBGE para o exterior e para Boa Esperança do Norte (MT). O 2º turno de 2026 usa arquivos do TSE de 28/10/2026.

## É gratuito?

Sim. O código está sob licença MIT, no [repositório do projeto](https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br).

## Os dados podem ser usados em reportagens?

Sim, citando o TSE e o IBGE como fontes dos dados e o projeto como ferramenta (veja "Como citar"). Os números oficiais devem ser confirmados no TSE antes da publicação.

## Há parcerias?

Nenhuma parceria institucional existe hoje. O projeto não tem vínculo institucional com o TSE nem com o IBGE. O responsável está aberto a conversar.
