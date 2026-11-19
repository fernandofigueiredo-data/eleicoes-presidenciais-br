# Auditoria do PBIX — `eleicoes-presidenciais-br.pbix`

Auditoria feita em 18/11/2026 com o **PBIX-MCP** conectado ao Claude Code. Arquivo:
`powerbi/eleicoes-presidenciais-br.pbix` (2,6 MB, formato PBIR, modo Import). Todas as informações
abaixo vieram de ferramentas do MCP; os artefatos brutos estão em `data/metadata/`.

## 0. Ferramentas do PBIX-MCP usadas

| Etapa | Ferramenta | Resultado |
|---|---|---|
| Conexão | `pbix_open` (alias `eleicoes`), `pbix_list_open` | Arquivo aberto; inventário das partes do pacote (DataModel 2,65 MB, 8 páginas PBIR, tema registrado) |
| Modelo | `pbix_list_tables`, `pbix_get_model_schema`, `pbix_get_model_columns`, `pbix_get_model_measures`, `pbix_get_model_relationships`, `pbix_get_model_power_query`, `pbix_list_data_sources`, `pbix_get_hierarchies`, `pbix_get_sort_by_columns` | 7 tabelas, 48 colunas, 55 medidas, 5 relações, 2 colunas calculadas, 0 hierarquias |
| Modelo completo | `pbix_export_tmdl` → `data/metadata/tmdl/` | Expressões DAX e M completas (as listagens acima truncam o texto) |
| Dados | `pbix_export_all_tables_csv` → `data/raw/` | 6 CSV, 365.020 linhas |
| Relatório | `pbix_get_pages`, `pbix_get_page_visuals` (8 páginas), `pbix_get_layout_raw` → `data/metadata/report_layout.json` | 94 visuais, campos, filtros, títulos e grupos de sincronização |
| Tema | `pbix_get_theme` → `data/metadata/tema_relatorio.json` | Tema "Eleições BR" |
| DAX | `pbix_evaluate_dax`, `pbix_evaluate_dax_grouped`, `pbix_evaluate_dax_per_dimension`, `pbix_evaluate_dax_batch` | Referência em `data/metadata/referencia_mcp.json` |

**Limitações do MCP encontradas (documentadas):**

- `pbix_get_layout_raw` não traz `visualInteractions` (interações entre visuais) do formato PBIR. Os
  arquivos `page.json` foram lidos diretamente do pacote (somente leitura) e copiados para
  `data/metadata/report_definition/`.
- Avaliações que iteram municípios × candidatos (`Municípios Vencidos` agrupado por 47 candidatos) ou
  lotes grandes em `pbix_evaluate_dax_batch` excederam o tempo limite e reiniciaram o servidor MCP.
  A solução foi avaliar contexto a contexto (`pbix_evaluate_dax`) ou agrupado por dimensões pequenas.
- `pbix_get_theme` devolve o tema base Fluent2 junto (144 mil caracteres); o tema próprio foi
  extraído do recurso registrado.
- `pbix_evaluate_dax_per_dimension` formata percentuais com 1 casa; para a referência usou-se
  `pbix_evaluate_dax_grouped`, que devolve números completos.

## 1. Estrutura do modelo

Esquema estrela com duas tabelas de fato e três dimensões, mais uma tabela de cores e uma tabela de medidas.

```
            dTurno (8)             dCandidato (47)
               │ 1                      │ 1
               │                        │
        * ┌────┴─────┐ *         * ┌────┴───┐
fComparecimento (45.834)      fVotos (309.308)
        * └────┬─────┘ *         * └────┬───┘
               │ 1                      │ 1
               └────── dMunicipio (5.766) ──────┘

PartidoCores (27, tabela calculada, sem relação — usada via LOOKUPVALUE)
_Medidas (0 linhas, só medidas)
```

## 2. Inventário das tabelas

| Tabela | Linhas | Colunas | Origem (partição) | Descrição |
|---|---:|---:|---|---|
| fVotos | 309.308 | 7 | M: agrupa `Eleicoes` por turno × município × candidato | Votos nominais |
| fComparecimento | 45.834 | 10 | M: deduplica zonas e agrupa por turno × município | Aptos, comparecimento, abstenção, válidos, brancos, nulos |
| dMunicipio | 5.766 | 18 (2 calculadas) | M: agrupa `Eleicoes` por município | 5.571 municípios + 195 cidades do exterior |
| dCandidato | 47 | 6 | M: distintos de `Eleicoes` | Candidato por ano |
| dTurno | 8 | 5 | M: distintos de `Eleicoes` | 2014–2026 × 1º/2º turno |
| PartidoCores | 27 | 2 | DAX `DATATABLE` | Cor de cada partido |
| _Medidas | 0 | 0 | M vazio | Contêiner das 55 medidas |

Fonte de dados (`pbix_list_data_sources`): todas as tabelas são *Import*; a consulta base `Eleicoes`
lê `data/eleicoes_presidente.csv` (`Csv.Document`, `;`, UTF-8). O caminho gravado no PBIX é de uma
máquina Windows (`C:\Mac\Home\...`).

## 3. Dicionário de dados

Ver [`DICIONARIO_DADOS.md`](DICIONARIO_DADOS.md).

## 4. Relacionamentos

| De (muitos) | Para (um) | Ativa | Direção do filtro |
|---|---|---|---|
| fVotos[cd_municipio_tse] | dMunicipio[cd_municipio_tse] | sim | dimensão → fato (simples) |
| fVotos[chave_turno] | dTurno[chave_turno] | sim | simples |
| fVotos[chave_candidato] | dCandidato[chave_candidato] | sim | simples |
| fComparecimento[cd_municipio_tse] | dMunicipio[cd_municipio_tse] | sim | simples |
| fComparecimento[chave_turno] | dTurno[chave_turno] | sim | simples |

Consequências reproduzidas no JavaScript:
- dCandidato **não** filtra fComparecimento: medidas de eleitorado ignoram o filtro de candidato.
- dTurno **não** filtra dMunicipio nem dCandidato: `PIB per capita` e `Alfabetização` não mudam com o turno; `VALUES(dCandidato[...])` lista os 47 candidatos em qualquer turno (os de outros anos têm `[Votos]` vazio).

## 5. Inventário das medidas DAX (55)

| Pasta | Medidas |
|---|---|
| 1. Eleitorado (12) | Aptos, Comparecimento, Abstenções, Votos Válidos, Votos Brancos, Votos Nulos, % Abstenção, % Comparecimento, % Brancos, % Nulos, % Brancos e Nulos, % Abstenção Nacional |
| 2. Votos (4) | Votos, Votos Todos os Candidatos, % Votos Válidos, Posição |
| 3. Vencedores (6) | Vencedor, Partido Vencedor, % do Vencedor, Margem de Vitória, Municípios Vencidos, % Municípios Vencidos |
| 4. Comparação entre eleições (10) | Ano Selecionado, Partido Vencedor 1º Turno, Partido Vencedor 1º Turno Anterior, Mudou Partido Vencedor, Municípios que Mudaram, % Municípios que Mudaram, % Votos Válidos Eleição Anterior, Variação p.p., % Abstenção Eleição Anterior, Variação Abstenção p.p. |
| 5. Comparação entre turnos (11) | Vencedor 1º Turno, Vencedor 2º Turno, Virou no 2º Turno, Municípios que Viraram, % Municípios que Viraram, Votos 1º Turno, Votos 2º Turno, Votos Ganhos no 2º Turno, % Votos Válidos 1º Turno, % Votos Válidos 2º Turno, Variação entre Turnos p.p. |
| 6. Perfil dos municípios (4) | Municípios, População 2022, PIB per capita, Alfabetização |
| 7. Qualidade dos dados (2) | Diferença de Apuração, Conferência Válidos |
| 8. Cores e textos (6) | Cor do Partido, Cor do Partido Vencedor, Cor Mudança, Cor Virada, Título Eleição, Resumo Vencedor |

As expressões completas estão em `data/metadata/tmdl/tables/_Medidas.tmdl`, em `public/data/medidas.json`
e na página **Sobre os dados** do site.

## 6. Dependências entre medidas

```
Votos ─┬─ Votos Todos os Candidatos ─┬─ % Votos Válidos ─┬─ % Votos Válidos 1º/2º Turno ── Variação entre Turnos p.p.
       │                             │                  └─ % Votos Válidos Eleição Anterior ── Variação p.p.
       │                             ├─ Vencedor ─┬─ Vencedor 1º/2º Turno ── Virou no 2º Turno ── Municípios que Viraram ── %
       │                             │            └─ Resumo Vencedor
       │                             ├─ Partido Vencedor ─ Partido Vencedor 1º Turno (Anterior) ─ Mudou Partido Vencedor ─ Municípios que Mudaram ─ %
       │                             │                   └─ Cor do Partido Vencedor
       │                             ├─ % do Vencedor, Margem de Vitória
       │                             └─ Conferência Válidos (com Votos Válidos)
       ├─ Posição, Municípios Vencidos ── % Municípios Vencidos
       └─ Votos 1º/2º Turno ── Votos Ganhos no 2º Turno
Aptos, Abstenções ── % Abstenção ─┬─ % Abstenção Nacional
                                  └─ % Abstenção Eleição Anterior ── Variação Abstenção p.p.
Ano Selecionado (SELECTEDVALUE dTurno[ano]) ── todas as medidas "1º/2º turno" e "anterior"
Comparecimento, Votos Válidos, Brancos, Nulos ── %s e Diferença de Apuração
```

## 7. Consultas Power Query

| Consulta | Passos relevantes |
|---|---|
| `Eleicoes` (base) | Lê o CSV; converte tipos; **`alfabetizacao_2022` e `pib_mil_reais` são tipados como `Int64.Type` antes de virar número** (ver Limitações); apara textos; `sg_regiao` vazio → `EX`; cria `sg_regiao_nome`, `sg_uf_nome`, `exterior`, `municipio_uf`, `partido_atual` (PSDC → DC), `chave_turno`, `chave_candidato`; `nm_urna` e `situacao_turno` em *Proper Case* |
| `fVotos` | `Table.Group` por turno, município, candidato e situação; soma `qt_votos_nominais` |
| `fComparecimento` | Remove duplicatas de zona e soma os totais de zona por município |
| `dMunicipio` | PIB só de 2022/2026 (`pib_ref`), agrupa por município; `pib_per_capita = pib × 1000 / população`; `faixa_populacao` e `ordem_faixa_populacao`; `local_mapa` |
| `dTurno` | Distintos; `rotulo_turno = "AAAA · Nº turno"`; `ordem_turno = ano × 10 + turno` |
| `dCandidato` | Distintos por candidato e ano |

Colunas calculadas (DAX): `Quartil PIB per capita` e `Quartil Alfabetização`, com `PERCENTILE.INC` sobre
todos os municípios (os vazios são "Sem dado"). Colunas ordenadas por outra: `faixa_populacao` por
`ordem_faixa_populacao`; `rotulo_turno` por `ordem_turno`.

## 8. Inventário das páginas

| # | Página | Visuais | Tamanho | Filtro de página |
|---|---|---:|---|---|
| 0 | Visão Nacional | 16 | 1920×1080 | — |
| 1 | Mapa dos vencedores | 10 | 1920×1080 | — |
| 2 | Comparecimento e abstenção | 12 | 1920×1080 | — |
| 3 | Mudanças entre eleições | 14 | 1920×1080 | `dMunicipio[exterior] = false` |
| 4 | Do 1º ao 2º turno | 14 | 1920×1080 | `dMunicipio[exterior] = false` |
| 5 | Perfil socioeconômico | 13 | 1920×1080 | — |
| 6 | Sobre os dados | 8 | 1920×1080 | — |
| 7 | Dica do município | 7 | 400×300 | Página de dica de ferramenta (oculta) |

## 9. Inventário dos visuais (sem formas e navegadores de página)

| Página | Visual | Campos | Filtro do visual |
|---|---|---|---|
| Visão Nacional | Segmentação (lista suspensa) | dTurno.rotulo_turno — padrão **2026 · 2º turno**, sincronizada em todas as páginas | — |
| | 7 cartões | Título Eleição, Resumo Vencedor, Aptos, Comparecimento, Votos Válidos, % Abstenção, % Brancos, % Nulos | — |
| | Barras "Votos válidos por candidato" | nm_urna × % Votos Válidos; dica: Votos, partido, Municípios Vencidos | — |
| | Barras "Municípios vencidos" | nm_urna × Municípios Vencidos | exterior = false |
| | Colunas "Participação ao longo das eleições" | rotulo_turno × % Abstenção, % Brancos, % Nulos | — |
| Mapa dos vencedores | Azure Map (municípios) | local_mapa, tamanho Aptos; dica Vencedor, % do Vencedor | exterior = false |
| | Azure Map (UF) | sg_uf_nome; dica Vencedor, % do Vencedor, Margem | exterior = false |
| | Tabela "Resultado por UF" | sg_uf, Vencedor, % do Vencedor, Margem, % Abstenção | exterior = false |
| | Segmentação | sg_regiao_nome | exterior = false |
| Comparecimento | Cartão | Variação Abstenção p.p. | — |
| | Azure Map (UF) | sg_uf_nome; dica % Abstenção, Aptos, Comparecimento | exterior = false |
| | Barras por UF | sg_uf × % Abstenção (linha = média Brasil sem exterior) | exterior = false |
| | Dispersão | município: Alfabetização × % Abstenção, tamanho Aptos | exterior = false |
| | Linhas | rotulo_turno × % Abstenção por região | exterior = false |
| | Colunas | rotulo_turno × % Brancos, % Nulos | exterior = false |
| Mudanças | 2 cartões | Municípios que Mudaram, % Municípios que Mudaram | — |
| | Azure Map | local_mapa; dica partido anterior/atual, Mudou | — |
| | Tabela | municipio_uf, Partido Vencedor 1º Turno Anterior, Partido Vencedor 1º Turno | Mudou Partido Vencedor = 1 |
| | Matriz | sg_uf × partido_atual × Variação p.p. | Variação p.p. não vazia |
| | Segmentação | partido_atual (padrão PT) | — |
| 1º e 2º turno | 2 cartões | Municípios que Viraram, % | — |
| | Azure Map | local_mapa; dica Vencedor 1º/2º, Virou | — |
| | Tabela de municípios | municipio_uf, Vencedor 1º Turno, Vencedor 2º Turno | Virou no 2º Turno = 1 |
| | Tabela de candidatos | nm_urna, Votos 1º/2º, Ganhos, % 1º/2º, Variação | Votos 2º Turno não vazio |
| | Barras por UF | sg_uf × nm_urna × Variação entre Turnos p.p. | Votos 2º Turno não vazio |
| Perfil | 3 barras agrupadas | Quartil PIB / Quartil Alfabetização / faixa_populacao × nm_urna × % Votos Válidos | exterior = false; Quartil PIB ≠ "Sem dado" |
| | Dispersão | município: PIB per capita × % Votos Válidos, tamanho População | exterior = false |
| | Segmentação | nm_urna (padrão Lula) | — |
| Sobre os dados | Tabela "Conferência com o TSE" | rotulo_turno, Comparecimento, Votos Válidos, Votos Todos os Candidatos, Conferência Válidos, Diferença de Apuração | — |
| Dica do município | 6 cartões | municipio_uf, Vencedor, % do Vencedor, Margem, % Abstenção, PIB per capita | — |

## 10. Filtros e interações originais

- **Turno sincronizado** (`syncGroup rotulo_turno`) em todas as páginas, seleção única, padrão 2026 · 2º turno → no site, filtro global persistente na URL.
- **Interações desligadas** (`visualInteractions`, `NoFilter`):
  - Visão Nacional: o turno não filtra "Participação ao longo das eleições".
  - Comparecimento: o turno não filtra as séries de abstenção por região e brancos/nulos.
  - Mudanças: a segmentação de partido filtra **só** a matriz (`DataFilter`); cartões, mapa e tabela ignoram o partido.
  - Perfil: a segmentação de candidato filtra **só** a dispersão; a dispersão não filtra as barras.
- Esses comportamentos foram reproduzidos página a página (ver `src/pages/*.js`).

## 11. Fontes de dados

TSE (Dados Abertos, CC-BY) e IBGE (Censo 2022 — SIDRA 4709 e 9543; PIB dos Municípios — SIDRA 5938),
consolidados em `data/eleicoes_presidente.csv` pelos scripts do repositório. Malhas: IBGE API de Malhas v3.

## 12. Regras de cálculo

Ver [`METODOLOGIA.md`](METODOLOGIA.md). Resumo: percentuais como razão de somas; `% Votos Válidos`
com denominador `REMOVEFILTERS(dCandidato)`; `TOPN` com empates concatenados por " / ";
PSL 2018 = PL nas comparações; empate conta como virada; PIB per capita ponderado pela população.

## 13. Limitações identificadas

1. **Alfabetização arredondada no PBIX.** O passo `Tipo Alterado` da consulta `Eleicoes` converte
   `alfabetizacao_2022` para `Int64.Type` antes de `type number`; 5.514 dos 5.766 municípios diferem do
   valor com decimais de `data/limpo/dMunicipio.csv` (ex.: Porto Velho 95,64 → 96). O site reproduz o PBIX
   (regra: não alterar silenciosamente). O mesmo vale para `pib_mil_reais`, mas sem efeito porque o PIB do
   arquivo já é inteiro.
2. Ordem de nomes empatados em `CONCATENATEX` não é definida no DAX; no site é alfabética.
3. `Municípios Vencidos` conta o empate para os dois (2.876 + 2.696 = 5.572 no 2º turno de 2026);
   `Municípios que Viraram` = 215 e `Municípios que Mudaram` = 716 incluem municípios com empate, por isso
   diferem dos 213 e 714 citados no README do repositório (contagem estrita).
4. Exterior sem dados do IBGE; Boa Esperança do Norte (MT) sem indicadores e sem polígono na malha IBGE usada.
5. Caminho do CSV no PBIX é absoluto (Windows).
6. O Azure Map do PBIX geocodifica por nome (`local_mapa`); o site usa o código IBGE, mais robusto.

## 14. Estratégia de extração

1. `pbix_export_all_tables_csv` → `data/raw/` (sem transformação).
2. `pbix_export_tmdl` → `data/metadata/tmdl/` (DAX e M completos).
3. `pbix_get_layout_raw` → `data/metadata/report_layout.json`; `page.json` copiados para `report_definition/`.
4. `scripts/build_data.py` só muda a **forma** (colunas → vetores alinhados por índice de município,
   um arquivo por turno) e grava somas de controle em `public/data/manifest.json`.

## 15. Estratégia de validação

Ver [`VALIDACAO.md`](VALIDACAO.md): 340 indicadores avaliados no PBIX pelo MCP comparados com o motor
JavaScript (diferença máxima 0), testes unitários (Vitest) e de ponta a ponta (Playwright).
