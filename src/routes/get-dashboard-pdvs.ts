import { z } from "zod";
import { FastifyInstance } from "fastify";
import { prisma } from "./../lib/prisma";

// Tipos para garantir a correta tipagem do TypeScript
type TipoDesatualizacao =
  | "Desatualizado (Revisão)"
  | "Versão não encontrada (Atualizar)";

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
  por_cliente: z
    .array(
      z.object({
        cliente_id: z.number(),
        nome: z.string(),
        total_pdvs: z.number(),
        atualizados: z.number(),
        desatualizados: z.number(),
        percentual_atualizados: z.number(),
      })
    )
    .optional(),
});

// Lista de versões conforme fornecido
const versoes = [
  { data: "OK-17/05/2025", revisao: 31161 },
  { data: "OK-14/06/2024", revisao: 31160 },
  { data: "OK-09/08/2024", revisao: 31159 },
  { data: "OK-04/10/2024", revisao: 31158 },
];

function verificarVersao(
  versao: string,
  revisao: string
): "Atualizado" | TipoDesatualizacao {
  const versaoEncontrada = versoes.find((v) => v.data === versao);

  if (versaoEncontrada) {
    return Number(revisao) >= versaoEncontrada.revisao
      ? "Atualizado"
      : "Desatualizado (Revisão)";
  }
  return "Versão não encontrada (Atualizar)";
}

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

      // Dados por cliente para o dashboard detalhado
      const clientesStats = clientes.map((cliente) => {
        const pdvs = cliente.VersaoPDV;
        let atualizados = 0;
        let desatualizadosRevisao = 0;
        let desatualizadosVersao = 0;

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
