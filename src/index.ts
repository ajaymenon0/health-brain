import { Markup, Scenes, session, Telegraf } from "telegraf";
import config from "./config.ts";
import { WizardScene } from "telegraf/scenes";
import type { BotContext, WizardSession } from "./types/botContext.ts";

const bot = new Telegraf<BotContext>(config.telegram.token);

type DateChoice = "date_today" | "date_yesterday" | "date_custom";
const DATE_CHOICES = new Set<DateChoice>([
  "date_today",
  "date_yesterday",
  "date_custom",
]);

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}${mm}${yyyy}`;
}

function isDateChoice(value: string): value is DateChoice {
  return DATE_CHOICES.has(value as DateChoice);
}

function wizardState(ctx: BotContext): WizardSession {
  // Telegraf exposes wizard.state as `object`, so narrow it once here.
  return ctx.wizard.state as WizardSession;
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
      await ctx.reply("Please upload the screenshot now.");
      return;
    }

    if (choice === "date_yesterday") {
      state.date = formatDate(new Date(Date.now() - 86400000));
      state.expectsCustomDate = false;

      await ctx.reply("Great! You've selected yesterday.");
      ctx.wizard.selectStep(3);
      await ctx.reply("Please upload the screenshot now.");
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
    await ctx.reply("Please upload the screenshot now.");
    return;
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

    const fileLink = await ctx.telegram.getFileLink(photo.file_id);

    console.log("Received screenshot for date:", state.date);
    console.log("File link:", fileLink.href);

    await ctx.reply("Screenshot received. Parsing now...");
    return ctx.scene.leave();
  },
);

const stage = new Scenes.Stage<BotContext>([screenshotWizard]);
bot.use(session());
bot.use(stage.middleware());

bot.command("upload", (ctx) => ctx.scene.enter("screenshot-wizard"));

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
