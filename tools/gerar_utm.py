"""Gera os links com UTM da campanha de divulgação (lancamento-2026-11).

Lê docs/divulgacao-election-intelligence/prospects_utm.csv e escreve utm_links.csv na mesma pasta:
- para cada prospect, o link da página nacional e o link recomendado para a mensagem (UF sugerida,
  outra rota ou, sem sugestão, a própria página nacional);
- os 27 links por UF com UTM genérico (utm_source=teste), usados nos testes da T3.

Os parâmetros UTM ficam ANTES do "#": o site usa rotas por hash, e o que vem depois do "#" não chega
às ferramentas de medição. Nenhum parâmetro leva e-mail, telefone ou outro dado pessoal.

Uso (da raiz do repositório):  python3 tools/gerar_utm.py
Só usa a biblioteca padrão.
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path
from urllib.parse import urlencode

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "docs" / "divulgacao-election-intelligence"
SITE = "https://eleicoes-presidenciais-br.vercel.app/"
CAMPANHA = "lancamento-2026-11"
CANAIS = {"email", "linkedin", "x", "substack", "formulario"}
ROTAS = {"nacional", "mapa", "participacao", "mudancas", "turnos", "perfil", "comparar", "sobre"}
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FICHA = re.compile(r"^[AB]\d{1,2}$")  # prospects de prioridade C não recebem UTM nesta campanha
EMAIL_OU_TELEFONE = re.compile(r"@|\d{8,}")


class ErroValidacao(ValueError):
    """Linha inválida em prospects_utm.csv."""


def ufs_da_base(pasta: Path = PASTA) -> list[str]:
    """As 27 UFs saem de links_uf.csv, gerado a partir da base do site (npm run docs:divulgacao)."""
    with open(pasta / "links_uf.csv", encoding="utf-8-sig", newline="") as fh:
        ufs = [linha["uf"] for linha in csv.DictReader(fh, delimiter=";")]
    if len(ufs) != 27:
        raise ErroValidacao(f"links_uf.csv tem {len(ufs)} UFs, e não 27")
    return ufs


def url(source: str, medium: str, rota: str, uf: str = "", content: str = "") -> str:
    params = {"utm_source": source, "utm_medium": medium, "utm_campaign": CAMPANHA}
    if content:
        params["utm_content"] = content.lower()
    hash_ = f"#/{rota}" + (f"?uf={uf}" if uf else "")
    return f"{SITE}?{urlencode(params)}{hash_}"


def validar(prospects: list[dict], ufs: list[str]) -> None:
    vistos: set[str] = set()
    erros = []
    for n, p in enumerate(prospects, start=2):
        slug, canal, ficha = p["slug"].strip(), p["canal"].strip(), p["ficha"].strip()
        uf, rota = p.get("uf_sugerida", "").strip(), (p.get("rota", "").strip() or "nacional")
        if not SLUG.match(slug):
            erros.append(f"linha {n}: slug {slug!r} fora do padrão (minúsculo, sem acento, com hífen)")
        if EMAIL_OU_TELEFONE.search(slug):
            erros.append(f"linha {n}: slug {slug!r} parece conter e-mail ou telefone")
        if slug in vistos:
            erros.append(f"linha {n}: slug {slug!r} repetido")
        vistos.add(slug)
        if canal not in CANAIS:
            erros.append(f"linha {n}: canal {canal!r} não é um de {sorted(CANAIS)}")
        if not FICHA.match(ficha):
            erros.append(f"linha {n}: ficha {ficha!r} não é de prioridade A ou B")
        if uf and uf not in ufs:
            erros.append(f"linha {n}: UF {uf!r} não existe na base")
        if rota not in ROTAS:
            erros.append(f"linha {n}: rota {rota!r} não existe no site")
        if uf and rota != "turnos":
            erros.append(f"linha {n}: UF sugerida só vale para a rota turnos")
    if erros:
        raise ErroValidacao("\n".join(erros))


def gerar(pasta: Path = PASTA) -> list[dict]:
    with open(pasta / "prospects_utm.csv", encoding="utf-8-sig", newline="") as fh:
        prospects = list(csv.DictReader(fh, delimiter=";"))
    ufs = ufs_da_base(pasta)
    validar(prospects, ufs)
    linhas = []
    for p in prospects:
        slug, canal, ficha = p["slug"].strip(), p["canal"].strip(), p["ficha"].strip()
        uf, rota = p["uf_sugerida"].strip(), (p["rota"].strip() or "nacional")
        nacional = url(slug, canal, "nacional", content=ficha)
        linhas.append(
            {
                "tipo": "prospect",
                "id": p["id"],
                "ficha": ficha,
                "utm_source": slug,
                "utm_medium": canal,
                "uf": uf,
                "rota_recomendada": f"#/{rota}" + (f"?uf={uf}" if uf else ""),
                "url_nacional": nacional,
                "url_recomendada": url(slug, canal, rota, uf, ficha),
            }
        )
    for uf in ufs:
        linhas.append(
            {
                "tipo": "teste",
                "id": "",
                "ficha": "",
                "utm_source": "teste",
                "utm_medium": "email",
                "uf": uf,
                "rota_recomendada": f"#/turnos?uf={uf}",
                "url_nacional": url("teste", "email", "nacional"),
                "url_recomendada": url("teste", "email", "turnos", uf),
            }
        )
    with open(pasta / "utm_links.csv", "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(linhas[0]), delimiter=";")
        w.writeheader()
        w.writerows(linhas)
    return linhas


def main() -> int:
    argparse.ArgumentParser(description=__doc__.splitlines()[0]).parse_args()
    try:
        linhas = gerar()
    except ErroValidacao as e:
        print(f"prospects_utm.csv inválido:\n{e}", file=sys.stderr)
        return 1
    n = sum(1 for linha in linhas if linha["tipo"] == "prospect")
    print(f"utm_links.csv: {n} prospects e {len(linhas) - n} links de teste por UF")
    return 0


if __name__ == "__main__":
    sys.exit(main())
