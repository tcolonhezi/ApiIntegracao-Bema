-- CreateTable
CREATE TABLE "Cidade" (
    "cidade_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cidade_nome" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Cliente" (
    "cliente_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cliente_nome" TEXT NOT NULL,
    "cliente_cnpj_cpf" TEXT NOT NULL,
    "filial" INTEGER NOT NULL DEFAULT 1,
    "cidade_id" INTEGER NOT NULL,
    CONSTRAINT "Cliente_cidade_id_fkey" FOREIGN KEY ("cidade_id") REFERENCES "Cidade" ("cidade_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VersaoPDV" (
    "pdv_numero" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "revisao" TEXT NOT NULL,
    "data_compilacao" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "sistema_op" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    CONSTRAINT "VersaoPDV_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente" ("cliente_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupVersao" (
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
    "vers_sgdfe" TEXT,
    "cliente_id" INTEGER NOT NULL,
    CONSTRAINT "BackupVersao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente" ("cliente_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cliente_cnpj_cpf_key" ON "Cliente"("cliente_cnpj_cpf");
