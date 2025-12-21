// ============================================================
// FILE: js/ai/prompts.js
// Mục đích: Kho lưu trữ các prompt template cho AI
// ============================================================

/**
 * Thư viện Prompt Templates cho các tác vụ viết tin bài
 */
export const PROMPTS = {

    // ==================== PHẦN D: VIẾT TIN BÀI ====================

    /**
     * D1: Viết tin hoạt động Đoàn - Hội
     */
    ACTIVITY_NEWS: (info) => `
Bạn là một cán bộ truyền thông chuyên nghiệp của Đoàn Thanh niên - Hội Sinh viên. Hãy viết một bản tin hoạt động dựa trên thông tin sau:

📋 THÔNG TIN HOẠT ĐỘNG:
- Tên hoạt động: ${info.name || '[Chưa có]'}
- Thời gian: ${info.time || '[Chưa có]'}
- Địa điểm: ${info.location || '[Chưa có]'}
- Thành phần tham gia: ${info.participants || '[Chưa có]'}
- Nội dung chính: ${info.content || '[Chưa có]'}
- Mục đích/Ý nghĩa: ${info.purpose || '[Chưa có]'}

YÊU CẦU:
1. Tiêu đề: Hấp dẫn, súc tích, dùng từ ngữ trẻ trung
2. Văn phong: Nhiệt huyết, tích cực nhưng vẫn giữ tính chính trị của Đoàn
3. Cấu trúc:
   - Mở đầu: Giới thiệu hoạt động (1-2 câu)
   - Diễn biến: Mô tả chi tiết nội dung (2-3 đoạn)
   - Kết luận: Ý nghĩa, cam kết tiếp tục (1 đoạn)
4. Độ dài: Khoảng 300-500 từ
5. Kết thúc bằng 3-5 hashtag phù hợp (#ĐoànTNCS, #HoiSinhVien, etc.)

Hãy viết ngay!
    `,

    /**
     * D2: Viết tin sinh hoạt Chi bộ / Đảng bộ
     */
    PARTY_NEWS: (info) => `
Bạn là Thư ký Chi bộ Đảng. Hãy viết một bản tin về buổi sinh hoạt Chi bộ/Đảng bộ:

📋 THÔNG TIN BUỔI SINH HOẠT:
- Tên buổi sinh hoạt: ${info.name || '[Chưa có]'}
- Thời gian: ${info.time || '[Chưa có]'}
- Chủ trì: ${info.host || '[Chưa có]'}
- Nội dung quán triệt: ${info.content || '[Chưa có]'}
- Ý kiến thảo luận nổi bật: ${info.discussion || '[Chưa có]'}
- Kết luận/Nghị quyết: ${info.conclusion || '[Chưa có]'}

YÊU CẦU:
1. Tiêu đề: Trang trọng, đúng chuẩn mực Đảng
2. Văn phong: Chính luận, nghiêm túc, khách quan
3. Cấu trúc theo mẫu chuẩn:
   - Phần mở đầu
   - Nội dung sinh hoạt
   - Kết luận và phương hướng
4. Nhấn mạnh sự thống nhất và tinh thần trách nhiệm cao
5. Độ dài: 400-600 từ

Hãy viết bản tin!
    `,

    /**
     * D5: Viết Caption cho Mạng xã hội
     */
    SOCIAL_CAPTION: (content, platform = 'Facebook') => `
Viết một caption (chú thích) cho bài đăng trên ${platform} với nội dung chính:

"${content}"

YÊU CẦU:
- Độ dài: Ngắn gọn (100-200 từ cho Facebook, 50-100 từ cho TikTok/Instagram)
- Tone: ${platform === 'TikTok' ? 'Trẻ trung, năng động, trending' : 'Chuyên nghiệp nhưng thân thiện'}
- Gây tò mò hoặc có call-to-action mạnh mẽ (ví dụ: "Tag bạn bè", "Comment ý kiến")
- Sử dụng emoji phù hợp để sinh động 🌟💙⚡
- Kèm 3-5 hashtag trending và liên quan
${platform === 'Zalo' ? '- Văn phong trang trọng hơn một chút (vì Zalo thường dùng nội bộ)' : ''}

Hãy viết caption hấp dẫn!
    `,

    /**
     * D8: Báo cáo hoạt động tháng/quý
     */
    ACTIVITY_REPORT: (data) => `
Hãy viết một Báo cáo Hoạt động Đoàn - Hội tháng ${data.month || '[Tháng]'} dựa trên dữ liệu sau:

📊 DỮ LIỆU HOẠT ĐỘNG:
- Tổng số hoạt động đã tổ chức: ${data.count || '[Số lượng]'}
- Các hoạt động nổi bật: ${data.highlights || '[Danh sách]'}
- Tổng số lượt đoàn viên tham gia: ${data.participants || '[Số lượng]'}
- Kết quả đạt được: ${data.results || '[Mô tả]'}
- Hạn chế/Khó khăn (nếu có): ${data.limitations || 'Không có'}
- Phương hướng tháng tới: ${data.next_month || '[Kế hoạch]'}

YÊU CẦU:
1. Trình bày theo thể thức báo cáo hành chính chuẩn
2. Chia thành các mục rõ ràng:
   I. TÌNH HÌNH CHUNG
   II. KẾT QUẢ ĐẠT ĐƯỢC
   III. HẠN CHẾ, TỒN TẠI
   IV. PHƯƠNG HƯỚNG THỜI GIAN TỚI
3. Ngôn ngữ: Khách quan, súc tích, có số liệu cụ thể
4. Độ dài: 500-700 từ

Hãy viết báo cáo!
    `,

    /**
     * E2: Tóm tắt Nghị quyết Đảng
     */
    SUMMARIZE_RESOLUTION: (text) => `
Hãy tóm tắt nội dung Nghị quyết sau đây thành các điểm chính cốt lõi, dễ hiểu cho đoàn viên thanh niên:

📜 NỘI DUNG NGHỊ QUYẾT:
"${text}"

YÊU CẦU:
1. Nêu rõ BỐI CẢNH/LÝ DO ban hành Nghị quyết
2. Liệt kê MỤC TIÊU TỔNG QUÁT và cụ thể
3. Tóm tắt các NHIỆM VỤ/GIẢI PHÁP trọng tâm (dạng danh sách)
4. Chỉ ra ĐIỂM MỚI so với các Nghị quyết trước (nếu có)
5. Nêu TÌNH THẦN và yêu cầu triển khai

📝 ĐỊNH DẠNG:
- Trình bày dạng bullet points, rõ ràng
- Ngôn ngữ đơn giản, dễ nhớ
- Độ dài: 500-800 từ
- Có thể dùng emoji để dễ đọc (📌, ✅, 🎯)

Hãy tóm tắt!
    `,

    /**
     * D4: Viết bài kêu gọi tham gia hoạt động
     */
    CAMPAIGN_POST: (info) => `
Viết một bài kêu gọi đoàn viên, sinh viên tham gia hoạt động:

📣 THÔNG TIN HOẠT ĐỘNG:
- Tên hoạt động: ${info.name || '[Tên]'}
- Thời gian: ${info.time || '[Thời gian]'}
- Đối tượng: ${info.target || 'Tất cả đoàn viên'}
- Quyền lợi khi tham gia: ${info.benefits || '[Quyền lợi]'}
- Cách đăng ký: ${info.registration || '[Link/Form]'}

YÊU CẦU:
1. Tiêu đề: Thu hút, tạo cảm hứng
2. Nội dung: Giải thích tại sao nên tham gia, lợi ích gì
3. Call-to-action mạnh mẽ: "Đăng ký ngay!", "Đừng bỏ lỡ!"
4. Tone: Nhiệt huyết, tích cực, gây hứng thú
5. Emoji phong phú để thu hút
6. Kèm hashtag

Độ dài: 200-300 từ

Hãy viết!
    `,

    /**
     * D6: Viết kịch bản video ngắn (TikTok/Reels)
     */
    VIDEO_SCRIPT: (info) => `
Viết kịch bản cho video ngắn (TikTok/Reels) về:

🎬 THÔNG TIN VIDEO:
- Chủ đề: ${info.topic || '[Chủ đề]'}
- Thời lượng mong muốn: ${info.duration || '30-60 giây'}
- Thông điệp chính: ${info.message || '[Message]'}
- Đối tượng: ${info.audience || 'Gen Z, đoàn viên'}

YÊU CẦU:
1. Chia thành các CẢNH (Scene) cụ thể
2. Mỗi cảnh ghi rõ:
   - Hình ảnh: Quay gì
   - Lời thoại/Text: Nói/Hiển thị gì
   - Âm thanh: Nhạc nền gợi ý (trending)
3. Hook đầu (3 giây đầu) phải bắt mắt
4. Kết thúc có CTA rõ ràng
5. Trend: Dùng format viral nếu có thể

Hãy viết kịch bản!
    `,

    /**
     * D7: Viết thư mời / Thông báo chính thức
     */
    FORMAL_LETTER: (info) => `
Viết một ${info.type || 'thư mời'} chính thức:

📨 THÔNG TIN:
- Loại văn bản: ${info.type || 'Thư mời'}
- Người nhận: ${info.recipient || '[Đối tượng]'}
- Nội dung chính: ${info.content || '[Nội dung]'}
- Thời gian/Địa điểm (nếu có): ${info.details || ''}

YÊU CẦU:
1. Theo đúng thể thức văn bản hành chính
2. Cấu trúc:
   - Kính gửi: ...
   - Nội dung chính
   - Đề nghị/Mong muốn
   - Kính chúc
3. Văn phong: Trang trọng, lịch sự
4. Chữ ký: [Tên đơn vị]

Hãy viết văn bản!
    `,

    /**
     * D9: Chỉnh sửa và cải thiện văn bản
     */
    IMPROVE_TEXT: (text) => `
Hãy chỉnh sửa và cải thiện văn bản sau:

"${text}"

NHIỆM VỤ:
1. ✅ Sửa lỗi chính tả, ngữ pháp
2. ✅ Cải thiện cách diễn đạt (mạch lạc hơn, chuyên nghiệp hơn)
3. ✅ Tối ưu độ dài (cắt bớt thừa, bổ sung thiếu)
4. ✅ Đề xuất tiêu đề hay hơn (nếu có)
5. ✅ Giữ nguyên ý nghĩa gốc

Trả về 2 phần:
- BẢN ĐÃ SỬA
- GIẢI THÍCH: Đã thay đổi gì và tại sao

Bắt đầu!
    `,

    /**
     * D10: Dịch văn bản sang tiếng Anh (hoặc ngược lại)
     */
    TRANSLATE: (text, targetLang = 'Tiếng Anh') => `
Hãy dịch văn bản sau sang ${targetLang}:

"${text}"

YÊU CẦU:
1. Dịch chính xác, tự nhiên
2. Giữ nguyên văn phong (trang trọng/thân mật)
3. Với thuật ngữ Đoàn/Đảng: Dịch chuẩn hoặc giữ nguyên + ghi chú
4. Nếu có tên riêng: Giữ nguyên tiếng Việt

Hãy dịch!
    `,

    /**
     * Prompt tổng quát cho Chat Assistant (nếu cần)
     */
    CHAT_ASSISTANT: (userMsg) => `
Bạn là Trợ lý ảo thông minh của hệ thống quản lý cá nhân, phục vụ một Sinh viên Luật kiêm Cán bộ Truyền thông Đoàn - Hội.

🎯 VAI TRÒ: Hỗ trợ công việc học tập, nghiên cứu pháp luật, và công tác Đoàn.

❓ CÂU HỎI: "${userMsg}"

Hãy trả lời:
- Ngắn gọn, đi thẳng vào vấn đề
- Chuyên nghiệp nhưng thân thiện
- Nếu liên quan Luật: Trích dẫn điều luật (nếu biết)
- Nếu liên quan Đoàn: Dùng thuật ngữ chuẩn

Trả lời ngay!
    `
};

/**
 * Helper: Kiểm tra prompt có hợp lệ không
 */
export function validatePromptInputs(inputs) {
    for (let key in inputs) {
        if (!inputs[key] || inputs[key].trim() === '') {
            return { valid: false, missing: key };
        }
    }
    return { valid: true };
}
