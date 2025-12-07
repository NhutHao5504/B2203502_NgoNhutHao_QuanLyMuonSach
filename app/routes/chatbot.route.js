const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbot.controller");

// Gửi tin nhắn đến chatbot
router.post("/", chatbotController.chatWithBot);

// Reset lịch sử chat
router.post("/reset", chatbotController.resetChatHistory);

module.exports = router;