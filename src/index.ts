import { Markup, Scenes, session, Telegraf, type Middleware } from "telegraf";
import { message } from "telegraf/filters";
import config from "./config.ts";
import { WizardScene } from "telegraf/scenes";
import type { BotContext, WizardSession } from "./types";
import { parseScreenshot } from "./parser.ts";
import { SCREENSHOT_TYPES } from "./enums";
import {
  formatDate,
  formatParsedScreenshot,
  isDateChoice,
  isScreenshotType,
} from "./utils.ts";

const bot = new Telegraf<BotContext>(config.telegram.token);

function wizardState(ctx: BotContext): WizardSession {
  // Telegraf exposes wizard.state as `object`, so narrow it once here.
  return ctx.wizard.state as WizardSession;
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

  if (!photoFileId) {
    await ctx.reply("Please upload a screenshot image.");
    return;
  }

  if (!screenshotType) {
    await ctx.reply("Please select the image type.");
    return;
  }

  const fileLink = await ctx.telegram.getFileLink(photoFileId);

  await ctx.reply("Screenshot received. Parsing now...");

  const result = await parseScreenshot(fileLink.href, screenshotType);
  console.log("Parsed screenshot data:", result);

  console.log("Received screenshot for date:", state.date);
  console.log("File link:", fileLink.href);

  await ctx.reply(formatParsedScreenshot(result), {
    parse_mode: "HTML",
  });
  await ctx.scene.leave();
}

async function askScreenshotType(ctx: BotContext) {
  await ctx.reply(
    "What type of image is it?",
    Markup.inlineKeyboard(
      SCREENSHOT_TYPES.map((type) => [
        Markup.button.callback(type.label, type.value),
      ]),
    ),
  );
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
      ctx.wizard.selectStep(3);
      await askScreenshotType(ctx);
      return;
    }

    if (choice === "date_yesterday") {
      state.date = formatDate(new Date(Date.now() - 86400000));
      state.expectsCustomDate = false;

      await ctx.reply("Great! You've selected yesterday.");
      ctx.wizard.selectStep(3);
      await askScreenshotType(ctx);
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
    }

    ctx.wizard.selectStep(3);
    await askScreenshotType(ctx);
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
    await processScreenshot(ctx, state);
    return;
  },
);
screenshotWizard.use(exitWizardMiddleware);

const stage = new Scenes.Stage<BotContext>([screenshotWizard]);
bot.use(session());
bot.use(stage.middleware());

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
