# 12. Verificação da mídia (T4): vídeo de 75 segundos e 4 imagens

Gerado em 19/11/2026 a partir do build do site neste branch. Todo número do vídeo e das imagens está
em [`election-intelligence/scripts/midia/roteiro.mjs`](../../election-intelligence/scripts/midia/roteiro.mjs)
e é conferido por teste: se os dados mudarem, a suíte falha.

## 1. Números do roteiro (item 8.4 do press kit)

| Número no roteiro original | Valor na base | Onde conferi | Status | No vídeo e nas imagens |
|---|---|---|---|---|
| Lula venceu em 2.876 municípios; Flavio, em 2.695 | vencedor único: 2.875 e 2.695, mais 1 empate (Marquinho, PR). Com o empate para os dois (regra do site): 2.876 e 2.696 | Vitest `divulgacao.test.js` | **ajustado** (o original misturava os dois critérios) | "Lula venceu em 2.875 municípios; Flavio Bolsonaro, em 2.695. Um município empatou." |
| Em Minas, 76 cidades trocaram de vencedor | 76 de 853, todos de Flavio para Lula, nenhum por empate | Vitest | ok | igual, com "entre os turnos" |
| As maiores ficam na Grande BH | Ribeirão das Neves, Santa Luzia, Ibirité, Sabará, Nova Lima | Vitest | ok | igual |
| Abstenção de 13,89% no Ceará a 26,08% no Acre | 13,89% e 26,08% (2º turno de 2026) | Vitest | ok | com "No 2º turno," no início |
| Efeito da renda de 8,8 para 1,7 ponto | −8,8 e −1,7 p.p. por dobra do PIB per capita (WLS) | pytest `test_divulgacao.py` | ok | igual, mais o cartão "Associação, não causalidade" |
| Abstenção no Brasil (imagem 3) | 19,22% | motor do site | ok | "No Brasil, 19,22%." |
| Lula 73,9% e 44,1% por quartil de PIB per capita (imagem 4) | 73,9% e 44,1% | Vitest | ok | igual |

O teste `todo número do roteiro, dos cartões e das imagens está na lista conferida na base` extrai
todos os números dos textos e falha se aparecer algum que não esteja na lista recalculada.

## 2. Vídeo

| Arquivo (em `assets/video/`) | Formato | Duração | Peso | No git |
|---|---|---|---|---|
| `election-intelligence_75s_1920x1080.mp4` | 1920×1080, H.264, 30 fps, AAC 48 kHz (faixa silenciosa) | 75,00 s | 5,3 MB | sim |
| `election-intelligence_75s_1080x1920.mp4` | 1080×1920 (vertical), mesmas especificações | 75,00 s | 7,6 MB | sim |
| `..._voz_sintetica_teste.mp4` (dois formatos) | com voz sintética do macOS (voz Luciana), só para avaliação | 75,00 s | 6,6 e 9,0 MB | não (`.gitignore`) |
| `legendas_pt-BR.srt` | legendas em português, as mesmas queimadas no vídeo | | | sim |
| `locucao.srt` e `locucao.txt` | texto da locução cronometrado, para Fernando gravar a própria voz | | | sim |

- **Tempos das cenas:** 0 a 8 s `#/nacional`; 8 a 20 s `#/mapa` (2º turno de 2026); 20 a 38 s
  `#/turnos?uf=MG`; 38 a 50 s `#/participacao` (abstenção); 50 a 63 s `#/perfil`; 63 a 71 s link
  (botão Compartilhar) e exportação em CSV; 71 a 75 s quadro final com o endereço do site e
  "Projeto independente, não oficial. Dados: TSE e IBGE."
- **Gravação:** telas reais do site, em Chrome controlado pelo Playwright, com capturas sequenciais
  (cerca de 18 a 25 por segundo) e o instante de cada uma; o ffmpeg monta 30 fps a partir desses
  instantes. Legendas, cartão e quadro final são renderizados com a fonte do site (IBM Plex Sans e
  Source Serif 4) e sobrepostos pelo ffmpeg.
- **Versão vertical:** viável sem distorcer o layout. É gravada no layout de celular do próprio site
  (432×768 a 2,5×, o que dá 1080×1920 nítidos), e não um recorte do vídeo horizontal.
- **Locução:** o vídeo principal não tem voz. A versão `_voz_sintetica_teste` usa o `say` do macOS,
  local e gratuito, só para Fernando avaliar ritmo e tempo. Nenhuma voz foi publicada.
- **Música:** nenhuma.
- **Legendas conferidas:** o teste `legendas: dentro dos 75 s, sem sobreposição, e o .srt versionado
  está atualizado` confere os intervalos, a ordem e o arquivo `.srt`.
- **Como refazer:**
  ```bash
  cd election-intelligence && npm run build
  PW_CHANNEL=chrome npx playwright test -c playwright.midia.config.js
  FFMPEG=/caminho/do/ffmpeg node scripts/midia/compor.mjs --voz
  ```
  O ffmpeg usado foi a versão 9.0 do pacote `imageio-ffmpeg` (PyPI), sem instalação no sistema:
  `uv run --with imageio-ffmpeg python -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())"`.

## 3. Imagens

Em `assets/imagens/`, cada uma em 1200×630 (prévia de link) e 1080×1350 (feed). Texto alternativo em
[`assets/imagens/alt_text.md`](assets/imagens/alt_text.md).

| Imagem | Captura do site | Título | Cores |
|---|---|---|---|
| 1. Mapa nacional | `#/mapa`, 2º turno de 2026 | Quem venceu em cada município (2.875 e 2.695; 1 empatou) | vermelho (Lula) e azul (Flavio), com legenda escrita |
| 2. Minas Gerais | `#/turnos?uf=MG` | 76 dos 853 municípios trocaram de vencedor; rodapé com o link `#/turnos?uf=MG` | amarelo (trocou) e cinza (manteve) |
| 3. Abstenção | `#/participacao`, abstenção por UF | De 13,89% no Ceará a 26,08% no Acre | escala de azul, um só tom |
| 4. Renda e voto | `#/perfil`, votos por quartil de PIB per capita | Lula com 73,9% e 44,1%; efeito de 8,8 para 1,7 ponto; ressalva "Associação, não causalidade" em destaque | vermelho e azul, com legenda escrita |

Regras atendidas: rodapé fixo "Fonte: TSE e IBGE · Elaboração: ELECTION INTELLIGENCE · Projeto não
oficial" e o endereço da página; nenhuma imagem usa vermelho e verde para distinguir candidatos (Lula
e Flavio são vermelho e azul, sempre com o nome escrito ao lado); sem fotografias de pessoas; sem
logotipos de terceiros (só a marca do projeto no quadro final do vídeo); títulos de 40 px (prévia) e
58 px (feed).

## 4. Limitações

- O vídeo mostra o site tal como está neste branch (com a página Sobre e contato). Se o site mudar
  antes do envio, grave de novo com os comandos acima.
- O mapa do vídeo e da imagem 1 usa a cor do partido com intensidade pela folga da vitória; quem não
  distingue vermelho de azul se apoia na legenda escrita e no texto.
- A abstenção na imagem 3 aparece arredondada a uma casa no gráfico do site (26,1% e 13,9%); o título
  traz os valores com duas casas.
