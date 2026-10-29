"""Gera o dataset simplificado (CSV e XLSX) a partir dos arquivos brutos de data/raw/.

Só usa a biblioteca padrão do Python (3.10+). Rode depois de scripts/baixar_dados.py.

Uma linha = votos de um candidato a presidente em uma zona eleitoral de um
município, em um turno. São 22 colunas: tempo, geografia, candidato, votos,
totais da zona (repetidos em cada candidato da zona) e indicadores do IBGE.

Tratamentos aplicados aos arquivos do TSE (Latin-1, ';'):
  * voto em trânsito (só 2014) somado à linha comum da mesma zona;
  * códigos de município e zona como inteiros (sem zero à esquerda);
  * exterior = UF 'ZZ', sem região e sem indicadores do IBGE;
  * PIB do ano da eleição; para 2022 e 2026, o de 2023 (último publicado),
    ou o de 2022 se o município não tiver 2023.

Uso:
    python3 scripts/gerar_dataset.py            # gera CSV e XLSX
    python3 scripts/gerar_dataset.py --sem-xlsx
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.sax.saxutils import escape

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "data" / "raw"
CSV_SAIDA = RAIZ / "data" / "eleicoes_presidente.csv"
XLSX_SAIDA = RAIZ / "data" / "eleicoes_presidente.xlsx"

COLUNAS = [
    "ano", "nr_turno",
    "sg_regiao", "sg_uf", "cd_municipio_tse", "cd_municipio_ibge", "municipio", "nr_zona",
    "nr_candidato", "nm_urna", "sg_partido", "situacao_turno",
    "qt_votos_nominais",
    "zona_aptos", "zona_comparecimento", "zona_abstencoes",
    "zona_votos_validos", "zona_votos_brancos", "zona_votos_nulos",
    "populacao_2022", "alfabetizacao_2022", "pib_mil_reais",
]

# coluna do dataset -> coluna do detalhe_votacao_munzona
TOTAIS_ZONA = {
    "zona_aptos": "QT_APTOS",
    "zona_comparecimento": "QT_COMPARECIMENTO",
    "zona_abstencoes": "QT_ABSTENCOES",
    "zona_votos_validos": "QT_TOTAL_VOTOS_VALIDOS",
    "zona_votos_brancos": "QT_VOTOS_BRANCOS",
    "zona_votos_nulos": "QT_TOTAL_VOTOS_NULOS",
}


def ler_csv(caminho: Path):
    with caminho.open(encoding="latin-1", newline="") as f:
        yield from csv.DictReader(f, delimiter=";")


def ler_sidra(nome: str) -> dict[tuple[int, int], float]:
    """{(código IBGE, ano): valor}. O 1º elemento do JSON do SIDRA é o cabeçalho."""
    linhas = json.loads((RAW / "ibge" / nome).read_text(encoding="utf-8"))[1:]
    saida = {}
    for l in linhas:
        try:
            saida[(int(l["D1C"]), int(l["D3C"]))] = float(l["V"])
        except ValueError:  # '-', '...', 'X'
            pass
    return saida


def montar_linhas() -> list[dict]:
    # municípios: código TSE -> (código IBGE, UF, nome IBGE, região)
    ibge = {m["municipio-id"]: m for m in
            json.loads((RAW / "ibge" / "ibge_municipios.json").read_text(encoding="utf-8"))}
    municipios = {}
    for r in ler_csv(RAW / "tse" / "municipio_tse_ibge.csv"):
        cd_ibge = int(r["CD_MUNICIPIO_IBGE"])
        m = ibge.get(cd_ibge, {})
        municipios[int(r["CD_MUNICIPIO_TSE"])] = {
            "sg_regiao": m.get("regiao-sigla"), "sg_uf": r["SG_UF"], "cd_municipio_ibge": cd_ibge,
            "municipio": m.get("municipio-nome") or r["NM_MUNICIPIO_IBGE"],
        }
    pop = ler_sidra("sidra_4709_populacao_2022.json")
    alf = ler_sidra("sidra_9543_alfabetizacao_2022.json")
    pib = ler_sidra("sidra_5938_pib_municipal.json")

    def municipio(r: dict) -> dict:
        cd = int(r["CD_MUNICIPIO"])
        if cd not in municipios:
            if r["SG_UF"] != "ZZ":
                raise ValueError(f"município {cd} ({r['NM_MUNICIPIO']}/{r['SG_UF']}) fora da tabela TSE x IBGE")
            municipios[cd] = {"sg_regiao": None, "sg_uf": "ZZ", "cd_municipio_ibge": None,
                              "municipio": r["NM_MUNICIPIO"].strip().title()}
        return municipios[cd]

    linhas = []
    anos = sorted(int(p.name) for p in (RAW / "tse").iterdir() if p.is_dir() and p.name.isdigit())
    for ano in anos:
        pasta = RAW / "tse" / str(ano)

        zonas: dict[tuple, dict] = defaultdict(lambda: dict.fromkeys(TOTAIS_ZONA, 0))
        for r in ler_csv(pasta / f"detalhe_votacao_munzona_{ano}_BR.csv"):
            if int(r["CD_CARGO"]) != 1:
                continue
            municipio(r)
            z = zonas[(int(r["NR_TURNO"]), int(r["CD_MUNICIPIO"]), int(r["NR_ZONA"]))]
            for col, orig in TOTAIS_ZONA.items():
                z[col] += int(r[orig])

        # nome de urna e sigla vêm do cadastro de candidaturas, que é a grafia oficial
        # (o arquivo de votação de 2018 abrevia PATRIOTA como PATRI)
        cadastro = {}
        for r in ler_csv(pasta / f"consulta_cand_{ano}_BR.csv"):
            if int(r["CD_CARGO"]) == 1 and int(r["CD_SITUACAO_CANDIDATURA"]) != 3:  # 3 = INAPTO (substituído)
                cadastro[int(r["NR_CANDIDATO"])] = (r["NM_URNA_CANDIDATO"].strip(), r["SG_PARTIDO"].strip())

        votos: dict[tuple, int] = defaultdict(int)
        candidato, situacao = {}, {}
        for r in ler_csv(pasta / f"votacao_candidato_munzona_{ano}_BR.csv"):
            turno, nr = int(r["NR_TURNO"]), int(r["NR_CANDIDATO"])
            municipio(r)
            votos[(turno, int(r["CD_MUNICIPIO"]), int(r["NR_ZONA"]), nr)] += int(r["QT_VOTOS_NOMINAIS"])
            candidato[nr] = cadastro.get(nr, (r["NM_URNA_CANDIDATO"].strip(), r["SG_PARTIDO"].strip()))
            sit = r["DS_SIT_TOT_TURNO"].strip()
            situacao[(turno, nr)] = None if sit.startswith("#") else sit

        pib_ano = {2014: [2014], 2018: [2018]}.get(ano, [2023, 2022])
        for (turno, cd_tse, zona, nr), qt in votos.items():
            m = municipios[cd_tse]
            ci = m["cd_municipio_ibge"]
            linhas.append({
                "ano": ano, "nr_turno": turno, **m, "cd_municipio_tse": cd_tse, "nr_zona": zona,
                "nr_candidato": nr, "nm_urna": candidato[nr][0], "sg_partido": candidato[nr][1],
                "situacao_turno": situacao[(turno, nr)], "qt_votos_nominais": qt,
                **zonas[(turno, cd_tse, zona)],
                "populacao_2022": pop.get((ci, 2022)),
                "alfabetizacao_2022": alf.get((ci, 2022)),
                "pib_mil_reais": next((pib[(ci, a)] for a in pib_ano if (ci, a) in pib), None),
            })
        print(f"  {ano}: {sum(1 for l in linhas if l['ano'] == ano)} linhas")

    linhas.sort(key=lambda l: (l["ano"], l["nr_turno"], l["sg_uf"], l["municipio"], l["nr_zona"], l["nr_candidato"]))
    return linhas


def valor(v):
    """Inteiros sem '.0' (população vem do SIDRA como float)."""
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


def gravar_csv(linhas: list[dict], destino: Path) -> None:
    with destino.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(COLUNAS)
        for l in linhas:
            w.writerow(["" if l[c] is None else valor(l[c]) for c in COLUNAS])


def _letra(i: int) -> str:
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def gravar_xlsx(linhas: list[dict], destino: Path) -> None:
    """XLSX mínimo (uma planilha, texto inline), sem depender do openpyxl."""
    letras = [_letra(i) for i in range(len(COLUNAS))]

    def celula(ref: str, v) -> str:
        if v is None:
            return ""
        v = valor(v)
        if isinstance(v, (int, float)):
            return f'<c r="{ref}"><v>{v}</v></c>'
        return f'<c r="{ref}" t="inlineStr"><is><t>{escape(str(v))}</t></is></c>'

    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                   '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                   '</Types>')
        z.writestr("_rels/.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                   '</Relationships>')
        z.writestr("xl/workbook.xml",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                   'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                   '<sheets><sheet name="eleicoes_presidente" sheetId="1" r:id="rId1"/></sheets></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
                   '</Relationships>')
        with z.open("xl/worksheets/sheet1.xml", "w") as f:
            f.write(b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    b'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                    b'<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/>'
                    b'</sheetView></sheetViews><sheetData>')
            cab = "".join(celula(f"{letras[i]}1", c) for i, c in enumerate(COLUNAS))
            f.write(f'<row r="1">{cab}</row>'.encode())
            for n, l in enumerate(linhas, start=2):
                cels = "".join(celula(f"{letras[i]}{n}", l[c]) for i, c in enumerate(COLUNAS))
                f.write(f'<row r="{n}">{cels}</row>'.encode())
            f.write(b"</sheetData></worksheet>")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sem-xlsx", action="store_true", help="gera só o CSV")
    args = ap.parse_args()

    print("Lendo data/raw/")
    linhas = montar_linhas()
    gravar_csv(linhas, CSV_SAIDA)
    print(f"CSV:  {CSV_SAIDA.relative_to(RAIZ)} ({len(linhas)} linhas, {CSV_SAIDA.stat().st_size / 1e6:.0f} MB)")
    if not args.sem_xlsx:
        gravar_xlsx(linhas, XLSX_SAIDA)
        print(f"XLSX: {XLSX_SAIDA.relative_to(RAIZ)} ({XLSX_SAIDA.stat().st_size / 1e6:.0f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
