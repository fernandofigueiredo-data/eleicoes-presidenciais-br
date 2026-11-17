# Banco relacional em SQL

## Resumo

`schema.sql` cria um banco SQLite normalizado a partir do dataset: 12 tabelas com chaves
naturais, restrições `CHECK`, chaves estrangeiras, índices, 2 triggers de auditoria e 10 views
de análise. O diagrama está em [`../diagrama/`](../diagrama/).

## Objetivos

- Separar o dataset desnormalizado em tabelas sem repetição (geografia, eleição, candidatura, fatos)
- Garantir a integridade com chaves e restrições (por exemplo: não há voto de 2º turno para quem
  não disputou o 2º turno)
- Responder às perguntas do projeto com views (funções de janela, CTEs e agregações)
- Conferir os totais com o resultado oficial do TSE

## Views

| View | O que mostra |
|---|---|
| `v_dataset` | Reconstrói o dataset original, coluna por coluna |
| `v_resultado_nacional` | Votos, % dos válidos e posição de cada candidato, por turno |
| `v_resultado_municipio` | O mesmo, por município |
| `v_vencedor_municipio` | Mais votado em cada município e turno |
| `v_virada_municipio` | Vencedor do 1º e do 2º turno por município (`mudou = 1` quando virou) |
| `v_comparecimento_municipio` | Aptos, comparecimento e abstenção por município |
| `v_comparecimento_uf` | Abstenção por UF (razão de somas) |
| `v_controle_nacional` | Totais nacionais por turno, para conferir com o TSE |
| `v_integridade_zona` | Zonas em que a soma dos votos não fecha com os válidos (deve vir vazia) |
| `v_municipio_indicadores` | População, alfabetização, PIB e PIB per capita por município |

## Como executar

```bash
python3 scripts/carregar_banco.py   # cria data/eleicoes.db com o schema e os dados
sqlite3 data/eleicoes.db
```

Exemplos:

```sql
-- Resultado do 2º turno de 2026
SELECT nm_urna, votos, pct_validos
FROM v_resultado_nacional
WHERE ano = 2026 AND nr_turno = 2;

-- Municípios do Brasil em que o vencedor mudou do 1º para o 2º turno de 2026
SELECT vencedor_1t, vencedor_2t, COUNT(*) AS municipios
FROM v_virada_municipio
WHERE ano = 2026 AND mudou = 1 AND sg_uf <> 'ZZ'
GROUP BY vencedor_1t, vencedor_2t;
```

## Tecnologias

![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![SQL](https://img.shields.io/badge/SQL-025E8C?style=flat)

- SQLite 3.25+ (funções de janela)
- Conceitos: DDL, chaves compostas, `CHECK`, `FOREIGN KEY`, índices, triggers, views, `RANK`,
  `ROW_NUMBER`, `SUM() OVER`
