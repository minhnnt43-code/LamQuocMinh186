// --- FILE: js/ai-study.js ---
// AI cho học tập - Phase 3

import { aiService } from './ai-service.js';
import { showNotification, escapeHTML, showAIModal } from './common.js';

/**
 * Khởi tạo AI Study module
 */
export const initAIStudy = () => {
    setupStudyAIEvents();
};

/**
 * Setup các sự kiện
 */
const setupStudyAIEvents = () => {
    // Nút Tóm tắt
    const summarizeBtn = document.getElementById('btn-ai-summarize');
    if (summarizeBtn) {
        summarizeBtn.addEventListener('click', () => handleStudyAI('summarize'));
    }

    // Nút Cải thiện văn phong
    const improveBtn = document.getElementById('btn-ai-improve');
    if (improveBtn) {
        improveBtn.addEventListener('click', () => handleStudyAI('improve'));
    }

    // Nút Tạo Quiz
    const quizBtn = document.getElementById('btn-ai-quiz');
    if (quizBtn) {
        quizBtn.addEventListener('click', () => handleStudyAI('quiz'));
    }

    // Nút Giải thích
    const explainBtn = document.getElementById('btn-ai-explain');
    if (explainBtn) {
        explainBtn.addEventListener('click', () => handleStudyAI('explain'));
    }
};

/**
 * Lấy nội dung từ input hoặc từ editor (nếu có selection)
 */
const getContentToProcess = () => {
    // Ưu tiên lấy từ input
    const input = document.getElementById('ai-study-input');
    if (input && input.value.trim()) {
        return input.value.trim();
    }

    // Thử lấy từ Quill editor nếu có
    if (window.quill) {
        const selection = window.quill.getSelection();
        if (selection && selection.length > 0) {
            return window.quill.getText(selection.index, selection.length);
        }
        // Nếu không có selection, lấy toàn bộ
        const text = window.quill.getText();
        if (text.trim()) return text.trim();
    }

    return null;
};

/**
 * Xử lý AI Study theo loại action
 */
const handleStudyAI = async (action) => {
    const content = getContentToProcess();

    if (!content) {
        showNotification('Vui lòng nhập nội dung hoặc chọn văn bản trong editor!', 'error');
        return;
    }

    // Lấy button tương ứng
    const btnId = {
        'summarize': 'btn-ai-summarize',
        'improve': 'btn-ai-improve',
        'quiz': 'btn-ai-quiz',
        'explain': 'btn-ai-explain'
    }[action];

    const btn = document.getElementById(btnId);
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang xử lý...';

    try {
        let result;
        let title;

        switch (action) {
            case 'summarize':
                title = '📝 Tóm tắt nội dung';
                result = await aiService.summarize(content);
                break;

            case 'improve':
                title = '✨ Văn bản đã cải thiện';
                result = await aiService.improveWriting(content, 'formal');
                break;

            case 'quiz':
                title = '🎯 Câu hỏi ôn tập';
                result = await aiService.generateQuiz(content, 5);
                break;

            case 'explain':
                title = '💡 Giải thích khái niệm';
                result = await aiService.explainConcept(content, 'detailed');
                break;

            default:
                throw new Error('Action không hợp lệ');
        }

        // Hiển thị kết quả
        showAIStudyModal(title, result, action);

        // Clear input
        const input = document.getElementById('ai-study-input');
        if (input) input.value = '';

    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

/**
 * Hiển thị modal kết quả AI Study
 */
const showAIStudyModal = (title, content, action) => {
    // Xóa modal cũ nếu có
    const existingModal = document.getElementById('ai-study-modal');
    if (existingModal) existingModal.remove();

    // Gradient màu theo action
    const gradients = {
        'summarize': 'linear-gradient(135deg, #667eea, #764ba2)',
        'improve': 'linear-gradient(135deg, #11998e, #38ef7d)',
        'quiz': 'linear-gradient(135deg, #fc4a1a, #f7b733)',
        'explain': 'linear-gradient(135deg, #4facfe, #00f2fe)'
    };

    const modal = document.createElement('div');
    modal.id = 'ai-study-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; max-width: 700px; width: 100%; max-height: 85vh; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="padding: 20px; background: ${gradients[action] || gradients.summarize}; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0;">🤖 ${title}</h2>
                    <button id="close-ai-study-modal" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
            </div>
            <div style="padding: 20px; overflow-y: auto; max-height: 65vh;">
                <div style="white-space: pre-wrap; line-height: 1.8; font-size: 1rem;">
                    ${escapeHTML(content).replace(/\n/g, '<br>')}
                </div>
                ${action === 'improve' ? `
                    <button id="btn-copy-improved" class="btn-submit" style="margin-top: 20px; width: 100%; background: linear-gradient(135deg, #11998e, #38ef7d);">
                        📋 Copy văn bản đã cải thiện
                    </button>
                ` : ''}
                ${action === 'quiz' ? `
                    <button id="btn-start-quiz" class="btn-submit" style="margin-top: 20px; width: 100%; background: linear-gradient(135deg, #fc4a1a, #f7b733);">
                        🎮 Bắt đầu làm Quiz
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close events
    modal.querySelector('#close-ai-study-modal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    // Copy button for improve
    const copyBtn = modal.querySelector('#btn-copy-improved');
    if (copyBtn) {
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(content);
                showNotification('Đã copy vào clipboard! 📋');
            } catch (e) {
                showNotification('Không thể copy', 'error');
            }
        };
    }

    // Quiz button (future feature)
    const quizBtn = modal.querySelector('#btn-start-quiz');
    if (quizBtn) {
        quizBtn.onclick = () => {
            showNotification('Tính năng Quiz tương tác sẽ có trong Phase tiếp theo! 🔜');
        };
    }
};

// Export
export { handleStudyAI };

// ============================================================
// [MỚI] AI STUDY ASSISTANT - #36, #58, #60
// ============================================================

/**
 * Setup tabs cho AI Study Assistant
 */
export const setupStudyAssistantTabs = () => {
    const tabs = document.querySelectorAll('.ai-study-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.background = 'rgba(255,255,255,0.2)';
                t.style.color = 'white';
            });

            // Add active to clicked tab
            tab.classList.add('active');
            tab.style.background = 'white';
            tab.style.color = '#764ba2';

            // Hide all tab contents
            document.querySelectorAll('.ai-study-tab-content').forEach(content => {
                content.style.display = 'none';
            });

            // Show selected tab content
            const tabId = tab.dataset.tab;
            const content = document.getElementById(`tab-${tabId}`);
            if (content) content.style.display = 'block';
        });
    });
};

/**
 * Setup sự kiện cho AI Study Assistant
 */
export const setupStudyAssistantEvents = () => {
    setupStudyAssistantTabs();

    // #36 - AI Study Planner
    const studyPlanBtn = document.getElementById('btn-ai-study-plan');
    if (studyPlanBtn) {
        studyPlanBtn.addEventListener('click', handleAIStudyPlan);
    }

    // #58 - AI Essay Outline
    const essayOutlineBtn = document.getElementById('btn-ai-essay-outline');
    if (essayOutlineBtn) {
        essayOutlineBtn.addEventListener('click', handleAIEssayOutline);
    }

    // #60 - AI Schedule Optimizer
    const scheduleBtn = document.getElementById('btn-ai-schedule');
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', handleAIScheduleOptimizer);
    }
};

/**
 * #36 - AI Study Planner - Lập kế hoạch ôn thi thông minh
 */
const handleAIStudyPlan = async () => {
    const subject = document.getElementById('study-subject')?.value.trim();
    const examDate = document.getElementById('exam-date')?.value;
    const hours = document.getElementById('study-hours')?.value || 3;
    const chapters = document.getElementById('study-chapters')?.value.trim();

    if (!subject || !examDate) {
        showNotification('Vui lòng nhập môn thi và ngày thi!', 'error');
        return;
    }

    const btn = document.getElementById('btn-ai-study-plan');
    btn.disabled = true;
    btn.innerHTML = '⏳ AI đang lập kế hoạch...';

    try {
        const today = new Date();
        const exam = new Date(examDate);
        const daysLeft = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));

        const systemPrompt = `Bạn là chuyên gia lập kế hoạch học tập cho sinh viên Luật Việt Nam.
Hãy tạo kế hoạch ôn thi CHI TIẾT theo ngày.

Thông tin:
- Môn thi: ${subject}
- Số ngày còn lại: ${daysLeft} ngày
- Thời gian học mỗi ngày: ${hours} giờ
- Các chương cần ôn: ${chapters || 'Chưa xác định'}

Yêu cầu:
1. Chia thời gian hợp lý cho từng chương
2. Dành 20% thời gian cuối để ôn tổng hợp và làm đề
3. Có ngày nghỉ nếu trên 7 ngày
4. Format rõ ràng theo ngày
5. Gợi ý phương pháp học cho từng phần (đọc, ghi chú, flashcard, làm bài tập)`;

        const result = await aiService.ask(`Lập kế hoạch ôn thi ${subject}`, { systemPrompt });
        showAIStudyModal('📅 Kế hoạch ôn thi từ AI', result, 'study-plan');

    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🎯 Tạo kế hoạch ôn thi với AI';
    }
};

/**
 * #58 - AI Essay Outline - Tạo dàn ý bài luận pháp luật
 */
const handleAIEssayOutline = async () => {
    const topic = document.getElementById('essay-topic')?.value.trim();
    const type = document.getElementById('essay-type')?.value || 'essay';
    const length = document.getElementById('essay-length')?.value || 'medium';

    if (!topic) {
        showNotification('Vui lòng nhập đề bài!', 'error');
        return;
    }

    const btn = document.getElementById('btn-ai-essay-outline');
    btn.disabled = true;
    btn.innerHTML = '⏳ AI đang xây dựng dàn ý...';

    const typeLabels = {
        'essay': 'Tiểu luận pháp luật',
        'thesis': 'Khóa luận/Luận văn',
        'case-study': 'Phân tích tình huống pháp lý',
        'comparison': 'So sánh pháp luật',
        'argument': 'Bài nghị luận pháp lý'
    };

    const lengthLabels = {
        'short': '2-5 trang',
        'medium': '5-10 trang',
        'long': '10-20 trang'
    };

    try {
        const systemPrompt = `Bạn là giảng viên Luật hướng dẫn sinh viên viết ${typeLabels[type]}.
Hãy tạo DÀN Ý CHI TIẾT cho bài viết.

Yêu cầu:
- Đề bài: ${topic}
- Loại bài: ${typeLabels[type]}
- Độ dài: ${lengthLabels[length]}

Format dàn ý:
I. MỞ ĐẦU
   - Lý do chọn đề tài
   - Mục đích nghiên cứu
   - Phương pháp nghiên cứu (nếu cần)

II. NỘI DUNG
   Chương 1: ...
      1.1. ...
      1.2. ...
   Chương 2: ...
   (Chi tiết các mục con)

III. KẾT LUẬN
   - Tóm tắt kết quả
   - Kiến nghị (nếu có)

IV. TÀI LIỆU THAM KHẢO (gợi ý)

Hãy tạo dàn ý cụ thể, phù hợp với đề bài và pháp luật Việt Nam.`;

        const result = await aiService.ask(`Tạo dàn ý cho: ${topic}`, { systemPrompt });
        showAIStudyModal('📝 Dàn ý bài luận từ AI', result, 'essay-outline');

    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📑 Tạo dàn ý với AI';
    }
};

/**
 * #60 - AI Schedule Optimizer - Tối ưu lịch học
 */
const handleAIScheduleOptimizer = async () => {
    const subjectsList = document.getElementById('subjects-list')?.value.trim();
    const days = document.getElementById('schedule-days')?.value || 7;
    const peakHours = document.getElementById('peak-hours')?.value || 'evening';

    if (!subjectsList) {
        showNotification('Vui lòng nhập danh sách môn học!', 'error');
        return;
    }

    const btn = document.getElementById('btn-ai-schedule');
    btn.disabled = true;
    btn.innerHTML = '⏳ AI đang tối ưu...';

    const peakLabels = {
        'morning': 'Sáng (6h-12h)',
        'afternoon': 'Chiều (12h-18h)',
        'evening': 'Tối (18h-23h)',
        'mixed': 'Cả ngày'
    };

    try {
        const systemPrompt = `Bạn là chuyên gia tối ưu lịch học cho sinh viên.
Dựa trên các môn học và thời gian cung cấp, hãy tạo LỊCH HỌC TỐI ƯU.

Thông tin:
- Danh sách môn (Tên - Số giờ cần):
${subjectsList}
- Số ngày để phân bổ: ${days} ngày
- Khung giờ hiệu quả: ${peakLabels[peakHours]}

Nguyên tắc tối ưu:
1. Môn khó/cần nhiều giờ → chia nhỏ ra nhiều ngày
2. Xen kẽ môn khó và môn dễ
3. Không học quá 4 giờ liên tục một môn
4. Có thời gian nghỉ giữa các block
5. Tập trung môn khó vào khung giờ hiệu quả
6. Dành thời gian ôn lại vào cuối tuần

Format output:
## Thứ 2 (Ngày X/12)
- 18:00-19:30: [Môn A] - Chương 1
- 19:45-21:15: [Môn B] - Lý thuyết
...

## Tóm tắt:
- Tổng giờ học: X giờ
- Phân bổ: ...`;

        const result = await aiService.ask(`Tối ưu lịch học với các môn: ${subjectsList}`, { systemPrompt });
        showAIStudyModal('⚡ Lịch học tối ưu từ AI', result, 'schedule');

    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '⚡ Tối ưu lịch với AI';
    }
};
