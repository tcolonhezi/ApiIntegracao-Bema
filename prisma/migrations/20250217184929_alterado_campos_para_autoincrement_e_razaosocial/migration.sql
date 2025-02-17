/*
  Warnings:

  - Made the column `codigo_sg` on table `Cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `razao_social` on table `Cliente` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cliente" (
    "cliente_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cliente_nome" TEXT NOT NULL,
    "cliente_cnpj_cpf" TEXT NOT NULL,
    "filial" INTEGER NOT NULL DEFAULT 1,
    "cidade_id" INTEGER NOT NULL,
    "codigo_sg" INTEGER NOT NULL,
    "razao_social" TEXT NOT NULL,
    CONSTRAINT "Cliente_cidade_id_fkey" FOREIGN KEY ("cidade_id") REFERENCES "Cidade" ("cidade_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Cliente" ("cidade_id", "cliente_cnpj_cpf", "cliente_id", "cliente_nome", "codigo_sg", "filial", "razao_social") SELECT "cidade_id", "cliente_cnpj_cpf", "cliente_id", "cliente_nome", "codigo_sg", "filial", "razao_social" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE UNIQUE INDEX "Cliente_cliente_cnpj_cpf_key" ON "Cliente"("cliente_cnpj_cpf");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
