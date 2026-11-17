# Fórmulas Power Fx do app "Eleições no meu município"

Fórmulas prontas para colar no app canvas da Etapa 6 de [`guia_powerapps.md`](guia_powerapps.md).
Cada bloco diz em qual controle e propriedade a fórmula entra.

**Convenções**

| Prefixo | O que é | Exemplo |
|---|---|---|
| `scr` | Tela | `scrMunicipio` |
| `gal`, `lbl`, `btn`, `txt`, `drp`, `cmb`, `rdo`, `rect` | Controles | `galCandidatos` |
| `gbl` | Variável global (`Set`) | `gblTurno` |
| sem prefixo, maiúscula | Fórmula nomeada ou função de `App.Formulas` | `CorPrimaria`, `Pct()` |

- Tabelas e colunas usam os **nomes de exibição** da Etapa 3 (`'Resultados municipais'`,
  `pct_vencedor`).
- Os controles são os **clássicos** (Rótulo, Entrada de texto, Lista suspensa, Galeria). Se usar os
  controles modernos, troque `.Text` por `.Value` nas entradas de texto e `Default` por
  `DefaultSelectedItems` nas listas.
- O separador de fórmulas é o `;` (idioma inglês do Studio). Se o Studio estiver em português, ele
  troca `,` por `;` e `;` por `;;` sozinho ao colar.

**Variáveis globais**

| Variável | Tipo | Definida em | Conteúdo |
|---|---|---|---|
| `gblTurno` | Registro de Turnos | `scrInicio.OnVisible` e no seletor de turno | Eleição e turno escolhidos |
| `gblMun` | Registro de Municípios | Ao tocar num município | Município aberto |
| `gblRes` | Registro de Resultados municipais | `scrMunicipio.OnVisible` e no seletor de turno | Resultado de `gblMun` × `gblTurno` |
| `gblMunB` | Registro de Municípios | `scrComparar` | Segundo município da comparação |
| `gblQuiz*` | Vários | `scrQuiz` | Estado do quiz |

---

## 1. App.Formulas

Cole em **App > Formulas**. Nada aqui consulta as tabelas grandes; Turnos (8 linhas) e Candidatos
(47 linhas) vêm inteiros.

```powerfx
// ---------- Cores (iguais a powerbi/tema_eleicoes_br.json) ----------
CorPrimaria   = ColorValue("#002776");   // azul bandeira: cabeçalho, números dos cartões
CorVerde      = ColorValue("#009C3B");   // faixa do cabeçalho
CorFaixa      = ColorValue("#FFDF00");   // faixa do cabeçalho
CorAtencao    = ColorValue("#E3B505");   // selo "virou" / "mudou de partido"
CorFundo      = ColorValue("#F4F6F9");   // fundo das telas
CorCartao     = ColorValue("#FFFFFF");
CorTexto      = ColorValue("#1C2333");
CorTextoSec   = ColorValue("#4A5568");
CorBorda      = ColorValue("#E2E6EC");
CorSemPartido = ColorValue("#A9B4C2");   // partidos sem cor própria

// ---------- Tipografia ----------
FonteBase  = Font.'Segoe UI';
TamTitulo  = 20;
TamCartao  = 12;
TamNumero  = 26;
TamRotulo  = 11;

// ---------- Usuário ----------
UsuarioEmail = User().Email;

// ---------- Dimensões pequenas, carregadas inteiras ----------
TurnosLista = Sort(Turnos, ordem_turno, SortOrder.Descending);   // 2026 · 2º turno primeiro

CandidatosLista = ShowColumns(
    Candidatos,
    chave_candidato, nm_urna, sg_partido, partido_atual, cor_partido
);

// 27 UFs + ZZ (exterior). Vem de Comparecimentos UF (28 linhas por turno),
// e não de Distinct(Municípios), que passaria do limite de delegação.
UFsLista = Sort(
    ShowColumns(Filter('Comparecimentos UF', chave_turno = "2026-2"), sg_uf),
    sg_uf
);

// ---------- Funções ----------
// Cor do partido, da mesma tabela de cores do Power BI (coluna cor_partido).
CorDoPartido(partido: Text): Color =
    ColorValue(Coalesce(LookUp(CandidatosLista, partido_atual = partido).cor_partido, "#A9B4C2"));

// Número inteiro com ponto de milhar: 7284071 -> "7.284.071".
// O formato é escrito em inglês ([$-en-US]) e o resultado sai em português.
Fmt(n: Number): Text = If(IsBlank(n), "–", Text(n, "[$-en-US]#,##0", "pt-BR"));

// Percentual com uma casa: 55.5 -> "55,5%".
Pct(n: Number): Text = If(IsBlank(n), "–", Text(n, "[$-en-US]0.0", "pt-BR") & "%");

// "São João d'Aliança" -> "sao joao d'alianca", igual à coluna municipio_busca.
SemAcento(t: Text): Text =
    Concat(
        ForAll(Sequence(Len(t)), Mid(Lower(t), Value, 1)),
        If(
            IsBlank(Find(Value, "áàâãäéèêëíìîïóòôõöúùûüç")),
            Value,
            Mid("aaaaaeeeeiiiiooooouuuuc", Find(Value, "áàâãäéèêëíìîïóòôõöúùûüç"), 1)
        )
    );
```

> `SemAcento` percorre o texto letra por letra: `Sequence(Len(t))` gera 1, 2, 3…, `Mid` pega a
> letra e `Find` procura a letra na lista de acentuadas. As duas listas têm 23 letras, na mesma
> ordem.

**Fórmula para o tema dos controles.** Em vez de configurar cor por cor, aplique as fórmulas
nomeadas: `Fill` das telas = `CorFundo`; `Color` dos rótulos = `CorTexto`; `Font` = `FonteBase`.

---

## 2. Tela Início (`scrInicio`)

**Tela**

```powerfx
// scrInicio.OnVisible: na primeira abertura, começa no turno mais recente
If(IsBlank(gblTurno), Set(gblTurno, First(TurnosLista)))
```

**Seletor de turno** (`drpTurno`, Lista suspensa). Copie este controle para as outras telas que
mostram resultado.

```powerfx
drpTurno.Items    = TurnosLista
drpTurno.Value    = "rotulo_turno"            // coluna exibida (no painel: Valor = rotulo_turno)
drpTurno.Default  = gblTurno.rotulo_turno
drpTurno.OnChange = Set(gblTurno, Self.Selected)
drpTurno.AccessibleLabel = "Eleição e turno"
```

**Busca** (`txtBusca`, Entrada de texto) e **UF** (`drpUF`, Lista suspensa)

```powerfx
txtBusca.HintText    = "Digite o nome do município"
txtBusca.DelayOutput = true                   // só consulta quando a pessoa para de digitar
txtBusca.AccessibleLabel = "Buscar município"

drpUF.Items = UFsLista
drpUF.AllowEmptySelection = true
drpUF.Default = Blank()
drpUF.AccessibleLabel = "Filtrar por UF"
```

**Lista de municípios** (`galMunicipios`, Galeria vertical)

```powerfx
galMunicipios.Items =
    With(
        {
            busca: SemAcento(Trim(txtBusca.Text)),
            uf:    Coalesce(drpUF.Selected.sg_uf, "")
        },
        Sort(
            Filter(
                Municípios,
                StartsWith(municipio_busca, busca),   // delegável; "" casa com tudo
                StartsWith(sg_uf, uf)                 // UF vazia = todas
            ),
            municipio_busca
        )
    )

// Dentro da galeria
lblNomeMun.Text = ThisItem.municipio_uf
lblRegiao.Text  = If(ThisItem.exterior = 1, "Exterior", ThisItem.sg_uf_nome & " · " & ThisItem.sg_regiao_nome)

galMunicipios.OnSelect =
    Set(gblMun, ThisItem);
    Navigate(scrMunicipio, ScreenTransition.Cover)

// Mensagem quando não há resultado
lblSemResultado.Visible = Len(txtBusca.Text) > 0 && IsEmpty(galMunicipios.AllItems)
lblSemResultado.Text    = "Nenhum município começa com """ & txtBusca.Text & """."
```

> **Por que `StartsWith(sg_uf, uf)` e não `IsBlank(uf) || sg_uf = uf`:** a segunda forma pode
> deixar de ser delegável. `StartsWith` com texto vazio devolve verdadeiro para todas as linhas e
> vai inteira para o servidor.

**Cartão Brasil** (`galBrasil`, Galeria vertical com até 13 linhas)

```powerfx
galBrasil.Items = Sort(Filter('Resultados Brasil', chave_turno = gblTurno.chave_turno), posicao)

lblCandBR.Text   = ThisItem.nm_urna & " (" & ThisItem.sg_partido & ")"
lblPctBR.Text    = Pct(ThisItem.pct_validos) & " · " & Fmt(ThisItem.votos) & " votos"
rectBarraBR.Width = (Parent.TemplateWidth - 32) * ThisItem.pct_validos / 100
rectBarraBR.Fill  = ColorValue(LookUp(CandidatosLista, chave_candidato = ThisItem.chave_candidato).cor_partido)
```

Conferência: em 2026 · 2º turno a galeria mostra LULA 51,8% · 64.256.232 votos e FLAVIO
BOLSONARO 48,2% · 59.826.041 votos.

**Atalhos**

```powerfx
btnViradas.OnSelect   = Navigate(scrViradas)
btnFavoritos.OnSelect = Navigate(scrFavoritos)
btnSobre.OnSelect     = Navigate(scrSobre)
```

---

## 3. Tela Município (`scrMunicipio`)

**Carregar o resultado**

```powerfx
// scrMunicipio.OnVisible
Set(
    gblRes,
    LookUp('Resultados municipais', chave_resultado = gblTurno.chave_turno & "-" & gblMun.cd_municipio_tse)
)

// drpTurno (cópia do seletor) nesta tela: troca o turno e recarrega
drpTurno.OnChange =
    Set(gblTurno, Self.Selected);
    Set(
        gblRes,
        LookUp('Resultados municipais', chave_resultado = gblTurno.chave_turno & "-" & gblMun.cd_municipio_tse)
    )
```

> `chave_resultado` tem o formato `ano-turno-cd_municipio_tse` (`2026-2-71072`). A busca por
> igualdade numa coluna de texto é delegável e traz uma linha só.

**Cabeçalho**

```powerfx
cmpCabecalho.Titulo        = gblMun.municipio_uf
cmpCabecalho.MostrarVoltar = true
cmpCabecalho.AoVoltar      = Back()
```

**Cartões**

```powerfx
// Vencedor
lblVencedor.Text =
    Switch(
        true,
        IsBlank(gblRes.vencedor), "Sem votos válidos neste turno",
        gblRes.empate = 1, "Empate: " & gblRes.vencedor & " e " & gblRes.segundo,
        gblRes.vencedor & " (" & gblRes.partido_vencedor & ")"
    )
rectCorVencedor.Fill = CorDoPartido(gblRes.partido_vencedor)    // faixa fina à esquerda do cartão

// % dos válidos do 1º colocado
lblPctVencedor.Text = Pct(gblRes.pct_vencedor)

// Margem sobre o 2º colocado
lblMargem.Text =
    If(
        IsBlank(gblRes.margem_pp),
        "–",
        Text(gblRes.margem_pp, "[$-en-US]0.0", "pt-BR") & " p.p. sobre " & gblRes.segundo
    )

// Comparecimento
lblComparecimento.Text = Fmt(gblRes.comparecimento)
lblAptos.Text          = "de " & Fmt(gblRes.aptos) & " eleitores aptos"

// Abstenção e brancos/nulos (pct_brancos_nulos é a coluna de fórmula do Dataverse)
lblAbstencao.Text    = Pct(gblRes.pct_abstencao)
lblBrancosNulos.Text = Pct(gblRes.pct_brancos_nulos)
```

**Selos de mudança** (fundo `CorAtencao`, texto `CorTexto`)

```powerfx
// Só no 2º turno
lblSeloVirada.Visible = gblRes.virou_no_2t = 1
lblSeloVirada.Text    = "Virou no 2º turno. No 1º turno, o mais votado foi " & gblRes.vencedor_1t & "."

// Só no 1º turno: comparação com a eleição anterior
lblSeloPartido.Visible = gblRes.mudou_partido = 1
lblSeloPartido.Text    =
    "O partido mais votado mudou. Em " & (gblRes.ano - 4) & ", foi o " &
    gblRes.partido_vencedor_anterior & "."
```

**Barras por candidato** (`galCandidatos`, Galeria vertical em branco)

O coração do app: transforma o texto `votos_json` numa tabela e junta com Candidatos.

```powerfx
galCandidatos.Items =
    With(
        {
            // [{"n":13,"v":3864354},{"n":22,"v":3097923}] -> tabela com colunas n e v
            votos: ForAll(
                ParseJSON(gblRes.votos_json),
                { n: Value(ThisRecord.n), v: Value(ThisRecord.v) }
            )
        },
        AddColumns(
            votos,
            cand, LookUp(CandidatosLista, chave_candidato = gblRes.ano & "-" & n),
            pct,  If(gblRes.votos_validos > 0, v / gblRes.votos_validos * 100, 0)
        )
    )
// O JSON já vem em ordem de votos (posição), então a galeria não precisa de Sort.

// Dentro da galeria (altura do modelo: 44)
lblCand.Text       = ThisItem.cand.nm_urna & " (" & ThisItem.cand.partido_atual & ")"
lblCandValor.Text  = Pct(ThisItem.pct) & " · " & Fmt(ThisItem.v)
rectBarra.Width    = (Parent.TemplateWidth - 24) * ThisItem.pct / 100   // escala fixa de 0 a 100%
rectBarra.Fill     = ColorValue(Coalesce(ThisItem.cand.cor_partido, "#A9B4C2"))
rectBarra.AccessibleLabel = ThisItem.cand.nm_urna & ": " & Pct(ThisItem.pct) & " dos votos válidos"

galCandidatos.Height = Min(CountRows(Self.AllItems), 13) * Self.TemplateHeight
```

> **Escala fixa de 0 a 100%** (e não "a maior barra ocupa a largura toda") para que dois municípios
> lado a lado na tela Comparar fiquem na mesma escala.
>
> Alternativa tipada, sem `ForAll`: `ParseJSON(gblRes.votos_json, Type([{ n: Number, v: Number }]))`.

Conferência: São Paulo (SP) · 2026 · 2º turno mostra LULA 55,5% · 3.864.354 e FLAVIO BOLSONARO
44,5% · 3.097.923; os dois somam os 6.962.277 votos válidos.

**Município · UF · Brasil** (`galNiveis`, Galeria vertical com 3 linhas)

Compara o 1º colocado do município e a abstenção com a UF e com o Brasil. Os valores de UF e Brasil
vêm de tabelas próprias (razão de somas), nunca da média dos municípios.

```powerfx
galNiveis.Items =
    With(
        {
            n1:      First(galCandidatos.AllItems).n,                 // nº do 1º colocado
            chaveUF: gblTurno.chave_turno & "-" & gblRes.sg_uf
        },
        Table(
            {
                nivel: gblMun.municipio,
                pct1:  gblRes.pct_vencedor,
                abst:  gblRes.pct_abstencao
            },
            {
                nivel: If(gblMun.exterior = 1, "Exterior", gblMun.sg_uf_nome),
                pct1:  LookUp('Resultados UF', chave_resultado_uf = chaveUF & "-" & n1).pct_validos,
                abst:  LookUp('Comparecimentos UF', chave_comparecimento_uf = chaveUF).pct_abstencao
            },
            {
                nivel: "Brasil",
                pct1:  LookUp('Resultados Brasil', chave_resultado_br = gblTurno.chave_turno & "-" & n1).pct_validos,
                abst:  LookUp(Conferências, chave_turno = gblTurno.chave_turno).pct_abstencao
            }
        )
    )

lblNiveisTitulo.Text = "% de " & First(galCandidatos.AllItems).cand.nm_urna & " e abstenção"
lblNivel.Text        = ThisItem.nivel
lblNivelPct.Text     = Pct(ThisItem.pct1)
lblNivelAbst.Text    = Pct(ThisItem.abst)
```

**Navegação**

```powerfx
btnPerfil.OnSelect   = Navigate(scrPerfil)
btnComparar.OnSelect = Navigate(scrComparar)
```

Os botões de favorito, anotação e e-mail estão na seção 7.

---

## 4. Tela Comparar (`scrComparar`)

O município A é `gblMun`. O B é escolhido com a mesma busca da tela Início (uma caixa de
combinação faria a própria busca no cliente, que diferencia acentos).

```powerfx
// txtBuscaB (Entrada de texto) + galBuscaB (Galeria vertical, some depois da escolha)
txtBuscaB.HintText    = "Comparar com…"
txtBuscaB.DelayOutput = true
txtBuscaB.AccessibleLabel = "Buscar município para comparar"

galBuscaB.Items   = Filter(Municípios, StartsWith(municipio_busca, SemAcento(Trim(txtBuscaB.Text))))
galBuscaB.Visible = Len(Trim(txtBuscaB.Text)) > 0
galBuscaB.OnSelect =
    Set(gblMunB, ThisItem);
    Reset(txtBuscaB)

// galComparar (Galeria horizontal, 2 itens, cada um com metade da largura)
galComparar.Items =
    Table(
        { mun: gblMun, res: gblRes },
        {
            mun: gblMunB,
            res: LookUp(
                'Resultados municipais',
                chave_resultado = gblTurno.chave_turno & "-" & gblMunB.cd_municipio_tse
            )
        }
    )
galComparar.TemplateSize = Parent.Width / 2 - 24
galComparar.Visible      = !IsBlank(gblMunB)
```

Dentro de `galComparar`, repita os cartões da seção 3 trocando `gblRes` por `ThisItem.res` e
`gblMun` por `ThisItem.mun`. A galeria de barras fica aninhada:

```powerfx
galBarrasComp.Items =
    With(
        { r: ThisItem.res },
        AddColumns(
            ForAll(ParseJSON(r.votos_json), { n: Value(ThisRecord.n), v: Value(ThisRecord.v) }),
            cand, LookUp(CandidatosLista, chave_candidato = r.ano & "-" & n),
            pct,  If(r.votos_validos > 0, v / r.votos_validos * 100, 0)
        )
    )
```

---

## 5. Tela Viradas (`scrViradas`)

Responde à pergunta 4 do README: onde o vencedor mudou. O exterior fica de fora, como no Power BI.

```powerfx
rdoTipo.Items   = ["Do 1º para o 2º turno", "Entre eleições (1º turno)"]
rdoTipo.Default = "Do 1º para o 2º turno"

drpUFViradas.Items = Filter(UFsLista, sg_uf <> "ZZ")
drpUFViradas.AllowEmptySelection = true

galViradas.Items =
    With(
        {
            ano: gblTurno.ano,
            uf:  Coalesce(drpUFViradas.Selected.sg_uf, "")
        },
        If(
            rdoTipo.Selected.Value = "Do 1º para o 2º turno",
            Sort(
                Filter(
                    'Resultados municipais',
                    chave_turno = ano & "-2",
                    virou_no_2t = 1,
                    sg_uf <> "ZZ",
                    StartsWith(sg_uf, uf)
                ),
                margem_pp, SortOrder.Ascending          // as viradas mais apertadas primeiro
            ),
            Sort(
                Filter(
                    'Resultados municipais',
                    chave_turno = ano & "-1",
                    mudou_partido = 1,
                    sg_uf <> "ZZ",
                    StartsWith(sg_uf, uf)
                ),
                margem_pp, SortOrder.Ascending
            )
        )
    )

// Dentro da galeria
lblVirMun.Text = ThisItem.municipio & " (" & ThisItem.sg_uf & ")"
lblVirDe.Text  =
    If(
        rdoTipo.Selected.Value = "Do 1º para o 2º turno",
        "1º turno: " & ThisItem.vencedor_1t & "  →  2º turno: " & ThisItem.vencedor,
        ThisItem.ano - 4 & ": " & ThisItem.partido_vencedor_anterior & "  →  " &
            ThisItem.ano & ": " & ThisItem.partido_vencedor
    )
lblVirMargem.Text = "Margem: " & Text(ThisItem.margem_pp, "[$-en-US]0.0", "pt-BR") & " p.p."
rectVirCor.Fill   = CorDoPartido(ThisItem.partido_vencedor)

galViradas.OnSelect =
    Set(gblMun, LookUp(Municípios, cd_municipio_tse = ThisItem.cd_municipio_tse));
    Navigate(scrMunicipio)
```

**Contador.** `CountRows` sobre um `Filter` delegável é resolvido no servidor. Não use
`CountRows(galViradas.AllItems)`: a galeria só carrega as linhas que já apareceram na tela.

```powerfx
lblContador.Text =
    With(
        { ano: gblTurno.ano, uf: Coalesce(drpUFViradas.Selected.sg_uf, "") },
        Fmt(
            If(
                rdoTipo.Selected.Value = "Do 1º para o 2º turno",
                CountRows(Filter('Resultados municipais', chave_turno = ano & "-2", virou_no_2t = 1, sg_uf <> "ZZ", StartsWith(sg_uf, uf))),
                CountRows(Filter('Resultados municipais', chave_turno = ano & "-1", mudou_partido = 1, sg_uf <> "ZZ", StartsWith(sg_uf, uf)))
            )
        ) & " municípios"
    )
```

Conferência (todas as UFs):

| Eleição | Do 1º para o 2º turno | Entre eleições (1º turno) |
|---|---|---|
| 2026 | 213 (212 para LULA, 1 para FLAVIO BOLSONARO) | 714 |
| 2022 | — | 2.979 (o Power BI mostra 2.980; ver "Decisões dos dados" no guia) |
| 2018 | — | 3.027 |

---

## 6. Tela Perfil (`scrPerfil`)

```powerfx
lblPopulacao.Text  = Fmt(gblMun.populacao_2022) & " habitantes (Censo 2022)"
lblFaixa.Text      = gblMun.faixa_populacao
lblAlfab.Text      = Pct(gblMun.alfabetizacao_2022) & " das pessoas de 15 anos ou mais alfabetizadas"
lblPibPC.Text      = "R$ " & Fmt(gblMun.pib_per_capita) & " de PIB per capita (2023)"

// Sem dados do IBGE: exterior e Boa Esperança do Norte (MT), criado depois do Censo
lblSemIBGE.Visible = IsBlank(gblMun.populacao_2022)
lblSemIBGE.Text    =
    If(gblMun.exterior = 1, "O IBGE não tem dados de cidades do exterior.",
       "Este município foi criado depois do Censo 2022 e ainda não tem indicadores.")

lblAviso.Text =
    "Estes indicadores ajudam a descrever o município. Uma associação entre perfil e voto " &
    "não significa que um cause o outro."
```

---

## 7. Favoritos, anotações e e-mail

### 7.1 Favoritar (na `scrMunicipio`)

```powerfx
btnFavorito.Text =
    If(
        IsBlank(LookUp(Favoritos, chave_favorito = UsuarioEmail & "|" & gblMun.cd_municipio_tse)),
        "☆ Salvar nos favoritos",
        "★ Nos favoritos"
    )

btnFavorito.OnSelect =
    With(
        { fav: LookUp(Favoritos, chave_favorito = UsuarioEmail & "|" & gblMun.cd_municipio_tse) },
        If(
            IsBlank(fav),
            Patch(
                Favoritos,
                Defaults(Favoritos),
                {
                    chave_favorito:   UsuarioEmail & "|" & gblMun.cd_municipio_tse,
                    email_usuario:    UsuarioEmail,
                    cd_municipio_tse: gblMun.cd_municipio_tse,
                    municipio_uf:     gblMun.municipio_uf
                }
            ),
            Remove(Favoritos, fav)
        )
    )
```

> A chave alternativa em `chave_favorito` impede que o mesmo município entre duas vezes, mesmo que
> a pessoa toque no botão duas vezes seguidas.

### 7.2 Nova anotação (painel na `scrMunicipio`)

```powerfx
drpTema.Items = Choices(Anotações.tema)
drpTema.AllowEmptySelection = true
drpTema.Default = Blank()

btnSalvarNota.DisplayMode =
    If(IsBlank(Trim(txtTitulo.Text)) || IsBlank(drpTema.Selected), DisplayMode.Disabled, DisplayMode.Edit)

btnSalvarNota.OnSelect =
    IfError(
        Patch(
            Anotações,
            Defaults(Anotações),
            {
                titulo:           Trim(txtTitulo.Text),
                texto:            txtTexto.Text,
                tema:             drpTema.Selected.Value,
                origem:           "App",
                cd_municipio_tse: gblMun.cd_municipio_tse,
                chave_turno:      gblTurno.chave_turno,
                email_autor:      UsuarioEmail
            }
        ),
        Notify("Não foi possível salvar: " & FirstError.Message, NotificationType.Error),
        Notify("Anotação salva.", NotificationType.Success);
        Reset(txtTitulo);
        Reset(txtTexto);
        Reset(drpTema)
    )
```

> `IfError(valor, se_der_erro, se_der_certo)`: com três argumentos, o terceiro só roda quando o
> `Patch` funciona.

### 7.3 Tela Favoritos (`scrFavoritos`)

```powerfx
galFav.Items = Sort(Filter(Favoritos, email_usuario = UsuarioEmail), municipio_uf)
galFav.OnSelect =
    Set(gblMun, LookUp(Municípios, cd_municipio_tse = ThisItem.cd_municipio_tse));
    Navigate(scrMunicipio)
icoRemoverFav.OnSelect = Remove(Favoritos, ThisItem)
icoRemoverFav.AccessibleLabel = "Remover " & ThisItem.municipio_uf & " dos favoritos"

galNotas.Items = Sort(Filter(Anotações, email_autor = UsuarioEmail), 'Criado em', SortOrder.Descending)
lblNotaTitulo.Text = ThisItem.titulo
lblNotaInfo.Text   =
    LookUp(Municípios, cd_municipio_tse = ThisItem.cd_municipio_tse).municipio_uf & " · " &
    Text(ThisItem.tema) & " · " & ThisItem.origem & " · " & Text(ThisItem.'Criado em', "dd/mm/yyyy")
lblNotaTexto.Text  = ThisItem.texto
icoExcluirNota.OnSelect = Remove(Anotações, ThisItem)
icoExcluirNota.AccessibleLabel = "Excluir a anotação " & ThisItem.titulo
```

> `'Criado em'` é a coluna de sistema `createdon` (aparece como `'Created On'` com o Studio em
> inglês).

### 7.4 Enviar o resumo por e-mail

Depois de criar o fluxo da Etapa 9.1: **Power Automate > Adicionar fluxo > Enviar resumo do
municipio**.

```powerfx
btnEmail.Text = "Enviar resumo para o meu e-mail"
btnEmail.OnSelect =
    IfError(
        Enviarresumodomunicipio.Run(gblRes.chave_resultado, UsuarioEmail),
        Notify("Não foi possível enviar o resumo.", NotificationType.Error),
        Notify("Resumo enviado para " & UsuarioEmail & ".", NotificationType.Success)
    )
btnEmail.Visible = !IsBlank(gblRes.vencedor)
```

---

## 8. Tela Sobre os dados (`scrSobre`)

```powerfx
galConferencia.Items =
    AddColumns(
        Sort(Conferências, ano, SortOrder.Descending, nr_turno, SortOrder.Descending),
        rotulo, LookUp(TurnosLista, chave_turno = ThisRecord.chave_turno).rotulo_turno
    )

lblConfTurno.Text   = ThisItem.rotulo
lblConfNumeros.Text =
    "Comparecimento " & Fmt(ThisItem.comparecimento) &
    " · válidos " & Fmt(ThisItem.votos_validos) &
    " · brancos " & Fmt(ThisItem.votos_brancos) &
    " · nulos " & Fmt(ThisItem.votos_nulos) &
    " · abstenção " & Pct(ThisItem.pct_abstencao)

lblFontes.Text =
    "TSE: Portal de Dados Abertos (licença CC-BY). " &
    "IBGE: Censo 2022 (SIDRA 4709 e 9543) e PIB dos Municípios (SIDRA 5938)."

lblLimitacoes.Text =
    "• O exterior não tem dados do IBGE." & Char(10) &
    "• Boa Esperança do Norte (MT) foi criado depois do Censo 2022 e não tem indicadores." & Char(10) &
    "• O 2º turno de 2026 (25/10/2026) vem dos arquivos publicados pelo TSE em 28/10/2026." & Char(10) &
    "• O perfil econômico usa o PIB de 2023 e a população de 2022."
```

> `Sort` com duas colunas sobre Conferências (8 linhas) não tem problema de delegação.

Conferência: 2022 · 2º turno com comparecimento 124.252.796; 2026 · 2º turno com 128.236.074.

---

## 9. App de anotações dentro do Power BI

App separado, criado pelo visual **Power Apps for Power BI** (Etapa 8.2 do guia). O objeto
`PowerBIIntegration.Data` traz as linhas que o relatório filtrou, com os campos arrastados para o
visual: `cd_municipio_tse`, `municipio_uf` e `chave_turno`. Adicione a tabela Anotações em **Dados**.

```powerfx
// Município selecionado no relatório (o visual passa no máximo 1.000 linhas)
lblMunPBI.Text =
    Switch(
        CountRows(PowerBIIntegration.Data),
        0, "Nenhum município no filtro do relatório.",
        1, First(PowerBIIntegration.Data).municipio_uf,
        "Clique em um município da tabela ao lado (" &
            CountRows(PowerBIIntegration.Data) & " no filtro)."
    )

drpTemaPBI.Items = Choices(Anotações.tema)

btnSalvarPBI.DisplayMode =
    If(
        CountRows(PowerBIIntegration.Data) = 1 && !IsBlank(Trim(txtTituloPBI.Text)) && !IsBlank(drpTemaPBI.Selected),
        DisplayMode.Edit,
        DisplayMode.Disabled
    )

btnSalvarPBI.OnSelect =
    With(
        { sel: First(PowerBIIntegration.Data) },
        IfError(
            Patch(
                Anotações,
                Defaults(Anotações),
                {
                    titulo:           Trim(txtTituloPBI.Text),
                    texto:            txtTextoPBI.Text,
                    tema:             drpTemaPBI.Selected.Value,
                    origem:           "Power BI",
                    cd_municipio_tse: Value(sel.cd_municipio_tse),
                    chave_turno:      Text(sel.chave_turno),
                    email_autor:      User().Email
                }
            ),
            Notify("Não foi possível salvar: " & FirstError.Message, NotificationType.Error),
            Notify("Anotação salva.", NotificationType.Success);
            Reset(txtTituloPBI);
            Reset(txtTextoPBI);
            PowerBIIntegration.Refresh()          // atualiza o relatório (Anotação em DirectQuery)
        )
    )
```

> Se o relatório estiver com mais de um turno no filtro, `chave_turno` pega o do primeiro registro.
> Deixe a segmentação de turno do cabeçalho em seleção única, como no guia do Power BI.

---

## 10. Quiz "Quem venceu aqui?" (opcional)

Sorteia um município do Brasil, mostra os três mais votados em ordem aleatória e a pessoa palpita.
O sorteio usa `ordem_alfabetica` (1 a 5.571), por isso é delegável: `Shuffle(Municípios)` só
embaralharia as 500 primeiras linhas.

```powerfx
// btnSortear.OnSelect (e scrQuiz.OnVisible, se gblQuizMun estiver vazio)
Set(gblQuizMun, LookUp(Municípios, ordem_alfabetica = RandBetween(1, 5571)));
Set(
    gblQuizRes,
    LookUp('Resultados municipais', chave_resultado = gblTurno.chave_turno & "-" & gblQuizMun.cd_municipio_tse)
);
Set(gblQuizResposta, Blank())

lblQuizMun.Text = "Quem venceu em " & gblQuizMun.municipio_uf & " em " & gblTurno.rotulo_turno & "?"

// Opções: os 3 mais votados, embaralhados (tabela pequena, em memória)
galQuizOpcoes.Items =
    Shuffle(
        FirstN(
            AddColumns(
                ForAll(ParseJSON(gblQuizRes.votos_json), { n: Value(ThisRecord.n), v: Value(ThisRecord.v) }),
                cand, LookUp(CandidatosLista, chave_candidato = gblQuizRes.ano & "-" & n)
            ),
            3
        )
    )

btnOpcao.Text = ThisItem.cand.nm_urna & " (" & ThisItem.cand.partido_atual & ")"
btnOpcao.DisplayMode = If(IsBlank(gblQuizResposta), DisplayMode.Edit, DisplayMode.View)
btnOpcao.OnSelect =
    Set(gblQuizResposta, ThisItem.n);
    Set(gblQuizRodadas, Coalesce(gblQuizRodadas, 0) + 1);
    If(
        ThisItem.cand.nm_urna = gblQuizRes.vencedor,
        Set(gblQuizPontos, Coalesce(gblQuizPontos, 0) + 1)
    )

// Depois do palpite, a cor do partido aparece (antes, todas as opções ficam neutras)
btnOpcao.Fill = If(IsBlank(gblQuizResposta), CorCartao, ColorValue(Coalesce(ThisItem.cand.cor_partido, "#A9B4C2")))

lblQuizResultado.Visible = !IsBlank(gblQuizResposta)
lblQuizResultado.Text =
    gblQuizRes.vencedor & " venceu com " & Pct(gblQuizRes.pct_vencedor) & " dos votos válidos." &
    " Pontos: " & Coalesce(gblQuizPontos, 0) & " de " & gblQuizRodadas & "."
```

> No 2º turno só há dois candidatos, então `FirstN(…, 3)` devolve dois. O quiz funciona igual.

---

## 11. Conferir antes de publicar

| Onde | Esperado |
|---|---|
| Verificador de aplicativos | Nenhum aviso de delegação |
| Início · 2026 · 2º turno · cartão Brasil | LULA 51,8% · 64.256.232; FLAVIO BOLSONARO 48,2% · 59.826.041 |
| Busca "sao paulo" e "São Paulo" | O mesmo resultado, São Paulo (SP) primeiro |
| São Paulo (SP) · 2026 · 2º turno | LULA 55,5% · margem 11,0 p.p. · comparecimento 7.284.071 · abstenção 20,4% |
| Serra da Saudade (MG) · 2026 · 2º turno | FLAVIO BOLSONARO 58,1% · comparecimento 931 |
| Lisboa (ZZ) · 2026 · 2º turno | LULA 60,1%; a linha da UF diz "Exterior"; o Perfil mostra o aviso do IBGE |
| Viradas · 2026 · do 1º para o 2º turno | 213 municípios |
| Viradas · 2026 · entre eleições | 714 municípios |
| Favoritar e desfavoritar duas vezes | Nunca aparece duplicado em Favoritos |
| Anotação sem tema | Botão desabilitado |
| Abrir com outra conta | Não vê os favoritos nem as anotações da primeira |
