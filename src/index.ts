import { Markup, Scenes, session, Telegraf, type Middleware } from "telegraf";
import { message } from "telegraf/filters";
import config from "./config";
import { BaseScene, WizardScene } from "telegraf/scenes";
import { answerCoachQuestion } from "./coach";
import {
  buildCoachContext,
  buildCoachContextForDays,
  type CoachContext,
} from "./coachContext";
import type { BotContext, ScreenshotType, WizardSession } from "./types";
import { classifyScreenshotType, parseScreenshot } from "./parser";
import { SCREENSHOT_TYPES } from "./enums";
import { persistParsedScreenshot } from "./storage";
import {
  formatCoachContextDump,
  formatDate,
  formatParsedScreenshot,
  formatReadableDate,
  isDateChoice,
  isScreenshotType,
  splitMessage,
} from "./utils";

const bot = new Telegraf<BotContext>(config.telegram.token);
type SaveChoice = "save_yes" | "save_no";
type DetectedTypeChoice = "detected_type_yes" | "detected_type_no";
type CoachSceneState = {
  coachContext?: CoachContext;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

function wizardState(ctx: BotContext): WizardSession {
  // Telegraf exposes wizard.state as `object`, so narrow it once here.
  return ctx.wizard.state as WizardSession;
}

function coachState(ctx: BotContext): CoachSceneState {
  return ctx.scene.state as CoachSceneState;
}

const exitWizardMiddleware: Middleware<BotContext> = async (ctx, next) => {
  if (!ctx.message || !("text" in ctx.message)) {
    return next();
  }

  if (ctx.message.text.trim().toLowerCase() !== "exit") {
    return next();
  }

  await ctx.reply("Exited the screenshot wizard.");
  await ctx.scene.leave();
};

async function processScreenshot(ctx: BotContext, state: WizardSession) {
  const photoFileId = state.photoFileId;
  const screenshotType = state.screenshotType;
  const entryDate = state.date;

  if (!photoFileId) {
    await ctx.reply("Please upload a screenshot image.");
    return;
  }

  if (!screenshotType) {
    await ctx.reply("Please select the image type.");
    return;
  }

  if (!entryDate) {
    await ctx.reply(
      "Please select or enter the date for this screenshot first.",
    );
    return;
  }

  if (!ctx.from) {
    await ctx.reply(
      "Could not identify the Telegram user for this screenshot.",
    );
    return;
  }

  const fileLink = await ctx.telegram.getFileLink(photoFileId);

  await ctx.reply("Screenshot received. Parsing now...");

  const result = await parseScreenshot(fileLink.href, screenshotType);
  console.log("Parsed screenshot data:", result);

  console.log("Received screenshot for date:", state.date);
  console.log("File link:", fileLink.href);

  state.parsedResult = result;
  state.awaitingSaveConfirmation = true;

  await ctx.reply(formatParsedScreenshot(result), {
    parse_mode: "HTML",
  });
  ctx.wizard.selectStep(5);
  await ctx.reply(
    "Do you want to save this to Supabase?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Yes", "save_yes"),
        Markup.button.callback("No", "save_no"),
      ],
    ]),
  );
}

async function askScreenshotType(ctx: BotContext) {
  await ctx.reply(
    "What type of image is it?",
    Markup.inlineKeyboard(
      SCREENSHOT_TYPES.map((type: (typeof SCREENSHOT_TYPES)[number]) => [
        Markup.button.callback(type.label, type.value),
      ]),
    ),
  );
}

function screenshotTypeLabel(value: ScreenshotType): string {
  return SCREENSHOT_TYPES.find((type) => type.value === value)?.label ?? value;
}

async function askDetectedScreenshotType(
  ctx: BotContext,
  screenshotType: ScreenshotType,
) {
  await ctx.reply(
    `Image type: ${screenshotTypeLabel(screenshotType)}?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Yes", "detected_type_yes"),
        Markup.button.callback("No", "detected_type_no"),
      ],
    ]),
  );
}

async function detectScreenshotTypeAndConfirm(
  ctx: BotContext,
  state: WizardSession,
) {
  const photoFileId = state.photoFileId;

  if (!photoFileId) {
    await ctx.reply("Please upload the screenshot now.");
    ctx.wizard.selectStep(4);
    return;
  }

  const fileLink = await ctx.telegram.getFileLink(photoFileId);
  await ctx.reply("Trying to identify the screenshot type...");

  const detectedType = await classifyScreenshotType(fileLink.href);
  state.screenshotType = detectedType;
  state.awaitingTypeConfirmation = true;
  ctx.wizard.selectStep(3);
  await askDetectedScreenshotType(ctx, detectedType);
}

export const screenshotWizard = new WizardScene<BotContext>(
  "screenshot-wizard",
  async (ctx) => {
    await ctx.reply(
      "Which day is this screenshot for?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Today", "date_today"),
          Markup.button.callback("Yesterday", "date_yesterday"),
        ],
        [Markup.button.callback("Custom date", "date_custom")],
      ]),
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
      return;
    }

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const choice = ctx.callbackQuery.data;

    if (!isDateChoice(choice)) {
      await ctx.reply("Please select a valid option.");
      return;
    }

    const state = wizardState(ctx);

    if (choice === "date_today") {
      state.date = formatDate(new Date());
      state.expectsCustomDate = false;

      await ctx.reply("Great! You've selected today.");
      await detectScreenshotTypeAndConfirm(ctx, state);
      return;
    }

    if (choice === "date_yesterday") {
      state.date = formatDate(new Date(Date.now() - 86400000));
      state.expectsCustomDate = false;

      await ctx.reply("Great! You've selected yesterday.");
      await detectScreenshotTypeAndConfirm(ctx, state);
      return;
    }

    if (choice === "date_custom") {
      state.date = undefined;
      state.expectsCustomDate = true;
      await ctx.reply("Please enter the date in ddmmyyyy format.");
      return ctx.wizard.next();
    }
  },
  async (ctx) => {
    const state = wizardState(ctx);
    console.log("Wizard state before processing date:", state);

    if (state.expectsCustomDate) {
      if (!ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please enter the date in ddmmyyyy format.");
        return;
      }

      const text = ctx.message.text;

      if (!text || !/^\d{2}\d{2}\d{4}$/.test(text)) {
        await ctx.reply(
          "Invalid date format. Please enter the date in ddmmyyyy format.",
        );
        return;
      }

      state.date = text;
      state.expectsCustomDate = false;
      await ctx.reply(`Great! You've selected ${formatReadableDate(text)}.`);
    }

    await detectScreenshotTypeAndConfirm(ctx, state);
    return;
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
      return;
    }

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const state = wizardState(ctx);
    const choice = ctx.callbackQuery.data;

    if (
      state.awaitingTypeConfirmation &&
      (choice === "detected_type_yes" || choice === "detected_type_no")
    ) {
      state.awaitingTypeConfirmation = false;

      if (choice === "detected_type_yes") {
        if (state.photoFileId) {
          await processScreenshot(ctx, state);
          return;
        }

        ctx.wizard.selectStep(4);
        await ctx.reply("Please upload the screenshot now.");
        return;
      }

      state.screenshotType = undefined;
      await askScreenshotType(ctx);
      return;
    }

    if (!isScreenshotType(choice)) {
      await ctx.reply("Please select a valid image type.");
      return;
    }

    state.screenshotType = choice;

    if (state.photoFileId) {
      await processScreenshot(ctx, state);
      return;
    }

    if (!ctx.message || !("photo" in ctx.message)) {
      ctx.wizard.selectStep(4);
      await ctx.reply("Please upload the screenshot now.");
      return;
    }
  },
  async (ctx) => {
    const state = wizardState(ctx);

    if (!ctx.message || !("photo" in ctx.message)) {
      await ctx.reply("Please upload a screenshot image.");
      return;
    }

    const photo = ctx.message.photo.at(-1);

    if (!photo) {
      await ctx.reply("No photo found in the message.");
      return;
    }

    state.photoFileId = photo.file_id;
    await detectScreenshotTypeAndConfirm(ctx, state);
    return;
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
      return;
    }

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const state = wizardState(ctx);
    const choice = ctx.callbackQuery.data as SaveChoice;

    if (!state.awaitingSaveConfirmation || !state.parsedResult) {
      await ctx.reply("There is no parsed screenshot waiting to be saved.");
      return ctx.scene.leave();
    }

    if (choice === "save_no") {
      state.awaitingSaveConfirmation = false;
      state.parsedResult = undefined;
      await ctx.reply("Okay, I did not save it.");
      return ctx.scene.leave();
    }

    if (choice !== "save_yes") {
      await ctx.reply("Please choose Yes or No.");
      return;
    }

    if (!state.date || !state.screenshotType || !ctx.from) {
      await ctx.reply("Missing data required to save this screenshot.");
      return ctx.scene.leave();
    }

    try {
      await persistParsedScreenshot({
        telegramUserId: ctx.from.id,
        screenshotType: state.screenshotType,
        entryDate: state.date,
        parsedResult: state.parsedResult,
      });
      state.awaitingSaveConfirmation = false;
      state.parsedResult = undefined;
      await ctx.reply("Stored parsed screenshot in Supabase.");
    } catch (error) {
      console.error("Failed to persist parsed screenshot:", error);
      await ctx.reply(
        "Saving to Supabase failed. Check server logs and try again.",
      );
    }

    return ctx.scene.leave();
  },
);
screenshotWizard.use(exitWizardMiddleware);

const coachScene = new BaseScene<BotContext>("coach-scene");

coachScene.enter(async (ctx) => {
  const state = coachState(ctx);
  state.history ??= [];
  await ctx.reply("Coach here. Tell me what you need?");
});

coachScene.on(message("text"), async (ctx) => {
  const text = ctx.message.text.trim();

  if (text === "/exit") {
    await ctx.reply("Leaving coach mode.");
    await ctx.scene.leave();
    return;
  }

  const state = coachState(ctx);

  if (!state.coachContext) {
    await ctx.reply("Coach context is missing. Please run /coach again.");
    await ctx.scene.leave();
    return;
  }

  state.history ??= [];

  await ctx.sendChatAction("typing");
  const answer = await answerCoachQuestion(
    text,
    state.coachContext,
    state.history,
  );
  state.history.push({ role: "user", content: text });
  state.history.push({ role: "assistant", content: answer });

  await ctx.reply(answer);
});

const stage = new Scenes.Stage<BotContext>([screenshotWizard, coachScene]);
bot.use(session());
bot.use(stage.middleware());

bot.command("coach", async (ctx) => {
  if (!ctx.from) {
    await ctx.reply("I couldn't identify the Telegram user for coach mode.");
    return;
  }

  try {
    const context = await buildCoachContext(ctx.from.id);
    await ctx.scene.enter("coach-scene", {
      coachContext: context,
      history: [],
    });
  } catch (error) {
    console.error("Failed to build coach context:", error);
    await ctx.reply(
      "I couldn't prepare your coaching context from Supabase. Please try again.",
    );
  }
});

bot.command("dump", async (ctx) => {
  if (!ctx.from) {
    await ctx.reply(
      "I couldn't identify the Telegram user for the context dump.",
    );
    return;
  }

  try {
    await ctx.reply("Preparing your 30-day context dump...");
    const context = await buildCoachContextForDays(ctx.from.id, 30);
    const dump = formatCoachContextDump(context);

    for (const chunk of splitMessage(dump)) {
      await ctx.reply(chunk);
    }
  } catch (error) {
    console.error("Failed to build 30-day dump:", error);
    await ctx.reply(
      "I couldn't prepare the 30-day context dump from Supabase. Please try again.",
    );
  }
});

bot.on(message("photo"), async (ctx, next) => {
  if (ctx.scene.current?.id === "screenshot-wizard") {
    return next();
  }

  const photo = ctx.message.photo.at(-1);

  if (!photo) {
    return next();
  }

  return ctx.scene.enter("screenshot-wizard", {
    photoFileId: photo.file_id,
  });
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
