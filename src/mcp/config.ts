import { z } from "zod";

const httpsUrl = z.string().url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
}, "Must be an HTTPS URL without credentials, query, or fragment");

export const mcpConfigSchema = z.object({
  SUPABASE_URL: httpsUrl,
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MCP_TELEGRAM_USER_ID: z.coerce.number().int().positive().safe(),
  MCP_PUBLIC_URL: httpsUrl.refine(value => new URL(value).pathname === "/mcp", "Must end with /mcp"),
  MCP_OAUTH_ISSUER: httpsUrl,
  MCP_OAUTH_JWKS_URL: httpsUrl,
  MCP_OWNER_SUBJECT: z.string().min(1),
  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  MCP_HOST: z.string().default("127.0.0.1"),
});
export type McpConfig = z.infer<typeof mcpConfigSchema>;

// Existing bot deployments remain usable until MCP credentials are configured.
// Partial configuration fails startup rather than exposing an unprotected endpoint.
export function integratedMcpConfig(env: NodeJS.ProcessEnv): McpConfig | undefined {
  const keys = ["MCP_PUBLIC_URL", "MCP_OAUTH_ISSUER", "MCP_OAUTH_JWKS_URL", "MCP_OWNER_SUBJECT", "MCP_TELEGRAM_USER_ID"];
  if (!keys.some(key => env[key] !== undefined)) return undefined;
  const parsed = mcpConfigSchema.safeParse({ ...env, MCP_HOST: "0.0.0.0", MCP_PORT: 3001 });
  if (!parsed.success) throw new Error("Invalid MCP configuration: " + parsed.error.issues.map(issue => issue.path.join(".") + ": " + issue.message).join("; "));
  return parsed.data;
}
