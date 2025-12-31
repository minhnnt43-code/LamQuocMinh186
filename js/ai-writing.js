// --- FILE: js/ai-writing.js ---
// AI Writing Studio - Phase 4 (96-125 trừ 123)

import { aiService } from './ai-service.js';
import { showNotification, escapeHTML, showAIModal, formatAIContent } from './common.js';

/**
 * Khởi tạo AI Writing module
 */
export const initAIWriting = () => {
    setupWritingTabs();
    setupToneButtons();  // [MỚI] Setup tone buttons
    setupWritingEvents();
};

/**
 * Setup Tone Buttons (Tự nhiên, Chuyên nghiệp, Sáng tạo, Thân thiện)
 */
let currentTone = 'natural';
const setupToneButtons = () => {
    document.querySelectorAll('.tone-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            currentTone = btn.dataset.tone;
            showNotification(`Đã chọn giọng văn: ${btn.textContent.trim()}`);
        });
    });
};

/**
 * Setup tabs cho AI Writing Studio
 */
const setupWritingTabs = () => {
    const tabs = document.querySelectorAll('.ai-writing-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.background = 'rgba(255,255,255,0.2)';
                t.style.color = 'white';
            });
            tab.classList.add('active');
            tab.style.background = 'white';
            tab.style.color = '#f5576c';

            document.querySelectorAll('.ai-writing-tab-content').forEach(c => c.style.display = 'none');
            const content = document.getElementById(`tab-writing-${tab.dataset.tab}`);
            if (content) content.style.display = 'block';
        });
    });
};

/**
 * Lấy nội dung từ input hoặc editor
 */
const getWritingContent = () => {
    const input = document.getElementById('ai-writing-input');
    if (input && input.value.trim()) return input.value.trim();

    if (window.quill) {
        const selection = window.quill.getSelection();
        if (selection && selection.length > 0) {
            return window.quill.getText(selection.index, selection.length);
        }
        const text = window.quill.getText();
        if (text.trim()) return text.trim();
    }
    return null;
};

/**
 * Hiển thị kết quả
 */
const showWritingModal = (title, content, copyable = true) => {
    const existingModal = document.getElementById('ai-writing-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'ai-writing-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; max-width: 700px; width: 100%; max-height: 85vh; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="padding: 20px; background: linear-gradient(135deg, #f093fb, #f5576c); color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0;">✍️ ${title}</h2>
                    <button id="close-writing-modal" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
            </div>
            <div style="padding: 20px; overflow-y: auto; max-height: 60vh;">
                <div style="white-space: pre-wrap; line-height: 1.8; font-size: 1rem;">
                    ${escapeHTML(content).replace(/\n/g, '<br>')}
                </div>
                ${copyable ? `
                    <button id="btn-copy-writing" class="btn-submit" style="margin-top: 20px; width: 100%; background: linear-gradient(135deg, #f093fb, #f5576c);">
                        📋 Copy kết quả
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-writing-modal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    if (copyable) {
        modal.querySelector('#btn-copy-writing').onclick = async () => {
            await navigator.clipboard.writeText(content);
            showNotification('Đã copy! 📋');
        };
    }
};

/**
 * Xử lý chung cho các nút AI Writing
 */
const handleWritingAction = async (btnId, title, promptFn) => {
    const content = getWritingContent();
    if (!content) {
        showNotification('Vui lòng nhập nội dung hoặc chọn text trong editor!', 'error');
        return;
    }

    const btn = document.getElementById(btnId);
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳...';

    try {
        const result = await promptFn(content);
        showWritingModal(title, result);
        document.getElementById('ai-writing-input').value = '';
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

/**
 * Setup tất cả sự kiện
 */
const setupWritingEvents = () => {
    // === TAB CƠ BẢN ===

    // #96 Writing Assistant
    document.getElementById('btn-ai-write-assist')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-write-assist', 'Hỗ trợ viết', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Bạn là trợ lý viết văn bản. Hãy giúp người dùng hoàn thiện và cải thiện đoạn văn sau. Sửa lỗi chính tả, ngữ pháp và văn phong. Trả về phiên bản đã chỉnh sửa.'
            });
        });
    });

    // #97 Auto-complete
    document.getElementById('btn-ai-autocomplete')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-autocomplete', 'Gợi ý tiếp theo', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Bạn là trợ lý viết. Hãy tiếp tục viết 2-3 câu tiếp theo cho đoạn văn này một cách tự nhiên, mạch lạc.'
            });
        });
    });

    // #98 Tone Adjuster
    document.getElementById('btn-ai-tone')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-tone', 'Chỉnh giọng văn', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: `Chuyển đoạn văn sau thành 3 phiên bản với giọng văn khác nhau:
1. **Trang trọng (Formal)**: Phù hợp văn bản pháp lý, công văn
2. **Thân thiện (Friendly)**: Phù hợp blog, mạng xã hội
3. **Chuyên nghiệp (Professional)**: Phù hợp email công việc`
            });
        });
    });

    // #101 Rephraser
    document.getElementById('btn-ai-rephrase')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-rephrase', 'Viết lại', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Viết lại đoạn văn sau với cách diễn đạt khác, giữ nguyên ý nghĩa. Cho 2-3 phiên bản khác nhau.'
            });
        });
    });

    // #103 Text Expander
    document.getElementById('btn-ai-expand')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-expand', 'Mở rộng ý', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Mở rộng ý tưởng ngắn sau thành một đoạn văn hoàn chỉnh 150-200 từ. Thêm chi tiết, ví dụ và giải thích.'
            });
        });
    });

    // #104 Summarizer
    document.getElementById('btn-ai-summarize')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-summarize', 'Tóm tắt', async (text) => {
            return await aiService.summarize(text);
        });
    });

    // #112 Bullet Points
    document.getElementById('btn-ai-bullets')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-bullets', 'Gạch đầu dòng', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Chuyển đoạn văn sau thành danh sách gạch đầu dòng dễ đọc. Mỗi ý chính một dòng.'
            });
        });
    });

    // #113 Proofreader
    document.getElementById('btn-ai-proofread')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-proofread', 'Sửa lỗi chính tả', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Kiểm tra và sửa lỗi chính tả, ngữ pháp tiếng Việt trong đoạn văn. Liệt kê các lỗi đã sửa.'
            });
        });
    });

    // === TAB CHUYÊN NGHIỆP ===

    // #100 Email Composer
    document.getElementById('btn-ai-email')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-email', 'Soạn email', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Viết email chuyên nghiệp dựa trên nội dung sau. Bao gồm: Tiêu đề, Lời chào, Nội dung, Kết thúc phù hợp.'
            });
        });
    });

    // #108 Cover Letter
    document.getElementById('btn-ai-cover-letter')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-cover-letter', 'Thư xin việc', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Viết thư xin việc chuyên nghiệp dựa trên thông tin sau. Thể hiện sự nhiệt huyết, kỹ năng phù hợp và lý do muốn ứng tuyển.'
            });
        });
    });

    // #109 Resume Optimizer
    document.getElementById('btn-ai-resume')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-resume', 'Tối ưu CV', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Tối ưu nội dung CV này. Sử dụng action verbs mạnh, số liệu cụ thể, highlight thành tích. Gợi ý từ khóa phù hợp ATS.'
            });
        });
    });

    // #111 Bio Generator
    document.getElementById('btn-ai-bio')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-bio', 'Tiểu sử', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Viết tiểu sử ngắn gọn (100-150 từ) dựa trên thông tin sau. Tạo 3 phiên bản: Formal, LinkedIn, Twitter.'
            });
        });
    });

    // #116 Translation
    document.getElementById('btn-ai-translate')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-translate', 'Dịch thuật', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Dịch đoạn văn này sang Tiếng Anh. Nếu đã là Tiếng Anh, dịch sang Tiếng Việt. Giữ nguyên ý nghĩa và giọng văn.'
            });
        });
    });

    // #122 Meeting Notes
    document.getElementById('btn-ai-meeting-notes')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-meeting-notes', 'Meeting Notes', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: `Tạo meeting notes từ nội dung cuộc họp sau:
## Tóm tắt cuộc họp
## Các điểm chính
## Action items (ai làm gì, deadline)
## Quyết định đã đưa ra
## Bước tiếp theo`
            });
        });
    });

    // === TAB SÁNG TẠO ===

    // #99 Blog Generator
    document.getElementById('btn-ai-blog')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-blog', 'Blog Post', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Viết bài blog 300-400 từ về chủ đề sau. Bao gồm: Tiêu đề hấp dẫn, Mở bài hook, Thân bài với subheadings, Kết luận call-to-action.'
            });
        });
    });

    // #102 Title Generator
    document.getElementById('btn-ai-title')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-title', 'Gợi ý tiêu đề', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Tạo 10 gợi ý tiêu đề hấp dẫn cho nội dung này. Đa dạng phong cách: viral, informative, question-based, how-to...'
            });
        });
    });

    // #105 Writing Prompts
    document.getElementById('btn-ai-prompts')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-prompts', 'Ý tưởng viết', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Gợi ý 5-7 ý tưởng mở rộng hoặc góc nhìn mới cho chủ đề này. Mỗi ý tưởng kèm gợi ý cách triển khai.'
            });
        });
    });

    // #110 Social Media
    document.getElementById('btn-ai-social')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-social', 'Social Content', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Tạo content cho các nền tảng: 1) Facebook post (200 ký tự), 2) Instagram caption (với emoji), 3) LinkedIn post (300 ký tự), 4) Twitter/X (280 ký tự)'
            });
        });
    });

    // #114 Content Ideas
    document.getElementById('btn-ai-content-ideas')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-content-ideas', 'Content Ideas', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Gợi ý 10 ý tưởng content liên quan đến chủ đề này. Đa dạng format: blog, video, infographic, podcast, reel...'
            });
        });
    });

    // #118 Hashtags
    document.getElementById('btn-ai-hashtags')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-hashtags', 'Hashtags', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Tạo 20-30 hashtag phù hợp cho nội dung này. Chia thành: Popular (>1M), Medium (100K-1M), Niche (<100K).'
            });
        });
    });

    // #119 Caption
    document.getElementById('btn-ai-caption')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-caption', 'Caption ảnh', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Viết 5 caption Instagram cho bức ảnh/nội dung này. Thêm emoji phù hợp. Có hook mở đầu hay.'
            });
        });
    });

    // === TAB PHÂN TÍCH ===

    // #106 Consistency
    document.getElementById('btn-ai-consistency')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-consistency', 'Kiểm tra nhất quán', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Kiểm tra tính nhất quán trong văn bản: thuật ngữ, giọng văn, format, thì (tense), đại từ. Liệt kê vấn đề và cách sửa.'
            });
        });
    });

    // #107 Formatting
    document.getElementById('btn-ai-format')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-format', 'Định dạng văn bản', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Định dạng lại văn bản này cho chuyên nghiệp: thêm heading, chia đoạn hợp lý, in đậm/nghiêng từ khóa quan trọng.'
            });
        });
    });

    // #115 Draft Revisions
    document.getElementById('btn-ai-revise')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-revise', 'Đề xuất sửa đổi', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Đọc bản nháp và đề xuất 5-7 cải thiện cụ thể. Giải thích lý do và cung cấp ví dụ sửa cho mỗi điểm.'
            });
        });
    });

    // #117 Readability
    document.getElementById('btn-ai-readability')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-readability', 'Đánh giá độ dễ đọc', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: `Đánh giá độ dễ đọc của văn bản:
- Điểm Flesch-Kincaid (ước tính)
- Độ dài câu trung bình
- Từ ngữ phức tạp
- Đối tượng phù hợp
- Gợi ý cải thiện để dễ đọc hơn`
            });
        });
    });

    // #121 SEO
    document.getElementById('btn-ai-seo')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-seo', 'Tối ưu SEO', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: `Tối ưu SEO cho nội dung:
- Gợi ý title tag (60 ký tự)
- Meta description (160 ký tự)  
- Từ khóa chính và phụ
- Heading structure (H1, H2, H3)
- Internal/external link gợi ý
- Độ dài nội dung recommendations`
            });
        });
    });

    // #124 Sentiment
    document.getElementById('btn-ai-sentiment')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-sentiment', 'Phân tích cảm xúc', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: `Phân tích cảm xúc văn bản:
- Tone chủ đạo (positive/negative/neutral)
- Cường độ cảm xúc (1-10)
- Từ ngữ mang cảm xúc mạnh
- Phù hợp với mục đích gì
- Gợi ý điều chỉnh nếu cần`
            });
        });
    });

    // #125 Version Compare
    document.getElementById('btn-ai-compare')?.addEventListener('click', () => {
        handleWritingAction('btn-ai-compare', 'So sánh phiên bản', async (text) => {
            return await aiService.ask(text, {
                systemPrompt: 'Nếu văn bản có 2 phiên bản (ngăn cách bởi ---), hãy so sánh chúng: điểm khác biệt, phiên bản nào tốt hơn, lý do.'
            });
        });
    });
};
