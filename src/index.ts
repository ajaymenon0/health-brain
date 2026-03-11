import { Markup, Scenes, session, Telegraf } from "telegraf";
import config from "./config.ts";
import { WizardScene } from "telegraf/scenes";
import type { BotContext } from "./types/botContext.ts";

const bot = new Telegraf<BotContext>(config.telegram.token);

export const screenshotWizard = new WizardScene<any>(
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
    await ctx.editMessageReplyMarkup();

    const choice = ctx.callbackQuery.data;

    if (choice === "date_today") {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      ctx.wizard.state.date = `${dd}${mm}${yyyy}`;

      await ctx.reply("Great! You've selected today.");
      ctx.wizard.selectStep(3);
      await ctx.reply("Please upload the screenshot now.");
      return;
    }

    if (choice === "date_yesterday") {
      const yesterday = new Date(Date.now() - 86400000);
      const dd = String(yesterday.getDate()).padStart(2, "0");
      const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
      const yyyy = yesterday.getFullYear();
      ctx.wizard.state.date = `${dd}${mm}${yyyy}`;

      await ctx.reply("Great! You've selected yesterday.");
      ctx.wizard.selectStep(3);
      await ctx.reply("Please upload the screenshot now.");
      return;
    }

    if (choice === "date_custom") {
      ctx.wizard.state.date = "date_custom";
      await ctx.reply("Please enter the date in ddmmyyyy format.");
      return ctx.wizard.next();
    }

    await ctx.reply("Please select a valid option.");
  },
  async (ctx) => {
    console.log("Wizard state before processing date:", ctx.wizard.state);
    if (ctx.wizard.state.date === "date_custom") {
      const text = ctx.message?.text;
      // check if text is in ddmmyyyy format
      if (!text || !/^\d{2}\d{2}\d{4}$/.test(text)) {
        await ctx.reply(
          "Invalid date format. Please enter the date in ddmmyyyy format.",
        );
        return;
      }

      ctx.wizard.state.date = text;
    }
    ctx.wizard.selectStep(3);
    await ctx.reply("Please upload the screenshot now.");
    return;
  },
  async (ctx) => {
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

    console.log("Received screenshot for date:", ctx.wizard.state.date);
    console.log("File link:", fileLink.href);

    await ctx.reply("Screenshot received. Parsing now...");
    return ctx.scene.leave();
  },
);

const stage = new Scenes.Stage([screenshotWizard]);
bot.use(session());
bot.use(stage.middleware());

bot.command("upload", (ctx) => ctx.scene.enter("screenshot-wizard"));

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
