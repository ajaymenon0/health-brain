import http from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { McpConfig } from "./config";
import { createTokenVerifier } from "./auth";
import { HealthData } from "./data";
import { createHealthMcp } from "./tools";

export function createMcpHttpServer(config: McpConfig, options: { data?: HealthData; verify?: (authorization: string | undefined) => Promise<void> } = {}) {
  const data = options.data ?? new HealthData(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, config.MCP_TELEGRAM_USER_ID);
  const verify = options.verify ?? createTokenVerifier(config);
  const publicOrigin = new URL(config.MCP_PUBLIC_URL).origin;
  const metadataUrl = `${publicOrigin}/.well-known/oauth-protected-resource/mcp`;
  const json = (res: http.ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };
  return http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
      if (req.headers.origin && req.headers.origin !== publicOrigin) {
        json(res, 403, { error: "Origin not allowed" }); return;
      }
      if (req.method === "GET" && pathname === "/healthz") {
        json(res, 200, { status: "ok" }); return;
      }
      if (req.method === "GET" && ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"].includes(pathname)) {
        json(res, 200, { resource: config.MCP_PUBLIC_URL, authorization_servers: [config.MCP_OAUTH_ISSUER], scopes_supported: ["health:read"], bearer_methods_supported: ["header"] }); return;
      }
      if (pathname !== "/mcp") { json(res, 404, { error: "Not found" }); return; }
      try { await verify(req.headers.authorization); }
      catch {
        res.setHeader("WWW-Authenticate", `Bearer resource_metadata="${metadataUrl}", scope="health:read"`);
        json(res, 401, { error: "Unauthorized" }); return;
      }
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        json(res, 405, { error: "This stateless MCP endpoint accepts POST only" }); return;
      }
      // Bound JSON requests before handing them to the SDK. No user-selected SQL or identity.
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += Buffer.byteLength(chunk);
        if (size > 65536) { json(res, 413, { error: "Request too large" }); return; }
        chunks.push(Buffer.from(chunk));
      }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { json(res, 400, { error: "Invalid JSON" }); return; }
      const server = createHealthMcp(data);
      const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
      res.on("close", () => { void server.close(); });
      // SDK transport declares optional callbacks as explicit undefined unions.
      // The runtime interface is compatible; bridge exactOptionalPropertyTypes here.
      await server.connect(transport as unknown as Transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) json(res, 500, { error: "MCP request failed" });
      else res.end();
    }
  });
}
