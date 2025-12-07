// --- FILE: js/ai-automation.js ---
// AI Automation Features - Phase H
// #64 Natural Search, #70 Auto Categorize, #71 Meeting Summary, #72 Email Draft, #73 Translation, #74 Code Explainer

import { aiService } from './ai-service.js';
import { showNotification, showAIModal, escapeHTML } from './common.js';

let globalData = null;
let currentUser = null;

/**
 * Khởi tạo AI Automation module
 */
export const initAIAutomation = (data, user) => {
    globalData = data;
    currentUser = user;
    setupAutomationEvents();
};

/**
 * Setup events
 */
const setupAutomationEvents = () => {
    // #64 Natural Language Search
    document.getElementById('btn-ai-search')?.addEventListener('click', handleNaturalSearch);
    document.getElementById('ai-search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleNaturalSearch();
    });

    // #70 Auto Categorize
    document.getElementById('btn-ai-categorize')?.addEventListener('click', handleAutoCategorize);

    // #71 Meeting Summary
    document.getElementById('btn-ai-meeting-summary')?.addEventListener('click', handleMeetingSummary);

    // #72 Email Draft
    document.getElementById('btn-ai-email-draft')?.addEventListener('click', handleEmailDraft);

    // #73 Quick Translation
    document.getElementById('btn-ai-quick-translate')?.addEventListener('click', handleQuickTranslate);

    // #74 Code Explainer
    document.getElementById('btn-ai-code-explain')?.addEventListener('click', handleCodeExplain);
};

/**
 * #64 - Natural Language Search
 */
const handleNaturalSearch = async () => {
    const input = document.getElementById('ai-search-input');
    const query = input?.value?.trim();
    if (!query) {
        showNotification('Vui lòng nhập câu hỏi tìm kiếm!', 'error');
        return;
    }

    const btn = document.getElementById('btn-ai-search');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳...';
    }

    try {
        const tasks = globalData?.tasks || [];
        const events = globalData?.calendarEvents || [];
        const projects = globalData?.projects || [];

        const dataContext = `
Dữ liệu người dùng:
- Tasks (${tasks.length}): ${tasks.slice(0, 10).map(t => `"${t.name}" (${t.status}, hạn: ${t.dueDate})`).join(', ')}
- Events (${events.length}): ${events.slice(0, 10).map(e => `"${e.title}" (${e.date} ${e.startTime})`).join(', ')}
- Projects (${projects.length}): ${projects.map(p => p.name).join(', ')}
`;

        const prompt = `Câu hỏi tìm kiếm: "${query}"

${dataContext}

Tìm và trả lời dựa trên dữ liệu trên. Nếu không tìm thấy, nói rõ.
Format: Liệt kê kết quả phù hợp, giải thích ngắn gọn.`;

        const result = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là trợ lý tìm kiếm thông minh. Tìm thông tin trong dữ liệu người dùng.'
        });

        showAIModal('🔍 Kết quả tìm kiếm', result);
        input.value = '';

    } catch (e) {
        showNotification('Lỗi tìm kiếm: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🔍 Tìm';
        }
    }
};

/**
 * #70 - Auto Categorize Tasks
 */
const handleAutoCategorize = async () => {
    const tasks = (globalData?.tasks || []).filter(t => !t.category || t.category === 'Chung');

    if (tasks.length === 0) {
        showNotification('Không có task nào cần phân loại!', 'info');
        return;
    }

    const btn = document.getElementById('btn-ai-categorize');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang phân loại...';
    }

    try {
        const taskList = tasks.map(t => ({ id: t.id, name: t.name }));

        const prompt = `Phân loại các công việc sau vào categories: Học tập, Công việc, Cá nhân, Gia đình, Sức khỏe, Tài chính.

Tasks:
${taskList.map(t => `- ID: ${t.id}, Tên: "${t.name}"`).join('\n')}

Trả về JSON array:
[{"id": "...", "category": "..."}]`;

        const result = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là AI phân loại. Chỉ trả về JSON.'
        });

        const match = result.match(/\[[\s\S]*\]/);
        if (match) {
            const updates = JSON.parse(match[0]);
            let count = 0;
            updates.forEach(u => {
                const task = globalData.tasks.find(t => t.id === u.id);
                if (task) {
                    task.category = u.category;
                    count++;
                }
            });

            if (window.renderTasks) window.renderTasks();
            showNotification(`Đã phân loại ${count} công việc! 🏷️`);
        }
    } catch (e) {
        showNotification('Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🏷️ Auto Categorize';
        }
    }
};

/**
 * #71 - Meeting Summary Generator
 */
const handleMeetingSummary = async () => {
    const input = document.getElementById('meeting-notes-input');
    const notes = input?.value?.trim();

    if (!notes) {
        showNotification('Vui lòng nhập nội dung cuộc họp!', 'error');
        return;
    }

    const btn = document.getElementById('btn-ai-meeting-summary');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳...';
    }

    try {
        const prompt = `Tóm tắt cuộc họp từ ghi chú sau:

${notes}

Format:
## 📋 Tóm tắt cuộc họp
## 👥 Người tham gia (nếu có)
## 📌 Điểm chính
## ✅ Action Items
## 📅 Bước tiếp theo`;

        const result = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là trợ lý tóm tắt cuộc họp chuyên nghiệp.'
        });

        showAIModal('📋 Tóm tắt cuộc họp', result);

    } catch (e) {
        showNotification('Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '📋 Tóm tắt';
        }
    }
};

/**
 * #72 - Email Draft Generator
 */
const handleEmailDraft = async () => {
    const input = document.getElementById('email-context-input');
    const context = input?.value?.trim();

    if (!context) {
        showNotification('Vui lòng nhập nội dung email cần viết!', 'error');
        return;
    }

    const btn = document.getElementById('btn-ai-email-draft');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳...';
    }

    try {
        const prompt = `Viết email dựa trên yêu cầu: "${context}"

Tạo 2 phiên bản:
1. **Formal** (Trang trọng - cho đối tác, cấp trên)
2. **Friendly** (Thân thiện - cho đồng nghiệp)

Mỗi phiên bản gồm: Subject, Body (có greeting và closing).`;

        const result = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là chuyên gia viết email chuyên nghiệp bằng tiếng Việt.'
        });

        showAIModal('✉️ Email Draft', result);

    } catch (e) {
        showNotification('Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '✉️ Tạo Email';
        }
    }
};

/**
 * #73 - Quick Translation
 */
const handleQuickTranslate = async () => {
    const input = document.getElementById('translate-input');
    const text = input?.value?.trim();

    if (!text) {
        showNotification('Vui lòng nhập văn bản cần dịch!', 'error');
        return;
    }

    const btn = document.getElementById('btn-ai-quick-translate');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳...';
    }

    try {
        const prompt = `Dịch văn bản sau:
"${text}"

Nếu là tiếng Việt → dịch sang Tiếng Anh
Nếu là tiếng Anh → dịch sang Tiếng Việt
Nếu là ngôn ngữ khác → dịch sang cả Tiếng Việt và Tiếng Anh

Format:
**Ngôn ngữ gốc**: [tên]
**Bản dịch**:
[nội dung đã dịch]`;

        const result = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là dịch giả chuyên nghiệp.'
        });

        showAIModal('🌐 Bản dịch', result);

    } catch (e) {
        showNotification('Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🌐 Dịch';
        }
    }
};

/**
 * #74 - Code Explainer
 */
const handleCodeExplain = async () => {
    const input = document.getElementById('code-input');
    const code = input?.value?.trim();

    if (!code) {
        showNotification('Vui lòng nhập đoạn code cần giải thích!', 'error');
        return;
    }

    const btn = document.getElementById('btn-ai-code-explain');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳...';
    }

    try {
        const prompt = `Giải thích đoạn code sau:

\`\`\`
${code}
\`\`\`

Format:
## 📝 Tổng quan
(Mô tả ngắn code làm gì)

## 🔍 Giải thích từng phần
(Giải thích line by line hoặc block by block)

## 💡 Gợi ý cải thiện
(Nếu có)`;

        const result = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là senior developer giải thích code dễ hiểu cho người mới.'
        });

        showAIModal('💻 Giải thích Code', result);

    } catch (e) {
        showNotification('Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '💻 Giải thích';
        }
    }
};

// Export
export {
    handleNaturalSearch,
    handleAutoCategorize,
    handleMeetingSummary,
    handleEmailDraft,
    handleQuickTranslate,
    handleCodeExplain
};
