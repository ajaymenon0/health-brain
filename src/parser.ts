import OpenAI from "openai";
import config from "./config";
import {
  garminDailyStatsSchema,
  garminRunSchema,
  garminSleepSchema,
  healthifyMeFoodLogSchema,
  healthifyMeMacrosSchema,
  hevyWorkoutSchema,
  type ScreenshotType,
} from "./types";
import z from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const client = new OpenAI({
  apiKey: config.ai.apiKey,
});

const screenshotTypeToSchema: Record<ScreenshotType, z.ZodObject<any>> = {
  healthifyme_macros: healthifyMeMacrosSchema,
  garmin_sleep: garminSleepSchema,
  hevy_workout: hevyWorkoutSchema,
  garmin_run: garminRunSchema,
  garmin_daily_stats: garminDailyStatsSchema,
  healthifyme_food_log: healthifyMeFoodLogSchema,
};

export async function parseScreenshot(
  imageUrl: string,
  screenshotType: ScreenshotType,
) {
  const response = await client.responses.create({
    model: "gpt-5.4",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
                    You are a competent health assistant/trainer that extracts structured data from health and fitness app screenshots.

                    The screenshot type is: ${screenshotType}
                    Wherever time is mentioned try and use total minutes instead of time format. For example, if the screenshot mentions "1 hr 30 mins", convert it to 90 minutes.
                    Return JSON.
                    `,
          },
          {
            type: "input_image",
            image_url: imageUrl,
            detail: "auto",
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(
        screenshotTypeToSchema[screenshotType],
        screenshotType,
      ),
    },
  });

  return response.output_text;
}
