const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_ID = Number(process.env.ADMIN_ID);

const users = {};
const orders = {};

function orderId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

bot.onText(/\/start/, (msg) => {
  const id = msg.chat.id;

  if (!users[id]) {
    users[id] = { approved: false };
    bot.sendMessage(id, "⛔ پہلے Admin Approval ضروری ہے۔");
    bot.sendMessage(
      ADMIN_ID,
      `Approval Request\n\nUser ID: ${id}\n\nApprove:\n/approve ${id}`
    );
    return;
  }

  bot.sendMessage(id, "Welcome");
});

bot.onText(/\/approve (.+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;

  const id = Number(match[1]);

  users[id] = {
    approved: true,
    step: "deposit"
  };

  bot.sendMessage(id, "✅ Approved\n\nاب Deposit Amount لکھیں۔");
});

bot.on("message", (msg) => {
  const id = msg.chat.id;
  const text = msg.text;

  if (!users[id] || !users[id].approved) return;

  if (users[id].step === "deposit") {
    users[id].deposit = text;
    users[id].step = "link";
    return bot.sendMessage(id, "🔗 اپنا Link بھیجیں۔");
  }

  if (users[id].step === "link") {
    const idOrder = orderId();

    orders[idOrder] = {
      user: id,
      deposit: users[id].deposit,
      link: text,
      status: "Pending"
    };

    users[id].step = null;

    bot.sendMessage(
      id,
      `✅ Order Submitted

Order ID: ${idOrder}
Status: Pending`
    );

    bot.sendMessage(
      ADMIN_ID,
      `📦 New Order

Order ID: ${idOrder}
User: ${id}
Deposit: ${orders[idOrder].deposit}
Link: ${orders[idOrder].link}`
    );
  }
});

console.log("Bot Started");
