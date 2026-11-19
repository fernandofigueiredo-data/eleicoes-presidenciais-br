#!/usr/bin/env python3
"""Gera a camada de dados processados do ELECTION INTELLIGENCE.

Entrada  : data/raw/*.csv  (tabelas exportadas do PBIX pelo PBIX-MCP, pbix_export_all_tables_csv)
           data/geo_src/*.json (malhas TopoJSON do IBGE, ver scripts/fetch_geo.sh)
Saída    : public/data/meta.json
           public/data/municipios.json
           public/data/turnos/<chave_turno>.json
           public/data/manifest.json        (contagens e somas de controle)
           public/geo/municipios.topo.json, public/geo/ufs.topo.json

Só usa a biblioteca padrão do Python. As transformações são apenas de FORMA
(colunas -> vetores alinhados pelo índice do município). Nenhum valor é
recalculado, arredondado ou preenchido: vazios do PBIX continuam vazios (null).

Uso:  python3 scripts/build_data.py
"""
from __future__ import annotations

import csv
import json
import shutil
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
GEO_SRC = ROOT / "data" / "geo_src"
OUT = ROOT / "public" / "data"
GEO_OUT = ROOT / "public" / "geo"


def read_csv(name: str) -> list[dict]:
    with open(RAW / f"{name}.csv", encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def num(v: str):
    """Converte texto do CSV em número, preservando vazio como None."""
    if v is None or v == "":
        return None
    f = float(v)
    return int(f) if f.is_integer() else f


def dump(path: Path, obj) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    path.write_text(txt, encoding="utf-8")
    return len(txt.encode("utf-8"))


def parse_measures(text: str) -> list[dict]:
    """Extrai nome, expressão DAX, formato e pasta de cada medida de um arquivo TMDL."""
    out, cur, mode = [], None, None
    for line in text.splitlines():
        s = line.strip()
        if line.startswith("\tmeasure "):
            if cur:
                out.append(cur)
            head = line[len("\tmeasure "):]
            name, _, expr = head.partition(" = ")
            cur = {"nome": name.strip().strip("'"), "dax": expr.strip(), "formato": None, "pasta": None}
            mode = "expr"
        elif cur and line.startswith("\t\t") and not line.startswith("\t\t\t") and ":" in s and mode:
            key, _, val = s.partition(":")
            if key == "formatString":
                cur["formato"] = val.strip()
            elif key == "displayFolder":
                cur["pasta"] = val.strip()
            mode = "props"
        elif cur and mode == "expr" and line.startswith("\t\t\t"):
            cur["dax"] = (cur["dax"] + "\n" + line[3:]).strip("\n")
        elif line.startswith("\tpartition"):
            if cur:
                out.append(cur)
            cur, mode = None, None
    if cur:
        out.append(cur)
    for m in out:
        m["dax"] = m["dax"].strip()
    return out


def main() -> int:
    turnos = read_csv("dTurno")
    candidatos = read_csv("dCandidato")
    cores = {r["sg_partido"]: r["cor"] for r in read_csv("PartidoCores")}
    municipios = read_csv("dMunicipio")
    comp = read_csv("fComparecimento")
    votos = read_csv("fVotos")

    # ---------- municípios (ordem estável: UF, nome, código TSE) ----------
    municipios.sort(key=lambda r: (r["sg_uf"], r["municipio"], int(r["cd_municipio_tse"])))
    idx = {int(r["cd_municipio_tse"]): i for i, r in enumerate(municipios)}
    ufs = sorted({r["sg_uf"] for r in municipios})
    uf_nome = {r["sg_uf"]: r["sg_uf_nome"] for r in municipios}
    uf_regiao = {r["sg_uf"]: r["sg_regiao"] for r in municipios}
    regioes = {r["sg_regiao"]: r["sg_regiao_nome"] for r in municipios}
    faixas = {r["faixa_populacao"]: int(r["ordem_faixa_populacao"]) for r in municipios}

    mun_out = {
        "tse": [int(r["cd_municipio_tse"]) for r in municipios],
        "ibge": [num(r["cd_municipio_ibge"]) for r in municipios],
        "nome": [r["municipio"] for r in municipios],
        "uf": [r["sg_uf"] for r in municipios],
        "exterior": [1 if r["exterior"] == "True" else 0 for r in municipios],
        "pop": [num(r["populacao_2022"]) for r in municipios],
        "alfab": [num(r["alfabetizacao_2022"]) for r in municipios],
        "pib": [num(r["pib_mil_reais"]) for r in municipios],
        "pibpc": [num(r["pib_per_capita"]) for r in municipios],
        "faixa": [r["faixa_populacao"] for r in municipios],
        "qPib": [r["Quartil PIB per capita"] for r in municipios],
        "qAlf": [r["Quartil Alfabetização"] for r in municipios],
    }

    # ---------- turnos: comparecimento e votos alinhados ao índice ----------
    n = len(municipios)
    comp_by_turno: dict[str, dict[str, list]] = {}
    fields = ["aptos", "comparecimento", "abstencoes", "votos_validos", "votos_brancos", "votos_nulos"]
    short = {"aptos": "aptos", "comparecimento": "comp", "abstencoes": "abst",
             "votos_validos": "validos", "votos_brancos": "brancos", "votos_nulos": "nulos"}
    controle = defaultdict(lambda: defaultdict(float))
    for r in comp:
        t = r["chave_turno"]
        block = comp_by_turno.setdefault(t, {short[f]: [None] * n for f in fields})
        i = idx[int(r["cd_municipio_tse"])]
        for f in fields:
            v = num(r[f])
            if block[short[f]][i] is not None:
                raise SystemExit(f"fComparecimento duplicado: {t} {r['cd_municipio_tse']}")
            block[short[f]][i] = v
            controle[t][f] += v or 0
        controle[t]["linhas_fComparecimento"] += 1

    votos_by_turno: dict[str, dict[str, list]] = defaultdict(dict)
    situacao: dict[str, dict[str, str]] = defaultdict(dict)
    for r in votos:
        t, c = r["chave_turno"], r["chave_candidato"]
        vec = votos_by_turno[t].setdefault(c, [None] * n)
        i = idx[int(r["cd_municipio_tse"])]
        if vec[i] is not None:
            raise SystemExit(f"fVotos duplicado: {t} {c} {r['cd_municipio_tse']}")
        vec[i] = num(r["qt_votos_nominais"])
        prev = situacao[t].get(c)
        if prev and prev != r["situacao_turno"]:
            raise SystemExit(f"situacao_turno não é constante para {t} {c}")
        situacao[t][c] = r["situacao_turno"]
        controle[t]["qt_votos_nominais"] += vec[i] or 0
        controle[t]["linhas_fVotos"] += 1

    # ---------- meta ----------
    turnos.sort(key=lambda r: int(r["ordem_turno"]))
    meta = {
        "produto": "ELECTION INTELLIGENCE — Análise Eleitoral Brasileira",
        "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte": "powerbi/eleicoes-presidenciais-br.pbix (exportado pelo PBIX-MCP)",
        "turnos": [{"chave": r["chave_turno"], "ano": int(r["ano"]), "nr": int(r["nr_turno"]),
                    "rotulo": r["rotulo_turno"], "ordem": int(r["ordem_turno"])} for r in turnos],
        "candidatos": [{"chave": r["chave_candidato"], "ano": int(r["ano"]), "nr": int(r["nr_candidato"]),
                        "nome": r["nm_urna"], "sigla": r["sg_partido"], "partido": r["partido_atual"]}
                       for r in sorted(candidatos, key=lambda r: (int(r["ano"]), int(r["nr_candidato"])))],
        "partidoCores": cores,
        "corPadrao": "#9AA3AE",
        "ufs": [{"sigla": u, "nome": uf_nome[u], "regiao": uf_regiao[u]} for u in ufs],
        "regioes": regioes,
        "faixas": [k for k, _ in sorted(faixas.items(), key=lambda kv: kv[1])],
        "quartisPib": sorted(set(mun_out["qPib"]), key=lambda s: (s == "Sem dado", s)),
        "quartisAlf": sorted(set(mun_out["qAlf"]), key=lambda s: (s == "Sem dado", s)),
        "situacao": situacao,
    }

    sizes = {}
    sizes["meta.json"] = dump(OUT / "meta.json", meta)
    sizes["municipios.json"] = dump(OUT / "municipios.json", mun_out)
    for t in meta["turnos"]:
        k = t["chave"]
        payload = {"chave": k, "comp": comp_by_turno[k], "votos": votos_by_turno[k]}
        sizes[f"turnos/{k}.json"] = dump(OUT / "turnos" / f"{k}.json", payload)

    manifest = {
        "gerado_em": meta["gerado_em"],
        "linhas_origem": {"dTurno": len(turnos), "dCandidato": len(candidatos), "dMunicipio": len(municipios),
                          "fComparecimento": len(comp), "fVotos": len(votos), "PartidoCores": len(cores)},
        "controle_por_turno": {t: dict(v) for t, v in sorted(controle.items())},
        "arquivos_bytes": sizes,
    }

    # ---------- dicionário de medidas (TMDL exportado pelo PBIX-MCP) e referência de validação ----------
    tmdl = ROOT / "data" / "metadata" / "tmdl" / "tables" / "_Medidas.tmdl"
    if tmdl.exists():
        sizes["medidas.json"] = dump(OUT / "medidas.json", parse_measures(tmdl.read_text(encoding="utf-8")))
    ref = ROOT / "data" / "metadata" / "referencia_mcp.json"
    if ref.exists():
        sizes["referencia_mcp.json"] = dump(OUT / "referencia_mcp.json", json.loads(ref.read_text(encoding="utf-8")))
    dump(OUT / "manifest.json", manifest)

    # ---------- geo ----------
    GEO_OUT.mkdir(parents=True, exist_ok=True)
    for src, dst in (("ibge_municipios_minima.json", "municipios.topo.json"), ("ibge_ufs_minima.json", "ufs.topo.json")):
        p = GEO_SRC / src
        if p.exists():
            topo = json.loads(p.read_text(encoding="utf-8"))
            if topo.get("type") != "Topology":
                raise SystemExit(f"{src} não é TopoJSON")
            dump(GEO_OUT / dst, topo)
        else:
            print(f"aviso: {p} não encontrado (rode scripts/fetch_geo.sh)", file=sys.stderr)

    print(json.dumps(manifest["linhas_origem"], ensure_ascii=False))
    for k, v in sizes.items():
        print(f"  {k:24s} {v/1024:8.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
