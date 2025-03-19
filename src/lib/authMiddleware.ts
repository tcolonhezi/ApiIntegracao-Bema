import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import fp from "fastify-plugin";

// Definição dos tokens por nível de acesso
const TOKENS = {
  admin: process.env.TOKEN_API_ADM,
  user: process.env.TOKEN_API,
} as const;

// Tipo para os níveis de acesso
type Role = keyof typeof TOKENS;

// Estender o tipo Request do Fastify para incluir o role
declare module "fastify" {
  interface FastifyRequest {
    userRole?: Role;
  }
}

// Hook de autenticação com verificação de nível
export const createAuthHook = (requiredRole?: Role) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        request.log.warn("Token não fornecido");
        return reply.code(401).send({ error: "Token não fornecido" });
      }

      const [scheme, token] = authHeader.split(" ");

      if (scheme !== "Bearer") {
        request.log.warn("Token mal formatado");
        return reply.code(401).send({ error: "Token mal formatado" });
      }

      // Verifica qual role o token corresponde
      let userRole: Role | undefined;

      if (token === TOKENS.admin) {
        userRole = "admin";
      } else if (token === TOKENS.user) {
        userRole = "user";
      }

      if (!userRole) {
        request.log.warn("Token inválido");
        return reply.code(401).send({ error: "Token inválido" });
      }

      // Salva o role no request para uso posterior
      request.userRole = userRole;

      // Log de sucesso na autenticação
      request.log.info(`Autenticação bem-sucedida para o role: ${userRole}`);

      // Se um nível específico é requerido, verifica se o usuário tem acesso
      if (requiredRole) {
        if (requiredRole === "admin" && userRole !== "admin") {
          request.log.warn("Acesso negado. Requer nível admin.");
          return reply
            .code(403)
            .send({ error: "Acesso negado. Requer nível admin." });
        }
      }
    } catch (error) {
      request.log.error("Erro na autenticação", error);
      return reply.code(401).send({ error: "Erro na autenticação" });
    }
  };
};

// Hooks pré-configurados para cada nível
export const authHooks = {
  any: createAuthHook(), // Aceita qualquer token válido
  admin: createAuthHook("admin"), // Requer token de admin
};

// Plugin para adicionar o decorator de role
export const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest("userRole");
});
