"""Testes do gerador de links com UTM (tools/gerar_utm.py)."""

from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "tools"))
import gerar_utm  # noqa: E402

PASTA = RAIZ / "docs" / "divulgacao-election-intelligence"


@pytest.fixture
def pasta(tmp_path: Path) -> Path:
    for nome in ("prospects_utm.csv", "links_uf.csv"):
        shutil.copy(PASTA / nome, tmp_path / nome)
    return tmp_path


def test_gera_dois_links_por_prospect_e_27_de_teste(pasta):
    linhas = gerar_utm.gerar(pasta)
    prospects = [x for x in linhas if x["tipo"] == "prospect"]
    assert len(prospects) == 17
    assert len([x for x in linhas if x["tipo"] == "teste"]) == 27
    a1 = next(x for x in prospects if x["ficha"] == "A1")
    assert a1["url_nacional"] == (
        "https://eleicoes-presidenciais-br.vercel.app/?utm_source=nicolau&utm_medium=substack"
        "&utm_campaign=lancamento-2026-11&utm_content=a1"
    )
    a5 = next(x for x in prospects if x["ficha"] == "A5")
    assert a5["url_recomendada"].endswith("utm_content=a5&uf=MG")
    b5 = next(x for x in prospects if x["ficha"] == "B5")
    assert b5["url_recomendada"].startswith("https://eleicoes-presidenciais-br.vercel.app/mudancas?")


def test_utm_fica_antes_do_hash_e_sem_dado_pessoal(pasta):
    for linha in gerar_utm.gerar(pasta):
        for chave in ("url_nacional", "url_recomendada"):
            partes = urlsplit(linha[chave])
            q = parse_qs(partes.query)
            assert q["utm_campaign"] == ["lancamento-2026-11"]
            assert "@" not in linha[chave]
            assert "utm_" not in partes.fragment


def test_csv_versionado_esta_atualizado(pasta):
    gerar_utm.gerar(pasta)
    assert (pasta / "utm_links.csv").read_text(encoding="utf-8") == (PASTA / "utm_links.csv").read_text(
        encoding="utf-8"
    )


@pytest.mark.parametrize(
    ("campo", "valor", "erro"),
    [
        ("slug", "Nicolau", "fora do padrão"),
        ("slug", "joão", "fora do padrão"),
        ("slug", "msoares", "repetido"),
        ("canal", "whatsapp", "canal"),
        ("ficha", "C1", "prioridade A ou B"),
        ("uf_sugerida", "ZZ", "não existe na base"),
    ],
)
def test_validacao_recusa_linha_invalida(pasta, campo, valor, erro):
    arq = pasta / "prospects_utm.csv"
    with open(arq, encoding="utf-8", newline="") as fh:
        linhas = list(csv.DictReader(fh, delimiter=";"))
    linhas[0][campo] = valor
    if campo == "uf_sugerida":
        linhas[0]["rota"] = "turnos"
    with open(arq, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0]), delimiter=";")
        w.writeheader()
        w.writerows(linhas)
    with pytest.raises(gerar_utm.ErroValidacao, match=erro):
        gerar_utm.gerar(pasta)
