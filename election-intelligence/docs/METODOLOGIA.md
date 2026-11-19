# Metodologia

## 1. Fluxo

```
powerbi/eleicoes-presidenciais-br.pbix
   │  PBIX-MCP: pbix_export_all_tables_csv, pbix_export_tmdl, pbix_get_layout_raw, pbix_evaluate_dax*
   ▼
data/raw/*.csv  +  data/metadata/ (TMDL, layout, tema, referencia_mcp.json)
   │  scripts/build_data.py  (só reorganiza; nenhum valor é recalculado)
   ▼
public/data/*.json  +  public/geo/*.topo.json (IBGE)
   │  navegador: src/services/data.js (carga) → src/services/engine.js (medidas DAX em JS)
   ▼
páginas (src/pages/*) e componentes (src/components/*)
```

A camada de dados (`services/`) não conhece a interface; as páginas só pedem medidas ao motor.

## 2. Transformações (todas de forma, documentadas)

| Etapa | O que muda | O que não muda |
|---|---|---|
| Ordenação | Municípios ordenados por UF, nome e código; vira o "índice" do município | Valores |
| Colunas → vetores | Cada coluna de dMunicipio vira um vetor; cada turno vira um arquivo com vetores de comparecimento e um vetor de votos por candidato | Nenhum valor é somado, arredondado ou preenchido |
| Vazios | Ausência de linha no PBIX vira `null` (equivale a BLANK) | — |
| Malhas | TopoJSON do IBGE copiado sem simplificação adicional (qualidade "mínima" da própria API) | Códigos IBGE |

O pipeline confere que não há linhas duplicadas por chave e que `situacao_turno` é constante por
candidato e turno; grava somas de controle por turno em `manifest.json`.

## 3. Reprodução das medidas DAX

O motor (`src/services/engine.js`) recebe um **contexto de filtro** equivalente ao do Power BI:
turno (dTurno), território (região, UF, município ou conjunto de municípios — dMunicipio), exterior,
e filtro de candidato (chave, nome ou partido — dCandidato).

Regras preservadas:

- **BLANK e DIVIDE**: soma sem linhas → `null`; divisão por zero/vazio → `null`.
- **REMOVEFILTERS(dCandidato)** no denominador de `% Votos Válidos`.
- **TOPN(1)** com empates: todos os empatados, concatenados por " / " (ordem alfabética, ver limitações).
- **Margem de Vitória**: `TOPN(2)` e `MAXX − MINX` sobre os candidatos do contexto, ÷ total.
- **Municípios Vencidos**: candidato com votos > 0 e igual ao máximo do município (empate conta para todos); denominador = municípios com linhas em fVotos no contexto, sem filtro de candidato.
- **Comparação entre eleições**: sempre 1º turno do `Ano Selecionado` × 1º turno de `ano − 4`; `SUBSTITUTE(…, "PSL", "PL")` nos dois lados. Na `% Votos Válidos Eleição Anterior`, se o único partido filtrado é PL e o ano anterior é 2018, usa PSL. As variações usam o **mesmo turno** do contexto.
- **Comparação entre turnos**: vencedores do 1º e do 2º turno do ano; empate em um turno → virada.
- **PIB per capita / Alfabetização**: `SUMX(dMunicipio, indicador × população) ÷ população dos municípios com indicador`; dMunicipio não é filtrado pelo turno.
- **Quartis**: vêm prontos do PBIX (colunas calculadas com `PERCENTILE.INC`).

Medidas de cor e texto (`Cor do Partido`, `Título Eleição`, `Resumo Vencedor`, etc.) são reproduzidas
na interface (`corPartido`, `TituloEleicao`, frase de resumo).

## 4. Interações (reproduzem o relatório)

| Página | Regra herdada do PBIX |
|---|---|
| Todas | Turno global, padrão 2026 · 2º turno; persiste entre páginas e na URL |
| Visão Nacional | Cartões e votos incluem o exterior; "Municípios vencidos" exclui; a série histórica não segue o turno |
| Mapa | Mapas, tabela e região excluem o exterior |
| Comparecimento | Séries de região e brancos/nulos não seguem o turno; média Brasil sem exterior |
| Mudanças | Página sem exterior; filtro de partido só na matriz |
| 1º e 2º turno | Página sem exterior; tabela de candidatos só com quem teve votos no 2º turno |
| Perfil | Sem exterior; as três barras excluem "Sem dado" de PIB; o candidato filtra só a dispersão |

Filtros globais novos (região, UF, município, candidato, partido) são colunas do modelo e se aplicam
como filtros de dMunicipio/dCandidato. Selecionar um município define UF e região; trocar a UF limpa o
município; a lista de municípios segue a UF e a região escolhidas.

## 5. Melhorias em relação ao PBIX

- Mapa em Canvas com os 5.570 polígonos oficiais do IBGE (ligação por código, não por nome), navegação
  Brasil → Região → UF → Município, zoom e arraste, modos *vencedor*, *% do candidato* e *margem*.
- Indicador derivado "mudou de candidato vencedor" e classificação partido × candidato (mudança de
  partido ≠ mudança de candidato). Marcado como derivado na interface.
- Página **Comparar** (candidatos e territórios lado a lado), busca global (Ctrl/⌘ + K), URL
  compartilhável, exportação CSV de todas as tabelas e gráficos, painel de detalhe do município.
- Validação ao vivo na página **Sobre os dados**.

## 6. Desempenho

- Carga inicial: ~3 MB de JSON (≈ 0,7 MB com gzip) em paralelo, com barra de progresso; malhas
  (1,4 MB) só quando uma página com mapa abre.
- Páginas carregadas sob demanda (code splitting); ECharts importado por módulos.
- Mapa: polígonos projetados uma vez em `Path2D`; zoom só aplica transformação; recorte por caixa
  visível; teste de acerto por caixa + `isPointInPath`.
- Motor: resumo por município e turno (vencedor, 1º e 2º votos) calculado uma vez e reutilizado;
  seleções de municípios em cache.

## 7. Atualização dos dados (sem reconstruir o frontend)

1. Atualize o PBIX no Power BI Desktop.
2. Com o PBIX-MCP: `pbix_open` → `pbix_export_all_tables_csv` para `data/raw/` e `pbix_export_tmdl` para `data/metadata/tmdl/`.
3. Reavalie a referência com `pbix_evaluate_dax*` e atualize `data/metadata/referencia_mcp.json` (contextos descritos no próprio arquivo).
4. `npm run data` → regrava `public/data/*.json`.
5. `npm run validate` e `npm test` (devem passar sem divergência).
6. Publique: copie `public/data/` para a pasta `data/` do site já publicado, **ou** rode `npm run build`.
   O código não muda: o navegador lê os JSON na carga.

Malhas: `scripts/fetch_geo.sh` baixa de novo a malha do IBGE para `data/geo_src/`; `npm run data` copia para `public/geo/`.

## 8. Cuidados de interpretação

- Indicadores descrevem municípios, não eleitores: associação não é causalidade.
- Resultados agregados não mostram transferência individual de votos entre turnos.
- Nada no site é simulação ou projeção: todos os números são resultados do TSE consolidados no PBIX.
