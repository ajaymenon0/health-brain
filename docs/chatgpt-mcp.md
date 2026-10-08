# Health Brain MCP → ChatGPT

This is a private, single-owner, read-only MCP server. ChatGPT retrieves your saved Supabase records through nine tools, then analyzes them in the conversation. The Telegram bot and dashboard continue to run separately. No OpenAI API call is made by this server, and it needs neither `OPENAI_API_KEY` nor `TELEGRAM_BOT_TOKEN`.

## 1. Configure authentication

The server is an OAuth **resource server**. Use an OAuth/OIDC authorization provider to handle login, consent, authorization codes, and refresh tokens. This repository does not create an identity-provider account or implement its own login system.

Configure your provider with:

- An API/resource identifier equal to your public MCP URL, including `/mcp` (for example `https://health-mcp.example.com/mcp`).
- The scope `health:read`.
- Authorization-code flow with PKCE S256 and published OAuth or OIDC discovery metadata. The metadata must advertise S256.
- JWT access tokens signed with RS256 or ES256, with `iss` equal to the configured issuer, `aud` containing the exact MCP URL, your account's `sub`, `iat`, `exp`, and a space-delimited `scope` containing `health:read`.
- Support for the OAuth `resource` parameter that ChatGPT sends in authorization and token requests. Configure the provider to issue tokens for this resource; a provider that ignores it and issues tokens for another audience will not work.
- A pre-registered OAuth client for ChatGPT (client ID and secret), or a provider supporting ChatGPT-compatible dynamic client registration/CIMD. A predefined client is usually simplest for a personal deployment.
- The **exact redirect URI shown by ChatGPT's MCP connection management page** in the client's allowlist. Do not guess this URL: it can be specific to the connection. If you create the connection first to obtain it, save the redirect URI and retry authentication afterward.

Copy your provider's exact issuer and `jwks_uri` from its discovery document. Set `MCP_OWNER_SUBJECT` to your account's immutable `sub`. Even other successfully authenticated users are denied. The owner maps to the fixed `MCP_TELEGRAM_USER_ID`; tool callers cannot select another user.

See [OpenAI's authentication requirements](https://developers.openai.com/plugins/build/auth). Provider setup is required before ChatGPT can authenticate; a static bearer token or Supabase service-role key is not a substitute for this OAuth flow.

## 2. Run locally

Use Node.js 20.19+ and install dependencies:

```sh
npm ci
```

Merge the variables in `.env.mcp.example` into your existing `.env` (do not overwrite your bot configuration). Use the same Supabase project and Telegram user ID as your Health Brain records. The user must already exist: the MCP server never upserts users.

```sh
npm run mcp:start
```

Local endpoint: `http://127.0.0.1:3001/mcp`. The process loads `.env` but validates only MCP/Supabase configuration. Development reload: `npm run mcp:dev`.

`GET /healthz` is a public liveness check. `GET /.well-known/oauth-protected-resource/mcp` is public OAuth discovery. All `/mcp` requests require an owner access token. GET/DELETE on `/mcp` return 405 after authentication; this stateless Streamable HTTP server uses POST and JSON responses, with no persistent SSE session.

For manual inspection, use MCP Inspector with Streamable HTTP and a valid OAuth access token. The automated tests below exercise the actual MCP SDK client without real data.

## 3. Deploy a dedicated service

Deploy this repository as a **separate service** from the existing Telegram bot/dashboard. For Render, create a Node web service with:

| Setting | Value |
| --- | --- |
| Build command | `npm ci --include=dev` |
| Start command | `npm run mcp:start` |
| Health check path | `/healthz` |
| `MCP_HOST` | `0.0.0.0` |
| `MCP_PORT` | `10000` |

Set all remaining variables from `.env.mcp.example` in the service's secret/environment settings. Set `MCP_PUBLIC_URL` to that service's HTTPS URL plus `/mcp`, and configure the OAuth resource/audience to match. `tsx` is an existing development dependency, so the build explicitly includes development dependencies.

The service exposes only MCP, OAuth resource metadata and liveness; it does not serve the existing unauthenticated dashboard API. Keep the service-role key server-side. Browser Origin headers are accepted only for the canonical MCP origin; ChatGPT's server-to-server requests do not need browser CORS. Put TLS termination and operational rate limits at your hosting/reverse-proxy layer. Supabase PostgREST should allow at least 100 rows per response (its normal default is larger).

For local development, an HTTPS forwarding tunnel can forward to port 3001. Set the canonical public URL and OAuth audience to that tunnel's URL before running. Changing URLs requires updating both and reconnecting. Secure MCP Tunnel is another supported ChatGPT option, but requires separate Platform tunnel provisioning; it is not provisioned by this repository.

## 4. Install in ChatGPT and use your project

1. On ChatGPT web, open **Plugins → + → Add custom MCP server**.
2. Name it **Health Brain** and enter your deployed `https://…/mcp` URL.
3. Select **OAuth**. If using a predefined client, enter its client ID and secret. Configure the exact callback URI from the connection management page at your provider.
4. Create the plugin, install it from your personal plugins, and sign in with the account matching `MCP_OWNER_SUBJECT`.
5. Open your ChatGPT project and start a **new chat**. Select/invoke Health Brain from the available plugins and ask it to retrieve your records.

The plugin connection belongs to your ChatGPT account/workspace. Using it in a project chat does not upload or permanently synchronize the whole database into project Sources. Plugin availability depends on account/workspace policy. If it is not offered in the project composer, verify it works in a new standalone chat and check the workspace's plugin permissions.

[Official connection guide](https://developers.openai.com/api/docs/guides/custom-mcp-server) · [Projects and chats](https://learn.chatgpt.com/docs/projects?surface=app)

Suggested project instructions:

> Use Health Brain for questions about my logged health data. Fetch fresh records for explicit date ranges. Report data coverage and missing days; do not treat missing entries as zero. Follow pagination before making full-period claims. State dates and units, distinguish observed associations from causal explanations, and treat screenshot-derived values as potentially imperfect.

Try: “Use Health Brain to summarize October 1–8, 2026. Show how many days have sleep, nutrition, weight, and training data before drawing conclusions.”

## Tools and limits

All date ranges are inclusive `YYYY-MM-DD`, with a maximum of 366 calendar days. Dates reflect dates saved with screenshots; the server does not reinterpret them into another timezone. `generated_at` is UTC.

| Tool | Data |
| --- | --- |
| `get_health_summary` | Counts, coverage and numeric per-record averages across all datasets |
| `get_nutrition` | Calories, targets and macros |
| `get_sleep` | Duration, stages, resting heart rate and body battery |
| `get_daily_activity` | Steps, calories, heart rate and body battery |
| `get_runs` | Pace, speed, duration, heart rate and training effects |
| `get_sport_activities` | Sport-session metrics |
| `get_weight_history` | Weight and body composition |
| `get_food_log` | Meals and individual foods |
| `get_workouts` | Strength workouts, exercises and sets |

Detail tools accept `offset` (default 0) and `limit` (default 50, maximum 100). Continue with the returned `next_offset` until null. A full final page can require one extra request returning no records. Ordering is stable by date then record ID; simultaneous edits can still change pages, so avoid modifying historical logs during a long analysis.

Summary reads at most 1,000 records per dataset and flags potential truncation, with the next offset for the matching detail tool. Averages exclude missing/null/non-numeric values and are **per record**, not per calendar day. No missing data is imputed. This does not invent run distances from average speed, compute causal effects, or call a second model.

The weight tool expects the `healthifyme_weight_entries` table already used by the dashboard/storage code. The checked-in initial migration does not define that table; ensure your actual database includes it before using weight or all-dataset summary tools. Upstream errors are deliberately returned as generic tool errors, without database response bodies or credentials.

## Verification

```sh
npm run build
npm run test:mcp
```

Tests use synthetic data and local signing keys. They verify date/identity validation, read-only owner-scoped requests, pagination, summary semantics, OAuth claims, resource discovery, unauthorized requests, Origin rejection, and an SDK client initialization/list/call flow. They do not authenticate to your provider, deploy a public service, or read production health records.

Common issues:

- **401:** Check issuer, audience (including `/mcp`), owner subject, expiry, signing algorithm and `health:read` scope. Reconnect after provider changes.
- **Cannot connect:** The endpoint must be reachable from ChatGPT. Check HTTPS, service status, provider discovery, callback URI and PKCE support.
- **Tool error:** Check server-side Supabase credentials, that the configured Telegram user exists, and that all queried tables exist.
- **No records:** Verify the date range and configured Telegram user. Missing logs remain missing; they are not zero-valued entries.
