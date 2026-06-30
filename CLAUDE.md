# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Bot (project root)
npm run dev    # run with hot reload (tsx watch)
npm start      # run once (tsx)
npm run build  # type-check only (tsc --noEmit); no compiled output — app runs via tsx

# Frontend (frontend/)
cd frontend
npm run dev    # Vite dev server at http://localhost:5173 (proxies /api to localhost:3000)
npm run build  # production build → ../public/ (also what /generate triggers on Render)
```

**Local dev workflow**: run both `npm run dev` (bot, port 3000) and `cd frontend && npm run dev` (Vite, port 5173) simultaneously. The Vite proxy forwards `/api` requests to the bot server so you get live data.

There are no tests. The root `build` script only validates types.

## Environment variables

Required in `.env`:
- `TELEGRAM_BOT_TOKEN` — Telegraf bot token
- `OPENAI_API_KEY` — used for screenshot classification and parsing
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — required for any storage or coach context operations
- `DASHBOARD_TELEGRAM_USER_ID` — Telegram user ID whose data `GET /api/data` returns

Optional: `AI_MODEL` (defaults to `gpt-3.5-turbo`), `PORT` (default `3000`), `NODE_ENV`.

Config is validated at startup via Zod in `src/config.ts`; missing required vars throw immediately.

## Render deployment

Build command: `npm install && cd frontend && npm install && npm run build`
Start command: `npm start`

The build compiles the React frontend to `public/` as part of each deploy. The `/generate` Telegram command re-runs the frontend build on demand (useful after frontend-only changes without a full redeploy).

## Architecture

This is a **Telegram bot** that lets users photograph health app screenshots, extracts structured data from them with OpenAI vision, and stores the results in Supabase. It also provides an AI health coach that answers questions against the stored data.

### Data flow

1. User sends a photo to the bot → `screenshotWizard` (Telegraf `WizardScene`) guides them through date + type selection
2. Auto-classification: `classifyScreenshotType` calls OpenAI with the image to detect the screenshot type (model: `gpt-5.4-mini`)
3. Structured parsing: `parseScreenshot` calls OpenAI again with the type-specific Zod schema as a structured output format (model: `gpt-5.4`)
4. User confirms → `persistParsedScreenshot` validates the JSON and writes to Supabase

### Key files

| File | Role |
|------|------|
| `src/index.ts` | Bot entry point; defines the Telegraf scenes and commands |
| `src/parser.ts` | OpenAI vision calls for classification and structured parsing |
| `src/storage.ts` | Maps parsed JSON to Supabase table rows; one function per screenshot type |
| `src/coachContext.ts` | Fetches last N days of all data from Supabase and computes summaries |
| `src/coach.ts` | Single OpenAI call that answers a user question given the coach context |
| `src/types.ts` | All Zod schemas for the 7 screenshot types; also `BotContext`/`WizardSession` types |
| `src/supabase.ts` | Thin `supabaseRequest` wrapper over `fetch` (no Supabase JS client); `ensureUser` upserts users by Telegram ID |
| `src/enums.ts` | `SCREENSHOT_TYPES` array (labels + values) and choice sets used for validation |
| `src/utils.ts` | Date formatting, HTML formatting for Telegram messages, `splitMessage` for long replies |
| `src/dashboard.ts` | Shared data-fetching layer for the web dashboard; exports `fetchDashboardData` and all row types |
| `src/server.ts` | HTTP server: serves `GET /api/data` (JSON from `dashboard.ts`) + static files from `public/` |
| `src/generate.ts` | `/generate` implementation: shells out to `npm run build` in `frontend/` |

### Frontend (`frontend/`)

Vite + React SPA. In dev, proxies `/api` to the bot server (port 3000). Production build outputs to `../public/` which the bot's HTTP server serves.

```
frontend/src/
  App.tsx              # root component; fetches /api/data, renders all sections
  types.ts             # data types matching the /api/data response shape
  utils.ts             # formatting helpers (duration, pace, numbers)
  components/
    DataTable.tsx      # reusable table — headers: string[], rows: string[][]
  sections/            # one component per screenshot type
    SleepSection.tsx   RunsSection.tsx   DailyStatsSection.tsx
    SportSection.tsx   MacrosSection.tsx FoodLogSection.tsx
    WorkoutsSection.tsx
```

Adding a chart to a section: import a chart library in the section component alongside `DataTable`. The data is already available as typed props — no other changes needed.

### Supabase access pattern

Supabase is accessed via **raw fetch against the REST API** — there is no `@supabase/supabase-js` client. All queries go through `supabaseRequest(path, init)` in `src/supabase.ts`, which prepends the base URL and injects the service-role key headers. PostgREST query syntax (`?select=`, `?user_id=eq.X`, `?on_conflict=`) is used directly in the path string.

### Screenshot types and their schemas

All 7 types are defined as Zod schemas in `src/types.ts` and registered in two maps (one in `parser.ts` for OpenAI structured output, one in `storage.ts` for persistence):

- `garmin_sleep` → `garmin_sleep_entries`
- `garmin_run` → `garmin_run_entries`
- `garmin_daily_stats` → `garmin_daily_stats_entries`
- `garmin_sport_activity` → `garmin_sport_activity_entries`
- `healthifyme_macros` → `healthifyme_macros_entries`
- `healthifyme_food_log` → `healthifyme_food_log_entries` (+ `_meals` + `_foods`)
- `hevy_workout` → `hevy_workout_entries` (+ `_muscle_distribution` + `_exercises` + `_sets`)

When adding a new screenshot type, update: `ScreenshotType` union in `types.ts`, the Zod schema in `types.ts`, `SCREENSHOT_TYPES` in `enums.ts`, the maps in `parser.ts` and `storage.ts`, and the persist dispatch in `storage.ts`.

### Date format

User-facing dates are entered as `ddmmyyyy` (e.g. `30062026`). `toIsoDate` in `supabase.ts` converts to `yyyy-mm-dd` for storage. The wizard state always holds `ddmmyyyy`; ISO conversion happens only at persist time.

### Bot commands

- `/coach` — enters `coach-scene` with the last 10 days of context; `/exit` to leave
- `/dump` — sends a formatted 30-day context dump, split into ≤3500-char chunks for Telegram limits
- Sending a photo directly → enters the `screenshot-wizard` with the photo pre-loaded

### Database migrations

Schema is in `supabase/migrations/`. Apply with:
```bash
supabase db push
```
