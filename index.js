const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TOKEN = "8828008114:AAH_KEYToEiQWicI6nJSHhdlBBw4Lgpg1hQ";
const API_URL = "https://gotosmmpanel.com/api/v2";
const API_KEY = "e2cd27de7d4a9ca720fe1991a5e9b128092bc9fd";

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
    console.error(e.response?.data || e.message);
    bot.sendMessage(msg.chat.id, "❌ API Error");
  }
});

console.log("Bot Started...");
