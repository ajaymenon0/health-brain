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
