# Guia do dashboard: Eleições presidenciais 2014–2026 no Power BI

Passo a passo para montar o dashboard do zero: limpeza no Power Query, modelo de dados, medidas,
tema e cada página com seus gráficos.

**Arquivos desta pasta**

| Arquivo | Para que serve |
|---|---|
| `guia_dashboard.md` | Este guia |
| `medidas_dax.dax` | Medidas, colunas calculadas e a tabela de cores dos partidos |
| `tema_eleicoes_br.json` | Design system pronto para importar (cores, fontes, cartões, tabelas) |

**Ordem de trabalho**

| Etapa | O que fazer |
|---|---|
| 1 | Configurar o idioma da importação |
| 2 | Limpar os dados no Power Query |
| 3 | Montar o modelo (relacionamentos) |
| 4 | Criar as medidas DAX |
| 5 | Importar o tema |
| 6 | Montar o cabeçalho |
| 7 | Montar as páginas e gráficos |
| 8 | Checklist final |

> O Power BI Desktop só funciona no Windows. No Mac, use uma máquina virtual com Windows.

---

## Perguntas que o dashboard responde

1. Qual foi o resultado de cada eleição e turno, no país, por UF e por município?
2. Onde cada candidato venceu, e por qual margem?
3. Como a abstenção, os brancos e os nulos variam entre UFs e entre eleições?
4. Em quantos municípios o partido mais votado mudou de uma eleição para a outra?
5. O voto varia conforme o perfil do município (PIB per capita, alfabetização, porte)?
6. Os números batem com o resultado oficial do TSE?

---

## Etapa 1. Configurar o idioma da importação

O arquivo usa **ponto** como separador decimal (`88.35`). Com o Power BI em português, ele leria
`88.35` como `8835`.

1. **Arquivo > Opções e configurações > Opções**
2. Em **ARQUIVO ATUAL > Configurações regionais**, mude **Localidade para importação** para
   **Inglês (Estados Unidos)**.
3. Clique em **OK** antes de importar.

---

## Etapa 2. Limpeza dos dados no Power Query

A limpeza parte do arquivo `data/eleicoes_presidente.csv` (22 colunas, uma linha por candidato,
zona e turno) e gera **5 tabelas** organizadas em modelo estrela. É a mesma limpeza do notebook
`notebooks/limpeza_dados.ipynb`: os nomes das tabelas, das colunas e o número de linhas são iguais.

```
                  dCandidato
                      │
                      ▼
   dTurno ───────► fVotos ◄─────── dMunicipio
      │                                │
      └──────► fComparecimento ◄───────┘
```

| Tabela | Tipo | Uma linha = | Linhas |
|---|---|---|---|
| `Eleicoes` | apoio (não carrega) | candidato × zona × turno, já limpo | 340.702 |
| `dTurno` | dimensão | eleição e turno | 8 |
| `dCandidato` | dimensão | candidato em uma eleição | 47 |
| `dMunicipio` | dimensão | município ou cidade do exterior | 5.766 |
| `fVotos` | fato | votos de um candidato em um município, em um turno | 309.308 |
| `fComparecimento` | fato | eleitorado e comparecimento de um município, em um turno | 45.834 |

**Por que esse formato**

- Os totais de zona (aptos, comparecimento, brancos, nulos) se repetem em cada candidato no arquivo
  original. Separar votos e comparecimento em tabelas diferentes elimina o risco de somar o mesmo
  total várias vezes.
- Cada informação fica em um lugar só (o nome do município está só em `dMunicipio`), e os filtros
  do dashboard funcionam em todas as tabelas ao mesmo tempo.
- Os dados ficam no nível de **município**, que é o usado em todas as perguntas.

Cada consulta abaixo tem o passo a passo **pelos menus** e o **código M** equivalente. Você pode
seguir os cliques ou colar o código em **Página Inicial > Editor Avançado**. Os nomes dos passos
no código são os mesmos citados no notebook.

### 2.1 Parâmetro com o caminho do arquivo

**Página Inicial > Gerenciar Parâmetros > Novo Parâmetro**

- Nome: `CaminhoArquivo`
- Tipo: Texto
- Valor atual: o caminho completo do CSV, por exemplo
  `C:\projetos\eleicoes-br-sql\data\eleicoes_presidente.csv`

Assim, para usar o arquivo em outra pasta, basta mudar o parâmetro.

### 2.2 Consulta de apoio `Eleicoes`

É a base limpa da qual saem todas as outras tabelas.

**Pelos menus**

1. **Nova Fonte > Texto/CSV** > `eleicoes_presidente.csv` > Delimitador **Ponto e vírgula** >
   **Transformar dados**. Renomeie a consulta para `Eleicoes`.
2. **Fonte**: no passo `Fonte`, troque o caminho pelo parâmetro `CaminhoArquivo`.
3. **Tipos**: selecione as colunas e defina o tipo (**Transformar > Tipo de Dados**):
   - **Número inteiro**: `ano`, `nr_turno`, `cd_municipio_tse`, `cd_municipio_ibge`, `nr_zona`,
     `nr_candidato`, `qt_votos_nominais`, todas as `zona_*` e `populacao_2022`
   - **Número decimal**: `alfabetizacao_2022`, `pib_mil_reais`
   - **Texto**: as demais
4. **Textos**: selecione `municipio`, `nm_urna`, `sg_partido`, `sg_uf`, `situacao_turno` >
   **Transformar > Formato > Aparar** (tira espaços do começo e do fim).
5. **Regiao**: selecione `sg_regiao` > **Substituir Valores**: valor vazio por `EX`. Os vazios
   são todos do exterior (`sg_uf = ZZ`).
6. **NomeRegiao**: **Adicionar Coluna > Coluna Condicional** `nm_regiao`:
   N → Norte, NE → Nordeste, SE → Sudeste, S → Sul, CO → Centro-Oeste, senão → Exterior.
7. **NomeUF**: coluna `nm_uf` com o nome do estado por extenso (use o código abaixo; pelos menus
   seria uma coluna condicional com 28 regras).
8. **Exterior**: **Coluna Personalizada** `exterior` = `[sg_uf] = "ZZ"`, tipo **Verdadeiro/Falso**.
9. **MunicipioUF**: **Coluna Personalizada** `municipio_uf` = `[municipio] & " (" & [sg_uf] & ")"`.
10. **PartidoAtual**: **Coluna Condicional** `sg_partido_atual`: se `sg_partido` = `PSDC` então `DC`,
    senão o próprio `sg_partido` (o PSDC mudou de nome para DC em 2017).
11. **ChaveTurno**: **Coluna Personalizada** `chave_turno` =
    `Text.From([ano]) & "-" & Text.From([nr_turno])`
12. **ChaveCandidato**: **Coluna Personalizada** `chave_candidato` =
    `Text.From([ano]) & "-" & Text.From([nr_candidato])`
13. Clique direito na consulta > desmarque **Habilitar carga**. Ela serve só de base.

**Código M**

```m
let
    Fonte = Csv.Document(
        File.Contents(CaminhoArquivo),
        [Delimiter = ";", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]
    ),
    Cabecalhos = Table.PromoteHeaders(Fonte, [PromoteAllScalars = true]),
    Tipos = Table.TransformColumnTypes(
        Cabecalhos,
        {
            {"ano", Int64.Type}, {"nr_turno", Int64.Type},
            {"sg_regiao", type text}, {"sg_uf", type text},
            {"cd_municipio_tse", Int64.Type}, {"cd_municipio_ibge", Int64.Type},
            {"municipio", type text}, {"nr_zona", Int64.Type},
            {"nr_candidato", Int64.Type}, {"nm_urna", type text},
            {"sg_partido", type text}, {"situacao_turno", type text},
            {"qt_votos_nominais", Int64.Type},
            {"zona_aptos", Int64.Type}, {"zona_comparecimento", Int64.Type},
            {"zona_abstencoes", Int64.Type}, {"zona_votos_validos", Int64.Type},
            {"zona_votos_brancos", Int64.Type}, {"zona_votos_nulos", Int64.Type},
            {"populacao_2022", Int64.Type}, {"alfabetizacao_2022", type number},
            {"pib_mil_reais", type number}
        },
        "en-US"
    ),
    Textos = Table.TransformColumns(
        Tipos,
        {
            {"municipio", Text.Trim, type text}, {"nm_urna", Text.Trim, type text},
            {"sg_partido", Text.Trim, type text}, {"sg_uf", Text.Trim, type text},
            {"situacao_turno", Text.Trim, type text}
        }
    ),
    Regiao = Table.TransformColumns(
        Textos,
        {{"sg_regiao", each if _ = null or _ = "" then "EX" else _, type text}}
    ),
    Regioes = [N = "Norte", NE = "Nordeste", SE = "Sudeste", S = "Sul", CO = "Centro-Oeste", EX = "Exterior"],
    NomeRegiao = Table.AddColumn(
        Regiao, "nm_regiao", each Record.FieldOrDefault(Regioes, [sg_regiao], "Exterior"), type text
    ),
    UFs = [
        AC = "Acre", AL = "Alagoas", AP = "Amapá", AM = "Amazonas", BA = "Bahia", CE = "Ceará",
        DF = "Distrito Federal", ES = "Espírito Santo", GO = "Goiás", MA = "Maranhão",
        MT = "Mato Grosso", MS = "Mato Grosso do Sul", MG = "Minas Gerais", PA = "Pará",
        PB = "Paraíba", PR = "Paraná", PE = "Pernambuco", PI = "Piauí", RJ = "Rio de Janeiro",
        RN = "Rio Grande do Norte", RS = "Rio Grande do Sul", RO = "Rondônia", RR = "Roraima",
        SC = "Santa Catarina", SP = "São Paulo", SE = "Sergipe", TO = "Tocantins", ZZ = "Exterior"
    ],
    NomeUF = Table.AddColumn(
        NomeRegiao, "nm_uf", each Record.FieldOrDefault(UFs, [sg_uf], "Exterior"), type text
    ),
    Exterior = Table.AddColumn(NomeUF, "exterior", each [sg_uf] = "ZZ", type logical),
    MunicipioUF = Table.AddColumn(
        Exterior, "municipio_uf", each [municipio] & " (" & [sg_uf] & ")", type text
    ),
    PartidoAtual = Table.AddColumn(
        MunicipioUF, "sg_partido_atual", each if [sg_partido] = "PSDC" then "DC" else [sg_partido], type text
    ),
    ChaveTurno = Table.AddColumn(
        PartidoAtual, "chave_turno", each Text.From([ano]) & "-" & Text.From([nr_turno]), type text
    ),
    ChaveCandidato = Table.AddColumn(
        ChaveTurno, "chave_candidato", each Text.From([ano]) & "-" & Text.From([nr_candidato]), type text
    )
in
    ChaveCandidato
```

### 2.3 Dimensão `dTurno`

Clique direito em `Eleicoes` > **Referência**. Renomeie para `dTurno`.

1. **Escolher Colunas**: `chave_turno`, `ano`, `nr_turno`
2. **Remover Linhas > Remover Duplicatas**
3. **Coluna Personalizada** `rotulo_turno` = `Text.From([ano]) & " · " & Text.From([nr_turno]) & "º turno"`
4. **Coluna Personalizada** `ordem_turno` = `[ano] * 10 + [nr_turno]` (Número inteiro)
5. Classificar `ordem_turno` em ordem crescente

```m
let
    Fonte = Eleicoes,
    Colunas = Table.SelectColumns(Fonte, {"chave_turno", "ano", "nr_turno"}),
    Unicos = Table.Distinct(Colunas),
    Rotulo = Table.AddColumn(
        Unicos, "rotulo_turno", each Text.From([ano]) & " · " & Text.From([nr_turno]) & "º turno", type text
    ),
    Ordem = Table.AddColumn(Rotulo, "ordem_turno", each [ano] * 10 + [nr_turno], Int64.Type),
    Ordenado = Table.Sort(Ordem, {{"ordem_turno", Order.Ascending}})
in
    Ordenado
```

### 2.4 Dimensão `dCandidato`

Referência de `Eleicoes` > renomeie para `dCandidato`.

1. **Escolher Colunas**: `chave_candidato`, `ano`, `nr_candidato`, `nm_urna`, `sg_partido`,
   `sg_partido_atual`
2. **Remover Duplicatas**

```m
let
    Fonte = Eleicoes,
    Colunas = Table.SelectColumns(
        Fonte, {"chave_candidato", "ano", "nr_candidato", "nm_urna", "sg_partido", "sg_partido_atual"}
    ),
    Unicos = Table.Distinct(Colunas),
    Ordenado = Table.Sort(Unicos, {{"ano", Order.Ascending}, {"nr_candidato", Order.Ascending}})
in
    Ordenado
```

### 2.5 Dimensão `dMunicipio`

Referência de `Eleicoes` > renomeie para `dMunicipio`.

O PIB muda a cada ano. Para descrever o perfil do município, uso o **mais recente** (2023, ou 2022
quando o de 2023 não foi publicado), que está nas linhas de 2022 e 2026.

1. **Coluna Condicional** `pib_ref`: se `ano` ≥ 2022 então `pib_mil_reais`, senão `null`
2. **Agrupar Por** (Avançado) pelas colunas `cd_municipio_tse`, `cd_municipio_ibge`, `municipio`,
   `municipio_uf`, `sg_uf`, `nm_uf`, `sg_regiao`, `nm_regiao`, `exterior`, `populacao_2022`,
   `alfabetizacao_2022`, com a agregação `pib_mil_reais` = **Máximo** de `pib_ref`
3. **Coluna Personalizada** `pib_per_capita` = `[pib_mil_reais] * 1000 / [populacao_2022]`
   (o PIB está em mil reais), tipo Número decimal
4. **Coluna Condicional** `faixa_populacao`: vazio → Sem dado; até 5.000 → Até 5 mil;
   até 20.000 → 5 a 20 mil; até 100.000 → 20 a 100 mil; até 500.000 → 100 a 500 mil;
   senão → Mais de 500 mil
5. **Coluna Condicional** `ordem_faixa_populacao` com os números 0 a 5 na mesma ordem
6. **Coluna Personalizada** `local_mapa`: para o Brasil, `[municipio] & ", " & [nm_uf] & ", Brasil"`;
   para o exterior, só `[municipio]`. É o endereço que o mapa usa (com o estado, para não confundir
   municípios com o mesmo nome).

```m
let
    Fonte = Eleicoes,
    PibRef = Table.AddColumn(
        Fonte, "pib_ref", each if [ano] >= 2022 then [pib_mil_reais] else null, type nullable number
    ),
    Agrupado = Table.Group(
        PibRef,
        {"cd_municipio_tse", "cd_municipio_ibge", "municipio", "municipio_uf", "sg_uf", "nm_uf",
         "sg_regiao", "nm_regiao", "exterior", "populacao_2022", "alfabetizacao_2022"},
        {{"pib_mil_reais", each List.Max([pib_ref]), type nullable number}}
    ),
    PibPerCapita = Table.AddColumn(
        Agrupado, "pib_per_capita",
        each if [pib_mil_reais] = null or [populacao_2022] = null then null
             else [pib_mil_reais] * 1000 / [populacao_2022],
        type nullable number
    ),
    Faixa = Table.AddColumn(
        PibPerCapita, "faixa_populacao",
        each if [populacao_2022] = null then "Sem dado"
             else if [populacao_2022] <= 5000 then "Até 5 mil"
             else if [populacao_2022] <= 20000 then "5 a 20 mil"
             else if [populacao_2022] <= 100000 then "20 a 100 mil"
             else if [populacao_2022] <= 500000 then "100 a 500 mil"
             else "Mais de 500 mil",
        type text
    ),
    OrdemFaixa = Table.AddColumn(
        Faixa, "ordem_faixa_populacao",
        each if [populacao_2022] = null then 0
             else if [populacao_2022] <= 5000 then 1
             else if [populacao_2022] <= 20000 then 2
             else if [populacao_2022] <= 100000 then 3
             else if [populacao_2022] <= 500000 then 4
             else 5,
        Int64.Type
    ),
    LocalMapa = Table.AddColumn(
        OrdemFaixa, "local_mapa",
        each if [exterior] then [municipio] else [municipio] & ", " & [nm_uf] & ", Brasil",
        type text
    ),
    Ordenado = Table.Sort(LocalMapa, {{"cd_municipio_tse", Order.Ascending}})
in
    Ordenado
```

### 2.6 Fato `fVotos`

Referência de `Eleicoes` > renomeie para `fVotos`. Soma os votos das zonas de cada município.

1. **Agrupar Por** (Avançado) `chave_turno`, `ano`, `nr_turno`, `cd_municipio_tse`,
   `chave_candidato`, `situacao_turno`, com `qt_votos_nominais` = **Soma** de `qt_votos_nominais`

```m
let
    Fonte = Eleicoes,
    Agrupado = Table.Group(
        Fonte,
        {"chave_turno", "ano", "nr_turno", "cd_municipio_tse", "chave_candidato", "situacao_turno"},
        {{"qt_votos_nominais", each List.Sum([qt_votos_nominais]), Int64.Type}}
    )
in
    Agrupado
```

### 2.7 Fato `fComparecimento`

Referência de `Eleicoes` > renomeie para `fComparecimento`.

1. Selecione `chave_turno`, `cd_municipio_tse` e `nr_zona` > **Remover Duplicatas**. Fica uma
   linha por zona: é este passo que evita somar o mesmo total várias vezes.
2. **Agrupar Por** (Avançado) `chave_turno`, `ano`, `nr_turno`, `cd_municipio_tse`, com
   **Soma** de cada coluna de zona, já com o nome final:
   `aptos`, `comparecimento`, `abstencoes`, `votos_validos`, `votos_brancos`, `votos_nulos`

```m
let
    Fonte = Eleicoes,
    Zonas = Table.Distinct(Fonte, {"chave_turno", "cd_municipio_tse", "nr_zona"}),
    Agrupado = Table.Group(
        Zonas,
        {"chave_turno", "ano", "nr_turno", "cd_municipio_tse"},
        {
            {"aptos", each List.Sum([zona_aptos]), Int64.Type},
            {"comparecimento", each List.Sum([zona_comparecimento]), Int64.Type},
            {"abstencoes", each List.Sum([zona_abstencoes]), Int64.Type},
            {"votos_validos", each List.Sum([zona_votos_validos]), Int64.Type},
            {"votos_brancos", each List.Sum([zona_votos_brancos]), Int64.Type},
            {"votos_nulos", each List.Sum([zona_votos_nulos]), Int64.Type}
        }
    )
in
    Agrupado
```

### 2.8 Conferir a limpeza

Clique em **Fechar e Aplicar**. Em **Exibição de tabela**, confira o número de linhas de cada
tabela (rodapé da tela) com a tabela do início desta etapa: 8, 47, 5.766, 309.308 e 45.834.
Se algum número for diferente, algum passo ficou diferente do guia.

### Decisões da limpeza

| Situação | O que foi feito | Por quê |
|---|---|---|
| Totais de zona repetidos em cada candidato | Votos e comparecimento em tabelas separadas; zonas sem repetição antes de somar | Somar direto multiplica o total |
| Decimal com ponto | Importação em Inglês (EUA) | Evita `88.35` virar `8835` |
| Espaços sobrando nos textos | Aparar | Evita "PT" e "PT " serem dois partidos |
| Região vazia no exterior | `EX`, mais `nm_regiao` e `nm_uf` por extenso | Rótulos legíveis e mapa por estado |
| Indicadores vazios (exterior e Boa Esperança do Norte/MT) | Não preenchidos; coluna `exterior` | Não existe dado do IBGE para esses lugares |
| Municípios com o mesmo nome | `municipio_uf` e `local_mapa` com o estado; relacionamento pelo código | Não misturar cidades diferentes |
| PSDC virou DC (2017) | `sg_partido_atual` | Mesmo partido com outra sigla |
| Número do candidato repete entre eleições | `chave_turno` e `chave_candidato` | Ligar as tabelas sem misturar anos |
| PIB muda a cada ano | PIB mais recente em `dMunicipio` | Um perfil por município, comparável |
| Percentuais | Não ficam em colunas; são medidas DAX | Razão de somas certa em qualquer nível |

---

## Etapa 3. Modelo de dados

### 3.1 Relacionamentos (Exibição de modelo)

Todos **um para muitos**, filtro em **direção única**:

```
dTurno[chave_turno]            1 ──► * fVotos[chave_turno]
dTurno[chave_turno]            1 ──► * fComparecimento[chave_turno]
dMunicipio[cd_municipio_tse]   1 ──► * fVotos[cd_municipio_tse]
dMunicipio[cd_municipio_tse]   1 ──► * fComparecimento[cd_municipio_tse]
dCandidato[chave_candidato]    1 ──► * fVotos[chave_candidato]
```

Apague relacionamentos automáticos diferentes destes (por exemplo, pela coluna `ano`).

### 3.2 Ajustes de modelo

- `dTurno[rotulo_turno]` > **Ferramentas de coluna > Classificar por coluna > `ordem_turno`**
- `dMunicipio[faixa_populacao]` > **Classificar por coluna > `ordem_faixa_populacao`**
- `dMunicipio[nm_uf]` > **Categoria de dados: Estado ou Província**
- `dMunicipio[local_mapa]` > **Categoria de dados: Local**
- Nas tabelas de fatos, oculte as chaves e as colunas `ano` e `nr_turno` (clique direito >
  **Ocultar na exibição de relatório**): os filtros usam sempre as dimensões.
- Oculte também `ordem_turno` e `ordem_faixa_populacao`.
- Quantidades e população com **separador de milhar**; `pib_per_capita` como **Moeda (R$)**.

---

## Etapa 4. Medidas DAX

Faça esta etapa **depois** da limpeza: as medidas usam os nomes de tabelas e colunas da etapa 2.

1. **Página Inicial > Inserir dados** > nomeie a tabela `_Medidas` > **Carregar**.
2. **Modelagem > Nova tabela** > cole `PartidoCores` de `medidas_dax.dax`.
3. Em `dMunicipio`, **Nova coluna**: `Quartil PIB per capita` e `Quartil Alfabetização`.
   Os quartis ficam no DAX porque precisam comparar todos os municípios ao mesmo tempo.
4. Em `_Medidas`, crie cada medida (**Nova medida**) e organize em pastas
   (**Propriedades > Pasta de exibição**), seguindo os comentários `Pasta:` do arquivo.
5. Formatos:
   - Medidas com `%` > **Porcentagem**, 2 casas
   - `Variação p.p.`, `Variação Abstenção p.p.` e `Variação entre Turnos p.p.` > formato
     personalizado `+0.0" p.p.";-0.0" p.p."`
   - Contagens e votos > **Número inteiro** com separador de milhar
   - `PIB per capita` > **Moeda (R$)**, sem casas decimais
6. Exclua a coluna vazia de `_Medidas`: ela vira uma tabela de medidas e sobe para o topo da lista.

| Pasta | Medidas |
|---|---|
| 1 Eleitorado | Aptos, Comparecimento, Abstenções, Votos Válidos, Votos Brancos, Votos Nulos, % Abstenção, % Comparecimento, % Brancos, % Nulos, % Brancos e Nulos |
| 2 Votos | Votos, Votos Todos os Candidatos, % Votos Válidos, Posição |
| 3 Vencedores | Vencedor, Partido Vencedor, % do Vencedor, Margem de Vitória, Municípios Vencidos, % Municípios Vencidos |
| 4 Comparação entre eleições | Ano Selecionado, Partido Vencedor 1º Turno, Partido Vencedor 1º Turno Anterior, Mudou Partido Vencedor, Municípios que Mudaram, % Municípios que Mudaram, % Votos Válidos Eleição Anterior, Variação p.p., % Abstenção Eleição Anterior, Variação Abstenção p.p. |
| 5 Comparação entre turnos | Vencedor 1º Turno, Vencedor 2º Turno, Virou no 2º Turno, Municípios que Viraram, % Municípios que Viraram, Votos 1º Turno, Votos 2º Turno, Votos Ganhos no 2º Turno, % Votos Válidos 1º Turno, % Votos Válidos 2º Turno, Variação entre Turnos p.p. |
| 6 Perfil dos municípios | Municípios, População 2022, PIB per capita, Alfabetização |
| 7 Qualidade dos dados | Diferença de Apuração, Conferência Válidos |
| 8 Cores e textos | Cor do Partido, Cor do Partido Vencedor, Cor Mudança, Cor Virada, Título Eleição, Resumo Vencedor |

**Conferência das medidas** (sem nenhum filtro de município): `Municípios` = 5.571 ·
`PIB per capita` ≈ R$ 53.887 · `Alfabetização` = 92,87%.

---

## Etapa 5. Importar o design system

**Exibir > Temas > Procurar temas** > `tema_eleicoes_br.json`.

### Paleta

| Uso | Cor | Hex |
|---|---|---|
| Primária (cabeçalho, números dos cartões, títulos de tabela) | Azul bandeira | `#002776` |
| Destaque positivo, faixas | Verde bandeira | `#009C3B` |
| Destaque de atenção (ex.: municípios que mudaram) | Amarelo ouro | `#E3B505` |
| Faixa decorativa do cabeçalho | Amarelo bandeira | `#FFDF00` |
| Fundo da página | Cinza claro | `#F4F6F9` |
| Fundo dos visuais | Branco | `#FFFFFF` |
| Texto principal | Grafite | `#1C2333` |
| Texto secundário | Cinza | `#4A5568` |
| Bordas e grades | Cinza claro | `#E2E6EC` |

Escala para mapas e gradientes (ex.: abstenção): `#EEF3FA` → `#7FA8DD` → `#002776`.

### Cores dos partidos

Ficam na tabela `PartidoCores` e são aplicadas pelas medidas `Cor do Partido` e
`Cor do Partido Vencedor`. Os principais partidos têm cor própria; os menores ficam em tons de
cinza, o que destaca quem disputou de fato sem esconder ninguém.

| Partido | Hex | Partido | Hex |
|---|---|---|---|
| PT | `#C8102E` | NOVO | `#F26522` |
| PSDB | `#1E5AA8` | PSOL | `#F2C200` |
| PSB | `#F08C00` | REDE | `#0FA39A` |
| PSL | `#2E8B3E` | UNIÃO | `#00A3E0` |
| PL | `#23408E` | PODE | `#7CB342` |
| PDT | `#7B3FA0` | PSD | `#E0A100` |
| MDB | `#1F7A4D` | AVANTE | `#B5525C` |

As cores partem da identidade visual de cada partido e foram ajustadas para que partidos da mesma
eleição não fiquem parecidos (ex.: o PDT em roxo para não confundir com o vermelho do PT em 2018
e 2022). Ajuste os códigos na tabela se quiser.

**Como aplicar em um gráfico de barras**: selecione o visual > **Formatar > Barras > Cores >
fx** > Estilo de formato **Valor do campo** > campo **Cor do Partido**.

### Tipografia

| Elemento | Fonte | Tamanho |
|---|---|---|
| Título da página | Segoe UI Bold | 20 |
| Título dos visuais | Segoe UI Semibold | 12 |
| Número dos cartões | Segoe UI Semibold | 26 |
| Rótulos e eixos | Segoe UI | 9–10 |

### Grade da página

- Tamanho: **16:9 (1280 × 720)**
- Margem externa: **16 px**; espaço entre visuais: **12 px**
- Cabeçalho: **72 px** de altura em todas as páginas
- Bordas arredondadas de 8 px e sem sombra (já vêm do tema)

### Regras de neutralidade

- Mesmo tamanho, fonte e destaque para todos os candidatos; a ordem é sempre por votos.
- Sem adjetivos nos títulos: "Votos válidos por candidato", e não "Vitória esmagadora".
- Cor vem do partido, nunca de "bom" ou "ruim".
- Mostrar sempre o número junto da cor (rótulos de dados ligados), para não depender só da cor.

---

## Etapa 6. Cabeçalho (igual em todas as páginas)

Monte na primeira página e copie para as outras.

1. **Inserir > Formas > Retângulo**: 1280 × 64 px, posição (0, 0), cor `#002776`, sem borda.
2. Dois retângulos finos logo abaixo, como uma faixa da bandeira: 4 px de altura, um verde
   `#009C3B` (0 a 640 px) e um amarelo `#FFDF00` (640 a 1280 px).
3. **Cartão** com a medida `Título Eleição`: fundo transparente, texto branco, 18–20, alinhado à
   esquerda, sem rótulo de categoria.
4. **Segmentação** com `dTurno[rotulo_turno]`: estilo **Lista suspensa**, seleção única, no canto
   direito do cabeçalho. Em **Exibir > Sincronizar segmentações**, sincronize com todas as páginas.
5. **Inserir > Botões > Navegador > Navegador de página**, para trocar de página.

---

## Etapa 7. Páginas e gráficos

Em todos os mapas e gráficos de indicadores, use o filtro de visual **`dMunicipio[exterior]` =
Falso**.

### Página 1. Visão nacional

*Pergunta: qual foi o resultado e como foi a participação?*

| # | Visual | Campos | Formatação |
|---|---|---|---|
| 1 | 6 **Cartões** em linha | `Aptos`, `Comparecimento`, `% Abstenção`, `Votos Válidos`, `% Brancos`, `% Nulos` | Unidade de exibição "Milhões" nas quantidades |
| 2 | **Cartão** de destaque | `Resumo Vencedor` | Fonte 16, texto `#1C2333` |
| 3 | **Barras horizontais** "Votos válidos por candidato" | Eixo Y: `dCandidato[nm_urna]`; Valor: `% Votos Válidos`; Dica de ferramenta: `Votos`, `dCandidato[sg_partido_atual]`, `Municípios Vencidos` | Ordenar por `% Votos Válidos` decrescente; cores por `Cor do Partido`; rótulos de dados ligados |
| 4 | **Barras horizontais** "Municípios vencidos" | Eixo Y: `nm_urna`; Valor: `Municípios Vencidos` | Cores por `Cor do Partido`; filtro `exterior` = Falso |
| 5 | **Colunas agrupadas** "Participação ao longo das eleições" | Eixo X: `dTurno[rotulo_turno]`; Valores: `% Abstenção`, `% Brancos e Nulos` | **Formatar > Editar interações**: a segmentação do cabeçalho **não** filtra este visual |

**Conferência (2022 · 2º turno):** Aptos 156.454.011 · Comparecimento 124.252.796 ·
Abstenção 20,58% · Brancos 1,42% · Nulos 3,16% · LULA 50,90% · JAIR BOLSONARO 49,10%.

**Conferência (2026 · 2º turno):** Aptos 158.745.502 · Comparecimento 128.236.074 ·
Abstenção 19,22% · Brancos 1,12% · Nulos 2,12% · LULA 51,79% · FLAVIO BOLSONARO 48,21%.

### Página 2. Mapa dos vencedores

*Pergunta: onde cada candidato venceu, e por qual margem?*

| # | Visual | Campos | Formatação |
|---|---|---|---|
| 1 | **Mapa coroplético** por UF | Local: `dMunicipio[nm_uf]`; Dica de ferramenta: `Vencedor`, `% do Vencedor`, `Margem de Vitória` | **Cores de preenchimento > fx > Valor do campo > `Cor do Partido Vencedor`** |
| 2 | **Mapa (Azure Maps)** de bolhas por município | Local: `dMunicipio[local_mapa]`; Tamanho: `Aptos`; Dica: `Vencedor`, `% do Vencedor` | Cor das bolhas por `Cor do Partido Vencedor` |
| 3 | **Tabela** "Resultado por UF" | `dMunicipio[sg_uf]`, `Vencedor`, `% do Vencedor`, `Margem de Vitória`, `% Abstenção` | **Formatação condicional > Cor de fundo** da coluna `Vencedor` por `Cor do Partido Vencedor` (texto branco) |
| 4 | **Segmentação** | `dMunicipio[nm_regiao]` | Estilo blocos (botões) |

**Conferência (2022 · 2º turno, sem exterior):** LULA venceu em 3.125 municípios e
JAIR BOLSONARO em 2.447 (dois municípios empatados contam para os dois).

**Conferência (2026 · 2º turno, sem exterior):** LULA venceu em 2.876 municípios e
FLAVIO BOLSONARO em 2.696 (um município empatado conta para os dois).

> Se o Azure Maps não aparecer, habilite em **Arquivo > Opções > Segurança > Usar visuais de mapa
> e mapa coroplético**.

### Página 3. Comparecimento e abstenção

*Pergunta: como a participação varia entre lugares e eleições?*

| # | Visual | Campos | Formatação |
|---|---|---|---|
| 1 | **Mapa coroplético** por UF | Local: `nm_uf`; Cor: `% Abstenção` | Gradiente do tema (`#EEF3FA` → `#002776`) |
| 2 | **Barras horizontais** "% abstenção por UF" | Eixo: `sg_uf`; Valor: `% Abstenção` | Ordenar decrescente; **Análise > Linha constante** com a média nacional |
| 3 | **Linhas** "Abstenção por região ao longo do tempo" | Eixo X: `dTurno[rotulo_turno]`; Valor: `% Abstenção`; Legenda: `nm_regiao` | Não filtrar pela segmentação do cabeçalho (Editar interações) |
| 4 | **Colunas agrupadas** "Brancos e nulos" | Eixo: `dTurno[rotulo_turno]`; Valores: `% Brancos`, `% Nulos` | Mesma regra de interação |
| 5 | **Dispersão** "Abstenção × alfabetização" | Valores: `dMunicipio[cd_municipio_tse]`; X: `Alfabetização`; Y: `% Abstenção`; Tamanho: `Aptos` | Transparência 60% |
| 6 | **Cartão** | `Variação Abstenção p.p.` | Título "Variação vs. eleição anterior" |

**Conferência (2022 · 2º turno):** menor abstenção entre as UFs no DF (16,72%); o exterior tem
55,33%.

**Conferência (2026 · 2º turno):** menor abstenção entre as UFs no CE (13,89%); o exterior tem
58,34%.

### Página 4. Mudanças entre eleições

*Pergunta: onde o partido mais votado mudou? Quanto cada partido ganhou ou perdeu?*

Use esta página com uma eleição de **2018 em diante** (2014 não tem anterior no dataset).

| # | Visual | Campos | Formatação |
|---|---|---|---|
| 1 | 2 **Cartões** | `Municípios que Mudaram`, `% Municípios que Mudaram` | Número em `#E3B505` |
| 2 | **Mapa (Azure Maps)** | Local: `local_mapa`; Cor: `Cor Mudança` | Amarelo = mudou; cinza = manteve |
| 3 | **Tabela** "Municípios que mudaram" | `municipio_uf`, `Partido Vencedor 1º Turno Anterior`, `Partido Vencedor 1º Turno` | Filtro de visual: `Mudou Partido Vencedor` = 1 |
| 4 | **Matriz** "Variação por UF (p.p.)" | Linhas: `sg_uf`; Colunas: `dCandidato[sg_partido_atual]`; Valores: `Variação p.p.` | **Cor de fundo > Gradiente**: mínimo `#B8892B`, centro `#FFFFFF` (valor 0), máximo `#0F7B6C`. Filtre só os partidos que disputaram as duas eleições |
| 5 | **Segmentação** | `dCandidato[sg_partido_atual]` | Seleção única |

**Conferência (1º turno, sem exterior):** municípios que mudaram de partido vencedor:
2018 = 3.027 · 2022 = 2.980 · 2026 = 714.

> A medida compara siglas. PSL (2018) e PL (2022) são partidos diferentes, mesmo com o mesmo
> candidato, então contam como mudança. Explique isso numa caixa de texto da página.

### Página 5. Do 1º ao 2º turno

*Pergunta: onde o 2º turno mudou o vencedor? Quanto cada finalista cresceu?*

Use esta página com o **2º turno** de qualquer eleição na segmentação (as medidas buscam sozinhas
o 1º turno do mesmo ano).

| # | Visual | Campos | Formatação |
|---|---|---|---|
| 1 | 2 **Cartões** | `Municípios que Viraram`, `% Municípios que Viraram` | Número em `#E3B505` |
| 2 | **Mapa (Azure Maps)** | Local: `local_mapa`; Cor: `Cor Virada` | Amarelo = virou; cinza = manteve |
| 3 | **Tabela** "Municípios que viraram" | `municipio_uf`, `Vencedor 1º Turno`, `Vencedor 2º Turno` | Filtro de visual: `Virou no 2º Turno` = 1 |
| 4 | **Tabela** "Finalistas" | `dCandidato[nm_urna]`, `Votos 1º Turno`, `Votos 2º Turno`, `Votos Ganhos no 2º Turno`, `% Votos Válidos 1º Turno`, `% Votos Válidos 2º Turno`, `Variação entre Turnos p.p.` | Filtro de visual: `Votos 2º Turno` não está em branco |
| 5 | **Barras horizontais** "Variação por UF (p.p.)" | Eixo: `sg_uf`; Legenda: `nm_urna`; Valor: `Variação entre Turnos p.p.` | Cores por `Cor do Partido`; mesmo filtro da tabela 4 |

**Conferência (2026 · 2º turno, sem exterior):** 215 municípios viraram (3,86% de 5.571): 211 de
FLAVIO BOLSONARO para LULA, 1 de LULA para FLAVIO BOLSONARO e 3 com empate em um dos turnos.
LULA foi de 45,16% para 51,79% (+6,6 p.p.; +10.376.694 votos) e FLAVIO BOLSONARO de 47,03% para
48,21% (+1,2 p.p.; +3.721.538 votos). Em 2014, 2018 e 2022: 422, 246 e 256 municípios.

> A view `v_virada_municipio` do banco SQL desempata pelo número do candidato e por isso dá 213
> em 2026 (421, 245 e 254 nas anteriores); a diferença são só os municípios empatados.

### Página 6. Perfil socioeconômico

*Pergunta: o voto varia conforme o perfil do município?*

| # | Visual | Campos | Formatação |
|---|---|---|---|
| 1 | **Barras agrupadas** "Votos por faixa de PIB per capita" | Eixo: `Quartil PIB per capita`; Legenda: `nm_urna`; Valor: `% Votos Válidos` | Cores de cada candidato definidas à mão (Formatar > Barras > Cores), usando a tabela de cores |
| 2 | Mesmo visual por **porte** | Eixo: `faixa_populacao` | Já ordenado do menor para o maior (etapa 3.2) |
| 3 | Mesmo visual por **alfabetização** | Eixo: `Quartil Alfabetização` | — |
| 4 | **Dispersão** "PIB per capita × votação" | Valores: `cd_municipio_tse`; X: `PIB per capita`; Y: `% Votos Válidos`; Tamanho: `População 2022` | Eixo X em **escala logarítmica**; segmentação de candidato com seleção única |
| 5 | **Caixa de texto** | — | "Os indicadores descrevem o município, não o eleitor. Uma relação entre PIB e voto não mostra como cada pessoa votou." |

Quartis de referência (municípios do Brasil): PIB per capita R$ 16.823 · R$ 29.895 · R$ 49.808;
alfabetização 82,04% · 90,62% · 94,44%.

### Página 7. Sobre os dados

*Pergunta: os números são confiáveis?*

| # | Visual | Campos | Formatação |
|---|---|---|---|
| 1 | **Tabela** "Conferência com o TSE" | `dTurno[rotulo_turno]`, `Comparecimento`, `Votos Válidos`, `Votos Todos os Candidatos`, `Conferência Válidos`, `Diferença de Apuração` | Não filtrar pela segmentação |
| 2 | **Caixa de texto** "Fontes" | — | TSE, Portal de Dados Abertos (licença CC-BY); IBGE: Censo 2022 (SIDRA 4709 e 9543) e PIB dos Municípios (SIDRA 5938) |
| 3 | **Caixa de texto** "Limitações" | — | Ver lista abaixo |

**Conferência:** `Diferença de Apuração` é 0 em todos os 8 turnos, menos 2018 · 1º turno (746:
votos anulados e apurados em separado em Salvador/BA).

**Limitações para a caixa de texto**

- O exterior não tem dados do IBGE; em 2014 e 2018 faltam 684 e 470 eleitores aptos de zonas do
  exterior onde ninguém votou.
- Boa Esperança do Norte (MT) foi criado depois do Censo 2022 e não tem indicadores.
- O 2º turno de 2026 (25/10/2026) vem dos arquivos publicados pelo TSE em 28/10/2026.
- O perfil econômico usa o PIB mais recente (2023) e a população de 2022.

### Página extra (opcional). Dica de ferramenta do município

1. Nova página > **Formatar página > Informações da página > Permitir uso como dica de
   ferramenta**; tamanho **Dica de ferramenta** (320 × 240).
2. Cartões com `Vencedor`, `% do Vencedor`, `Margem de Vitória`, `% Abstenção`, `PIB per capita`.
3. Nos mapas, em **Dica de ferramenta > Tipo: Página do relatório**, escolha esta página.

---

## Etapa 8. Checklist final

- [ ] Localidade de importação em Inglês (EUA)
- [ ] Linhas das tabelas: 8 · 47 · 5.766 · 309.308 · 45.834
- [ ] A consulta `Eleicoes` com carga desabilitada
- [ ] Os 5 relacionamentos certos, sem relacionamentos automáticos extras
- [ ] Todos os números de **Conferência** deste guia batem
- [ ] Exterior filtrado nos mapas e nos gráficos de indicadores
- [ ] Segmentação do cabeçalho sincronizada em todas as páginas
- [ ] Gráficos de evolução com a interação da segmentação desligada
- [ ] Cores dos partidos aplicadas por `Cor do Partido` / `Cor do Partido Vencedor`
- [ ] Rótulos de dados ligados nos gráficos de barras
- [ ] Títulos sem adjetivos e fonte dos dados na página 7
- [ ] **Exibir > Desempenho**: nenhum visual acima de ~2 s (se o mapa de municípios ficar lento,
      limite os pontos com um filtro de UF)
