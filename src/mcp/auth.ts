import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { McpConfig } from "./config";

export function createTokenVerifier(config: McpConfig, keys: JWTVerifyGetKey = createRemoteJWKSet(new URL(config.MCP_OAUTH_JWKS_URL))) {
  return async (authorization: string | undefined): Promise<void> => {
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match?.[1]) throw new Error("Unauthorized");
    const { payload } = await jwtVerify(match[1], keys, {
      issuer: config.MCP_OAUTH_ISSUER,
      audience: config.MCP_PUBLIC_URL,
      subject: config.MCP_OWNER_SUBJECT,
      algorithms: ["RS256", "ES256"],
      requiredClaims: ["exp", "iat", "sub"],
    });
    if (typeof payload.scope !== "string" || !payload.scope.split(" ").includes("health:read")) throw new Error("Unauthorized");
  };
}
