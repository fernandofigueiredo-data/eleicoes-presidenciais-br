# Power Apps (em andamento)

## Resumo

App de consulta "Eleições no meu município": parte de **um** município e mostra como ele votou em
cada eleição e turno, comparado com a UF e o Brasil, onde o vencedor mudou, o perfil do município,
favoritos e anotações. Inclui um app model-driven de bastidores, integração com o Power BI e fluxos
do Power Automate.

## Situação

| Parte | Situação |
|---|---|
| Tabelas do Dataverse (`data/powerapps/*.csv`) | Prontas |
| Script que gera as tabelas (`scripts/gerar_tabelas_powerapps.py`) | Pronto |
| Guia passo a passo e fórmulas Power Fx | Prontos |
| App canvas, app model-driven e fluxos | A construir |
| Solution exportada (`powerapps/solution/`) e prints (`powerapps/midia/`) | A construir |

## Arquivos

| Arquivo | Descrição |
|---|---|
| `guia_powerapps.md` | Passo a passo: ambiente, Dataverse, apps, Power BI, Power Automate e Solution |
| `formulas_powerfx.md` | Fórmulas Power Fx do app canvas, prontas para colar |

## Como gerar as tabelas

```bash
python3 scripts/carregar_banco.py           # se data/eleicoes.db ainda não existir
python3 scripts/gerar_tabelas_powerapps.py  # grava data/powerapps/*.csv
```

## Tecnologias

![Power Apps](https://img.shields.io/badge/Power%20Apps-742774?style=flat&logo=powerapps&logoColor=white)
![Power Automate](https://img.shields.io/badge/Power%20Automate-0066FF?style=flat&logo=powerautomate&logoColor=white)

- Power Apps (canvas e model-driven), Dataverse, Power Fx, Power Automate
