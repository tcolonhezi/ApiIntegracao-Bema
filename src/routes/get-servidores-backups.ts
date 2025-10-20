import { TipoDesatualizacao } from "./../constants/versaoTags";
import { prisma } from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { string, z } from "zod";
import { verificarVersao } from "../services/validarVersoes";
import { calcularDiferencaDias } from "../utils/datas";
import { ServidorTags } from "../constants/servidorTags";
import { paginateArray } from "../services/array";

export async function getServidoresBackups(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/backup/servidores",
    {
      schema: {
        querystring: z.object({
          query: z.string().nullish(),
          pageIndex: z.string().nullish().default("0").transform(Number),
          queryTags: z.string().nullish(),
        }),
        response: {
          200: z.object({
            servidores: z.array(
              z.object({
                cliente_id: z.string(),
                cliente_nome: z.string(),
                cliente_razao_social: z.string(),
                cliente_cnpj_cpf: z.string(),
                bkp_srv_espaco_livre: z.string(),
                bkp_ultimo_sgerp_cliente: z.string(),
                bkp_ultimo_sgdfe: z.string(),
                bkp_local_sgdfe: z.string(),
                bkp_local_sgerp: z.string(),
                bkp_ultimo_automatico: z.string(),
                bkp_tamanho_sgdfe: z.string(),
                bkp_tamanho_sgerp: z.string(),
                script_md5: z.string(),
                script_retorno_update: z.string(),
                script_ultima_comunicao: z.string(),
                sgerp_versao_sgerp: z.string(),
                sgerp_revisao: z.string(),
                sgerp_compilacao: z.string(),
                versao_sgdfe: z.string(),
                cloud: z.string(),
                cloud_sgdfe: z.string(),
                cloud_sgerp: z.string(),
                local_bkp_seguranca: z.string(),
                tamanho_backup_seguranca_sgerp: z.string(),
                tamanho_backup_seguranca_sgdfe: z.string(),
                env_cliente: z.string(),
                tags: z.array(
                  z.enum(Object.values(ServidorTags) as [string, ...string[]])
                ),
              })
            ),
            totalPagina: z.number(),
            totalServidores: z.number(),
            qtdAtualizados: z.number(),
            totaisDesatualizados: z.object({
              [TipoDesatualizacao.DESATUALIZADO_REVISAO]: z.number(),
              [TipoDesatualizacao.DESATUALIZADO_VERSAO]: z.number(),
            }),
            totaisErrosServidores: z.object({
              [ServidorTags.BACKUP_SGDFE_ATRASADO]: z.number(),
              [ServidorTags.BACKUP_SGERP_ATRASADO]: z.number(),
              [ServidorTags.BACKUP_SGERP_CLIENTE_ATRASADO]: z.number(),
              [ServidorTags.ESPACO_BAIXO]: z.number(),
              [ServidorTags.ULTIMA_COMUNICACAO_ATRASADA]: z.number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { query, pageIndex, queryTags } = request.query;

      const [servidoresPaginado, totalServidoresPaginados, servidores] =
        await Promise.all([
          prisma.backupVersao.findMany({
            include: {
              cliente: true,
            },
            where: query
              ? {
                  OR: [
                    {
                      cliente: {
                        cliente_nome: {
                          contains: query,
                        },
                      },
                    },
                    {
                      cliente: {
                        razao_social: {
                          contains: query,
                        },
                      },
                    },
                    {
                      cliente: {
                        cliente_cnpj_cpf: {
                          contains: query,
                        },
                      },
                    },
                  ],
                }
              : {},
            take: 10,
            skip: pageIndex * 10,
            orderBy: {
              cliente: {
                cliente_nome: "asc",
              },
            },
          }),
          prisma.backupVersao.count({
            where: query
              ? {
                  OR: [
                    {
                      cliente: {
                        cliente_nome: {
                          contains: query,
                        },
                      },
                    },
                    {
                      cliente: {
                        razao_social: {
                          contains: query,
                        },
                      },
                    },
                    {
                      cliente: {
                        cliente_cnpj_cpf: {
                          contains: query,
                        },
                      },
                    },
                  ],
                }
              : {},
          }),
          prisma.backupVersao.findMany({
            include: {
              cliente: true,
            },
          }),
        ]);

      const inicializarContadores = <T extends { [key: string]: string }>(
        enumObj: T
      ) =>
        Object.values(enumObj).reduce(
          (acc, tipo) => ({ ...acc, [tipo]: 0 }),
          {} as Record<T[keyof T], number>
        );

      const totalizadores = {
        qtdAtualizados: 0,
        totaisDesatualizados: inicializarContadores(TipoDesatualizacao),
        totaisErrosServidores: inicializarContadores(ServidorTags),
      };

      const todosServidoresTags = await Promise.all(
        servidores.map(async (servidor) => {
          const statusVersao = await verificarVersao(
            servidor.sgerp_versao_sgerp || "",
            servidor.sgerp_revisao || ""
          );

          if (statusVersao === "Atualizado") {
            totalizadores.qtdAtualizados++;
          } else {
            totalizadores.totaisDesatualizados[statusVersao]++;
          }

          const diasLimite = 2;
          let tags: ServidorTags[] = [];
          if (servidor.script_ultima_comunicao) {
            const diff = calcularDiferencaDias(
              servidor.script_ultima_comunicao
            );

            if (diff != null && diff !== 0 && diff > diasLimite) {
              totalizadores.totaisErrosServidores[
                ServidorTags.ULTIMA_COMUNICACAO_ATRASADA
              ]++;
              tags.push(ServidorTags.ULTIMA_COMUNICACAO_ATRASADA);
            }
          }

          if (servidor.bkp_ultimo_sgerp_cliente) {
            const diff = calcularDiferencaDias(
              servidor.bkp_ultimo_sgerp_cliente
            );
            if (diff != null && diff !== 0 && diff > diasLimite) {
              totalizadores.totaisErrosServidores[
                ServidorTags.BACKUP_SGERP_CLIENTE_ATRASADO
              ]++;
              tags.push(ServidorTags.BACKUP_SGERP_CLIENTE_ATRASADO);
            }
          }

          if (servidor.bkp_ultimo_sgdfe) {
            const diff = calcularDiferencaDias(servidor.bkp_ultimo_sgdfe);
            if (diff != null && diff !== 0 && diff > diasLimite) {
              totalizadores.totaisErrosServidores[
                ServidorTags.BACKUP_SGDFE_ATRASADO
              ]++;
              tags.push(ServidorTags.BACKUP_SGDFE_ATRASADO);
            }
          }

          if (servidor.bkp_ultimo_automatico) {
            const diff = calcularDiferencaDias(servidor.bkp_ultimo_automatico);
            if (diff != null && diff !== 0 && diff > diasLimite) {
              totalizadores.totaisErrosServidores[
                ServidorTags.BACKUP_SGERP_ATRASADO
              ]++;
              tags.push(ServidorTags.BACKUP_SGERP_ATRASADO);
            }
          }

          if (servidor.bkp_srv_espaco_livre) {
            if (servidor.bkp_srv_espaco_livre < 100) {
              totalizadores.totaisErrosServidores[ServidorTags.ESPACO_BAIXO]++;
              tags.push(ServidorTags.ESPACO_BAIXO);
            }
          }

          return {
            ...servidor,
            tags,
          };
        })
      );

      //let servidoresResponse = servidoresPaginado;
      //let totalServidores = totalServidoresPaginados;
      let servidoresPaginated = paginateArray(
        todosServidoresTags,
        pageIndex,
        10
      );
      let servidoresResponse = servidoresPaginated.data;
      let totalServidores = servidoresPaginated.total;
      if (queryTags) {
        servidoresResponse = todosServidoresTags.filter((servidor) =>
          servidor.tags.includes(queryTags as ServidorTags)
        );
        totalServidores = servidoresResponse.length;
      }

      const servidoresProcessados = servidoresResponse.map((servidor) => {
        let tags: ServidorTags[] = [];
        const diasLimite = 2;

        if (servidor.script_ultima_comunicao) {
          const diff = calcularDiferencaDias(servidor.script_ultima_comunicao);

          if (diff != null && diff !== 0 && diff > diasLimite)
            tags.push(ServidorTags.ULTIMA_COMUNICACAO_ATRASADA);
        }

        if (servidor.bkp_ultimo_sgerp_cliente) {
          const diff = calcularDiferencaDias(servidor.bkp_ultimo_sgerp_cliente);
          if (diff != null && diff !== 0 && diff > diasLimite)
            tags.push(ServidorTags.BACKUP_SGERP_CLIENTE_ATRASADO);
        }

        if (servidor.bkp_ultimo_sgdfe) {
          const diff = calcularDiferencaDias(servidor.bkp_ultimo_sgdfe);
          if (diff != null && diff !== 0 && diff > diasLimite)
            tags.push(ServidorTags.BACKUP_SGDFE_ATRASADO);
        }

        if (servidor.bkp_ultimo_automatico) {
          const diff = calcularDiferencaDias(servidor.bkp_ultimo_automatico);
          if (diff != null && diff !== 0 && diff > diasLimite)
            tags.push(ServidorTags.BACKUP_SGERP_ATRASADO);
        }

        if (servidor.bkp_srv_espaco_livre) {
          if (servidor.bkp_srv_espaco_livre < 100) {
            tags.push(ServidorTags.ESPACO_BAIXO);
          }
        }

        return {
          ...servidor,
          tags,
        };
      });

      return reply.send({
        servidores: servidoresResponse.map((servidor) => {
          return {
            cliente_id: servidor.cliente.cidade_id.toString(),
            cliente_nome: servidor.cliente.cliente_nome,
            cliente_razao_social: servidor.cliente.razao_social,
            cliente_cnpj_cpf: servidor.cliente.cliente_cnpj_cpf,
            bkp_srv_espaco_livre:
              servidor.bkp_srv_espaco_livre?.toString() || "",
            bkp_ultimo_sgerp_cliente: servidor.bkp_ultimo_sgerp_cliente || "",
            bkp_ultimo_sgdfe: servidor.bkp_ultimo_sgdfe || "",
            bkp_local_sgdfe: servidor.bkp_local_sgdfe || "",
            bkp_local_sgerp: servidor.bkp_local_sgerp || "",
            bkp_ultimo_automatico: servidor.bkp_ultimo_automatico || "",
            bkp_tamanho_sgdfe: servidor.bkp_tamanho_sgdfe || "",
            bkp_tamanho_sgerp: servidor.bkp_tamanho_sgerp || "",
            script_md5: servidor.script_md5 || "",
            script_retorno_update: servidor.script_retorno_update || "",
            script_ultima_comunicao: servidor.script_ultima_comunicao || "",
            sgerp_versao_sgerp: servidor.sgerp_versao_sgerp || "",
            sgerp_revisao: servidor.sgerp_revisao || "",
            sgerp_compilacao: servidor.sgerp_compilacao || "",
            versao_sgdfe: servidor.versao_sgdfe || "",
            cloud: servidor.cloud?.toString() || "",
            cloud_sgdfe: servidor.cloud_sgdfe || "",
            cloud_sgerp: servidor.cloud_sgerp || "",
            local_bkp_seguranca: servidor.local_bkp_seguranca || "",
            tamanho_backup_seguranca_sgerp:
              servidor.tamanho_backup_seguranca_sgerp || "",
            tamanho_backup_seguranca_sgdfe:
              servidor.tamanho_backup_seguranca_sgdfe || "",
            env_cliente: servidor.env_cliente || "",
            tags: servidor.tags,
          };
        }),
        totalPagina: servidoresResponse.length,
        totalServidores: servidores.length,
        qtdAtualizados: totalizadores.qtdAtualizados,
        totaisDesatualizados: totalizadores.totaisDesatualizados,
        totaisErrosServidores: totalizadores.totaisErrosServidores,
      });
    }
  );
}
