import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import fp from "fastify-plugin";

// Hook de autenticação
export const authHook = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  console.log(request.headers);
  const TOKEN = process.env.TOKEN_API;

  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.code(401).send({ error: "Token não fornecido" });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer") {
      return reply.code(401).send({ error: "Token mal formatado" });
    }

    if (token !== TOKEN) {
      return reply.code(401).send({ error: "Token inválido" });
    }
  } catch (error) {
    return reply.code(401).send({ error: "Erro na autenticação" });
  }
};

// Plugin para registrar o hook globalmente se necessário
export const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addHook("preHandler", authHook);
});
