import { prisma } from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function getCliente(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/clientes/:cliente_id",
    {
      schema: {
        params: z.object({
          cliente_id: z.string().transform(Number),
        }),
        response: {
          200: z.object({
            cliente: z.object({
              cliente_id: z.number(),
              cliente_nome: z.string(),
              cliente_cnpj_cpf: z.string(),
              filial: z.number(),
              cidade: z.string(),
              codigo_sg: z.number(),
              razao_social: z.string(),
              versao_pdvs: z.array(
                z.object({
                  pdv_numero: z.number(),
                  revisao: z.string(),
                  data_compilacao: z.string(),
                  versao: z.string(),
                  sistema_op: z.string(),
                  ultima_abertura: z.string().nullish(),
                  ultimo_fechamento: z.string().nullish(),
                })
              ),
            }),
          }),
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { cliente_id } = request.params;

      const cliente = await prisma.cliente.findFirst({
        where: {
          cliente_id,
        },
        select: {
          cliente_id: true,
          cliente_nome: true,
          cliente_cnpj_cpf: true,
          filial: true,
          cidade: true,
          codigo_sg: true,
          razao_social: true,
          VersaoPDV: true,
        },
      });

      if (!cliente) {
        reply.status(404).send({ message: "Cliente não encontrado" });
        return;
      }

      const clienteResponse = {
        cliente: {
          cliente_id: cliente.cliente_id,
          cliente_nome: cliente.cliente_nome,
          cliente_cnpj_cpf: cliente.cliente_cnpj_cpf,
          filial: cliente.filial,
          cidade: cliente.cidade.cidade_nome,
          codigo_sg: cliente.codigo_sg,
          razao_social: cliente.razao_social,
          versao_pdvs: cliente.VersaoPDV.map((versao) => ({
            pdv_numero: versao.pdv_numero,
            revisao: versao.revisao,
            data_compilacao: versao.data_compilacao,
            versao: versao.versao,
            sistema_op: versao.sistema_op,
            ultima_abertura: versao.ultima_abertura,
            ultimo_fechamento: versao.ultimo_fechamento,
          })),
        },
      };

      return reply.send(clienteResponse);
    }
  );
}
