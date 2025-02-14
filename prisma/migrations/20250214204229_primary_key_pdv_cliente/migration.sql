/*
  Warnings:

  - The primary key for the `VersaoPDV` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VersaoPDV" (
    "pdv_numero" INTEGER NOT NULL,
    "revisao" TEXT NOT NULL,
    "data_compilacao" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "sistema_op" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,

    PRIMARY KEY ("pdv_numero", "cliente_id"),
    CONSTRAINT "VersaoPDV_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente" ("cliente_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VersaoPDV" ("cliente_id", "data_compilacao", "pdv_numero", "revisao", "sistema_op", "versao") SELECT "cliente_id", "data_compilacao", "pdv_numero", "revisao", "sistema_op", "versao" FROM "VersaoPDV";
DROP TABLE "VersaoPDV";
ALTER TABLE "new_VersaoPDV" RENAME TO "VersaoPDV";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
