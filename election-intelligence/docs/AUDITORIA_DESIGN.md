# Auditoria e polimento do design (método Impeccable)

18/11/2026. Referência: [impeccable.style/docs](https://impeccable.style/docs/), páginas *audit*, *critique*,
*polish*, *typeset*, *layout*, *animate*, *harden*, *colorize*, *adapt*, *clarify*, *design-system* e o
catálogo de anti-padrões ([/slop](https://impeccable.style/slop)).

O método foi aplicado à mão, a partir da documentação. A CLI (`npx impeccable detect`) não foi
instalada nem executada, porque baixaria e rodaria um pacote de terceiros sem pedido explícito. Para
rodá-la depois sobre o site:

```bash
npx impeccable detect http://localhost:5173
```

Os arquivos que ela lê já existem: `DESIGN.md` e `PRODUCT.md`, na raiz de `election-intelligence/`.

## 1. Notas por área (0 a 4, total 20)

| Área | Antes | Depois | O que mudou |
|---|:---:|:---:|---|
| Acessibilidade | 2 | **3** | Contraste ≥ 4,5:1 em todo texto, mínimo de 12px, alvos ≥ 24px (36/44px), teclado no mapa, foco devolvido pela busca, foco no conteúdo ao trocar de página, títulos sem pular nível. Fica em 3 porque os gráficos ECharts só funcionam com mouse ou toque; os mesmos dados estão em tabelas acessíveis |
| Desempenho | 3 | **3** | Sem mudança de arquitetura. ECharts (187 kB gzip) só é carregado com os gráficos, e a malha só nas páginas com mapa. Os 8 turnos (~0,7 MB gzip) ainda são carregados de uma vez |
| Temas (tokens) | 2 | **4** | Uma única fonte de tokens (CSS + `tokens.js`); cerca de 60 hexadecimais avulsos removidos das páginas; escala de tipo, espaço, raio, movimento e alvo definida e documentada em `DESIGN.md` |
| Responsividade | 3 | **4** | Eleição e turno lado a lado no celular, KPIs sem números cortados, faixa do resultado compacta, alvos de 44px, sem rolagem lateral (teste nas 8 páginas) |
| Integridade da implementação | 2 | **4** | Anti-padrões do catálogo eliminados (lista abaixo) |
| **Total** | **12 / 20** | **18 / 20** | |

## 2. Achados por severidade (todos corrigidos, salvo indicação)

### P1 · Grave

| Achado | Onde | Efeito para quem usa | Correção |
|---|---|---|---|
| Texto terciário com contraste de 3,78:1 (3,53:1 sobre o fundo) | `--text-3 #7a8494`: rodapés de KPI, contagens, notas e eixos dos gráficos | Leitura difícil para baixa visão; reprova no WCAG AA | `--gray-500 #5f6978` (5,2:1) e eixos em `gray-600`; teste automatizado nas 8 páginas |
| Erro de carga sem saída | `main.js` (tela de carregamento), `app.js` (página), malha do mapa | "Erro ao carregar…" sem botão: o leitor fica preso | Mensagem que diz o que falhou e botão **Tentar de novo** / **Recarregar a página** |
| Botão de remover chip com 18px | `.chip button` (página Comparar) | Difícil de acertar no toque | 24px no desktop; controles com 44px no celular |

### P2 · Moderado

| Achado | Onde | Correção |
|---|---|---|
| Textos de 9 a 11px (rótulos, eixos, cartograma, `<small>`) | CSS e tema do ECharts | Mínimo de 12px; `small` com piso de 12px; eixos com 12px |
| Mapa sem uso por teclado | `canvasMap.js` | Setas movem, + e − aproximam; o rótulo acessível explica a alternativa (filtro Município ou tabela) |
| Busca não devolvia o foco e deixava o Tab sair do diálogo | `searchPalette.js` | Foco volta para o botão que abriu; Tab fica no campo |
| Faixa colorida lateral ("side-tab") em todos os KPIs, no detalhe e nos avisos, com cores sem significado | `.kpi::before`, `.detail`, `.callout` | Removida. A cor só aparece quando identifica partido ou candidato, como bolinha no rótulo |
| Borda fina e sombra no mesmo cartão | `.panel`, `.lede`, `.kpi` | Só borda; sombra apenas em camadas flutuantes |
| Fonte padrão genérica (Inter) | `main.js`, tokens | IBM Plex Sans: institucional, analítica, com cifras tabulares. Source Serif 4 continua nos títulos |
| Rótulos em maiúsculas espaçadas por toda parte | KPIs, filtros, cabeçalhos de tabela | Caixa normal; peso e tamanho fazem a hierarquia |
| Numeração das seções ("01 · …") em abas e sobretítulos sem que haja sequência | abas e `pageHead` | Removida; o sobretítulo passa a dar o contexto que muda (eleição, turno, recorte) |
| Rótulo acima do título repetindo o título; o mesmo número 3 vezes na Visão Nacional | `nacional.js` | Título conta o resultado ("Lula vence com 51,79% dos votos válidos"); linha fina traz o 2º colocado, a diferença em votos e o comparecimento; a faixa mostra os dois primeiros nas pontas e marca 50% no 2º turno |
| Pílula "Brasil" ao lado do título | todas as páginas | O recorte entrou no sobretítulo |
| Espaçamento monótono (16px entre tudo) | `layout.css` | 16px dentro do grupo, 32px entre grupos |
| ~60 cores avulsas nas páginas, mapas e gráficos | `src/pages`, `src/components` | `src/styles/tokens.js` (`C`, `VIZ`), espelhando `tokens.css` |
| Exterior selecionado deixava o mapa todo cinza, sem explicação | `territoryMap.js` | Aviso no mapa dizendo onde estão os números do exterior |
| Concordância: "Em Brasil", "de Brasil" | cabeçalhos de 5 páginas | `noEscopo`/`doEscopo`: no Brasil, no Nordeste, na Bahia, em São Paulo, em Recife (PE) |
| Barra de filtros quebrava "Limpar filtros" numa linha sozinha a 1440px | `components.css` | Campos com largura flexível limitada (130–240px) |

### P3 · Polimento

| Achado | Correção |
|---|---|
| Títulos com última linha curta e viúvas | `text-wrap: balance` nos títulos e `pretty` nos parágrafos |
| Medida de texto longa no "Sobre" (78ch) | 70ch |
| Títulos h4 logo abaixo de h2 no "Sobre" | h3 |
| Travessões entre ideias na lista de fontes | Dois-pontos |
| ECharts animava mesmo com `prefers-reduced-motion` | Animação desligada quando o sistema pede menos movimento |
| Cartograma só respondia a Enter | Enter e Espaço |
| Estado vazio de tabela sem próximo passo | "Nada para mostrar com os filtros atuais. Ajuste ou limpe os filtros." e mensagem própria para a busca |
| Painel do município: faixa lateral, rótulo sem hierarquia | Título h2, linha "Vencedor: … margem de …", ações claras ("Comparar com outros territórios") |
| Indicador derivado sem marca visual | Etiqueta "derivado" |
| Falta de espaço entre KPIs e a tabela de candidatos (1º e 2º turno) | Espaço entre grupos aplicado |

### Não corrigido (registrado)

- **Gráficos sem navegação por teclado** (P2): o ECharts não expõe os elementos ao teclado. Cada gráfico
  tem tabela ou CSV com os mesmos dados. Fazer o próprio gráfico navegável pede um componente acessível
  sobre o ECharts, ou outra biblioteca.
- **Carga inicial de todos os turnos** (P3): poderia carregar só o turno atual e buscar os outros sob
  demanda. Hoje são ~0,7 MB com gzip, com barra de progresso.
- **Tema escuro**: fora de escopo por decisão (ver `DESIGN.md`).

## 3. Verificação

| Verificação | Resultado |
|---|---|
| Contraste ≥ 4,5:1 e texto ≥ 12px em todo texto visível das 8 páginas (teste Playwright novo) | passou |
| Nenhum botão, campo ou aba menor que 24px (teste novo) | passou |
| Mapa com setas e +/−; busca devolve o foco (teste novo) | passou |
| Suíte de ponta a ponta completa (desktop + Pixel 5) | **18 / 18** |
| Testes unitários | **13 / 13** |
| Indicadores × PBIX-MCP | **340 / 340** (o polimento não tocou no motor de medidas) |
| Build de produção | ok |

Prints atualizados em `docs/prints/` (inclui `mobile_nacional.png`).
