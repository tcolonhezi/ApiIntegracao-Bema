import { BackupVersao } from "@prisma/client";
import { prisma } from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function updateBackupServidor(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/backup/servidor",
    {
      schema: {
        body: z.object({
          cnpj: z.string(),
          bkp_srv_espaco_livre: z
            .string()
            .optional()
            .transform((value) => value?.replace(/\D/g, ""))
            .transform(Number),
          bkp_ultimo_sgerp_cliente: z.string().optional(),
          bkp_ultimo_sgdfe: z.string().optional(),
          bkp_local_sgdfe: z.string().optional(),
          bkp_local_sgerp: z.string().optional(),
          bkp_ultimo_automatico: z.string().optional(),
          bkp_tamanho_sgdfe: z.string().optional(),
          bkp_tamanho_sgerp: z.string().optional(),
          script_md5: z.string().optional(),
          script_retorno_update: z.string().optional(),
          sgerp_versao_sgerp: z.string().optional(),
          sgerp_revisao: z.string().optional(),
          sgerp_compilacao: z.string().optional(),
          versao_sgdfe: z.string().optional(),
          cloud: z.boolean().optional(),
          cloud_sgdfe: z.string().optional(),
          cloud_sgerp: z.string().optional(),
          bkp_seguranca: z.string().optional(),
          env_cliente: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const {
        cnpj,
        bkp_srv_espaco_livre,
        bkp_ultimo_sgerp_cliente,
        bkp_ultimo_sgdfe,
        bkp_local_sgdfe,
        bkp_local_sgerp,
        bkp_ultimo_automatico,
        bkp_tamanho_sgdfe,
        bkp_tamanho_sgerp,
        script_md5,
        script_retorno_update,
        sgerp_versao_sgerp,
        sgerp_revisao,
        sgerp_compilacao,
        versao_sgdfe,
        cloud,
        cloud_sgdfe,
        cloud_sgerp,
        bkp_seguranca,
        env_cliente,
      } = request.body;
      console.log(request.body);
      const cliente = await prisma.cliente.findUnique({
        where: {
          cliente_cnpj_cpf: cnpj,
        },
      });

      if (!cliente) {
        reply.status(404).send({ message: "Cliente não encontrado" });
        return;
      }

      const existingBackup = await prisma.backupVersao.findFirst({
        where: {
          cliente_id: cliente.cliente_id,
        },
      });
      //data atual brasil
      let script_ultima_comunicao = new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour12: false, // Formato 24h
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      let backupResponse: BackupVersao;
      if (existingBackup) {
        backupResponse = await prisma.backupVersao.update({
          where: {
            cliente_id: cliente.cliente_id,
            bkp_id: existingBackup.bkp_id,
          },
          data: {
            bkp_srv_espaco_livre,
            bkp_ultimo_sgerp_cliente,
            bkp_ultimo_sgdfe,
            bkp_local_sgdfe,
            bkp_local_sgerp,
            bkp_ultimo_automatico,
            bkp_tamanho_sgdfe,
            bkp_tamanho_sgerp,
            script_md5,
            script_retorno_update,
            script_ultima_comunicao,
            sgerp_versao_sgerp,
            sgerp_revisao,
            sgerp_compilacao,
            versao_sgdfe,
            cloud,
            cloud_sgdfe,
            cloud_sgerp,
            bkp_seguranca,
            env_cliente,
          },
        });
      } else {
        backupResponse = await prisma.backupVersao.create({
          data: {
            cliente_id: cliente.cliente_id,
            bkp_srv_espaco_livre,
            bkp_ultimo_sgerp_cliente,
            bkp_ultimo_sgdfe,
            bkp_local_sgdfe,
            bkp_local_sgerp,
            bkp_ultimo_automatico,
            bkp_tamanho_sgdfe,
            bkp_tamanho_sgerp,
            script_md5,
            script_retorno_update,
            script_ultima_comunicao,
            sgerp_versao_sgerp,
            sgerp_revisao,
            sgerp_compilacao,
            versao_sgdfe,
            cloud,
            cloud_sgdfe,
            cloud_sgerp,
            bkp_seguranca,
            env_cliente,
          },
        });
      }

      reply.send(backupResponse);
    }
  );
}
