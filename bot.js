const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");

// ====== SETTINGS ======
const TOKEN = "8697588276:AAHtZ4aJRawLEFJjJFtCNQ0GGtGohD4GEOw";
const API_KEY = "5ed4582507cc9e85605ad468594ebb87";
const API_URL = "https://cheappakpanel.com/api/v2";
const ADMIN_ID = 6362089364;
let RATE = 1.80;
const MIN_VOTE = 10;
const DEVELOPER = "Developer: Aijaz Kosh 03079257476";
const EASYPAISA = "03XX-XXXXXXX";
const JAZZCASH = "03077321978";
const DB_FILE = "./database.json";

// ====== DATA ======
const bot = new TelegramBot(TOKEN, { polling: true });
let wallet = {}; let userVotes = {}; let userState = {}; let pendingPayments = {};
let userOrders = {}; let userCustomPrice = {}; let userNames = {}; let botOrderCounter = 1000;

let services = { "A": "14420", "B": "14421", "C": "14422", "D": "14423", "E": "14424" };
let customServices = {
  "C1": { name: "Custom 1", id: "0", price: 0.0 },
  "C2": { name: "Custom 2", id: "0", price: 0.0 }
};

// ====== DATABASE ======
function loadDB() {
  if(fs.existsSync(DB_FILE)){
    const data = JSON.parse(fs.readFileSync(DB_FILE));
    wallet = data.wallet || {}; userOrders = data.userOrders || {}; userVotes = data.userVotes || {};
    userCustomPrice = data.userCustomPrice || {}; userNames = data.userNames || {};
    RATE = data.RATE || 1.80; services = data.services || services;
    customServices = data.customServices || customServices; botOrderCounter = data.botOrderCounter || 0;
    console.log("✅ Database Loaded");
  } else { console.log("📄 New Database Created"); }
}
function saveDB() {
  const data = {wallet, userOrders, userVotes, userCustomPrice, userNames, RATE, services, customServices, botOrderCounter};
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
setInterval(saveDB, 30000); loadDB();

// ====== AUTO ORDER STATUS CHECKER - ONLY ON COMPLETED ======
setInterval(async () => {
  for(let userId in userOrders){
    for(let order of userOrders[userId]){
      if(order.status!== "Completed" && order.status!== "Canceled" && order.status!== "Error"){
        try{
          const params = new URLSearchParams();
          params.append("key", API_KEY); params.append("action", "status"); params.append("order", order.smmOrderId);
          const res = await axios.post(API_URL, params);
          let newStatus = res.data.status || res.data;

          if(newStatus && newStatus!== order.status){
            order.status = newStatus; saveDB();

            // 1. صرف COMPLETED پر Admin + User دونوں کو میسج
            if(newStatus === "Completed"){
              bot.sendMessage(userId, `✅ *Order Completed / آرڈر مکمل ہو گیا*\n\n🆔 Bot ID: \`${order.botOrderId}\`\n🆔 SMM ID: \`${order.smmOrderId}\`\n📦 Service: ${order.service}\n🗳 Quantity: ${order.qty}\n💵 Price: Rs ${order.price.toFixed(2)}\n🔗 Link: ${order.link}`, {parse_mode: "Markdown"});
              bot.sendMessage(ADMIN_ID, `✅ *Order Completed Notification*\n\n👤 User: ${userNames[userId] || "Unknown"}\n🆔 User ID: \`${userId}\`\n🆔 Bot ID: \`${order.botOrderId}\`\n🆔 SMM ID: \`${order.smmOrderId}\`\n📦 Service: ${order.service}\n🗳 Quantity: ${order.qty}\n💵 Amount: Rs ${order.price.toFixed(2)}\n🔗 Link: ${order.link}`, {parse_mode: "Markdown"});
            }

            // 2. ERROR/CANCELED پر Refund
            if(newStatus === "Canceled" || newStatus === "Error" || newStatus.includes("Error")){
              wallet[userId] += order.price; userVotes[userId] -= order.qty; saveDB();
              bot.sendMessage(userId, `❌ *Order Failed / آرڈر فیل - Refund کر دیا*\n\n🆔 Bot: \`${order.botOrderId}\`\n🆔 SMM: \`${order.smmOrderId}\`\n📦 ${order.service}\nReason: ${newStatus}\n💰 Refund: Rs ${order.price.toFixed(2)}\n💵 New Balance: Rs ${wallet[userId].toFixed(2)}`, {parse_mode: "Markdown"});
            }
          }
        }catch(e){ console.log("Status Error:", e.message) }
      }
    }
  }
}, 120000);

function sendKeyboard(chatId, text, buttons) {
  return bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: { keyboard: buttons, resize_keyboard: true } });
}

// ====== MENUS - English + Urdu ======
const mainMenu = [["🗳 New Vote Order / نیا ووٹ آرڈر", "🛒 Custom Service / کسٹم سروس"],["💰 Balance / بیلنس", "📦 Order Status / آرڈر سٹیٹس"],["💳 Add Balance / بیلنس ایڈ"],[`👨‍💻 ${DEVELOPER}`]];
const adminMenu = [["👥 All Users / تمام یوزر"],["💰 Users Balance / یوزر بیلنس"],["📋 Pending Payments / پینڈنگ پیمنٹ"],["📦 All User Orders / تمام آرڈر"],["⚙️ Settings / سیٹنگ"],["🔧 Custom Service Setting / کسٹم سیٹنگ"],["⬅️ Back / واپس"]];
const settingsMenu = [["⚙️ Set Rate / ریٹ سیٹ کریں"],["💰 Set Price / پرائس سیٹ"],["🔧 Change Service ID / سروس ID بدلیں"],["⬅️ Back / واپس"]];
const serviceMenu = [["A - Answer 1 / آپشن A", "B - Answer 2 / آپشن B"],["C - Answer 3 / آپشن C", "D - Answer 4 / آپشن D"],["E - Answer 5 / آپشن E"],["⬅️ Back / واپس"]];
const customMenu = [[`🛒 ${customServices.C1.name} / ${customServices.C1.name}`, `🛒 ${customServices.C2.name} / ${customServices.C2.name}`],["⬅️ Back / واپس"]];

// ====== /START ======
bot.onText(/\/start/, (msg) => {
  userNames[msg.chat.id] = msg.from.first_name + (msg.from.last_name? " + msg.from.last_name : ""); saveDB();
  if(msg.chat.id == ADMIN_ID){ return sendKeyboard(msg.chat.id, `👑 *Admin Panel / ایڈمن پینل*\nDefault Rate: Rs ${RATE} per Vote\nڈیفالٹ ریٹ: Rs ${RATE} فی ووٹ`, adminMenu); }
  let currentRate = userCustomPrice[msg.chat.id] || RATE;
  sendKeyboard(msg.chat.id, `🤖 *Welcome to Kosh Bot / ایس ایم بوٹ میں خوش آمدید*\nVote Rate: Rs ${currentRate} | ووٹ ریٹ: Rs ${currentRate}\nCustom: Rs ${customServices.C1.price} | Rs ${customServices.C2.price}`, mainMenu);
});

// ====== ADMIN COMMANDS ======
bot.onText(/\/addbalance (.+) (.+)/, (msg, match) => {
  if (msg.chat.id!= ADMIN_ID) return; const userId = match[1]; const amount = parseFloat(match[2]);
  wallet[userId] = (wallet[userId] || 0) + amount; saveDB();
  bot.sendMessage(ADMIN_ID, `✅ Rs ${amount} Added / ایڈ ہو گئے\n👤 ${userNames[userId] || userId}\n💰 New Balance: Rs ${wallet[userId].toFixed(2)}`);
  bot.sendMessage(userId, `✅ Rs ${amount} Added to your account / آپکے اکاؤنٹ میں ایڈ ہو گئے\n💰 New Balance: Rs ${wallet[userId].toFixed(2)}`);
});

bot.onText(/\/setprice (.+) (.+)/, (msg, match) => {
  if (msg.chat.id!= ADMIN_ID) return; const userId = match[1]; const price = parseFloat(match[2]);
  userCustomPrice[userId] = price; saveDB();
  bot.sendMessage(ADMIN_ID, `✅ Custom Price Set\n👤 ${userId}\n💵 Rs ${price}`);
  bot.sendMessage(userId, `👑 Admin نے آپکا ریٹ چینج کیا\n💵 New Rate: Rs ${price}`);
});

bot.onText(/\/setcustom (.+) (.+) (.+) (.+)/, (msg, match) => {
  if (msg.chat.id!= ADMIN_ID) return; const which = match[1].toUpperCase();
  customServices[which].name = match[2]; customServices[which].id = match[3]; customServices[which].price = parseFloat(match[4]); saveDB();
  bot.sendMessage(ADMIN_ID, `✅ ${which} Updated / اپڈیٹ ہو گیا\nName: ${customServices[which].name}\nID: ${customServices[which].id}\nPrice: Rs ${customServices[which].price}`);
});

// ====== MAIN HANDLER ======
bot.on("message", async (msg) => {
  const chatId = msg.chat.id; const text = msg.text; if (!text) return;

  if(chatId == ADMIN_ID){
    if(text.includes("All Users")){ const users = Object.keys(userNames); if(users.length === 0) return bot.sendMessage(ADMIN_ID, "❌ No Users / کوئی یوزر نہیں"); let list = "👥 *Total Users: " + users.length + "*\n\n"; users.forEach(id => { list += `👤 ${userNames[id]}\n🆔 \`${id}\`\n\n`; }); return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"}); }
    if(text.includes("Users Balance")){ const users = Object.keys(wallet); if(users.length === 0) return bot.sendMessage(ADMIN_ID, "❌ No Balance Data"); let list = "💰 *All Users Balance / تمام یوزر بیلنس:*\n\n"; let total = 0; users.forEach(id => { const bal = wallet[id] || 0; total += bal; list += `👤 ${userNames[id] || "Unknown"}\n🆔 \`${id}\`\n💵 Rs ${bal.toFixed(2)}\n\n`; }); list += `*Total: Rs ${total.toFixed(2)}*`; return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"}); }
    if(text.includes("Pending Payments")){ const pending = Object.keys(pendingPayments); if(pending.length === 0) return bot.sendMessage(ADMIN_ID, "❌ No Pending / کوئی پینڈنگ نہیں"); let list = "📋 *Pending Payments / پینڈنگ پیمنٹ:*\n\n"; pending.forEach(id => { list += `👤 ${userNames[id] || "Unknown"} \n🆔 \`${id}\`\n💵 Rs ${pendingPayments[id]}\n\n`; }); return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"}); }
    if(text.includes("All User Orders")){ const users = Object.keys(userOrders); if(users.length === 0) return bot.sendMessage(ADMIN_ID, "❌ No Orders / کوئی آرڈر نہیں"); let list = "📦 *All User Orders / تمام آرڈر:*\n\n"; users.forEach(id => { list += `👤 ${userNames[id] || "Unknown"}\n🆔 \`${id}\`\n🗳 Orders: ${userOrders[id].length}\n\n`; }); return bot.sendMessage(ADMIN_ID, list, {parse_mode: "Markdown"}); }
    if(text.includes("Settings")){ return sendKeyboard(ADMIN_ID, `⚙️ *Admin Settings / ایڈمن سیٹنگ*\n\nDefault Rate: Rs ${RATE}\nA:${services.A} B:${services.B} C:${services.C} D:${services.D} E:${services.E}`, settingsMenu); }
    if(text.includes("Custom Service Setting")){ return bot.sendMessage(ADMIN_ID, `🔧 *2 Custom Services / 2 کسٹم سروس*\n\nC1: ${customServices.C1.name} | ID: ${customServices.C1.id} | Rs ${customServices.C1.price}\nC2: ${customServices.C2.name} | ID: ${customServices.C2.id} | Rs ${customServices.C2.price}\n\nCommand: /setcustom C1 NAME ID PRICE`, {parse_mode: "Markdown"}); }
    if(text.includes("Back")){ return sendKeyboard(ADMIN_ID, "👑 *Admin Panel / ایڈمن پینل*", adminMenu); }
  }

  if(chatId == ADMIN_ID){
    if(text.includes("Set Rate")){ userState[chatId] = { step: "setrate" }; return bot.sendMessage(ADMIN_ID, `Current Rate: Rs ${RATE}\nموجودہ ریٹ: Rs ${RATE}\n\nEnter New Rate / نیا ریٹ لکھیں:`); }
    if(text.includes("Change Service ID")){ userState[chatId] = { step: "changeservice" }; return bot.sendMessage(ADMIN_ID, `Current IDs:\nA:${services.A} B:${services.B} C:${services.C} D:${services.D} E:${services.E}\n\nFormat: A 14420`); }
  }

  if(userState[chatId]?.step === "setrate" && chatId == ADMIN_ID){
    const newRate = parseFloat(text); if(isNaN(newRate)) return bot.sendMessage(ADMIN_ID, "❌ Invalid Number / غلط نمبر");
    RATE = newRate; delete userState[chatId]; saveDB(); return sendKeyboard(ADMIN_ID, `✅ Rate Updated: Rs ${RATE} / ریٹ اپڈیٹ ہو گیا`, settingsMenu);
  }
  if(userState[chatId]?.step === "changeservice" && chatId == ADMIN_ID){
    const parts = text.split(" "); const key = parts[0].toUpperCase(); const newId = parts[1];
    if(!services[key] ||!newId) return bot.sendMessage(ADMIN_ID, "❌ Format: A 14420");
    services[key] = newId; delete userState[chatId]; saveDB(); return sendKeyboard(ADMIN_ID, `✅ Service ${key} Updated / اپڈیٹ ہو گیا`, settingsMenu);
  }

  if (chatId == ADMIN_ID) {
    if (text.startsWith("✅ Approve")) {
      const userId = text.split(" ")[2]; const amount = pendingPayments[userId];
      if (amount) { wallet[userId] = (wallet[userId] || 0) + amount; delete pendingPayments[userId]; saveDB();
        bot.sendMessage(userId, `✅ Payment Approved / پیمنٹ اپروو\n💰 Rs ${amount} Added`);
        return sendKeyboard(ADMIN_ID, `✅ Rs ${amount} Added`, adminMenu); }
    }
    if (text.startsWith("❌ Reject")) {
      const userId = text.split(" ")[2]; delete pendingPayments[userId];
      return sendKeyboard(ADMIN_ID, `❌ Rejected / مسترد`, adminMenu);
    }
  }

  if (text.includes("Balance")) {
    const balance = wallet[chatId] || 0; const totalVotes = userVotes[chatId] || 0; let currentRate = userCustomPrice[chatId] || RATE;
    return bot.sendMessage(chatId, `💰 *Your Account / آپکا اکاؤنٹ*\n\n💵 Balance: Rs ${balance.toFixed(2)} | بیلنس\n🗳 Total Votes: ${totalVotes} | کل ووٹ\n💵 Vote Rate: Rs ${currentRate} | ووٹ ریٹ\n🛒 Custom: Rs ${customServices.C1.price} | Rs ${customServices.C2.price}`, {parse_mode: "Markdown"});
  }

  if (text.includes("Add Balance")) { userState[chatId] = { step: "payment" }; return bot.sendMessage(chatId, `💳 *Payment Method / پیمنٹ کا طریقہ:*\n*Easypaisa:* \`${EASYPAISA}\`\n*JazzCash:* \`${JAZZCASH}\`\n\nSend: \`TXN_ID AMOUNT\`\nبھیجیں: \`TXN_ID AMOUNT\``, {parse_mode: "Markdown"}); }

  if (userState[chatId]?.step === "payment") {
    const parts = text.split(" "); const txnId = parts[0]; const amount = parseFloat(parts[1]);
    if (!amount || isNaN(amount) || amount < 100) return bot.sendMessage(chatId, "❌ Format: `TXN_ID AMOUNT`\nMin: 100");
    pendingPayments[chatId] = amount;
    bot.sendMessage(ADMIN_ID, `💰 *New Payment / نیا پیمنٹ*\n👤 ${userNames[chatId] || "Unknown"} \n🆔 \`${chatId}\`\n🧾 \`${txnId}\`\n💵 Rs ${amount}`, {
      parse_mode: "Markdown", reply_markup: { keyboard: [[`✅ Approve ${chatId}`], [`❌ Reject ${chatId}`]], resize_keyboard: true }
    });
    delete userState[chatId]; return sendKeyboard(chatId, "✅ Request Sent / ریکوسٹ بھیج دی گئی۔ Approve کے بعد بیلنس ایڈ ہو گا", mainMenu);
  }

  // VOTE ORDER
  if (text.includes("New Vote Order")) { let currentRate = userCustomPrice[chatId] || RATE; return sendKeyboard(chatId, `📋 *Select Service / سروس سلیکٹ کریں*\nRate: Rs ${currentRate} per Vote | ریٹ\nMin: ${MIN_VOTE} | کم از کم`, serviceMenu); }

  if (text.includes("Answer") || text.includes("آپشن")) {
    const option = text.split(" ")[0]; userState[chatId] = { service: services[option], serviceName: "Vote " + option, type: "vote", step: "link" };
    return bot.sendMessage(chatId, `📎 *Send Poll Link / پول کا لنک بھیجیں:*\nSelected: *${option}*`);
  }

  // CUSTOM SERVICE ORDER
  if (text.includes("Custom Service")) { return sendKeyboard(chatId, `🛒 *Select Custom / کسٹم سلیکٹ کریں*\n\nC1: ${customServices.C1.name} - Rs ${customServices.C1.price}/1000\nC2: ${customServices.C2.name} - Rs ${customServices.C2.price}/1000\nMin: 1000`, customMenu); }

  if (text.includes(customServices.C1.name)) { userState[chatId] = { service: customServices.C1.id, serviceName: customServices.C1.name, type: "custom", step: "link" }; return bot.sendMessage(chatId, `📎 *Send Link / لنک بھیجیں:*\nService: *${customServices.C1.name}*`); }
  if (text.includes(customServices.C2.name)) { userState[chatId] = { service: customServices.C2.id, serviceName: customServices.C2.name, type: "custom", step: "link" }; return bot.sendMessage(chatId, `📎 *Send Link / لنک بھیجیں:*\nService: *${customServices.C2.name}*`); }

  if (userState[chatId]?.step === "link") { userState[chatId].link = text; userState[chatId].step = "quantity"; return bot.sendMessage(chatId, `🔢 *Send Quantity / کوانٹٹی بھیجیں:*\nMin: ${userState[chatId].type === 'vote'? MIN_VOTE : 1000}`); }

  if (userState[chatId]?.step === "quantity") {
    const quantity = parseInt(text); const minQty = userState[chatId].type === 'vote'? MIN_VOTE : 1000;
    if (isNaN(quantity) || quantity < minQty) return bot.sendMessage(chatId, `❌ Min ${minQty} Required / کم از کم ${minQty} چاہیے`);
    let perVoteRate = userState[chatId].type === 'vote'? (userCustomPrice[chatId] || RATE) : customServices[userState[chatId].serviceName.includes("C1")? "C1" : "C2"].price;
    let price = userState[chatId].type === 'vote'? quantity * perVoteRate : (quantity/1000) * perVoteRate;
    const balance = wallet[chatId] || 0; if (balance < price) { delete userState[chatId]; return sendKeyboard(chatId, `❌ *Low Balance / بیلنس کم ہے*\n💰 ${balance.toFixed(2)}\n💵 Need: Rs ${price.toFixed(2)}`, mainMenu); }
    wallet[chatId] -= price; userVotes[chatId] = (userVotes[chatId] || 0) + quantity; botOrderCounter++; const botOrderId = "BOT" + botOrderCounter;
    try {
      const params = new URLSearchParams(); params.append("key", API_KEY); params.append("action", "add");
      params.append("service", userState[chatId].service); params.append("link", userState[chatId].link); params.append("quantity", quantity);
      params.append("comments", `Kosh Order ${botOrderId}`); // Panel پر نام
      const res = await axios.post(API_URL, params);
      if (res.data.order) {
        if(!userOrders[chatId]) userOrders[chatId] = [];
        userOrders[chatId].push({botOrderId, smmOrderId: res.data.order, service: userState[chatId].serviceName, link: userState[chatId].link, qty: quantity, price, rate: perVoteRate, status: "Pending"});
        saveDB();
        bot.sendMessage(chatId, `✅ *Order Placed / آرڈر لگ گیا*\n\n🆔 Bot ID: \`${botOrderId}\`\n🆔 SMM ID: \`${res.data.order}\`\n📦 ${userState[chatId].serviceName}\n🗳 Qty: ${quantity}\n💵 Price: Rs ${price.toFixed(2)}\n💰 Balance: Rs ${wallet[chatId].toFixed(2)}\n\n⏳ Status will auto update / سٹیٹس خود اپڈیٹ ہوگا`, {parse_mode: "Markdown"});
        delete userState[chatId]; return sendKeyboard(chatId, "🏠 *Main Menu / مین مینو*", mainMenu);
      } else { wallet[chatId] += price; userVotes[chatId] -= quantity; botOrderCounter--; saveDB(); delete userState[chatId]; return sendKeyboard(chatId, `❌ Failed: ${res.data.error}\nRefund / پیسے واپس`, mainMenu); }
    } catch (e) { wallet[chatId] += price; userVotes[chatId] -= quantity; botOrderCounter--; saveDB(); delete userState[chatId]; return sendKeyboard(chatId, "❌ API Error. Refund / پیسے واپس", mainMenu); }
  }

  // ORDER STATUS
  if (text.includes("Order Status")) { userState[chatId] = { step: "status" }; return bot.sendMessage(chatId, "🆔 *Send Bot ID or SMM ID*\nEx: `BOT1001` or `1234567`\n🆔 *Bot ID یا SMM ID بھیجیں*"); }

  if (userState[chatId]?.step === "status") {
    delete userState[chatId];
    let order = userOrders[chatId]?.find(o => o.botOrderId === text);
    if(!order){ order = userOrders[chatId]?.find(o => o.smmOrderId == text); }
    if(!order) { return sendKeyboard(chatId, "❌ Order Not Found / آرڈر نہیں ملا", mainMenu); }
    return sendKeyboard(chatId, `📦 *Order Status / آرڈر سٹیٹس*\n\n🆔 Bot: \`${order.botOrderId}\`\n🆔 SMM: \`${order.smmOrderId}\`\n📦 ${order.service}\n🔗 ${order.link}\n🗳 Qty: ${order.qty}\n💵 Rs ${order.price}\nStatus: *${order.status || "Pending"}* | *${order.status || "پینڈنگ"}*`, mainMenu);
  }

  if (text.includes(DEVELOPER)) { return bot.sendMessage(chatId, `👨‍💻 *${DEVELOPER}*`); }
  if (text.includes("Back")) { delete userState[chatId]; if(chatId == ADMIN_ID){ return sendKeyboard(chatId, "👑 *Admin Panel / ایڈمن پینل*", adminMenu); } return sendKeyboard(chatId, "🏠 *Main Menu / مین مینو*", mainMenu); }
});

console.log("✅ Kosh Bot Started - All Features ON");; delete userState[chatId]; saveDB();
    return sendKeyboard(ADMIN_ID, `✅ Service ${key} ID: ${newId}`, settingsMenu);
  }

  if (chatId == ADMIN_ID) {
    if (text.startsWith("✅ Approve")) {
      const userId = text.split(" ")[2]; const amount = pendingPayments[userId];
      if (amount) {
        wallet[userId] = (wallet[userId] || 0) + amount; delete pendingPayments[userId]; saveDB();
        bot.sendMessage(userId, `✅ Payment Approved\n💰 Rs ${amount} add`);
        return sendKeyboard(ADMIN_ID, `✅ Rs ${amount} add: ${userId}`, adminMenu);
      }
    }
    if (text.startsWith("❌ Reject")) {
      const userId = text.split(" ")[2]; delete pendingPayments[userId];
      return sendKeyboard(ADMIN_ID, `❌ Reject: ${userId}`, adminMenu);
    }
  }

  if (text === "💰 Balance") {
    const balance = wallet[chatId] || 0; const totalVotes = userVotes[chatId] || 0;
    let currentRate = userCustomPrice[chatId] || RATE;
    return bot.sendMessage(chatId, `💰 *Your Account*\n\n💵 Balance: Rs ${balance.toFixed(2)}\n🗳 Total Votes: ${totalVotes}\n💵 Vote Rate: Rs ${currentRate}\n🛒 Custom Rate: Rs ${customService.price}`, {parse_mode: "Markdown"});
  }

  if (text === "💳 Add Balance") {
    userState[chatId] = { step: "payment" };
    return bot.sendMessage(chatId, `💳 *Payment:*\n*Easypaisa:* \`${EASYPAISA}\`\n*JazzCash:* \`${JAZZCASH}\`\n\nBhejo: \`TXN_ID AMOUNT\``, {parse_mode: "Markdown"});
  }

  if (userState[chatId]?.step === "payment") {
    const parts = text.split(" "); const txnId = parts[0]; const amount = parseFloat(parts[1]);
    if (!amount || isNaN(amount) || amount < 100) return bot.sendMessage(chatId, "❌ Format: `TXN_ID AMOUNT`\nMin: 100");
    pendingPayments[chatId] = amount;
    bot.sendMessage(ADMIN_ID, `💰 *New Payment*\n👤 ${userNames[chatId] || "Unknown"} \n🆔 \`${chatId}\`\n🧾 \`${txnId}\`\n💵 Rs ${amount}`, {
      parse_mode: "Markdown", reply_markup: { keyboard: [[`✅ Approve ${chatId}`], [`❌ Reject ${chatId}`]], resize_keyboard: true }
    });
    delete userState[chatId]; return sendKeyboard(chatId, "✅ Request bhej di. Approve ke baad balance add", mainMenu);
  }

  // VOTE ORDER
  if (text === "🗳 New Vote Order") {
    let currentRate = userCustomPrice[chatId] || RATE;
    return sendKeyboard(chatId, `📋 *Vote Service Select*\nRate: Rs ${currentRate} per Vote\nMin: ${MIN_VOTE}`, serviceMenu);
  }

  if (text.startsWith("A") || text.startsWith("B") || text.startsWith("C") || text.startsWith("D") || text.startsWith("E")) {
    const option = text.split(" ")[0];
    userState[chatId] = { service: services[option], serviceName: "Vote " + option, type: "vote", step: "link" };
    return bot.sendMessage(chatId, `📎 *Poll Link bhejo:*\nSelected: *${option}*`);
  }

  // CUSTOM SERVICE ORDER
  if (text === "🛒 Custom Service") {
    return sendKeyboard(chatId, `🛒 *${customService.name}*\nPrice: Rs ${customService.price} per 1000\nMin: 1000`, customMenu);
  }

  if (text.startsWith("🛒")) {
    userState[chatId] = { service: customService.id, serviceName: customService.name, type: "custom", step: "link" };
    return bot.sendMessage(chatId, `📎 *Link bhejo:*\nService: *${customService.name}*`);
  }

  if (userState[chatId]?.step === "link") {
    userState[chatId].link = text; userState[chatId].step = "quantity";
    return bot.sendMessage(chatId, `🔢 *Quantity bhejo:*\nMin: ${userState[chatId].type === 'vote'? MIN_VOTE : 1000}`);
  }

  if (userState[chatId]?.step === "quantity") {
    const quantity = parseInt(text);
    const minQty = userState[chatId].type === 'vote'? MIN_VOTE : 1000;
    if (isNaN(quantity) || quantity < minQty) return bot.sendMessage(chatId, `❌ Min ${minQty} Quantity`);

    let perVoteRate = userState[chatId].type === 'vote'? (userCustomPrice[chatId] || RATE) : customService.price;
    let price = userState[chatId].type === 'vote'? quantity * perVoteRate : (quantity/1000) * perVoteRate;

    const balance = wallet[chatId] || 0;
    if (balance < price) {
      delete userState[chatId];
      return sendKeyboard(chatId, `❌ *Balance Kam*\n💰 ${balance.toFixed(2)}\n💵 Need: Rs ${price.toFixed(2)}`, mainMenu);
    }

    wallet[chatId] -= price;
    userVotes[chatId] = (userVotes[chatId] || 0) + quantity;
    botOrderCounter++; const botOrderId = "BOT" + botOrderCounter;

    try {
      const params = new URLSearchParams();
      params.append("key", API_KEY); params.append("action", "add");
      params.append("service", userState[chatId].service);
      params.append("link", userState[chatId].link); params.append("quantity", quantity);
      const res = await axios.post(API_URL, params);

      if (res.data.order) {
        if(!userOrders[chatId]) userOrders[chatId] = [];
        userOrders[chatId].push({botOrderId, smmOrderId: res.data.order, service: userState[chatId].serviceName, link: userState[chatId].link, qty: quantity, price, rate: perVoteRate, status: "Pending"});
        saveDB();
        bot.sendMessage(ADMIN_ID, `🆕 *New Order*\n👤 ${userNames[chatId] || "Unknown"} \n🆔 \`${chatId}\`\n🆔 Bot: \`${botOrderId}\`\n🆔 SMM: \`${res.data.order}\`\n📦 ${userState[chatId].serviceName}\n🗳 ${quantity}\n💵 Rs ${price.toFixed(2)}`, {parse_mode: "Markdown"});
        bot.sendMessage(chatId, `✅ *Order Lag gaya*\n\n🆔 ID: \`${botOrderId}\`\n📦 ${userState[chatId].serviceName}\n🗳 ${quantity}\n💵 Price: Rs ${price.toFixed(2)}\n💰 Balance: Rs ${wallet[chatId].toFixed(2)}\n\n⏳ 2 min baad status check hoga`, {parse_mode: "Markdown"});
        delete userState[chatId];
        return sendKeyboard(chatId, "🏠 *Main Menu*", mainMenu);
      } else {
        wallet[chatId] += price; userVotes[chatId] -= quantity; botOrderCounter--; saveDB();
        delete userState[chatId];
        return sendKeyboard(chatId, `❌ Failed: ${res.data.error}\nPaise wapis`, mainMenu);
      }
    } catch (e) {
      wallet[chatId] += price; userVotes[chatId] -= quantity; botOrderCounter--; saveDB();
      delete userState[chatId];
      return sendKeyboard(chatId, "❌ API Error. Paise wapis", mainMenu);
    }
  }

  if (text === "📦 Order Status") {
    userState[chatId] = { step: "status" };
    return bot.sendMessage(chatId, "🆔 *Bot Order ID bhejo:* `BOT1001`");
  }

  if (userState[chatId]?.step === "status") {
    const order = userOrders[chatId]?.find(o => o.botOrderId === text);
    if(!order) { delete userState[chatId]; return sendKeyboard(chatId, "❌ Galat Bot Order ID", mainMenu); }
    delete userState[chatId];
    return sendKeyboard(chatId, `📦 *Order Status*\n\n🆔 Bot: \`${order.botOrderId}\`\n🆔 SMM: \`${order.smmOrderId}\`\n📦 ${order.service}\n🗳 ${order.qty}\n💵 Rs ${order.price}\nStatus: *${order.status || "Pending"}*`, mainMenu);
  }

  if (text.includes(DEVELOPER)) { return bot.sendMessage(chatId, `👨‍💻 *${DEVELOPER}*`); }

  if (text === "⬅️ Back") { delete userState[chatId]; if(chatId == ADMIN_ID){ return sendKeyboard(chatId, "👑 *Admin Panel*", adminMenu); } return sendKeyboard(chatId, "🏠 *Main Menu*", mainMenu); }
});

console.log("✅ Bot Started - Auto Status Checker ON");(chatId == ADMIN_ID) {
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
