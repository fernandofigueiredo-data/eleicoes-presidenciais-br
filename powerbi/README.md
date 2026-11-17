# Dashboard Power BI

## Resumo

Dashboard com 7 páginas de análise e 1 dica de ferramenta, construído no Power BI Desktop sobre um
modelo estrela (2 fatos, 3 dimensões) com 55 medidas DAX. Responde às 6 perguntas do projeto, do
resultado nacional ao perfil socioeconômico dos municípios.

## Páginas

| Página | Pergunta |
|---|---|
| 1. Visão Nacional | Qual foi o resultado de cada eleição e turno? |
| 2. Mapa dos vencedores | Onde cada candidato venceu, e por qual margem? |
| 3. Comparecimento e abstenção | Como abstenção, brancos e nulos variam entre UFs e eleições? |
| 4. Mudanças entre eleições | Em quantos municípios o partido vencedor mudou? |
| 5. Do 1º ao 2º turno | Onde o vencedor virou no 2º turno? |
| 6. Perfil socioeconômico | O voto varia com o PIB per capita, a alfabetização e o porte? |
| 7. Sobre os dados | Fontes, decisões de limpeza e conferência com o TSE |
| Dica do município | Dica de ferramenta dos mapas |

## Arquivos

| Arquivo | Descrição |
|---|---|
| `eleicoes-presidenciais-br.pbix` | Relatório final |
| `guia_dashboard.md` | Passo a passo: Power Query, modelo, medidas, design e páginas |
| `guia_dashboard.html` | O mesmo guia, interativo (com checklist) |
| `medidas_dax.dax` | As 55 medidas, as 2 colunas calculadas e a tabela de cores, comentadas |
| `tema_eleicoes_br.json` | Tema do relatório (cores e tipografia) |

## Medidas DAX (exemplos)

```dax
% Abstenção = DIVIDE ( [Abstenções], [Aptos] )

Votos Todos os Candidatos = CALCULATE ( [Votos], REMOVEFILTERS ( dCandidato ) )

% Votos Válidos = DIVIDE ( [Votos], [Votos Todos os Candidatos] )
```

As medidas ficam em 8 pastas: Eleitorado, Votos, Vencedores, Comparação entre eleições,
Comparação entre turnos, Perfil dos municípios, Qualidade dos dados e Cores e textos.
Percentuais são sempre medidas (razão de somas), nunca colunas.

## Como abrir

1. Abra `eleicoes-presidenciais-br.pbix` no Power BI Desktop (Windows).
2. Em **Transformar dados > Configurações da fonte de dados**, aponte a consulta `Eleicoes` para o
   seu `data/eleicoes_presidente.csv`.
3. Clique em **Atualizar**.

Conferência: sem filtros, `Municípios` = 5.571 e `PIB per capita` ≈ R$ 53.887; no 2º turno de
2026, LULA 51,79% e FLAVIO BOLSONARO 48,21%.

## Tecnologias

![Power BI](https://img.shields.io/badge/Power%20BI-F2C811?style=flat&logo=powerbi&logoColor=black)

- Power BI Desktop, Power Query (M), DAX
