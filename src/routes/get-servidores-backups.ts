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
                tags: z.array(
                  z.enum(Object.values(ServidorTags) as [string, ...string[]])
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
        include: { cliente: { include: { cidade: true } } },
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
      const todosServidoresTags = [] as Array<
        (typeof servidores)[number] & { tags: ServidorTags[] }
      >;
      await Promise.all(
        servidores.map(async (servidor) => {
          const statusVersao = await verificarVersao(
            servidor.sgerp_versao_sgerp || "",
            servidor.sgerp_revisao || ""
          );

          if (statusVersao === "Atualizado") {
            totalizadores.qtdAtualizados++;
          } else {
            // keep legacy labels used in frontend if different
            const key =
              statusVersao as unknown as keyof typeof totalizadores.totaisDesatualizados;
            if (key in totalizadores.totaisDesatualizados) {
              (totalizadores.totaisDesatualizados as any)[key]++;
            } else {
              // If it's a different string, try to count under 'DESATUALIZADO_REVISAO' as fallback
              (totalizadores.totaisDesatualizados as any)[
                TipoDesatualizacao.DESATUALIZADO_REVISAO
              ]++;
            }
          }

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

          todosServidoresTags.push({ ...servidor, tags });
        })
      );

      // Apply tag filtering if requested
      let filtrados = todosServidoresTags;
      if (requestedTags.length) {
        // Only keep servers that include all requested tags
        filtrados = todosServidoresTags.filter((s) =>
          requestedTags.every((t) => s.tags.includes(t as ServidorTags))
        );
      }

      // Paginate after filtering
      const servidoresPaginated = paginateArray(filtrados, pageIndex, 10);
      const servidoresResponse = servidoresPaginated.data;
      const totalServidoresFiltrados = filtrados.length;

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
        totalServidores: totalServidores,
        totalServidoresFiltrados: totalServidoresFiltrados,
        qtdAtualizados: totalizadores.qtdAtualizados,
        totaisDesatualizados: totalizadores.totaisDesatualizados,
        totaisErrosServidores: totalizadores.totaisErrosServidores,
      });
    }
  );
}
