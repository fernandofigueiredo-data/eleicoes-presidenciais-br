# DESIGN.md — ELECTION INTELLIGENCE

Registro do design system (formato sugerido pelo Impeccable: cores, tipografia, layout e componentes).
Fonte única das variáveis: `src/styles/tokens.css` (CSS) e `src/styles/tokens.js` (gráficos e mapas).
Qualquer valor fora desta lista é erro, a não ser que seja acrescentado aqui com o motivo.

## Caráter

Jornalismo de dados institucional: editorial na hierarquia (título que conta o resultado, sobretítulo
com o contexto), analítico no corpo (números tabulares, tabelas densas, mapas). Modo de uso: **operar**
(o leitor filtra, compara e exporta). Tema único claro; não há tema escuro por decisão (impressão,
leitura de mapas coropléticos e paridade com o relatório original).

## Cores

| Token | Valor | Papel |
|---|---|---|
| `navy-800` | `#002776` | Ação principal, cabeçalho, abstenção, KPI de destaque |
| `navy-900` | `#001a4f` | Barra de abas |
| `navy-700` | `#12398f` | Links e hover da ação principal |
| `navy-100` | `#e6ecf7` | Seleção ativa (filtros, chips, linha da busca), avisos informativos |
| `green-700` | `#007a2e` | Sobretítulo e status positivo (5,1:1 sobre o fundo) |
| `green-600` | `#009c3b` | Marca (logo, séries) |
| `gold-500` | `#e3b505` | Aba atual, "mudou/virou", brancos, linha da média — **nunca texto sobre branco** (1,9:1) |
| `gold-100` | `#fbf3d2` | Linha selecionada, avisos de cautela |
| `gray-950` | `#0c1524` | Texto principal, tooltip |
| `gray-700` | `#3d4859` | Texto de controles |
| `gray-600` | `#5b6676` | Texto secundário (5,8:1) |
| `gray-500` | `#5f6978` | Texto terciário — menor contraste permitido para texto (5,2:1 sobre `gray-50`) |
| `gray-400` | `#a3abb7` | Só traços, ícones e separadores (2,3:1 — proibido como texto) |
| `gray-300` / `200` / `100` / `50` | `#c9ced6` / `#e3e6eb` / `#eef0f3` / `#f6f7f9` | Bordas fortes / bordas / superfícies secundárias / fundo da página |
| `negative` | `#b42318` | Erro, divergência |
| `focus` | `#2f6fed` | Anel de foco (2px, afastado 2px) |

Cores de dados (`VIZ` em `tokens.js`): `noData #dfe3e8`, `outOfScope #e9ecf1`, `tie #8a8f98`,
`changed = gold-500`, `unchanged = gray-300`, regiões (N `#0f7b6c`, NE `#b8892b`, SE navy, S `#3a7dc9`,
CO `#7b3fa0`), rampas sequenciais de abstenção e margem e rampa divergente para variação p.p.

**Cores de partido** vêm do modelo (tabela `PartidoCores` do PBIX) e só aparecem quando identificam um
partido ou candidato. Partido sem cor própria: `#9AA3AE`. Vitória mais apertada = tom mais claro da cor
do partido (mínimo 28% de intensidade).

Regras:
- Cor nunca é a única pista: toda cor de dado tem legenda com texto, tooltip ou rótulo.
- Nada de faixa colorida lateral em cartões ("side-tab"). Em KPIs, a cor de partido entra como bolinha no rótulo.
- Texto sobre cor de dado escolhe tinta clara ou escura pela luminância (`isDark`).

## Tipografia

| Papel | Família | Tamanho / peso |
|---|---|---|
| Título de página | Source Serif 4 (variável) | 40px / 700, 28px no celular, `text-wrap: balance` |
| Números de destaque (faixa do resultado) | Source Serif 4 | 28px / 700, algarismos tabulares |
| Interface e corpo | IBM Plex Sans (variável) | 16px corpo, 14px controles e tabelas, 12px mínimo |
| Título de painel | IBM Plex Sans | 18px / 600 |
| KPI | IBM Plex Sans | 28px / 600 (36px no KPI de destaque), tabular |

Escala: 12 · 14 · 16 · 18 · 22 · 28 · 40 (≈ 1,2). Linhas de texto até ~70 caracteres (`68ch`/`70ch`).
Corpo com altura de linha 1,5; parágrafos com `text-wrap: pretty`. Rótulos em caixa normal (sem
maiúsculas espaçadas). Todo número usa `font-variant-numeric: tabular-nums`. Fontes embutidas pelo
`@fontsource` (sem CDN). Inter foi substituída por IBM Plex Sans (o catálogo do Impeccable aponta Inter
como padrão genérico; Plex tem caráter institucional e boas cifras tabulares).

## Espaço e layout

- Escala de 4px: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.
- `--gap-in` 16px entre itens de um grupo; `--gap-out` 32px entre grupos (24px no celular). Ritmo
  desigual de propósito: o que é relacionado fica junto.
- Largura máxima 1440px; margem lateral 24px (16px no celular).
- Grades: KPIs em 6/4 colunas → 3 → 2; painéis em 2 ou 3 colunas → 1 abaixo de 900px; mapa + coluna
  lateral (1,55 : 1) → 1 coluna abaixo de 1200px. Toda coluna usa `minmax(0, 1fr)` (nada força rolagem lateral).

## Forma e profundidade

- Raios: 6px (controles), 8px (KPIs, mapas), 12px (painéis), 999px (pílulas).
- Superfícies com **borda fina e sem sombra**. Sombra (`--shadow-pop`) só em camadas que flutuam:
  tooltip, listas de combobox, busca, toasts.
- Sem cartão dentro de cartão: tabelas dentro de painéis usam só linhas horizontais.

## Movimento

- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`; 120ms para hover/cor, 200ms para entrada de toast,
  ~550ms para o voo do mapa até o território, 300ms nos gráficos.
- `prefers-reduced-motion`: CSS zera transições, o mapa troca de enquadramento sem animar e o ECharts
  desliga a animação. O estado muda; o deslocamento some.
- Nada pisca ou pulsa; o único movimento contínuo é o esqueleto de carregamento.

## Componentes

| Componente | Arquivo | Regras |
|---|---|---|
| Cabeçalho + abas | `app.js`, `layout.css` | Abas sem numeração; aba atual com sublinhado dourado e peso 600 |
| Barra de filtros | `components/filters/filterBar.js` | Campos com rótulo visível; ativo = borda navy + fundo `navy-100`; no celular, eleição e turno visíveis e o resto em "Mais filtros (n)" |
| Combobox | `components/filters/combobox.js` | Padrão ARIA combobox/listbox, setas, Enter, Esc, botão limpar 32px |
| Controle segmentado | `components/ui/ui.js` | `aria-pressed`; selecionado = superfície branca com contorno |
| Cabeçalho de página | `pages/shared.js · pageHead` | Sobretítulo = seção · eleição/turno · recorte (seção some no celular); título conta o resultado; linha fina até 68ch |
| KPI | `ui.js · kpi` | Rótulo 14px, valor 28px; `hero` = fundo navy para o número principal da página |
| Painel | `ui.js · panel` | Título 18px, subtítulo com instrução curta, ferramentas (CSV) à direita |
| Tabela | `components/tables/dataTable.js` | Cabeçalho fixo, ordenação por botão com `aria-sort`, busca, "Mostrar mais", CSV, linha selecionável por teclado, estado vazio com próximo passo |
| Mapa | `components/maps/canvasMap.js`, `territoryMap.js` | Canvas; migalhas; +, −, Brasil; setas e +/− no teclado; aviso para o exterior; erro com recarregar |
| Cartograma UF | `components/maps/tileGrid.js` | Botões com rótulo acessível; Enter/Espaço filtram |
| Detalhe do município | `pages/shared.js · municipioDetail` | Título h2, resultado em barras, 6 indicadores, ações "Comparar" e "Limpar seleção" |
| Tooltip | `ui.js · tooltip` | Escuro, 14px, nunca bloqueia o ponteiro |
| Estados | `utils/dom.js · emptyState` | Diz o que aconteceu e oferece o próximo passo (botão) quando há um |

## Escrita

Frases curtas, sem travessão entre ideias, verbos que dizem o que o controle faz ("Exportar CSV",
"Comparar com outros territórios", "Tentar de novo"). Recortes com a preposição certa
(`noEscopo`: "no Brasil", "na Bahia", "em São Paulo"). Indicadores que não existem no PBIX levam a
etiqueta "derivado".

## Alvos e acessibilidade

- Controles com 36px de altura no desktop e 44px no celular; nenhum alvo menor que 24px (teste automatizado).
- Contraste mínimo 4,5:1 para todo texto (teste automatizado nas 8 páginas).
- Foco visível em todos os controles, incluindo linhas de tabela, mapa e cartograma; a busca devolve o
  foco a quem a abriu; trocar de página leva o foco ao conteúdo.
