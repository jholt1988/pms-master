import Fastify from "fastify";
import { registerRoutes } from "./api/routes";
const app = Fastify({ logger: true });
await registerRoutes(app);
const port = Number(process.env.PORT || 8080);
await app.listen({ port, host: "0.0.0.0" });
