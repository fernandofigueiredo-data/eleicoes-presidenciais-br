"""Números do material de divulgação (press kit, vídeo e imagens) recalculados a partir de data/limpo/.

Os quartis de PIB per capita (73,9% e 44,1%) e as contagens de viradas são conferidos no Vitest
(election-intelligence/tests/divulgacao.test.js), porque os quartis vêm do modelo do Power BI.

Se os dados mudarem, estes testes falham e o material precisa ser revisto
(docs/divulgacao-election-intelligence/12_VERIFICACAO_MIDIA.md).
"""

from __future__ import annotations

from pathlib import Path

import pytest

pd = pytest.importorskip("pandas")
np = pytest.importorskip("numpy")
smf = pytest.importorskip("statsmodels.formula.api")

LIMPO = Path(__file__).resolve().parent.parent / "data" / "limpo"
LULA_2026 = "2026-13"


@pytest.fixture(scope="module")
def base() -> pd.DataFrame:
    """Mesma base do notebook analise_perfil.ipynb (2º turno de 2026, Lula, municípios com IBGE)."""
    mun = pd.read_csv(LIMPO / "dMunicipio.csv", sep=";")
    votos = pd.read_csv(LIMPO / "fVotos.csv", sep=";")
    comp = pd.read_csv(LIMPO / "fComparecimento.csv", sep=";")
    v = votos[(votos.chave_turno == "2026-2") & (votos.chave_candidato == LULA_2026)]
    v = v.groupby("cd_municipio_tse").qt_votos_nominais.sum().rename("votos")
    c = comp[comp.chave_turno == "2026-2"].set_index("cd_municipio_tse").votos_validos.rename("validos")
    d = mun[~mun.exterior].set_index("cd_municipio_tse").join(v).join(c)
    d = d.dropna(subset=["pib_per_capita", "alfabetizacao_2022", "votos", "validos"])
    d = d[d.validos > 0].copy()
    d["y"] = d.votos / d.validos
    d["lpib"] = np.log2(d.pib_per_capita)
    return d


def test_efeito_da_renda_cai_de_8_8_para_1_7_ponto(base):
    so_renda = smf.wls("y ~ lpib", data=base, weights=base.validos).fit()
    completo = smf.wls(
        "y ~ lpib + alfabetizacao_2022 + C(sg_regiao, Treatment('CO'))", data=base, weights=base.validos
    ).fit()
    assert round(so_renda.params.lpib * 100, 1) == -8.8
    assert round(completo.params.lpib * 100, 1) == -1.7
    assert round(so_renda.rsquared, 2) == 0.33
    assert round(completo.rsquared, 2) == 0.65
    # com renda e alfabetização iguais, o Nordeste dá a Lula 21 pontos a mais que o Centro-Oeste
    assert round(completo.params["C(sg_regiao, Treatment('CO'))[T.NE]"] * 100) == 21
