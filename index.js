const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TOKEN = "8828008114:AAH_KEYToEiQWicI6nJSHhdlBBw4Lgpg1hQ";
const API_URL = "https://gotosmmpanel.com/api/v2";
const API_KEY = "6c9b8f11e3050e5157ccbac4efa9d9fffcba4efc";
const SERVICE_ID = "3536";

const bot = new TelegramBot(TOKEN, { polling: true });

const userState = {};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🤖 WhatsApp Vote Bot\n\nWelcome!",
    {
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

  if (text === "/start") return;

  // Balance
  if (text === "💰 Balance") {
    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY);
      params.append("action", "balance");

      const res = await axios.post(API_URL, params);

      const rate = 280;
      const pkr = (parseFloat(res.data.balance) * rate).toFixed(2);

      return bot.sendMessage(chatId, `💰 Wallet: Rs ${pkr}`);
    } catch (e) {
      return bot.sendMessage(chatId, "❌ Balance Error");
    }
  }

  // New Order
  if (text === "🗳 New Vote Order") {
    userState[chatId] = { step: "link" };
    return bot.sendMessage(chatId, "📎 Send WhatsApp Vote Link:");
  }

  if (userState[chatId]?.step === "link") {
    userState[chatId].link = text;
    userState[chatId].step = "quantity";
    return bot.sendMessage(chatId, "🔢 Enter Quantity:");
  }

  if (userState[chatId]?.step === "quantity") {
    const quantity = parseInt(text);

    if (isNaN(quantity) || quantity < 10 || quantity > 100000) {
      return bot.sendMessage(chatId, "❌ Quantity 10-100000 ہونی چاہیے۔");
    }

    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY);
      params.append("action", "add");
      params.append("service", SERVICE_ID);
      params.append("link", userState[chatId].link);
      params.append("quantity", quantity);

      const res = await axios.post(API_URL, params);

      delete userState[chatId];

      if (res.data.order) {
        return bot.sendMessage(
          chatId,
          `✅ Order Placed\n\n🆔 Order ID: ${res.data.order}`
        );
      } else {
        return bot.sendMessage(chatId, `❌ ${JSON.stringify(res.data)}`);
      }
    } catch (e) {
      return bot.sendMessage(chatId, "❌ Order Failed");
    }
  }

  // Order Status
  if (text === "📦 Order Status") {
    userState[chatId] = { step: "status" };
    return bot.sendMessage(chatId, "🆔 Send Order ID:");
  }

  if (userState[chatId]?.step === "status") {
    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY);
      params.append("action", "status");
      params.append("order", text);

      const res = await axios.post(API_URL, params);

      delete userState[chatId];

      return bot.sendMessage(
        chatId,
        `📦 Status: ${res.data.status}\n👥 Start: ${res.data.start_count}\n✅ Remains: ${res.data.remains}`
      );
    } catch (e) {
      return bot.sendMessage(chatId, "❌ Status Error");
    }
  }
});

console.log("✅ Bot Started...");
