"""Gera as tabelas do Power Apps (Dataverse) em data/powerapps/*.csv.

Só usa a biblioteca padrão do Python (3.10+). Lê data/eleicoes.db (criado por
scripts/carregar_banco.py) e as dimensões de data/limpo/. Não refaz cálculos:
os votos, percentuais e viradas vêm das views de sql/schema.sql.

O Power Apps só filtra no servidor um conjunto de funções e o Developer Plan
não tem Dataflows. Por isso as tabelas já chegam no grão que o app usa:

    elei_turno            8 linhas      turnos
    elei_candidato        ~47 linhas    candidaturas, com a cor do partido
    elei_municipio        ~5,8 mil      municípios + indicadores do IBGE
    elei_resultado_mun    ~46 mil       município × turno, com os votos de
                                        todos os candidatos em `votos_json`
                                        ([{"n": nº do candidato, "v": votos}, ...]);
                                        sai em um arquivo por eleição
                                        (elei_resultado_mun_<ano>.csv)
    elei_resultado_uf     ~2,5 mil      UF × candidato × turno
    elei_comparecimento_uf  ~220        UF × turno
    elei_resultado_br     ~90           Brasil × candidato × turno
    elei_conferencia      8 linhas      totais nacionais, para conferir com o TSE
    elei_fonte_tse        ~14 linhas    arquivos do TSE e a data de publicação
                                        (de data/raw/manifesto.csv), para o fluxo
                                        que avisa quando o TSE republica

Antes de gravar, o script confere os números do README e para com erro se
algum não bater.

Uso:
    python3 scripts/gerar_tabelas_powerapps.py
    python3 scripts/gerar_tabelas_powerapps.py --db outro.db --saida outra_pasta
"""

from __future__ import annotations

import argparse
import csv
import json
import sqlite3
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DB_PADRAO = RAIZ / "data" / "eleicoes.db"
LIMPO = RAIZ / "data" / "limpo"
MANIFESTO = RAIZ / "data" / "raw" / "manifesto.csv"
SAIDA_PADRAO = RAIZ / "data" / "powerapps"
LIMITE_MB = 8  # assistente de importação do Dataverse (CSV)

# Mesmas cores da tabela PartidoCores (powerbi/medidas_dax.dax).
CORES_PARTIDO = {
    "PT": "#C8102E", "PSDB": "#1E5AA8", "PSB": "#F08C00", "PSL": "#2E8B3E",
    "PL": "#23408E", "PDT": "#7B3FA0", "MDB": "#1F7A4D", "NOVO": "#F26522",
    "PSOL": "#F2C200", "REDE": "#0FA39A", "UNIÃO": "#00A3E0", "PODE": "#7CB342",
    "PSD": "#E0A100", "AVANTE": "#B5525C", "PV": "#4CAF50", "PSC": "#8C9BAB",
    "PSTU": "#9AA3AE", "PCB": "#A7AFB9", "PCO": "#B3BAC3", "UP": "#BFC5CD",
    "DC": "#7F8B99", "PRTB": "#97A1AD", "PATRIOTA": "#8A96A3", "PPL": "#AEB6BF",
    "PTB": "#9099A4", "MISSÃO": "#A3ACB6", "DEMOCRATA": "#868F9B",
}


# ---------------------------------------------------------------------
# Leitura e escrita
# ---------------------------------------------------------------------

def ler_limpo(nome: str) -> list[dict[str, str]]:
    with open(LIMPO / nome, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def valor_csv(v):
    """None vira vazio; booleanos viram 1/0 (Dataverse: Sim/Não ou número inteiro)."""
    if v is None:
        return ""
    if isinstance(v, bool):
        return 1 if v else 0
    return v


def gravar(pasta: Path, nome: str, linhas: list[dict]) -> None:
    """CSV separado por vírgula, UTF-8 com BOM (abre certo no Excel e no Dataverse)."""
    caminho = pasta / f"{nome}.csv"
    with open(caminho, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0].keys()))
        w.writeheader()
        for linha in linhas:
            w.writerow({k: valor_csv(v) for k, v in linha.items()})
    mb = caminho.stat().st_size / 1_000_000
    n = f"{len(linhas):,}".replace(",", ".")
    print(f"  {caminho.relative_to(RAIZ)}: {n} linhas, {mb:.1f} MB")
    if mb > LIMITE_MB:
        print(f"  AVISO: passa de {LIMITE_MB} MB, o limite do assistente de importação do Dataverse",
              file=sys.stderr)


def consultar(con: sqlite3.Connection, sql: str) -> list[sqlite3.Row]:
    return con.execute(sql).fetchall()


# ---------------------------------------------------------------------
# Tabelas
# ---------------------------------------------------------------------

def tabela_turno() -> list[dict]:
    return [
        {
            "chave_turno": t["chave_turno"],
            "ano": int(t["ano"]),
            "nr_turno": int(t["nr_turno"]),
            "rotulo_turno": t["rotulo_turno"],
            "ordem_turno": int(t["ordem_turno"]),
        }
        for t in ler_limpo("dTurno.csv")
    ]


def tabela_candidato() -> list[dict]:
    linhas = []
    for c in ler_limpo("dCandidato.csv"):
        linhas.append({
            "chave_candidato": c["chave_candidato"],
            "ano": int(c["ano"]),
            "nr_candidato": int(c["nr_candidato"]),
            "nm_urna": c["nm_urna"],
            "sg_partido": c["sg_partido"],
            "partido_atual": c["partido_atual"],
            "cor_partido": CORES_PARTIDO.get(c["partido_atual"], "#A9B4C2"),
        })
    return linhas


def sem_acento(texto: str) -> str:
    """"São João d'Aliança" -> "sao joao d'alianca": o app busca com StartsWith,
    que é delegável mas diferencia acentos."""
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def tabela_municipio() -> list[dict]:
    def num(v: str, tipo=float):
        return tipo(float(v)) if v != "" else None

    linhas = []
    for m in ler_limpo("dMunicipio.csv"):
        linhas.append({
            "cd_municipio_tse": int(m["cd_municipio_tse"]),
            "cd_municipio_ibge": num(m["cd_municipio_ibge"], int),
            "municipio": m["municipio"],
            "municipio_uf": m["municipio_uf"],
            "municipio_busca": sem_acento(m["municipio"]),
            "sg_uf": m["sg_uf"],
            "sg_uf_nome": m["sg_uf_nome"],
            "sg_regiao": m["sg_regiao"] or None,
            "sg_regiao_nome": m["sg_regiao_nome"] or None,
            "exterior": m["exterior"] == "True",
            "populacao_2022": num(m["populacao_2022"], int),
            "alfabetizacao_2022": num(m["alfabetizacao_2022"]),
            "pib_mil_reais": num(m["pib_mil_reais"]),
            "pib_per_capita": round(v, 2) if (v := num(m["pib_per_capita"])) is not None else None,
            "faixa_populacao": m["faixa_populacao"] or None,
            "ordem_faixa_populacao": num(m["ordem_faixa_populacao"], int),
        })
    # 1..N em ordem alfabética, só no Brasil: o app sorteia um município com
    # LookUp(ordem_alfabetica = RandBetween(1, N)), que é delegável.
    no_brasil = sorted((l for l in linhas if not l["exterior"]),
                       key=lambda l: (l["municipio_busca"], l["sg_uf"]))
    ordem = {l["cd_municipio_tse"]: i for i, l in enumerate(no_brasil, start=1)}
    for l in linhas:
        l["ordem_alfabetica"] = ordem.get(l["cd_municipio_tse"])
    return linhas


def tabela_fonte_tse() -> list[dict]:
    """Arquivos do TSE baixados por scripts/baixar_dados.py, com o Last-Modified da época."""
    if not MANIFESTO.exists():
        return []
    with open(MANIFESTO, encoding="utf-8", newline="") as f:
        return [
            {
                "arquivo": r["arquivo"],
                "url": r["url"],
                "last_modified": r["last_modified"],
                "sha256": r["sha256"],
                "baixado_em": r["baixado_em"],
            }
            for r in csv.DictReader(f)
            if r["fonte"] == "TSE"
        ]


def tabela_resultado_mun(con: sqlite3.Connection, candidatos: list[dict]) -> list[dict]:
    """Uma linha por município × turno. Os votos de todos os candidatos vão em `votos_json`."""
    partido_atual = {(c["ano"], c["nr_candidato"]): c["partido_atual"] for c in candidatos}

    votos = defaultdict(list)  # (ano, turno, mun) -> candidatos em ordem de posição
    for r in consultar(con, """
        SELECT ano, nr_turno, cd_municipio_tse, nr_candidato, nm_urna, votos, pct_validos, posicao
        FROM v_resultado_municipio
        ORDER BY ano, nr_turno, cd_municipio_tse, posicao
    """):
        votos[(r["ano"], r["nr_turno"], r["cd_municipio_tse"])].append(r)

    comp = {
        (r["ano"], r["nr_turno"], r["cd_municipio_tse"]): r
        for r in consultar(con, "SELECT * FROM v_comparecimento_municipio")
    }
    virada = {
        (r["ano"], r["cd_municipio_tse"]): r
        for r in consultar(con, "SELECT * FROM v_virada_municipio")
    }

    # Partido vencedor no 1º turno, para comparar com a eleição anterior
    # (mesma regra da medida DAX `Mudou Partido Vencedor`: compara partido_atual).
    # Onde ninguém teve voto (cidades do exterior sem eleitor votando) não há vencedor.
    venc_1t = {
        (ano, mun): partido_atual[(ano, cands[0]["nr_candidato"])]
        for (ano, turno, mun), cands in votos.items() if turno == 1 and cands[0]["votos"] > 0
    }

    linhas = []
    for chave in sorted(comp):
        ano, turno, mun = chave
        c = comp[chave]
        cands = votos.get(chave, [])
        teve_voto = bool(cands) and cands[0]["votos"] > 0
        p1 = cands[0] if teve_voto else None
        p2 = cands[1] if teve_voto and len(cands) > 1 else None

        v = virada.get((ano, mun)) if turno == 2 and teve_voto else None
        anterior = venc_1t.get((ano - 4, mun)) if turno == 1 else None
        partido_venc = partido_atual[(ano, p1["nr_candidato"])] if p1 else None

        linhas.append({
            "chave_resultado": f"{ano}-{turno}-{mun}",
            "chave_turno": f"{ano}-{turno}",
            "ano": ano,
            "nr_turno": turno,
            "cd_municipio_tse": mun,
            "municipio": c["municipio"],
            "sg_uf": c["sg_uf"],
            "vencedor": p1["nm_urna"] if p1 else None,
            "partido_vencedor": partido_venc,
            "pct_vencedor": p1["pct_validos"] if p1 else None,
            "segundo": p2["nm_urna"] if p2 else None,
            "partido_segundo": partido_atual[(ano, p2["nr_candidato"])] if p2 else None,
            "pct_segundo": p2["pct_validos"] if p2 else None,
            "margem_pp": round(p1["pct_validos"] - p2["pct_validos"], 2) if p2 else None,
            "empate": bool(p1 and p2 and p1["votos"] == p2["votos"]),
            "aptos": c["aptos"],
            "comparecimento": c["comparecimento"],
            "abstencoes": c["abstencoes"],
            "votos_validos": c["votos_validos"],
            "votos_brancos": c["votos_brancos"],
            "votos_nulos": c["votos_nulos"],
            "pct_abstencao": c["pct_abstencao"],
            # Só no 2º turno: o vencedor mudou em relação ao 1º turno?
            "vencedor_1t": v["vencedor_1t"] if v else None,
            "virou_no_2t": bool(v["mudou"]) if v else None,
            # Só no 1º turno: o partido vencedor mudou em relação à eleição anterior?
            "partido_vencedor_anterior": anterior,
            "mudou_partido": (partido_venc != anterior) if anterior and partido_venc else None,
            # Só número e votos, em ordem de posição: nome, partido e cor vêm de
            # elei_candidato (chave ano-n) e o % é votos / votos_validos. Mantém o
            # arquivo abaixo do limite de importação do Dataverse.
            "votos_json": json.dumps(
                [{"n": r["nr_candidato"], "v": r["votos"]} for r in cands],
                separators=(",", ":"),
            ),
        })
    return linhas


def tabela_resultado_uf(con: sqlite3.Connection) -> list[dict]:
    linhas = []
    for r in consultar(con, """
        SELECT v.ano, v.nr_turno, m.sg_uf, v.nr_candidato, c.nm_urna, c.sg_partido,
               SUM(v.qt_votos_nominais) AS votos,
               ROUND(100.0 * SUM(v.qt_votos_nominais)
                     / SUM(SUM(v.qt_votos_nominais)) OVER (PARTITION BY v.ano, v.nr_turno, m.sg_uf), 2)
                   AS pct_validos,
               ROW_NUMBER() OVER (PARTITION BY v.ano, v.nr_turno, m.sg_uf
                                  ORDER BY SUM(v.qt_votos_nominais) DESC, v.nr_candidato) AS posicao
        FROM votacao v
        JOIN municipio m   ON m.cd_municipio_tse = v.cd_municipio_tse
        JOIN candidatura c ON c.ano = v.ano AND c.nr_candidato = v.nr_candidato
        GROUP BY v.ano, v.nr_turno, m.sg_uf, v.nr_candidato
        ORDER BY v.ano, v.nr_turno, m.sg_uf, posicao
    """):
        linhas.append({
            "chave_resultado_uf": f"{r['ano']}-{r['nr_turno']}-{r['sg_uf']}-{r['nr_candidato']}",
            "chave_turno": f"{r['ano']}-{r['nr_turno']}",
            "chave_candidato": f"{r['ano']}-{r['nr_candidato']}",
            "ano": r["ano"],
            "nr_turno": r["nr_turno"],
            "sg_uf": r["sg_uf"],
            "nr_candidato": r["nr_candidato"],
            "nm_urna": r["nm_urna"],
            "sg_partido": r["sg_partido"],
            "votos": r["votos"],
            "pct_validos": r["pct_validos"],
            "posicao": r["posicao"],
        })
    return linhas


def tabela_comparecimento_uf(con: sqlite3.Connection) -> list[dict]:
    return [
        {
            "chave_comparecimento_uf": f"{r['ano']}-{r['nr_turno']}-{r['sg_uf']}",
            "chave_turno": f"{r['ano']}-{r['nr_turno']}",
            "ano": r["ano"],
            "nr_turno": r["nr_turno"],
            "sg_uf": r["sg_uf"],
            "sg_regiao": r["sg_regiao"],
            "aptos": r["aptos"],
            "comparecimento": r["comparecimento"],
            "abstencoes": r["abstencoes"],
            "votos_validos": r["votos_validos"],
            "votos_brancos": r["votos_brancos"],
            "votos_nulos": r["votos_nulos"],
            "pct_abstencao": r["pct_abstencao"],
        }
        for r in consultar(con, "SELECT * FROM v_comparecimento_uf ORDER BY ano, nr_turno, sg_uf")
    ]


def tabela_resultado_br(con: sqlite3.Connection) -> list[dict]:
    return [
        {
            "chave_resultado_br": f"{r['ano']}-{r['nr_turno']}-{r['nr_candidato']}",
            "chave_turno": f"{r['ano']}-{r['nr_turno']}",
            "chave_candidato": f"{r['ano']}-{r['nr_candidato']}",
            "ano": r["ano"],
            "nr_turno": r["nr_turno"],
            "nr_candidato": r["nr_candidato"],
            "nm_urna": r["nm_urna"],
            "sg_partido": r["sg_partido"],
            "situacao_turno": r["situacao_turno"],
            "votos": r["votos"],
            "pct_validos": r["pct_validos"],
            "posicao": r["posicao"],
        }
        for r in consultar(con, "SELECT * FROM v_resultado_nacional ORDER BY ano, nr_turno, posicao")
    ]


def tabela_conferencia(con: sqlite3.Connection) -> list[dict]:
    """v_controle_nacional + brancos, nulos e abstenções (totais do Brasil por turno)."""
    extra = {
        (r["ano"], r["nr_turno"]): r
        for r in consultar(con, """
            SELECT ano, nr_turno, SUM(abstencoes) AS abstencoes,
                   SUM(votos_brancos) AS votos_brancos, SUM(votos_nulos) AS votos_nulos
            FROM comparecimento_zona GROUP BY ano, nr_turno
        """)
    }
    linhas = []
    for r in consultar(con, "SELECT * FROM v_controle_nacional"):
        e = extra[(r["ano"], r["nr_turno"])]
        linhas.append({
            "chave_turno": f"{r['ano']}-{r['nr_turno']}",
            "ano": r["ano"],
            "nr_turno": r["nr_turno"],
            "candidatos": r["candidatos"],
            "zonas": r["zonas"],
            "aptos": r["aptos"],
            "comparecimento": r["comparecimento"],
            "abstencoes": e["abstencoes"],
            "votos_validos": r["votos_validos"],
            "votos_brancos": e["votos_brancos"],
            "votos_nulos": e["votos_nulos"],
            "pct_abstencao": r["pct_abstencao"],
        })
    return linhas


# ---------------------------------------------------------------------
# Conferência
# ---------------------------------------------------------------------

def conferir(t: dict[str, list[dict]]) -> list[str]:
    """Devolve a lista de problemas (vazia = tudo certo)."""
    erros: list[str] = []

    def checar(nome: str, obtido, esperado) -> None:
        status = "ok" if obtido == esperado else "ERRO"
        print(f"  [{status}] {nome}: {obtido} (esperado {esperado})")
        if obtido != esperado:
            erros.append(nome)

    conf = {(r["ano"], r["nr_turno"]): r for r in t["elei_conferencia"]}
    br = {(r["ano"], r["nr_turno"], r["nm_urna"]): r for r in t["elei_resultado_br"]}
    mun = t["elei_resultado_mun"]

    # Números do README
    checar("2022·2T comparecimento", conf[(2022, 2)]["comparecimento"], 124_252_796)
    checar("2026·1T comparecimento", conf[(2026, 1)]["comparecimento"], 125_275_835)
    checar("2026·2T comparecimento", conf[(2026, 2)]["comparecimento"], 128_236_074)
    checar("2022·2T LULA % válidos", br[(2022, 2, "LULA")]["pct_validos"], 50.90)
    checar("2026·1T FLAVIO BOLSONARO % válidos", br[(2026, 1, "FLAVIO BOLSONARO")]["pct_validos"], 47.03)
    checar("2026·2T LULA % válidos", br[(2026, 2, "LULA")]["pct_validos"], 51.79)
    checar("2026·2T LULA votos", br[(2026, 2, "LULA")]["votos"], 64_256_232)
    checar("2026·2T FLAVIO BOLSONARO votos", br[(2026, 2, "FLAVIO BOLSONARO")]["votos"], 59_826_041)

    viradas = [r for r in mun if r["ano"] == 2026 and r["virou_no_2t"] and r["sg_uf"] != "ZZ"]
    checar("2026 viradas para LULA (sem exterior)", sum(r["vencedor"] == "LULA" for r in viradas), 212)
    checar("2026 viradas para FLAVIO BOLSONARO (sem exterior)",
           sum(r["vencedor"] == "FLAVIO BOLSONARO" for r in viradas), 1)

    # Consistência interna
    soma_ok = all(
        sum(c["v"] for c in json.loads(r["votos_json"])) == r["votos_validos"] for r in mun
    )
    checar("votos_json soma os votos válidos em todo município", soma_ok, True)

    for (ano, turno), c in conf.items():
        soma = sum(r["comparecimento"] for r in mun if r["ano"] == ano and r["nr_turno"] == turno)
        if soma != c["comparecimento"]:
            erros.append(f"comparecimento municipal ≠ nacional em {ano}·{turno}T")
    checar("comparecimento por município soma o nacional nos 8 turnos",
           not any("≠ nacional" in e for e in erros), True)

    cods = {m["cd_municipio_tse"] for m in t["elei_municipio"]}
    checar("todo resultado tem município em elei_municipio",
           all(r["cd_municipio_tse"] in cods for r in mun), True)
    chaves = [r["chave_resultado"] for r in mun]
    checar("chave_resultado é única", len(chaves) == len(set(chaves)), True)

    # Informativo (Power BI desempata diferente; ver powerbi/guia_dashboard.md, páginas 4 e 5)
    for ano in (2018, 2022, 2026):
        n = sum(1 for r in mun if r["ano"] == ano and r["mudou_partido"] and r["sg_uf"] != "ZZ")
        print(f"  [info] {ano}·1T municípios que mudaram de partido vencedor (sem exterior): {n}")
    n_emp = sum(1 for r in mun if r["empate"])
    print(f"  [info] município × turno com empate entre 1º e 2º colocados: {n_emp}")
    n_sem = sum(1 for r in mun if r["vencedor"] is None)
    print(f"  [info] município × turno sem nenhum voto válido (sem vencedor): {n_sem}")

    return erros


# ---------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--db", type=Path, default=DB_PADRAO)
    ap.add_argument("--saida", type=Path, default=SAIDA_PADRAO)
    args = ap.parse_args()

    if not args.db.exists():
        print(f"Banco não encontrado: {args.db}. Rode antes: python3 scripts/carregar_banco.py",
              file=sys.stderr)
        return 1

    con = sqlite3.connect(args.db)
    con.row_factory = sqlite3.Row

    print("Montando tabelas…")
    candidatos = tabela_candidato()
    tabelas = {
        "elei_turno": tabela_turno(),
        "elei_candidato": candidatos,
        "elei_municipio": tabela_municipio(),
        "elei_resultado_mun": tabela_resultado_mun(con, candidatos),
        "elei_resultado_uf": tabela_resultado_uf(con),
        "elei_comparecimento_uf": tabela_comparecimento_uf(con),
        "elei_resultado_br": tabela_resultado_br(con),
        "elei_conferencia": tabela_conferencia(con),
        "elei_fonte_tse": tabela_fonte_tse(),
    }
    con.close()

    print("Conferindo…")
    erros = conferir(tabelas)
    if erros:
        print(f"\n{len(erros)} conferência(s) falharam; nada foi gravado.", file=sys.stderr)
        return 1

    print("Gravando…")
    args.saida.mkdir(parents=True, exist_ok=True)
    # O assistente de importação aceita até 8 MB por CSV e recomenda até 20 mil
    # linhas; por isso a tabela de resultados sai em um arquivo por eleição.
    antigo = args.saida / "elei_resultado_mun.csv"
    if antigo.exists():
        antigo.unlink()
    for nome, linhas in tabelas.items():
        if nome == "elei_resultado_mun":
            for ano in sorted({r["ano"] for r in linhas}):
                gravar(args.saida, f"{nome}_{ano}", [r for r in linhas if r["ano"] == ano])
        elif not linhas:
            print(f"  {nome}: pulado ({MANIFESTO.relative_to(RAIZ)} não existe)")
        else:
            gravar(args.saida, nome, linhas)
    return 0


if __name__ == "__main__":
    sys.exit(main())
