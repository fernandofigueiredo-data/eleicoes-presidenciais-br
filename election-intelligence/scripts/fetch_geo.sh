#!/usr/bin/env bash
# Baixa as malhas territoriais oficiais do IBGE (API de Malhas v3, TopoJSON, qualidade mínima).
# Municípios: propriedade "codarea" = código IBGE de 7 dígitos. UFs: "codarea" = código IBGE da UF.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data/geo_src
BASE="https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&qualidade=minima"
curl -fsSL "${BASE}&intrarregiao=municipio" -o data/geo_src/ibge_municipios_minima.json
curl -fsSL "${BASE}&intrarregiao=UF" -o data/geo_src/ibge_ufs_minima.json
ls -la data/geo_src
