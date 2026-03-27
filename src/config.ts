import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string(),
  OPENAI_API_KEY: z.string(),
  GOOGLE_SHEET_ID: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  AI_MODEL: z.string().default("gpt-3.5-turbo"),
});

const env = schema.parse(process.env);

const config = {
  telegram: {
    token: env.TELEGRAM_BOT_TOKEN,
  },

  ai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.AI_MODEL,
  },

  google: {
    sheetId: env.GOOGLE_SHEET_ID,
  },

  supabase: {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  server: {
    port: Number(env.PORT),
    env: env.NODE_ENV,
  },
};

export default config;
