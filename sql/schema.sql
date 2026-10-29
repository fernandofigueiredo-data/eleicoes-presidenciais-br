-- =====================================================================
-- eleicoes-br-sql: eleições presidenciais 2014, 2018, 2022 e 2026
-- (1º e 2º turnos; o 2º turno de 2026 foi em 25/10/2026)
-- Banco normalizado a partir do dataset simplificado
-- data/eleicoes_presidente.csv (22 colunas, uma linha por candidato x
-- zona x turno). Fontes: TSE (Dados Abertos) e IBGE (Localidades e SIDRA).
-- SGBD: SQLite 3.25+ (usa funções de janela)
--
-- Uso:
--   python3 scripts/carregar_banco.py     (cria data/eleicoes.db e carrega o CSV)
--   ou: sqlite3 data/eleicoes.db < sql/schema.sql   (só a estrutura)
--
-- Chaves: todas naturais. cd_municipio_tse é o único código de município
-- que cobre também o exterior (UF 'ZZ'); o código IBGE fica como UNIQUE.
-- =====================================================================

PRAGMA foreign_keys = ON;


-- ---------------------------------------------------------------------
-- Geografia
-- ---------------------------------------------------------------------

-- 27 UFs + 'ZZ' (exterior, sem região).
CREATE TABLE uf (
    sg_uf       TEXT PRIMARY KEY CHECK (length(sg_uf) = 2),
    sg_regiao   TEXT CHECK (sg_regiao IN ('N', 'NE', 'SE', 'S', 'CO')),
    CHECK ((sg_uf = 'ZZ') = (sg_regiao IS NULL))
);

-- Municípios do Brasil e cidades do exterior onde há votação.
-- População e alfabetização são do Censo 2022 (um valor por município),
-- por isso ficam aqui; o PIB varia por ano e tem tabela própria.
CREATE TABLE municipio (
    cd_municipio_tse    INTEGER PRIMARY KEY,
    cd_municipio_ibge   INTEGER UNIQUE CHECK (cd_municipio_ibge BETWEEN 1000000 AND 9999999),
    municipio           TEXT    NOT NULL,
    sg_uf               TEXT    NOT NULL REFERENCES uf (sg_uf),
    populacao_2022      INTEGER CHECK (populacao_2022 > 0),                       -- IBGE, SIDRA 4709
    alfabetizacao_2022  REAL    CHECK (alfabetizacao_2022 BETWEEN 0 AND 100),     -- %, 15+ anos, SIDRA 9543
    -- exterior não tem código IBGE; o Brasil sempre tem
    CHECK ((sg_uf = 'ZZ') = (cd_municipio_ibge IS NULL))
);

-- Zona eleitoral. Só existe no par (município, zona): uma zona pode
-- atender vários municípios.
CREATE TABLE zona (
    cd_municipio_tse    INTEGER NOT NULL REFERENCES municipio (cd_municipio_tse),
    nr_zona             INTEGER NOT NULL CHECK (nr_zona > 0),
    PRIMARY KEY (cd_municipio_tse, nr_zona)
) WITHOUT ROWID;


-- ---------------------------------------------------------------------
-- Eleição, turno, partido e candidatura
-- ---------------------------------------------------------------------

CREATE TABLE eleicao (
    ano     INTEGER PRIMARY KEY CHECK (ano BETWEEN 1989 AND 2100 AND ano % 2 = 0)
);

CREATE TABLE turno (
    ano         INTEGER NOT NULL REFERENCES eleicao (ano),
    nr_turno    INTEGER NOT NULL CHECK (nr_turno IN (1, 2)),
    PRIMARY KEY (ano, nr_turno)
) WITHOUT ROWID;

-- PIB municipal a preços correntes (mil R$, SIDRA 5938) associado a cada
-- eleição: o do próprio ano em 2014 e 2018; para 2022 e 2026, o de 2023
-- (último publicado) ou o de 2022 se faltar 2023.
CREATE TABLE pib_municipal (
    cd_municipio_tse    INTEGER NOT NULL REFERENCES municipio (cd_municipio_tse),
    ano                 INTEGER NOT NULL REFERENCES eleicao (ano),
    pib_mil_reais       REAL    NOT NULL CHECK (pib_mil_reais > 0),
    PRIMARY KEY (cd_municipio_tse, ano)
) WITHOUT ROWID;

CREATE TABLE partido (
    sg_partido  TEXT PRIMARY KEY
);

-- Candidatura a presidente. Em cada eleição o número identifica a
-- candidatura que recebeu votos (substituídos não aparecem no dataset).
CREATE TABLE candidatura (
    ano             INTEGER NOT NULL REFERENCES eleicao (ano),
    nr_candidato    INTEGER NOT NULL CHECK (nr_candidato BETWEEN 10 AND 99),
    nm_urna         TEXT    NOT NULL,
    sg_partido      TEXT    NOT NULL REFERENCES partido (sg_partido),
    PRIMARY KEY (ano, nr_candidato)
) WITHOUT ROWID;

-- Candidatura em cada turno que disputou, com a situação ao fim do turno.
-- Votos referenciam esta tabela, o que impede votos de um turno em quem
-- não o disputou (ex.: 2º turno para quem saiu no 1º).
CREATE TABLE candidatura_turno (
    ano             INTEGER NOT NULL,
    nr_turno        INTEGER NOT NULL,
    nr_candidato    INTEGER NOT NULL,
    situacao_turno  TEXT CHECK (situacao_turno IN ('ELEITO', 'NÃO ELEITO', '2º TURNO')),
    PRIMARY KEY (ano, nr_turno, nr_candidato),
    FOREIGN KEY (ano, nr_turno)     REFERENCES turno (ano, nr_turno),
    FOREIGN KEY (ano, nr_candidato) REFERENCES candidatura (ano, nr_candidato)
) WITHOUT ROWID;


-- ---------------------------------------------------------------------
-- Fatos
-- ---------------------------------------------------------------------

-- Uma linha = totais de uma zona em um turno (voto em trânsito de 2014
-- já somado). Só zonas com pelo menos um voto nominal.
CREATE TABLE comparecimento_zona (
    ano                 INTEGER NOT NULL,
    nr_turno            INTEGER NOT NULL,
    cd_municipio_tse    INTEGER NOT NULL,
    nr_zona             INTEGER NOT NULL,
    aptos               INTEGER NOT NULL CHECK (aptos >= 0),
    comparecimento      INTEGER NOT NULL CHECK (comparecimento >= 0),
    abstencoes          INTEGER NOT NULL CHECK (abstencoes >= 0),
    votos_validos       INTEGER NOT NULL CHECK (votos_validos >= 0),
    votos_brancos       INTEGER NOT NULL CHECK (votos_brancos >= 0),
    votos_nulos         INTEGER NOT NULL CHECK (votos_nulos >= 0),
    PRIMARY KEY (ano, nr_turno, cd_municipio_tse, nr_zona),
    FOREIGN KEY (ano, nr_turno) REFERENCES turno (ano, nr_turno),
    FOREIGN KEY (cd_municipio_tse, nr_zona) REFERENCES zona (cd_municipio_tse, nr_zona),
    CHECK (comparecimento <= aptos),
    -- válidos + brancos + nulos não passam do comparecimento (a diferença,
    -- quando há, são votos anulados apurados em separado: Salvador/BA, 2018)
    CHECK (votos_validos + votos_brancos + votos_nulos <= comparecimento)
) WITHOUT ROWID;

-- Uma linha = votos nominais de uma candidatura em uma zona, em um turno.
-- WITHOUT ROWID: chave composta, linhas pequenas, acesso pela chave.
CREATE TABLE votacao (
    ano                 INTEGER NOT NULL,
    nr_turno            INTEGER NOT NULL,
    cd_municipio_tse    INTEGER NOT NULL,
    nr_zona             INTEGER NOT NULL,
    nr_candidato        INTEGER NOT NULL,
    qt_votos_nominais   INTEGER NOT NULL CHECK (qt_votos_nominais >= 0),
    PRIMARY KEY (ano, nr_turno, cd_municipio_tse, nr_zona, nr_candidato),
    FOREIGN KEY (ano, nr_turno, cd_municipio_tse, nr_zona)
        REFERENCES comparecimento_zona (ano, nr_turno, cd_municipio_tse, nr_zona),
    FOREIGN KEY (ano, nr_turno, nr_candidato)
        REFERENCES candidatura_turno (ano, nr_turno, nr_candidato)
) WITHOUT ROWID;


-- ---------------------------------------------------------------------
-- Auditoria: correções de votos (ex.: o TSE republicou um arquivo)
-- ---------------------------------------------------------------------

CREATE TABLE auditoria_votacao (
    id                  INTEGER PRIMARY KEY,
    momento             TEXT    NOT NULL DEFAULT (datetime('now')),
    operacao            TEXT    NOT NULL CHECK (operacao IN ('UPDATE', 'DELETE')),
    ano                 INTEGER NOT NULL,
    nr_turno            INTEGER NOT NULL,
    cd_municipio_tse    INTEGER NOT NULL,
    nr_zona             INTEGER NOT NULL,
    nr_candidato        INTEGER NOT NULL,
    qt_antigo           INTEGER,
    qt_novo             INTEGER
);

CREATE TRIGGER trg_votacao_audita_update
AFTER UPDATE OF qt_votos_nominais ON votacao
WHEN OLD.qt_votos_nominais IS NOT NEW.qt_votos_nominais
BEGIN
    INSERT INTO auditoria_votacao
        (operacao, ano, nr_turno, cd_municipio_tse, nr_zona, nr_candidato, qt_antigo, qt_novo)
    VALUES
        ('UPDATE', OLD.ano, OLD.nr_turno, OLD.cd_municipio_tse, OLD.nr_zona, OLD.nr_candidato,
         OLD.qt_votos_nominais, NEW.qt_votos_nominais);
END;

CREATE TRIGGER trg_votacao_audita_delete
AFTER DELETE ON votacao
BEGIN
    INSERT INTO auditoria_votacao
        (operacao, ano, nr_turno, cd_municipio_tse, nr_zona, nr_candidato, qt_antigo, qt_novo)
    VALUES
        ('DELETE', OLD.ano, OLD.nr_turno, OLD.cd_municipio_tse, OLD.nr_zona, OLD.nr_candidato,
         OLD.qt_votos_nominais, NULL);
END;


-- ---------------------------------------------------------------------
-- Índices (as PKs já cobrem buscas por ano/turno)
-- ---------------------------------------------------------------------

CREATE INDEX idx_votacao_candidato   ON votacao (ano, nr_candidato);
CREATE INDEX idx_votacao_municipio   ON votacao (cd_municipio_tse, nr_zona);
CREATE INDEX idx_comparec_municipio  ON comparecimento_zona (cd_municipio_tse);
CREATE INDEX idx_municipio_uf        ON municipio (sg_uf);
CREATE INDEX idx_candidatura_partido ON candidatura (sg_partido);


-- ---------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------

-- Reconstrói o dataset simplificado, coluna por coluna e na mesma ordem.
CREATE VIEW v_dataset AS
SELECT v.ano,
       v.nr_turno,
       u.sg_regiao,
       m.sg_uf,
       m.cd_municipio_tse,
       m.cd_municipio_ibge,
       m.municipio,
       v.nr_zona,
       v.nr_candidato,
       c.nm_urna,
       c.sg_partido,
       ct.situacao_turno,
       v.qt_votos_nominais,
       cz.aptos          AS zona_aptos,
       cz.comparecimento AS zona_comparecimento,
       cz.abstencoes     AS zona_abstencoes,
       cz.votos_validos  AS zona_votos_validos,
       cz.votos_brancos  AS zona_votos_brancos,
       cz.votos_nulos    AS zona_votos_nulos,
       m.populacao_2022,
       m.alfabetizacao_2022,
       p.pib_mil_reais
FROM votacao v
JOIN municipio m            ON m.cd_municipio_tse = v.cd_municipio_tse
JOIN uf u                   ON u.sg_uf = m.sg_uf
JOIN candidatura c          ON c.ano = v.ano AND c.nr_candidato = v.nr_candidato
JOIN candidatura_turno ct   ON ct.ano = v.ano AND ct.nr_turno = v.nr_turno AND ct.nr_candidato = v.nr_candidato
JOIN comparecimento_zona cz ON cz.ano = v.ano AND cz.nr_turno = v.nr_turno
                           AND cz.cd_municipio_tse = v.cd_municipio_tse AND cz.nr_zona = v.nr_zona
LEFT JOIN pib_municipal p   ON p.cd_municipio_tse = v.cd_municipio_tse AND p.ano = v.ano;

-- Resultado nacional por turno, com % dos válidos e posição.
CREATE VIEW v_resultado_nacional AS
SELECT v.ano,
       v.nr_turno,
       v.nr_candidato,
       c.nm_urna,
       c.sg_partido,
       ct.situacao_turno,
       SUM(v.qt_votos_nominais) AS votos,
       ROUND(100.0 * SUM(v.qt_votos_nominais)
             / SUM(SUM(v.qt_votos_nominais)) OVER (PARTITION BY v.ano, v.nr_turno), 2) AS pct_validos,
       RANK() OVER (PARTITION BY v.ano, v.nr_turno ORDER BY SUM(v.qt_votos_nominais) DESC) AS posicao
FROM votacao v
JOIN candidatura c        ON c.ano = v.ano AND c.nr_candidato = v.nr_candidato
JOIN candidatura_turno ct ON ct.ano = v.ano AND ct.nr_turno = v.nr_turno AND ct.nr_candidato = v.nr_candidato
GROUP BY v.ano, v.nr_turno, v.nr_candidato;

-- Votos por município e candidatura, com % e posição no município.
CREATE VIEW v_resultado_municipio AS
SELECT v.ano,
       v.nr_turno,
       m.cd_municipio_tse,
       m.cd_municipio_ibge,
       m.municipio,
       m.sg_uf,
       v.nr_candidato,
       c.nm_urna,
       c.sg_partido,
       SUM(v.qt_votos_nominais) AS votos,
       ROUND(100.0 * SUM(v.qt_votos_nominais)
             / SUM(SUM(v.qt_votos_nominais)) OVER (PARTITION BY v.ano, v.nr_turno, m.cd_municipio_tse), 2) AS pct_validos,
       ROW_NUMBER() OVER (PARTITION BY v.ano, v.nr_turno, m.cd_municipio_tse
                          ORDER BY SUM(v.qt_votos_nominais) DESC, v.nr_candidato) AS posicao
FROM votacao v
JOIN municipio m   ON m.cd_municipio_tse = v.cd_municipio_tse
JOIN candidatura c ON c.ano = v.ano AND c.nr_candidato = v.nr_candidato
GROUP BY v.ano, v.nr_turno, m.cd_municipio_tse, v.nr_candidato;

-- Mais votado em cada município, por turno.
CREATE VIEW v_vencedor_municipio AS
SELECT * FROM v_resultado_municipio WHERE posicao = 1;

-- Mais votado no 1º e no 2º turno da mesma eleição, por município.
-- mudou = 1 quando quem venceu o 2º turno não tinha vencido o 1º no município.
CREATE VIEW v_virada_municipio AS
SELECT t1.ano,
       t1.cd_municipio_tse,
       t1.cd_municipio_ibge,
       t1.municipio,
       t1.sg_uf,
       t1.nm_urna      AS vencedor_1t,
       t1.sg_partido   AS partido_1t,
       t1.pct_validos  AS pct_validos_1t,
       t2.nm_urna      AS vencedor_2t,
       t2.sg_partido   AS partido_2t,
       t2.pct_validos  AS pct_validos_2t,
       (t1.nr_candidato <> t2.nr_candidato) AS mudou
FROM v_vencedor_municipio t1
JOIN v_vencedor_municipio t2 ON t2.ano = t1.ano AND t2.cd_municipio_tse = t1.cd_municipio_tse
WHERE t1.nr_turno = 1
  AND t2.nr_turno = 2;

-- Comparecimento e abstenção por município (soma das zonas).
CREATE VIEW v_comparecimento_municipio AS
SELECT cz.ano,
       cz.nr_turno,
       m.cd_municipio_tse,
       m.cd_municipio_ibge,
       m.municipio,
       m.sg_uf,
       SUM(cz.aptos)          AS aptos,
       SUM(cz.comparecimento) AS comparecimento,
       SUM(cz.abstencoes)     AS abstencoes,
       SUM(cz.votos_validos)  AS votos_validos,
       SUM(cz.votos_brancos)  AS votos_brancos,
       SUM(cz.votos_nulos)    AS votos_nulos,
       ROUND(100.0 * SUM(cz.abstencoes) / NULLIF(SUM(cz.aptos), 0), 2) AS pct_abstencao
FROM comparecimento_zona cz
JOIN municipio m ON m.cd_municipio_tse = cz.cd_municipio_tse
GROUP BY cz.ano, cz.nr_turno, m.cd_municipio_tse;

-- Abstenção por UF como razão de somas (não média de razões).
CREATE VIEW v_comparecimento_uf AS
SELECT cz.ano,
       cz.nr_turno,
       u.sg_regiao,
       m.sg_uf,
       SUM(cz.aptos)          AS aptos,
       SUM(cz.comparecimento) AS comparecimento,
       SUM(cz.abstencoes)     AS abstencoes,
       SUM(cz.votos_brancos)  AS votos_brancos,
       SUM(cz.votos_nulos)    AS votos_nulos,
       SUM(cz.votos_validos)  AS votos_validos,
       ROUND(100.0 * SUM(cz.abstencoes) / SUM(cz.aptos), 2) AS pct_abstencao
FROM comparecimento_zona cz
JOIN municipio m ON m.cd_municipio_tse = cz.cd_municipio_tse
JOIN uf u        ON u.sg_uf = m.sg_uf
GROUP BY cz.ano, cz.nr_turno, m.sg_uf;

-- Totais nacionais por turno, para conferir com o resultado oficial.
CREATE VIEW v_controle_nacional AS
SELECT cz.ano,
       cz.nr_turno,
       (SELECT COUNT(*) FROM candidatura_turno ct
        WHERE ct.ano = cz.ano AND ct.nr_turno = cz.nr_turno) AS candidatos,
       SUM(cz.aptos)          AS aptos,
       SUM(cz.comparecimento) AS comparecimento,
       SUM(cz.votos_validos)  AS votos_validos,
       ROUND(100.0 * SUM(cz.abstencoes) / SUM(cz.aptos), 2) AS pct_abstencao,
       COUNT(*)               AS zonas
FROM comparecimento_zona cz
GROUP BY cz.ano, cz.nr_turno
ORDER BY cz.ano, cz.nr_turno;

-- Integridade: a soma dos votos nominais da zona tem de ser igual aos
-- votos válidos informados pelo TSE. Lista só as zonas que não fecham.
CREATE VIEW v_integridade_zona AS
SELECT cz.ano,
       cz.nr_turno,
       cz.cd_municipio_tse,
       cz.nr_zona,
       cz.votos_validos,
       SUM(v.qt_votos_nominais) AS soma_nominais
FROM comparecimento_zona cz
JOIN votacao v ON v.ano = cz.ano AND v.nr_turno = cz.nr_turno
              AND v.cd_municipio_tse = cz.cd_municipio_tse AND v.nr_zona = cz.nr_zona
GROUP BY cz.ano, cz.nr_turno, cz.cd_municipio_tse, cz.nr_zona
HAVING SUM(v.qt_votos_nominais) <> cz.votos_validos;

-- Indicadores socioeconômicos por município e eleição (o PIB per capita
-- usa a população do Censo 2022 em todos os anos: é uma aproximação).
CREATE VIEW v_municipio_indicadores AS
SELECT m.cd_municipio_tse,
       m.cd_municipio_ibge,
       m.municipio,
       m.sg_uf,
       u.sg_regiao,
       p.ano,
       m.populacao_2022,
       m.alfabetizacao_2022,
       p.pib_mil_reais,
       ROUND(1000.0 * p.pib_mil_reais / m.populacao_2022, 2) AS pib_per_capita_reais
FROM municipio m
JOIN uf u ON u.sg_uf = m.sg_uf
LEFT JOIN pib_municipal p ON p.cd_municipio_tse = m.cd_municipio_tse
WHERE m.cd_municipio_ibge IS NOT NULL;
