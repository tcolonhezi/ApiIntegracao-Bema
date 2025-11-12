import { TipoDesatualizacao } from "./../constants/versaoTags";
import { prisma } from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { string, z } from "zod";
import {
  verificarVersao,
  versaoSGDFEEstaDesatualizada,
} from "../services/validarVersoes";
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
          // queryTags can be a single tag, comma separated tags or a JSON array string
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
                filiais: z.array(
                  z.object({
                    filial_id: z.string(),
                    filial_numero: z.number(),
                    total: z.number(),
                    atualizados: z.number(),
                    desatualizados: z.number(),
                  })
                ),
                pdv_servidor: z.object({
                  total: z.number(),
                  atualizados: z.number(),
                  desatualizados: z.number(),
                }),
                tags: z.array(
                  z.enum(Object.values(ServidorTags) as [string, ...string[]])
                ),
                tagsAtualizacao: z.array(
                  z.enum(
                    Object.values(TipoDesatualizacao) as [string, ...string[]]
                  )
                ),
              })
            ),
            totalPagina: z.number(),
            totalServidores: z.number(),
            totalServidoresFiltrados: z.number(),
            qtdAtualizados: z.number(),
            totaisDesatualizados: z.object({
              [TipoDesatualizacao.DESATUALIZADO_REVISAO]: z.number(),
              [TipoDesatualizacao.DESATUALIZADO_VERSAO]: z.number(),
              [TipoDesatualizacao.DESATUALIZADO_SGDFE]: z.number(),
              [TipoDesatualizacao.ATUALIZADO]: z.number(),
              [TipoDesatualizacao.ATUALIZADO_SGDFE]: z.number(),
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

      // Parse queryTags: accept comma-separated, JSON array string, or single value
      const parseQueryTags = (qt?: string | null) => {
        if (!qt) return [] as string[];
        try {
          const trimmed = qt.trim();
          if (
            (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
            trimmed.includes("\\")
          ) {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.map(String);
          }
        } catch (e) {
          // ignore json parse errors
        }
        return qt
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      };

      const requestedTags = parseQueryTags(queryTags);

      // Build base where clause for query text (searches cliente_nome, razao_social, cliente_cnpj_cpf and cidade_nome)
      const baseWhere = query
        ? {
            OR: [
              { cliente: { cliente_nome: { contains: query } } },
              { cliente: { razao_social: { contains: query } } },
              { cliente: { cliente_cnpj_cpf: { contains: query } } },
              { cliente: { cidade: { cidade_nome: { contains: query } } } },
            ],
          }
        : {};

      const getServidores = prisma.backupVersao.findMany({
        include: {
          cliente: {
            include: {
              cidade: true,
              VersaoPDV: true,
              filiais: { include: { VersaoPDV: true } },
            },
          },
        },
        where: baseWhere,
        orderBy: { cliente: { cliente_nome: "asc" } },
      });

      const countTotal = prisma.backupVersao.count(); // SEM 'where'

      const [servidores, totalServidores] = await Promise.all([
        getServidores,
        countTotal,
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

      // Compute tags and totals in a single pass
      const todosServidoresTags = await Promise.all(
        servidores.map(async (servidor) => {
          const statusVersao = await verificarVersao(
            servidor.sgerp_versao_sgerp || "",
            servidor.sgerp_revisao || ""
          );

          const statusVersaoSGDFE = versaoSGDFEEstaDesatualizada(
            servidor.versao_sgdfe?.split("-")[0] || "0.0.0",
            "2.13.1"
          );

          const tagsAtualizacao: TipoDesatualizacao[] = [];

          if (statusVersao === "Atualizado") {
            tagsAtualizacao.push(TipoDesatualizacao.ATUALIZADO);
            totalizadores.qtdAtualizados++;
          } else {
            // keep legacy labels used in frontend if different
            const key =
              statusVersao as unknown as keyof typeof totalizadores.totaisDesatualizados;
            if (key in totalizadores.totaisDesatualizados) {
              tagsAtualizacao.push(TipoDesatualizacao.DESATUALIZADO_VERSAO);
              (totalizadores.totaisDesatualizados as any)[key]++;
            } else {
              // If it's a different string, try to count under 'DESATUALIZADO_REVISAO' as fallback
              tagsAtualizacao.push(TipoDesatualizacao.DESATUALIZADO_REVISAO);
              (totalizadores.totaisDesatualizados as any)[
                TipoDesatualizacao.DESATUALIZADO_REVISAO
              ]++;
            }
          }

          if (statusVersaoSGDFE) {
            totalizadores.totaisDesatualizados["Versão SGDFE desatualizada"]++;
            tagsAtualizacao.push(TipoDesatualizacao.DESATUALIZADO_SGDFE);
          } else {
            totalizadores.totaisDesatualizados["Versão SGDFE atualizada"]++;
            tagsAtualizacao.push(TipoDesatualizacao.ATUALIZADO_SGDFE);
          }

          // --- Novo: calcular resumo por filial (total / atualizados / desatualizados)
          // As filiais vêm com VersaoPDV aninhado. Para cada PDV usamos a mesma
          // função `verificarVersao` já disponível para determinar se está
          // atualizado. Mantemos a verificação simples e assincrona.
          const filiaisResumo = await Promise.all(
            (servidor.cliente.filiais || []).map(async (filial) => {
              const pdvs = (filial.VersaoPDV || []).filter(
                (p: any) => p && (p.ativo === undefined || p.ativo === true)
              );

              let atualizadosCount = 0;
              for (const pdv of pdvs) {
                try {
                  const statusPdv = await verificarVersao(
                    pdv.versao || "",
                    pdv.revisao || ""
                  );
                  if (statusPdv === "Atualizado") atualizadosCount++;
                } catch (e) {
                  // Se ocorrer erro na verificação de versão de um PDV,
                  // consideramos como desatualizado (defensivo) e seguimos.
                }
              }

              return {
                filial_id: String(filial.cliente_id || ""),
                filial_numero: filial.filial,
                total: pdvs.length,
                atualizados: atualizadosCount,
                desatualizados: pdvs.length - atualizadosCount,
              };
            })
          );

          // --- Novo: calcular resumo dos PDVs do próprio cliente/servidor
          const servidorPdvs = (servidor.cliente.VersaoPDV || []).filter(
            (p: any) => p && (p.ativo === undefined || p.ativo === true)
          );

          let servidorAtualizados = 0;
          for (const pdv of servidorPdvs) {
            try {
              const statusPdv = await verificarVersao(
                pdv.versao || "",
                pdv.revisao || ""
              );
              if (statusPdv === "Atualizado") servidorAtualizados++;
            } catch (e) {
              // em caso de erro na verificação, consideramos desatualizado (defensivo)
            }
          }

          const pdvResumo = {
            total: servidorPdvs.length,
            atualizados: servidorAtualizados,
            desatualizados: servidorPdvs.length - servidorAtualizados,
          };

          const diasLimite = 2;
          const tags: ServidorTags[] = [];

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

          if (servidor.bkp_srv_espaco_livre != null) {
            if (servidor.bkp_srv_espaco_livre < 100) {
              totalizadores.totaisErrosServidores[ServidorTags.ESPACO_BAIXO]++;
              tags.push(ServidorTags.ESPACO_BAIXO);
            }
          }

          // Retorna o servidor processado. Usar Promise.all sobre o map
          // garante que a ordem do array resultante corresponda à ordem
          // dos servidores retornados pelo banco de dados.
          return {
            ...servidor,
            tags,
            tagsAtualizacao,
            filiaisResumo,
            pdv_servidor: pdvResumo,
          };
        })
      );

      // Apply tag filtering if requested: match requested tags against both
      // normal server tags (`tags`) and update/version tags (`tagsAtualizacao`).
      // Keep servers that include ALL requested tags in at least one of the two arrays.
      let filtrados = todosServidoresTags;
      if (requestedTags.length) {
        filtrados = todosServidoresTags.filter((s) =>
          requestedTags.every(
            (t) =>
              (s.tags && s.tags.includes(t as ServidorTags)) ||
              (s.tagsAtualizacao &&
                s.tagsAtualizacao.includes(t as unknown as TipoDesatualizacao))
          )
        );
      }

      // Paginate after filtering
      const servidoresPaginated = paginateArray(filtrados, pageIndex, 100);
      const servidoresResponse = servidoresPaginated.data;
      const totalServidoresFiltrados = filtrados.length;

      return reply.send({
        servidores: servidoresResponse.map((servidor) => {
          return {
            cliente_id: servidor.cliente.cliente_id.toString(),
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
            filiais: servidor.filiaisResumo || [],
            pdv_servidor: servidor.pdv_servidor || "",
            tags: servidor.tags,
            tagsAtualizacao: servidor.tagsAtualizacao,
          };
        }),
        totalPagina: servidoresResponse.length,
        totalServidores: totalServidores,
        totalServidoresFiltrados: totalServidoresFiltrados,
        qtdAtualizados: totalizadores.qtdAtualizados,
        totaisDesatualizados: totalizadores.totaisDesatualizados,
        totaisErrosServidores: totalizadores.totaisErrosServidores,
      });
    }
  );
}
