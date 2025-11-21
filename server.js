import { createRequire } from "module";
const require = createRequire(import.meta.url);

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

// Rangli loglar (Kali Linux terminali uchun)
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m"
};

// Sessiyalarni xotirada saqlash
let client = null; 
let tempPhoneCodeHash = null;
let tempPhone = null;

console.clear();
console.log(colors.cyan + "╔══════════════════════════════════════════════════╗" + colors.reset);
console.log(colors.cyan + "║" + colors.bold + "           MUSHTUMGRAM SERVERI (v4.0)             " + colors.reset + colors.cyan + "║" + colors.reset);
console.log(colors.cyan + "║" + colors.green + "           Kali Linux Real Mode                   " + colors.reset + colors.cyan + "║" + colors.reset);
console.log(colors.cyan + "╚══════════════════════════════════════════════════╝" + colors.reset);
console.log("");

// 1-QADAM: Kod yuborish
app.post("/api/send-code", async (req, res) => {
  const { phoneNumber, apiId, apiHash } = req.body;

  console.log(colors.blue + `[So'rov] ${colors.bold}${phoneNumber}${colors.reset}${colors.blue} raqamidan keldi...` + colors.reset);

  if (!phoneNumber || !apiId || !apiHash) {
    console.log(colors.red + "[Xato] Ma'lumotlar yetarli emas!" + colors.reset);
    return res.status(400).json({ success: false, error: "Raqam, API ID yoki Hash yetishmayapti" });
  }

  try {
    if (client) {
      try { await client.disconnect(); } catch (e) {}
    }

    console.log(colors.yellow + "[Jarayon] Telegram serveriga ulanilmoqda..." + colors.reset);

    client = new TelegramClient(
      new StringSession(""), 
      parseInt(apiId),
      apiHash,
      {
        connectionRetries: 5,
        useWSS: false, 
      }
    );

    await client.connect();
    console.log(colors.green + "[OK] Serverga ulandi!" + colors.reset);
    
    const result = await client.sendCode(
      {
        apiId: parseInt(apiId),
        apiHash: apiHash,
      },
      phoneNumber
    );

    tempPhoneCodeHash = result.phoneCodeHash;
    tempPhone = phoneNumber;

    console.log(colors.green + colors.bold + "[Muvaffaqiyat] Kod yuborildi!" + colors.reset);
    res.json({ success: true, message: "Kod yuborildi" });

  } catch (error) {
    console.error(colors.red + "[Xatolik] " + error.message + colors.reset);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2-QADAM: Kirish
app.post("/api/login", async (req, res) => {
  const { code } = req.body;
  
  if (!client || !tempPhone || !tempPhoneCodeHash) {
    return res.status(400).json({ success: false, error: "Oldin kod so'rang." });
  }

  console.log(colors.blue + `[Login] Kod tekshirilmoqda: ${colors.bold}${code}${colors.reset}`);

  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: tempPhone,
        phoneCodeHash: tempPhoneCodeHash,
        phoneCode: code.toString(),
      })
    );

    const sessionString = client.session.save();
    console.log(colors.green + colors.bold + "🎉 [TABRIKLAYMIZ] Tizimga kirildi!" + colors.reset);
    
    res.json({ 
      success: true, 
      session: sessionString,
      user: { phoneNumber: tempPhone, name: "Foydalanuvchi" }
    });

  } catch (error) {
    console.error(colors.red + "[Xatolik] " + error.message + colors.reset);
    if (error.message.includes("SESSION_PASSWORD_NEEDED")) {
        return res.status(401).json({ success: false, error: "2-bosqichli parol (Cloud Password) yoqilgan. Iltimos o'chiring." });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3-QADAM: Chatlarni yuklash (REAL TELEGRAM)
app.get("/api/get-dialogs", async (req, res) => {
  if (!client || !client.connected) {
    return res.status(401).json({ success: false, error: "Mijoz ulanmagan" });
  }

  try {
    console.log(colors.yellow + "[Jarayon] Chatlar ro'yxati yuklanmoqda..." + colors.reset);
    
    // Oxirgi 15 ta chatni olamiz
    const dialogs = await client.getDialogs({ limit: 15 });
    
    const chatList = dialogs.map(d => ({
      id: d.id.toString(),
      name: d.title || d.name || "Nomsiz",
      lastMessage: d.message ? d.message.message : "",
      isUser: d.isUser,
      isGroup: d.isGroup,
      isChannel: d.isChannel,
      unreadCount: d.unreadCount,
      date: d.date
    }));

    console.log(colors.green + `[OK] ${chatList.length} ta chat yuklandi.` + colors.reset);
    res.json({ success: true, chats: chatList });

  } catch (error) {
    console.error(colors.red + "[Xato] Chatlarni olishda: " + error.message + colors.reset);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4-QADAM: Xabar yuborish (REAL TELEGRAM)
app.post("/api/send-message", async (req, res) => {
  const { chatId, message } = req.body;

  if (!client || !client.connected) {
    return res.status(401).json({ success: false, error: "Mijoz ulanmagan" });
  }

  try {
    console.log(colors.blue + `[Yuborish] ID: ${chatId} -> "${message}"` + colors.reset);
    
    await client.sendMessage(chatId, { message: message });
    
    res.json({ success: true });
  } catch (error) {
    console.error(colors.red + "[Xato] Yuborishda: " + error.message + colors.reset);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server tayyor: ${colors.blue}${colors.bold}http://localhost:${PORT}${colors.reset}`);
  console.log(colors.yellow + "Agar xatolik chiqsa, terminalda `npm install` deb yozing." + colors.reset);
});