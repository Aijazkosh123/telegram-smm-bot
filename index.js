const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// ====== SETTINGS ======
const TOKEN = "8697588276:AAFHxabH-xSrGP_xHTfnxYiesek7AoR0eL0";
const API_KEY = "d94eb912f4afd973184fee794264a7fb";
const API_URL = "https://cheappakpanel.com/api/v2";
const ADMIN_ID = 6362089364;
let RATE = 1.75; // اب یہ Admin change کر سکے گا
const MIN_VOTE = 10; // <<< 10 کر دیا
const DEVELOPER = "Developer by Aijaz Kosh 03079257476";
const EASYPAISA = "03XX-XXXXXXX";
const JAZZCASH = "03077321978";

// ====== DATA ======
const bot = new TelegramBot(TOKEN, { polling: true });
const wallet = {};
const userVotes = {};
const userState = {};
const pendingPayments = {};
const userOrders = {};
const pendingOrders = {}; // <<< Admin approval کے لیے

const services = {
  "A": "14420", // Answer 1
  "B": "14421", // Answer 2
  "C": "14422", // Answer 3
  "D": "14423", // Answer 4
  "E": "14424" // Answer 5
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

const adminMenu = [
  ["📋 Pending Payments"],
  ["📦 Pending Orders"], // <<< نیا
  ["📦 All User Orders"],
  ["⚙️ Set Rate"], // <<< نیا
  ["⬅️ Back"]
];

const serviceMenu = [
  ["A - Answer 1", "B - Answer 2"],
  ["C - Answer 3", "D - Answer 4"],
  ["E - Answer 5"],
  ["⬅️ Back"]
];

// ====== /START ======
bot.onText(/\/start/, (msg) => {
  if(msg.chat.id == ADMIN_ID){
    return sendKeyboard(msg.chat.id, `👑 *Admin Panel*\nRate: Rs ${RATE} per Vote`, adminMenu);
  }
  sendKeyboard(msg.chat.id, `🤖 *Welcome to WhatsApp Vote Bot*\nRate: Rs ${RATE} per Vote\nMin Order: ${MIN_VOTE} Votes`, mainMenu);
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

  // ===== ADMIN PANEL =====
  if(chatId == ADMIN_ID){
    if(text === "📋 Pending Payments"){
      const pending = Object.keys(pendingPayments);
      if(pending.length === 0) return bot.sendMessage(ADMIN_ID, "❌ کوئی Pending Payment نہیں");
      let list = "📋 *Pending Payments:*\n\n";
      pending.forEach(id => {
        list += `👤 User: \`${id}\`\n💵 Amount: Rs ${pendingPayments[id]}\n\n`;
      });
      return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"});
    }
    if(text === "📦 Pending Orders"){ // <<< نیا
      const pending = Object.keys(pendingOrders);
      if(pending.length === 0) return bot.sendMessage(ADMIN_ID, "❌ کوئی Pending Order نہیں");
      let list = "📦 *Pending Orders - Price Set کریں:*\n\n";
      pending.forEach(id => {
        let o = pendingOrders[id];
        list += `👤 User: \`${id}\`\n🆔 Order: \`${o.orderId}\`\n🗳 Qty: ${o.qty}\n📎 Link: ${o.link}\n\n`;
      });
      list += "Price set کرنے کے لیے لکھیں:\n`/price USERID PRICE`";
      return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"});
    }
    if(text === "📦 All User Orders"){
      const users = Object.keys(userOrders);
      if(users.length === 0) return bot.sendMessage(ADMIN_ID, "❌ ابھی تک کوئی آرڈر نہیں");
      let list = "📦 *All User Orders:*\n\n";
      users.forEach(id => {
        list += `👤 User: \`${id}\`\n🗳 Total Orders: ${userOrders[id].length}\n\n`;
      });
      return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"});
    }
    if(text === "⚙️ Set Rate"){ // <<< نیا
      userState[chatId] = { step: "setrate" };
      return bot.sendMessage(ADMIN_ID, `موجودہ Rate: Rs ${RATE}\n\nنیا Rate لکھیں:`, {parse_mode: "Markdown"});
    }
    if(text === "⬅️ Back"){
      return sendKeyboard(ADMIN_ID, "👑 *Admin Panel*", adminMenu);
    }
  }

  // ===== ADMIN SET RATE =====
  if(userState[chatId]?.step === "setrate" && chatId == ADMIN_ID){
    const newRate = parseFloat(text);
    if(isNaN(newRate)) return bot.sendMessage(ADMIN_ID, "❌ صحیح نمبر لکھیں");
    RATE = newRate;
    delete userState[chatId];
    return sendKeyboard(ADMIN_ID, `✅ Rate update ہو گیا: Rs ${RATE} per Vote`, adminMenu);
  }

  // ===== ADMIN APPROVE/REJECT PAYMENT =====
  if (chatId == ADMIN_ID) {
    if (text.startsWith("✅ Approve")) {
      const userId = text.split(" ")[2];
      const amount = pendingPayments[userId];
      if (amount) {
        wallet[userId] = (wallet[userId] || 0) + amount;
        delete pendingPayments[userId];
        bot.sendMessage(userId, `✅ Payment Approved\n💰 Rs ${amount} Wallet میں add ہو گئے`);
        return sendKeyboard(ADMIN_ID, `✅ Rs ${amount} add کر دیے گئے User: ${userId}`, adminMenu);
      }
    }
    if (text.startsWith("❌ Reject")) {
      const userId = text.split(" ")[2];
      delete pendingPayments[userId];
      bot.sendMessage(userId, `❌ آپ کی Payment Reject کر دی گئی`);
      return sendKeyboard(ADMIN_ID, `❌ Payment Reject کر دی User: ${userId}`, adminMenu);
    }
  }

  // ===== ADMIN SET ORDER PRICE =====
  if (text.startsWith("/price") && chatId == ADMIN_ID) {
    const parts = text.split(" ");
    const userId = parts[1];
    const price = parseFloat(parts[2]);
    if(!pendingOrders[userId]) return bot.sendMessage(ADMIN_ID, "❌ اس User کا کوئی Pending Order نہیں");
    if(isNaN(price)) return bot.sendMessage(ADMIN_ID, "❌ فارمیٹ: /price USERID PRICE");

    let order = pendingOrders[userId];
    order.price = price; // Admin نے price set کر دی

    // User کو approve کے لیے بھیجو
    bot.sendMessage(userId, `📦 *Order Confirmation*\n🗳 Qty: ${order.qty}\n💵 Price: Rs ${price.toFixed(2)}\n\nApprove کرنے کے لیے \`yes\` لکھیں\nCancel کے لیے \`no\` لکھیں`, {parse_mode: "Markdown"});

    sendKeyboard(ADMIN_ID, `✅ Price Rs ${price} set کر دی گئی User: ${userId}`, adminMenu);
  }

  // ===== USER APPROVE ORDER =====
  if(text.toLowerCase() === "yes" && pendingOrders[chatId]){
    let order = pendingOrders[chatId];
    if(wallet[chatId] < order.price){
      delete pendingOrders[chatId];
      return sendKeyboard(chatId, `❌ Balance کم ہے۔ Price: Rs ${order.price}`, mainMenu);
    }
    wallet[chatId] -= order.price;
    userVotes[chatId] = (userVotes[chatId] || 0) + order.qty;

    // API کو order بھیجو
    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY);
      params.append("action", "add");
      params.append("service", order.service);
      params.append("link", order.link);
      params.append("quantity", order.qty);
      const res = await axios.post(API_URL, params);

      if (res.data.order) {
        if(!userOrders[chatId]) userOrders[chatId] = [];
        userOrders[chatId].push({orderId: res.data.order,
// ====== KEYBOARDS ======
const mainMenu = [
  ["🗳 New Vote Order"],
  ["💰 Balance", "📦 Order Status"],
  ["💳 Add Balance"],
  [`👨‍💻 ${DEVELOPER}`]
];

const adminMenu = [
  ["📋 Pending Payments"],
  ["📦 All User Orders"],
  ["⬅️ Back"]
];

const serviceMenu = [
  ["A - Answer 1", "B - Answer 2"],
  ["C - Answer 3", "D - Answer 4"],
  ["E - Answer 5"],
  ["⬅️ Back"]
];

// ====== /START ======
bot.onText(/\/start/, (msg) => {
  if(msg.chat.id == ADMIN_ID){
    return sendKeyboard(msg.chat.id, `👑 *Admin Panel*\nRate: Rs ${RATE} per Vote`, adminMenu);
  }
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

  // ===== ADMIN PANEL =====
  if(chatId == ADMIN_ID){
    if(text === "📋 Pending Payments"){
      const pending = Object.keys(pendingPayments);
      if(pending.length === 0) return bot.sendMessage(ADMIN_ID, "❌ کوئی Pending Payment نہیں");
      let list = "📋 *Pending Payments:*\n\n";
      pending.forEach(id => {
        list += `👤 User: \`${id}\`\n💵 Amount: Rs ${pendingPayments[id]}\n\n`;
      });
      return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"});
    }
    if(text === "📦 All User Orders"){
      const users = Object.keys(userOrders);
      if(users.length === 0) return bot.sendMessage(ADMIN_ID, "❌ ابھی تک کوئی آرڈر نہیں");
      let list = "📦 *All User Orders:*\n\n";
      users.forEach(id => {
        list += `👤 User: \`${id}\`\n🗳 Total Orders: ${userOrders[id].length}\n\n`;
      });
      return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"});
    }
    if(text === "⬅️ Back"){
      return sendKeyboard(ADMIN_ID, "👑 *Admin Panel*", adminMenu);
    }
  }

  // ===== ADMIN APPROVE/REJECT =====
  if (chatId == ADMIN_ID) {
    if (text.startsWith("✅ Approve")) {
      const userId = text.split(" ")[2];
      const amount = pendingPayments[userId];
      if (amount) {
        wallet[userId] = (wallet[userId] || 0) + amount;
        delete pendingPayments[userId];
        bot.sendMessage(userId, `✅ Payment Approved\n💰 Rs ${amount} Wallet میں add ہو گئے`);
        return sendKeyboard(ADMIN_ID, `✅ Rs ${amount} add کر دیے گئے User: ${userId}`, adminMenu);
      }
    }
    if (text.startsWith("❌ Reject")) {
      const userId = text.split(" ")[2];
      delete pendingPayments[userId];
      bot.sendMessage(userId, `❌ آپ کی Payment Reject کر دی گئی`);
      return sendKeyboard(ADMIN_ID, `❌ Payment Reject کر دی User: ${userId}`, adminMenu);
    }
  }

  // 1. BALANCE
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
      reply_markup: { keyboard: [[`✅ Approve ${chatId}`], [`❌ Reject ${chatId}`], ["⬅️ Back"]], resize_keyboard: true }
    });
    delete userState[chatId];
    return sendKeyboard(chatId, "✅ Request ایڈمن کو بھیج دی۔ Approval کے بعد Balance add ہو گا", mainMenu);
  }

  // 4. NEW ORDER
  if (text === "🗳 New Vote Order") {
    return sendKeyboard(chatId, `📋 *Service Select کریں:*\nRate: Rs ${RATE} per Vote`, serviceMenu);
  }

  // 5. SERVICE - اب A B C D E سب چیک ہوگا
  if (text.startsWith("A") || text.startsWith("B") || text.startsWith("C") || text.startsWith("D") || text.startsWith("E")) {
    const option = text.split(" ")[0];
    userState[chatId] = { service: services[option], serviceName: option, step: "link" };
    return bot.sendMessage(chatId, `📎 *WhatsApp Poll Link بھیجیں:*\nآپ نے Select کیا: *${option}*`, {parse_mode: "Markdown"});
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

    const price = quantity * RATE;
    const balance = wallet[chatId] || 0;

    if (balance < price) {
      delete userState[chatId];
      return sendKeyboard(chatId, `❌ *Balance کم ہے*\n💰 Balance: Rs ${balance.toFixed(2)}\n💵 Need: Rs ${price.toFixed(2)}`, mainMenu);
    }

    wallet[chatId] -= price;
    userVotes[chatId] = (userVotes[chatId] || 0) + quantity;

    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY);
      params.append("action", "add");
      params.append("service", userState[chatId].service);
      params.append("link", userState[chatId].link);
      params.append("quantity", quantity);

      const res = await axios.post(API_URL, params);

      if (res.data.order) {
        if(!userOrders[chatId]) userOrders[chatId] = [];
        userOrders[chatId].push({orderId: res.data.order, service: userState[chatId].serviceName, link: userState[chatId].link, qty: quantity});

        bot.sendMessage(ADMIN_ID, `🆕 *New Order Placed*\n👤 User: \`${chatId}\`\n🆔 Order ID: \`${res.data.order}\`\n📦 Service: ${userState[chatId].serviceName} = ${userState[chatId].service}\n🔗 Link: ${userState[chatId].link}\n🗳 Qty: ${quantity}\n💵 Price: Rs ${price.toFixed(2)}`, {parse_mode: "Markdown"});

        delete userState[chatId];
        return sendKeyboard(chatId, `✅ *Order Placed*\n\n🆔 Order ID: \`${res.data.order}\`\n🗳 Votes: ${quantity}\n💵 Price: Rs ${price.toFixed(2)}\n💰 New Balance: Rs ${wallet[chatId].toFixed(2)}\n📊 Total Votes: ${userVotes[chatId]}`, mainMenu);
      } else {
        wallet[chatId] += price;
        userVotes[chatId] -= quantity;
        delete userState[chatId];
        return sendKeyboard(chatId, `❌ Failed: ${res.data.error}`, mainMenu);
      }
    } catch (e) {
      wallet[chatId] += price;
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
    if(chatId == ADMIN_ID){
      return sendKeyboard(chatId, "👑 *Admin Panel*", adminMenu);
    }
    return sendKeyboard(chatId, "🏠 *Main Menu*", mainMenu);
  }
});

console.log("✅ TeleBothos Bot Started...");
console.log(`Rate: Rs ${RATE} per Vote`);
