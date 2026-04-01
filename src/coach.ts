import OpenAI from "openai";
import config from "./config";
import type { CoachContext } from "./coachContext";

type CoachHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

const client = new OpenAI({
  apiKey: config.ai.apiKey,
});

export async function answerCoachQuestion(
  question: string,
  context: CoachContext,
  history: CoachHistoryMessage[],
): Promise<string> {
  const formattedHistory =
    history.length === 0
      ? "No prior chat history in this coach session."
      : history
          .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
          .join("\n");

  const response = await client.responses.create({
    model: config.ai.model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `
You are a supportive health and performance coach.
Use only the provided database-derived context from the last 10 days.
If the context does not support a claim, say that clearly.
Do not invent metrics, trends, or events.
Keep answers practical and specific.
`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
Coach context:
${JSON.stringify(context, null, 2)}

Prior conversation in this coach session:
${formattedHistory}

User question:
${question}
`,
          },
        ],
      },
    ],
  });

  return response.output_text.trim();
}
