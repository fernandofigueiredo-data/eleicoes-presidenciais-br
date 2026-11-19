# 13. Como ler os resultados da campanha (UTM)

Campanha: `lancamento-2026-11`, de 27/11 a 18/12/2026. Links prontos em [`utm_links.csv`](utm_links.csv),
gerados por `python3 tools/gerar_utm.py` a partir de [`prospects_utm.csv`](prospects_utm.csv).

## 1. Situação hoje (19/11/2026)

- **O site não mede acessos.** Não há ferramenta de análise instalada, nem cookies, nem nada gravado
  no navegador (o teste `links-uf.spec.js` confere `localStorage`, `sessionStorage` e cookies vazios).
- **Os links com UTM funcionam.** Os parâmetros ficam antes do `#`, e o roteador os tolera: rota,
  filtro por UF, recarga e troca de página continuam funcionando (testado em MG, RJ, DF, SP e BA, na
  página nacional e em `#/mudancas`).
- **O botão Compartilhar tira os `utm_*`.** Se a pessoa que recebeu o link o repassar, o acesso novo
  não é atribuído a ela.
- **A integração está pronta e desligada**: `src/services/medicao.js`, ligada por `MEDICAO.ativa` em
  `src/content/projeto.js`. O texto de privacidade da página Sobre muda sozinho quando ela é ligada.

## 2. Decisão pendente de Fernando: qual medição usar

O que a documentação oficial da Vercel diz (consultada em 19/11/2026):

- Web Analytics não usa cookies; identifica a visita por um hash da requisição, descartado em 24 horas
  ([privacidade](https://vercel.com/docs/analytics/privacy-policy)).
- No plano **Hobby** (gratuito): 50.000 eventos por mês, sem compra de eventos extras; relatórios de
  **1 mês**; **sem painel de UTM** e **sem eventos personalizados**. O painel de UTM exige o add-on
  Web Analytics Plus (US$ 10 por mês, só para times no plano Pro)
  ([limites e preços](https://vercel.com/docs/analytics/limits-and-pricing),
  [filtros](https://vercel.com/docs/analytics/filtering)).
- O painel **Pages** mostra o caminho da página **sem a query string**
  ([uso](https://vercel.com/docs/analytics/using-web-analytics)). O script aceita uma função
  `beforeSend` que pode reescrever o endereço antes do envio ([pacote](https://vercel.com/docs/analytics/package)).

| Opção | Custo | O que mede | Recomendação |
|---|---|---|---|
| **A. Vercel Web Analytics (Hobby) com o endereço reescrito** | gratuito | Acessos por `utm_source` no painel Pages (`/campanha/<slug>/<rota>`), país, dispositivo, origem | **Recomendada** |
| B. Vercel Web Analytics Plus | Pro + US$ 10/mês | Painel de UTM nativo, 24 meses de histórico | Só se a campanha crescer |
| C. Sem medição | gratuito | Nada; resultado só pelas respostas no CRM | Não recomendada: perde-se a métrica pedida |

Por que A: já é o provedor que hospeda o site (não entra terceiro novo), não usa cookies nem grava
nada no navegador, e a reescrita leva só a rota e os `utm_*` (filtros,
município e qualquer outro parâmetro são descartados). Ressalva: a Vercel não documenta se o script
registra as trocas de rota por `#`; conte com a **primeira página aberta**, que é a que importa para
saber a origem.

## 3. Como ligar (se Fernando escolher a opção A)

1. No painel da Vercel: projeto `eleicoes-presidenciais-br` → **Analytics** → **Enable**. Anote o
   caminho do script que o painel mostrar (o padrão é `/_vercel/insights/script.js`).
2. Em `election-intelligence/src/content/projeto.js`, troque `ativa: false` por `ativa: true` (e o
   `script`, se o caminho do painel for outro).
3. Rode `npm test` e `PW_CHANNEL=chrome npx playwright test`. O script só é carregado em endereços
   `*.vercel.app`; em `localhost` e no GitHub Pages nada muda.
4. Abra um pull request e, no preview da Vercel, confira no console do navegador que
   `/_vercel/insights/script.js` carrega sem erro 404 (sinal de que o passo 1 foi feito). Depois, o merge.
5. Teste no ar: abra um link da coluna `url_recomendada` do `utm_links.csv` com `utm_source=teste` e,
   alguns minutos depois, procure `/campanha/teste/` no painel Pages.

## 4. Onde ver os acessos por `utm_source`

1. Vercel → projeto → **Analytics**. Escolha o período (no Hobby, no máximo os últimos 30 dias).
2. No painel **Pages**, procure os caminhos que começam com `/campanha/`. Cada um é
   `/campanha/<utm_source>/<rota>`, por exemplo `/campanha/nicolau/nacional` ou `/campanha/briso/turnos`.
3. Clique num caminho para filtrar o painel inteiro por ele (país, dispositivo, origem).
4. **Exporte toda semana** (o Hobby só guarda 1 mês): copie o número de visitantes de cada
   `/campanha/<slug>/` para a planilha do CRM, com a data.

## 5. Como cruzar com o CRM

| Coluna do CRM (Status) | O que olhar na medição | Leitura |
|---|---|---|
| Primeiro contato enviado / Aguardando resposta | visitantes em `/campanha/<slug>/` | 1 ou mais: a mensagem foi aberta e o link clicado |
| Follow-up 1 | visitantes antes e depois do follow-up | o follow-up gerou clique? |
| Respondeu / Interessado | visitantes em várias rotas do mesmo slug | a pessoa explorou o site |
| Divulgação confirmada | acessos **sem** `/campanha/` no mesmo dia, com origem (Referrers) no veículo | efeito da publicação: o link publicado não tem UTM do prospect |

Cuidados: um clique não é uma pessoa identificada (o mesmo slug pode ser aberto por colegas do
prospect); números pequenos (1 a 5) não permitem comparar canais; e robôs de pré-visualização de
e-mail e redes sociais podem gerar acessos que não são humanos.

## 6. Limitação das rotas por hash (T3)

Rastreadores de link e prévias de redes sociais (WhatsApp, LinkedIn, X) não leem o que vem depois do
`#`. Todo link do site mostra a mesma prévia (título e descrição de `index.html`), seja nacional ou
de uma UF. Não implementamos prévia por UF. Caminho simples, se valer a pena depois: gerar no build
27 páginas estáticas `/uf/mg/index.html`, cada uma com `og:title` e `og:image` do estado e um
redirecionamento para `/#/turnos?uf=MG`. Custo: cerca de 27 imagens e um script de build; não
muda o roteador.
