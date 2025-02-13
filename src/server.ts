import fastifyCors from "@fastify/cors";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { updateVersaoPdv } from "./routes/update-versao-pdv";

const app = fastify();

app.register(fastifyCors, {
  origin: "*",
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(updateVersaoPdv);

app.get("/", async (request, reply) => {
  return { hello: "world" };
});

app.listen({ port: 3335, host: "0.0.0.0" }).then(() => {
  console.log("HTTP server running");
});
