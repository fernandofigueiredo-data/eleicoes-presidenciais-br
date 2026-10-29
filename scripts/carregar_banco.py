"""Cria data/eleicoes.db a partir de sql/schema.sql e do dataset simplificado.

Só usa a biblioteca padrão do Python (3.10+). Não precisa de internet: lê
apenas data/eleicoes_presidente.csv (gerado por scripts/gerar_dataset.py).

O CSV é desnormalizado (município, candidato e totais da zona se repetem);
a carga separa cada informação na sua tabela e falha se o mesmo município,
candidato ou zona aparecer com valores diferentes em linhas diferentes.

Uso:
    python3 scripts/carregar_banco.py
    python3 scripts/carregar_banco.py --csv outro.csv --db outro.db
"""

from __future__ import annotations

import argparse
import csv
import sqlite3
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SCHEMA = RAIZ / "sql" / "schema.sql"
CSV_PADRAO = RAIZ / "data" / "eleicoes_presidente.csv"
DB_PADRAO = RAIZ / "data" / "eleicoes.db"


def inteiro(v: str) -> int | None:
    return int(float(v)) if v != "" else None


def real(v: str) -> float | None:
    return float(v) if v != "" else None


def texto(v: str) -> str | None:
    return v if v != "" else None


class Tabela:
    """Linhas únicas por chave; acusa a mesma chave com valores diferentes."""

    def __init__(self, nome: str):
        self.nome = nome
        self.linhas: dict[tuple, tuple] = {}

    def add(self, chave: tuple, valores: tuple = ()) -> None:
        anterior = self.linhas.setdefault(chave, valores)
        if anterior != valores:
            raise ValueError(f"{self.nome} {chave}: {anterior} != {valores}")


def ler(caminho: Path) -> dict[str, Tabela]:
    t = {n: Tabela(n) for n in ("uf", "municipio", "zona", "eleicao", "turno", "pib_municipal", "partido",
                                "candidatura", "candidatura_turno", "comparecimento_zona", "votacao")}
    with caminho.open(encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f, delimiter=";"):
            ano, turno = int(r["ano"]), int(r["nr_turno"])
            mun, zona, nr = int(r["cd_municipio_tse"]), int(r["nr_zona"]), int(r["nr_candidato"])
            t["uf"].add((r["sg_uf"],), (texto(r["sg_regiao"]),))
            t["municipio"].add((mun,), (inteiro(r["cd_municipio_ibge"]), r["municipio"], r["sg_uf"],
                                        inteiro(r["populacao_2022"]), real(r["alfabetizacao_2022"])))
            t["zona"].add((mun, zona))
            t["eleicao"].add((ano,))
            t["turno"].add((ano, turno))
            if r["pib_mil_reais"]:
                t["pib_municipal"].add((mun, ano), (real(r["pib_mil_reais"]),))
            t["partido"].add((r["sg_partido"],))
            t["candidatura"].add((ano, nr), (r["nm_urna"], r["sg_partido"]))
            t["candidatura_turno"].add((ano, turno, nr), (texto(r["situacao_turno"]),))
            t["comparecimento_zona"].add((ano, turno, mun, zona), tuple(int(r[c]) for c in (
                "zona_aptos", "zona_comparecimento", "zona_abstencoes",
                "zona_votos_validos", "zona_votos_brancos", "zona_votos_nulos")))
            t["votacao"].add((ano, turno, mun, zona, nr), (int(r["qt_votos_nominais"]),))
    return t


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--csv", type=Path, default=CSV_PADRAO)
    ap.add_argument("--db", type=Path, default=DB_PADRAO)
    args = ap.parse_args()

    print(f"Lendo {args.csv.name}")
    tabelas = ler(args.csv)

    args.db.parent.mkdir(parents=True, exist_ok=True)
    args.db.unlink(missing_ok=True)
    con = sqlite3.connect(args.db, isolation_level=None)
    con.executescript(SCHEMA.read_text(encoding="utf-8"))
    con.execute("PRAGMA foreign_keys = ON")

    # ordem das chaves estrangeiras: referenciadas antes das que referenciam
    ordem = ["uf", "municipio", "zona", "eleicao", "turno", "pib_municipal", "partido",
             "candidatura", "candidatura_turno", "comparecimento_zona", "votacao"]
    con.execute("BEGIN")
    try:
        for nome in ordem:
            linhas = [k + v for k, v in sorted(tabelas[nome].linhas.items())]
            marcadores = ", ".join("?" * len(linhas[0]))
            con.executemany(f"INSERT INTO {nome} VALUES ({marcadores})", linhas)
            print(f"  {nome}: {len(linhas)} linhas")
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise

    problemas = con.execute("PRAGMA foreign_key_check").fetchall()
    print(f"\nPRAGMA foreign_key_check: {'ok' if not problemas else problemas[:10]}")
    print(f"PRAGMA integrity_check: {con.execute('PRAGMA integrity_check').fetchone()[0]}")
    n_csv = len(tabelas["votacao"].linhas)
    n_view = con.execute("SELECT COUNT(*) FROM v_dataset").fetchone()[0]
    print(f"v_dataset reconstrói o CSV: {n_view} de {n_csv} linhas")

    print("\nControle nacional (ano, turno, candidatos, aptos, comparecimento, válidos, % abstenção, zonas)")
    for l in con.execute("SELECT * FROM v_controle_nacional"):
        print("  " + " | ".join(f"{v:,}".replace(",", ".") if isinstance(v, int) and v > 9999 else str(v) for v in l))
    divergentes = con.execute("SELECT COUNT(*) FROM v_integridade_zona").fetchone()[0]
    print(f"Zonas em que a soma dos votos nominais ≠ votos válidos: {divergentes}")
    con.close()
    print(f"\nBanco: {args.db.relative_to(RAIZ) if args.db.is_relative_to(RAIZ) else args.db}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
