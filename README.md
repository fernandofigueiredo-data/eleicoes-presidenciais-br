# Eleições presidenciais no Brasil (2014–2026)

![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat&logo=pandas&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![Power BI](https://img.shields.io/badge/Power%20BI-F2C811?style=flat&logo=powerbi&logoColor=black)
![Databricks](https://img.shields.io/badge/Databricks-FF3621?style=flat&logo=databricks&logoColor=white)

> Resultados de presidente do TSE em todos os municípios e zonas eleitorais, nas quatro últimas
> eleições (1º e 2º turnos), ligados a indicadores do IBGE: população, alfabetização e PIB.

---

## Resumo

O projeto parte dos arquivos públicos do TSE e do IBGE e percorre todo o caminho de uma análise:
coleta automatizada, limpeza em Python, banco relacional em SQL, dashboard no Power BI, versão em
nuvem no Databricks. Cada etapa confere os números com o resultado oficial do TSE.

| | |
|---|---|
| **Dados** | 340.702 linhas (candidato × zona × turno), 5.766 locais de votação (5.571 municípios do Brasil e 195 cidades do exterior), 8 turnos |
| **Período** | 2014, 2018, 2022 e 2026, 1º e 2º turnos |
| **Fontes** | TSE (Dados Abertos) e IBGE (Localidades e SIDRA) |

## Perguntas de negócio

1. Qual foi o resultado de cada eleição e turno, no país, por UF e por município?
2. Onde cada candidato venceu, e por qual margem?
3. Como a abstenção, os brancos e os nulos variam entre UFs e entre eleições?
4. Em quantos municípios o partido mais votado mudou de uma eleição para a outra? E do 1º para o
   2º turno?
5. O voto varia conforme o perfil do município (PIB per capita, alfabetização, porte)?
6. Os números batem com o resultado oficial do TSE?

## Principais resultados

- **2026 teve virada no 2º turno.** FLAVIO BOLSONARO liderou o 1º turno (47,03% contra 45,16%), e
  LULA venceu o 2º com 51,79% dos válidos (64.256.232 votos contra 59.826.041). LULA virou o
  resultado em 212 municípios que FLAVIO BOLSONARO tinha vencido no 1º turno; FLAVIO BOLSONARO
  virou em 1.
- **O mapa ficou dividido.** No 2º turno de 2026, LULA venceu em 2.876 municípios e FLAVIO
  BOLSONARO em 2.695.
- **O voto acompanha a renda do município.** No 2º turno de 2026, LULA teve 73,9% dos válidos no
  quarto de municípios com menor PIB per capita (até R$ 16.822) e 44,1% no quarto com maior PIB
  per capita (acima de R$ 49.825). A relação é com o município, não com o eleitor.
- **O partido vencedor mudou em menos municípios.** No 1º turno, mudou em 812 municípios de 2018
  para 2022 e em 714 de 2022 para 2026. PSL e PL contam como o mesmo campo, porque Bolsonaro
  trocou de sigla.
- **A abstenção ficou perto de 20% em todos os turnos** (de 19,22% a 21,30%). No 2º turno de
  2026, foi maior no Acre (26,08%) e menor no Ceará (13,89%).
- **Os números conferem.** Comparecimento e votos válidos batem com o TSE nos 8 turnos, e a soma
  dos votos dos candidatos é igual aos válidos em todas as zonas.

## Dashboard

🔗 **[Abrir o dashboard publicado (Power BI)](https://app.powerbi.com/view?r=eyJrIjoiNjlmZGIxNmItMDU5Yy00MzQ2LWE2YTYtYWMyZTE0OTRhMzM2IiwidCI6IjI2MGZmOWM5LTM4OGYtNDdiYi04NjlhLTc3YTk1N2JmNzA4MiJ9)**

![Mapa dos vencedores, 2º turno de 2026](prints/02_mapa_dos_vencedores.png)

| Página | Print |
|---|---|
| Visão nacional | [01_visao_nacional.png](prints/01_visao_nacional.png) |
| Mapa dos vencedores | [02_mapa_dos_vencedores.png](prints/02_mapa_dos_vencedores.png) |
| Comparecimento e abstenção | [03_comparecimento_e_abstencao.png](prints/03_comparecimento_e_abstencao.png) |
| Mudanças entre eleições | [04_mudancas_entre_eleicoes.png](prints/04_mudancas_entre_eleicoes.png) |
| Do 1º ao 2º turno | [05_do_1o_ao_2o_turno.png](prints/05_do_1o_ao_2o_turno.png) |
| Perfil socioeconômico | [06_perfil_socioeconomico.png](prints/06_perfil_socioeconomico.png) |
| Sobre os dados | [07_sobre_os_dados.png](prints/07_sobre_os_dados.png) |

🎬 Navegação pelo dashboard em vídeo: [prints/demo_dashboard.mov](prints/demo_dashboard.mov)

## Entregas

| Etapa | Ferramenta | Onde está | Situação |
|---|---|---|---|
| Coleta e dataset | Python (biblioteca padrão) | [`scripts/`](scripts/) e [`data/`](data/) | Concluída |
| Limpeza | Python, Pandas, Jupyter | [`notebooks/`](notebooks/) | Concluída |
| Banco relacional | SQL (SQLite) | [`sql/`](sql/) | Concluída |
| Modelo de dados | dbdiagram.io (DBML) | [`diagrama/`](diagrama/) | Concluída |
| Dashboard | Power BI, Power Query, DAX | [`powerbi/`](powerbi/) · [online](https://app.powerbi.com/view?r=eyJrIjoiNjlmZGIxNmItMDU5Yy00MzQ2LWE2YTYtYWMyZTE0OTRhMzM2IiwidCI6IjI2MGZmOWM5LTM4OGYtNDdiYi04NjlhLTc3YTk1N2JmNzA4MiJ9) | Concluída |
| Nuvem | Databricks (AI/BI Dashboard) | [`databricks/`](databricks/) | Concluída |
| Site independente | Vite, JavaScript, ECharts, D3/Canvas, IBGE TopoJSON (extraído do PBIX com o PBIX-MCP) | [`election-intelligence/`](election-intelligence/) | Concluída |

## Modelo de dados

![Modelo relacional](diagrama/modelo_relacional_eleicoes.png)

Banco normalizado com 12 tabelas, chaves naturais, 10 views, índices e triggers de auditoria.
Fonte do diagrama: [`diagrama/modelo_relacional_eleicoes.dbml`](diagrama/modelo_relacional_eleicoes.dbml)
· [ver no dbdiagram.io](https://dbdiagram.io/d/6ae4915b8bf38111a8ea8f2e).

## Estrutura do repositório

```
eleicoes-presidenciais-br/
│
├── README.md                          apresentação do projeto
├── .gitignore
│
├── data/
│   ├── eleicoes_presidente.csv        dataset (22 colunas, 340.702 linhas)
│   ├── eleicoes_presidente.xlsx       o mesmo dataset em Excel
│   └── limpo/                         5 tabelas limpas (dTurno, dCandidato, dMunicipio, fVotos, fComparecimento)
│
├── scripts/
│   ├── baixar_dados.py                baixa os arquivos do TSE e do IBGE
│   ├── gerar_dataset.py               gera o dataset a partir dos arquivos baixados
│   └── carregar_banco.py              cria o banco SQLite a partir do dataset
│
├── notebooks/
│   └── limpeza_dados.ipynb            limpeza em Python (igual à do Power Query)
│
├── sql/
│   └── schema.sql                     tabelas, views, índices e triggers
│
├── diagrama/
│   ├── modelo_relacional_eleicoes.dbml   fonte do diagrama (dbdiagram.io)
│   ├── modelo_relacional_eleicoes.sql    DDL exportado do dbdiagram.io
│   ├── modelo_relacional_eleicoes.png
│   └── modelo_relacional_eleicoes.pdf
│
├── prints/                            prints das 7 páginas do dashboard e vídeo de navegação
│
├── powerbi/
│   ├── eleicoes-presidenciais-br.pbix dashboard (8 páginas, 55 medidas)
│   ├── guia_dashboard.md              passo a passo: Power Query, modelo, medidas e páginas
│   ├── guia_dashboard.html            o mesmo guia, interativo
│   ├── medidas_dax.dax                todas as medidas DAX, comentadas
│   └── tema_eleicoes_br.json          tema (design system) do relatório
│
└── databricks/
    └── dashboards/eleicoes.lvdash.json  dashboard AI/BI
```

Os arquivos brutos (`data/raw/`) e o banco (`data/eleicoes.db`) não vão para o repositório:
os scripts recriam os dois.

## Fluxo

```
TSE + IBGE ──► baixar_dados.py ──► gerar_dataset.py ──► eleicoes_presidente.csv
                                                              │
    ┌─────────────────────┬─────────────────────┬─────────────┴───────┐
    ▼                     ▼                     ▼                     ▼
limpeza_dados.ipynb   Power Query (guia)    carregar_banco.py     Databricks (CSV + schema.sql)
    │                     │                     │                     │
    ▼                     ▼                     ▼                     ▼
data/limpo/*.csv      dashboard Power BI    eleicoes.db (SQL)     dashboard AI/BI
```

A limpeza em Python e no Power Query é a mesma: gera as mesmas 5 tabelas, com os mesmos nomes
de colunas e o mesmo número de linhas.

## Como executar

Precisa só de Python 3.10+ (os scripts usam a biblioteca padrão; o notebook usa Pandas).

```bash
python3 scripts/baixar_dados.py             # opcional: baixa de novo os dados brutos
python3 scripts/gerar_dataset.py            # opcional: refaz o dataset
python3 scripts/carregar_banco.py           # cria data/eleicoes.db
```

Depois:

- **Limpeza:** rode `notebooks/limpeza_dados.ipynb` (gera `data/limpo/`).
- **Power BI:** abra `powerbi/eleicoes-presidenciais-br.pbix` no Power BI Desktop (Windows), aponte
  a consulta `Eleicoes` para o seu `data/eleicoes_presidente.csv` e clique em **Atualizar**. Para
  montar do zero, siga `powerbi/guia_dashboard.md`.
- **SQL:** consulte as views, por exemplo `SELECT * FROM v_resultado_nacional;`.

## Principais decisões de limpeza

- Os totais de zona se repetem em cada linha de candidato: votos e comparecimento ficam em tabelas
  separadas, e as zonas são deduplicadas antes de somar.
- Exterior e Boa Esperança do Norte (MT) não têm dados do IBGE: os vazios não são preenchidos.
- Municípios com o mesmo nome são separados pelo código e pela UF.
- PSDC → DC (mesmo partido, nova sigla).
- Percentuais são sempre calculados como razão de somas, nunca como média de percentuais.

## Conferência com o TSE

| Turno | Comparecimento | Resultado (% dos válidos) |
|---|---|---|
| 2022 · 2º turno | 124.252.796 | LULA 50,90% · JAIR BOLSONARO 49,10% |
| 2026 · 1º turno | 125.275.835 | FLAVIO BOLSONARO 47,03% · LULA 45,16% |
| 2026 · 2º turno | 128.236.074 | LULA 51,79% (64.256.232) · FLAVIO BOLSONARO 48,21% (59.826.041) |

As views `v_controle_nacional` e `v_integridade_zona` refazem essa conferência no banco.

## Limitações

- O 2º turno de 2026 (25/10/2026) vem dos arquivos que o TSE publicou em 28/10/2026. Se o TSE
  republicar, rode o fluxo de novo (`data/raw/manifesto.csv` guarda a versão usada).
- Em 2014 e 2018 faltam 684 e 470 eleitores aptos de zonas do exterior sem votos.
- O perfil econômico usa o PIB mais recente (2023) e a população de 2022.
- Indicadores descrevem o município, não o eleitor (associação não é causalidade).

## Fontes dos dados

- TSE, Portal de Dados Abertos (licença CC-BY): https://dadosabertos.tse.jus.br
- IBGE: API de Localidades; Censo 2022 (SIDRA 4709 e 9543); PIB dos Municípios (SIDRA 5938):
  https://sidra.ibge.gov.br
