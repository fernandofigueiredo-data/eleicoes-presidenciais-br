# Eleições presidenciais no Brasil (2014–2026): Python, SQL e Power BI

Projeto de análise de dados com os resultados de presidente do TSE, por município e zona
eleitoral, ligados a indicadores do IBGE (população, alfabetização e PIB).

## Perguntas

1. Qual foi o resultado de cada eleição e turno, no país, por UF e por município?
2. Onde cada candidato venceu, e por qual margem?
3. Como a abstenção, os brancos e os nulos variam entre UFs e entre eleições?
4. Em quantos municípios o partido mais votado mudou de uma eleição para a outra? E do 1º para
   o 2º turno?
5. O voto varia conforme o perfil do município?
6. Os números batem com o resultado oficial do TSE?

## Estrutura

```
data/
  eleicoes_presidente.csv    dataset (22 colunas, 340.702 linhas: candidato × zona × turno)
  eleicoes_presidente.xlsx   o mesmo dataset em Excel
  limpo/                     5 tabelas limpas (dTurno, dCandidato, dMunicipio, fVotos, fComparecimento)
  eleicoes.db                banco SQLite
notebooks/
  limpeza_dados.ipynb        limpeza em Python (igual à do Power Query)
powerbi/
  guia_dashboard.md          limpeza no Power Query, modelo, medidas e páginas do dashboard
  medidas_dax.dax            medidas DAX
  tema_eleicoes_br.json      tema (design system) do Power BI
sql/
  schema.sql                 banco relacional normalizado, com views, índices e triggers
scripts/
  baixar_dados.py            baixa os arquivos do TSE e do IBGE
  gerar_dataset.py           gera o dataset a partir dos arquivos baixados
  carregar_banco.py          cria o banco SQLite a partir do dataset
databricks/
  guia_databricks.html       guia interativo para levar o projeto ao Databricks, passo a passo
```

## Fluxo

```
TSE + IBGE ──► baixar_dados.py ──► gerar_dataset.py ──► eleicoes_presidente.csv
                                                              │
                     ┌────────────────────────┬───────────────┴──────────┐
                     ▼                        ▼                          ▼
            limpeza_dados.ipynb      Power Query (guia)         carregar_banco.py
                     │                        │                          │
                     ▼                        ▼                          ▼
              data/limpo/*.csv     dashboard Power BI (DAX)      eleicoes.db (SQL)
```

A limpeza em Python e no Power Query é a mesma: gera as mesmas 5 tabelas, com os mesmos nomes
de colunas e o mesmo número de linhas.

## Como reproduzir

```bash
python3 scripts/baixar_dados.py      # opcional: baixa de novo os dados brutos
python3 scripts/gerar_dataset.py     # opcional: refaz o dataset
python3 scripts/carregar_banco.py    # cria data/eleicoes.db
```

Depois, rode `notebooks/limpeza_dados.ipynb` e siga `powerbi/guia_dashboard.md`.

## Principais decisões de limpeza

- Os totais de zona se repetem em cada linha de candidato: votos e comparecimento ficam em tabelas
  separadas, e as zonas são deduplicadas antes de somar.
- Exterior e Boa Esperança do Norte (MT) não têm dados do IBGE: os vazios não são preenchidos.
- Municípios com o mesmo nome são separados pelo código e pela UF.
- PSDC → DC (mesmo partido, nova sigla).
- Percentuais são sempre calculados como razão de somas.

## Conferência

Comparecimento e votos válidos batem com o TSE nos 8 turnos (2014 a 2026). Exemplos:

| Turno | Comparecimento | Resultado (% dos válidos) |
|---|---|---|
| 2022 · 2º turno | 124.252.796 | LULA 50,90% · JAIR BOLSONARO 49,10% |
| 2026 · 1º turno | 125.275.835 | FLAVIO BOLSONARO 47,03% · LULA 45,16% |
| 2026 · 2º turno | 128.236.074 | LULA 51,79% (64.256.232) · FLAVIO BOLSONARO 48,21% (59.826.041) |

Em 2026, LULA virou o resultado em 212 municípios do Brasil que FLAVIO BOLSONARO tinha vencido no
1º turno, e FLAVIO BOLSONARO em 1 (view `v_virada_municipio`, sem o exterior).

## Limitações

- O 2º turno de 2026 (25/10/2026) vem dos arquivos que o TSE publicou em 28/10/2026. Se o TSE
  republicar, rode o fluxo de novo (`data/raw/manifesto.csv` guarda a versão usada).
- Em 2014 e 2018 faltam 684 e 470 eleitores aptos de zonas do exterior sem votos.
- O perfil econômico usa o PIB mais recente (2023) e a população de 2022.
- Indicadores descrevem o município, não o eleitor (associação não é causalidade).

## Fontes

- TSE, Portal de Dados Abertos (licença CC-BY)
- IBGE: API de Localidades; Censo 2022 (SIDRA 4709 e 9543); PIB dos Municípios (SIDRA 5938)
