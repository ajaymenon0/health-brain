import http from "node:http";
import type { McpConfig } from "./mcp/config";
import { createMcpHttpServer } from "./mcp/server";

/** One listener for MCP, OAuth discovery, dashboard, static assets and liveness. */
export function createApplicationServer(mcp: McpConfig | undefined, dashboard: http.RequestListener) {
  const server = mcp ? createMcpHttpServer(mcp, { fallback: dashboard }) : http.createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (pathname === "/healthz" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ status: "ok" }));
    } else if (pathname === "/mcp" || pathname.startsWith("/mcp/") || pathname.startsWith("/.well-known/oauth-protected-resource")) {
      res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ error: "MCP is not configured" }));
    } else {
      dashboard(req, res);
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  return server;
}
