// const express = require("express");
// const router = express.Router();
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// require("dotenv").config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// router.post("/", async (req, res) => {
//   try {
//     const userMessage = req.body.message;
//     if (!userMessage) {
//       return res.status(400).json({ error: "Thiếu message!" });
//     }

//     const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//     const result = await model.generateContent(userMessage);
//     const text = result.response.text();

//     res.json({ reply: text });
//   } catch (error) {
//     console.error("Lỗi Gemini API:", error);
//     res.status(500).json({ error: "Không thể kết nối tới Gemini API!" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔹 Lưu tạm lịch sử hội thoại trong bộ nhớ (RAM)
const chatHistories = {}; // key: userId, value: mảng [{ role, text }]

// ⚙️ Route POST /api/chatbot
router.post("/", async (req, res) => {
  try {
    const userId = req.body.userId || "default"; // 👈 hoặc lấy từ tài khoản đăng nhập
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: "Thiếu message!" });
    }

    // 🔹 Nếu chưa có lịch sử thì khởi tạo mảng trống
    if (!chatHistories[userId]) {
      chatHistories[userId] = [];
    }

    // Thêm tin nhắn người dùng vào lịch sử
    chatHistories[userId].push({ role: "user", text: userMessage });

    // Lấy model Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 🔹 Gọi API với context (toàn bộ lịch sử)
    const chat = model.startChat({
      history: chatHistories[userId].map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
    });

    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();

    // Lưu phản hồi vào lịch sử
    chatHistories[userId].push({ role: "model", text: reply });

    // Gửi lại kết quả cho frontend
    res.json({ reply });

  } catch (error) {
    console.error("❌ Lỗi Gemini API:", error);
    res.status(500).json({ error: "Không thể kết nối tới Gemini API!" });
  }
});

module.exports = router;
