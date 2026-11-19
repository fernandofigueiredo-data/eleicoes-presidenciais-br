# Notebooks

| Notebook | O que faz |
|---|---|
| [`limpeza_dados.ipynb`](limpeza_dados.ipynb) | Limpeza e modelo estrela (abaixo) |
| [`analise_perfil.ipynb`](analise_perfil.ipynb) | O voto acompanha a renda do município? Spearman e regressão ponderada com controles de alfabetização e região, 2026 e 2022 |

Os dois rodam do início ao fim na CI (`.github/workflows/python-pipeline.yml`), e a limpeza precisa reproduzir `data/limpo/` byte a byte.

# Limpeza dos dados em Python

## Resumo

O notebook transforma o dataset desnormalizado (`data/eleicoes_presidente.csv`) em um modelo
estrela com 2 fatos e 3 dimensões. É a mesma limpeza feita no Power Query
(`powerbi/guia_dashboard.md`): as tabelas, os nomes das colunas e o número de linhas são iguais.

## Objetivos

- Ler o CSV e conferir tipos, vazios e duplicidades
- Padronizar textos, regiões, UFs e a sigla de partido que mudou (PSDC → DC)
- Separar votos de comparecimento para não somar o mesmo total da zona várias vezes
- Gerar as 5 tabelas do modelo e conferir os totais com o TSE

## Tabelas geradas (`data/limpo/`)

| Tabela | Linhas | Grão |
|---|---|---|
| `dTurno` | 8 | Eleição e turno |
| `dCandidato` | 47 | Candidatura (ano + número) |
| `dMunicipio` | 5.766 | Município, com indicadores do IBGE |
| `fVotos` | 309.308 | Município × turno × candidato |
| `fComparecimento` | 45.834 | Município × turno |

## Como executar

```bash
pip install -r requirements.txt
jupyter notebook notebooks/limpeza_dados.ipynb
```

Execute todas as células em ordem. O notebook lê `data/eleicoes_presidente.csv` e grava
`data/limpo/*.csv`.

## Tecnologias

![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat&logo=pandas&logoColor=white)
![Jupyter](https://img.shields.io/badge/Jupyter-F37626?style=flat&logo=jupyter&logoColor=white)

- Python 3.10+, Pandas, Jupyter Notebook; statsmodels, SciPy e Matplotlib na análise do perfil
