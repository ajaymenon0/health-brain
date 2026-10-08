import dotenv from "dotenv";
import { mcpConfigSchema } from "./config";
import { createMcpHttpServer } from "./server";

dotenv.config({ quiet: true });
const parsed = mcpConfigSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid MCP configuration:", parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  process.exit(1);
}
const config = parsed.data;
const server = createMcpHttpServer(config);
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.listen(config.MCP_PORT, config.MCP_HOST, () => {
  console.log(`Health Brain MCP listening on ${config.MCP_HOST}:${config.MCP_PORT}/mcp`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
