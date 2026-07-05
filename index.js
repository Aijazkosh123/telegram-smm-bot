const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🤖 Welcome!\n\nCommands:\n/balance"
  );
});

bot.onText(/\/balance/, async (msg) => {
  try {
    const params = new URLSearchParams();
    params.append("key", API_KEY);
    params.append("action", "balance");

    const res = await axios.post(API_URL, params);

    bot.sendMessage(
      msg.chat.id,
      `💰 Balance: ${res.data.balance} ${res.data.currency}`
    );
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ API Error");
  }
});

console.log("Bot Started...");
