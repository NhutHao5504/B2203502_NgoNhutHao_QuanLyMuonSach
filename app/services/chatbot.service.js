const OpenAI = require("openai");
const MongoDB = require("../utils/mongodb.util");
const SachService = require("./sach.service");
const TheodoiService = require("./theodoi.service");
require("dotenv").config();

// Client dùng OpenRouter
const genAI = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model mới
const modelName = "deepseek/deepseek-chat";

// Lưu lịch sử chat
const chatHistories = {}; 

// =====================================================
// 🧠 HÀM CHAT CHÍNH - ĐÃ SỬA ĐỂ KHÔNG HIỆN THÔNG BÁO LỖI
// =====================================================
async function handleChat(message, docGiaId, docGiaMongoId) {
  const sachService = new SachService(MongoDB.client);
  const theodoiService = new TheodoiService(MongoDB.client);

  if (!chatHistories[docGiaId]) {
    chatHistories[docGiaId] = {
      history: [] 
    };
  }

  const userSession = chatHistories[docGiaId];
  
  // Thêm tin nhắn người dùng vào history
  userSession.history.push({ role: "user", content: message });

  const lower = message.toLowerCase();
  let context = "";

  // ===== GIỮ NGUYÊN TOÀN BỘ LOGIC XỬ LÝ =====
  if (lower.includes("sách") && !lower.includes("tóm tắt")) {
    context = await getBookInfo(lower, sachService);
  }
  else if (lower.includes("tóm tắt") || lower.includes("nội dung sách")) {
    context = await getBookSummary(lower);
  }
  else if (
    lower.includes("đang mượn") ||
    lower.includes("phiếu mượn") ||
    lower.includes("tôi đang mượn sách nào") ||
    lower.includes("đang giữ sách")
  ) {
    context = await getBorrowedBooks(
      docGiaId,
      docGiaMongoId,
      sachService,
      theodoiService
    );
  }
  else if (
    lower.includes("quy định") ||
    lower.includes("mượn tối đa") ||
    lower.includes("phạt") ||
    lower.includes("trả muộn")
  ) {
    context = getLibraryRules();
  }
  else if (
    lower.includes("giờ mở cửa") ||
    lower.includes("liên hệ") ||
    lower.includes("hướng dẫn") ||
    lower.includes("trợ giúp")
  ) {
    context = getLibraryInfo();
  }
  else if (
    lower.includes("mượn") &&
    (lower.includes("sách") || lower.includes("cuốn"))
  ) {
    context = await requestBorrowBook(
      lower,
      sachService,
      theodoiService,
      docGiaId
    );
  }
  else {
    context = getDefaultReply();
  }

  // KIỂM TRA: Nếu context đã đủ thông tin, trả về luôn không cần gọi AI
  if (shouldReturnDirectly(context, lower)) {
    return context;
  }

  // Nếu cần xử lý ngôn ngữ tự nhiên, gọi AI
  const systemPrompt = `Bạn là trợ lý ảo thân thiện của thư viện. Hãy trả lời câu hỏi dựa trên dữ liệu thư viện được cung cấp.
  
  QUY TẮC:
  1. CHỈ sử dụng thông tin trong phần "DỮ LIỆU THƯ VIỆN" để trả lời
  2. KHÔNG tự bịa đặt thông tin không có trong dữ liệu
  3. Trả lời ngắn gọn, rõ ràng bằng tiếng Việt
  4. Có thể sử dụng HTML cơ bản (ul, li, table, strong, em)
  5. Nếu không có thông tin, hãy lịch sự nói "Tôi không tìm thấy thông tin này"
  6. Luôn giữ thái độ thân thiện, nhiệt tình

  DỮ LIỆU THƯ VIỆN:
  ${context}`;

  try {
    // ============================
    // 🔥 GỌI OPENROUTER API (DEEPSEEK)
    // ============================
    const completion = await genAI.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        ...userSession.history.map(msg => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        })),
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0].message.content;

    // Thêm phản hồi vào lịch sử (chỉ giữ 10 tin nhắn gần nhất)
    userSession.history.push({ role: "assistant", content: reply });
    if (userSession.history.length > 20) {
      userSession.history = userSession.history.slice(-20);
    }

    return reply;
  } catch (error) {
    console.error("Lỗi khi gọi OpenRouter API:", error.message);
    console.error("Error details:", error);
    
    // THAY ĐỔI Ở ĐÂY: Trả về context trực tiếp KHÔNG có thông báo lỗi
    return context;
  }
}

// =====================================================
// 🆕 HÀM KIỂM TRA CÓ NÊN TRẢ VỀ TRỰC TIẾP KHÔNG
// =====================================================
function shouldReturnDirectly(context, lowerMessage) {
  // Kiểm tra nếu context đã là câu trả lời đầy đủ
  const completeResponseIndicators = [
    '<table', // Có bảng dữ liệu
    'Thông tin chi tiết về', // Chi tiết sách
    '✅ Bạn đã đặt mượn thành công', // Mượn sách thành công
    'Danh sách tất cả sách', // Danh sách đầy đủ
    'Không tìm thấy sách nào', // Không tìm thấy
    'Bạn hiện chưa mượn quyển sách nào', // Không mượn sách
    'Rất tiếc', // Sách đã hết
    'Bạn cần đăng nhập', // Yêu cầu đăng nhập
    '<ul><li>Mỗi độc giả', // Quy định thư viện
    '<b>Giờ mở cửa thư viện</b>', // Giờ mở cửa
    'Tôi có thể giúp bạn:', // Menu chức năng
  ];
  
  // Kiểm tra nếu context đã chứa thông tin đầy đủ
  for (const indicator of completeResponseIndicators) {
    if (context.includes(indicator)) {
      return true;
    }
  }
  
  // Kiểm tra độ dài context - nếu ngắn (< 50 ký tự) thì cho AI xử lý
  if (context.length < 50) {
    return false;
  }
  
  // Kiểm tra loại câu hỏi đơn giản
  const simpleQuestions = [
    'chào', 'hello', 'hi', 'xin chào',
    'cảm ơn', 'thanks', 'thank you',
    'tạm biệt', 'bye', 'goodbye'
  ];
  
  for (const question of simpleQuestions) {
    if (lowerMessage.includes(question)) {
      return false; // Cho AI xử lý câu chào hỏi
    }
  }
  
  return false;
}

// =====================================================
// 🟦 CÁC HÀM HỖ TRỢ (GIỮ NGUYÊN)
// =====================================================
async function getBookInfo(lower, sachService) {
  const allBooks = await sachService.find({});
  let keyword = lower
    .replace("thông tin", "")
    .replace("về", "")
    .replace("cuốn", "")
    .replace("sách", "")
    .replace("chi tiết", "")
    .trim()
    .toLowerCase();

  if (
    keyword === "" ||
    keyword === "tất cả" ||
    keyword.includes("toàn bộ") ||
    keyword.includes("trong thư viện") ||
    keyword.includes("danh sách")
  ) {
    if (allBooks.length === 0)
      return `Hiện chưa có sách nào trong thư viện.`;

    const bookList = allBooks
      .map(
        (s, i) =>
          `<li><strong>${i + 1}. ${s.TENSACH}</strong> — ${s.TACGIA}</li>`
      )
      .join("");

    return `<strong>Danh sách tất cả sách trong thư viện:</strong><ul>${bookList}</ul>Bạn có muốn xem chi tiết về một cuốn nào không?`;
  }

  const matched = allBooks.filter(
    (s) =>
      s.TENSACH.toLowerCase().includes(keyword) ||
      s.TACGIA.toLowerCase().includes(keyword)
  );

  if (matched.length === 0)
    return `Không tìm thấy sách nào có tên hoặc tác giả liên quan đến "<em>${keyword}</em>".`;

  if (matched.length > 1) {
    const list = matched
      .map((s, i) => `<li>${i + 1}. ${s.TENSACH} — ${s.TACGIA}</li>`)
      .join("");
    return `Có ${matched.length} sách liên quan đến "<em>${keyword}</em>":<ul>${list}</ul>Bạn muốn xem chi tiết cuốn nào?`;
  }

  const s = matched[0];
  return `
  <strong>Thông tin chi tiết về "${s.TENSACH}":</strong>
  <ul>
    <li>Tác giả: ${s.TACGIA}</li>
    <li>Năm xuất bản: ${s.NAMXUATBAN}</li>
    <li>Số lượng còn lại: ${s.SOQUYEN}</li>
    <li>Giá: ${s.DONGIA.toLocaleString()}đ</li>
    <li>Mã sách: ${s.MASACH || s._id}</li>
    <li>ID: ${s._id}</li>
  </ul>
  ${
    s.SOQUYEN > 0
      ? `<button class="borrow-btn" data-book="${s.TENSACH}" data-masach="${s._id}" data-masach-string="${s.MASACH || s._id}">Đặt mượn sách này</button>`
      : `<i style="color:red;">Hiện đã hết sách, vui lòng chọn cuốn khác.</i>`
  }
`;
}

async function getBookSummary(lower) {
  try {
    const { search } = require("googlethis");
    const name = lower
      .replace("tóm tắt", "")
      .replace("nội dung sách", "")
      .replace("về", "")
      .trim();

    const results = await search(`Tóm tắt nội dung sách ${name}`);
    if (!results.results.length)
      return `Không tìm thấy thông tin tóm tắt về "${name}".`;

    const snippet = results.results[0].description;
    const url = results.results[0].url;
    return `<b>Tóm tắt sơ lược về "${name}":</b><br>${snippet}<br><a href="${url}" target="_blank">Nguồn tham khảo</a>`;
  } catch (err) {
    console.error("Lỗi tìm tóm tắt:", err.message);
    return "Không thể lấy thông tin tóm tắt sách vào lúc này.";
  }
}

async function getBorrowedBooks(docGiaId, docGiaMongoId, sachService, theodoiService) {
  const id = String(docGiaId || docGiaMongoId || "").trim();
  if (!id) return "Bạn cần đăng nhập để xem sách đang mượn.";

  const muonList = await theodoiService.find({
    $or: [{ MADOCGIA: id }, { MADOCGIA: docGiaId }, { MADOCGIA: docGiaMongoId }],
  });

  const sachDangMuon = muonList.filter(
    (m) =>
      (!m.trangThai && !m.NGAYTRA) ||
      (m.trangThai && !["Đã trả", "Mất sách"].includes(m.trangThai.trim()))
  );

  if (sachDangMuon.length === 0) return "Bạn hiện chưa mượn quyển sách nào.";

  const allBooks = await sachService.find({});

  const rows = sachDangMuon.map((m) => {
    const sach = allBooks.find(
      (s) => s.MASACH === m.MASACH || String(s._id) === String(m.MASACH)
    );
    const tenSach = sach?.TENSACH || "Không rõ tên sách";
    const ngayMuon = new Date(m.NGAYMUON).toLocaleDateString("vi-VN");
    const hanTra = new Date(
      new Date(m.NGAYMUON).setDate(
        new Date(m.NGAYMUON).getDate() + 14
      )
    ).toLocaleDateString("vi-VN");

    return `
      <tr>
        <td>${tenSach}</td>
        <td>${ngayMuon}</td>
        <td>${hanTra}</td>
      </tr>`;
  });

  return `
    <p>Danh sách sách bạn đang mượn:</p>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead style="background:#e3f2fd;">
        <tr><th>Tên sách</th><th>Ngày mượn</th><th>Hạn trả</th></tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
    <p>Nhớ trả sách đúng hạn bạn nhé! 😊</p>
  `;
}

function getLibraryRules() {
  return `
<b>Quy định thư viện:</b><ul>
<li>Mỗi độc giả được mượn tối đa <b>5 quyển</b></li>
<li>Thời gian mượn: <b>14 ngày</b></li>
<li>Phạt trễ hạn: <b>5.000đ/quyển/ngày</b></li>
<li>Bồi thường theo giá bìa nếu làm mất</li>
<li>Trường hợp mượn sách quá hạn trả và để mất sách, bạn sẽ phải bồi thường thêm 10% giá trị sách</li>
</ul>`;
}

function getLibraryInfo() {
  return `
<b>Giờ mở cửa thư viện:</b><br>
- Thứ 2 - Thứ 6: 7h30 - 17h00<br>
- Thứ 7: 7h30 - 11h30<br><br>
Liên hệ: <b>Ngô Nhựt Hào - 0865475344</b>`;
}

function getDefaultReply() {
  return `
Tôi có thể giúp bạn:<ul>
<li>Tra cứu sách, tìm theo tên hoặc tác giả</li>
<li>Kiểm tra sách bạn đang mượn</li>
<li>Xem quy định và giờ mở cửa thư viện</li>
<li>Đặt mượn sách trực tuyến</li>
<li>Tìm kiếm tóm tắt sách</li>
</ul>`;
}

async function requestBorrowBook(lower, sachService, theodoiService, docGiaId) {
  const allBooks = await sachService.find({});
  const keyword = lower
    .replace("mượn", "")
    .replace("đặt", "")
    .replace("muốn", "")
    .replace("sách", "")
    .trim()
    .toLowerCase();

  const matched = allBooks.find(
    (s) => s.TENSACH.toLowerCase().includes(keyword)
  );

  if (!matched)
    return `Không tìm thấy cuốn sách nào tên "<em>${keyword}</em>".`;

  if (matched.SOQUYEN <= 0)
    return `Rất tiếc, cuốn "<b>${matched.TENSACH}</b>" hiện đã hết sách để mượn.`;

  try {
    // Gọi API mượn sách
    const phieuMuon = {
      MADOCGIA: docGiaId,
      MASACH: matched.MASACH || matched._id,
      SOQUYEN: 1,
      NGAYMUON: new Date().toISOString(),
    };

    // Nếu bạn có direct access đến theodoiService
    const result = await theodoiService.create(phieuMuon);
    
    // Giảm số lượng sách
    await sachService.update(matched._id, { SOQUYEN: matched.SOQUYEN - 1 });

    return `
      ✅ <strong>Mượn sách thành công!</strong><br>
      <ul>
        <li><b>Sách:</b> ${matched.TENSACH}</li>
        <li><b>Tác giả:</b> ${matched.TACGIA}</li>
        <li><b>Mã sách:</b> ${matched.MASACH || matched._id}</li>
        <li><b>Ngày mượn:</b> ${new Date().toLocaleDateString('vi-VN')}</li>
        <li><b>Hạn trả:</b> ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')}</li>
      </ul>
      <p>Cảm ơn bạn đã sử dụng dịch vụ thư viện! 📚</p>
    `;
  } catch (error) {
    console.error("Lỗi khi mượn sách:", error);
    return `❌ <strong>Lỗi khi mượn sách:</strong> ${error.message || "Vui lòng thử lại sau"}`;
  }
}

function resetChat(docGiaId) {
  if (chatHistories[docGiaId]) {
    delete chatHistories[docGiaId];
    console.log(`Đã xóa lịch sử chat của người dùng: ${docGiaId}`);
    return true;
  }
  return false;
}

module.exports = { handleChat, resetChat };