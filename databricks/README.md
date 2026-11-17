# Databricks

## Resumo

Versão em nuvem do projeto: o dataset e o `sql/schema.sql` carregados no Databricks, com as views
na camada `gold` e um dashboard AI/BI sobre elas.

## Arquivos

| Arquivo | Descrição |
|---|---|
| `dashboards/eleicoes.lvdash.json` | Dashboard AI/BI (página "Visão geral") |

O dashboard usa 4 consultas:

| Dataset | Origem |
|---|---|
| `ds_resultado` | `workspace.gold.v_resultado_nacional` |
| `ds_abstencao_uf` | `workspace.gold.v_comparecimento_uf` |
| `ds_vencedores` | `workspace.gold.mv_resultado_municipio` (vencedor por município, sem exterior) |
| `ds_controle` | `workspace.gold.v_controle_nacional` |

## Como importar

1. Carregue as tabelas e views no catálogo `workspace`, esquema `gold`.
2. No workspace, abra **Dashboards > Criar > Importar dashboard** e escolha
   `dashboards/eleicoes.lvdash.json`.
3. Publique o dashboard.

## Tecnologias

![Databricks](https://img.shields.io/badge/Databricks-FF3621?style=flat&logo=databricks&logoColor=white)

- Databricks SQL, Unity Catalog, AI/BI Dashboards
