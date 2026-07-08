const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");

// ====== SETTINGS ======
const TOKEN = "8697588276:AAFHxabH-xSrGP_xHTfnxYiesek7AoR0eL0";
const API_KEY = "d94eb912f4afd973184fee794264a7fb";
const API_URL = "https://cheappakpanel.com/api/v2";
const ADMIN_ID = 6362089364;
let RATE = 1.80;
const MIN_VOTE = 10;
const DEVELOPER = "Developer by Aijaz Kosh 03079257476";
const EASYPAISA = "03XX-XXXXXXX";
const JAZZCASH = "03077321978";
const DB_FILE = "./database.json";

// ====== DATA ======
const bot = new TelegramBot(TOKEN, { polling: true });
let wallet = {};
let userVotes = {};
let userState = {};
let pendingPayments = {};
let userOrders = {};
let userCustomPrice = {};
let userNames = {}; // <<< نیا: User کا نام save کرنے کے لیے
let botOrderCounter = 1000;

let services = {
  "A": "14420", "B": "14421", "C": "14422", "D": "14423", "E": "14424"
};

// ====== DATABASE FUNCTIONS ======
function loadDB() {
  if(fs.existsSync(DB_FILE)){
    const data = JSON.parse(fs.readFileSync(DB_FILE));
    wallet = data.wallet || {};
    userOrders = data.userOrders || {};
    userVotes = data.userVotes || {};
    userCustomPrice = data.userCustomPrice || {};
    userNames = data.userNames || {}; // <<< نیا
    RATE = data.RATE || 1.80;
    services = data.services || services;
    botOrderCounter = data.botOrderCounter || 1000;
    console.log("✅ Database Loaded");
  } else {
    console.log("📄 New Database Created");
  }
}

function saveDB() {
  const data = {wallet, userOrders, userVotes, userCustomPrice, userNames, RATE, services, botOrderCounter}; // <<< userNames add
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

setInterval(saveDB, 30000);
loadDB();

function sendKeyboard(chatId, text, buttons) {
  return bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { keyboard: buttons, resize_keyboard: true }
  });
}

// ====== نیا Admin Menu ======
const mainMenu = [["🗳 New Vote Order"],["💰 Balance", "📦 Order Status"],["💳 Add Balance"],[`👨‍💻 ${DEVELOPER}`]];
const adminMenu = [["👥 All Users"],["💰 Users Balance"],["📋 Pending Payments"],["📦 All User Orders"],["⚙️ Settings"],["⬅️ Back"]]; // <<< 2 نئے بٹن
const settingsMenu = [["⚙️ Set Rate"],["💰 Set Price"],["🔧 Change Service ID"],["⬅️ Back"]];
const serviceMenu = [["A - Answer 1", "B - Answer 2"],["C - Answer 3", "D - Answer 4"],["E - Answer 5"],["⬅️ Back"]];

// ====== /START ======
bot.onText(/\/start/, (msg) => {
  // User کا نام save کر لو
  userNames[msg.chat.id] = msg.from.first_name + (msg.from.last_name? " + msg.from.last_name : "");
  saveDB(); // <<< SAVE

  if(msg.chat.id == ADMIN_ID){
    return sendKeyboard(msg.chat.id, `👑 *Admin Panel*\nDefault Rate: Rs ${RATE} per Vote\n*Commands:*\n\`/msg USERID MSG\`\n\`/changeid OLDID NEWID\`\n\`/setprice USERID PRICE\`\n\`/userinfo USERID\``, adminMenu); // <<< نیا کمانڈ
  }
  let currentRate = userCustomPrice[msg.chat.id] || RATE;
  sendKeyboard(msg.chat.id, `🤖 *Welcome to Vote Bot*\nآپ کا Rate: Rs ${currentRate} per Vote\nMin Order: ${MIN_VOTE} Votes`, mainMenu);
});

// ====== ADMIN COMMANDS ======
bot.onText(/\/addbalance (.+) (.+)/, (msg, match) => {
  if (msg.chat.id!= ADMIN_ID) return;
  const userId = match[1]; const amount = parseFloat(match[2]);
  wallet[userId] = (wallet[userId] || 0) + amount;
  saveDB();
  bot.sendMessage(ADMIN_ID, `✅ Rs ${amount} add کر دیے\n👤 User: ${userId}\n💰 New Balance: Rs ${wallet[userId].toFixed(2)}`);
  bot.sendMessage(userId, `✅ آپ کے Wallet میں Rs ${amount} add ہو گئے\n💰 New Balance: Rs ${wallet[userId].toFixed(2)}`);
});

bot.onText(/\/setprice (.+) (.+)/, (msg, match) => {
  if (msg.chat.id!= ADMIN_ID) return;
  const userId = match[1]; const price = parseFloat(match[2]);
  userCustomPrice[userId] = price;
  saveDB();
  bot.sendMessage(ADMIN_ID, `✅ Admin Price Set ہو گئی\n👤 ${userId}\n💵 Per Vote: Rs ${price}`);
  bot.sendMessage(userId, `👑 Admin نے آپ کے لیے خاص Price لگائی\n💵 Per Vote: Rs ${price}`);
});

bot.onText(/\/userinfo (.+)/, (msg, match) => { // <<< نیا کمانڈ
  if (msg.chat.id!= ADMIN_ID) return;
  const userId = match[1];
  const name = userNames[userId] || "Unknown";
  const balance = wallet[userId] || 0;
  const votes = userVotes[userId] || 0;
  const orders = userOrders[userId]?.length || 0;
  const rate = userCustomPrice[userId] || RATE;
  bot.sendMessage(ADMIN_ID, `👤 *User Info*\n\n*Name:* ${name}\n*ID:* \`${userId}\`\n💰 *Balance:* Rs ${balance.toFixed(2)}\n🗳 *Total Votes:* ${votes}\n📦 *Total Orders:* ${orders}\n💵 *Rate:* Rs ${rate}/vote`, {parse_mode: "Markdown"});
});

bot.onText(/\/msg (.+) (.+)/, (msg, match) => {
  if (msg.chat.id!= ADMIN_ID) return;
  const userId = match[1]; const message = match[2];
  bot.sendMessage(userId, `📢 *Admin Message:*\n\n${message}`, {parse_mode: "Markdown"});
  bot.sendMessage(ADMIN_ID, `✅ Message بھیج دیا گیا User: ${userId}`);
});

bot.onText(/\/changeid (.+) (.+)/, (msg, match) => {
  if (msg.chat.id!= ADMIN_ID) return;
  const oldId = match[1]; const newId = match[2];
  let found = false;
  for(let userId in userOrders){
    let orderIndex = userOrders[userId].findIndex(o => o.botOrderId === oldId);
    if(orderIndex!== -1){
      userOrders[userId][orderIndex].botOrderId = newId; found = true;
      saveDB();
      bot.sendMessage(ADMIN_ID, `✅ Order ID Change\nپرانی: ${oldId}\nنئی: ${newId}`);
      bot.sendMessage(userId, `📢 Admin نے Order ID change کر دی\nپرانی: \`${oldId}\`\nنئی: \`${newId}\``, {parse_mode: "Markdown"});
      break;
    }
  }
  if(!found) bot.sendMessage(ADMIN_ID, `❌ Order ID نہیں ملی: ${oldId}`);
});

// ====== MAIN HANDLER ======
bot.on("message", async (msg) => {
  const chatId = msg.chat.id; const text = msg.text;
  if (!text || text.startsWith("/") &&!text.startsWith("/msg") &&!text.startsWith("/changeid") &&!text.startsWith("/setprice") &&!text.startsWith("/addbalance") &&!text.startsWith("/userinfo")) return;

  if(chatId == ADMIN_ID){
    // ====== نیا فیچر 1: All Users ======
    if(text === "👥 All Users"){
      const users = Object.keys(userNames);
      if(users.length === 0) return bot.sendMessage(ADMIN_ID, "❌ ابھی کوئی User نہیں");
      let list = "👥 *Total Users:* " + users.length + "\n\n";
      users.forEach(id => {
        list += `👤 ${userNames[id]}\n🆔 \`${id}\`\n\n`;
      });
      return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"});
    }

    // ====== نیا فیچر 2: Users Balance ======
    if(text === "💰 Users Balance"){
      const users = Object.keys(wallet);
      if(users.length === 0) return bot.sendMessage(ADMIN_ID, "❌ کسی کا Balance نہیں");
      let list = "💰 *All Users Balance:*\n\n";
      let total = 0;
      users.forEach(id => {
        const bal = wallet[id] || 0;
        total += bal;
        list += `👤 ${userNames[id] || "Unknown"}\n🆔 \`${id}\`\n💵 Rs ${bal.toFixed(2)}\n\n`;
      });
      list += `*Total in System: Rs ${total.toFixed(2)}*`;
      return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"});
    }

    if(text === "📋 Pending Payments"){
      const pending = Object.keys(pendingPayments);
      if(pending.length === 0) return bot.sendMessage(ADMIN_ID, "❌ کوئی Pending Payment نہیں");
      let list = "📋 *Pending Payments:*\n\n";
      pending.forEach(id => { list += `👤 ${userNames[id] || "Unknown"} \n🆔 \`${id}\`\n💵 Amount: Rs ${pendingPayments[id]}\n\n`; });
      return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"});
    }
    if(text === "📦 All User Orders"){
      const users = Object.keys(userOrders);
      if(users.length === 0) return bot.sendMessage(ADMIN_ID, "❌ ابھی تک کوئی آرڈر نہیں");
      let list = "📦 *All User Orders:*\n\n";
      users.forEach(id => { list += `👤 ${userNames[id] || "Unknown"}\n🆔 \`${id}\`\n🗳 Total Orders: ${userOrders[id].length}\n\n`; });
      return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"});
    }
    if(text === "⚙️ Settings"){
      return sendKeyboard(ADMIN_ID, `⚙️ *Admin Settings*\n\nDefault Rate: Rs ${RATE}\nA:${services.A} B:${services.B} C:${services.C} D:${services.D} E:${services.E}`, settingsMenu);
    }
    if(text === "⬅️ Back"){ return sendKeyboard(ADMIN_ID, "👑 *Admin Panel*", adminMenu); }
  }

  // باقی سارا code پہلے والا ہی ہے...
  // یہاں سے نیچے وہی code ہے جو تم نے بھیجا تھا
  // میں نے صرف اوپر والے 2 بٹن اور /userinfo ایڈ کیے ہیں

  if(chatId == ADMIN_ID){
    if(text === "⚙️ Set Rate"){
      userState[chatId] = { step: "setrate" };
      return bot.sendMessage(ADMIN_ID, `موجودہ Default Rate: Rs ${RATE}\n\nنیا Default Rate لکھیں:`, {parse_mode: "Markdown"});
    }
    if(text === "💰 Set Price"){
      return bot.sendMessage(ADMIN_ID, `فارمیٹ:\n\`/setprice USERID PRICE\`\nمثال: \`/setprice 6362089364 1.50\``, {parse_mode: "Markdown"});
    }
    if(text === "🔧 Change Service ID"){
      userState[chatId] = { step: "changeservice" };
      return bot.sendMessage(ADMIN_ID, `موجودہ IDs:\nA:${services.A} B:${services.B} C:${services.C} D:${services.D} E:${services.E}\n\nفارمیٹ:\n\`A 14420\``, {parse_mode: "Markdown"});
    }
    if(text === "⬅️ Back"){ return sendKeyboard(ADMIN_ID, "⚙️ *Admin Settings*", settingsMenu); }
  }

  if(userState[chatId]?.step === "setrate" && chatId == ADMIN_ID){
    const newRate = parseFloat(text);
    if(isNaN(newRate)) return bot.sendMessage(ADMIN_ID, "❌ صحیح نمبر لکھیں");
    RATE = newRate; delete userState[chatId]; saveDB();
    return sendKeyboard(ADMIN_ID, `✅ Default Rate update: Rs ${RATE}`, settingsMenu);
  }

  if(userState[chatId]?.step === "changeservice" && chatId == ADMIN_ID){
    const parts = text.split(" ");
    const key = parts[0].toUpperCase();
    const newId = parts[1];
    if(!services[key] ||!newId) return bot.sendMessage(ADMIN_ID, "❌ فارمیٹ غلط۔ مثال: `A 14420`", {parse_mode: "Markdown"});
    services[key] = newId; delete userState[chatId]; saveDB();
    return sendKeyboard(ADMIN_ID, `✅ Service ${key} کی ID change: ${newId}`, settingsMenu);
  }

  if (chatId == ADMIN_ID) {
    if (text.startsWith("✅ Approve")) {
      const userId = text.split(" ")[2]; const amount = pendingPayments[userId];
      if (amount) {
        wallet[userId] = (wallet[userId] || 0) + amount; delete pendingPayments[userId]; saveDB();
        bot.sendMessage(userId, `✅ Payment Approved\n💰 Rs ${amount} Wallet میں add`);
        return sendKeyboard(ADMIN_ID, `✅ Rs ${amount} add User: ${userId}`, adminMenu);
      }
    }
    if (text.startsWith("❌ Reject")) {
      const userId = text.split(" ")[2]; delete pendingPayments[userId];
      return sendKeyboard(ADMIN_ID, `❌ Reject User: ${userId}`, adminMenu);
    }
  }

  if (text === "💰 Balance") {
    const balance = wallet[chatId] || 0; const totalVotes = userVotes[chatId] || 0;
    let currentRate = userCustomPrice[chatId] || RATE;
    return bot.sendMessage(chatId, `💰 *Your Account*\n\n💵 Balance: Rs ${balance.toFixed(2)}\n🗳 Total Votes: ${totalVotes}\n💵 Your Rate: Rs ${currentRate}/vote`, {parse_mode: "Markdown"});
  }

  if (text === "💳 Add Balance") {
    userState[chatId] = { step: "payment" };
    return bot.sendMessage(chatId, `💳 *Payment:*\n*Easypaisa:* \`${EASYPAISA}\`\n*JazzCash:* \`${JAZZCASH}\`\n\nبھیجیں: \`TXN_ID AMOUNT\``, {parse_mode: "Markdown"});
  }

  if (userState[chatId]?.step === "payment") {
    const parts = text.split(" "); const txnId = parts[0]; const amount = parseFloat(parts[1]);
    if (!amount || isNaN(amount) || amount < 100) return bot.sendMessage(chatId, "❌ فارمیٹ: `TXN_ID AMOUNT`\nMin: 100", {parse_mode: "Markdown"});
    pendingPayments[chatId] = amount;
    bot.sendMessage(ADMIN_ID, `💰 *New Payment*\n👤 ${userNames[chatId] || "Unknown"} \n🆔 \`${chatId}\`\n🧾 \`${txnId}\`\n💵 Rs ${amount}`, {
      parse_mode: "Markdown", reply_markup: { keyboard: [[`✅ Approve ${chatId}`], [`❌ Reject ${chatId}`], ["⬅️ Back"]], resize_keyboard: true }
    });
    delete userState[chatId]; return sendKeyboard(chatId, "✅ Request بھیج دی۔ Approval کے بعد Balance add ہو گا", mainMenu);
  }

  if (text === "🗳 New Vote Order") {
    let currentRate = userCustomPrice[chatId] || RATE;
    return sendKeyboard(chatId, `📋 *Service Select کریں:*\nآپ کا Rate: Rs ${currentRate} per Vote\nMin: ${MIN_VOTE} Votes`, serviceMenu);
  }

  if (text.startsWith("A") || text.startsWith("B") || text.startsWith("C") || text.startsWith("D") || text.startsWith("E")) {
    const option = text.split(" ")[0];
    userState[chatId] = { service: services[option], serviceName: option, step: "link" };
    return bot.sendMessage(chatId, `📎 *Poll Link بھیجیں:*\nSelected: *${option}*`, {parse_mode: "Markdown"});
  }

  if (userState[chatId]?.step === "link") {
    userState[chatId].link = text; userState[chatId].step = "quantity";
    return bot.sendMessage(chatId, `🔢 *Quantity بتائیں:*\nMin: ${MIN_VOTE}`, {parse_mode: "Markdown"});
  }

  if (userState[chatId]?.step === "quantity") {
    const quantity = parseInt(text);
    if (isNaN(quantity) || quantity < MIN_VOTE) return bot.sendMessage(chatId, `❌ Min ${MIN_VOTE} Quantity`);
    if(!wallet[chatId]) wallet[chatId] = 0;
    let perVoteRate = userCustomPrice[chatId] || RATE;
    let price = quantity * perVoteRate;
    const balance = wallet[chatId];
    if (balance < price) {
      delete userState[chatId];
      return sendKeyboard(chatId, `❌ *Balance کم*\n💰 ${balance.toFixed(2)}\n💵 Need: Rs ${price.toFixed(2)}\n\nآپ کا Rate: Rs ${perVoteRate}/vote`, mainMenu);
    }
    wallet[chatId] -= price;
    userVotes[chatId] = (userVotes[chatId] || 0) + quantity;
    botOrderCounter++; const botOrderId = "BOT" + botOrderCounter;
    saveDB();
    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY); params.append("action", "add");
      params.append("service", userState[chatId].service);
      params.append("link", userState[chatId].link); params.append("quantity", quantity);
      const res = await axios.post(API_URL, params);
      if (res.data.order) {
        if(!userOrders[chatId]) userOrders[chatId] = [];
        userOrders[chatId].push({botOrderId, smmOrderId: res.data.order, service: userState[chatId].serviceName, link: userState[chatId].link, qty: quantity, price, rate: perVoteRate});
        saveDB();
        bot.sendMessage(ADMIN_ID, `🆕 *Auto Order*\n👤 ${userNames[chatId] || "Unknown"} \n🆔 \`${chatId}\`\n🆔 Bot: \`${botOrderId}\`\n🆔 SMM: \`${res.data.order}\`\n🗳 ${quantity}\n💵 Rs ${price.toFixed(2)}`, {parse_mode: "Markdown"});
        bot.sendMessage(chatId, `✅ *Order Confirm*\n\n🆔 ID: \`${botOrderId}\`\n📦 ${userState[chatId].serviceName}\n🗳 ${quantity}\n💵 Price: Rs ${price.toFixed(2)}\n💰 Balance: Rs ${wallet[chatId].toFixed(2)}`, {parse_mode: "Markdown"});
        delete userState[chatId];
        return sendKeyboard(chatId, "🏠 *Main Menu*", mainMenu);
      } else {
        wallet[chatId] += price; userVotes[chatId] -= quantity; botOrderCounter--; saveDB();
        delete userState[chatId];
        return sendKeyboard(chatId, `❌ Failed: ${res.data.error}\nپیسے واپس`, mainMenu);
      }
    } catch (e) {
      wallet[chatId] += price; userVotes[chatId] -= quantity; botOrderCounter--; saveDB();
      delete userState[chatId];
      return sendKeyboard(chatId, "❌ API Error. پیسے واپس", mainMenu);
    }
  }

  if (text === "📦 Order Status") {
    userState[chatId] = { step: "status" };
    return bot.sendMessage(chatId, "🆔 *Bot Order ID بھیجیں:* `BOT1001`", {parse_mode: "Markdown"});
  }

  if (userState[chatId]?.step === "status") {
    const order = userOrders[chatId]?.find(o => o.botOrderId === text);
    if(!order) { delete userState[chatId]; return sendKeyboard(chatId, "❌ غلط Bot Order ID", mainMenu); }
    delete userState[chatId];
    return sendKeyboard(chatId, `📦 *Order Status*\n\n🆔 Bot: \`${order.botOrderId}\`\n🆔 SMM: \`${order.smmOrderId}\`\n🗳 ${order.qty} Votes\n💵 Rs ${order.price}`, mainMenu);
  }

  if (text.includes(DEVELOPER)) { return bot.sendMessage(chatId, `👨‍💻 *${DEVELOPER}*`, {parse_mode: "Markdown"}); }

  if (text === "⬅️ Back") { delete userState[chatId]; if(chatId == ADMIN_ID){ return sendKeyboard(chatId, "👑 *Admin Panel*", adminMenu); } return sendKeyboard(chatId, "🏠 *Main Menu*", mainMenu); }
});

console.log("✅ Bot Started - Database Connected");});

bot.onText(/\/balance/, async (msg) => {
  if (msg.chat.id.toString()!== ADMIN_ID) return;
  try {
    const { data } = await axios.post(API_URL, { key: API_KEY, action: "balance" });
    bot.sendMessage(ADMIN_ID, `💰 Balance: ${data.balance}`);
  } catch {
    bot.sendMessage(ADMIN_ID, "API Error. URL aur KEY check karo");
  }
});

bot.onText(/\/orders/, async (msg) => {
  if (msg.chat.id.toString()!== ADMIN_ID) return;
  try {
    const { data } = await axios.post(API_URL, { key: API_KEY, action: "orders", status: "Pending" });
    bot.sendMessage(ADMIN_ID, `📦 Pending Orders: ${data.length}`);
  } catch {
    bot.sendMessage(ADMIN_ID, "API Error");
  }
});

// ====== WHATSAPP BOT START ======
async function startWA() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    waSocket = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    waSocket.ev.on('creds.update', saveCreds);

    waSocket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if(qr) {
            console.log("Scan this QR:");
            qrcode.generate(qr, { small: true });
        } 
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error).output.statusCode!== DisconnectReason.loggedOut;
            if(shouldReconnect) {
                console.log("Reconnecting...");
                startWA();
            }
        }
        if(connection === 'open') {
            console.log("✅ WhatsApp Connected");
            bot.sendMessage(ADMIN_ID, "✅ WhatsApp Connected");
        }
    });

    waSocket.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const jid = msg.key.remoteJid;

        if (text.toLowerCase() === "hi" || text.toLowerCase() === "hello") {
            await waSocket.sendMessage(jid, { text: "Assalamualaikum! Order ke liye 'order' likho" });
        }
        if (text.toLowerCase() === "order") {
            await waSocket.sendMessage(jid, { text: "Order dene ka tareeka:\n1. Service ID\n2. Link\n3. Quantity" });
        }
    });
}

console.log("Bot Starting...");
