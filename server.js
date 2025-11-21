
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

// Rangli loglar uchun (Kali Linux terminalida chiroyli chiqadi)
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  yellow: "\x1b[33m"
};

// Sessiyalarni vaqtinchalik saqlash
let client = null; 
let tempPhoneCodeHash = null;
let tempPhone = null;

console.clear();
console.log(colors.green + "========================================" + colors.reset);
console.log(colors.green + "  MUSHTUMGRAM REAL SERVER (Kali Linux)  " + colors.reset);
console.log(colors.green + "========================================" + colors.reset);

// 1-QADAM: Kod yuborish
app.post("/api/send-code", async (req, res) => {
  const { phoneNumber, apiId, apiHash } = req.body;

  console.log(colors.blue + `\n[Ulanish] ${phoneNumber} raqamiga so'rov keldi...` + colors.reset);

  if (!phoneNumber || !apiId || !apiHash) {
    console.log(colors.red + "[Xato] Ma'lumotlar yetarli emas!" + colors.reset);
    return res.status(400).json({ success: false, error: "Raqam, API ID yoki Hash yetishmayapti" });
  }

  try {
    // Eski sessiyani tozalash
    if (client) await client.disconnect();

    // Yangi mijoz yaratamiz
    client = new TelegramClient(
      new StringSession(""), 
      parseInt(apiId),
      apiHash,
      {
        connectionRetries: 5,
        useWSS: false, // Node muhitida TCP ishlatamiz
      }
    );

    await client.connect();
    console.log(colors.yellow + "[Telegram] Serverga ulandi, kod so'ralmoqda..." + colors.reset);

    // Kod yuborish
    const result = await client.sendCode(
      {
        apiId: parseInt(apiId),
        apiHash: apiHash,
      },
      phoneNumber
    );

    tempPhoneCodeHash = result.phoneCodeHash;
    tempPhone = phoneNumber;

    console.log(colors.green + "[Muvaffaqiyat] Kod Telegramga yuborildi!" + colors.reset);
    res.json({ success: true, message: "Kod Telegramga yuborildi" });

  } catch (error) {
    console.error(colors.red + "[Xatolik] " + error.message + colors.reset);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2-QADAM: Kodni tekshirish va Kirish
app.post("/api/login", async (req, res) => {
  const { code } = req.body;
  
  if (!client || !tempPhone || !tempPhoneCodeHash) {
    return res.status(400).json({ success: false, error: "Oldin kod so'rang (server qayta yongan bo'lishi mumkin)" });
  }

  console.log(colors.blue + `[Login] Kod tekshirilmoqda: ${code}` + colors.reset);

  try {
    // Sign In funksiyasi
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: tempPhone,
        phoneCodeHash: tempPhoneCodeHash,
        phoneCode: code.toString(),
      })
    );

    // Sessiyani saqlash
    const sessionString = client.session.save();
    
    console.log(colors.green + "[Muvaffaqiyat] Tizimga kirildi! Sessiya yaratildi." + colors.reset);
    
    res.json({ 
      success: true, 
      session: sessionString,
      user: {
        phoneNumber: tempPhone,
        name: "Foydalanuvchi" 
      }
    });

  } catch (error) {
    console.error(colors.red + "[Xatolik] " + error.message + colors.reset);
    
    if (error.message.includes("SESSION_PASSWORD_NEEDED")) {
        return res.status(401).json({ success: false, error: "Sizda 2-bosqichli parol yoqilgan. Iltimos uni o'chiring yoki Demo rejimdan foydalaning." });
    }
    if (error.message.includes("PHONE_CODE_INVALID")) {
        return res.status(400).json({ success: false, error: "Kod noto'g'ri kiritildi." });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\nServer ishga tushdi: ${colors.blue}http://localhost:${PORT}${colors.reset}`);
  console.log("Mushtumgram ilovasidan 'Real Server' rejimini tanlang.");
});
