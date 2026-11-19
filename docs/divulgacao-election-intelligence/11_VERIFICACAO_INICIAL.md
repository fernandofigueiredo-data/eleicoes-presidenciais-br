# 11. Verificação inicial (T0)

Data: 19/11/2026. Branch: `feat/divulgacao-prerequisitos`, a partir de `main` em `11083a9`.
Feita antes de qualquer mudança no site. Ambiente: macOS, Node 24.14, Python 3.13 (via `uv`), Google Chrome.

## 1. Suíte de testes de base

| Suíte | Comando | Resultado |
|---|---|---|
| pytest (pipeline Python) | `pytest -q tests` | 10 de 10 passam |
| Vitest (motor de medidas) | `npm test` | 13 de 13 passam |
| Playwright (desktop e celular) | `PW_CHANNEL=chrome npx playwright test` | 18 de 18 passam |
| **Total** | | **41 de 41** |

Observações sobre a base, sem falha de teste:

- Nesta máquina o Chromium do Playwright não estava baixado. Sem `PW_CHANNEL=chrome`, os 18 testes
  falham ao abrir o navegador (`Executable doesn't exist`). Com o Chrome instalado, passam. Não é
  defeito do site; é preparo do ambiente (`npx playwright install chromium` resolve).
- O Playwright **não roda no GitHub Actions**. O workflow do site (`deploy-election-intelligence.yml`)
  roda `npm test` (Vitest), `npm run validate` e o build. O do Python roda pytest, ruff e os notebooks.
  O README diz que os 41 testes rodam na CI; na prática, rodam 23 (10 + 13). Ver divergência D7.

## 2. As 8 páginas em 1440 px e em 390 px

Teste versionado: [`election-intelligence/tests/e2e/paginas.spec.js`](../../election-intelligence/tests/e2e/paginas.spec.js).
Para cada página e largura: abre em contexto novo, espera o carregamento, confere que o título e o
conteúdo aparecem (sem esqueleto de carregamento), mede rolagem horizontal e registra erros de console,
erros de JavaScript, requisições falhas e respostas HTTP 4xx/5xx.

| Página | 1440 px | 390 px |
|---|---|---|
| `#/nacional` Visão Nacional | ok | ok |
| `#/mapa` Mapa dos Vencedores | ok | ok |
| `#/participacao` Comparecimento e Abstenção | ok | ok |
| `#/mudancas` Mudanças entre Eleições | ok | ok |
| `#/turnos` 1º e 2º Turno | ok | ok |
| `#/perfil` Perfil Socioeconômico | ok | ok |
| `#/comparar` Comparar | ok | ok |
| `#/sobre` Sobre os Dados | ok | ok |

Resultado: 16 de 16 sem erro de console, sem requisição falha, sem rolagem horizontal e sem tela
vazia. A única verificação que falhou na base foi a do link "Sobre e contato" no menu e no rodapé,
que ainda não existia (é a entrega T1). As capturas ficaram em `election-intelligence/test-results/`
(não versionado).

Achados de interface, sem erro técnico:

- Em 390 px, a barra de abas rola na horizontal e mostra 2 ou 3 abas por vez; a aba ativa fica
  visível. Funciona, mas quem chega pelo celular não vê de imediato que existe a aba de fontes.
- A página `#/sobre` já existia como "Sobre os Dados" (fontes, metodologia, conferência com o TSE e
  validação contra o PBIX). Não tinha contato, aviso de natureza do projeto nem orientação de citação.
- O botão "Compartilhar" copia `location.href` sem o trecho depois do `#`. Se o visitante chegar com
  UTM (`?utm_source=...`), o link compartilhado leva o UTM do destinatário original e contamina a
  medição. Corrigido na T5 (o link compartilhado sai sem `utm_*`).

## 3. Números citados no briefing e nos anexos A e B

Status: **ok** (confere), **divergente** (a base mostra outro valor ou outro sentido) ou
**não verificável na base** (afirmação externa).

| Número citado | Valor encontrado | Onde conferi | Status |
|---|---|---|---|
| Presidente, 1º e 2º turnos de 2014, 2018, 2022 e 2026 | 8 turnos | `public/data/meta.json` | ok |
| 5.571 municípios e 195 cidades do exterior | 5.571 e 195 | Vitest `engine.test.js` | ok |
| 340.702 linhas (candidato × zona × turno) | 340.702 | `data/eleicoes_presidente.csv`; pytest `test_view_reconstroi_o_dataset` | ok |
| População e alfabetização do Censo 2022; PIB dos Municípios 2023 | SIDRA 4709 e 9543 (2022); SIDRA 5938 (2014, 2018, 2022, 2023) | `data/raw/manifesto.csv` | ok |
| Oito páginas | 8 rotas | `src/state/store.js` (PAGES) | ok |
| Mapa com 5.570 polígonos | 5.570 | `public/geo/municipios.topo.json` | ok |
| 55 medidas DAX | 55 | `public/data/medidas.json` | ok |
| Totais iguais aos do TSE nos 8 turnos | iguais | pytest `test_totais_iguais_ao_tse` | ok |
| 340 de 340 indicadores iguais ao PBIX | 340 de 340 | Vitest `engine.test.js`; página Sobre | ok |
| 41 testes (pytest 10, Vitest 13, Playwright 18) | 41 | execução local | ok (ver D7 sobre a CI) |
| Código MIT; dados TSE (CC-BY) e IBGE | MIT; CC-BY | `LICENSE`, README | ok |
| 2º turno de 2026 com arquivos do TSE de 28/10/2026 | arquivos de 2026 com data de 28/10/2026 no TSE, baixados em 28/10/2026 | `data/raw/manifesto.csv` | ok |
| Flavio Bolsonaro 47,03% no 1º turno; Lula 51,79% no 2º | 47,03% e 51,79% | Vitest `divulgacao.test.js` | ok |
| 64.256.232 votos contra 59.826.041 | iguais | pytest `test_resultado_2026_segundo_turno` | ok |
| "212 municípios em que Lula virou (contagem estrita)" | 212 é o total estrito: **211 de Lula e 1 de Flavio Bolsonaro** | Vitest `divulgacao.test.js` | **divergente** (D1) |
| 215 pela regra do DAX | 215 | Vitest; página 1º e 2º turno | ok |
| 213 da CNN Brasil e da BBC | a base dá 213 pela regra do banco SQL (212 de Lula e 1 de Flavio) | Vitest; pytest `test_viradas_2026_regra_do_sql` | critério dos veículos **não verificável na base** (D2) |
| Virada de Flavio em "Uraipuru (GO)" | **Uirapuru (GO)**, IBGE 5221577 | Vitest `divulgacao.test.js` | **divergente** na grafia (D3) |
| Um empate no 2º turno | 1: Marquinho (PR) | Vitest | ok |
| Lula em 2.876 municípios; Flavio em 2.695 | vencedor único: **2.875 e 2.695, mais 1 empate**; com o empate para os dois (regra do site): 2.876 e 2.696 | Vitest | **divergente** (D4) |
| Minas: 76 dos 853 municípios trocaram de vencedor, todos para Lula | 76 de 853, todos de Flavio para Lula | Vitest | ok |
| As maiores ficam na Grande BH | Ribeirão das Neves, Santa Luzia, Ibirité, Sabará e Nova Lima | Vitest | ok |
| Abstenção no 2º turno de 2026: 13,89% (CE) a 26,08% (AC) | 13,89% e 26,08% | Vitest | ok |
| Abstenção de 19,22% a 21,30% em todos os turnos | 19,22% (2026, 2º) a 21,30% (2018, 2º) | motor do site | ok |
| Lula 73,9% no quartil de menor PIB per capita e 44,1% no de maior | 73,9% e 44,1% | Vitest | ok |
| Efeito da renda de 8,8 para 1,7 ponto | −8,8 e −1,7 p.p. por dobra do PIB per capita | pytest `test_divulgacao.py` | ok |
| R² de 0,33 para 0,65 | 0,33 e 0,65 | pytest | ok |
| Nordeste dá a Lula 21 pontos a mais que o Centro-Oeste | 21,3 p.p. | pytest | ok |
| IC 95% de −3,3 a −0,1 (plano, item 1.3) | é o intervalo HC1. O README usa o agrupado por UF: −4,0 a +0,6 (p = 0,15) | notebook `analise_perfil.ipynb` | divergente (D5) |
| Mudança de partido vencedor: 812 e 714 (plano, fichas A1 e B5) | **813 e 716** pela regra do site (4 e 5 por empate) | motor do site; README | **divergente** (D6) |

## 4. Divergências

- **D1. "Lula virou em 212".** Na contagem estrita, 212 é o total de municípios que trocaram de
  vencedor: 211 de Flavio para Lula e 1 de Lula para Flavio (Uirapuru, GO). Frases corretas: "212
  municípios trocaram de vencedor (contagem estrita)" ou "Lula virou em 211". O release e o texto
  curto do press kit já falam em "inversão em 212 municípios" e estão certos; o resumo do briefing
  (seção 1.3 do plano), o texto de 30 segundos (seção 02) e as fichas A4 e B1 dizem "212 em que Lula
  virou" e precisam de ajuste.
- **D2. 213.** A base reproduz 213 de duas formas: (a) a regra do banco SQL, que desempata pelo
  número do candidato (Lula, 13, antes de Flavio, 22): 212 para Lula e 1 para Flavio; (b) pela regra
  do site, os municípios em que o 2º turno teve Lula como vencedor único e o 1º turno não: também
  213. A hipótese do briefing (212 de Lula mais 1 de Flavio) coincide com a regra (a), mas na
  contagem estrita Lula tem 211, não 212. Que critério a CNN Brasil e a BBC usaram não dá para saber
  pela base: fica como "não explicado" no FAQ.
- **D3. Grafia.** O município é Uirapuru (GO), código IBGE 5221577, e não "Uraipuru".
- **D4. 2.876 e 2.695.** Os dois números usam critérios diferentes: 2.876 conta o empate para Lula,
  2.695 não conta para Flavio. Pelo mesmo critério: 2.875 e 2.695, mais 1 empate (estrito), ou 2.876
  e 2.696 (regra do site, que é o que a página mostra). O roteiro foi ajustado (ver 12_VERIFICACAO_MIDIA.md).
- **D5. Intervalo de confiança.** O plano cita o intervalo robusto (HC1), que exclui o zero. O
  notebook e o README usam o intervalo agrupado por UF, que inclui o zero (p = 0,15). Mensagens que
  citarem o intervalo devem usar o agrupado e dizer que o efeito restante não se distingue de zero.
- **D6. 812 e 714.** A base mostra 813 (2018 para 2022) e 716 (2022 para 2026) pela regra do site;
  sem os empates, 809 e 711. Afeta o follow-up da ficha A1 e a ficha B5.
- **D7. Testes na CI.** O Playwright não roda no GitHub Actions. O README e o plano dizem que os 41
  testes rodam na CI. Proposta: incluir um job de Playwright no workflow do site (decisão de Fernando,
  porque aumenta o tempo da CI em cerca de 1 minuto).
- **D8. Página Sobre.** Já existia em `#/sobre`, com outro nome ("Sobre os Dados"). Foi integrada,
  sem duplicar: a rota continua a mesma.
