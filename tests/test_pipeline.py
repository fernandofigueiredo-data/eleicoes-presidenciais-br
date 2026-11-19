"""Testes do pipeline Python: dataset, tabelas limpas, banco SQL e consistência com o Power BI.

Rode da raiz do repositório:  pytest -q
Os valores esperados são os oficiais do TSE (comparecimento e votos válidos por turno) e os
números citados no README.
"""

from __future__ import annotations

import csv
import json
import sqlite3
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
LIMPO = RAIZ / "data" / "limpo"

# Resultado oficial do TSE por turno: (comparecimento, votos válidos)
TSE = {
    "2014-1": (115_122_883, 104_023_802),
    "2014-2": (112_683_879, 105_542_273),
    "2018-1": (117_364_654, 107_050_749),
    "2018-2": (115_933_451, 104_838_753),
    "2022-1": (123_682_372, 118_229_719),
    "2022-2": (124_252_796, 118_552_353),
    "2026-1": (125_275_835, 119_300_788),
    "2026-2": (128_236_074, 124_082_273),
}


def ler(nome: str) -> list[dict]:
    with open(LIMPO / f"{nome}.csv", encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh, delimiter=";"))


# ---------------------------------------------------------------- tabelas limpas (modelo estrela)


def test_tabelas_limpas_tem_o_tamanho_documentado():
    esperado = {"dTurno": 8, "dCandidato": 47, "dMunicipio": 5766, "fVotos": 309_308, "fComparecimento": 45_834}
    assert {n: len(ler(n)) for n in esperado} == esperado


def test_chaves_sem_duplicidade():
    assert len({r["cd_municipio_tse"] for r in ler("dMunicipio")}) == 5766
    chaves = [(r["chave_turno"], r["cd_municipio_tse"]) for r in ler("fComparecimento")]
    assert len(chaves) == len(set(chaves))
    chaves = [(r["chave_turno"], r["cd_municipio_tse"], r["chave_candidato"]) for r in ler("fVotos")]
    assert len(chaves) == len(set(chaves))


def test_totais_iguais_ao_tse():
    comp, val = defaultdict(int), defaultdict(int)
    for r in ler("fComparecimento"):
        comp[r["chave_turno"]] += int(r["comparecimento"])
        val[r["chave_turno"]] += int(r["votos_validos"])
    assert {t: (comp[t], val[t]) for t in TSE} == TSE


def test_soma_dos_candidatos_igual_aos_validos_em_cada_municipio():
    votos = defaultdict(int)
    for r in ler("fVotos"):
        votos[(r["chave_turno"], r["cd_municipio_tse"])] += int(r["qt_votos_nominais"])
    divergentes = [
        r for r in ler("fComparecimento") if votos[(r["chave_turno"], r["cd_municipio_tse"])] != int(r["votos_validos"])
    ]
    assert divergentes == []


def test_integridade_referencial():
    municipios = {r["cd_municipio_tse"] for r in ler("dMunicipio")}
    candidatos = {r["chave_candidato"] for r in ler("dCandidato")}
    turnos = {r["chave_turno"] for r in ler("dTurno")}
    for r in ler("fVotos"):
        assert r["cd_municipio_tse"] in municipios and r["chave_candidato"] in candidatos and r["chave_turno"] in turnos


# ---------------------------------------------------------------- banco SQL


@pytest.fixture(scope="module")
def banco(tmp_path_factory) -> sqlite3.Connection:
    db = tmp_path_factory.mktemp("sql") / "eleicoes.db"
    subprocess.run(
        [sys.executable, str(RAIZ / "scripts" / "carregar_banco.py"), "--db", str(db)], check=True, capture_output=True
    )
    con = sqlite3.connect(db)
    yield con
    con.close()


def test_banco_integro(banco):
    assert banco.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert banco.execute("PRAGMA foreign_key_check").fetchall() == []
    assert banco.execute("SELECT COUNT(*) FROM v_integridade_zona").fetchone()[0] == 0


def test_view_reconstroi_o_dataset(banco):
    assert banco.execute("SELECT COUNT(*) FROM v_dataset").fetchone()[0] == 340_702


def test_resultado_2026_segundo_turno(banco):
    linhas = banco.execute(
        "SELECT nm_urna, votos, pct_validos FROM v_resultado_nacional "
        "WHERE ano = 2026 AND nr_turno = 2 ORDER BY votos DESC"
    ).fetchall()
    assert linhas == [("LULA", 64_256_232, 51.79), ("FLAVIO BOLSONARO", 59_826_041, 48.21)]


def test_viradas_2026_regra_do_sql(banco):
    """O SQL desempata pelo número do candidato (ROW_NUMBER); o Power BI conta empate para os dois (215)."""
    viradas = dict(
        banco.execute(
            "SELECT vencedor_2t, COUNT(*) FROM v_virada_municipio "
            "WHERE ano = 2026 AND mudou = 1 AND sg_uf <> 'ZZ' GROUP BY 1"
        ).fetchall()
    )
    assert viradas == {"LULA": 212, "FLAVIO BOLSONARO": 1}


# ---------------------------------------------------------------- consistência entre camadas


def test_python_e_power_bi_tem_os_mesmos_totais():
    """As tabelas limpas em Python e as exportadas do PBIX (site) somam o mesmo por turno."""
    manifesto = json.loads(
        (RAIZ / "election-intelligence" / "public" / "data" / "manifest.json").read_text(encoding="utf-8")
    )
    for turno, (comparecimento, validos) in TSE.items():
        controle = manifesto["controle_por_turno"][turno]
        assert controle["comparecimento"] == comparecimento
        assert controle["votos_validos"] == validos
        assert controle["qt_votos_nominais"] == validos
