import { Telegraf } from "telegraf";
import config from "./config.ts";
import { message } from "telegraf/filters";
import { updateState } from "./state/stateStore.ts";

const bot = new Telegraf(config.telegram.token);

bot.start((ctx) => {
  const userId = ctx.from.id;

  updateState(userId, {
    awaitingImage: false,
  });

  ctx.reply("Send a fitness screenshot.");
});

bot.on(message("photo"), async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;

  //   console.log("User:", userId);
  //   console.log("Username:", username);
  const photo = ctx.message.photo.at(-1);

  if (!photo) {
    await ctx.reply("No photo found in the message.");
    return;
  }

  const fileLink = await ctx.telegram.getFileLink(photo.file_id);

  console.log(fileLink.href);

  await ctx.reply("Screenshot received. Parsing now...");
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
