# Dicionário de dados

Duas camadas: **`data/raw/`** (tabelas como saíram do PBIX pelo PBIX-MCP) e **`public/data/`**
(os mesmos valores reorganizados para o navegador).

## 1. Tabelas exportadas do PBIX (`data/raw/*.csv`, separador `,`, UTF-8 com BOM)

### fVotos — 309.308 linhas · grão: turno × município × candidato

| Coluna | Tipo | Descrição |
|---|---|---|
| chave_turno | texto | `AAAA-T` (liga a dTurno) |
| ano | inteiro | Ano da eleição |
| nr_turno | inteiro | 1 ou 2 |
| cd_municipio_tse | inteiro | Código TSE do município (liga a dMunicipio) |
| chave_candidato | texto | `AAAA-número` (liga a dCandidato) |
| situacao_turno | texto | Eleito, Não Eleito, 2º Turno (constante por candidato e turno) |
| qt_votos_nominais | decimal | Votos do candidato no município (soma das zonas) |

### fComparecimento — 45.834 linhas · grão: turno × município

| Coluna | Tipo | Descrição |
|---|---|---|
| chave_turno, ano, nr_turno, cd_municipio_tse | — | Chaves, como em fVotos |
| aptos | decimal | Eleitores aptos |
| comparecimento | decimal | Eleitores que votaram |
| abstencoes | decimal | Eleitores que não votaram |
| votos_validos | decimal | Votos nominais válidos |
| votos_brancos | decimal | Votos em branco |
| votos_nulos | decimal | Votos nulos |

### dMunicipio — 5.766 linhas (5.571 no Brasil + 195 no exterior)

| Coluna | Tipo | Descrição |
|---|---|---|
| cd_municipio_tse | inteiro | Chave |
| cd_municipio_ibge | inteiro | Código IBGE de 7 dígitos (vazio no exterior) — liga à malha |
| municipio, municipio_uf | texto | Nome e "Nome (UF)" |
| sg_uf, sg_uf_nome | texto | UF (`ZZ` = exterior) e nome |
| sg_regiao, sg_regiao_nome | texto | N, NE, SE, S, CO, EX |
| exterior | lógico | True para cidades do exterior |
| populacao_2022 | inteiro | Censo 2022 |
| alfabetizacao_2022 | decimal | % alfabetizados com 15+ anos — **inteiro no PBIX** (ver Auditoria §13) |
| pib_mil_reais | decimal | PIB municipal em R$ mil (2023) |
| pib_per_capita | decimal | pib_mil_reais × 1000 ÷ populacao_2022 |
| faixa_populacao, ordem_faixa_populacao | texto, inteiro | Até 5 mil · 5 a 20 mil · 20 a 100 mil · 100 a 500 mil · Mais de 500 mil · Sem dado |
| local_mapa | texto | "Município, UF, Brasil" (geocodificação do Azure Map) |
| Quartil PIB per capita | texto (calculada) | 1º quartil (menor PIB) … 4º quartil (maior PIB), Sem dado |
| Quartil Alfabetização | texto (calculada) | 1º quartil (menor alfabetização) … 4º, Sem dado |

### dCandidato — 47 linhas

| Coluna | Tipo | Descrição |
|---|---|---|
| ano, nr_candidato | inteiro | Ano e número de urna |
| nm_urna | texto | Nome de urna (*Proper Case*) |
| sg_partido | texto | Sigla na eleição |
| partido_atual | texto | Sigla harmonizada (PSDC → DC) |
| chave_candidato | texto | `AAAA-número` |

### dTurno — 8 linhas

`ano`, `nr_turno`, `chave_turno`, `rotulo_turno` ("2026 · 2º turno"), `ordem_turno` (ano×10+turno).

### PartidoCores — 27 linhas

`sg_partido`, `cor` (hex). Partidos sem cor própria usam `#9AA3AE`.

## 2. Camada processada (`public/data/`)

| Arquivo | Conteúdo |
|---|---|
| `meta.json` | turnos, candidatos (`chave, ano, nr, nome, sigla, partido`), `partidoCores`, UFs, regiões, faixas, quartis, `situacao[turno][candidato]` |
| `municipios.json` | vetores colunares alinhados pelo índice do município: `tse, ibge, nome, uf, exterior, pop, alfab, pib, pibpc, faixa, qPib, qAlf` (ordem: UF, nome, código) |
| `turnos/<AAAA-T>.json` | `comp.{aptos, comp, abst, validos, brancos, nulos}[índice]` e `votos[chave_candidato][índice]`; `null` = sem linha no PBIX (BLANK) |
| `medidas.json` | 55 medidas DAX: nome, expressão, formato, pasta (do TMDL) |
| `referencia_mcp.json` | valores avaliados no PBIX pelo PBIX-MCP |
| `manifest.json` | linhas de origem, somas de controle por turno, tamanhos |

`public/geo/municipios.topo.json` (objeto `BRMU`, propriedade `codarea` = código IBGE) e
`public/geo/ufs.topo.json` (objeto `BRUF`, `codarea` = código IBGE da UF): IBGE, API de Malhas v3,
qualidade mínima.

## 3. Indicadores (medidas) da aplicação

Cada indicador do site tem o nome da medida DAX que reproduz em `src/services/engine.js`:

| Indicador | Medida DAX | Definição |
|---|---|---|
| Eleitores aptos | Aptos | Σ aptos |
| Comparecimento / % | Comparecimento / % Comparecimento | Σ comparecimento; ÷ aptos |
| Abstenção / % | Abstenções / % Abstenção | Σ abstenções; ÷ aptos |
| Brancos, Nulos (%) | % Brancos, % Nulos, % Brancos e Nulos | ÷ comparecimento |
| Votos, % votos válidos | Votos, % Votos Válidos | Σ votos do candidato ÷ Σ votos de todos os candidatos |
| Posição | Posição | RANKX denso pelos votos |
| Vencedor, partido vencedor | Vencedor, Partido Vencedor | mais votado (empates juntos com " / ") |
| % do vencedor, margem | % do Vencedor, Margem de Vitória | votos do 1º ÷ total; (1º − 2º) ÷ total |
| Municípios vencidos | Municípios Vencidos, % | municípios onde o candidato tem o máximo de votos (> 0) |
| Mudou de partido vencedor | Mudou Partido Vencedor, Municípios que Mudaram, % | 1º turno do ano × 1º turno de 4 anos antes, PSL ≡ PL |
| Mudou de candidato vencedor | — (derivado, não está no PBIX) | mesma comparação pelo nome de urna |
| Virou no 2º turno | Virou no 2º Turno, Municípios que Viraram, % | vencedor 1º ≠ vencedor 2º (empate conta) |
| Votos 1º/2º turno, ganhos, variação | Votos 1º/2º Turno, Votos Ganhos, % 1º/2º, Variação entre Turnos p.p. | por candidato no ano |
| Variação vs. eleição anterior | Variação p.p., Variação Abstenção p.p. | (atual − 4 anos antes, mesmo turno) × 100 |
| PIB per capita, alfabetização | PIB per capita, Alfabetização | Σ(indicador × pop) ÷ Σ pop com dado |
| Conferência | Conferência Válidos, Diferença de Apuração | Σ candidatos = válidos; comp − (válidos + brancos + nulos) |
