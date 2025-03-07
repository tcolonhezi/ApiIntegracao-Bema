/*
  Warnings:

  - You are about to drop the column `vers_sgdfe` on the `BackupVersao` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BackupVersao" (
    "bkp_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bkp_srv_espaco_livre" INTEGER,
    "bkp_ultimo_sgerp_cliente" TEXT,
    "bkp_ultimo_sgdfe" TEXT,
    "bkp_local_sgdfe" TEXT,
    "bkp_local_sgerp" TEXT,
    "bkp_ultimo_automatico" TEXT,
    "bkp_tamanho_sgdfe" TEXT,
    "bkp_tamanho_sgerp" TEXT,
    "script_md5" TEXT,
    "script_retorno_update" TEXT,
    "script_ultima_comunicao" TEXT,
    "sgerp_versao_sgerp" TEXT,
    "sgerp_revisao" TEXT,
    "sgerp_compilacao" TEXT,
    "versao_sgdfe" TEXT,
    "cloud" BOOLEAN,
    "cloud_sgdfe" TEXT,
    "cloud_sgerp" TEXT,
    "bkp_seguranca" TEXT,
    "env_cliente" TEXT,
    "cliente_id" INTEGER NOT NULL,
    CONSTRAINT "BackupVersao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente" ("cliente_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BackupVersao" ("bkp_id", "bkp_local_sgdfe", "bkp_local_sgerp", "bkp_srv_espaco_livre", "bkp_tamanho_sgdfe", "bkp_tamanho_sgerp", "bkp_ultimo_automatico", "bkp_ultimo_sgdfe", "bkp_ultimo_sgerp_cliente", "cliente_id", "script_md5", "script_retorno_update", "script_ultima_comunicao", "sgerp_compilacao", "sgerp_revisao", "sgerp_versao_sgerp") SELECT "bkp_id", "bkp_local_sgdfe", "bkp_local_sgerp", "bkp_srv_espaco_livre", "bkp_tamanho_sgdfe", "bkp_tamanho_sgerp", "bkp_ultimo_automatico", "bkp_ultimo_sgdfe", "bkp_ultimo_sgerp_cliente", "cliente_id", "script_md5", "script_retorno_update", "script_ultima_comunicao", "sgerp_compilacao", "sgerp_revisao", "sgerp_versao_sgerp" FROM "BackupVersao";
DROP TABLE "BackupVersao";
ALTER TABLE "new_BackupVersao" RENAME TO "BackupVersao";
CREATE UNIQUE INDEX "BackupVersao_cliente_id_bkp_id_key" ON "BackupVersao"("cliente_id", "bkp_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
