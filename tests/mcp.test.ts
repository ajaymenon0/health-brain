import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createTokenVerifier } from "../src/mcp/auth";
import { mcpConfigSchema } from "../src/mcp/config";
import { HealthData, pageSchema } from "../src/mcp/data";
import { createMcpHttpServer } from "../src/mcp/server";

const config = mcpConfigSchema.parse({
  SUPABASE_URL: "https://database.example", SUPABASE_SERVICE_ROLE_KEY: "private-key",
  MCP_TELEGRAM_USER_ID: 123, MCP_PUBLIC_URL: "https://health.example/mcp",
  MCP_OAUTH_ISSUER: "https://auth.example/", MCP_OAUTH_JWKS_URL: "https://auth.example/jwks",
  MCP_OWNER_SUBJECT: "owner",
});
const uid = "00000000-0000-4000-8000-000000000001";
const range = { start_date: "2026-10-01", end_date: "2026-10-08" };

test("rejects invalid dates, reversed ranges, oversized ranges and identity injection", () => {
  for (const input of [
    { ...range, start_date: "2026-02-30" }, { ...range, end_date: "2026-09-01" },
    { ...range, start_date: "2020-01-01" }, { ...range, user_id: "another-user" },
    { ...range, limit: 101 }, { ...range, offset: -1 },
  ]) assert.equal(pageSchema.safeParse(input).success, false);
  assert.equal(pageSchema.parse(range).limit, 50);
});

test("OAuth validates signature, issuer, audience, expiry, owner and scope", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const verify = createTokenVerifier(config, createLocalJWKSet({ keys: [await exportJWK(publicKey)] }));
  const sign = (overrides: Record<string, unknown> = {}) => new SignJWT({
    sub: "owner", iss: config.MCP_OAUTH_ISSUER, aud: config.MCP_PUBLIC_URL,
    scope: "health:read", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60, ...overrides,
  }).setProtectedHeader({ alg: "RS256" }).sign(privateKey);
  await verify(`Bearer ${await sign()}`);
  for (const overrides of [{ sub: "other" }, { iss: "https://evil.example" }, { aud: "other" }, { exp: 1 }, { scope: "other" }, { exp: undefined }]) {
    await assert.rejects(verify(`Bearer ${await sign(overrides)}`));
  }
  await assert.rejects(verify(undefined));
  await assert.rejects(verify("Bearer invalid"));
  const forged = await generateKeyPair("RS256");
  const forgedToken = await new SignJWT({ sub: "owner", scope: "health:read" }).setProtectedHeader({ alg: "RS256" }).setIssuer(config.MCP_OAUTH_ISSUER).setAudience(config.MCP_PUBLIC_URL).setIssuedAt().setExpirationTime("1m").sign(forged.privateKey);
  await assert.rejects(verify(`Bearer ${forgedToken}`));
});

test("queries are GET-only, owner scoped, bounded, and paginated", async () => {
  const seen: URL[] = [];
  const data = new HealthData(config.SUPABASE_URL, "secret", 123, async (input, init) => {
    assert.equal(init?.method, "GET");
    const url = new URL(String(input)); seen.push(url);
    return Response.json(url.pathname.endsWith("/users") ? [{ id: uid }] : [{ id: "record", entry_date: range.start_date, weight_kg: 70 }]);
  });
  const page = await data.records("weight_history", { ...range, limit: 1, offset: 2 });
  assert.equal(page.next_offset, 3);
  assert.equal(seen[0]?.searchParams.get("telegram_user_id"), "eq.123");
  assert.equal(seen[1]?.searchParams.get("user_id"), `eq.${uid}`);
  assert.deepEqual(seen[1]?.searchParams.getAll("entry_date"), ["gte.2026-10-01", "lte.2026-10-08"]);
  assert.equal(seen[1]?.searchParams.get("offset"), "2");
  assert.equal(seen[1]?.searchParams.get("order"), "entry_date.asc,id.asc");
});

test("missing user does not create a user; upstream errors do not disclose secrets", async () => {
  const empty = new HealthData(config.SUPABASE_URL, "secret", 123, async () => Response.json([]));
  await assert.rejects(empty.records("sleep", { ...range, offset: 0, limit: 10 }), /No existing/);
  const failed = new HealthData(config.SUPABASE_URL, "secret", 123, async () => new Response("private database details", { status: 500 }));
  await assert.rejects(failed.records("sleep", { ...range, offset: 0, limit: 10 }), /temporarily unavailable/);
});

test("summary reports coverage and averages without treating missing values as zero", async () => {
  const data = new HealthData(config.SUPABASE_URL, "secret", 123, async input => {
    const url = String(input);
    if (url.includes("/users?")) return Response.json([{ id: uid }]);
    if (url.includes("/garmin_sleep_entries?")) return Response.json([
      { sleep_date: "2026-10-01", sleep_duration_minutes: 420, resting_heart_rate: null },
      { sleep_date: "2026-10-02", sleep_duration_minutes: 480, resting_heart_rate: 60 },
    ]);
    return Response.json([]);
  });
  const summary = await data.summary(range);
  assert.deepEqual(summary.coverage.sleep, { record_count: 2, days_with_records: 2, truncated: false, next_offset: null, per_record_averages: { sleep_duration_minutes: 450, resting_heart_rate: 60 } });
  assert.deepEqual(summary.coverage.weight_history, { record_count: 0, days_with_records: 0, truncated: false, next_offset: null, per_record_averages: {} });
});

test("HTTP discovery, auth rejection, MCP initialization/list/call and input rejection", async () => {
  let reads = 0;
  const data = new HealthData(config.SUPABASE_URL, "secret", 123, async input => {
    reads++;
    return Response.json(String(input).includes("/users?") ? [{ id: uid }] : []);
  });
  const server = createMcpHttpServer(config, { data, verify: async authorization => {
    if (authorization !== "Bearer test") throw new Error("Unauthorized");
  } });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const client = new Client({ name: "test", version: "1" });
  try {
    const unauthorized = await fetch(`${base}/mcp`, { method: "POST" });
    assert.equal(unauthorized.status, 401);
    assert.match(unauthorized.headers.get("www-authenticate")!, /oauth-protected-resource\/mcp/);
    assert.equal(reads, 0);
    const metadata = await (await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)).json();
    assert.equal(metadata.resource, config.MCP_PUBLIC_URL);
    assert.equal((await fetch(`${base}/api/data`)).status, 404);
    assert.equal((await fetch(`${base}/mcp`, { method: "POST", headers: { Origin: "https://evil.example" } })).status, 403);
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { Authorization: "Bearer test" } } }));
    const tools = await client.listTools(); assert.equal(tools.tools.length, 9);
    assert.ok(tools.tools.every(tool => tool.annotations?.readOnlyHint));
    const result = await client.callTool({ name: "get_sleep", arguments: range });
    assert.equal(result.isError, undefined);
    assert.deepEqual((result.structuredContent as { records: unknown[] }).records, []);
    const before = reads;
    const invalid = await client.callTool({ name: "get_sleep", arguments: { ...range, end_date: "invalid" } });
    assert.equal(invalid.isError, true); assert.equal(reads, before);
  } finally { await client.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("summary bounds dense datasets and discloses truncation", async () => {
  const data = new HealthData(config.SUPABASE_URL, "secret", 123, async input => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/users")) return Response.json([{ id: uid }]);
    if (url.pathname.endsWith("/garmin_run_entries")) {
      const offset = Number(url.searchParams.get("offset"));
      return Response.json(Array.from({ length: 100 }, (_, index) => ({ id: String(offset + index), run_date: range.start_date, total_time_sec: 100 })));
    }
    return Response.json([]);
  });
  const summary = await data.summary(range);
  assert.deepEqual(summary.coverage.runs, { record_count: 1000, days_with_records: 1, truncated: true, next_offset: 1000, per_record_averages: { total_time_sec: 100 } });
});
