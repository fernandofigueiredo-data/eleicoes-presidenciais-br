# Divulgação do ELECTION INTELLIGENCE (campanha de 27/11 a 18/12/2026)

Pré-requisitos de divulgação, preparados em 19/11/2026 no branch `feat/divulgacao-prerequisitos`.
Nada aqui foi enviado a ninguém: a campanha é executada por Fernando Figueiredo.

| Arquivo | O que é |
|---|---|
| [`08_PRESS_KIT.md`](08_PRESS_KIT.md) | Apresentação, release, texto curto, roteiro do vídeo e ajustes nas mensagens |
| [`09_FAQ.md`](09_FAQ.md) | Perguntas frequentes, espelho da página Sobre e contato (gerado; não edite à mão) |
| [`11_VERIFICACAO_INICIAL.md`](11_VERIFICACAO_INICIAL.md) | Suíte de base, 8 páginas e números citados, com divergências |
| [`12_VERIFICACAO_MIDIA.md`](12_VERIFICACAO_MIDIA.md) | Vídeo e imagens: números, formatos e como refazer |
| [`13_COMO_LER_OS_RESULTADOS.md`](13_COMO_LER_OS_RESULTADOS.md) | UTM, Google Analytics com consentimento e cruzamento com o CRM |
| [`14_CHECKLIST_LANCAMENTO.md`](14_CHECKLIST_LANCAMENTO.md) | Os 15 itens de lançamento, com status e o que falta |
| [`links_uf.md`](links_uf.md), `links_uf.csv` | 27 links por UF, com o resultado dos testes |
| `prospects_utm.csv`, `utm_links.csv` | Slugs dos prospects A e B e links com UTM |
| `viradas_criterios.csv` | Municípios que viraram em 2026, com o critério de cada um |
| `assets/` | Vídeo, legendas, imagens e capturas por UF |

Para regenerar os arquivos que dependem dos dados:

```bash
cd election-intelligence && npm run docs:divulgacao
```

```bash
python3 tools/gerar_utm.py
```
