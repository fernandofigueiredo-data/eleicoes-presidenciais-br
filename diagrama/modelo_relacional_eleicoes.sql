CREATE TABLE "uf" (
  "sg_uf" text PRIMARY KEY,
  "sg_regiao" text
);

CREATE TABLE "municipio" (
  "cd_municipio_tse" integer PRIMARY KEY,
  "cd_municipio_ibge" integer UNIQUE,
  "municipio" text NOT NULL,
  "sg_uf" text NOT NULL,
  "populacao_2022" integer,
  "alfabetizacao_2022" real
);

CREATE TABLE "zona" (
  "cd_municipio_tse" integer NOT NULL,
  "nr_zona" integer NOT NULL,
  PRIMARY KEY ("cd_municipio_tse", "nr_zona")
);

CREATE TABLE "pib_municipal" (
  "cd_municipio_tse" integer NOT NULL,
  "ano" integer NOT NULL,
  "pib_mil_reais" real NOT NULL,
  PRIMARY KEY ("cd_municipio_tse", "ano")
);

CREATE TABLE "eleicao" (
  "ano" integer PRIMARY KEY
);

CREATE TABLE "turno" (
  "ano" integer NOT NULL,
  "nr_turno" integer NOT NULL,
  PRIMARY KEY ("ano", "nr_turno")
);

CREATE TABLE "partido" (
  "sg_partido" text PRIMARY KEY
);

CREATE TABLE "candidatura" (
  "ano" integer NOT NULL,
  "nr_candidato" integer NOT NULL,
  "nm_urna" text NOT NULL,
  "sg_partido" text NOT NULL,
  PRIMARY KEY ("ano", "nr_candidato")
);

CREATE TABLE "candidatura_turno" (
  "ano" integer NOT NULL,
  "nr_turno" integer NOT NULL,
  "nr_candidato" integer NOT NULL,
  "situacao_turno" text,
  PRIMARY KEY ("ano", "nr_turno", "nr_candidato")
);

CREATE TABLE "comparecimento_zona" (
  "ano" integer NOT NULL,
  "nr_turno" integer NOT NULL,
  "cd_municipio_tse" integer NOT NULL,
  "nr_zona" integer NOT NULL,
  "aptos" integer NOT NULL,
  "comparecimento" integer NOT NULL,
  "abstencoes" integer NOT NULL,
  "votos_validos" integer NOT NULL,
  "votos_brancos" integer NOT NULL,
  "votos_nulos" integer NOT NULL,
  PRIMARY KEY ("ano", "nr_turno", "cd_municipio_tse", "nr_zona")
);

CREATE TABLE "votacao" (
  "ano" integer NOT NULL,
  "nr_turno" integer NOT NULL,
  "cd_municipio_tse" integer NOT NULL,
  "nr_zona" integer NOT NULL,
  "nr_candidato" integer NOT NULL,
  "qt_votos_nominais" integer NOT NULL,
  PRIMARY KEY ("ano", "nr_turno", "cd_municipio_tse", "nr_zona", "nr_candidato")
);

CREATE TABLE "auditoria_votacao" (
  "id" integer PRIMARY KEY,
  "momento" text NOT NULL DEFAULT (datetime('now')),
  "operacao" text NOT NULL,
  "ano" integer NOT NULL,
  "nr_turno" integer NOT NULL,
  "cd_municipio_tse" integer NOT NULL,
  "nr_zona" integer NOT NULL,
  "nr_candidato" integer NOT NULL,
  "qt_antigo" integer,
  "qt_novo" integer
);

CREATE INDEX "idx_municipio_uf" ON "municipio" ("sg_uf");

CREATE INDEX "idx_candidatura_partido" ON "candidatura" ("sg_partido");

CREATE INDEX "idx_comparec_municipio" ON "comparecimento_zona" ("cd_municipio_tse");

CREATE INDEX "idx_votacao_candidato" ON "votacao" ("ano", "nr_candidato");

CREATE INDEX "idx_votacao_municipio" ON "votacao" ("cd_municipio_tse", "nr_zona");

COMMENT ON COLUMN "uf"."sg_uf" IS '27 UFs + ZZ (exterior)';

COMMENT ON COLUMN "uf"."sg_regiao" IS 'N, NE, SE, S, CO; nulo só para ZZ';

COMMENT ON COLUMN "municipio"."cd_municipio_tse" IS 'único código que cobre o exterior';

COMMENT ON COLUMN "municipio"."cd_municipio_ibge" IS 'nulo no exterior (UF ZZ)';

COMMENT ON COLUMN "municipio"."populacao_2022" IS 'IBGE, SIDRA 4709';

COMMENT ON COLUMN "municipio"."alfabetizacao_2022" IS '%, 15+ anos, SIDRA 9543';

COMMENT ON COLUMN "eleicao"."ano" IS 'par, entre 1989 e 2100';

COMMENT ON COLUMN "turno"."nr_turno" IS '1 ou 2';

COMMENT ON COLUMN "candidatura"."nr_candidato" IS '10 a 99';

COMMENT ON COLUMN "candidatura_turno"."situacao_turno" IS 'ELEITO, NÃO ELEITO, 2º TURNO';

COMMENT ON COLUMN "comparecimento_zona"."comparecimento" IS '<= aptos';

COMMENT ON COLUMN "comparecimento_zona"."votos_nulos" IS 'válidos + brancos + nulos <= comparecimento';

COMMENT ON COLUMN "auditoria_votacao"."operacao" IS 'UPDATE ou DELETE';

ALTER TABLE "municipio" ADD FOREIGN KEY ("sg_uf") REFERENCES "uf" ("sg_uf") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "zona" ADD FOREIGN KEY ("cd_municipio_tse") REFERENCES "municipio" ("cd_municipio_tse") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "pib_municipal" ADD FOREIGN KEY ("cd_municipio_tse") REFERENCES "municipio" ("cd_municipio_tse") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "pib_municipal" ADD FOREIGN KEY ("ano") REFERENCES "eleicao" ("ano") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "turno" ADD FOREIGN KEY ("ano") REFERENCES "eleicao" ("ano") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "candidatura" ADD FOREIGN KEY ("ano") REFERENCES "eleicao" ("ano") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "candidatura" ADD FOREIGN KEY ("sg_partido") REFERENCES "partido" ("sg_partido") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "candidatura_turno" ADD FOREIGN KEY ("ano", "nr_turno") REFERENCES "turno" ("ano", "nr_turno") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "candidatura_turno" ADD FOREIGN KEY ("ano", "nr_candidato") REFERENCES "candidatura" ("ano", "nr_candidato") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comparecimento_zona" ADD FOREIGN KEY ("ano", "nr_turno") REFERENCES "turno" ("ano", "nr_turno") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comparecimento_zona" ADD FOREIGN KEY ("cd_municipio_tse", "nr_zona") REFERENCES "zona" ("cd_municipio_tse", "nr_zona") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "votacao" ADD FOREIGN KEY ("ano", "nr_turno", "cd_municipio_tse", "nr_zona") REFERENCES "comparecimento_zona" ("ano", "nr_turno", "cd_municipio_tse", "nr_zona") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "votacao" ADD FOREIGN KEY ("ano", "nr_turno", "nr_candidato") REFERENCES "candidatura_turno" ("ano", "nr_turno", "nr_candidato") DEFERRABLE INITIALLY IMMEDIATE;
