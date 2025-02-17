import { prisma } from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function inserirCliente(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/clientes/cliente",
    {
      schema: {
        body: z.object({
          empresa: z
            .string()
            .refine(
              (val) => !isNaN(Number(val)) && Number.isInteger(Number(val)),
              {
                message: "Número deve ser inteiro valido.",
              }
            )
            .transform((val) => parseInt(val)),
          nome_cliente: z.string(),
          cnpj: z.string(),
          cidade: z.string(),
        }),
      },
    },
    async (request, reply) => {
      console.log(request.body);
      const cliente_request = request.body;
      const cidade = await prisma.cidade.findFirst({
        where: {
          cidade_nome: cliente_request.cidade,
        },
        select: {
          cidade_id: true,
        },
      });
      if (!cidade) {
        return { message: "Cidade não encontrada." };
      }

      let cliente_existe = await prisma.cliente.findUnique({
        where: {
          cliente_cnpj_cpf: cliente_request.cnpj,
        },
      });

      if (cliente_existe) {
        return cliente_existe;
      }

      const cliente = await prisma.cliente.create({
        data: {
          cliente_nome: cliente_request.nome_cliente,
          cliente_cnpj_cpf: cliente_request.cnpj,
          razao_social: cliente_request.nome_cliente,
          cidade_id: cidade.cidade_id,
          codigo_sg: cliente_request.empresa,
        },
      });

      reply.send(cliente);
    }
  );
}
