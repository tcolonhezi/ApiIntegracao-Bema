import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { FastifyInstance } from "fastify";
import { prisma } from "./../lib/prisma";
import { verificarVersao } from "../services/validarVersoes";

// Definição dos schemas Zod
const PDVDesatualizadoSchema = z.object({
  pdv_numero: z.number(),
  versao: z.string(),
  revisao: z.string(),
  tipo_desatualizacao: z.enum([
    "Desatualizado (Revisão)",
    "Versão não encontrada (Atualizar)",
  ]),
});

type TipoDesatualizacao = z.infer<
  typeof PDVDesatualizadoSchema.shape.tipo_desatualizacao
>;

type PDVDesatualizado = {
  pdv_numero: number;
  versao: string;
  revisao: string;
  tipo_desatualizacao: TipoDesatualizacao;
};

const ClientePDVsStatusSchema = z.object({
  cliente: z.object({
    cliente_id: z.number(),
    cliente_nome: z.string(),
    filial: z.number(),
  }),
  quantidade_pdvs: z.number(),
  quantidade_pdvs_atualizados: z.number(),
  quantidade_pdvs_desatualizados: z.number(),
  pdvs_desatualizados: z.array(PDVDesatualizadoSchema),
  tipos_desatualizacao: z.object({
    "Desatualizado (Revisão)": z.number(),
    "Versão não encontrada (Atualizar)": z.number(),
  }),
});

const PaginatedResponseSchema = z.object({
  data: z.array(ClientePDVsStatusSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

export async function getClientesPdvsStatus(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/clientes/pdvs-status",
    {
      schema: {
        querystring: z
          .object({
            page: z.string().optional().default("1"),
            pageSize: z.string().optional().default("10"),
            filtraClientes: z.string().optional(),
            query: z.string().nullish(),
          })
          .transform((obj) => ({
            page: parseInt(obj.page, 10),
            pageSize: parseInt(obj.pageSize, 10),
            filtraClientes: obj.filtraClientes,
            query: obj.query,
          })),
      },
    },
    async (request, reply) => {
      const { page, pageSize, filtraClientes, query } = request.query;

      // Calcular o offset para paginação
      const skip = (page - 1) * pageSize;

      const clientes = await prisma.cliente.findMany({
        include: {
          VersaoPDV: true,
          BackupVersao: true,
        },
        where: query ? { cliente_nome: { contains: query } } : {},
        orderBy: {
          cliente_id: "asc",
        },
      });

      // Processar cada cliente e seus PDVs
      const clientesProcessados = clientes
        .map((cliente) => {
          const pdvs = cliente.VersaoPDV;
          const pdvsDesatualizados: PDVDesatualizado[] = [];
          let qtdAtualizados = 0;
          const tiposDesatualizacao = {
            "Desatualizado (Revisão)": 0,
            "Versão não encontrada (Atualizar)": 0,
          };

          for (const pdv of pdvs) {
            const statusVersao = verificarVersao(pdv.versao, pdv.revisao);

            if (statusVersao === "Atualizado") {
              qtdAtualizados++;
            } else {
              pdvsDesatualizados.push({
                pdv_numero: pdv.pdv_numero,
                versao: pdv.versao,
                revisao: pdv.revisao,
                tipo_desatualizacao: statusVersao,
              });

              tiposDesatualizacao[statusVersao]++;
            }
          }

          // Montar o objeto para cada cliente
          // caso estiver com filtraCliente preenchido, filtra os clientes que
          // possuem pdv desatualizado
          if (filtraClientes === "sim" && pdvsDesatualizados.length === 0) {
            return;
          }
          return {
            cliente: {
              cliente_id: cliente.cliente_id,
              cliente_nome: cliente.cliente_nome,
              filial: cliente.filial,
            },
            quantidade_pdvs: pdvs.length,
            quantidade_pdvs_atualizados: qtdAtualizados,
            quantidade_pdvs_desatualizados: pdvsDesatualizados.length,
            pdvs_desatualizados: pdvsDesatualizados,
            tipos_desatualizacao: tiposDesatualizacao,
          };
        })
        .filter((item) => item !== undefined);

      // Calcular informações da paginação
      const totalPages = Math.ceil(clientesProcessados.length / pageSize);

      // Montar a resposta com paginação
      const response = {
        data: clientesProcessados, //slice aqui .slice((page - 1) * pageSize, pageSize * page)
        pagination: {
          page,
          pageSize,
          totalItems: clientesProcessados.length,
          totalPages,
        },
      };

      // Validar a resposta com Zod
      const resultado = PaginatedResponseSchema.parse(response);

      return reply.send(resultado);
    }
  );
}
