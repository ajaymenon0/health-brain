# Health Brain

Health records collected through Telegram, stored in Supabase, and explored through a dashboard and health coach.

## ChatGPT MCP plugin

A dedicated, OAuth-protected, read-only MCP server exposes your nutrition, sleep, activity, weight and training records to ChatGPT.

See **[ChatGPT MCP setup](docs/chatgpt-mcp.md)** for environment configuration, authentication, deployment, and use in a ChatGPT project. Environment template: [`.env.mcp.example`](.env.mcp.example).

```sh
npm run mcp:start
npm run build
npm run test:mcp
```

The MCP server runs separately from the bot (`npm start`) and does not require an OpenAI API key or Telegram bot token.
