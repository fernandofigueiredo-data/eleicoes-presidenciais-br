# 14. Checklist de lançamento

Verificado em 19/11/2026 em dois endereços:

- **Produção** (`https://eleicoes-presidenciais-br.vercel.app`, versão da `main`, sem este PR);
- **Build local deste branch** (`vite preview`).

O preview da Vercel deste PR está protegido por login (responde 302 para a autenticação da Vercel),
então não foi testado de fora.

Verificação automatizada, que pode ser repetida a qualquer momento:

```bash
cd election-intelligence && PW_CHANNEL=chrome npx playwright test -c playwright.lancamento.config.js
```

Para o build local, rode o mesmo comando com `BASE_URL=http://localhost:4173` antes. O resultado fica
em `election-intelligence/test-status/lancamento/`.

Status: **ok**; **corrigido** (era problema e foi resolvido neste PR); **depende do merge** (resolvido no
branch, entra no ar com o merge); **ação de Fernando**; **atenção** (problema que continua).

| # | Item | Status | O que foi visto |
|---|---|---|---|
| 1 | Domínio e DNS | ok | `eleicoes-presidenciais-br.vercel.app` resolve (216.198.79.130 e 64.29.17.130). Não há domínio próprio, e o briefing não pede um. |
| 2 | Site responsivo no celular | ok | As 8 páginas em 390 px, sem rolagem horizontal (`paginas.spec.js`, `mobile.spec.js`). Corrigido neste PR: a barra de filtros fixa ficava sob as abas ao rolar. |
| 3 | Formulário quebrado ou sem teste de envio real | não se aplica / ação de Fernando | O site não tem formulário. O contato é um link `mailto:` com assunto, testado. Falta só um envio real: clique em "Escrever e-mail" na página Sobre e mande uma mensagem para você mesmo. Não fiz o envio (regra 1 do briefing). |
| 4 | Política de privacidade quando exigida por lei | corrigido; depende do merge | Seção Privacidade na página Sobre e contato. Com o Google Analytics, o texto descreve cookies, o que é enviado, o IP e como mudar a escolha, e só há medição depois do aceite. Não é parecer jurídico: se quiser segurança sobre a LGPD, vale uma leitura de um advogado. |
| 5 | Indexação no Google Search Console | ação de Fernando | Não verificável sem o seu acesso. Passos: em search.google.com/search-console, adicione a propriedade "Prefixo do URL" `https://eleicoes-presidenciais-br.vercel.app/` e verifique por **tag HTML**. Mande-me o código da tag `google-site-verification` que eu incluo no `index.html`. A verificação pelo Google Analytics não funciona aqui, porque o GA só carrega depois do aceite. |
| 6 | robots.txt bloqueando o rastreamento | corrigido; depende do merge | Em produção, `/robots.txt` dava 404, o que não bloqueia, mas também não indica o sitemap. Agora libera tudo (`Allow: /`) e aponta o sitemap. |
| 7 | sitemap.xml ausente ou não enviado | corrigido; depende do merge; envio é ação de Fernando | Em produção dava 404. Criado com o endereço raiz (as rotas com `#` não são páginas separadas para o Google). Depois do merge, envie `sitemap.xml` no Search Console. |
| 8 | HTTPS e conteúdo misto | ok | HTTP redireciona para HTTPS (308) e há HSTS (`max-age=63072000; preload`). Nenhuma requisição `http://` nas 9 rotas testadas. |
| 9 | Links internos ou externos quebrados | ok; depende do merge | 34 links no build do branch (18 em produção): rotas internas, TSE, GitHub, licença e `mailto`, todos ok. Dois só existem depois do merge: o CSV de viradas no GitHub (`blob/main/...`) e a imagem da prévia de link. |
| 10 | Páginas importantes inacessíveis ou bloqueadas | ok; corrigido | As 8 rotas e `#/turnos?uf=MG` abrem; os 27 links por UF foram testados. Corrigido neste PR: "Pular para o conteúdo" mandava o visitante para a Visão Nacional. |
| 11 | Google Analytics não instalado ou não disparando | ação de Fernando | Implementado neste branch, com consentimento, e testado com um ID de teste (`medicao.spec.js`). Não está no ar: falta o ID `G-...` na variável `VITE_GA4_ID` da Vercel e o merge (passos em `13_COMO_LER_OS_RESULTADOS.md`). Depois, confira no relatório Tempo real. |
| 12 | Desempenho grave (LCP acima de 4 s) | **atenção** | Desktop: LCP de 0,2 a 0,7 s. Celular com 4G lento simulado (1,6 Mbps, 150 ms, CPU 4× mais lenta, o perfil de celular do Lighthouse): **LCP de 8,1 a 8,4 s**. O site baixa cerca de 1,5 MB compactado antes da primeira tela, quase todo com os dados dos 8 turnos. Em 4G comum e no desktop fica bem abaixo de 4 s. Proposta: carregar primeiro só os turnos que a página precisa e os demais em segundo plano. |
| 13 | Erros de JavaScript ou 5xx em produção | ok | Nenhum erro de console, nenhuma exceção e nenhuma resposta 4xx ou 5xx nas 9 rotas, em produção e no branch. O site é estático (sem funções), então 5xx só viria da própria Vercel. |
| 14 | Meta noindex esquecida | ok | Produção sem `<meta name="robots">` e sem `X-Robots-Tag`. O preview tem `X-Robots-Tag: noindex`, o que é o padrão da Vercel para previews e não vai para produção. Adicionados `rel="canonical"` (o site também tem cópia no GitHub Pages) e a prévia de link (Open Graph). |
| 15 | Conteúdo de teste publicado | ok | Nenhum "lorem ipsum", placeholder, "TODO", "NaN", "undefined" ou "[object Object]" no texto das 9 rotas. Os links com `utm_source=teste` existem só nos documentos, não no site. |

## Antes do primeiro envio (27/11)

1. Revisar e fazer o merge do PR #8.
2. Criar a propriedade GA4, pôr o ID em `VITE_GA4_ID` na Vercel e conferir o Tempo real (item 11).
3. Search Console: propriedade, tag de verificação e envio do sitemap (itens 5 e 7).
4. Mandar um e-mail de teste para si mesmo pelo botão da página Sobre (item 3).
5. Rodar de novo a verificação de lançamento contra a produção: o comando no topo, sem `BASE_URL`.
6. Decidir sobre o desempenho no celular (item 12).
