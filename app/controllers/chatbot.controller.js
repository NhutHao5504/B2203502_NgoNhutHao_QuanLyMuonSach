const chatbotService = require("../services/chatbot.service");

exports.chatWithBot = async (req, res) => {
  try {
    const { message, docGiaId, docGiaMongoId } = req.body;

    // Kiểm tra message có tồn tại không
    if (!message || message.trim() === "") {
      return res.json({
        reply: `👋 Xin chào! Tôi là chatbot thư viện thông minh.<br>
        <strong>Những gì tôi có thể giúp bạn:</strong>
        <ul>
          <li><strong>Xem thông tin sách:</strong> "Thông tin sách?"</li>
          <li><strong>Xem sách đang mượn:</strong> "Phiếu mượn của tôi?"</li>
          <li><strong>Quy định:</strong> "Quy định mượn sách", "Phạt trả muộn thế nào?"</li>
          <li><strong>Giờ mở cửa:</strong> "Thư viện mở cửa lúc mấy giờ?"</li>
          <li><strong>Mượn sách:</strong> "Tôi muốn mượn sách Harry Potter"</li>
        </ul>
        <small><i>Hãy nhập câu hỏi của bạn vào ô bên dưới nhé!</i></small>`,
      });
    }

    // Xử lý tin nhắn
    const reply = await chatbotService.handleChat(message, docGiaId, docGiaMongoId);
    
    // Trả về kết quả
    res.json({ 
      success: true, 
      reply: reply,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Lỗi chatbot controller:", error);
    res.status(500).json({ 
      success: false, 
      error: "Không thể xử lý yêu cầu!",
      reply: "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau."
    });
  }
};

exports.resetChatHistory = (req, res) => {
  try {
    const { docGiaId } = req.body;

    if (!docGiaId) {
      return res.status(400).json({ 
        success: false, 
        error: "Thiếu docGiaId để reset lịch sử chat!" 
      });
    }

    const result = chatbotService.resetChat(docGiaId);
    
    if (result) {
      return res.json({ 
        success: true, 
        message: "Đã reset lịch sử chat cho người dùng." 
      });
    } else {
      return res.json({ 
        success: false, 
        message: "Không tìm thấy lịch sử chat để reset." 
      });
    }
    
  } catch (error) {
    console.error("Lỗi reset chatbot:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Không thể reset lịch sử chat!" 
    });
  }
};