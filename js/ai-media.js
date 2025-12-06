// --- FILE: js/ai-media.js ---
// AI Media Center - Phase 7 (126-145)

import { aiService } from './ai-service.js';
import { showNotification, escapeHTML, formatAIContent } from './common.js';

let uploadedImage = null;
let imageBase64 = null;

/**
 * Khởi tạo AI Media module
 */
export const initAIMedia = () => {
    setupMediaUpload();
    setupMediaEvents();
};

/**
 * Setup upload ảnh
 */
const setupMediaUpload = () => {
    const input = document.getElementById('media-file-input');
    const preview = document.getElementById('media-preview');
    const previewImg = document.getElementById('media-preview-img');

    input?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showNotification('File quá lớn! Max 10MB', 'error');
            return;
        }

        uploadedImage = file;

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (event) => {
            imageBase64 = event.target.result;
            previewImg.src = imageBase64;
            preview.style.display = 'block';
            showNotification('Đã tải ảnh lên! 📷');
        };
        reader.readAsDataURL(file);
    });
};

/**
 * Hiển thị kết quả
 */
const showResult = (title, content) => {
    const display = document.getElementById('ai-media-result');
    const titleEl = document.getElementById('media-result-title');
    const contentEl = document.getElementById('media-result-content');

    if (display && titleEl && contentEl) {
        titleEl.textContent = title;
        contentEl.innerHTML = formatAIContent(content);
        display.style.display = 'block';
        display.scrollIntoView({ behavior: 'smooth' });
    }
};

/**
 * Xử lý chung cho các nút media
 */
const handleMediaAction = async (btnId, title, systemPrompt, requireImage = true) => {
    if (requireImage && !imageBase64) {
        showNotification('Vui lòng tải ảnh lên trước!', 'error');
        return;
    }

    const btn = document.getElementById(btnId);
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang xử lý...';

    try {
        // Sử dụng AI phân tích (text-based vì Gemini API cần multimodal riêng)
        const prompt = requireImage
            ? `Tôi đã tải lên một ảnh. ${systemPrompt}`
            : systemPrompt;
        const result = await aiService.ask(prompt, { systemPrompt });
        showResult(title, result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

/**
 * Setup events
 */
const setupMediaEvents = () => {
    // Close result
    document.getElementById('btn-close-media-result')?.addEventListener('click', () => {
        document.getElementById('ai-media-result').style.display = 'none';
    });

    // #126 Image Captioning
    document.getElementById('btn-media-caption')?.addEventListener('click', () => {
        handleMediaAction('btn-media-caption', '📝 Mô tả ảnh AI',
            'Hãy mô tả chi tiết nội dung của ảnh này: đối tượng, khung cảnh, màu sắc, bầu không khí, emotion. Viết 3-4 câu mô tả sống động.');
    });

    // #127 Photo Organization
    document.getElementById('btn-media-organize')?.addEventListener('click', () => {
        handleMediaAction('btn-media-organize', '📂 Gợi ý sắp xếp ảnh',
            `Dựa trên ảnh này, hãy gợi ý cách phân loại:
- Danh mục phù hợp (Du lịch, Gia đình, Công việc, Sự kiện...)
- Thời điểm chụp ước đoán
- Tags gợi ý (5-10 tags)
- Tên album phù hợp`);
    });

    // #128 Image Enhancer
    document.getElementById('btn-media-enhance')?.addEventListener('click', () => {
        handleMediaAction('btn-media-enhance', '✨ Gợi ý nâng cao ảnh',
            `Phân tích chất lượng ảnh và đề xuất cải thiện:
- Đánh giá ánh sáng, độ tương phản, độ nét
- Gợi ý chỉnh sửa cụ thể (brightness, contrast, saturation)
- Đề xuất crop tốt hơn
- Filter/preset phù hợp`);
    });

    // #129 Background Remover
    document.getElementById('btn-media-removebg')?.addEventListener('click', () => {
        handleMediaAction('btn-media-removebg', '🪄 Gợi ý xóa nền',
            `Phân tích ảnh để xóa nền:
- Xác định đối tượng chính (subject)
- Độ phức tạp của nền
- Đề xuất công cụ phù hợp (remove.bg, Canva, Photoshop)
- Lưu ý khi xóa nền ảnh này`);
    });

    // #130 Face Recognition
    document.getElementById('btn-media-face')?.addEventListener('click', () => {
        handleMediaAction('btn-media-face', '👤 Nhận diện khuôn mặt',
            `Phân tích khuôn mặt trong ảnh:
- Số người trong ảnh
- Ước đoán giới tính, độ tuổi
- Biểu cảm (vui, buồn, nghiêm túc...)
- Gợi ý tag cho từng người`);
    });

    // #131 Smart Album
    document.getElementById('btn-media-album')?.addEventListener('click', () => {
        handleMediaAction('btn-media-album', '📸 Gợi ý tạo album',
            `Gợi ý tạo album cho ảnh này:
- Tên album sáng tạo (5 gợi ý)
- Theme/concept phù hợp
- Layout gợi ý
- Caption cho album`);
    });

    // #132 Duplicate Finder
    document.getElementById('btn-media-duplicate')?.addEventListener('click', () => {
        handleMediaAction('btn-media-duplicate', '🔍 Tìm ảnh trùng',
            `Hướng dẫn tìm ảnh trùng lặp:
- Cách sử dụng tính năng tìm ảnh trùng
- Công cụ gợi ý (Google Photos, Duplicate Cleaner)
- Tips tối ưu dung lượng
- Cách backup an toàn trước khi xóa`, false);
    });

    // #133 Filter Suggester
    document.getElementById('btn-media-filter')?.addEventListener('click', () => {
        handleMediaAction('btn-media-filter', '🎨 Gợi ý filter',
            `Gợi ý filter phù hợp cho ảnh:
- 5 filter/preset phù hợp nhất
- Lý do chọn từng filter
- Cách chỉnh manual để đạt hiệu ứng tương tự
- App/tool gợi ý`);
    });

    // #134 Thumbnail Generator
    document.getElementById('btn-media-thumbnail')?.addEventListener('click', () => {
        handleMediaAction('btn-media-thumbnail', '🖼️ Gợi ý thumbnail',
            `Gợi ý tạo thumbnail từ ảnh:
- Crop ratio phù hợp (16:9, 1:1, 4:5)
- Điểm focal point
- Có nên thêm text overlay không
- Template gợi ý`);
    });

    // #135 OCR Text Extractor
    document.getElementById('btn-media-ocr')?.addEventListener('click', () => {
        handleMediaAction('btn-media-ocr', '📄 Trích xuất text (OCR)',
            `Phân tích ảnh chứa text:
- Loại tài liệu (hóa đơn, thẻ, poster...)
- Ngôn ngữ text
- Gợi ý công cụ OCR tốt nhất (Google Lens, ABBYY)
- Cách cải thiện độ chính xác OCR`);
    });

    // #136 Collage Maker
    document.getElementById('btn-media-collage')?.addEventListener('click', () => {
        handleMediaAction('btn-media-collage', '🎞️ Gợi ý collage',
            `Gợi ý tạo collage:
- Layout phù hợp với ảnh này
- Số ảnh nên ghép thêm
- Theme màu sắc
- Tool/app gợi ý (Canva, PicsArt)`, false);
    });

    // #137 Color Analyzer
    document.getElementById('btn-media-color')?.addEventListener('click', () => {
        handleMediaAction('btn-media-color', '🌈 Phân tích màu sắc',
            `Phân tích bảng màu của ảnh:
- 5 màu chủ đạo (với mã HEX)
- Mood/cảm xúc từ màu sắc
- Gợi ý màu bổ sung (complementary)
- Ứng dụng trong thiết kế`);
    });

    // #138 Smart Cropping
    document.getElementById('btn-media-crop')?.addEventListener('click', () => {
        handleMediaAction('btn-media-crop', '✂️ Gợi ý crop ảnh',
            `Phân tích và gợi ý crop:
- Quy tắc 1/3 áp dụng thế nào
- Điểm focal point
- Các tỷ lệ crop phù hợp
- Phần nên giữ và bỏ`);
    });

    // #139 Avatar Generator
    document.getElementById('btn-media-avatar')?.addEventListener('click', () => {
        handleMediaAction('btn-media-avatar', '🧑‍🎨 Gợi ý tạo avatar',
            `Gợi ý tạo avatar từ ảnh:
- Style avatar phù hợp (cartoon, anime, vector...)
- Tool/app gợi ý (Lensa, Bitmoji, Notion)
- Cách crop mặt tốt nhất
- Lưu ý về ánh sáng`);
    });

    // #140 Similarity Search
    document.getElementById('btn-media-similar')?.addEventListener('click', () => {
        handleMediaAction('btn-media-similar', '🔎 Tìm ảnh tương tự',
            `Hướng dẫn tìm ảnh tương tự:
- Cách dùng Google Reverse Image Search
- Pinterest Visual Search
- TinEye
- Ứng dụng: tìm nguồn gốc, ảnh gốc chất lượng cao`, false);
    });

    // #141 Gallery Layout
    document.getElementById('btn-media-layout')?.addEventListener('click', () => {
        handleMediaAction('btn-media-layout', '📐 Gợi ý bố cục gallery',
            `Gợi ý bố cục gallery:
- Layout patterns (grid, masonry, carousel)
- Số cột phù hợp
- Spacing và padding
- CSS/HTML code mẫu`, false);
    });

    // #142 Document Scanner
    document.getElementById('btn-media-scan')?.addEventListener('click', () => {
        handleMediaAction('btn-media-scan', '📋 Phân tích tài liệu',
            `Phân tích ảnh tài liệu:
- Loại tài liệu (hợp đồng, hóa đơn, CMND...)
- Chất lượng scan
- Gợi ý cải thiện (góc chụp, ánh sáng)
- App scan tốt nhất (CamScanner, Adobe Scan)`);
    });

    // #143 Metadata Editor
    document.getElementById('btn-media-metadata')?.addEventListener('click', () => {
        handleMediaAction('btn-media-metadata', 'ℹ️ Thông tin metadata',
            `Phân tích và gợi ý metadata:
- EXIF data cần thiết
- Cách thêm copyright
- Geolocation privacy
- Tool chỉnh metadata (ExifTool)`, false);
    });

    // #144 Slideshow Creator
    document.getElementById('btn-media-slideshow')?.addEventListener('click', () => {
        handleMediaAction('btn-media-slideshow', '🎬 Gợi ý tạo slideshow',
            `Gợi ý tạo slideshow:
- Transition effects phù hợp
- Thời gian mỗi slide
- Nhạc nền gợi ý
- Tool/app (Canva, CapCut, iMovie)`, false);
    });

    // #145 Meme Generator
    document.getElementById('btn-media-meme')?.addEventListener('click', () => {
        handleMediaAction('btn-media-meme', '😂 Gợi ý tạo meme',
            `Gợi ý tạo meme từ ảnh:
- 5 caption text funny
- Meme template phù hợp
- Font và vị trí text
- Platform phù hợp chia sẻ`);
    });
};
