const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TOKEN = "8828008114:AAH_KEYToEiQWicI6nJSHhdlBBw4Lgpg1hQ";
const API_URL = "https://gotosmmpanel.com/api/v2";
const API_KEY = "6c9b8f11e3050e5157ccbac4efa9d9fffcba4efc";
const SERVICE_ID = "3536";

const bot = new TelegramBot(TOKEN, {
  polling: true,
});

let userState = {};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🤖 *WhatsApp Vote Bot*\n\nWelcome!",
    {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [
          ["🗳 New Vote Order"],
          ["📦 Order Status"],
          ["💰 Balance"]
        ],
        resize_keyboard: true
      }
    }
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "💰 Balance") {
    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY);
      params.append("action", "balance");

      const res = await axios.post(API_URL, params);

      return bot.sendMessage(
        chatId,
        `💰 Balance: ${res.data.balance} ${res.data.currency}`
      );
    } catch (err) {
      return bot.sendMessage(chatId, "❌ API Error");
    }
  }

  if (text === "🗳 New Vote Order") {
    userState[chatId] = { step: "link" };
    return bot.sendMessage(chatId, "📎 Send WhatsApp Poll Link:");
  }
});

console.log("✅ Bot Started...");
