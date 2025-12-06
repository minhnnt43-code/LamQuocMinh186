// --- FILE: js/ai-tasks.js ---
// AI cho quản lý công việc - Phase 2

import { aiService } from './ai-service.js';
import { showNotification, generateID, toLocalISOString, escapeHTML, showAIModal } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;
let pendingAITask = null; // Task đang chờ xác nhận

/**
 * Khởi tạo AI Tasks module
 */
export const initAITasks = (data, user) => {
    globalData = data;
    currentUser = user;

    setupAITaskEvents();
};

/**
 * Setup các sự kiện
 */
const setupAITaskEvents = () => {
    // Nút AI Add Task
    const aiAddBtn = document.getElementById('btn-ai-add-task');
    if (aiAddBtn) {
        aiAddBtn.addEventListener('click', handleAIAddTask);
    }

    // Enter trong input AI
    const aiInput = document.getElementById('ai-task-input');
    if (aiInput) {
        aiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAIAddTask();
        });
    }

    // Xác nhận task AI
    const confirmBtn = document.getElementById('btn-ai-confirm-task');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleConfirmAITask);
    }

    // Hủy task AI
    const cancelBtn = document.getElementById('btn-ai-cancel-task');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancelAITask);
    }

    // Nút AI Prioritize
    const prioritizeBtn = document.getElementById('btn-ai-prioritize');
    if (prioritizeBtn) {
        prioritizeBtn.addEventListener('click', handleAIPrioritize);
    }

    // Nút AI Suggest
    const suggestBtn = document.getElementById('btn-ai-suggest');
    if (suggestBtn) {
        suggestBtn.addEventListener('click', handleAISuggest);
    }
};

/**
 * Xử lý thêm task bằng AI
 */
const handleAIAddTask = async () => {
    const input = document.getElementById('ai-task-input');
    const preview = document.getElementById('ai-task-preview');
    const previewContent = document.getElementById('ai-task-preview-content');
    const addBtn = document.getElementById('btn-ai-add-task');

    const text = input.value.trim();
    if (!text) {
        showNotification('Vui lòng nhập mô tả công việc!', 'error');
        return;
    }

    // Hiển thị loading
    addBtn.disabled = true;
    addBtn.innerHTML = '⏳ Đang phân tích...';

    try {
        // System prompt để parse task
        const systemPrompt = `Bạn là parser chuyên phân tích câu tiếng Việt thành thông tin công việc.
Trả về JSON thuần, KHÔNG giải thích.

Ngày hôm nay: ${new Date().toLocaleDateString('vi-VN')} (${toLocalISOString(new Date())})

Format trả về:
{
    "name": "tên công việc ngắn gọn",
    "dueDate": "YYYY-MM-DD" (tính từ ngày hôm nay, VD: "thứ 5" -> ngày thứ 5 tuần này),
    "dueTime": "HH:mm" (nếu có đề cập giờ, VD: "2h chiều" -> "14:00"),
    "priority": "high" hoặc "medium" hoặc "low" (mặc định medium),
    "category": "Học tập" hoặc "Công việc" hoặc "Cá nhân" hoặc "Gia đình" hoặc "Khác",
    "notes": "ghi chú bổ sung nếu có"
}`;

        const response = await aiService.ask(text, { systemPrompt, temperature: 0.3 });

        // Parse JSON từ response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Không thể phân tích câu này');
        }

        pendingAITask = JSON.parse(jsonMatch[0]);

        // Hiển thị preview
        previewContent.innerHTML = `
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 5px 15px;">
                <strong>📌 Tên:</strong> <span>${escapeHTML(pendingAITask.name)}</span>
                <strong>📅 Hạn:</strong> <span>${pendingAITask.dueDate || 'Không có'} ${pendingAITask.dueTime || ''}</span>
                <strong>🎯 Ưu tiên:</strong> <span>${pendingAITask.priority === 'high' ? '🔴 Cao' : pendingAITask.priority === 'low' ? '🟢 Thấp' : '🟡 Trung bình'}</span>
                <strong>📂 Loại:</strong> <span>${pendingAITask.category || 'Chung'}</span>
                ${pendingAITask.notes ? `<strong>📝 Ghi chú:</strong> <span>${escapeHTML(pendingAITask.notes)}</span>` : ''}
            </div>
        `;
        preview.style.display = 'block';

        showNotification('AI đã phân tích xong! Xem preview và xác nhận.', 'success');

    } catch (error) {
        console.error('AI Parse Error:', error);
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = '✨ Tạo với AI';
    }
};

/**
 * Xác nhận thêm task từ AI
 */
const handleConfirmAITask = async () => {
    if (!pendingAITask) return;

    const taskData = {
        id: generateID('task'),
        name: pendingAITask.name,
        priority: pendingAITask.priority || 'medium',
        category: pendingAITask.category || 'Chung',
        dueDate: pendingAITask.dueDate || toLocalISOString(new Date()),
        status: 'Chưa thực hiện',
        project: '',
        recurrence: 'none',
        link: '',
        tags: 'AI-created',
        notes: pendingAITask.notes || '',
        createdByAI: true
    };

    // Thêm vào globalData
    if (!globalData.tasks) globalData.tasks = [];
    globalData.tasks.push(taskData);

    await saveUserData(currentUser.uid, { tasks: globalData.tasks });

    // Reset UI
    document.getElementById('ai-task-input').value = '';
    document.getElementById('ai-task-preview').style.display = 'none';
    pendingAITask = null;

    // Trigger re-render (cần gọi từ work.js)
    if (window.renderTasks) window.renderTasks();
    if (window.renderDashboard) window.renderDashboard();
    if (window.renderCalendar) window.renderCalendar();

    showNotification(`Đã thêm "${taskData.name}" từ AI! 🎉`);
};

/**
 * Hủy task AI
 */
const handleCancelAITask = () => {
    document.getElementById('ai-task-preview').style.display = 'none';
    pendingAITask = null;
};

/**
 * AI Phân tích và sắp xếp ưu tiên
 */
const handleAIPrioritize = async () => {
    const btn = document.getElementById('btn-ai-prioritize');
    const tasks = globalData.tasks?.filter(t => t.status !== 'Hoàn thành') || [];

    if (tasks.length === 0) {
        showNotification('Không có công việc nào để phân tích!', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang phân tích...';

    try {
        const result = await aiService.prioritizeTasks(tasks);

        // Hiển thị trong modal hoặc alert
        const message = `🧠 **Phân tích ưu tiên từ AI:**\n\n${result}`;

        // Tạo modal đơn giản để hiển thị
        showAIResultModal('Phân tích ưu tiên công việc', result);

    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🧠 AI Phân tích ưu tiên';
    }
};

/**
 * AI Gợi ý công việc
 */
const handleAISuggest = async () => {
    const btn = document.getElementById('btn-ai-suggest');

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang suy nghĩ...';

    try {
        const existingTasks = (globalData.tasks || []).map(t => t.name).join(', ');
        const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const systemPrompt = `Bạn là trợ lý AI giúp sinh viên Luật quản lý công việc.
Hôm nay là: ${today}

Dựa trên các công việc hiện có: ${existingTasks || 'Chưa có công việc nào'}

Hãy gợi ý 3-5 công việc mới phù hợp mà người dùng có thể cần làm.
Ưu tiên các việc liên quan đến học tập, nghiên cứu pháp luật, deadline gần.
Trả lời ngắn gọn, dạng danh sách.`;

        const result = await aiService.ask('Gợi ý công việc cho tôi', { systemPrompt });

        showAIResultModal('💡 Gợi ý công việc từ AI', result);

    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💡 AI Gợi ý công việc';
    }
};

/**
 * Hiển thị modal kết quả AI
 */
const showAIResultModal = (title, content) => {
    showAIModal(title, content, { icon: '🤖' });
};

// Export để có thể gọi từ bên ngoài
export { handleAIAddTask, handleAIPrioritize, handleAISuggest };
