import { prisma } from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function versaoSistemaRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/versao-sistema",
    {
      schema: {
        body: z.object({
          versao_data: z.string(),
          versao_revisao: z.string(),
        }),
      },
    },
    async (request) => {
      const { versao_data, versao_revisao } = request.body;

      let versao = await prisma.versao_sistema.findFirst({
        select: {
          versao_id: true,
          versao_data: true,
          versao_revisao: true,
        },
        where: {
          versao_data: versao_data,
        },
      });
      if (!versao) {
        versao = await prisma.versao_sistema.create({
          data: {
            versao_data,
            versao_revisao,
          },
        });
      } else {
        return versao;
      }
      return versao;
    }
  );
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/versao-sistema/:versaoid",
    {
      schema: {
        params: z.object({
          versaoid: z.string().transform((val) => parseInt(val)),
        }),
      },
    },
    async (request, reply) => {
      const { versaoid } = request.params;
      let versao = await prisma.versao_sistema.findFirst({
        select: {
          versao_id: true,
          versao_data: true,
          versao_revisao: true,
        },
        where: {
          versao_id: versaoid,
        },
      });
      if (versao) {
        await prisma.versao_sistema.delete({
          where: {
            versao_id: versao.versao_id,
          },
        });
        return { message: "Versão deletada com sucesso." };
      } else {
        reply.status(404).send({ message: "Versão não encontrados" });
      }
    }
  );
  app.withTypeProvider<ZodTypeProvider>().get(
    "/versao-sistema",
    {
      schema: {
        response: {
          200: z.object({
            versoes_sistema: z.array(
              z.object({
                versao_id: z.number(),
                versao_data: z.string(),
                versao_revisao: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const versoes = await prisma.versao_sistema.findMany();
      return { versoes_sistema: versoes };
    }
  );
}
