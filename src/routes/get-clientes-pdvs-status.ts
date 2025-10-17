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
    cidade: z.string(),
  }),
  quantidade_pdvs: z.number(),
  quantidade_pdvs_atualizados: z.number(),
  quantidade_pdvs_desatualizados: z.number(),
  pdvs_desatualizados: z.array(PDVDesatualizadoSchema),
  tipos_desatualizacao: z.object({
    "Desatualizado (Revisão)": z.number(),
    "Versão não encontrada (Atualizar)": z.number(),
  }),
  distro_linux: z.object({
    qtd_centos6: z.number(),
    qtd_centos7: z.number(),
    qtd_ubuntu16: z.number(),
    qtd_ubuntu20: z.number(),
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
            "filtraDistro[centos6]": z.string().optional(),
            "filtraDistro[centos7]": z.string().optional(),
            "filtraDistro[ubuntu16]": z.string().optional(),
            "filtraDistro[ubuntu20]": z.string().optional(),
          })
          .transform((obj) => ({
            page: parseInt(obj.page, 10),
            pageSize: parseInt(obj.pageSize, 10),
            filtraClientes: obj.filtraClientes,
            query: obj.query,
            filtraDistro: {
              centos6: obj["filtraDistro[centos6]"] === "true",
              centos7: obj["filtraDistro[centos7]"] === "true",
              ubuntu16: obj["filtraDistro[ubuntu16]"] === "true",
              ubuntu20: obj["filtraDistro[ubuntu20]"] === "true",
            },
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
          cidade: true,
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
          let total_qtd_centos6 = 0;
          let total_qtd_centos7 = 0;
          let total_qtd_ubuntu16 = 0;
          let total_qtd_ubuntu20 = 0;

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

            if (
              pdv.sistema_op
                .toLowerCase()
                .includes("CentOS release 6.6".toLocaleLowerCase())
            ) {
              total_qtd_centos6++;
            } else if (
              pdv.sistema_op
                .toLowerCase()
                .includes("CentOS Linux release 7".toLocaleLowerCase())
            ) {
              total_qtd_centos7++;
            } else if (
              pdv.sistema_op
                .toLowerCase()
                .includes("Ubuntu 16.04".toLocaleLowerCase())
            ) {
              total_qtd_ubuntu16++;
            } else if (
              pdv.sistema_op
                .toLowerCase()
                .includes("Ubuntu 20.04".toLocaleLowerCase())
            ) {
              total_qtd_ubuntu20++;
            }
          }

          // Montar o objeto para cada cliente
          // caso estiver com filtraCliente preenchido, filtra os clientes que
          // possuem pdv desatualizado
          if (filtraClientes === "sim" && pdvsDesatualizados.length === 0) {
            return;
          }
          const clienteProcessado = {
            cliente: {
              cliente_id: cliente.cliente_id,
              cliente_nome: cliente.cliente_nome,
              filial: cliente.filial,
              cidade: cliente.cidade.cidade_nome,
            },
            quantidade_pdvs: pdvs.length,
            quantidade_pdvs_atualizados: qtdAtualizados,
            quantidade_pdvs_desatualizados: pdvsDesatualizados.length,
            pdvs_desatualizados: pdvsDesatualizados,
            tipos_desatualizacao: tiposDesatualizacao,
            distro_linux: {
              qtd_centos6: total_qtd_centos6,
              qtd_centos7: total_qtd_centos7,
              qtd_ubuntu16: total_qtd_ubuntu16,
              qtd_ubuntu20: total_qtd_ubuntu20,
            },
          };

          return aplicarFiltros(
            clienteProcessado,
            filtraClientes,
            request.query.filtraDistro
          )
            ? clienteProcessado
            : undefined;
        })
        .filter((item) => item !== undefined);

      // Aplicar filtros adicionais
      const clientesFiltrados = clientesProcessados.filter((cliente) =>
        aplicarFiltros(cliente, filtraClientes, request.query.filtraDistro)
      );

      // Calcular informações da paginação
      const totalPages = Math.ceil(clientesFiltrados.length / pageSize);

      // Montar a resposta com paginação
      const response = {
        data: clientesFiltrados, //slice aqui .slice((page - 1) * pageSize, pageSize * page)
        pagination: {
          page,
          pageSize,
          totalItems: clientesFiltrados.length,
          totalPages,
        },
      };

      // Validar a resposta com Zod
      const resultado = PaginatedResponseSchema.parse(response);

      return reply.send(resultado);
    }
  );
}

const aplicarFiltros = (
  cliente: any,
  filtraClientes?: string,
  filtraDistro?: {
    centos6?: boolean;
    centos7?: boolean;
    ubuntu16?: boolean;
    ubuntu20?: boolean;
  }
) => {
  // Filtro de clientes desatualizados
  if (
    filtraClientes === "sim" &&
    cliente.quantidade_pdvs_desatualizados === 0
  ) {
    return false;
  }

  // Filtro por distribuição
  if (filtraDistro) {
    const { distro_linux } = cliente;

    // Add debug logging
    console.log("Applying distro filters:", {
      filtraDistro,
      clienteDistro: distro_linux,
    });

    const hasActiveFilter = Object.values(filtraDistro).some(
      (value) => value === true
    );

    if (hasActiveFilter) {
      const matchesFilter =
        (filtraDistro.centos6 && distro_linux.qtd_centos6 > 0) ||
        (filtraDistro.centos7 && distro_linux.qtd_centos7 > 0) ||
        (filtraDistro.ubuntu16 && distro_linux.qtd_ubuntu16 > 0) ||
        (filtraDistro.ubuntu20 && distro_linux.qtd_ubuntu20 > 0);
      return matchesFilter;
    }
  }

  return true;
};
