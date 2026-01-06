import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

export const bot = new Client({
  intents: [GatewayIntentBits.Guilds]
});

bot.once("ready", () => {
  console.log("🤖 Bot conectado como", bot.user.tag);
});

export async function logMessage(channelId, content) {
  try {
    const channel = await bot.channels.fetch(channelId);
    if (channel) await channel.send(content);
  } catch (e) {
    console.error("❌ Error enviando log:", e);
  }
}

bot.login(process.env.BOT_TOKEN)
  .catch(err => console.error("❌ Error login bot:", err));
