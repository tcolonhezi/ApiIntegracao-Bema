import { prisma } from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function inserirAlterarMunicipio(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/municipios/municipio",
    {
      schema: {
        body: z.object({
          cidade_nome: z.string(),
        }),
      },
    },
    async (request, reply) => {
      console.log(request.body);
      const { cidade_nome } = request.body;
      let cidade = await prisma.cidade.findFirst({
        select: {
          cidade_id: true,
          cidade_nome: true,
        },
        where: {
          cidade_nome: cidade_nome,
        },
      });
      if (!cidade) {
        cidade = await prisma.cidade.create({
          data: {
            cidade_nome,
          },
        });
      } else {
        return cidade;
      }
      return cidade;
    }
  );
}
