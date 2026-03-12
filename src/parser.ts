import OpenAI from "openai";
import config from "./config.ts";
import type { ScreenshotType } from "./types/botContext.ts";

const client = new OpenAI({
  apiKey: config.ai.apiKey,
});

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
                    Identify the screenshot type and extract data.

                    Screenshot type: ${screenshotType}

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
