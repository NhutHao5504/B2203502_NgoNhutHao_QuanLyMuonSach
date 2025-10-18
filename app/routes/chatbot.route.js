const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const MongoDB = require("../utils/mongodb.util");
const SachService = require("../services/sach.service");
const TheodoiService = require("../services/theodoi.service");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Lưu lịch sử chat của user
const chatHistories = {};

router.post("/", async (req, res) => {
//  console.log("Nhận từ FE:", req.body);
  try {
    const { message, docGiaId, docGiaMongoId } = req.body;

    if (!message || message.trim() === "") {
      return res.json({
        reply: `👋 Xin chào! Mình là chatbot thư viện
        Bạn có thể hỏi mình về:
        • Thông tin tất cả sách trong thư viện  
        • Thông tin cụ thể của một quyển sách  
        • Sách bạn đang mượn và hạn trả  
        • Quy định thư viện và giờ mở cửa  
        • Và nhiều hơn nữa!

        Ví dụ: "Tôi đang mượn sách nào?" hoặc "Thông tin sách Lập trình C++"`,
      });
    }


    if (!message) return res.status(400).json({ error: "Thiếu message!" });

    const sachService = new SachService(MongoDB.client);
    const theodoiService = new TheodoiService(MongoDB.client);

    if (!chatHistories[docGiaId]) chatHistories[docGiaId] = [];
    chatHistories[docGiaId].push({ role: "user", text: message });

    const lower = message.toLowerCase();
    let context = "";

    //Xem tất cả sách có trong thư viện hoặc cụ thể
    if (lower.includes("sách")) {
      const allBooks = await sachService.find({});
      const { search } = require("googlethis");

      let keyword = lower
        .replace("thông tin", "")
        .replace("về", "")
        .replace("cuốn", "")
        .replace("sách", "")
        .trim();

      //Nếu người dùng hỏi "tất cả sách"
      if (keyword === "" || keyword === "tất cả") {
        if (allBooks.length > 0) {
          context = `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h3 style="color: #007bff;">Danh sách tất cả sách trong thư viện</h3>
              ${allBooks
                .map(
                  (s) => `
                    <div style="border: 1px solid #ddd; border-radius: 10px; padding: 10px; margin-bottom: 10px; background-color: #f8f9fa; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                      <strong>${s.TENSACH}</strong><br>
                      <b>Tác giả:</b> ${s.TACGIA}<br>
                    </div>
                  `
                )
                .join("")}
              <p style="margin-top:15px;">Bạn muốn xem chi tiết hoặc tóm tắt về cuốn nào không? Gõ ví dụ: <b>"thông tin sách Đắc Nhân Tâm"</b> hoặc <b>"tóm tắt sách Đắc Nhân Tâm"</b>.</p>
            </div>
          `.replace(/\s\s+/g, " ");
        } else {
          context = "<p>Hiện chưa có sách nào trong hệ thống.</p>";
        }
      }

      //Nếu người dùng hỏi về 1 cuốn cụ thể
      else {
        const matched = allBooks.filter(
          (s) =>
            s.TENSACH.toLowerCase().includes(keyword) ||
            s.TACGIA.toLowerCase().includes(keyword)
        );

        if (matched.length > 0) {
          const s = matched[0];
          context = `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h3 style="color: #007bff;">Thông tin chi tiết về sách "${s.TENSACH}"</h3>
              <div style="border: 1px solid #ddd; border-radius: 10px; padding: 10px; margin-bottom: 10px; background-color: #f8f9fa; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <strong>${s.TENSACH}</strong><br>
                <b>Tác giả:</b> ${s.TACGIA}<br>
                <b>Năm xuất bản:</b> ${s.NAMXUATBAN}<br>
                <b>Số lượng còn lại:</b> ${s.SOQUYEN} quyển<br>
                <b>Giá:</b> ${s.DONGIA.toLocaleString()}đ
              </div>
              <p>Bạn có muốn mình tóm tắt nội dung cuốn sách này không?</p>
            </div>
          `.replace(/\s\s+/g, " ");
        } else {
          context = `<p>Không tìm thấy sách nào có tên hoặc tác giả liên quan đến "${keyword}".</p>`;
        }
      }
    }

    //Tóm tắt nội dung sách (AI + tra web)
    else if (lower.includes("tóm tắt") || lower.includes("nội dung sách")) {
      const { search } = require("googlethis");
      const name = lower
        .replace("tóm tắt", "")
        .replace("nội dung sách", "")
        .replace("về", "")
        .trim();

      const results = await search(`Tóm tắt nội dung sách ${name}`);

      if (results && results.results.length > 0) {
        const snippet = results.results[0].description;
        const url = results.results[0].url;
        context = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h3 style="color:#28a745;">Tóm tắt sơ lược về "${name}"</h3>
            <p>${snippet}</p>
            <p style="margin-top:10px;">Nguồn tham khảo: <a href="${url}" target="_blank">${url}</a></p>
          </div>
        `;
      } else {
        context = `<p>Mình không tìm thấy thông tin tóm tắt về "${name}".</p>`;
      }
    }

    //Xem sách đang mượn (kèm ngày mượn và hạn trả)
    else if (
      lower.includes("đang mượn") ||
      lower.includes("phiếu mượn") ||
      lower.includes("tôi đang mượn sách nào") ||
      lower.includes("đang giữ sách")
    ) {
      //Lấy ID độc giả
      const id = String(docGiaId || docGiaMongoId || "").trim();
      console.log("Kiểm tra ID:", id);

      if (!id) {
        context = "Bạn cần đăng nhập để xem sách đang mượn.";
      } else {
        //Tìm các phiếu mượn của độc giả
        const muonList = await theodoiService.find({
          $or: [
            { MADOCGIA: id },
            { MADOCGIA: docGiaId },
            { MADOCGIA: docGiaMongoId },
          ],
        });

        console.log("Tổng phiếu mượn tìm thấy:", muonList.length);

        //Chỉ lấy những phiếu đang mượn
        const sachDangMuon = muonList.filter(
          (m) =>
            (!m.trangThai && !m.NGAYTRA) || // chưa có trạng thái và chưa có ngày trả
            (m.trangThai &&
              !["Đã trả", "Mất sách"].includes(
                m.trangThai.trim()
              ))
        );

        console.log("Phiếu đang mượn (chưa trả):", sachDangMuon.length);

        if (!sachDangMuon.length) {
          context = "Hiện bạn chưa mượn quyển sách nào.";
        } else {
          const allBooks = await sachService.find({});

          const lines = sachDangMuon.map((m) => {
            const sach = allBooks.find(
              (s) => s.MASACH === m.MASACH || String(s._id) === String(m.MASACH)
            );
            const tenSach = sach?.TENSACH || "Không rõ tên sách";

            // Tính ngày mượn và hạn trả (14 ngày sau)
            const ngayMuon = m.NGAYMUON ? new Date(m.NGAYMUON) : null;
            let ngayMuonStr = "không rõ";
            let hanTraStr = "chưa xác định";

            if (ngayMuon && !isNaN(ngayMuon)) {
              const hanTra = new Date(ngayMuon);
              hanTra.setDate(ngayMuon.getDate() + 14);
              ngayMuonStr = ngayMuon.toLocaleDateString("vi-VN");
              hanTraStr = hanTra.toLocaleDateString("vi-VN");
            }

            return `${tenSach} — mượn ngày ${ngayMuonStr}, hạn trả ${hanTraStr}`;
          });

          context = `📘 Các sách bạn đang mượn:\n${lines.join("\n")}`;
        }
      }
    }
      
    //Quy định thư viện
    else if (
      lower.includes("quy định") ||
      lower.includes("mượn tối đa") ||
      lower.includes("phạt") ||
      lower.includes("trả muộn")
    ) {
      const context = `
        <p>📘 <strong>Quy định thư viện</strong></p>
        <ul>
          <li><strong>Số lượng mượn:</strong> Tối đa 5 quyển</li>
          <li><strong>Thời gian mượn:</strong> 14 ngày</li>
          <li><strong>Phạt trễ hạn:</strong> 5.000đ/quyển/ngày</li>
          <li><strong>Yêu cầu:</strong> Trả sách nguyên vẹn và đúng hạn</li>
          <li><strong>Mất sách:</strong> Bồi thường theo giá bìa</li>
        </ul>
      `.replace(/\s\s+/g, ' ');
      return res.json({ reply: context });
    }


    //Giờ mở cửa / liên hệ
    else if (
      lower.includes("giờ mở cửa") ||
      lower.includes("liên hệ") ||
      lower.includes("hướng dẫn") ||
      lower.includes("trợ giúp")
    ) {
      context = `🕓 Giờ mở cửa thư viện:
      - Thứ 2 - Thứ 6: 7h30 - 17h00
      - Thứ 7: 7h30 - 11h30
      - Liên hệ: Ngô Nhựt Hào
      - SĐT: 0865475344`;
    }

    //Reply mặc định
    else {
      context = `Tôi có thể giúp bạn:
      - Tra cứu sách, tìm theo tên/tác giả.
      - Kiểm tra sách bạn đang mượn, hạn trả.
      - Xem quy định và giờ mở cửa thư viện.`;
    }

    //Gọi Gemini để trả lời tự nhiên
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const chat = model.startChat({
      history: chatHistories[docGiaId].map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
    });

    const prompt = `
      Dữ liệu thư viện:
      ${context}

      Người dùng hỏi: "${message}"

      Hãy trả lời ngắn gọn, thân thiện, tiếng Việt, không tiết lộ thông tin người khác.
    `;

    const result = await chat.sendMessage(prompt);
    const reply = result.response.text();

    chatHistories[docGiaId].push({ role: "model", text: reply });

    res.json({ reply });
  } catch (error) {
    console.error("Lỗi chatbot:", error);
    res.status(500).json({ error: "Không thể xử lý yêu cầu!" });
  }
});


module.exports = router;
