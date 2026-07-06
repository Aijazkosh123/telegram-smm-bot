const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// ====== SETTINGS ======
const TOKEN = "8697588276:AAHDKO40CGa9P27MxK4R3oSTMQaT8-S-grk";
const API_KEY = "d94eb912f4afd973184fee794264a7fb";
const API_URL = "https://yourpanel.com/api/v2";
const ADMIN_ID = 6362089364;
const RATE = 1.75; // 1 Vote = Rs 1.75 <- یہاں چینج کیا
const DEVELOPER = "Developer by Aijaz Kosh 03079257476";
const EASYPAISA = "03XX-XXXXXXX";
const JAZZCASH = "03077321978";

// ====== DATA ======
const bot = new TelegramBot(TOKEN, { polling: true });
const wallet = {};
const userVotes = {}; // نئی چیز: یوزر کے پاس کتنے ووٹ ہیں
const userState = {};
const pendingPayments = {};

const services = {
  "A": "3536",
  "B": "3537",
  "C": "3538",
  "D": "3539",
  "E": "3540"
};

// ====== CUSTOM FUNCTION ======
function sendKeyboard(chatId, text, buttons) {
  return bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { keyboard: buttons, resize_keyboard: true }
  });
}

// ====== KEYBOARDS ======
const mainMenu = [
  ["🗳 New Vote Order"],
  ["💰 Balance", "📦 Order Status"],
  ["💳 Add Balance"],
  [`👨‍💻 ${DEVELOPER}`]
];

const serviceMenu = [
  ["A", "B"],
  ["C", "D"],
  ["E"],
  ["⬅️ Back"]
];

// ====== /START ======
bot.onText(/\/start/, (msg) => {
  sendKeyboard(msg.chat.id, `🤖 *Welcome to WhatsApp Vote Bot*\nRate: Rs ${RATE} per Vote`, mainMenu);
});

// ====== ADMIN COMMANDS ======
bot.onText(/\/addbalance (.+) (.+)/, (msg, match) => {
  if (msg.chat.id!= ADMIN_ID) return;
  const userId = match[1];
  const amount = parseFloat(match[2]);
  if (isNaN(amount)) return bot.sendMessage(ADMIN_ID, "❌ فارمیٹ: /addbalance USERID AMOUNT");
  wallet[userId] = (wallet[userId] || 0) + amount;
  bot.sendMessage(ADMIN_ID, `✅ Rs ${amount} add کر دیے\n👤 User: ${userId}\n💰 New Balance: Rs ${wallet[userId].toFixed(2)}`);
  bot.sendMessage(userId, `✅ آپ کے Wallet میں Rs ${amount} add ہو گئے\n💰 New Balance: Rs ${wallet[userId].toFixed(2)}`);
});

// ====== MAIN HANDLER ======
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith("/")) return;

  // ===== ADMIN APPROVE/REJECT =====
  if (chatId == ADMIN_ID) {
    if (text.startsWith("✅ Approve")) {
      const userId = text.split(" ")[2];
      const amount = pendingPayments[userId];
      if (amount) {
        wallet[userId] = (wallet[userId] || 0) + amount;
        delete pendingPayments[userId];
        bot.sendMessage(userId, `✅ Payment Approved\n💰 Rs ${amount} Wallet میں add ہو گئے`);
        return sendKeyboard(ADMIN_ID, `✅ Rs ${amount} add کر دیے گئے User: ${userId}`, mainMenu);
      }
    }
    if (text.startsWith("❌ Reject")) {
      const userId = text.split(" ")[2];
      delete pendingPayments[userId];
      bot.sendMessage(userId, `❌ آپ کی Payment Reject کر دی گئی`);
      return sendKeyboard(ADMIN_ID, `❌ Payment Reject کر دی User: ${userId}`, mainMenu);
    }
  }

  // 1. BALANCE - اب ووٹ بھی دکھائے گا
  if (text === "💰 Balance") {
    const balance = wallet[chatId] || 0;
    const totalVotes = userVotes[chatId] || 0;
    return bot.sendMessage(chatId, `💰 *Your Account*\n\n💵 Balance: Rs ${balance.toFixed(2)}\n🗳 Total Votes Purchased: ${totalVotes}`, {parse_mode: "Markdown"});
  }

  // 2. ADD BALANCE
  if (text === "💳 Add Balance") {
    userState[chatId] = { step: "payment" };
    return bot.sendMessage(chatId, `💳 *Payment Methods:*\n*Easypaisa:* \`${EASYPAISA}\`\n*JazzCash:* \`${JAZZCASH}\`\n\nPayment کے بعد اس فارمیٹ میں بھیجیں:\n\`TXN_ID AMOUNT\``, {parse_mode: "Markdown"});
  }

  // 3. PAYMENT RECEIVED
  if (userState[chatId]?.step === "payment") {
    const parts = text.split(" ");
    const txnId = parts[0];
    const amount = parseFloat(parts[1]);
    if (!amount || isNaN(amount) || amount < 100) {
      return bot.sendMessage(chatId, "❌ صحیح فارمیٹ: `TXN_ID AMOUNT`\nMin: 100", {parse_mode: "Markdown"});
    }
    pendingPayments[chatId] = amount;
    bot.sendMessage(ADMIN_ID, `💰 *New Payment Request*\n👤 User: \`${chatId}\`\n🧾 Txn: \`${txnId}\`\n💵 Amount: Rs ${amount}`, {
      parse_mode: "Markdown",
      reply_markup: { keyboard: [[`✅ Approve ${chatId}`], [`❌ Reject ${chatId}`]], resize_keyboard: true }
    });
    delete userState[chatId];
    return sendKeyboard(chatId, "✅ Request ایڈمن کو بھیج دی۔ Approval کے بعد Balance add ہو گا", mainMenu);
  }

  // 4. NEW ORDER
  if (text === "🗳 New Vote Order") {
    return sendKeyboard(chatId, `📋 *Service Select کریں:*\nRate: Rs ${RATE} per Vote`, serviceMenu);
  }

  // 5. SERVICE
  if (services[text]) {
    userState[chatId] = { service: services[text], step: "link" };
    return bot.sendMessage(chatId, "📎 *WhatsApp Group Link بھیجیں:*", {parse_mode: "Markdown"});
  }

  // 6. LINK
  if (userState[chatId]?.step === "link") {
    userState[chatId].link = text;
    userState[chatId].step = "quantity";
    return bot.sendMessage(chatId, `🔢 *Quantity بتائیں:*\nMin: 100\nRate: Rs ${RATE} per vote`, {parse_mode: "Markdown"});
  }

  // 7. QUANTITY + PLACE ORDER
  if (userState[chatId]?.step === "quantity") {
    const quantity = parseInt(text);
    if (isNaN(quantity) || quantity < 100) return bot.sendMessage(chatId, "❌ Min 100 Quantity");

    const price = quantity * RATE; // اب 1.75 سے حساب ہوگا
    const balance = wallet[chatId] || 0;

    if (balance < price) {
      delete userState[chatId];
      return sendKeyboard(chatId, `❌ *Balance کم ہے*\n💰 Balance: Rs ${balance.toFixed(2)}\n💵 Need: Rs ${price.toFixed(2)}`, mainMenu);
    }

    wallet[chatId] -= price;
    userVotes[chatId] = (userVotes[chatId] || 0) + quantity; // ووٹ count بڑھا دو

    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY);
      params.append("action", "add");
      params.append("service", userState[chatId].service);
      params.append("link", userState[chatId].link);
      params.append("quantity", quantity);

      const res = await axios.post(API_URL, params);

      if (res.data.order) {
        delete userState[chatId];
        return sendKeyboard(chatId, `✅ *Order Placed*\n\n🆔 Order ID: \`${res.data.order}\`\n🗳 Votes: ${quantity}\n💵 Price: Rs ${price.toFixed(2)}\n💰 New Balance: Rs ${wallet[chatId].toFixed(2)}\n📊 Total Votes: ${userVotes[chatId]}`, mainMenu);
      } else {
        wallet[chatId] += price; // refund
        userVotes[chatId] -= quantity;
        delete userState[chatId];
        return sendKeyboard(chatId, `❌ Failed: ${res.data.error}`, mainMenu);
      }
    } catch (e) {
      wallet[chatId] += price; // refund
      userVotes[chatId] -= quantity;
      delete userState[chatId];
      return sendKeyboard(chatId, "❌ API Error. پیسے واپس", mainMenu);
    }
  }

  // 8. ORDER STATUS
  if (text === "📦 Order Status") {
    userState[chatId] = { step: "status" };
    return bot.sendMessage(chatId, "🆔 *Order ID بھیجیں:*", {parse_mode: "Markdown"});
  }

  if (userState[chatId]?.step === "status") {
    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY);
      params.append("action", "status");
      params.append("order", text);
      const res = await axios.post(API_URL, params);
      delete userState[chatId];
      return sendKeyboard(chatId, `📦 *Order Status*\n\n🆔 \`${text}\`\n📊 Status: ${res.data.status}\n👥 Start: ${res.data.start_count}\n✅ Remains: ${res.data.remains}`, mainMenu);
    } catch (e) {
      delete userState[chatId];
      return sendKeyboard(chatId, "❌ غلط Order ID", mainMenu);
    }
  }

  // 9. DEVELOPER
  if (text.includes(DEVELOPER)) {
    return bot.sendMessage(chatId, `👨‍💻 *${DEVELOPER}*`, {parse_mode: "Markdown"});
  }

  // 10. BACK
  if (text === "⬅️ Back") {
    delete userState[chatId];
    return sendKeyboard(chatId, "🏠 *Main Menu*", mainMenu);
  }
});

console.log("✅ TeleBothos Bot Started...");
console.log(`Rate: Rs ${RATE} per Vote`);
