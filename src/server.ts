import fastifyCors from "@fastify/cors";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { updateVersaoPdv } from "./routes/update-versao-pdv";
import { authHooks } from "./lib/authMiddleware";
import { inserirCliente } from "./routes/create-cliente";
import { inserirAlterarMunicipio } from "./routes/upsert-municipio";

const app = fastify();

app.register(fastifyCors, {
  origin: "*",
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(async function (fastify) {
  fastify.addHook("preHandler", authHooks.any);
  fastify.register(updateVersaoPdv);
});

// Rotas que requerem nível admin
app.register(async function (fastify) {
  fastify.addHook("preHandler", authHooks.admin);

  fastify.register(inserirCliente);
  fastify.register(inserirAlterarMunicipio);
});

app.listen({ port: 3335, host: "0.0.0.0" }).then(() => {
  console.log("HTTP server running");
});
