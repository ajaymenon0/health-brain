# Health Brain

Health records collected through Telegram, stored in Supabase, and explored through a dashboard and health coach.

## ChatGPT MCP plugin

An integrated, OAuth-protected, read-only MCP endpoint exposes your nutrition, sleep, activity, weight and training records to ChatGPT.

See **[ChatGPT MCP setup](docs/chatgpt-mcp.md)** for environment configuration, authentication, deployment, and use in a ChatGPT project. Environment template: [`.env.mcp.example`](.env.mcp.example).

```sh
npm start
npm run build
npm run test:mcp
```

`npm start` runs the Telegram bot, dashboard, and MCP on one HTTP listener using `PORT` (bound to `0.0.0.0`). Configure the MCP variables to enable `/mcp`; existing deployments without MCP configuration continue serving the dashboard. Partial MCP configuration fails startup.

`npm run mcp:start` remains available for isolated MCP development without Telegram or OpenAI credentials.
