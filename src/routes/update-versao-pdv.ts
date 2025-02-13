import { VersaoPDV } from "./../../node_modules/.prisma/client/index.d";
import { prisma } from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function updateVersaoPdv(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/pdvs/",
    {
      schema: {
        body: z.object({
          Numero: z.number(),
          Versao: z.string(),
          Revisao: z.string(),
          Datacomp: z.string(),
          Versaoso: z.string(),
        }),
        params: z.object({
          cnpj: z.string(),
        }),
      },
    },
    async (request, reply) => {
      console.log(request.body);
      const { cnpj } = request.params;
      const { Numero, Versao, Revisao, Datacomp, Versaoso } = request.body;

      const cliente = await prisma.cliente.findUnique({
        where: {
          cliente_cnpj_cpf: cnpj,
        },
      });

      if (!cliente) {
        reply.status(404).send({ message: "Cliente não encontrado" });
      } else {
        const pdv = await prisma.versaoPDV.upsert({
          where: {
            cliente_id: cliente.cliente_id,
            pdv_numero: Numero,
          },
          update: {
            versao: Versao,
            revisao: Revisao,
            data_compilacao: Datacomp,
            sistema_op: Versaoso,
          },
          create: {
            cliente_id: cliente.cliente_id,
            pdv_numero: Numero,
            versao: Versao,
            revisao: Revisao,
            data_compilacao: Datacomp,
            sistema_op: Versaoso,
          },
        });
        return pdv;
      }
    }
  );
}
