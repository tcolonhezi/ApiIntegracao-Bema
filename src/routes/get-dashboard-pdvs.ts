import { z } from "zod";
import { FastifyInstance } from "fastify";
import { prisma } from "./../lib/prisma";
import { verificarVersao } from "../services/validarVersoes";
// Tipos para garantir a correta tipagem do TypeScript

// Schema Zod para o dashboard
const DashboardSchema = z.object({
  total_pdvs: z.number(),
  atualizados: z.object({
    quantidade: z.number(),
    percentual: z.number(),
  }),
  desatualizados_revisao: z.object({
    quantidade: z.number(),
    percentual: z.number(),
  }),
  desatualizados_versao: z.object({
    quantidade: z.number(),
    percentual: z.number(),
  }),
  distro_linux: z.object({
    qtd_centos6: z.number(),
    qtd_centos7: z.number(),
    qtd_ubuntu16: z.number(),
    qtd_ubuntu20: z.number(),
  }),
  por_cliente: z
    .array(
      z.object({
        cliente_id: z.number(),
        nome: z.string(),
        total_pdvs: z.number(),
        atualizados: z.number(),
        desatualizados: z.number(),
        percentual_atualizados: z.number(),
        qtd_centos6: z.number(),
        qtd_centos7: z.number(),
        qtd_ubuntu16: z.number(),
        qtd_ubuntu20: z.number(),
      })
    )
    .optional(),
});

export async function getDashboardPdv(app: FastifyInstance) {
  app.get(
    "/dashboardPdvs",
    {
      schema: {
        querystring: z.object({
          incluir_clientes: z.enum(["sim", "nao"]).optional().default("nao"),
        }),
      },
    },
    async (request, reply) => {
      const { incluir_clientes } = request.query as {
        incluir_clientes: "sim" | "nao";
      };

      // Buscar todos os clientes com seus PDVs
      const clientes = await prisma.cliente.findMany({
        include: {
          VersaoPDV: true,
        },
      });

      // Inicializar contadores
      let totalPDVs = 0;
      let totalAtualizados = 0;
      let totalDesatualizadosRevisao = 0;
      let totalDesatualizadosVersao = 0;
      let total_qtd_centos6 = 0;
      let total_qtd_centos7 = 0;
      let total_qtd_ubuntu16 = 0;
      let total_qtd_ubuntu20 = 0;

      // Dados por cliente para o dashboard detalhado
      const clientesStats = clientes.map((cliente) => {
        const pdvs = cliente.VersaoPDV;
        let atualizados = 0;
        let desatualizadosRevisao = 0;
        let desatualizadosVersao = 0;
        let qtd_centos6 = 0;
        let qtd_centos7 = 0;
        let qtd_ubuntu16 = 0;
        let qtd_ubuntu20 = 0;

        // Processar cada PDV do cliente
        for (const pdv of pdvs) {
          const statusVersao = verificarVersao(pdv.versao, pdv.revisao);

          if (statusVersao === "Atualizado") {
            atualizados++;
            totalAtualizados++;
          } else if (statusVersao === "Desatualizado (Revisão)") {
            desatualizadosRevisao++;
            totalDesatualizadosRevisao++;
          } else {
            desatualizadosVersao++;
            totalDesatualizadosVersao++;
          }
          if (
            pdv.sistema_op
              .toLowerCase()
              .includes("CentOS release 6.6".toLocaleLowerCase())
          ) {
            qtd_centos6++;
            total_qtd_centos6++;
          } else if (
            pdv.sistema_op
              .toLowerCase()
              .includes("CentOS Linux release 7".toLocaleLowerCase())
          ) {
            qtd_centos7++;
            total_qtd_centos7++;
          } else if (
            pdv.sistema_op
              .toLowerCase()
              .includes("Ubuntu 16.04".toLocaleLowerCase())
          ) {
            qtd_ubuntu16++;
            total_qtd_ubuntu16++;
          } else if (
            pdv.sistema_op
              .toLowerCase()
              .includes("Ubuntu 20.04".toLocaleLowerCase())
          ) {
            qtd_ubuntu20++;
            total_qtd_ubuntu20++;
          }
        }

        // Incrementar o contador total
        totalPDVs += pdvs.length;

        // Retornar estatísticas para este cliente
        return {
          cliente_id: cliente.cliente_id,
          nome: cliente.cliente_nome,
          total_pdvs: pdvs.length,
          atualizados,
          desatualizados: desatualizadosRevisao + desatualizadosVersao,
          percentual_atualizados:
            pdvs.length > 0 ? (atualizados / pdvs.length) * 100 : 0,
          qtd_centos6,
          qtd_centos7,
          qtd_ubuntu16,
          qtd_ubuntu20,
        };
      });

      // Calcular percentuais
      const percentualAtualizados =
        totalPDVs > 0 ? (totalAtualizados / totalPDVs) * 100 : 0;
      const percentualDesatualizadosRevisao =
        totalPDVs > 0 ? (totalDesatualizadosRevisao / totalPDVs) * 100 : 0;
      const percentualDesatualizadosVersao =
        totalPDVs > 0 ? (totalDesatualizadosVersao / totalPDVs) * 100 : 0;

      // Construir resposta
      const response = {
        total_pdvs: totalPDVs,
        atualizados: {
          quantidade: totalAtualizados,
          percentual: Number(percentualAtualizados.toFixed(1)),
        },
        desatualizados_revisao: {
          quantidade: totalDesatualizadosRevisao,
          percentual: Number(percentualDesatualizadosRevisao.toFixed(1)),
        },
        desatualizados_versao: {
          quantidade: totalDesatualizadosVersao,
          percentual: Number(percentualDesatualizadosVersao.toFixed(1)),
        },
        distro_linux: {
          qtd_centos6: total_qtd_centos6,
          qtd_centos7: total_qtd_centos7,
          qtd_ubuntu16: total_qtd_ubuntu16,
          qtd_ubuntu20: total_qtd_ubuntu20,
        },
      };

      // Adicionar dados por cliente se solicitado
      if (incluir_clientes === "sim") {
        Object.assign(response, {
          por_cliente: clientesStats.map((client) => ({
            ...client,
            percentual_atualizados: Number(
              client.percentual_atualizados.toFixed(1)
            ),
          })),
        });
      }

      // Validar a resposta com Zod
      const resultado = DashboardSchema.parse(response);

      return reply.send(resultado);
    }
  );
}
