const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TOKEN = "8828008114:AAH_KEYToEiQWicI6nJSHhdlBBw4Lgpg1hQ";
const API_URL = "https://gotosmmpanel.com/api/v2";
const API_KEY = "99b8fd97063632a2e6366b99bab95680fcaea172";

const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_ID = 6362089364;

const wallet = {};
const userState = {};

const services = {
  "A": "3536",
  "B": "3537",
  "C": "3538",
  "D": "3539",
  "E": "3540"
};

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
    return bot.sendMessage(
      chatId,
      `💰 Wallet Balance: Rs ${wallet[chatId] || 0}`
    );
  }

  // Add Balance
  if (text === "💳 Add Balance") {
    userState[chatId] = {
      step: "payment"
    };

    return bot.sendMessage(
      chatId,
      "💳 Easypaisa: 03XXXXXXXXX\n💳 JazzCash: 03077321978\n\nPayment کے بعد Transaction ID بھیجیں۔"
    );
  }

  // Payment Request
  if (userState[chatId]?.step === "payment") {

    bot.sendMessage(
      ADMIN_ID,
      `💰 New Payment Request

👤 User: ${chatId}
🧾 Transaction ID: ${text}

Approve:
/approve ${chatId} 500`
    );

    delete userState[chatId];

    return bot.sendMessage(
      chatId,
      "✅ Payment Request ایڈمن کو بھیج دی گئی ہے۔"
    );
  }

  // New Order
  if (text === "🗳 New Vote Order") {

    return bot.sendMessage(
      chatId,
      "Select Service",
      {
        reply_markup: {
          keyboard: [
            ["A","B"],
            ["C","D"],
            ["E"]
          ],
          resize_keyboard: true
        }
      }
    );
  }
  // Service Select
if (services[text]) {
  userState[chatId] = {
    service: services[text],
    step: "link"
  };

  return bot.sendMessage(chatId, "📎 Send WhatsApp Vote Link:");
}

// Link
if (userState[chatId]?.step === "link") {
  userState[chatId].link = text;
  userState[chatId].step = "quantity";

  return bot.sendMessage(chatId, "🔢 Enter Quantity:");
}

// Quantity
if (userState[chatId]?.step === "quantity") {

  const quantity = parseInt(text);

  if (isNaN(quantity) || quantity <= 0) {
    return bot.sendMessage(chatId, "❌ Invalid Quantity");
  }

  const RATE = 1.87;
  const price = quantity * RATE;

  if ((wallet[chatId] || 0) < price) {
    delete userState[chatId];

    return bot.sendMessage(
      chatId,
      `❌ Wallet Balance کم ہے

💰 Wallet: Rs ${wallet[chatId] || 0}
💵// ======================
// ORDER STATUS
// ======================

if (text === "📦 Order Status") {
  userState[chatId] = { step: "status" };
  return bot.sendMessage(chatId, "🆔 اپنا Order ID بھیجیں:");
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
      `📦 Order Status

🆔 ${text}
📊 Status : ${res.data.status}
👥 Start Count : ${res.data.start_count}
📉 Remains : ${res.data.remains}
💰 Charge : ${res.data.charge || "N/A"}`
    );
  } catch (err) {
    delete userState[chatId];
    return bot.sendMessage(chatId, "❌ Status Check Failed");
  }
});

// ======================
// ADMIN APPROVE
// Usage:
// /approve USER_ID AMOUNT
// ======================

bot.onText(/\/approve (\d+) (\d+)/, (msg, match) => {

  if (msg.from.id !== ADMIN_ID)
    return bot.sendMessage(msg.chat.id, "❌ Access Denied");

  const userId = Number(match[1]);
  const amount = Number(match[2]);

  wallet[userId] = (wallet[userId] || 0) + amount;

  bot.sendMessage(
    userId,
    `✅ Payment Approved

💰 Added: Rs ${amount}
💳 Wallet: Rs ${wallet[userId]}`
  );

  bot.sendMessage(msg.chat.id, "✅ Wallet Updated");
});

// ======================
// ADMIN REJECT
// Usage:
// /reject USER_ID
// ======================

bot.onText(/\/reject (\d+)/, (msg, match) => {

  if (msg.from.id !== ADMIN_ID)
    return bot.sendMessage(msg.chat.id, "❌ Access Denied");

  const userId = Number(match[1]);

  bot.sendMessage(
    userId,
    "❌ آپ کی Payment Request Reject کر دی گئی ہے۔"
  );

  bot.sendMessage(msg.chat.id, "✅ Request Rejected");
});

console.log("✅ WhatsApp Vote Bot Started...");

