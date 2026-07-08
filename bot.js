const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// ====== SETTINGS - Secrets se aayenge ======
const TG_TOKEN = "8795130065:AAHxTuJe74zSdwKfoZlAr93NfHr-Qf9r46w; 
const ADMIN_ID = "6362089364; 
const API_KEY = "d94eb912f4afd973184fee794264a7fb";
const API_URL = "https://cheappakpanel.com/api/v2"; // Apna Panel URL yahan dalo

// ====== EXPRESS FOR 24/7 UPTIME ======
const app = express();
app.get("/", (req, res) => res.send("Bot is Alive ✅"));
app.listen(3000, () => console.log("Web server running on port 3000"));

// ====== TELEGRAM BOT START ======
const bot = new TelegramBot(TG_TOKEN, { polling: true });
let waSocket;

bot.onText(/\/start/, (msg) => {
  if (msg.chat.id.toString()!== ADMIN_ID) return;
  bot.sendMessage(ADMIN_ID, `🤖 Bot On hai

Commands:
/addwa - WhatsApp Connect QR
/orders - Pending Orders Check
/balance - Panel Balance Check
/services - Services List`);
});

bot.onText(/\/addwa/, async (msg) => {
  if (msg.chat.id.toString()!== ADMIN_ID) return;
  bot.sendMessage(ADMIN_ID, "WhatsApp QR Replit Console me aa gaya hai. Wahan se scan karo");
  startWA();
});

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
