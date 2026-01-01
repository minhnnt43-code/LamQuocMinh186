// --- FILE: js/ai-tasks.js ---
// AI cho quản lý công việc - Phase 2

import { aiService } from './ai-service.js';
import { showNotification, generateID, toLocalISOString } from './common.js';
import { saveUserData } from './api.js';

let globalData = null;
let currentUser = null;
let pendingAITask = null; // Task đang chờ xác nhận

/**
 * Khởi tạo AI Tasks module
 */
export const initAITasks = (data, user) => {
    globalData = data;
    currentUser = user;

    // Cleanup tasks có name undefined - chạy sau 2 giây để không block init
    setTimeout(() => cleanupUndefinedTasks(), 2000);

    setupAITaskEvents();
};

/**
 * Cleanup tasks có name undefined hoặc rỗng (chạy background)
 */
const cleanupUndefinedTasks = async () => {
    try {
        if (!globalData?.tasks || globalData.tasks.length === 0) return;

        const invalidTasks = globalData.tasks.filter(t =>
            !t.name || t.name === 'undefined' || t.name.trim() === ''
        );

        if (invalidTasks.length === 0) return;

        globalData.tasks = globalData.tasks.filter(t =>
            t.name && t.name !== 'undefined' && t.name.trim() !== ''
        );

        if (currentUser) {
            await saveUserData(currentUser.uid, { tasks: globalData.tasks });
            console.log(`🧹 Đã xóa ${invalidTasks.length} task bị lỗi (undefined)`);
            showNotification(`Đã dọn dẹp ${invalidTasks.length} task bị lỗi!`, 'info');
        }
    } catch (e) {
        console.error('Cleanup error:', e);
    }
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

    // [MỚI] Nút Eisenhower Matrix
    const eisenhowerBtn = document.getElementById('btn-eisenhower-matrix');
    if (eisenhowerBtn) {
        eisenhowerBtn.addEventListener('click', showEisenhowerMatrix);
    }

    // [MỚI] Nút Auto Priority
    const autoPriorityBtn = document.getElementById('btn-ai-auto-priority');
    if (autoPriorityBtn) {
        autoPriorityBtn.addEventListener('click', handleAIAutoPriority);
    }

    // [MỚI] Nút Task Review
    const taskReviewBtn = document.getElementById('btn-ai-task-review');
    if (taskReviewBtn) {
        taskReviewBtn.addEventListener('click', handleAITaskReview);
    }

    // [MỚI] Nút Generate Subtasks
    const subtasksBtn = document.getElementById('btn-generate-subtasks');
    if (subtasksBtn) {
        subtasksBtn.addEventListener('click', handleGenerateSubtasks);
    }

    // [MỚI] Nút Voice Input
    const voiceBtn = document.getElementById('btn-voice-input');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            if (window.startVoiceInput) {
                window.startVoiceInput('ai-task-input');
            } else {
                // Fallback inline
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    const recognition = new SpeechRecognition();
                    recognition.lang = 'vi-VN';
                    recognition.onresult = (e) => {
                        const input = document.getElementById('ai-task-input');
                        if (input) input.value = e.results[0][0].transcript;
                        import('./common.js').then(m => m.showNotification('Đã nhận giọng nói!'));
                    };
                    recognition.start();
                    import('./common.js').then(m => m.showNotification('🎤 Đang nghe...', 'info'));
                }
            }
        });
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
        // System prompt để parse task (Batch Support + Time Estimation)
        const systemPrompt = `Bạn là parser chuyên phân tích câu tiếng Việt thành thông tin công việc.
Trả về JSON Array (kể cả 1 task cũng trả về mảng), KHÔNG giải thích.

Ngày hôm nay: ${new Date().toLocaleDateString('vi-VN')} (${toLocalISOString(new Date())})

Format trả về:
[
  {
    "name": "tên công việc ngắn gọn",
    "dueDate": "YYYY-MM-DD" (tính từ ngày hôm nay, VD: "thứ 5" -> ngày thứ 5 tuần này),
    "dueTime": "HH:mm" (nếu có đề cập giờ, VD: "2h chiều" -> "14:00"),
    "priority": "high" hoặc "medium" hoặc "low" (mặc định medium),
    "category": "Học tập" hoặc "Công việc" hoặc "Cá nhân" hoặc "Gia đình" hoặc "Khác",
    "estimatedMinutes": số phút ước tính hoàn thành (VD: 30, 60, 120),
    "notes": "ghi chú bổ sung nếu có"
  }
]

Quy tắc ước tính thời gian:
- Task đơn giản (gọi điện, gửi email): 15-30 phút  
- Task trung bình (họp, viết báo cáo ngắn): 60-90 phút
- Task lớn (nghiên cứu, dự án): 120-240 phút`;

        const response = await aiService.ask(text, { systemPrompt, temperature: 0.3 });

        // Parse JSON từ response (tìm mảng [])
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            // Fallback: Thử tìm object {} wrap lại thành mảng nếu AI lỡ trả 1 object
            const objMatch = response.match(/\{[\s\S]*\}/);
            if (objMatch) {
                pendingAITask = [JSON.parse(objMatch[0])];
            } else {
                throw new Error('Không thể phân tích câu này');
            }
        } else {
            pendingAITask = JSON.parse(jsonMatch[0]);
        }

        // Đảm bảo pendingAITask luôn là mảng
        if (!Array.isArray(pendingAITask)) pendingAITask = [pendingAITask];

        // Hiển thị preview (Loop qua mảng)
        let html = `<div style="max-height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 5px;">`;

        pendingAITask.forEach((task, index) => {
            // Format Date
            let dateDisplay = task.dueDate || 'Không có';
            if (task.dueDate && task.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [y, m, d] = task.dueDate.split('-');
                dateDisplay = `${d}/${m}/${y}`;
            }

            html += `
                <div style="background: white; padding: 12px; border-radius: 10px; border-left: 4px solid #667eea; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 5px;">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 8px;">
                        <div style="font-weight: 700; color: #1f2937; font-size: 1.05rem;">#${index + 1}: ${escapeHTML(task.name || task.title || task.task || 'Công việc')}</div>
                        <span style="font-size:0.75rem; background:#f3f4f6; padding:2px 8px; border-radius:12px; color:#6b7280;">${task.category || 'Chung'}</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 15px; font-size: 0.9rem;">
                        <div style="color: #4b5563; font-weight: 600;">📅 Hạn:</div>
                        <div style="color: #111;">${dateDisplay} ${task.dueTime ? `<span style="color:#2563eb; font-weight:500;">(${task.dueTime})</span>` : ''}</div>
                        
                        <div style="color: #4b5563; font-weight: 600;">🎯 Ưu tiên:</div>
                        <div>
                            ${task.priority === 'high' ? '<span style="color:#dc2626;font-weight:bold;">🔴 Cao</span>' :
                    task.priority === 'low' ? '<span style="color:#16a34a;font-weight:bold;">🟢 Thấp</span>' :
                        '<span style="color:#ca8a04;font-weight:bold;">🟡 Trung bình</span>'}
                        </div>
                        
                        <div style="color: #4b5563; font-weight: 600;">⏱️ Thời gian:</div>
                        <div style="color: #6366f1; font-weight: 600;">~${task.estimatedMinutes || 60} phút</div>
                        
                        ${task.notes ? `
                        <div style="color: #4b5563; font-weight: 600;">📝 Note:</div>
                        <div style="color: #374151; font-style:italic;">${escapeHTML(task.notes)}</div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        html += `<div style="margin-top: 12px; font-size: 0.9rem; text-align: right; color: #6b7280;">Đã nhận diện <b>${pendingAITask.length}</b> công việc từ nội dung của bạn.</div>`;

        previewContent.innerHTML = html;
        preview.style.display = 'block';

        showNotification(`AI đã tìm thấy ${pendingAITask.length} công việc! Xác nhận để thêm.`, 'success');

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
    if (!pendingAITask || pendingAITask.length === 0) return;

    // pendingAITask giờ là Array
    const newTasks = pendingAITask.map(item => ({
        id: generateID('task'),
        // Handle cả "name" và "title" từ AI response
        name: item.name || item.title || item.task || item["tên"] || item["công việc"] || 'Công việc không tên',
        priority: item.priority || 'medium',
        category: item.category || 'Chung',
        dueDate: item.dueDate || toLocalISOString(new Date()),
        dueTime: item.dueTime || '', // Thêm dueTime nếu có
        estimatedMinutes: item.estimatedMinutes || 60, // Thời gian ước tính (mặc định 60 phút)
        status: 'Chưa thực hiện',
        project: '',
        recurrence: 'none',
        link: '',
        tags: 'AI-created',
        notes: item.notes || '',
        createdByAI: true
    }));

    // Thêm vào globalData
    if (!globalData.tasks) globalData.tasks = [];
    globalData.tasks.push(...newTasks);

    await saveUserData(currentUser.uid, { tasks: globalData.tasks });

    // Reset UI
    document.getElementById('ai-task-input').value = '';
    document.getElementById('ai-task-preview').style.display = 'none';
    pendingAITask = null;

    // Trigger re-render (cần gọi từ work.js)
    if (window.renderTasks) window.renderTasks();
    if (window.renderDashboard) window.renderDashboard();
    if (window.renderCalendar) window.renderCalendar();

    showNotification(`Đã thêm ${newTasks.length} công việc từ AI! 🎉`);
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

/**
 * #136 - AI Smart Deadline - Gợi ý ngày hạn phù hợp
 */
const handleAISmartDeadline = async (taskName, taskCategory = 'Chung') => {
    try {
        const existingTasks = (globalData.tasks || [])
            .filter(t => t.status !== 'Hoàn thành')
            .map(t => `${t.name} (${t.dueDate})`).join(', ');

        const today = new Date();
        const prompt = `Hôm nay: ${today.toISOString().split('T')[0]}
Công việc mới: "${taskName}" (${taskCategory})
Công việc hiện có: ${existingTasks || 'Không có'}

Đề xuất ngày hạn hợp lý cho công việc này. Trả về JSON:
{"suggestedDate": "YYYY-MM-DD", "reason": "lý do ngắn gọn"}`;

        const response = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là trợ lý lập kế hoạch. Chỉ trả về JSON.'
        });

        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        return { suggestedDate: today.toISOString().split('T')[0], reason: 'Default' };
    } catch (e) {
        console.error('Smart deadline error:', e);
        return null;
    }
};

/**
 * #137 - AI Auto Priority - Tự động đặt ưu tiên thông minh
 */
const handleAIAutoPriority = async () => {
    const btn = document.getElementById('btn-ai-auto-priority');
    const tasks = (globalData.tasks || []).filter(t => t.status !== 'Hoàn thành');

    if (tasks.length === 0) {
        showNotification('Không có công việc nào!', 'error');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳...';
    }

    try {
        const taskList = tasks.map(t => ({
            id: t.id,
            name: t.name,
            dueDate: t.dueDate,
            category: t.category,
            currentPriority: t.priority
        }));

        const prompt = `Phân tích và đề xuất mức ưu tiên cho các công việc sau:
${JSON.stringify(taskList, null, 2)}

Ngày hôm nay: ${new Date().toISOString().split('T')[0]}

Trả về JSON array với id và priority mới:
[{"id": "...", "priority": "high|medium|low", "reason": "lý do"}]`;

        const response = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là productivity expert. Ưu tiên dựa trên deadline, category. Chỉ trả về JSON.'
        });

        const match = response.match(/\[[\s\S]*\]/);
        if (match) {
            const updates = JSON.parse(match[0]);
            let updatedCount = 0;

            updates.forEach(u => {
                const task = globalData.tasks.find(t => t.id === u.id);
                if (task && task.priority !== u.priority) {
                    task.priority = u.priority;
                    updatedCount++;
                }
            });

            if (updatedCount > 0) {
                await saveUserData(currentUser.uid, { tasks: globalData.tasks });
                if (window.renderTasks) window.renderTasks();
                showNotification(`Đã cập nhật ưu tiên cho ${updatedCount} công việc! 🎯`);
            } else {
                showNotification('Ưu tiên hiện tại đã hợp lý!');
            }
        }
    } catch (e) {
        showNotification('Lỗi phân tích ưu tiên: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🎯 Auto Priority';
        }
    }
};

/**
 * #142 - AI Task Review - Đánh giá công việc tuần
 */
const handleAITaskReview = async () => {
    const btn = document.getElementById('btn-ai-task-review');
    const tasks = globalData.tasks || [];

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳...';
    }

    try {
        const completed = tasks.filter(t => t.status === 'Hoàn thành').length;
        const pending = tasks.filter(t => t.status !== 'Hoàn thành');
        const overdue = pending.filter(t => {
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < new Date();
        });
        const highPriority = pending.filter(t => t.priority === 'high');

        const prompt = `Đánh giá tình hình công việc:
- Đã hoàn thành: ${completed}
- Còn lại: ${pending.length}
- Quá hạn: ${overdue.length} (${overdue.map(t => t.name).join(', ') || 'Không có'})
- Ưu tiên cao chưa xong: ${highPriority.length}

Tạo đánh giá ngắn gọn (3-5 câu):
1. Điểm năng suất /10
2. Vấn đề cần lưu ý
3. 2-3 đề xuất cải thiện`;

        const result = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là productivity coach. Đánh giá và động viên.'
        });

        showAIResultModal('📊 Đánh giá công việc', result);

    } catch (e) {
        showNotification('Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '📊 Task Review';
        }
    }
};

// ============================================================
// #129 - MA TRẬN EISENHOWER (Quan trọng / Gấp)
// ============================================================
const showEisenhowerMatrix = () => {
    const tasks = (globalData?.tasks || []).filter(t => t.status !== 'Hoàn thành');

    // Phân loại tasks
    const urgent = tasks.filter(t => {
        if (!t.dueDate) return false;
        const days = Math.ceil((new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        return days <= 2;
    });

    const important = tasks.filter(t => t.priority === 'high');

    const q1 = tasks.filter(t => urgent.includes(t) && important.includes(t)); // Urgent + Important
    const q2 = tasks.filter(t => !urgent.includes(t) && important.includes(t)); // Important, not urgent
    const q3 = tasks.filter(t => urgent.includes(t) && !important.includes(t)); // Urgent, not important
    const q4 = tasks.filter(t => !urgent.includes(t) && !important.includes(t)); // Neither

    const formatTasks = (list, color) => list.length === 0
        ? '<p style="color:#999;font-style:italic;">Không có</p>'
        : list.map(t => `<div style="padding:8px 12px;background:${color};border-radius:6px;margin:4px 0;font-size:0.9rem;">${escapeHTML(t.name)}</div>`).join('');

    const matrixHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div style="background:#fee2e2;padding:15px;border-radius:12px;">
                <h4 style="margin:0 0 10px;color:#dc2626;">🔥 Q1: LÀM NGAY (${q1.length})</h4>
                <small style="color:#666;">Gấp + Quan trọng</small>
                ${formatTasks(q1, 'rgba(220,38,38,0.1)')}
            </div>
            <div style="background:#dbeafe;padding:15px;border-radius:12px;">
                <h4 style="margin:0 0 10px;color:#2563eb;">📅 Q2: LÊN LỊCH (${q2.length})</h4>
                <small style="color:#666;">Quan trọng, không gấp</small>
                ${formatTasks(q2, 'rgba(37,99,235,0.1)')}
            </div>
            <div style="background:#fef9c3;padding:15px;border-radius:12px;">
                <h4 style="margin:0 0 10px;color:#ca8a04;">📤 Q3: ỦY THÁC (${q3.length})</h4>
                <small style="color:#666;">Gấp, không quan trọng</small>
                ${formatTasks(q3, 'rgba(202,138,4,0.1)')}
            </div>
            <div style="background:#f3f4f6;padding:15px;border-radius:12px;">
                <h4 style="margin:0 0 10px;color:#6b7280;">🗑️ Q4: LOẠI BỎ (${q4.length})</h4>
                <small style="color:#666;">Không gấp, không quan trọng</small>
                ${formatTasks(q4, 'rgba(107,114,128,0.1)')}
            </div>
        </div>
    `;

    // Hiển thị modal
    const modal = document.createElement('div');
    modal.id = 'eisenhower-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;max-width:700px;width:95%;max-height:85vh;overflow:hidden;">
            <div style="padding:20px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white;display:flex;justify-content:space-between;align-items:center;">
                <h2 style="margin:0;">📊 Ma trận Eisenhower</h2>
                <button onclick="this.closest('#eisenhower-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:18px;">&times;</button>
            </div>
            <div style="padding:20px;overflow-y:auto;max-height:65vh;">${matrixHTML}</div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

// ============================================================
// #116 - SUBTASKS (Công việc con)
// ============================================================
const generateSubtasksWithAI = async (taskName) => {
    try {
        const prompt = `Chia nhỏ công việc "${taskName}" thành 3-5 subtasks cụ thể.

Trả về JSON array:
[{"name": "tên subtask", "estimatedMinutes": số phút ước tính}]

Chỉ trả về JSON.`;

        const response = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là chuyên gia chia nhỏ công việc. Chỉ trả về JSON.'
        });

        const match = response.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]);
        }
        return [];
    } catch (e) {
        console.error('Generate subtasks error:', e);
        return [];
    }
};

const handleGenerateSubtasks = async () => {
    const taskNameInput = document.getElementById('task-name');
    let taskName = taskNameInput?.value?.trim();

    // Nếu không có task name từ input, dùng ai-task-input hoặc thông báo
    if (!taskName) {
        const aiInput = document.getElementById('ai-task-input');
        taskName = aiInput?.value?.trim();

        if (!taskName) {
            showNotification('Vui lòng nhập tên công việc vào ô "AI Task Input" trước!', 'warning');
            aiInput?.focus();
            return;
        }
    }

    const btn = document.getElementById('btn-generate-subtasks');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳...';
    }

    try {
        const subtasks = await generateSubtasksWithAI(taskName);

        if (subtasks.length === 0) {
            showNotification('Không thể tạo subtasks!', 'error');
            return;
        }

        // Hiển thị preview subtasks
        const content = subtasks.map((s, i) =>
            `${i + 1}. **${s.name}** (~${s.estimatedMinutes} phút)`
        ).join('\n');

        showAIModal('📋 Subtasks gợi ý', content, {
            icon: '✂️',
            footer: `<button id="btn-apply-subtasks" class="btn-submit" style="background:linear-gradient(135deg,#10b981,#059669);">✅ Áp dụng</button>`
        });

        // Handler cho nút áp dụng
        setTimeout(() => {
            document.getElementById('btn-apply-subtasks')?.addEventListener('click', () => {
                // Lưu subtasks vào notes hoặc field riêng
                const notesEl = document.getElementById('task-notes');
                if (notesEl) {
                    const subtaskText = subtasks.map((s, i) => `[ ] ${s.name} (~${s.estimatedMinutes}p)`).join('\n');
                    notesEl.value = (notesEl.value ? notesEl.value + '\n\n' : '') + '--- Subtasks ---\n' + subtaskText;
                }
                document.getElementById('ai-result-modal')?.remove();
                showNotification(`Đã thêm ${subtasks.length} subtasks vào ghi chú!`);
            });
        }, 100);

    } catch (e) {
        showNotification('Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '✂️ Tạo Subtasks';
        }
    }
};

// ============================================================
// #122 - TIME TRACKING (Theo dõi thời gian)
// ============================================================
let activeTimer = null;
let timerStartTime = null;
let timerTaskId = null;

const startTaskTimer = (taskId) => {
    if (activeTimer) {
        stopTaskTimer();
    }

    timerTaskId = taskId;
    timerStartTime = Date.now();

    activeTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const timerDisplay = document.getElementById(`timer-${taskId}`);
        if (timerDisplay) {
            timerDisplay.textContent = `⏱️ ${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }, 1000);

    showNotification('Timer bắt đầu! ⏱️');
};

const stopTaskTimer = () => {
    if (activeTimer) {
        clearInterval(activeTimer);
        const elapsed = Math.floor((Date.now() - timerStartTime) / 60000); // minutes

        // Lưu thời gian vào task
        const task = globalData?.tasks?.find(t => t.id === timerTaskId);
        if (task) {
            task.timeSpent = (task.timeSpent || 0) + elapsed;
        }

        showNotification(`Đã dừng! Tổng: ${elapsed} phút`);
        activeTimer = null;
        timerStartTime = null;
        timerTaskId = null;
    }
};

// Export để có thể gọi từ bên ngoài
export {
    handleAIAddTask,
    handleAIPrioritize,
    handleAISuggest,
    handleAISmartDeadline,
    handleAIAutoPriority,
    handleAITaskReview,
    showEisenhowerMatrix,
    generateSubtasksWithAI,
    handleGenerateSubtasks,
    startTaskTimer,
    stopTaskTimer
};
