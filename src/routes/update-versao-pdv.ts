import { VersaoPDV } from "./../../node_modules/.prisma/client/index.d";
import { prisma } from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function updateVersaoPdv(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/pdvs/versaopdvs",
    {
      schema: {
        body: z.array(
          z.object({
            Numero: z
              .string()
              .refine(
                (val) => !isNaN(Number(val)) && Number.isInteger(Number(val)),
                {
                  message: "Número deve ser inteiro valido.",
                }
              )
              .transform((val) => parseInt(val)),
            Cnpj: z.string(),
            Versao: z.string(),
            Datainativ: z.string(),
            Revisao: z.string(),
            Datacomp: z.string(),
            Versaoso: z.string(),
            Dataaberto: z.string().optional(),
          })
        ),
      },
    },
    async (request, reply) => {
      console.log(request.body);
      const pdvs = request.body;
      const updatedPdvs = await Promise.all(
        pdvs.map(
          async ({
            Numero,
            Versao,
            Revisao,
            Datacomp,
            Versaoso,
            Cnpj,
            Datainativ,
            Dataaberto,
          }) => {
            if (Datainativ == "") {
              const cliente = await prisma.cliente.findUnique({
                where: {
                  cliente_cnpj_cpf: Cnpj,
                },
              });

              if (!cliente) {
                reply.status(404).send({ message: "Cliente não encontrado" });
                return null;
              } else {
                const pdv = await prisma.versaoPDV.upsert({
                  where: {
                    pdv_numero_cliente_id: {
                      pdv_numero: Numero,
                      cliente_id: cliente.cliente_id,
                    },
                  },
                  update: {
                    versao: Versao,
                    revisao: Revisao,
                    data_compilacao: Datacomp,
                    sistema_op: Versaoso,
                    ultima_abertura: Dataaberto,
                  },
                  create: {
                    pdv_numero: Numero,
                    versao: Versao,
                    revisao: Revisao,
                    data_compilacao: Datacomp,
                    sistema_op: Versaoso,
                    cliente_id: cliente.cliente_id,
                    ultima_abertura: Dataaberto,
                  },
                });
                return pdv;
              }
            } else {
              console.log(
                "Ignorando PDV " + Numero + " Inativado em:" + Datainativ
              );
            }
          }
        )
      );
      reply.send(updatedPdvs);
    }
  );
}
