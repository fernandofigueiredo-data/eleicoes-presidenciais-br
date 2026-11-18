# Dados

## Resumo

Dataset de votação para presidente por zona eleitoral (2014, 2018, 2022 e 2026, 1º e 2º turnos),
gerado por `scripts/gerar_dataset.py` a partir dos arquivos do TSE e do IBGE.

## Arquivos

| Arquivo | Descrição |
|---|---|
| `eleicoes_presidente.csv` | Dataset completo: 340.702 linhas, 22 colunas, separador `;`, UTF-8, decimal com ponto |
| `eleicoes_presidente.xlsx` | O mesmo dataset em Excel |
| `limpo/` | As 5 tabelas do modelo estrela, geradas pelo notebook de limpeza (separador `;`) |

Não versionados (os scripts recriam): `raw/` (arquivos baixados do TSE e do IBGE, com o
`manifesto.csv` da versão usada) e `eleicoes.db` (banco SQLite).

## Dicionário do dataset

Uma linha = votos de um candidato em uma zona eleitoral de um município, em um turno.

| Coluna | Descrição |
|---|---|
| `ano` | Ano da eleição |
| `nr_turno` | Turno (1 ou 2) |
| `sg_regiao` | Região (N, NE, SE, S, CO); vazio no exterior |
| `sg_uf` | UF; `ZZ` no exterior |
| `cd_municipio_tse` | Código do município no TSE (cobre também o exterior) |
| `cd_municipio_ibge` | Código do município no IBGE (vazio no exterior) |
| `municipio` | Nome do município |
| `nr_zona` | Número da zona eleitoral |
| `nr_candidato` | Número do candidato |
| `nm_urna` | Nome de urna |
| `sg_partido` | Sigla do partido na eleição |
| `situacao_turno` | ELEITO, NÃO ELEITO ou 2º TURNO |
| `qt_votos_nominais` | Votos do candidato na zona |
| `zona_aptos` | Eleitores aptos na zona (repete em cada candidato da zona) |
| `zona_comparecimento` | Comparecimento na zona |
| `zona_abstencoes` | Abstenções na zona |
| `zona_votos_validos` | Votos válidos na zona |
| `zona_votos_brancos` | Votos brancos na zona |
| `zona_votos_nulos` | Votos nulos na zona |
| `populacao_2022` | População do Censo 2022 (IBGE, SIDRA 4709) |
| `alfabetizacao_2022` | % de alfabetizados com 15 anos ou mais (Censo 2022, SIDRA 9543) |
| `pib_mil_reais` | PIB municipal em mil R$ (SIDRA 5938): o do ano em 2014 e 2018; o de 2023 em 2022 e 2026 |

## Fontes

- TSE, Portal de Dados Abertos (licença CC-BY): https://dadosabertos.tse.jus.br
- IBGE: API de Localidades e SIDRA: https://sidra.ibge.gov.br
