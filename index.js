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
    "🤖 *WhatsApp Vote Bot*\n\nWelcome 
    Software by Aijaz Kosh!",
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
        const rate = 280;
const pkr = (parseFloat(res.data.balance) * rate).toFixed(2);

bot.sendMessage(
  chatId,
  `💰 Wallet: Rs ${pkr}`
);
      );
    } catch (err) {
      return bot.sendMessage(chatId, "❌ API Error");
    }
  }

if (userState[chatId]?.step === "link") {
  userState[chatId].link = text;
  userState[chatId].step = "quantity";
  return bot.sendMessage(chatId, "🔢 Enter Quantity (20-100000):");
}

if (userState[chatId]?.step === "quantity") {
  const quantity = parseInt(text);

  if (isNaN(quantity) || quantity < 10 || quantity > 100000) {
    return bot.sendMessage(chatId, "❌ Quantity must be between 10 and 100000.");
  }

  userState[chatId].quantity = quantity;

  return bot.sendMessage(
    chatId,
    `✅ Order Ready

📎 Link: ${userState[chatId].link}
🗳 Votes: ${quantity}`
  );
}

console.log("✅ Bot Started...");
