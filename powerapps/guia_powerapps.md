# Guia do Power Apps: Eleições presidenciais 2014–2026 na Power Platform

Passo a passo para levar o projeto para a Power Platform: tabelas no Dataverse, um app canvas de
consulta, um app model-driven de bastidores, a integração com o Power BI, dois fluxos do Power
Automate e a Solution versionada no git.

**Arquivos desta pasta**

| Arquivo | Para que serve |
|---|---|
| `guia_powerapps.md` | Este guia |
| `formulas_powerfx.md` | Fórmulas Power Fx do app canvas, prontas para colar, com comentários |
| `solution/` | A Solution desempacotada (`pac solution unpack`), criada na Etapa 10 |
| `midia/` | Prints e o GIF de demonstração |

Os dados vêm de `scripts/gerar_tabelas_powerapps.py`, que grava `data/powerapps/*.csv`.

**Ordem de trabalho**

| Etapa | O que fazer |
|---|---|
| 0 | Garantir o ambiente |
| 1 | Gerar os CSVs |
| 2 | Criar o publisher e a Solution |
| 3 | Criar as tabelas no Dataverse |
| 4 | Importar os dados |
| 5 | Criar os relacionamentos |
| 6 | Montar o app canvas "Eleições no meu município" |
| 7 | Montar o app model-driven "Base eleitoral" |
| 8 | Integrar com o Power BI |
| 9 | Criar os fluxos do Power Automate |
| 10 | Exportar a Solution para o git |
| 11 | Checklist final |

> Tudo é feito no navegador (make.powerapps.com), inclusive no Mac. Só a integração com o
> Power BI Desktop (Etapa 8) precisa do Windows.

---

## Perguntas que o app responde

O dashboard do Power BI mostra o país inteiro. O app parte de **um** município e deixa fazer
coisas que um relatório não faz:

1. Como meu município votou em cada eleição e turno, e como isso se compara com a UF e o Brasil?
2. Onde o vencedor mudou do 1º para o 2º turno, ou de uma eleição para a outra?
3. Qual é o perfil do município (população, alfabetização, PIB per capita)?
4. Quais municípios eu acompanho, e o que anotei sobre eles?
5. Os números batem com o TSE, e o TSE republicou algum arquivo desde a última carga?

---

## Etapa 0. Garantir o ambiente

A Microsoft descontinuou os ambientes de desenvolvimento **não gerenciados**, que são os que o
Developer Plan gratuito cria. As datas que importam:

| Data | O que acontece |
|---|---|
| **15/11/2026** | O cadastro no Developer Plan deixa de criar ambiente não gerenciado; cada usuário pode criar só **um** ambiente de desenvolvimento gerenciado |
| **15/12/2026** | Ambientes de desenvolvimento não gerenciados são suspensos |
| **15/01/2027** | Esses ambientes são excluídos |

Por isso, **tudo vive dentro de uma Solution exportada para o git** (Etapa 10). Se o ambiente
sumir, basta importar a Solution num ambiente novo e rodar a carga de novo.

1. Abra [make.powerapps.com](https://make.powerapps.com) com a conta corporativa que você usa no
   Power BI Service. No seletor de ambiente (canto superior direito), veja se já existe um
   ambiente de desenvolvimento ou de avaliação.
2. Se não existir, escolha um caminho:
   - cadastro no [Power Apps Developer Plan](https://www.microsoft.com/power-platform/products/power-apps/free)
     **antes de 15/11/2026**, sabendo que o ambiente é provisório;
   - uma **avaliação de 30 dias** (Power Apps Plan Trial);
   - um ambiente de desenvolvimento **gerenciado**, pedido ao administrador do tenant.
3. Confira que o ambiente tem **Dataverse** (o menu **Tabelas** aparece à esquerda).
4. No [Centro de administração](https://admin.powerplatform.microsoft.com), em **Gerenciar >
   Ambientes**, veja a coluna **Gerenciado** do seu ambiente de desenvolvedor. Se for **Não**, o
   prazo de 15/12/2026 vale para ele: exporte a Solution (Etapa 10) ao fim de cada etapa grande.
   Se for **Sim**, não há prazo.

**Limites do ambiente de desenvolvimento**

| Limite | Valor | Impacto no projeto |
|---|---|---|
| Banco do Dataverse | 2 GB | As tabelas somam ~25 MB de CSV; sobra muito |
| Execuções de fluxo | 750 por mês | O fluxo semanal usa ~4; o de e-mail, uma por pedido |
| Dataflows | Não tem | A carga é pelo assistente de importação (Etapa 4), não pelo Power Query |
| "Importar do Excel" | Não tem | Idem |

Instale também a **Power Platform CLI** (`pac`), usada na Etapa 10. No macOS ela roda pelo .NET:

```bash
brew install --cask dotnet-sdk
```

```bash
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
```

```bash
pac auth create --environment "https://<seu-ambiente>.crm.dynamics.com"
```

---

## Etapa 1. Gerar os CSVs

O script só usa a biblioteca padrão e lê o banco criado por `scripts/carregar_banco.py`:

```bash
python3 scripts/gerar_tabelas_powerapps.py
```

Antes de gravar, ele confere os números do README (comparecimento, % dos válidos, votos e viradas
de 2026) e a consistência interna. Se algo não bater, ele para e não grava nada.

| Arquivo | Linhas | Tabela no Dataverse |
|---|---|---|
| `elei_turno.csv` | 8 | Turno |
| `elei_candidato.csv` | 47 | Candidato |
| `elei_municipio.csv` | 5.766 | Município |
| `elei_resultado_mun_2014.csv` | 11.402 | Resultado municipal |
| `elei_resultado_mun_2018.csv` | 11.416 | Resultado municipal |
| `elei_resultado_mun_2022.csv` | 11.502 | Resultado municipal |
| `elei_resultado_mun_2026.csv` | 11.514 | Resultado municipal |
| `elei_resultado_uf.csv` | 1.540 | Resultado UF |
| `elei_comparecimento_uf.csv` | 224 | Comparecimento UF |
| `elei_resultado_br.csv` | 55 | Resultado Brasil |
| `elei_conferencia.csv` | 8 | Conferência |
| `elei_fonte_tse.csv` | 13 | Fonte TSE |

**Por que o resultado municipal vem em quatro arquivos:** o assistente de importação aceita até
8 MB por CSV e recomenda até 20 mil linhas por carga. Cada ano fica com ~11,5 mil linhas e ~3 MB.

**Por que não há uma tabela de votos por candidato × município (309 mil linhas):** os votos de
todos os candidatos de um município × turno vão numa coluna de texto, `votos_json`, no formato
`[{"n":13,"v":8701},{"n":45,"v":7728},...]` (`n` é o número do candidato, `v` os votos, em ordem
de posição). O app abre esse texto com `ParseJSON` só para o município aberto e busca nome,
partido e cor em **Candidato** pela chave `ano-n`. A tabela fica 7 vezes menor e nenhuma consulta
passa do limite de delegação.

### Decisões dos dados

- Os números vêm das views de `sql/schema.sql`; o script não recalcula nada.
- `partido_vencedor`, `partido_segundo` e `cor_partido` usam o **partido atual** (o PSL de 2018
  aparece como PL), como no Power BI.
- 168 combinações de município × turno do exterior não tiveram nenhum voto válido. Nelas,
  vencedor, segundo, margem e virada ficam vazios, em vez de um "vencedor" com 0 votos.
- `empate` = 1 em 19 casos. Nesses, o vencedor é o de menor número de candidato, como na view do
  SQLite. Por isso, em 2022, o app conta **2.979** municípios que mudaram de partido, e o Power BI
  conta 2.980: a medida DAX junta os empatados como "A / B", o que sempre conta como mudança.
- `virou_no_2t` só existe nas linhas do 2º turno; `partido_vencedor_anterior` e `mudou_partido`
  só nas do 1º turno (comparação com a eleição de 4 anos antes).
- Booleanos vêm como 1/0 e entram como **Número inteiro**, não Sim/Não, para o assistente não
  depender do rótulo traduzido.
- `municipio_busca` é o nome em minúsculas e sem acento (`sao joao d'alianca`). O app busca com
  `StartsWith`, que é delegável mas diferencia acentos.
- Percentuais regionais sempre vêm de **razão de somas** (`elei_comparecimento_uf`,
  `elei_resultado_uf`), nunca da média dos percentuais municipais.

---

## Etapa 2. Criar o publisher e a Solution

Tudo que for criado daqui para a frente fica **dentro da Solution**, para poder ser exportado.

1. **Soluções > Nova solução**.
2. Em **Publicador**, clique em **+ Novo publicador**:
   - Nome de exibição: `Eleições Presidenciais BR`
   - Nome: `eleicoesbr`
   - Prefixo: **`elei`**
   - Prefixo do valor da opção: deixe o sugerido
3. Solução:
   - Nome de exibição: `Eleições Presidenciais BR`
   - Nome: `EleicoesPresidenciaisBR`
   - Versão: `1.0.0.0`
4. Abra a Solution. A partir de agora, crie tabelas, apps e fluxos sempre pelo botão **+ Novo**
   de dentro dela.

---

## Etapa 3. Criar as tabelas no Dataverse

Dentro da Solution: **+ Novo > Tabela > Tabela**. São 11 tabelas. O **nome no plural** é o que
aparece nas fórmulas do app canvas:

| Nome de exibição | Nome no plural | Nome do esquema | Seção |
|---|---|---|---|
| Turno | Turnos | `elei_turno` | 3.1 |
| Candidato | Candidatos | `elei_candidato` | 3.2 |
| Município | Municípios | `elei_municipio` | 3.3 |
| Resultado municipal | Resultados municipais | `elei_resultado_mun` | 3.4 |
| Resultado UF | Resultados UF | `elei_resultado_uf` | 3.5 |
| Comparecimento UF | Comparecimentos UF | `elei_comparecimento_uf` | 3.6 |
| Resultado Brasil | Resultados Brasil | `elei_resultado_br` | 3.7 |
| Conferência | Conferências | `elei_conferencia` | 3.8 |
| Fonte TSE | Fontes TSE | `elei_fonte_tse` | 3.9 |
| Favorito | Favoritos | `elei_favorito` | 3.10 |
| Anotação | Anotações | `elei_anotacao` | 3.10 |

Para cada tabela:

1. Preencha **Nome de exibição** e **Nome no plural**.
2. Em **Opções avançadas**, ajuste o **Nome do esquema** (o prefixo `elei_` entra sozinho).
3. Na aba **Coluna primária**, troque o nome de exibição para o indicado e o
   **Comprimento máximo** se for preciso.
4. Salve e crie as demais colunas em **Colunas > + Nova coluna**.
5. Em **Chaves > + Nova chave**, crie a chave alternativa indicada.

**Regra de nomes:** o **nome de exibição de cada coluna é igual ao cabeçalho do CSV**
(`chave_turno`, `pct_vencedor`…). Assim o assistente da Etapa 4 mapeia as colunas sozinho, e as
fórmulas do app ficam curtas (`ThisRecord.pct_vencedor`). Se depois quiser nomes mais bonitos para
o app model-driven, renomeie o nome de exibição: o Power Apps guarda o nome lógico e atualiza as
fórmulas.

**Tipos de dados usados**

| Tipo no guia | Tipo no Dataverse | Observação |
|---|---|---|
| Texto (n) | Texto (linha única) | `n` é o comprimento máximo; o padrão de 100 **não serve** para `votos_json` |
| Inteiro | Número inteiro | Até 2,1 bilhões; o maior valor (aptos no Brasil) tem 156 milhões |
| Decimal (d) | Número decimal | `d` casas decimais |

### 3.1 Turno (`elei_turno`) · 8 linhas

| Coluna | Tipo | |
|---|---|---|
| `rotulo_turno` | Texto (30) | **Primária** |
| `chave_turno` | Texto (10) | Chave alternativa `chave_turno` |
| `ano` | Inteiro | |
| `nr_turno` | Inteiro | |
| `ordem_turno` | Inteiro | |

### 3.2 Candidato (`elei_candidato`) · 47 linhas

| Coluna | Tipo | |
|---|---|---|
| `chave_candidato` | Texto (10) | **Primária**; chave alternativa |
| `ano` | Inteiro | |
| `nr_candidato` | Inteiro | |
| `nm_urna` | Texto (60) | |
| `sg_partido` | Texto (15) | |
| `partido_atual` | Texto (15) | |
| `cor_partido` | Texto (7) | Hex, ex.: `#C8102E` |

### 3.3 Município (`elei_municipio`) · 5.766 linhas

| Coluna | Tipo | |
|---|---|---|
| `municipio_uf` | Texto (100) | **Primária** (é única: "Guajará-Mirim (RO)") |
| `cd_municipio_tse` | Inteiro | Chave alternativa `cd_municipio_tse` |
| `cd_municipio_ibge` | Inteiro | Vazio no exterior |
| `municipio` | Texto (100) | |
| `municipio_busca` | Texto (100) | |
| `sg_uf` | Texto (2) | `ZZ` = exterior |
| `sg_uf_nome` | Texto (30) | |
| `sg_regiao` | Texto (2) | |
| `sg_regiao_nome` | Texto (20) | |
| `exterior` | Inteiro | 1/0 |
| `populacao_2022` | Inteiro | |
| `alfabetizacao_2022` | Decimal (2) | |
| `pib_mil_reais` | Decimal (1) | |
| `pib_per_capita` | Decimal (2) | |
| `faixa_populacao` | Texto (30) | |
| `ordem_faixa_populacao` | Inteiro | |
| `ordem_alfabetica` | Inteiro | 1 a 5.571 no Brasil, vazio no exterior. O quiz sorteia por ela |

### 3.4 Resultado municipal (`elei_resultado_mun`) · 45.834 linhas

A tabela principal do app: uma linha por município × turno.

| Coluna | Tipo | |
|---|---|---|
| `chave_resultado` | Texto (20) | **Primária**; chave alternativa. Formato `ano-turno-cd_municipio_tse` |
| `chave_turno` | Texto (10) | |
| `ano` | Inteiro | |
| `nr_turno` | Inteiro | |
| `cd_municipio_tse` | Inteiro | |
| `municipio` | Texto (100) | |
| `sg_uf` | Texto (2) | |
| `vencedor` | Texto (60) | |
| `partido_vencedor` | Texto (15) | |
| `pct_vencedor` | Decimal (2) | % dos votos válidos |
| `segundo` | Texto (60) | |
| `partido_segundo` | Texto (15) | |
| `pct_segundo` | Decimal (2) | |
| `margem_pp` | Decimal (2) | Pontos percentuais |
| `empate` | Inteiro | 1/0 |
| `aptos` | Inteiro | |
| `comparecimento` | Inteiro | |
| `abstencoes` | Inteiro | |
| `votos_validos` | Inteiro | |
| `votos_brancos` | Inteiro | |
| `votos_nulos` | Inteiro | |
| `pct_abstencao` | Decimal (2) | |
| `vencedor_1t` | Texto (60) | Só no 2º turno |
| `virou_no_2t` | Inteiro | 1/0, só no 2º turno |
| `partido_vencedor_anterior` | Texto (20) | Só no 1º turno |
| `mudou_partido` | Inteiro | 1/0, só no 1º turno |
| `votos_json` | **Texto (1000)** | O maior valor tem 252 caracteres |

**Coluna de fórmula** (Power Fx no Dataverse). Crie depois da importação, em
**+ Nova coluna > Tipo de dados: fx Fórmula**:

| Coluna | Fórmula | Tipo |
|---|---|---|
| `pct_brancos_nulos` | `If(comparecimento = 0, Blank(), Round((votos_brancos + votos_nulos) / comparecimento * 100, 2))` | Decimal, 2 casas |

### 3.5 Resultado UF (`elei_resultado_uf`) · 1.540 linhas

| Coluna | Tipo | |
|---|---|---|
| `chave_resultado_uf` | Texto (20) | **Primária**; chave alternativa |
| `chave_turno` | Texto (10) | |
| `chave_candidato` | Texto (10) | |
| `ano`, `nr_turno`, `nr_candidato`, `votos`, `posicao` | Inteiro | |
| `sg_uf` | Texto (2) | |
| `nm_urna` | Texto (60) | |
| `sg_partido` | Texto (15) | |
| `pct_validos` | Decimal (2) | |

### 3.6 Comparecimento UF (`elei_comparecimento_uf`) · 224 linhas

| Coluna | Tipo | |
|---|---|---|
| `chave_comparecimento_uf` | Texto (15) | **Primária**; chave alternativa |
| `chave_turno` | Texto (10) | |
| `sg_uf`, `sg_regiao` | Texto (2) | |
| `ano`, `nr_turno`, `aptos`, `comparecimento`, `abstencoes`, `votos_validos`, `votos_brancos`, `votos_nulos` | Inteiro | |
| `pct_abstencao` | Decimal (2) | |

Crie a mesma coluna de fórmula `pct_brancos_nulos` da tabela 3.4.

### 3.7 Resultado Brasil (`elei_resultado_br`) · 55 linhas

Igual à 3.5, sem `sg_uf`, com a primária `chave_resultado_br` e mais a coluna
`situacao_turno` (Texto, 30).

### 3.8 Conferência (`elei_conferencia`) · 8 linhas

| Coluna | Tipo | |
|---|---|---|
| `chave_turno` | Texto (10) | **Primária**; chave alternativa |
| `ano`, `nr_turno`, `candidatos`, `zonas`, `aptos`, `comparecimento`, `abstencoes`, `votos_validos`, `votos_brancos`, `votos_nulos` | Inteiro | |
| `pct_abstencao` | Decimal (2) | |

### 3.9 Fonte TSE (`elei_fonte_tse`) · 13 linhas

Usada pelo fluxo "O TSE republicou?" (Etapa 9).

| Coluna | Tipo | |
|---|---|---|
| `arquivo` | Texto (120) | **Primária**; chave alternativa |
| `url` | Texto (250) | |
| `last_modified` | Texto (40) | Valor do cabeçalho HTTP `Last-Modified` na última carga |
| `sha256` | Texto (64) | |
| `baixado_em` | Texto (20) | |
| `last_modified_atual` | Texto (40) | **Não vem do CSV**; o fluxo preenche |
| `mudou` | Inteiro | **Não vem do CSV**; o fluxo preenche (1/0) |

### 3.10 Tabelas escritas pelo app (começam vazias)

**Favorito (`elei_favorito`)**

| Coluna | Tipo | |
|---|---|---|
| `chave_favorito` | Texto (150) | **Primária**; chave alternativa. Formato `email\|cd_municipio_tse` |
| `email_usuario` | Texto (100) | |
| `cd_municipio_tse` | Inteiro | |
| `municipio_uf` | Texto (100) | |

**Anotação (`elei_anotacao`)**

| Coluna | Tipo | |
|---|---|---|
| `titulo` | Texto (100) | **Primária** |
| `texto` | Várias linhas de texto (4000) | |
| `tema` | Escolha: `Resultado`, `Comparecimento`, `Perfil`, `Dados`, `Outro` | |
| `origem` | Texto (20) | `App` ou `Power BI` |
| `cd_municipio_tse` | Inteiro | |
| `chave_turno` | Texto (10) | |
| `email_autor` | Texto (100) | |

> `email_autor` e `email_usuario` servem para o app **mostrar** só os registros de quem está
> usando. A segurança de verdade vem das funções de segurança do Dataverse: com a tabela no modo
> **Usuário ou equipe** (o padrão) e a função *Basic User* com leitura no nível **Usuário**, cada
> pessoa só lê o que criou.

---

## Etapa 4. Importar os dados

O Developer Plan não tem "Importar do Excel" nem Dataflows. Use o **assistente de importação**
clássico.

### 4.1 Ajustar o formato de número (antes de tudo)

Os CSVs usam **ponto** como separador decimal (`55.5`). O assistente lê os números conforme as
**opções pessoais** do usuário. Com formato Português (Brasil), `55.5` pode virar `555` ou dar
erro. É o mesmo problema da Etapa 1 do guia do Power BI.

1. Abra qualquer app model-driven (por exemplo, o da Etapa 7, criado antes só com as tabelas) >
   **engrenagem > Configurações de Personalização > Opções pessoais > Formatos**.
2. Escolha **Inglês (Estados Unidos)** e **OK**.
3. Depois da importação, volte para Português (Brasil) se quiser.

### 4.2 Rodar o assistente

Abra o assistente por um destes caminhos:

- **Centro de administração do Power Platform > Ambientes > [seu ambiente] > Configurações >
  Gerenciamento de dados > Assistente de importação de dados > Importar dados**; ou
- no app model-driven, na grade da tabela: **Importar > Importar do CSV**.

Para cada arquivo, nesta ordem (dimensões antes dos fatos):

| Ordem | Arquivo | Tabela | Linhas esperadas |
|---|---|---|---|
| 1 | `elei_turno.csv` | Turno | 8 |
| 2 | `elei_candidato.csv` | Candidato | 47 |
| 3 | `elei_municipio.csv` | Município | 5.766 |
| 4–7 | `elei_resultado_mun_<ano>.csv` | Resultado municipal | 11.402 · 11.416 · 11.502 · 11.514 |
| 8 | `elei_resultado_uf.csv` | Resultado UF | 1.540 |
| 9 | `elei_comparecimento_uf.csv` | Comparecimento UF | 224 |
| 10 | `elei_resultado_br.csv` | Resultado Brasil | 55 |
| 11 | `elei_conferencia.csv` | Conferência | 8 |
| 12 | `elei_fonte_tse.csv` | Fonte TSE | 13 |

Em cada importação:

1. **Carregar arquivo** > escolha o CSV.
2. **Delimitador de campo**: Vírgula. **Delimitador de dados**: Aspas (").
3. **Chave alternativa**: escolha a chave da tabela. Assim, reimportar o mesmo arquivo atualiza as
   linhas em vez de duplicar.
4. **Mapa de dados**: Padrão (Mapeamento Automático).
5. **Mapear tipos de registro**: escolha a tabela de destino (ex.: *Resultado municipal*).
6. **Mapear campos**: como os nomes de exibição são iguais aos cabeçalhos, todas as colunas
   aparecem com o visto verde. Se alguma ficar sem mapa, a coluna foi criada com outro nome.
7. **Permitir duplicatas**: Não. **Proprietário**: você.
8. **Enviar**. Acompanhe em **Minhas importações**; cada arquivo de resultado municipal leva
   alguns minutos.

### 4.3 Conferir a carga

| Conferência | Esperado |
|---|---|
| Linhas de cada tabela (**Tabelas > [tabela] > Dados**, ou uma visão com contagem) | Igual à tabela de 4.2 |
| São Paulo (SP) · 2026 · 2º turno (`chave_resultado` = `2026-2-71072`) | LULA 55,5% · FLAVIO BOLSONARO 44,5% · margem 11,0 · comparecimento 7.284.071 · válidos 6.962.277 |
| Serra da Saudade (MG) · 2026 · 2º turno (`2026-2-53317`), o menor município | FLAVIO BOLSONARO 58,1% · LULA 41,9% · comparecimento 931 |
| Lisboa (ZZ) · 2026 · 2º turno (`2026-2-29955`) | LULA 60,1% · abstenção 58,03% |
| Acentos | "Guajará-Mirim", "São Paulo" e "Brasília" sem caracteres estranhos |
| `pct_vencedor` com casas decimais | 55,5, e não 555 (se der 555, volte ao passo 4.1 e reimporte) |

Se houver erro, abra a importação em **Minhas importações > Falhas**: a lista mostra a linha e a
coluna.

---

## Etapa 5. Criar os relacionamentos

O app canvas **não depende** desta etapa: ele busca pelas chaves de texto e número, que são
delegáveis. Os relacionamentos servem para o app model-driven (formulário de Município com os
resultados embaixo) e espelham as chaves estrangeiras de `sql/schema.sql`.

| Tabela | Nova coluna de pesquisa | Aponta para | Preencher com |
|---|---|---|---|
| Resultado municipal | `turno` | Turno | `chave_turno` |
| Resultado municipal | `municipio_ref` | Município | `cd_municipio_tse` |
| Resultado UF | `turno` | Turno | `chave_turno` |
| Resultado UF | `candidato` | Candidato | `chave_candidato` |
| Comparecimento UF | `turno` | Turno | `chave_turno` |
| Resultado Brasil | `turno` | Turno | `chave_turno` |
| Resultado Brasil | `candidato` | Candidato | `chave_candidato` |
| Anotação | `municipio_ref` | Município | `cd_municipio_tse` |

1. Crie cada coluna em **Colunas > + Nova coluna > Tipo de dados: Pesquisa**.
2. Para preenchê-las, reimporte o mesmo CSV com a **chave alternativa** da tabela (só atualiza). Em
   **Mapear campos**, mapeie a coluna do CSV (ex.: `cd_municipio_tse`) **também** para a coluna de
   pesquisa e, em **Referência de pesquisa**, escolha o campo de destino que tem o mesmo valor (ex.:
   `cd_municipio_tse` de Município).
3. Confira: o formulário de São Paulo (SP) deve listar 8 resultados, um por turno.

---

## Etapa 6. App canvas "Eleições no meu município"

O app de vitrine do portfólio: responsivo, para celular e tablet. As fórmulas completas estão em
[`formulas_powerfx.md`](formulas_powerfx.md); aqui fica a estrutura.

### 6.1 Criar o app

1. Na Solution: **+ Novo > Aplicativo > Aplicativo de tela**. Nome: `Eleições no meu município`,
   formato **Telefone**.
2. **Configurações > Exibir**: desligue **Ajustar à tela** e **Bloquear proporção** (assim o app
   cresce no tablet e no navegador).
3. **Configurações > Geral > Limite de linhas de dados**: deixe 500. Se alguma fórmula precisar
   de mais, ela não é delegável e precisa ser reescrita, não o limite aumentado.
4. **Dados > + Adicionar dados > Dataverse**: adicione todas as tabelas da Etapa 3.
5. Cole o conteúdo de **App.Formulas** (seção 1 de `formulas_powerfx.md`): cores, tipografia,
   turnos e candidatos em memória e as funções `CorDoPartido` e `SemAcento`.

### 6.2 Design (o mesmo do Power BI)

- Cores: as de `powerbi/tema_eleicoes_br.json` e da seção *Paleta* do guia do dashboard, como
  fórmulas nomeadas (`CorPrimaria`, `CorFundo`…).
- Cor de partido: vem da coluna `cor_partido` de Candidato, a mesma tabela de cores do Power BI.
  Partidos sem cor própria ficam em cinza `#A9B4C2`.
- Fonte: Segoe UI (`Font.'Segoe UI'`). Título de tela 20, título de cartão 12, número de cartão
  26, rótulos 10–12.
- Cartões: fundo branco, borda 1 px `#E2E6EC`, cantos de 8 px, sem sombra; espaço de 12 px entre
  eles e margem de 16 px.
- **Regras de neutralidade** (valem para o app inteiro):
  - mesmo tamanho, fonte e destaque para todos os candidatos; a ordem é sempre por votos;
  - sem adjetivos: "Votos válidos por candidato", e não "Vitória esmagadora";
  - cor vem do partido, nunca de "bom" ou "ruim";
  - o número aparece sempre junto da cor.
- Acessibilidade: `AccessibleLabel` em todo controle clicável e em toda imagem; contraste do
  texto branco sobre `#002776` e do grafite sobre branco acima de 4,5:1.

### 6.3 Componente de cabeçalho

**Componentes > + Novo componente** `cmpCabecalho`, largura `Parent.Width`, altura 72:

1. Retângulo azul `CorPrimaria`, altura 66.
2. Duas faixas de 6 px embaixo: verde `#009C3B` na metade esquerda e amarela `#FFDF00` na
   direita.
3. Rótulo branco, Segoe UI Semibold 18, com a propriedade personalizada de entrada `Titulo`
   (Texto).
4. Ícone de voltar com a propriedade de entrada `MostrarVoltar` (Booleano) e a propriedade de
   comportamento `AoVoltar`.

Coloque o componente no topo de todas as telas. O seletor de turno fica na tela, logo abaixo,
porque ele altera uma variável global.

### 6.4 Telas

| # | Tela | O que mostra | Pergunta |
|---|---|---|---|
| 1 | `scrInicio` | Seletor de eleição e turno; busca de município por nome (sem acento) e filtro de UF; atalhos "Brasil", "Favoritos" e "Viradas" | — |
| 2 | `scrMunicipio` | Cartões: vencedor, % válidos, margem, comparecimento, abstenção, brancos e nulos. Barras de todos os candidatos (de `votos_json`). Linha "Município · UF · Brasil" para o 1º colocado e para a abstenção. Selo "virou do 1º para o 2º turno" quando `virou_no_2t = 1`. Botões de favorito, anotação e e-mail | 1 |
| 3 | `scrComparar` | Dois municípios lado a lado, no mesmo turno, com os mesmos cartões e barras | 1 |
| 4 | `scrViradas` | Lista dos municípios em que o vencedor mudou: do 1º para o 2º turno (`virou_no_2t`) ou entre eleições (`mudou_partido`), com filtro de UF e contador. Sem o exterior | 2 |
| 5 | `scrPerfil` | População, alfabetização, PIB per capita, faixa de população e o aviso "associação não é causalidade" | 3 |
| 6 | `scrFavoritos` | Municípios salvos e anotações de quem está usando, com editar e excluir | 4 |
| 7 | `scrSobre` | Fontes (TSE, licença CC-BY; IBGE), limitações e a tabela de conferência com o TSE | 5 |
| 8 | `scrQuiz` *(opcional)* | "Quem venceu aqui?": sorteia um município, a pessoa palpita o vencedor e vê o resultado | — |

O texto de **Sobre os dados** é o mesmo da página 7 do guia do Power BI (fontes e limitações).

### 6.5 Delegação

Toda consulta às tabelas grandes (Município, com 5.766 linhas, e Resultado municipal, com 45.834)
usa só funções que o Dataverse resolve no servidor:

| Uso | Função | Delegável |
|---|---|---|
| Buscar município | `StartsWith(municipio_busca, …)` e `sg_uf = …` | Sim |
| Abrir o resultado de um município × turno | `LookUp(…, chave_resultado = …)` | Sim |
| Lista de viradas | `Filter(…, chave_turno = …, virou_no_2t = 1, sg_uf <> "ZZ")` + `SortByColumns` | Sim |
| Contar viradas | `CountRows(Filter(…))` | Sim |
| Barras por candidato | `ParseJSON` sobre **um** registro já carregado | Não precisa |
| Turnos e candidatos | Carregados inteiros (8 e 47 linhas) | Não precisa |

Depois de montar, abra o **Verificador de aplicativos** (ícone de estetoscópio): ele não pode ter
nenhum aviso de delegação (triângulo amarelo azul-sublinhado nas fórmulas). Para confirmar, abra
**Avançado > Monitor**, use a busca e veja que a consulta vai com `$filter` e `startswith`.

### 6.6 Testar

1. **Reproduzir** (F5) no navegador.
2. Publique e abra no app **Power Apps** do celular.
3. Compare os cartões de São Paulo, Serra da Saudade e Lisboa com a tabela da Etapa 4.3 e com o
   `.pbix`.

---

## Etapa 7. App model-driven "Base eleitoral"

O app de bastidores mostra modelagem: formulários, visões, gráficos e uma regra de negócio, sem
escrever fórmula de tela.

1. Na Solution: **+ Novo > Aplicativo > Aplicativo baseado em modelo**. Nome: `Base eleitoral`.
2. **Páginas > + Adicionar página > Tabela do Dataverse**: Município, Resultado municipal,
   Candidato, Turno, Anotação, Conferência e Fonte TSE. Agrupe no mapa do site em *Consulta*
   (as três primeiras) e *Controle* (as outras).
3. **Formulário principal de Município**:
   - Seção "Identificação": `municipio_uf`, `sg_uf_nome`, `sg_regiao_nome`, `exterior`.
   - Seção "Perfil (IBGE)": `populacao_2022`, `faixa_populacao`, `alfabetizacao_2022`,
     `pib_per_capita`.
   - **Subgrade** de Resultado municipal (pelo relacionamento `municipio_ref`), com as colunas
     `turno`, `vencedor`, `pct_vencedor`, `margem_pp` e `pct_abstencao`.
   - **Subgrade** de Anotação.
4. **Visões de Resultado municipal**:

   | Visão | Filtro | Ordem | Linhas esperadas |
   |---|---|---|---|
   | Viraram no 2º turno em 2026 | `chave_turno` = 2026-2, `virou_no_2t` = 1, `sg_uf` ≠ ZZ | `margem_pp` crescente | 213 (212 para LULA e 1 para FLAVIO BOLSONARO) |
   | Mudaram de partido em 2026 | `chave_turno` = 2026-1, `mudou_partido` = 1, `sg_uf` ≠ ZZ | `sg_uf` | 714 |
   | Maior abstenção · 2026 · 2º turno | `chave_turno` = 2026-2, `sg_uf` ≠ ZZ | `pct_abstencao` decrescente | 5.571 |
   | Empates | `empate` = 1 | `ano` | 19 |

5. **Gráfico** na visão "Viraram no 2º turno em 2026": colunas, contagem de `chave_resultado` por
   `sg_uf`.
6. **Painel** "Visão geral": o gráfico acima, a visão de abstenção e a grade de Conferência.
7. **Regra de negócio** em Anotação (escopo **Entidade**, para valer também no app canvas e no
   Power BI): se `tema` não tiver valor, mostrar a mensagem de erro "Escolha um tema." no campo
   `tema`.
8. **Salvar > Publicar**.

---

## Etapa 8. Integrar com o Power BI

As duas direções.

### 8.1 Power BI dentro do app (bloco do dashboard)

O controle **Bloco do Power BI** mostra um bloco de um **painel** (dashboard), não de um relatório.

1. No Power BI Service, abra o relatório publicado, passe o mouse no mapa de vencedores (página 2)
   > **Fixar visual** > novo painel `Eleições BR`.
2. No app, na `scrInicio`: **Inserir > Gráficos > Bloco do Power BI**. Escolha o workspace, o
   painel `Eleições BR` e o bloco do mapa.
3. Quem abre o app precisa de acesso ao workspace no Power BI. Para o vídeo, use a sua conta.

### 8.2 App dentro do Power BI (anotações com write-back)

Uma página nova no relatório, **Anotações**, em que quem analisa clica num município e escreve uma
nota. A nota vai para a tabela Anotação no Dataverse e volta para o relatório.

1. **Power BI Desktop** > página nova `Anotações` (1920 × 1080, cabeçalho igual às outras).
2. **Tabela** à esquerda com `dMunicipio[municipio_uf]`, `Vencedor` e `% do Vencedor`.
3. **Visualizações > Power Apps for Power BI**. Em **Dados do Power Apps**, arraste
   `dMunicipio[cd_municipio_tse]`, `dMunicipio[municipio_uf]` e `dTurno[chave_turno]`.
4. No visual: **Criar novo** > escolha o ambiente da Solution. Abre um app canvas com o objeto
   `PowerBIIntegration`. Monte a tela pela seção 9 de `formulas_powerfx.md` e salve-o como
   `Anotações (Power BI)`. Depois, em **Soluções > Adicionar existente > Aplicativo**, coloque-o na
   Solution.
5. **Obter dados > Dataverse** > tabela `elei_anotacao`, em modo **DirectQuery** (assim a nota
   aparece sem atualizar o modelo). Relacione `elei_anotacao[cd_municipio_tse]` com
   `dMunicipio[cd_municipio_tse]` (muitos para um).
6. Abaixo do visual, uma **Tabela** com `titulo`, `tema`, `texto` e `createdon` da tabela de
   anotações, filtrada pelo município selecionado.
7. Publique e teste no Service: clique em São Paulo (SP), escreva uma nota, salve e veja a nota
   aparecer na tabela.

**Limites do visual do Power Apps:** ele passa no máximo 1.000 linhas para o app, e quem vê o
relatório precisa de licença do Power Apps e de acesso ao app. Por isso, ele funciona bem para a
demonstração gravada, não para um relatório público.

Registre essa página no guia do Power BI como uma página extra, para o `.pbix` e o guia
continuarem iguais.

---

## Etapa 9. Fluxos do Power Automate

Crie os fluxos dentro da Solution (**+ Novo > Automação > Fluxo da nuvem**), para irem junto na
exportação.

### 9.1 "Enviar resumo do municipio" (disparado pelo app)

Dê o nome sem acento: o app chama o fluxo pelo nome sem espaços (`Enviarresumodomunicipio`).

| Passo | Ação | Configuração |
|---|---|---|
| 1 | **Power Apps (V2)** (gatilho) | Entradas de texto `chave_resultado` e `email` |
| 2 | **Dataverse > Listar linhas** | Tabela *Resultados municipais*; **Filtrar linhas**: `elei_chave_resultado eq '@{triggerBody()?['text']}'` (confira o nome lógico da coluna em **Colunas**); **Contagem de linhas**: 1 |
| 3 | **Compor** | `first(outputs('Listar_linhas')?['body/value'])` |
| 4 | **Criar tabela HTML** | De `json(concat('[', string(outputs('Compor')), ']'))`, colunas personalizadas: Município, Vencedor, % válidos, Margem (pp), Comparecimento, Abstenção (%) |
| 5 | **Office 365 Outlook > Enviar um email (V2)** | Para: `email`; Assunto: "Resultado de <município> · <turno>"; Corpo: a tabela HTML e a linha "Fonte: TSE (CC-BY). Gerado pelo app Eleições no meu município." |
| 6 | **Responder a um aplicativo ou fluxo do Power Apps** | Saída de texto `status` = `enviado` |

No app, adicione o fluxo em **Power Automate > Adicionar fluxo** e chame com
`Enviarresumodomunicipio.Run(…)` (seção 7 de `formulas_powerfx.md`). O e-mail vai só para quem
está usando o app (`User().Email`).

### 9.2 "O TSE republicou?" (agendado, semanal)

O README já avisa que o TSE pode republicar os arquivos. Este fluxo verifica isso toda semana,
comparando o cabeçalho `Last-Modified` de cada arquivo com o valor guardado em Fonte TSE na última
carga.

| Passo | Ação | Configuração |
|---|---|---|
| 1 | **Recorrência** | 1 vez por semana, segunda-feira, 08:00 (Brasília) |
| 2 | **Dataverse > Listar linhas** | Tabela *Fontes TSE* |
| 3 | **Aplicar a cada** linha | |
| 3.1 | **HTTP** | Método `HEAD`, URI = `url` da linha |
| 3.2 | **Compor** | `outputs('HTTP')?['headers']?['Last-Modified']` |
| 3.3 | **Dataverse > Atualizar uma linha** | `last_modified_atual` = saída de 3.2; `mudou` = `if(equals(outputs('Compor'), items('Aplicar_a_cada')?['elei_last_modified']), 0, 1)` |
| 4 | **Dataverse > Listar linhas** | Fontes TSE com filtro `elei_mudou eq 1` |
| 5 | **Condição** | `length(body('Listar_linhas_2')?['value'])` maior que 0 |
| 5.1 | Se sim: **Enviar um email (V2)** ou **Postar mensagem no Teams** | "O TSE republicou N arquivo(s): … Rode `scripts/baixar_dados.py`, `carregar_banco.py` e `gerar_tabelas_powerapps.py` e reimporte." |

O conector **HTTP** é premium: funciona no ambiente de desenvolvimento e na avaliação. Gasto: ~4
execuções por mês, longe das 750.

Depois de recarregar os dados, reimporte `elei_fonte_tse.csv` com a chave alternativa: o
`last_modified` novo entra e o `mudou` volta a 0 na execução seguinte.

### 9.3 "Nova anotação" (opcional)

| Passo | Ação | Configuração |
|---|---|---|
| 1 | **Dataverse > Quando uma linha é adicionada, modificada ou excluída** | Alterar tipo: Adicionado; Tabela: *Anotações*; Escopo: Organização; Filtro: `elei_origem eq 'Power BI'` |
| 2 | **Postar mensagem no Teams** (ou e-mail) | "Nova anotação em <municipio>: <titulo>" |

---

## Etapa 10. Exportar a Solution para o git

1. Na Solution, **Publicar todas as personalizações**.
2. No terminal, na raiz do repositório:

```bash
pac solution export --name EleicoesPresidenciaisBR --path powerapps/EleicoesPresidenciaisBR.zip --overwrite
```

```bash
pac solution unpack --zipfile powerapps/EleicoesPresidenciaisBR.zip --folder powerapps/solution --packagetype Unmanaged --allowWrite --allowDelete
```

`--allowWrite` e `--allowDelete` são chaves sem valor: não escreva `true` depois delas.

```bash
rm powerapps/EleicoesPresidenciaisBR.zip
```

3. Os apps canvas ficam em `powerapps/solution/CanvasApps/` como `.msapp`. O `pac canvas unpack`,
   que extraía o código do `.msapp`, foi descontinuado; o caminho atual para versionar o código
   (`.pa.yaml`) é a integração com o Git da Power Platform. Para o portfólio, o `.msapp` basta.

4. **Os dados não vão na Solution**, só a estrutura (tabelas, colunas, chaves, apps, fluxos). Os
   dados se recriam com `gerar_tabelas_powerapps.py` e a Etapa 4.
5. Para provar que o repositório basta, importe num ambiente limpo:

```bash
pac solution pack --zipfile /tmp/EleicoesPresidenciaisBR.zip --folder powerapps/solution --packagetype Unmanaged
```

```bash
pac solution import --path /tmp/EleicoesPresidenciaisBR.zip
```

Depois da importação, refaça as **conexões** dos fluxos (Dataverse, Outlook, HTTP): elas ficam no
ambiente, não na Solution.

### Material do portfólio

Quem vê o portfólio não consegue abrir o app sem uma licença no seu tenant. Grave em
`powerapps/midia/`:

- um GIF de 20–40 s: busca "sao paulo" > município > barras > comparar com a UF > favoritar;
- prints de cada tela no celular e no tablet;
- um print da página **Anotações** do Power BI com uma nota gravada pelo app;
- um print do histórico de execuções dos dois fluxos.

---

## Etapa 11. Checklist final

- [ ] Ambiente com Dataverse; Solution `EleicoesPresidenciaisBR` com prefixo `elei`
- [ ] `python3 scripts/gerar_tabelas_powerapps.py` sem erro (14 conferências `[ok]`)
- [ ] Linhas: 8 · 47 · 5.766 · 45.834 · 1.540 · 224 · 55 · 8 · 13
- [ ] Chaves alternativas criadas e **ativas** (a criação do índice leva alguns minutos)
- [ ] `votos_json` com comprimento máximo 1.000 (não 100)
- [ ] Decimais conferidos: São Paulo · 2026 · 2º turno com LULA 55,5%
- [ ] Brasil · 2026 · 2º turno no app: LULA 51,8% (51,79 no Dataverse) · 64.256.232 votos
- [ ] Viradas de 2026 sem o exterior: 213 (212 para LULA, 1 para FLAVIO BOLSONARO)
- [ ] Mudaram de partido em 2026 (1º turno, sem o exterior): 714
- [ ] Verificador de aplicativos sem avisos de delegação
- [ ] Busca "sao paulo" e "São Paulo" encontram o mesmo município
- [ ] Cor de partido aplicada pela coluna `cor_partido`; número sempre ao lado da cor
- [ ] Títulos sem adjetivos; fontes e limitações em **Sobre os dados**
- [ ] Favoritos e anotações aparecem só para quem os criou
- [ ] Os dois fluxos rodaram uma vez à mão e aparecem no histórico
- [ ] `powerapps/solution/` atualizado com `pac solution export` + `unpack`
- [ ] GIF e prints em `powerapps/midia/`
