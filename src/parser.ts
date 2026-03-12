import OpenAI from "openai";
import config from "./config";

const client = new OpenAI({
  apiKey: config.ai.apiKey,
});

export async function parseScreenshot(imageUrl: string) {
  const response = await client.responses.create({
    model: "gpt-5.4",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
                    Identify the screenshot type and extract data.

                    Possible types:
                    - garmin_sleep
                    - garmin_run
                    - hevy_workout
                    - healthifyme_food_log
                    - healthifyme_macros

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
  });

  return response.output_text;
}
