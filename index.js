const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TOKEN = "8828008114:AAH_KEYToEiQWicI6nJSHhdlBBw4Lgpg1hQ";
const API_URL = "https://gotosmmpanel.com/api/v2";
const API_KEY = "99b8fd97063632a2e6366b99bab95680fcaea172";
const bot = new TelegramBot(TOKEN, { polling: true });

const wallet = {};
const userState = {};

const services = {
  "A": "3536",
  "B": "3537",
  "C": "3538",
  "D": "3539",
  "E": "3540"
};

const ADMIN_ID = 6362089364;
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🤖 WhatsApp Vote Bot\n\nWelcome!",
    {
      reply_markup: {
  keyboard: [
    ["🗳 New Vote Order"],
    ["📦 Order Status"],
    ["💰 Wallet", "💳 Add Balance"]
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

// Wallet
if (text === "💰 Wallet") {
  return bot.sendMessage(chatId, `💰 Wallet: Rs ${wallet[chatId] || 0}`);
}

// Add Balance
if (text === "💳 Add Balance") {
  userState[chatId] = { step: "payment" };

  return bot.sendMessage(
    chatId,
    "💳 Easypaisa: 03XX\n💳 JazzCash: 03077321978\n\nPayment کے بعد Transaction ID بھیجیں۔"
  );
}

// Payment Request
if (userState[chatId]?.step === "payment") {
  bot.sendMessage(
    ADMIN_ID,
    `💰 New Payment Request

👤 User ID: ${chatId}
🧾 Transaction ID: ${text}`
  );

  delete userState[chatId];

  return bot.sendMessage(
    chatId,
    "✅ آپ کی Payment Request ایڈمن کو بھیج دی گئی ہے۔"
  );
}

if (text === "🗳 New Vote Order") {
  return bot.sendMessage(chatId, "Select Service", {
    reply_markup: {
      keyboard: [
        ["A", "B"],
        ["C", "D"],
        ["E"]
      ],
      resize_keyboard: true
    }
  });
}

if (services[text]) {
  userState[chatId] = {
    service: services[text],
    step: "link"
  };

  return bot.sendMessage(chatId, "📎 Send WhatsApp Vote Link:");
}
  if (userState[chatId]?.step === "link") {
    userState[chatId].link = text;
    userState[chatId].step = "quantity";
    return bot.sendMessage(chatId, "🔢 Enter Quantity:");
  }
const RATE = 1.87;
const price = quantity * RATE;

if ((wallet[chatId] || 0) < price) {
  delete userState[chatId];

  return bot.sendMessage(
    chatId,
    `❌ Wallet Balance کم ہے۔

💰 Wallet: Rs ${wallet[chatId] || 0}
💵 Required: Rs ${price.toFixed(2)}`
  );
}

wallet[chatId] -= price;

    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY);
      params.append("action", "add");
      params.append("service", userState[chatId].service);
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
