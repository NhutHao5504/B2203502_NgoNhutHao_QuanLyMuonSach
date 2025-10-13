const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: "Thiếu message!" });
    }

    // ✅ Model chính xác cho API mới
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(userMessage);
    const text = result.response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("❌ Lỗi Gemini API:", error);
    res.status(500).json({ error: "Không thể kết nối tới Gemini API!" });
  }
});

module.exports = router;
