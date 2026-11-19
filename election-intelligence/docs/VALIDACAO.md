# Validação

Três camadas de evidência, todas reproduzíveis:

| Camada | Como rodar | Resultado (18/11/2026) |
|---|---|---|
| Indicadores × PBIX-MCP | `npm run validate` (também ao vivo na página **Sobre os dados**) | **340 / 340 validados, 0 divergências**, diferença máxima 0 |
| Testes unitários do motor (Vitest) | `npm test` | **13 / 13** — integridade, somas de controle, semântica DAX |
| Testes de ponta a ponta (Playwright, build de produção) | `npm run test:e2e` (`PW_CHANNEL=chrome` para usar o Chrome instalado) | **18 / 18** — desktop 1440×900 e Pixel 5 (inclui contraste, alvos de toque e teclado) |

## 1. Como a referência foi obtida

Os valores da coluna "PBIX-MCP" foram calculados **dentro do PBIX** pelo motor DAX do PBIX-MCP
(`pbix_evaluate_dax`, `pbix_evaluate_dax_grouped`, `pbix_evaluate_dax_per_dimension`), com o contexto de
filtro descrito em cada grupo de `data/metadata/referencia_mcp.json`. A coluna "JavaScript" é o mesmo
indicador calculado por `src/services/engine.js` sobre `public/data/`. Tolerância: 1e-9 relativa (na
prática, todas as diferenças são exatamente 0; inteiros e textos devem ser iguais).

Para descartar ajuste ao caso, um grupo foi avaliado no MCP **depois** do motor pronto
(*Verificação cega — 2018 · 1º turno, Região Sul*: 8 medidas, incluindo Municípios que Mudaram = 999 e
Margem de Vitória) e bateu sem nenhuma alteração no código.

Cobertura: 18 medidas nacionais × 8 turnos; votos e % dos 12 candidatos do 1º turno e dos 2 do 2º turno de 2026; municípios
vencidos; mudanças e viradas (2022 e 2026); PIB per capita, alfabetização, população; resultado das
27 UFs (vencedor, % do vencedor, margem, abstenção); perfil por quartil de PIB e por porte; comparação
entre turnos; variação p.p. com a regra PSL/PL; um município (São Paulo) com 12 medidas.

## 2. Pontos de atenção verificados

| Tema | Verificação |
|---|---|
| Denominadores | `% Votos Válidos` usa a soma de todos os candidatos (REMOVEFILTERS); `% Municípios Vencidos` usa municípios com votos no contexto |
| Contexto de filtro | Exterior incluído nos cartões nacionais, excluído nos mapas/rankings (filtros de visual e de página do PBIX) |
| Totais e subtotais | Σ UFs + exterior = Brasil (teste unitário); Σ candidatos = válidos em todos os turnos |
| Percentuais | Sempre razão de somas |
| Variações p.p. | `Variação p.p.` e `Variação Abstenção p.p.` conferem; PL 2022 usa PSL 2018 (teste unitário) |
| Nulos | 2014 sem eleição anterior → vazio (teste unitário) |
| Empates | Municípios Vencidos 2.876 + 2.696 = 5.572 (1 empate); Viraram 215 e Mudaram 716 contam empates como o DAX |
| Diferenças entre turnos | Votos ganhos, % 1º/2º e variação entre turnos de Lula em 2026 conferem |
| Agregações territoriais | 27 UFs, região Sul, município de São Paulo |
| Conferência com o TSE | Tabela recalculada ao vivo; 746 votos de diferença de apuração em 2018 · 1º turno também aparecem no PBIX |

## 3. Testes de ponta a ponta (Playwright)

| Teste | O que prova |
|---|---|
| Visão Nacional 2026 · 2º | KPIs na tela = valores do MCP (158.745.502 aptos; 51,79%; 2.876 municípios) e console sem erros |
| Troca de eleição e turno | 2022 · 1º turno → comparecimento 123.682.372, Lula 48,43%; URL atualizada |
| Filtros em cascata | Região NE limita as UFs; UF PE limita os municípios; município atualiza os KPIs; "Limpar filtros" restaura |
| Navegação | 8 abas preservam turno e UF na URL; botão voltar do navegador |
| Páginas | Todas abrem sem erro de console |
| Mapa | Tooltip, clique seleciona município, migalhas, "voltar ao Brasil", nível estados, modos % do candidato e margem |
| Tabela | Ordenação e CSV (`resultado-por-uf.csv`: cabeçalho, 27 linhas, valor PI = 0,758763…) |
| Busca | Município e candidato pela paleta Ctrl+K |
| Seleção cruzada | Clique no ranking define o candidato e a dispersão do Perfil passa a usá-lo |
| Mudanças e viradas | 716 / 12,85% e 215 / 3,86% na tela; 2014 mostra estado vazio |
| Comparar | Adicionar candidato e território; CSV |
| Sobre os dados | 340/340, 0 divergências, 8 conferências ✔, 55 medidas listadas |
| Compartilhar | Link copiado contém os filtros |
| Celular | 8 páginas sem rolagem horizontal; "Mais filtros"; toque no mapa seleciona município |

Resultado completo: `docs/playwright-resultados.json`.

## 4. Tabela de referência (todos os indicadores)

Gerada de `docs/validacao_resultados.json` (saída de `npm run validate`).

| # | Grupo | Medida | Contexto | Resultado PBIX-MCP | Resultado JavaScript | Diferença | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Nacional por turno | Aptos | 2014-1 | 142.821.362 | 142.821.362 | 0 | ✅ VALIDADO |
| 2 | Nacional por turno | Comparecimento | 2014-1 | 115.122.883 | 115.122.883 | 0 | ✅ VALIDADO |
| 3 | Nacional por turno | Abstenções | 2014-1 | 27.698.475 | 27.698.475 | 0 | ✅ VALIDADO |
| 4 | Nacional por turno | Votos Válidos | 2014-1 | 104.023.802 | 104.023.802 | 0 | ✅ VALIDADO |
| 5 | Nacional por turno | Votos Brancos | 2014-1 | 4.420.489 | 4.420.489 | 0 | ✅ VALIDADO |
| 6 | Nacional por turno | Votos Nulos | 2014-1 | 6.678.592 | 6.678.592 | 0 | ✅ VALIDADO |
| 7 | Nacional por turno | % Abstenção | 2014-1 | 0.19393789985 | 0.19393789985 | 0 | ✅ VALIDADO |
| 8 | Nacional por turno | % Comparecimento | 2014-1 | 0.806062072143 | 0.806062072143 | 0 | ✅ VALIDADO |
| 9 | Nacional por turno | % Brancos | 2014-1 | 0.0383980046782 | 0.0383980046782 | 0 | ✅ VALIDADO |
| 10 | Nacional por turno | % Nulos | 2014-1 | 0.0580127236737 | 0.0580127236737 | 0 | ✅ VALIDADO |
| 11 | Nacional por turno | % Brancos e Nulos | 2014-1 | 0.0964107283519 | 0.0964107283519 | 0 | ✅ VALIDADO |
| 12 | Nacional por turno | Votos Todos os Candidatos | 2014-1 | 104.023.802 | 104.023.802 | 0 | ✅ VALIDADO |
| 13 | Nacional por turno | Diferença de Apuração | 2014-1 | 0 | 0 | 0 | ✅ VALIDADO |
| 14 | Nacional por turno | Conferência Válidos | 2014-1 | ✔ confere | ✔ confere | — | ✅ VALIDADO |
| 15 | Nacional por turno | Vencedor | 2014-1 | Dilma | Dilma | — | ✅ VALIDADO |
| 16 | Nacional por turno | % do Vencedor | 2014-1 | 0.415940074946 | 0.415940074946 | 0 | ✅ VALIDADO |
| 17 | Nacional por turno | Margem de Vitória | 2014-1 | 0.0804667474084 | 0.0804667474084 | 0 | ✅ VALIDADO |
| 18 | Nacional por turno | Municípios | 2014-1 | 5.571 | 5.571 | 0 | ✅ VALIDADO |
| 19 | Nacional por turno | Aptos | 2014-2 | 142.821.362 | 142.821.362 | 0 | ✅ VALIDADO |
| 20 | Nacional por turno | Comparecimento | 2014-2 | 112.683.879 | 112.683.879 | 0 | ✅ VALIDADO |
| 21 | Nacional por turno | Abstenções | 2014-2 | 30.137.479 | 30.137.479 | 0 | ✅ VALIDADO |
| 22 | Nacional por turno | Votos Válidos | 2014-2 | 105.542.273 | 105.542.273 | 0 | ✅ VALIDADO |
| 23 | Nacional por turno | Votos Brancos | 2014-2 | 1.921.819 | 1.921.819 | 0 | ✅ VALIDADO |
| 24 | Nacional por turno | Votos Nulos | 2014-2 | 5.219.787 | 5.219.787 | 0 | ✅ VALIDADO |
| 25 | Nacional por turno | % Abstenção | 2014-2 | 0.211015205134 | 0.211015205134 | 0 | ✅ VALIDADO |
| 26 | Nacional por turno | % Comparecimento | 2014-2 | 0.788984766859 | 0.788984766859 | 0 | ✅ VALIDADO |
| 27 | Nacional por turno | % Brancos | 2014-2 | 0.0170549595652 | 0.0170549595652 | 0 | ✅ VALIDADO |
| 28 | Nacional por turno | % Nulos | 2014-2 | 0.0463223936407 | 0.0463223936407 | 0 | ✅ VALIDADO |
| 29 | Nacional por turno | % Brancos e Nulos | 2014-2 | 0.063377353206 | 0.063377353206 | 0 | ✅ VALIDADO |
| 30 | Nacional por turno | Votos Todos os Candidatos | 2014-2 | 105.542.273 | 105.542.273 | 0 | ✅ VALIDADO |
| 31 | Nacional por turno | Diferença de Apuração | 2014-2 | 0 | 0 | 0 | ✅ VALIDADO |
| 32 | Nacional por turno | Conferência Válidos | 2014-2 | ✔ confere | ✔ confere | — | ✅ VALIDADO |
| 33 | Nacional por turno | Vencedor | 2014-2 | Dilma | Dilma | — | ✅ VALIDADO |
| 34 | Nacional por turno | % do Vencedor | 2014-2 | 0.516391361024 | 0.516391361024 | 0 | ✅ VALIDADO |
| 35 | Nacional por turno | Margem de Vitória | 2014-2 | 0.0327827220473 | 0.0327827220473 | 0 | ✅ VALIDADO |
| 36 | Nacional por turno | Municípios | 2014-2 | 5.571 | 5.571 | 0 | ✅ VALIDADO |
| 37 | Nacional por turno | Aptos | 2018-1 | 147.305.825 | 147.305.825 | 0 | ✅ VALIDADO |
| 38 | Nacional por turno | Comparecimento | 2018-1 | 117.364.654 | 117.364.654 | 0 | ✅ VALIDADO |
| 39 | Nacional por turno | Abstenções | 2018-1 | 29.941.171 | 29.941.171 | 0 | ✅ VALIDADO |
| 40 | Nacional por turno | Votos Válidos | 2018-1 | 107.050.749 | 107.050.749 | 0 | ✅ VALIDADO |
| 41 | Nacional por turno | Votos Brancos | 2018-1 | 3.106.937 | 3.106.937 | 0 | ✅ VALIDADO |
| 42 | Nacional por turno | Votos Nulos | 2018-1 | 7.206.222 | 7.206.222 | 0 | ✅ VALIDADO |
| 43 | Nacional por turno | % Abstenção | 2018-1 | 0.203258567677 | 0.203258567677 | 0 | ✅ VALIDADO |
| 44 | Nacional por turno | % Comparecimento | 2018-1 | 0.796741432323 | 0.796741432323 | 0 | ✅ VALIDADO |
| 45 | Nacional por turno | % Brancos | 2018-1 | 0.0264725101989 | 0.0264725101989 | 0 | ✅ VALIDADO |
| 46 | Nacional por turno | % Nulos | 2018-1 | 0.0614002747369 | 0.0614002747369 | 0 | ✅ VALIDADO |
| 47 | Nacional por turno | % Brancos e Nulos | 2018-1 | 0.0878727849357 | 0.0878727849357 | 0 | ✅ VALIDADO |
| 48 | Nacional por turno | Votos Todos os Candidatos | 2018-1 | 107.050.749 | 107.050.749 | 0 | ✅ VALIDADO |
| 49 | Nacional por turno | Diferença de Apuração | 2018-1 | 746 | 746 | 0 | ✅ VALIDADO |
| 50 | Nacional por turno | Conferência Válidos | 2018-1 | ✔ confere | ✔ confere | — | ✅ VALIDADO |
| 51 | Nacional por turno | Vencedor | 2018-1 | Jair Bolsonaro | Jair Bolsonaro | — | ✅ VALIDADO |
| 52 | Nacional por turno | % do Vencedor | 2018-1 | 0.460314481312 | 0.460314481312 | 0 | ✅ VALIDADO |
| 53 | Nacional por turno | Margem de Vitória | 2018-1 | 0.167536978186 | 0.167536978186 | 0 | ✅ VALIDADO |
| 54 | Nacional por turno | Municípios | 2018-1 | 5.571 | 5.571 | 0 | ✅ VALIDADO |
| 55 | Nacional por turno | Aptos | 2018-2 | 147.305.824 | 147.305.824 | 0 | ✅ VALIDADO |
| 56 | Nacional por turno | Comparecimento | 2018-2 | 115.933.451 | 115.933.451 | 0 | ✅ VALIDADO |
| 57 | Nacional por turno | Abstenções | 2018-2 | 31.372.373 | 31.372.373 | 0 | ✅ VALIDADO |
| 58 | Nacional por turno | Votos Válidos | 2018-2 | 104.838.753 | 104.838.753 | 0 | ✅ VALIDADO |
| 59 | Nacional por turno | Votos Brancos | 2018-2 | 2.486.593 | 2.486.593 | 0 | ✅ VALIDADO |
| 60 | Nacional por turno | Votos Nulos | 2018-2 | 8.608.105 | 8.608.105 | 0 | ✅ VALIDADO |
| 61 | Nacional por turno | % Abstenção | 2018-2 | 0.212974423876 | 0.212974423876 | 0 | ✅ VALIDADO |
| 62 | Nacional por turno | % Comparecimento | 2018-2 | 0.787025576124 | 0.787025576124 | 0 | ✅ VALIDADO |
| 63 | Nacional por turno | % Brancos | 2018-2 | 0.0214484514914 | 0.0214484514914 | 0 | ✅ VALIDADO |
| 64 | Nacional por turno | % Nulos | 2018-2 | 0.0742503990501 | 0.0742503990501 | 0 | ✅ VALIDADO |
| 65 | Nacional por turno | % Brancos e Nulos | 2018-2 | 0.0956988505414 | 0.0956988505414 | 0 | ✅ VALIDADO |
| 66 | Nacional por turno | Votos Todos os Candidatos | 2018-2 | 104.838.753 | 104.838.753 | 0 | ✅ VALIDADO |
| 67 | Nacional por turno | Diferença de Apuração | 2018-2 | 0 | 0 | 0 | ✅ VALIDADO |
| 68 | Nacional por turno | Conferência Válidos | 2018-2 | ✔ confere | ✔ confere | — | ✅ VALIDADO |
| 69 | Nacional por turno | Vencedor | 2018-2 | Jair Bolsonaro | Jair Bolsonaro | — | ✅ VALIDADO |
| 70 | Nacional por turno | % do Vencedor | 2018-2 | 0.5513023128 | 0.5513023128 | 0 | ✅ VALIDADO |
| 71 | Nacional por turno | Margem de Vitória | 2018-2 | 0.102604625601 | 0.102604625601 | 0 | ✅ VALIDADO |
| 72 | Nacional por turno | Municípios | 2018-2 | 5.571 | 5.571 | 0 | ✅ VALIDADO |
| 73 | Nacional por turno | Aptos | 2022-1 | 156.454.011 | 156.454.011 | 0 | ✅ VALIDADO |
| 74 | Nacional por turno | Comparecimento | 2022-1 | 123.682.372 | 123.682.372 | 0 | ✅ VALIDADO |
| 75 | Nacional por turno | Abstenções | 2022-1 | 32.770.982 | 32.770.982 | 0 | ✅ VALIDADO |
| 76 | Nacional por turno | Votos Válidos | 2022-1 | 118.229.719 | 118.229.719 | 0 | ✅ VALIDADO |
| 77 | Nacional por turno | Votos Brancos | 2022-1 | 1.964.779 | 1.964.779 | 0 | ✅ VALIDADO |
| 78 | Nacional por turno | Votos Nulos | 2022-1 | 3.487.874 | 3.487.874 | 0 | ✅ VALIDADO |
| 79 | Nacional por turno | % Abstenção | 2022-1 | 0.209460798036 | 0.209460798036 | 0 | ✅ VALIDADO |
| 80 | Nacional por turno | % Comparecimento | 2022-1 | 0.790535002647 | 0.790535002647 | 0 | ✅ VALIDADO |
| 81 | Nacional por turno | % Brancos | 2022-1 | 0.0158856833697 | 0.0158856833697 | 0 | ✅ VALIDADO |
| 82 | Nacional por turno | % Nulos | 2022-1 | 0.0282002515282 | 0.0282002515282 | 0 | ✅ VALIDADO |
| 83 | Nacional por turno | % Brancos e Nulos | 2022-1 | 0.0440859348978 | 0.0440859348978 | 0 | ✅ VALIDADO |
| 84 | Nacional por turno | Votos Todos os Candidatos | 2022-1 | 118.229.719 | 118.229.719 | 0 | ✅ VALIDADO |
| 85 | Nacional por turno | Diferença de Apuração | 2022-1 | 0 | 0 | 0 | ✅ VALIDADO |
| 86 | Nacional por turno | Conferência Válidos | 2022-1 | ✔ confere | ✔ confere | — | ✅ VALIDADO |
| 87 | Nacional por turno | Vencedor | 2022-1 | Lula | Lula | — | ✅ VALIDADO |
| 88 | Nacional por turno | % do Vencedor | 2022-1 | 0.484307198599 | 0.484307198599 | 0 | ✅ VALIDADO |
| 89 | Nacional por turno | Margem de Vitória | 2022-1 | 0.0523316730542 | 0.0523316730542 | 0 | ✅ VALIDADO |
| 90 | Nacional por turno | Municípios | 2022-1 | 5.571 | 5.571 | 0 | ✅ VALIDADO |
| 91 | Nacional por turno | Aptos | 2022-2 | 156.454.011 | 156.454.011 | 0 | ✅ VALIDADO |
| 92 | Nacional por turno | Comparecimento | 2022-2 | 124.252.796 | 124.252.796 | 0 | ✅ VALIDADO |
| 93 | Nacional por turno | Abstenções | 2022-2 | 32.200.558 | 32.200.558 | 0 | ✅ VALIDADO |
| 94 | Nacional por turno | Votos Válidos | 2022-2 | 118.552.353 | 118.552.353 | 0 | ✅ VALIDADO |
| 95 | Nacional por turno | Votos Brancos | 2022-2 | 1.769.678 | 1.769.678 | 0 | ✅ VALIDADO |
| 96 | Nacional por turno | Votos Nulos | 2022-2 | 3.930.765 | 3.930.765 | 0 | ✅ VALIDADO |
| 97 | Nacional por turno | % Abstenção | 2022-2 | 0.205814844849 | 0.205814844849 | 0 | ✅ VALIDADO |
| 98 | Nacional por turno | % Comparecimento | 2022-2 | 0.794180955834 | 0.794180955834 | 0 | ✅ VALIDADO |
| 99 | Nacional por turno | % Brancos | 2022-2 | 0.0142425607871 | 0.0142425607871 | 0 | ✅ VALIDADO |
| 100 | Nacional por turno | % Nulos | 2022-2 | 0.0316352237257 | 0.0316352237257 | 0 | ✅ VALIDADO |
| 101 | Nacional por turno | % Brancos e Nulos | 2022-2 | 0.0458777845128 | 0.0458777845128 | 0 | ✅ VALIDADO |
| 102 | Nacional por turno | Votos Todos os Candidatos | 2022-2 | 118.552.353 | 118.552.353 | 0 | ✅ VALIDADO |
| 103 | Nacional por turno | Diferença de Apuração | 2022-2 | 0 | 0 | 0 | ✅ VALIDADO |
| 104 | Nacional por turno | Conferência Válidos | 2022-2 | ✔ confere | ✔ confere | — | ✅ VALIDADO |
| 105 | Nacional por turno | Vencedor | 2022-2 | Lula | Lula | — | ✅ VALIDADO |
| 106 | Nacional por turno | % do Vencedor | 2022-2 | 0.509024051172 | 0.509024051172 | 0 | ✅ VALIDADO |
| 107 | Nacional por turno | Margem de Vitória | 2022-2 | 0.0180481023434 | 0.0180481023434 | 0 | ✅ VALIDADO |
| 108 | Nacional por turno | Municípios | 2022-2 | 5.571 | 5.571 | 0 | ✅ VALIDADO |
| 109 | Nacional por turno | Aptos | 2026-1 | 158.745.502 | 158.745.502 | 0 | ✅ VALIDADO |
| 110 | Nacional por turno | Comparecimento | 2026-1 | 125.275.835 | 125.275.835 | 0 | ✅ VALIDADO |
| 111 | Nacional por turno | Abstenções | 2026-1 | 33.469.244 | 33.469.244 | 0 | ✅ VALIDADO |
| 112 | Nacional por turno | Votos Válidos | 2026-1 | 119.300.788 | 119.300.788 | 0 | ✅ VALIDADO |
| 113 | Nacional por turno | Votos Brancos | 2026-1 | 2.300.798 | 2.300.798 | 0 | ✅ VALIDADO |
| 114 | Nacional por turno | Votos Nulos | 2026-1 | 3.674.249 | 3.674.249 | 0 | ✅ VALIDADO |
| 115 | Nacional por turno | % Abstenção | 2026-1 | 0.210835857258 | 0.210835857258 | 0 | ✅ VALIDADO |
| 116 | Nacional por turno | % Comparecimento | 2026-1 | 0.7891614781 | 0.7891614781 | 0 | ✅ VALIDADO |
| 117 | Nacional por turno | % Brancos | 2026-1 | 0.0183658564319 | 0.0183658564319 | 0 | ✅ VALIDADO |
| 118 | Nacional por turno | % Nulos | 2026-1 | 0.0293292716828 | 0.0293292716828 | 0 | ✅ VALIDADO |
| 119 | Nacional por turno | % Brancos e Nulos | 2026-1 | 0.0476951281147 | 0.0476951281147 | 0 | ✅ VALIDADO |
| 120 | Nacional por turno | Votos Todos os Candidatos | 2026-1 | 119.300.788 | 119.300.788 | 0 | ✅ VALIDADO |
| 121 | Nacional por turno | Diferença de Apuração | 2026-1 | 0 | 0 | 0 | ✅ VALIDADO |
| 122 | Nacional por turno | Conferência Válidos | 2026-1 | ✔ confere | ✔ confere | — | ✅ VALIDADO |
| 123 | Nacional por turno | Vencedor | 2026-1 | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 124 | Nacional por turno | % do Vencedor | 2026-1 | 0.470277723564 | 0.470277723564 | 0 | ✅ VALIDADO |
| 125 | Nacional por turno | Margem de Vitória | 2026-1 | 0.0186500444574 | 0.0186500444574 | 0 | ✅ VALIDADO |
| 126 | Nacional por turno | Municípios | 2026-1 | 5.571 | 5.571 | 0 | ✅ VALIDADO |
| 127 | Nacional por turno | Aptos | 2026-2 | 158.745.502 | 158.745.502 | 0 | ✅ VALIDADO |
| 128 | Nacional por turno | Comparecimento | 2026-2 | 128.236.074 | 128.236.074 | 0 | ✅ VALIDADO |
| 129 | Nacional por turno | Abstenções | 2026-2 | 30.509.005 | 30.509.005 | 0 | ✅ VALIDADO |
| 130 | Nacional por turno | Votos Válidos | 2026-2 | 124.082.273 | 124.082.273 | 0 | ✅ VALIDADO |
| 131 | Nacional por turno | Votos Brancos | 2026-2 | 1.430.496 | 1.430.496 | 0 | ✅ VALIDADO |
| 132 | Nacional por turno | Votos Nulos | 2026-2 | 2.723.305 | 2.723.305 | 0 | ✅ VALIDADO |
| 133 | Nacional por turno | % Abstenção | 2026-2 | 0.192188154093 | 0.192188154093 | 0 | ✅ VALIDADO |
| 134 | Nacional por turno | % Comparecimento | 2026-2 | 0.807809181264 | 0.807809181264 | 0 | ✅ VALIDADO |
| 135 | Nacional por turno | % Brancos | 2026-2 | 0.0111551761948 | 0.0111551761948 | 0 | ✅ VALIDADO |
| 136 | Nacional por turno | % Nulos | 2026-2 | 0.0212366529562 | 0.0212366529562 | 0 | ✅ VALIDADO |
| 137 | Nacional por turno | % Brancos e Nulos | 2026-2 | 0.032391829151 | 0.032391829151 | 0 | ✅ VALIDADO |
| 138 | Nacional por turno | Votos Todos os Candidatos | 2026-2 | 124.082.273 | 124.082.273 | 0 | ✅ VALIDADO |
| 139 | Nacional por turno | Diferença de Apuração | 2026-2 | 0 | 0 | 0 | ✅ VALIDADO |
| 140 | Nacional por turno | Conferência Válidos | 2026-2 | ✔ confere | ✔ confere | — | ✅ VALIDADO |
| 141 | Nacional por turno | Vencedor | 2026-2 | Lula | Lula | — | ✅ VALIDADO |
| 142 | Nacional por turno | % do Vencedor | 2026-2 | 0.517851828843 | 0.517851828843 | 0 | ✅ VALIDADO |
| 143 | Nacional por turno | Margem de Vitória | 2026-2 | 0.0357036576853 | 0.0357036576853 | 0 | ✅ VALIDADO |
| 144 | Nacional por turno | Municípios | 2026-2 | 5.571 | 5.571 | 0 | ✅ VALIDADO |
| 145 | Candidatos | Votos | 2026-2 · Lula | 64.256.232 | 64.256.232 | 0 | ✅ VALIDADO |
| 146 | Candidatos | % Votos Válidos | 2026-2 · Lula | 0.517851828843 | 0.517851828843 | 0 | ✅ VALIDADO |
| 147 | Candidatos | Posição | 2026-2 · Lula | 1 | 1 | 0 | ✅ VALIDADO |
| 148 | Candidatos | Votos | 2026-2 · Flavio Bolsonaro | 59.826.041 | 59.826.041 | 0 | ✅ VALIDADO |
| 149 | Candidatos | % Votos Válidos | 2026-2 · Flavio Bolsonaro | 0.482148171157 | 0.482148171157 | 0 | ✅ VALIDADO |
| 150 | Candidatos | Votos | 2026-1 · Flavio Bolsonaro | 56.104.503 | 56.104.503 | 0 | ✅ VALIDADO |
| 151 | Candidatos | % Votos Válidos | 2026-1 · Flavio Bolsonaro | 0.470277723564 | 0.470277723564 | 0 | ✅ VALIDADO |
| 152 | Candidatos | Votos | 2026-1 · Lula | 53.879.538 | 53.879.538 | 0 | ✅ VALIDADO |
| 153 | Candidatos | % Votos Válidos | 2026-1 · Lula | 0.451627679106 | 0.451627679106 | 0 | ✅ VALIDADO |
| 154 | Candidatos | Votos | 2026-1 · Escritor Augusto Cury | 3.448.569 | 3.448.569 | 0 | ✅ VALIDADO |
| 155 | Candidatos | % Votos Válidos | 2026-1 · Escritor Augusto Cury | 0.0289065064683 | 0.0289065064683 | 0 | ✅ VALIDADO |
| 156 | Candidatos | Votos | 2026-1 · Renan Santos | 2.675.887 | 2.675.887 | 0 | ✅ VALIDADO |
| 157 | Candidatos | % Votos Válidos | 2026-1 · Renan Santos | 0.0224297512603 | 0.0224297512603 | 0 | ✅ VALIDADO |
| 158 | Candidatos | Votos | 2026-1 · Ronaldo Caiado | 2.605.148 | 2.605.148 | 0 | ✅ VALIDADO |
| 159 | Candidatos | % Votos Válidos | 2026-1 · Ronaldo Caiado | 0.021836804632 | 0.021836804632 | 0 | ✅ VALIDADO |
| 160 | Candidatos | Votos | 2026-1 · Zema | 326.488 | 326.488 | 0 | ✅ VALIDADO |
| 161 | Candidatos | % Votos Válidos | 2026-1 · Zema | 0.0027366793252 | 0.0027366793252 | 0 | ✅ VALIDADO |
| 162 | Candidatos | Votos | 2026-1 · Samara | 122.911 | 122.911 | 0 | ✅ VALIDADO |
| 163 | Candidatos | % Votos Válidos | 2026-1 · Samara | 0.00103026142627 | 0.00103026142627 | 0 | ✅ VALIDADO |
| 164 | Candidatos | Votos | 2026-1 · Hertz Dias | 43.103 | 43.103 | 0 | ✅ VALIDADO |
| 165 | Candidatos | % Votos Válidos | 2026-1 · Hertz Dias | 0.000361296859162 | 0.000361296859162 | 0 | ✅ VALIDADO |
| 166 | Candidatos | Votos | 2026-1 · Clariana Barao | 40.043 | 40.043 | 0 | ✅ VALIDADO |
| 167 | Candidatos | % Votos Válidos | 2026-1 · Clariana Barao | 0.000335647405782 | 0.000335647405782 | 0 | ✅ VALIDADO |
| 168 | Candidatos | Votos | 2026-1 · Edmilson Costa | 22.693 | 22.693 | 0 | ✅ VALIDADO |
| 169 | Candidatos | % Votos Válidos | 2026-1 · Edmilson Costa | 0.000190216681553 | 0.000190216681553 | 0 | ✅ VALIDADO |
| 170 | Candidatos | Votos | 2026-1 · Veterinário Wilson Grassi | 16.881 | 16.881 | 0 | ✅ VALIDADO |
| 171 | Candidatos | % Votos Válidos | 2026-1 · Veterinário Wilson Grassi | 0.00014149948448 | 0.00014149948448 | 0 | ✅ VALIDADO |
| 172 | Candidatos | Votos | 2026-1 · Rui Costa Pimenta | 15.024 | 15.024 | 0 | ✅ VALIDADO |
| 173 | Candidatos | % Votos Válidos | 2026-1 · Rui Costa Pimenta | 0.000125933786791 | 0.000125933786791 | 0 | ✅ VALIDADO |
| 174 | Municípios vencidos | Municípios Vencidos | 2026-2 · Lula · sem exterior | 2.876 | 2.876 | 0 | ✅ VALIDADO |
| 175 | Municípios vencidos | % Municípios Vencidos | 2026-2 · Lula · sem exterior | 0.516244839347 | 0.516244839347 | 0 | ✅ VALIDADO |
| 176 | Municípios vencidos | Municípios Vencidos | 2026-2 · Flavio Bolsonaro · sem exterior | 2.696 | 2.696 | 0 | ✅ VALIDADO |
| 177 | Municípios vencidos | Votos | 2026-2 · Flavio Bolsonaro · sem exterior | 59.654.544 | 59.654.544 | 0 | ✅ VALIDADO |
| 178 | Municípios vencidos | % Votos Válidos | 2026-2 · Flavio Bolsonaro · sem exterior | 0.482210363472 | 0.482210363472 | 0 | ✅ VALIDADO |
| 179 | Comparações | Municípios que Viraram | 2026-2 · sem exterior | 215 | 215 | 0 | ✅ VALIDADO |
| 180 | Comparações | % Municípios que Viraram | 2026-2 · sem exterior | 0.0385927122599 | 0.0385927122599 | 0 | ✅ VALIDADO |
| 181 | Comparações | Municípios que Mudaram | 2026-2 · sem exterior | 716 | 716 | 0 | ✅ VALIDADO |
| 182 | Comparações | % Municípios que Mudaram | 2026-2 · sem exterior | 0.128545780969 | 0.128545780969 | 0 | ✅ VALIDADO |
| 183 | Comparações | PIB per capita | 2026-2 · sem exterior | 53886.6687103 | 53886.6687103 | 0 | ✅ VALIDADO |
| 184 | Comparações | Alfabetização | 2026-2 · sem exterior | 92.8573990339 | 92.8573990339 | 0 | ✅ VALIDADO |
| 185 | Comparações | Municípios | 2026-2 · sem exterior | 5.571 | 5.571 | 0 | ✅ VALIDADO |
| 186 | Comparações | População 2022 | 2026-2 · sem exterior | 203.080.756 | 203.080.756 | 0 | ✅ VALIDADO |
| 187 | Comparações | Municípios que Mudaram | 2022-2 · sem exterior | 813 | 813 | 0 | ✅ VALIDADO |
| 188 | Comparações | Municípios que Viraram | 2022-2 · sem exterior | 256 | 256 | 0 | ✅ VALIDADO |
| 189 | Comparações | Variação Abstenção p.p. | 2022-2 · sem exterior | -0.74017681242 | -0.74017681242 | 0 | ✅ VALIDADO |
| 190 | Comparações | % Abstenção Eleição Anterior | 2022-2 · sem exterior | 0.211664872132 | 0.211664872132 | 0 | ✅ VALIDADO |
| 191 | UF (2026 · 2º turno) | % Abstenção | AC | 0.260806726249 | 0.260806726249 | 0 | ✅ VALIDADO |
| 192 | UF (2026 · 2º turno) | Vencedor | AC | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 193 | UF (2026 · 2º turno) | % do Vencedor | AC | 0.665655626197 | 0.665655626197 | 0 | ✅ VALIDADO |
| 194 | UF (2026 · 2º turno) | Margem de Vitória | AC | 0.331311252395 | 0.331311252395 | 0 | ✅ VALIDADO |
| 195 | UF (2026 · 2º turno) | % Abstenção | AL | 0.200832404822 | 0.200832404822 | 0 | ✅ VALIDADO |
| 196 | UF (2026 · 2º turno) | Vencedor | AL | Lula | Lula | — | ✅ VALIDADO |
| 197 | UF (2026 · 2º turno) | % do Vencedor | AL | 0.607678563614 | 0.607678563614 | 0 | ✅ VALIDADO |
| 198 | UF (2026 · 2º turno) | Margem de Vitória | AL | 0.215357127229 | 0.215357127229 | 0 | ✅ VALIDADO |
| 199 | UF (2026 · 2º turno) | % Abstenção | AM | 0.216747223047 | 0.216747223047 | 0 | ✅ VALIDADO |
| 200 | UF (2026 · 2º turno) | Vencedor | AM | Lula | Lula | — | ✅ VALIDADO |
| 201 | UF (2026 · 2º turno) | % do Vencedor | AM | 0.540201732368 | 0.540201732368 | 0 | ✅ VALIDADO |
| 202 | UF (2026 · 2º turno) | Margem de Vitória | AM | 0.080403464735 | 0.080403464735 | 0 | ✅ VALIDADO |
| 203 | UF (2026 · 2º turno) | % Abstenção | AP | 0.254693106377 | 0.254693106377 | 0 | ✅ VALIDADO |
| 204 | UF (2026 · 2º turno) | Vencedor | AP | Lula | Lula | — | ✅ VALIDADO |
| 205 | UF (2026 · 2º turno) | % do Vencedor | AP | 0.528808799882 | 0.528808799882 | 0 | ✅ VALIDADO |
| 206 | UF (2026 · 2º turno) | Margem de Vitória | AP | 0.0576175997647 | 0.0576175997647 | 0 | ✅ VALIDADO |
| 207 | UF (2026 · 2º turno) | % Abstenção | BA | 0.167140653967 | 0.167140653967 | 0 | ✅ VALIDADO |
| 208 | UF (2026 · 2º turno) | Vencedor | BA | Lula | Lula | — | ✅ VALIDADO |
| 209 | UF (2026 · 2º turno) | % do Vencedor | BA | 0.713134423845 | 0.713134423845 | 0 | ✅ VALIDADO |
| 210 | UF (2026 · 2º turno) | Margem de Vitória | BA | 0.42626884769 | 0.42626884769 | 0 | ✅ VALIDADO |
| 211 | UF (2026 · 2º turno) | % Abstenção | CE | 0.1388801663 | 0.1388801663 | 0 | ✅ VALIDADO |
| 212 | UF (2026 · 2º turno) | Vencedor | CE | Lula | Lula | — | ✅ VALIDADO |
| 213 | UF (2026 · 2º turno) | % do Vencedor | CE | 0.6892756714 | 0.6892756714 | 0 | ✅ VALIDADO |
| 214 | UF (2026 · 2º turno) | Margem de Vitória | CE | 0.3785513428 | 0.3785513428 | 0 | ✅ VALIDADO |
| 215 | UF (2026 · 2º turno) | % Abstenção | DF | 0.172959656839 | 0.172959656839 | 0 | ✅ VALIDADO |
| 216 | UF (2026 · 2º turno) | Vencedor | DF | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 217 | UF (2026 · 2º turno) | % do Vencedor | DF | 0.542752910904 | 0.542752910904 | 0 | ✅ VALIDADO |
| 218 | UF (2026 · 2º turno) | Margem de Vitória | DF | 0.0855058218074 | 0.0855058218074 | 0 | ✅ VALIDADO |
| 219 | UF (2026 · 2º turno) | % Abstenção | ES | 0.19465087088 | 0.19465087088 | 0 | ✅ VALIDADO |
| 220 | UF (2026 · 2º turno) | Vencedor | ES | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 221 | UF (2026 · 2º turno) | % do Vencedor | ES | 0.563693217718 | 0.563693217718 | 0 | ✅ VALIDADO |
| 222 | UF (2026 · 2º turno) | Margem de Vitória | ES | 0.127386435436 | 0.127386435436 | 0 | ✅ VALIDADO |
| 223 | UF (2026 · 2º turno) | % Abstenção | GO | 0.203351714486 | 0.203351714486 | 0 | ✅ VALIDADO |
| 224 | UF (2026 · 2º turno) | Vencedor | GO | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 225 | UF (2026 · 2º turno) | % do Vencedor | GO | 0.596642133624 | 0.596642133624 | 0 | ✅ VALIDADO |
| 226 | UF (2026 · 2º turno) | Margem de Vitória | GO | 0.193284267248 | 0.193284267248 | 0 | ✅ VALIDADO |
| 227 | UF (2026 · 2º turno) | % Abstenção | MA | 0.20360177957 | 0.20360177957 | 0 | ✅ VALIDADO |
| 228 | UF (2026 · 2º turno) | Vencedor | MA | Lula | Lula | — | ✅ VALIDADO |
| 229 | UF (2026 · 2º turno) | % do Vencedor | MA | 0.695416177794 | 0.695416177794 | 0 | ✅ VALIDADO |
| 230 | UF (2026 · 2º turno) | Margem de Vitória | MA | 0.390832355588 | 0.390832355588 | 0 | ✅ VALIDADO |
| 231 | UF (2026 · 2º turno) | % Abstenção | MG | 0.203268490675 | 0.203268490675 | 0 | ✅ VALIDADO |
| 232 | UF (2026 · 2º turno) | Vencedor | MG | Lula | Lula | — | ✅ VALIDADO |
| 233 | UF (2026 · 2º turno) | % do Vencedor | MG | 0.504340268334 | 0.504340268334 | 0 | ✅ VALIDADO |
| 234 | UF (2026 · 2º turno) | Margem de Vitória | MG | 0.00868053666813 | 0.00868053666813 | 0 | ✅ VALIDADO |
| 235 | UF (2026 · 2º turno) | % Abstenção | MS | 0.212393371589 | 0.212393371589 | 0 | ✅ VALIDADO |
| 236 | UF (2026 · 2º turno) | Vencedor | MS | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 237 | UF (2026 · 2º turno) | % do Vencedor | MS | 0.596000295466 | 0.596000295466 | 0 | ✅ VALIDADO |
| 238 | UF (2026 · 2º turno) | Margem de Vitória | MS | 0.192000590931 | 0.192000590931 | 0 | ✅ VALIDADO |
| 239 | UF (2026 · 2º turno) | % Abstenção | MT | 0.20946563508 | 0.20946563508 | 0 | ✅ VALIDADO |
| 240 | UF (2026 · 2º turno) | Vencedor | MT | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 241 | UF (2026 · 2º turno) | % do Vencedor | MT | 0.660598181361 | 0.660598181361 | 0 | ✅ VALIDADO |
| 242 | UF (2026 · 2º turno) | Margem de Vitória | MT | 0.321196362723 | 0.321196362723 | 0 | ✅ VALIDADO |
| 243 | UF (2026 · 2º turno) | % Abstenção | PA | 0.203206195786 | 0.203206195786 | 0 | ✅ VALIDADO |
| 244 | UF (2026 · 2º turno) | Vencedor | PA | Lula | Lula | — | ✅ VALIDADO |
| 245 | UF (2026 · 2º turno) | % do Vencedor | PA | 0.550150305017 | 0.550150305017 | 0 | ✅ VALIDADO |
| 246 | UF (2026 · 2º turno) | Margem de Vitória | PA | 0.100300610033 | 0.100300610033 | 0 | ✅ VALIDADO |
| 247 | UF (2026 · 2º turno) | % Abstenção | PB | 0.155420735037 | 0.155420735037 | 0 | ✅ VALIDADO |
| 248 | UF (2026 · 2º turno) | Vencedor | PB | Lula | Lula | — | ✅ VALIDADO |
| 249 | UF (2026 · 2º turno) | % do Vencedor | PB | 0.674643670873 | 0.674643670873 | 0 | ✅ VALIDADO |
| 250 | UF (2026 · 2º turno) | Margem de Vitória | PB | 0.349287341747 | 0.349287341747 | 0 | ✅ VALIDADO |
| 251 | UF (2026 · 2º turno) | % Abstenção | PE | 0.15183795276 | 0.15183795276 | 0 | ✅ VALIDADO |
| 252 | UF (2026 · 2º turno) | Vencedor | PE | Lula | Lula | — | ✅ VALIDADO |
| 253 | UF (2026 · 2º turno) | % do Vencedor | PE | 0.692011199202 | 0.692011199202 | 0 | ✅ VALIDADO |
| 254 | UF (2026 · 2º turno) | Margem de Vitória | PE | 0.384022398403 | 0.384022398403 | 0 | ✅ VALIDADO |
| 255 | UF (2026 · 2º turno) | % Abstenção | PI | 0.171873353557 | 0.171873353557 | 0 | ✅ VALIDADO |
| 256 | UF (2026 · 2º turno) | Vencedor | PI | Lula | Lula | — | ✅ VALIDADO |
| 257 | UF (2026 · 2º turno) | % do Vencedor | PI | 0.758763455067 | 0.758763455067 | 0 | ✅ VALIDADO |
| 258 | UF (2026 · 2º turno) | Margem de Vitória | PI | 0.517526910133 | 0.517526910133 | 0 | ✅ VALIDADO |
| 259 | UF (2026 · 2º turno) | % Abstenção | PR | 0.180445336158 | 0.180445336158 | 0 | ✅ VALIDADO |
| 260 | UF (2026 · 2º turno) | Vencedor | PR | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 261 | UF (2026 · 2º turno) | % do Vencedor | PR | 0.625762108432 | 0.625762108432 | 0 | ✅ VALIDADO |
| 262 | UF (2026 · 2º turno) | Margem de Vitória | PR | 0.251524216865 | 0.251524216865 | 0 | ✅ VALIDADO |
| 263 | UF (2026 · 2º turno) | % Abstenção | RJ | 0.216221767702 | 0.216221767702 | 0 | ✅ VALIDADO |
| 264 | UF (2026 · 2º turno) | Vencedor | RJ | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 265 | UF (2026 · 2º turno) | % do Vencedor | RJ | 0.531005423432 | 0.531005423432 | 0 | ✅ VALIDADO |
| 266 | UF (2026 · 2º turno) | Margem de Vitória | RJ | 0.0620108468645 | 0.0620108468645 | 0 | ✅ VALIDADO |
| 267 | UF (2026 · 2º turno) | % Abstenção | RN | 0.160550884687 | 0.160550884687 | 0 | ✅ VALIDADO |
| 268 | UF (2026 · 2º turno) | Vencedor | RN | Lula | Lula | — | ✅ VALIDADO |
| 269 | UF (2026 · 2º turno) | % do Vencedor | RN | 0.657179318505 | 0.657179318505 | 0 | ✅ VALIDADO |
| 270 | UF (2026 · 2º turno) | Margem de Vitória | RN | 0.314358637009 | 0.314358637009 | 0 | ✅ VALIDADO |
| 271 | UF (2026 · 2º turno) | % Abstenção | RO | 0.219157359909 | 0.219157359909 | 0 | ✅ VALIDADO |
| 272 | UF (2026 · 2º turno) | Vencedor | RO | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 273 | UF (2026 · 2º turno) | % do Vencedor | RO | 0.69608021238 | 0.69608021238 | 0 | ✅ VALIDADO |
| 274 | UF (2026 · 2º turno) | Margem de Vitória | RO | 0.392160424761 | 0.392160424761 | 0 | ✅ VALIDADO |
| 275 | UF (2026 · 2º turno) | % Abstenção | RR | 0.231466354535 | 0.231466354535 | 0 | ✅ VALIDADO |
| 276 | UF (2026 · 2º turno) | Vencedor | RR | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 277 | UF (2026 · 2º turno) | % do Vencedor | RR | 0.724569562636 | 0.724569562636 | 0 | ✅ VALIDADO |
| 278 | UF (2026 · 2º turno) | Margem de Vitória | RR | 0.449139125272 | 0.449139125272 | 0 | ✅ VALIDADO |
| 279 | UF (2026 · 2º turno) | % Abstenção | RS | 0.191576986449 | 0.191576986449 | 0 | ✅ VALIDADO |
| 280 | UF (2026 · 2º turno) | Vencedor | RS | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 281 | UF (2026 · 2º turno) | % do Vencedor | RS | 0.578357737728 | 0.578357737728 | 0 | ✅ VALIDADO |
| 282 | UF (2026 · 2º turno) | Margem de Vitória | RS | 0.156715475457 | 0.156715475457 | 0 | ✅ VALIDADO |
| 283 | UF (2026 · 2º turno) | % Abstenção | SC | 0.169561826129 | 0.169561826129 | 0 | ✅ VALIDADO |
| 284 | UF (2026 · 2º turno) | Vencedor | SC | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 285 | UF (2026 · 2º turno) | % do Vencedor | SC | 0.694222450271 | 0.694222450271 | 0 | ✅ VALIDADO |
| 286 | UF (2026 · 2º turno) | Margem de Vitória | SC | 0.388444900542 | 0.388444900542 | 0 | ✅ VALIDADO |
| 287 | UF (2026 · 2º turno) | % Abstenção | SE | 0.157137578279 | 0.157137578279 | 0 | ✅ VALIDADO |
| 288 | UF (2026 · 2º turno) | Vencedor | SE | Lula | Lula | — | ✅ VALIDADO |
| 289 | UF (2026 · 2º turno) | % do Vencedor | SE | 0.695334980789 | 0.695334980789 | 0 | ✅ VALIDADO |
| 290 | UF (2026 · 2º turno) | Margem de Vitória | SE | 0.390669961579 | 0.390669961579 | 0 | ✅ VALIDADO |
| 291 | UF (2026 · 2º turno) | % Abstenção | SP | 0.198080032081 | 0.198080032081 | 0 | ✅ VALIDADO |
| 292 | UF (2026 · 2º turno) | Vencedor | SP | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 293 | UF (2026 · 2º turno) | % do Vencedor | SP | 0.53846197788 | 0.53846197788 | 0 | ✅ VALIDADO |
| 294 | UF (2026 · 2º turno) | Margem de Vitória | SP | 0.076923955761 | 0.076923955761 | 0 | ✅ VALIDADO |
| 295 | UF (2026 · 2º turno) | % Abstenção | TO | 0.192275902443 | 0.192275902443 | 0 | ✅ VALIDADO |
| 296 | UF (2026 · 2º turno) | Vencedor | TO | Flavio Bolsonaro | Flavio Bolsonaro | — | ✅ VALIDADO |
| 297 | UF (2026 · 2º turno) | % do Vencedor | TO | 0.513697772918 | 0.513697772918 | 0 | ✅ VALIDADO |
| 298 | UF (2026 · 2º turno) | Margem de Vitória | TO | 0.027395545836 | 0.027395545836 | 0 | ✅ VALIDADO |
| 299 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Quartil PIB: 1º quartil (menor PIB) | 0.739446449684 | 0.739446449684 | 0 | ✅ VALIDADO |
| 300 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Quartil PIB: 2º quartil | 0.590485440109 | 0.590485440109 | 0 | ✅ VALIDADO |
| 301 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Quartil PIB: 3º quartil | 0.495697367857 | 0.495697367857 | 0 | ✅ VALIDADO |
| 302 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Quartil PIB: 4º quartil (maior PIB) | 0.441097387934 | 0.441097387934 | 0 | ✅ VALIDADO |
| 303 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Quartil PIB: Sem dado | 0.286537295331 | 0.286537295331 | 0 | ✅ VALIDADO |
| 304 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Faixa: Até 5 mil | 0.523677876172 | 0.523677876172 | 0 | ✅ VALIDADO |
| 305 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Faixa: 5 a 20 mil | 0.574343385761 | 0.574343385761 | 0 | ✅ VALIDADO |
| 306 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Faixa: 20 a 100 mil | 0.537366388416 | 0.537366388416 | 0 | ✅ VALIDADO |
| 307 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Faixa: 100 a 500 mil | 0.465326296291 | 0.465326296291 | 0 | ✅ VALIDADO |
| 308 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Faixa: Mais de 500 mil | 0.518385471172 | 0.518385471172 | 0 | ✅ VALIDADO |
| 309 | Perfil (Lula, 2026 · 2º) | % Votos Válidos | Faixa: Sem dado | 0.286537295331 | 0.286537295331 | 0 | ✅ VALIDADO |
| 310 | Turnos (Lula, 2026) | Votos 1º Turno | 2026 | 53.879.538 | 53.879.538 | 0 | ✅ VALIDADO |
| 311 | Turnos (Lula, 2026) | Votos 2º Turno | 2026 | 64.256.232 | 64.256.232 | 0 | ✅ VALIDADO |
| 312 | Turnos (Lula, 2026) | Votos Ganhos no 2º Turno | 2026 | 10.376.694 | 10.376.694 | 0 | ✅ VALIDADO |
| 313 | Turnos (Lula, 2026) | % Votos Válidos 1º Turno | 2026 | 0.451627679106 | 0.451627679106 | 0 | ✅ VALIDADO |
| 314 | Turnos (Lula, 2026) | % Votos Válidos 2º Turno | 2026 | 0.517851828843 | 0.517851828843 | 0 | ✅ VALIDADO |
| 315 | Turnos (Lula, 2026) | Variação entre Turnos p.p. | 2026 | 6.62241497363 | 6.62241497363 | 0 | ✅ VALIDADO |
| 316 | Variação (PL, SP, 2026 · 2º) | % Votos Válidos | SP · PL | 0.53846197788 | 0.53846197788 | 0 | ✅ VALIDADO |
| 317 | Variação (PL, SP, 2026 · 2º) | % Votos Válidos Eleição Anterior | SP · PL | 0.552390733943 | 0.552390733943 | 0 | ✅ VALIDADO |
| 318 | Variação (PL, SP, 2026 · 2º) | Variação p.p. | SP · PL | -1.39287560621 | -1.39287560621 | 0 | ✅ VALIDADO |
| 319 | Variação (PL, SP, 2026 · 2º) | % Abstenção Eleição Anterior | SP | 0.210592795546 | 0.210592795546 | 0 | ✅ VALIDADO |
| 320 | Variação (PL, SP, 2026 · 2º) | Variação Abstenção p.p. | SP | -1.25127634648 | -1.25127634648 | 0 | ✅ VALIDADO |
| 321 | Município (São Paulo, 2026 · 2º) | Vencedor | São Paulo (SP) | Lula | Lula | — | ✅ VALIDADO |
| 322 | Município (São Paulo, 2026 · 2º) | % do Vencedor | São Paulo (SP) | 0.555041691102 | 0.555041691102 | 0 | ✅ VALIDADO |
| 323 | Município (São Paulo, 2026 · 2º) | Margem de Vitória | São Paulo (SP) | 0.110083382204 | 0.110083382204 | 0 | ✅ VALIDADO |
| 324 | Município (São Paulo, 2026 · 2º) | % Abstenção | São Paulo (SP) | 0.203575804816 | 0.203575804816 | 0 | ✅ VALIDADO |
| 325 | Município (São Paulo, 2026 · 2º) | PIB per capita | São Paulo (SP) | 93156.2345578 | 93156.2345578 | 0 | ✅ VALIDADO |
| 326 | Município (São Paulo, 2026 · 2º) | Alfabetização | São Paulo (SP) | 97 | 97 | 0 | ✅ VALIDADO |
| 327 | Município (São Paulo, 2026 · 2º) | Vencedor 1º Turno | São Paulo (SP) | Lula | Lula | — | ✅ VALIDADO |
| 328 | Município (São Paulo, 2026 · 2º) | Vencedor 2º Turno | São Paulo (SP) | Lula | Lula | — | ✅ VALIDADO |
| 329 | Município (São Paulo, 2026 · 2º) | Virou no 2º Turno | São Paulo (SP) | 0 | 0 | 0 | ✅ VALIDADO |
| 330 | Município (São Paulo, 2026 · 2º) | Partido Vencedor 1º Turno | São Paulo (SP) | PT | PT | — | ✅ VALIDADO |
| 331 | Município (São Paulo, 2026 · 2º) | Partido Vencedor 1º Turno Anterior | São Paulo (SP) | PT | PT | — | ✅ VALIDADO |
| 332 | Município (São Paulo, 2026 · 2º) | Mudou Partido Vencedor | São Paulo (SP) | 0 | 0 | 0 | ✅ VALIDADO |
| 333 | Verificação cega (2018 · 1º, Sul) | Municípios que Mudaram | Região Sul · sem exterior | 999 | 999 | 0 | ✅ VALIDADO |
| 334 | Verificação cega (2018 · 1º, Sul) | % Municípios que Mudaram | Região Sul · sem exterior | 0.83879093199 | 0.83879093199 | 0 | ✅ VALIDADO |
| 335 | Verificação cega (2018 · 1º, Sul) | Municípios que Viraram | Região Sul · sem exterior | 32 | 32 | 0 | ✅ VALIDADO |
| 336 | Verificação cega (2018 · 1º, Sul) | Vencedor | Região Sul · sem exterior | Jair Bolsonaro | Jair Bolsonaro | — | ✅ VALIDADO |
| 337 | Verificação cega (2018 · 1º, Sul) | % do Vencedor | Região Sul · sem exterior | 0.573861162755 | 0.573861162755 | 0 | ✅ VALIDADO |
| 338 | Verificação cega (2018 · 1º, Sul) | Margem de Vitória | Região Sul · sem exterior | 0.375799901274 | 0.375799901274 | 0 | ✅ VALIDADO |
| 339 | Verificação cega (2018 · 1º, Sul) | % Abstenção | Região Sul · sem exterior | 0.172628457076 | 0.172628457076 | 0 | ✅ VALIDADO |
| 340 | Verificação cega (2018 · 1º, Sul) | PIB per capita | Região Sul · sem exterior | 61274.5394053 | 61274.5394053 | 0 | ✅ VALIDADO |