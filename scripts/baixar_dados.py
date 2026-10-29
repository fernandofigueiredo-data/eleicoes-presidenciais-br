"""Baixa os datasets do projeto eleicoes-br-sql (TSE + IBGE).

Só usa a biblioteca padrão do Python (3.10+).

Os ZIPs do TSE têm centenas de MB porque trazem todos os cargos e todas as UFs.
A votação presidencial está inteira no arquivo interno `*_BR.csv` (~30-40 MB).
Por isso o script lê o índice do ZIP remoto e baixa só esse arquivo, usando
requisições HTTP com `Range`. Use --zip-completo para baixar o ZIP inteiro.

Cada arquivo baixado entra em data/raw/manifesto.csv com SHA-256 e Last-Modified,
para saber de qual versão do TSE veio o dataset. Depois rode scripts/gerar_dataset.py.

Uso:
    python3 scripts/baixar_dados.py                  # 2014, 2018, 2022 e 2026
    python3 scripts/baixar_dados.py --anos 2018 2022
    python3 scripts/baixar_dados.py --zip-completo   # baixa os ZIPs inteiros (~2 GB)
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "data" / "raw"
MANIFESTO = RAW / "manifesto.csv"

TSE = "https://cdn.tse.jus.br/estatistica/sead/odsele"
DATASETS_TSE = ("votacao_candidato_munzona", "detalhe_votacao_munzona", "consulta_cand")

# (arquivo de saída, URL, descrição)
IBGE = [
    ("ibge_municipios.json",
     "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado",
     "Lista oficial de municípios, UF e região (API de Localidades)"),
    ("sidra_4709_populacao_2022.json",
     "https://apisidra.ibge.gov.br/values/t/4709/n6/all/v/93/p/2022",
     "População residente, Censo 2022"),
    ("sidra_5938_pib_municipal.json",
     "https://apisidra.ibge.gov.br/values/t/5938/n6/all/v/37/p/2014,2018,2022,2023",
     "PIB municipal a preços correntes (mil R$), anos de eleição + último disponível"),
    ("sidra_9543_alfabetizacao_2022.json",
     "https://apisidra.ibge.gov.br/values/t/9543/n6/all/v/2513/p/2022/c2/6794/c86/95251/c287/100362",
     "Taxa de alfabetização 15+ anos, Censo 2022"),
]

USER_AGENT = "eleicoes-br-sql/1.0 (projeto academico CS50 SQL)"


def _req(url: str, **headers) -> urllib.request.Request:
    return urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **headers})


class ArquivoHttp:
    """Objeto tipo arquivo, só leitura, sobre uma URL que aceita Range (bloco de 4 MB em cache)."""

    BLOCO = 4 * 1024 * 1024

    def __init__(self, url: str):
        self.url = url
        self.pos = 0
        with urllib.request.urlopen(_req(url, Range="bytes=0-0"), timeout=60) as r:
            self.last_modified = r.headers.get("Last-Modified")
            self.tamanho = int(r.headers["Content-Range"].split("/")[-1])
        self._ini, self._dados = -1, b""

    def seekable(self) -> bool:
        return True

    def tell(self) -> int:
        return self.pos

    def seek(self, offset: int, whence: int = 0) -> int:
        base = {0: 0, 1: self.pos, 2: self.tamanho}[whence]
        self.pos = base + offset
        return self.pos

    def read(self, n: int = -1) -> bytes:
        if n is None or n < 0:
            n = self.tamanho - self.pos
        n = min(n, self.tamanho - self.pos)
        if n <= 0:
            return b""
        fim_cache = self._ini + len(self._dados)
        if not (self._ini <= self.pos and self.pos + n <= fim_cache):
            fim = min(self.pos + max(n, self.BLOCO), self.tamanho) - 1
            with urllib.request.urlopen(_req(self.url, Range=f"bytes={self.pos}-{fim}"), timeout=120) as r:
                self._ini, self._dados = self.pos, r.read()
        i = self.pos - self._ini
        out = self._dados[i:i + n]
        self.pos += len(out)
        return out


def sha256(caminho: Path) -> str:
    h = hashlib.sha256()
    with caminho.open("rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def registrar(linhas: list[dict], arquivo: Path, url: str, last_modified: str | None, fonte: str) -> None:
    linhas.append({
        "arquivo": arquivo.relative_to(RAIZ).as_posix(),
        "url": url,
        "sha256": sha256(arquivo),
        "last_modified": last_modified or "",
        "bytes": arquivo.stat().st_size,
        "baixado_em": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "fonte": fonte,
    })
    print(f"  ok  {arquivo.relative_to(RAIZ)}  ({arquivo.stat().st_size / 1e6:.1f} MB)")


def _extrair(origem, destino: Path, sufixos: tuple[str, ...]) -> list[Path]:
    saida = []
    with zipfile.ZipFile(origem) as z:
        for info in z.infolist():
            if info.filename.endswith(sufixos):
                alvo = destino / Path(info.filename).name
                with z.open(info) as src, alvo.open("wb") as dst:
                    shutil.copyfileobj(src, dst, 1 << 20)
                saida.append(alvo)
    return saida


def extrair_membros(url: str, destino: Path, sufixos: tuple[str, ...]) -> tuple[list[Path], str | None]:
    """Extrai de um ZIP remoto só os membros cujo nome termina com um dos sufixos.

    Se a leitura por Range falhar (o CDN do TSE às vezes ignora o Range ou serve
    pedaços de versões diferentes logo após republicar um arquivo), baixa o ZIP
    inteiro num temporário e extrai dele.
    """
    try:
        remoto = ArquivoHttp(url)
        return _extrair(remoto, destino, sufixos), remoto.last_modified
    except (zipfile.BadZipFile, KeyError, ValueError) as e:
        print(f"  (leitura parcial falhou: {e}; baixando o ZIP inteiro)")
    tmp = destino / f".{Path(url).name}.tmp"
    try:
        lm = baixar(url, tmp)
        return _extrair(tmp, destino, sufixos), lm
    finally:
        tmp.unlink(missing_ok=True)


def baixar(url: str, alvo: Path) -> str | None:
    try:
        with urllib.request.urlopen(_req(url), timeout=300) as r, alvo.open("wb") as f:
            shutil.copyfileobj(r, f, 1 << 20)
            return r.headers.get("Last-Modified")
    except urllib.error.URLError as e:
        # O Python do python.org no macOS não usa a cadeia de certificados do sistema,
        # e o IBGE costuma falhar na verificação. O curl do sistema resolve.
        if not isinstance(e.reason, ssl.SSLError) or not shutil.which("curl"):
            raise
        print("  (SSL falhou no Python; usando curl)")
        cab = subprocess.run(["curl", "-fsSL", "-A", USER_AGENT, "-o", str(alvo), "-D", "-", url],
                             check=True, capture_output=True, text=True).stdout
        lm = [l.split(":", 1)[1].strip() for l in cab.splitlines() if l.lower().startswith("last-modified:")]
        return lm[-1] if lm else None


def json_valido(caminho: Path) -> bool:
    try:
        return bool(json.loads(caminho.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        return False


def baixar_ibge(url: str, alvo: Path) -> str | None:
    """Baixa um JSON do IBGE; se vier vazio ou inválido, tenta de novo com o curl."""
    try:
        lm = baixar(url, alvo)
        if json_valido(alvo):
            return lm
    except Exception as e:
        if not shutil.which("curl"):
            raise
        print(f"  ({e}; tentando com curl)")
    if not shutil.which("curl"):
        raise ValueError("a API devolveu uma resposta vazia ou que não é JSON")
    cab = subprocess.run(["curl", "-fsSL", "--retry", "3", "-A", USER_AGENT, "-o", str(alvo), "-D", "-", url],
                         check=True, capture_output=True, text=True).stdout
    if not json_valido(alvo):
        raise ValueError("a API devolveu uma resposta vazia ou que não é JSON")
    lm = [l.split(":", 1)[1].strip() for l in cab.splitlines() if l.lower().startswith("last-modified:")]
    return lm[-1] if lm else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--anos", nargs="+", type=int, default=[2014, 2018, 2022, 2026])
    ap.add_argument("--zip-completo", action="store_true", help="baixa os ZIPs inteiros do TSE")
    ap.add_argument("--sem-ibge", action="store_true",
                    help="não baixa o IBGE; registra as cópias já em data/raw/ibge/")
    args = ap.parse_args()

    linhas: list[dict] = []

    print("TSE: tabela de equivalência de municípios TSE x IBGE")
    dest = RAW / "tse"
    dest.mkdir(parents=True, exist_ok=True)
    url = f"{TSE}/municipio_tse_ibge/municipio_tse_ibge.zip"
    arquivos, lm = extrair_membros(url, dest, (".csv",))
    for a in arquivos:
        registrar(linhas, a, url, lm, "TSE")

    for ano in args.anos:
        for ds in DATASETS_TSE:
            url = f"{TSE}/{ds}/{ds}_{ano}.zip"
            print(f"TSE: {ds} {ano}")
            dest = RAW / "tse" / str(ano)
            dest.mkdir(parents=True, exist_ok=True)
            try:
                if args.zip_completo:
                    alvo = dest / f"{ds}_{ano}.zip"
                    lm = baixar(url, alvo)
                    registrar(linhas, alvo, url, lm, "TSE")
                else:
                    # _BR.csv = cargos nacionais (presidente); consulta_cand_BR.csv também
                    arquivos, lm = extrair_membros(url, dest, (f"{ds}_{ano}_BR.csv",))
                    if not arquivos:
                        print("  aviso: nenhum *_BR.csv no ZIP; rode com --zip-completo")
                    for a in arquivos:
                        registrar(linhas, a, url, lm, "TSE")
                    # dicionário de dados (leiame.pdf), uma cópia por dataset, do ano mais recente
                    if ano == max(args.anos):
                        leiame = RAW / "tse" / "leiame"
                        leiame.mkdir(exist_ok=True)
                        pdfs, _ = extrair_membros(url, leiame, ("leiame.pdf",))
                        for pdf in pdfs:
                            pdf.replace(leiame / f"leiame_{ds}.pdf")
            except Exception as e:  # o ano pode ainda não estar publicado
                print(f"  falhou: {e}")

    dest = RAW / "ibge"
    dest.mkdir(parents=True, exist_ok=True)
    faltando = []
    for nome, url, desc in IBGE:
        print(f"IBGE: {desc}")
        alvo = dest / nome
        lm = None
        if not args.sem_ibge:
            # baixa num temporário para não apagar uma cópia boa se a API falhar
            tmp = alvo.with_suffix(".tmp")
            try:
                lm = baixar_ibge(url, tmp)
                tmp.replace(alvo)
            except Exception as e:
                tmp.unlink(missing_ok=True)
                print(f"  falhou: {e}")
        if json_valido(alvo):
            if args.sem_ibge or lm is None:
                print("  usando a cópia já existente")
            registrar(linhas, alvo, url, lm, "IBGE")
        else:
            faltando.append(alvo.relative_to(RAIZ).as_posix())

    RAW.mkdir(parents=True, exist_ok=True)
    with MANIFESTO.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)
    total = sum(l["bytes"] for l in linhas) / 1e6
    print(f"\n{len(linhas)} arquivos, {total:.0f} MB. Manifesto: {MANIFESTO.relative_to(RAIZ)}")
    if faltando:
        print("\nA API do IBGE não respondeu (costuma bloquear servidores fora do Brasil, como o Codespace).")
        print("Envie estes arquivos de outra máquina para data/raw/ibge/ e rode de novo com --sem-ibge:")
        for f in faltando:
            print(f"  {f}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
