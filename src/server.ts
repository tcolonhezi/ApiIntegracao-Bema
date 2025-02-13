import fastifyCors from "@fastify/cors";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { updateVersaoPdv } from "./routes/update-versao-pdv";
import { authHook } from "./lib/authMiddleware";

const app = fastify();

app.register(fastifyCors, {
  origin: "*",
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Registre as rotas protegidas com o hook de autenticação
app.register(async function (fastify) {
  // Aplica o hook apenas nas rotas dentro deste contexto
  fastify.addHook("preHandler", authHook);
  // Suas rotas protegidas aqui
  fastify.register(updateVersaoPdv);
});

app.listen({ port: 3335, host: "0.0.0.0" }).then(() => {
  console.log("HTTP server running");
});
