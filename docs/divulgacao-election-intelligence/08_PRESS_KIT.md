# 08. Press kit

Texto do item 8 do plano de divulgação, com o e-mail do projeto e os números conferidos na base em
19/11/2026 (ver [`11_VERIFICACAO_INICIAL.md`](11_VERIFICACAO_INICIAL.md) e
[`12_VERIFICACAO_MIDIA.md`](12_VERIFICACAO_MIDIA.md)). Os números deste documento são recalculados por
`election-intelligence/tests/divulgacao.test.js` e `tests/test_divulgacao.py`.

## 8.1. Apresentação institucional (uma página)

- **Projeto:** ELECTION INTELLIGENCE, Análise Eleitoral Brasileira.
- **Link:** https://eleicoes-presidenciais-br.vercel.app/#/nacional
- **Sobre, como citar e contato:** https://eleicoes-presidenciais-br.vercel.app/#/sobre
- **Natureza:** projeto independente de análise e visualização de dados. Não é fonte oficial do
  Tribunal Superior Eleitoral (TSE) nem do IBGE. Para resultados oficiais, consulte o TSE
  (https://resultados.tse.jus.br/).
- **Descrição, funcionalidades e metodologia:** página Sobre e contato e
  [perguntas frequentes](09_FAQ.md).
- **Responsável:** Fernando Figueiredo, analista de dados com mais de 10 anos em comunicação,
  estratégia de conteúdo e storytelling (perfil público no GitHub: https://github.com/fernandofigueiredo-data).
- **Contato:** fernandofigueiredo123@gmail.com

## 8.2. Release

**Título:** Site aberto mostra, município a município, como o Brasil votou para presidente de 2014 a 2026

**Subtítulo:** Projeto independente liga resultados do TSE a indicadores do IBGE e permite localizar os
municípios em que o resultado do 1º turno de 2026 se inverteu no 2º

O ELECTION INTELLIGENCE, projeto independente de análise e visualização de dados, reúne os resultados
para presidente dos oito turnos realizados entre 2014 e 2026 nos 5.571 municípios brasileiros e em 195
cidades do exterior, ligados a população, alfabetização e PIB per capita do IBGE.

O TSE publica os resultados por zona eleitoral, em arquivos separados por eleição e turno. O projeto
organizou 340.702 linhas desses arquivos, conferiu os totais com os resultados oficiais de cada turno e
publicou o código aberto.

Entre os dados disponíveis:

- No 2º turno de 2026, Lula (PT) teve 51,79% dos válidos, depois de Flavio Bolsonaro (PL) liderar o 1º
  turno com 47,03%. A inversão ocorreu em 212 municípios, pela contagem estrita: 211 a favor de Lula e
  1 a favor de Flavio Bolsonaro (ver a nota sobre critérios no FAQ).
- Em Minas Gerais, 76 dos 853 municípios trocaram de vencedor entre os turnos, todos de Flavio
  Bolsonaro para Lula.
- A abstenção no 2º turno de 2026 variou de 13,89% (CE) a 26,08% (AC).

O site tem oito páginas, filtros gravados no link e exportação em CSV. Não é fonte oficial do TSE.
Indicadores municipais não permitem inferir o comportamento individual do eleitor, e as limitações
estão documentadas no repositório.

Acesso: https://eleicoes-presidenciais-br.vercel.app/#/nacional · Código:
https://github.com/fernandofigueiredo-data/eleicoes-presidenciais-br · Contato: Fernando Figueiredo ·
fernandofigueiredo123@gmail.com

## 8.3. Texto curto (cerca de 100 palavras)

O ELECTION INTELLIGENCE é um site aberto que mostra como cada município brasileiro votou para
presidente nos dois turnos de 2014, 2018, 2022 e 2026, com os resultados do TSE ligados a população,
alfabetização e PIB do IBGE. No mapa, dá para ver onde o vencedor mudou entre os turnos (212
municípios em 2026, pela contagem estrita), comparar a abstenção entre estados e observar o voto por
faixa de renda. Os filtros ficam no link, as listas podem ser exportadas em CSV e os totais foram
conferidos com os do TSE. Não é fonte oficial. https://eleicoes-presidenciais-br.vercel.app/#/nacional

## 8.4. Roteiro de demonstração (75 segundos)

Ajustado na T4: o original dizia "2.876 contra 2.695", que mistura dois critérios (ver
12_VERIFICACAO_MIDIA.md). Vídeo pronto em `assets/video/`.

| Tempo | Tela | Locução |
|---|---|---|
| 0 a 8 s | #/nacional | "Como o Brasil votou para presidente, cidade por cidade, de 2014 a 2026." |
| 8 a 20 s | #/mapa, 2º turno de 2026 | "No 2º turno de 2026, Lula venceu em 2.875 municípios; Flavio Bolsonaro, em 2.695. Um município empatou." |
| 20 a 38 s | #/turnos?uf=MG | "Em Minas, 76 cidades trocaram de vencedor entre os turnos. As maiores ficam na Grande BH." |
| 38 a 50 s | #/participacao (abstenção) | "No 2º turno, a abstenção foi de 13,89% no Ceará a 26,08% no Acre." |
| 50 a 63 s | #/perfil | "Com alfabetização e região no modelo, o efeito da renda cai de 8,8 para 1,7 ponto. Associação, não causalidade." |
| 63 a 75 s | Link e CSV; quadro final | "Todo filtro vira um link. Dados do TSE e do IBGE, conferidos. Projeto aberto, não oficial." |

Texto institucional de 100 palavras (usado na página Sobre e contato):

> O ELECTION INTELLIGENCE é um projeto independente de análise e visualização de dados eleitorais
> brasileiros. Reúne os resultados para presidente nos dois turnos de 2014, 2018, 2022 e 2026, em 5.571
> municípios e 195 cidades do exterior, e os relaciona a população, alfabetização e PIB per capita do
> IBGE. Em oito páginas, permite ver vencedores por município, comparecimento e abstenção, mudanças
> entre eleições, viradas entre turnos e perfil socioeconômico, com filtros compartilháveis e
> exportação em CSV. Os totais foram conferidos com os do TSE. O código é aberto, sob licença MIT. O
> projeto não é fonte oficial do TSE.

## 8.5. Materiais

| Material | Onde |
|---|---|
| Vídeo de 75 s, 1920×1080 e 1080×1920, com legendas | `assets/video/` |
| Legendas e locução cronometrada (.srt e .txt) | `assets/video/` |
| 4 imagens, 1200×630 e 1080×1350, com texto alternativo | `assets/imagens/` e `assets/imagens/alt_text.md` |
| 27 links por UF, testados | [`links_uf.md`](links_uf.md) e `links_uf.csv` |
| Links com UTM por prospect | `utm_links.csv` (gerado por `tools/gerar_utm.py`) |
| Lista de viradas com o critério de cada município | `viradas_criterios.csv` |

## 8.6. Ajustes recomendados nas mensagens do plano (seção 06)

- Fichas A4 e B1 e o texto de 30 segundos (seção 02): trocar "212 municípios em que Lula virou" por
  "212 municípios que trocaram de vencedor (211 para Lula)" ou por "Lula virou em 211".
- Ficha A1 (follow-up) e ficha B5: trocar 812 e 714 por 813 e 716 (regra do site; sem os empates, 809
  e 711).
- Ficha A1: se citar o intervalo de confiança, usar o agrupado por UF (−4,0 a +0,6; p = 0,15), que
  inclui o zero, e não o HC1 (−3,3 a −0,1).
- Ficha A3: o texto sobre 212, 213 e 215 está certo; pode apontar para a nota do FAQ no site:
  https://eleicoes-presidenciais-br.vercel.app/#/sobre?s=faq
- Assinatura de todas as fichas: "Fernando Figueiredo · ELECTION INTELLIGENCE ·
  fernandofigueiredo123@gmail.com · github.com/fernandofigueiredo-data".
- Todos os links: usar a coluna `url_recomendada` de `utm_links.csv`.
