import { prisma } from "./../lib/prisma";
import { fastify, FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { string, z } from "zod";
export async function getClientes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/clientes",
    {
      schema: {
        querystring: z.object({
          query: z.string().nullish(),
          pageIndex: z.string().nullish().default("0").transform(Number),
        }),
        response: {
          200: z.object({
            clientes: z.array(
              z.object({
                cliente_id: z.number(),
                cliente_nome: z.string(),
                cliente_cnpj_cpf: z.string(),
                filial: z.number(),
                cidade: z.string(),
                codigo_sg: z.number(),
                razao_social: z.string(),
              })
            ),
            total: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { query, pageIndex } = request.query;

      const [clientes, totalClientes] = await Promise.all([
        prisma.cliente.findMany({
          select: {
            cliente_id: true,
            cliente_nome: true,
            cliente_cnpj_cpf: true,
            filial: true,
            cidade: true,
            codigo_sg: true,
            razao_social: true,
          },
          where: query
            ? {
                OR: [
                  {
                    cliente_nome: {
                      contains: query,
                    },
                  },
                  {
                    razao_social: {
                      contains: query,
                    },
                  },
                  {
                    cliente_cnpj_cpf: {
                      contains: query,
                    },
                  },
                ],
              }
            : {},
          take: 10,
          skip: pageIndex * 10,
          orderBy: {
            cliente_nome: "asc",
          },
        }),
        prisma.cliente.count({
          where: query
            ? {
                OR: [
                  {
                    cliente_nome: {
                      contains: query,
                    },
                  },
                  {
                    razao_social: {
                      contains: query,
                    },
                  },
                  {
                    cliente_cnpj_cpf: {
                      contains: query,
                    },
                  },
                ],
              }
            : {},
        }),
      ]);

      return reply.send({
        clientes: clientes.map((cliente) => {
          return {
            cliente_id: cliente.cliente_id,
            cliente_nome: cliente.cliente_nome,
            cliente_cnpj_cpf: cliente.cliente_cnpj_cpf,
            filial: cliente.filial,
            cidade: cliente.cidade.cidade_nome,
            codigo_sg: cliente.codigo_sg,
            razao_social: cliente.razao_social,
          };
        }),
        total: totalClientes,
      });
    }
  );
}
