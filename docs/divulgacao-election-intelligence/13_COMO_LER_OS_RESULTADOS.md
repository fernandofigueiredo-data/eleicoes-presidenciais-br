# 13. Como ler os resultados da campanha (UTM)

Campanha: `lancamento-2026-11`, de 27/11 a 18/12/2026. Ferramenta: Google Analytics 4, só com consentimento. Links prontos em [`utm_links.csv`](utm_links.csv),
gerados por `python3 tools/gerar_utm.py` a partir de [`prospects_utm.csv`](prospects_utm.csv).

## 1. Decisão de Fernando (19/11/2026): Google Analytics 4

Fernando escolheu o **Google Analytics 4 (GA4)**. O GA4 grava cookies e um identificador aleatório do
navegador, o que contraria a regra 10 do briefing ("sem cookies e sem identificar o visitante"). Para
ficar o mais perto possível dela e da LGPD, a implementação é:

- **Só com consentimento** (modo básico do Google): na primeira visita aparece um aviso com "Aceitar"
  e "Recusar". A tag do Google só é carregada depois de "Aceitar". Quem recusa não envia nada ao
  Google, "nem mesmo o status do consentimento" ([consent mode](https://developers.google.com/tag-platform/security/concepts/consent-mode)).
- **Só a rota e os `utm_*`**: a página vista vai como `https://.../turnos?utm_source=...`, sem os
  filtros (UF, município, candidato) nem outros parâmetros.
- **Sem publicidade**: `ad_storage`, `ad_user_data` e `ad_personalization` ficam negados; Google
  signals e personalização de anúncios desligados no código.
- **Cookie de no máximo 13 meses** (o padrão do Google é 2 anos).
- **A escolha fica só no navegador** (`localStorage`, chave `ei-consentimento-medicao`) e pode ser
  mudada no botão "Preferências de medição" da seção Privacidade. Recusar depois de aceitar apaga os
  cookies `_ga` do site.
- **IP:** o Google declara que não registra IP de usuários da União Europeia, da Suíça e do Reino
  Unido ([IP no GA4](https://support.google.com/analytics/answer/12017362)); a documentação lida não
  diz o mesmo para o Brasil. O texto de privacidade diz que o Google recebe o IP e que o projeto não o
  vê nem guarda.

Custo da escolha: quem recusar ou ignorar o aviso não aparece nos números. Numa campanha de 17
destinatários, contagens de 0 a 5 acessos por prospect são esperadas; leia-as como sinal, não como
medida.

Código: [`election-intelligence/src/services/medicao.js`](../../election-intelligence/src/services/medicao.js).
Testes: `election-intelligence/tests/e2e/medicao.spec.js` (com ID de teste e as chamadas ao Google
interceptadas) e `tests/divulgacao.test.js`.

## 2. Como ligar (passos de Fernando)

1. Em [analytics.google.com](https://analytics.google.com), crie uma propriedade GA4 e um fluxo de
   dados da Web para `https://eleicoes-presidenciais-br.vercel.app`. Copie o **ID da métrica**
   (formato `G-XXXXXXXXXX`).
2. No fluxo de dados, em **Medição otimizada**, abra a engrenagem e **desligue "Mudanças de página
   com base em eventos do histórico de navegação"**. O site já envia uma página vista a cada troca de
   rota; deixar ligado contaria em dobro.
3. Em **Administrador → Coleta e retenção de dados**: deixe **Google signals desligado** e a
   retenção de dados em **2 meses** (o mínimo; basta para a campanha, desde que você exporte os números
   toda semana).
4. Na Vercel: projeto → **Settings → Environment Variables** → `VITE_GA4_ID` = o ID do passo 1, para
   **Production** e **Preview**. Depois, um novo deploy (o ID entra no build).
5. Confira no preview: na primeira visita aparece o aviso; ao aceitar, o relatório **Tempo real** do
   GA4 mostra a visita em até 1 minuto. Abra um link de teste (`utm_source=teste`) da coluna
   `url_recomendada` do `utm_links.csv`.

Sem a variável `VITE_GA4_ID`, o site continua sem medição, sem aviso e com o texto "não mede acessos".

## 3. Onde ver os acessos por `utm_source`

1. GA4 → **Relatórios → Aquisição → Aquisição de tráfego**.
2. Troque a dimensão principal para **Origem da sessão** (`utm_source`) ou **Origem/mídia da sessão**
   (`utm_source / utm_medium`). Filtre **Campanha da sessão** = `lancamento-2026-11`.
3. O código da ficha (`utm_content`, por exemplo `a1`) aparece em **Conteúdo do anúncio manual da
   sessão**, em **Explorar** → exploração livre.
4. A página de entrada aparece em **Engajamento → Páginas e telas**, por caminho (`/turnos`,
   `/nacional`, `/mudancas`). Os UTM não aparecem no caminho, e sim na dimensão "Local da página".
5. **Exporte toda semana** (botão compartilhar → baixar arquivo) e copie para a planilha do CRM o
   número de usuários e de sessões de cada `utm_source`, com a data.

## 4. Limitações

- Robôs de pré-visualização de e-mail e de redes sociais não aceitam o aviso, então não contam.
- Um acesso não identifica a pessoa: o mesmo link pode ser aberto por colegas do prospect.
- O botão Compartilhar do site tira os `utm_*`, para que o repasse do link não seja atribuído a quem
  o recebeu primeiro.

## 5. Como cruzar com o CRM

| Coluna do CRM (Status) | O que olhar na medição | Leitura |
|---|---|---|
| Primeiro contato enviado / Aguardando resposta | usuários com Origem da sessão = `<slug>` | 1 ou mais: o link foi clicado (e o aviso, aceito) |
| Follow-up 1 | visitantes antes e depois do follow-up | o follow-up gerou clique? |
| Respondeu / Interessado | páginas por sessão do mesmo `<slug>` | a pessoa explorou o site |
| Divulgação confirmada | sessões com origem no domínio do veículo (sem UTM do prospect) no dia da publicação | efeito da publicação |

Cuidados: só conta quem aceitou o aviso; um clique não é uma pessoa identificada (o mesmo slug pode ser aberto por colegas do
prospect); números pequenos (1 a 5) não permitem comparar canais; e robôs de pré-visualização de
e-mail e redes sociais podem gerar acessos que não são humanos.

## 6. Limitação das rotas por hash (T3)

Rastreadores de link e prévias de redes sociais (WhatsApp, LinkedIn, X) não leem o que vem depois do
`#`. Todo link do site mostra a mesma prévia (título e descrição de `index.html`), seja nacional ou
de uma UF. Não implementamos prévia por UF. Caminho simples, se valer a pena depois: gerar no build
27 páginas estáticas `/uf/mg/index.html`, cada uma com `og:title` e `og:image` do estado e um
redirecionamento para `/#/turnos?uf=MG`. Custo: cerca de 27 imagens e um script de build; não
muda o roteador.
