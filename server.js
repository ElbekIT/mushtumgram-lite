import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require("fs");

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Serverni sozlash
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 3000;
const SESSION_FILE = "session.txt";

// Rangli loglar
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m"
};

let client = null; 
let tempPhoneCodeHash = null;
let tempPhone = null;

console.clear();
console.log(colors.cyan + "╔══════════════════════════════════════════════════╗" + colors.reset);
console.log(colors.cyan + "║" + colors.bold + "           MUSHTUMGRAM SERVERI (v5.0)             " + colors.reset + colors.cyan + "║" + colors.reset);
console.log(colors.cyan + "║" + colors.green + "        Kali Linux & Session Persistence          " + colors.reset + colors.cyan + "║" + colors.reset);
console.log(colors.cyan + "╚══════════════════════════════════════════════════╝" + colors.reset);
console.log("");

// Server yonganda sessiyani tiklash
async function initClient() {
  let sessionString = "";
  if (fs.existsSync(SESSION_FILE)) {
    sessionString = fs.readFileSync(SESSION_FILE, "utf8");
    console.log(colors.yellow + "[Tizim] Saqlangan sessiya topildi. Ulanmoqda..." + colors.reset);
  }

  // Eslatma: Bu API ID/Hash o'zgaruvchan bo'lishi mumkin, lekin avtomatik ulanish uchun 
  // oxirgi ishlatilganini saqlashimiz yoki default qiymat ishlatishimiz kerak.
  // Oddiylik uchun default qiymat bilan boshlaymiz, login paytida yangilanadi.
  client = new TelegramClient(
    new StringSession(sessionString), 
    33172191, // Default API ID
    "241032b1c88887ccb91d0282ae2d5a4d", // Default API Hash
    { connectionRetries: 5, useWSS: false }
  );

  if (sessionString) {
    try {
        await client.connect();
        console.log(colors.green + "[OK] Avtomatik ulandi!" + colors.reset);
    } catch (e) {
        console.log(colors.red + "[Xato] Eski sessiya yaroqsiz: " + e.message + colors.reset);
    }
  }
}

initClient();

// 0-QADAM: Sessiya tekshirish
app.get("/api/check-session", async (req, res) => {
    if (client && client.connected && await client.checkAuthorization()) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// 1-QADAM: Kod yuborish
app.post("/api/send-code", async (req, res) => {
  const { phoneNumber, apiId, apiHash } = req.body;

  console.log(colors.blue + `[So'rov] ${phoneNumber} raqamiga kod yuborilmoqda...` + colors.reset);

  try {
    if (client) await client.disconnect();

    client = new TelegramClient(
      new StringSession(""), 
      parseInt(apiId),
      apiHash,
      { connectionRetries: 5, useWSS: false }
    );

    await client.connect();
    
    const result = await client.sendCode(
      { apiId: parseInt(apiId), apiHash: apiHash },
      phoneNumber
    );

    tempPhoneCodeHash = result.phoneCodeHash;
    tempPhone = phoneNumber;

    console.log(colors.green + "[OK] Kod yuborildi!" + colors.reset);
    res.json({ success: true });
  } catch (error) {
    console.error(colors.red + "[Xato] " + error.message + colors.reset);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2-QADAM: Kirish
app.post("/api/login", async (req, res) => {
  const { code } = req.body;
  
  if (!tempPhone || !tempPhoneCodeHash) {
    return res.status(400).json({ success: false, error: "Server qayta yongan. Iltimos boshidan kod so'rang." });
  }

  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: tempPhone,
        phoneCodeHash: tempPhoneCodeHash,
        phoneCode: code.toString(),
      })
    );

    const sessionString = client.session.save();
    fs.writeFileSync(SESSION_FILE, sessionString); // Sessiyani faylga yozish

    console.log(colors.green + colors.bold + "🎉 [Login] Muvaffaqiyatli! Sessiya saqlandi." + colors.reset);
    res.json({ success: true });
  } catch (error) {
    console.error(colors.red + "[Xato] " + error.message + colors.reset);
    if (error.message.includes("SESSION_PASSWORD_NEEDED")) {
        return res.status(401).json({ success: false, error: "2-bosqichli parol yoqilgan." });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3-QADAM: Chatlarni yuklash
app.get("/api/get-dialogs", async (req, res) => {
  if (!client || !client.connected) {
    // Qayta ulanib ko'rish
    if (fs.existsSync(SESSION_FILE)) {
        console.log(colors.yellow + "[Info] Qayta ulanishga harakat..." + colors.reset);
        await initClient();
    }
    if (!client || !client.connected) {
        return res.status(401).json({ success: false, error: "Mijoz ulanmagan" });
    }
  }

  try {
    console.log(colors.yellow + "[Yuklash] Chatlar olinmoqda..." + colors.reset);
    const dialogs = await client.getDialogs({ limit: 20 });
    
    const chatList = dialogs.map(d => ({
      id: d.id.toString(),
      name: d.title || d.name || "Nomsiz",
      lastMessage: d.message ? d.message.message : "",
      unreadCount: d.unreadCount,
      date: d.date,
      isUser: d.isUser
    }));

    console.log(colors.green + `[OK] ${chatList.length} ta chat yuborildi.` + colors.reset);
    res.json({ success: true, chats: chatList });
  } catch (error) {
    console.error(colors.red + "[Xato] " + error.message + colors.reset);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4-QADAM: Xabar yuborish
app.post("/api/send-message", async (req, res) => {
  const { chatId, message } = req.body;
  if (!client || !client.connected) return res.status(401).json({ success: false });

  try {
    console.log(colors.blue + `[SMS] ${chatId}: ${message}` + colors.reset);
    await client.sendMessage(chatId, { message: message });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
});