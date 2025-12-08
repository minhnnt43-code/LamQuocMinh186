// --- FILE: js/ai-tasks-lite.js ---
// AI Task buttons - ULTRA LITE VERSION
// Không phụ thuộc complex imports - Gọi API trực tiếp

import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;

// ============================================================
// HELPER FUNCTIONS (100% inline)
// ============================================================
const showNotification = (message, type = 'success') => {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
};

const toLocalISOString = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

// Format date to dd/mm/yyyy (Vietnamese format)
const formatDateVN = (dateStr) => {
    if (!dateStr) return 'Không có';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
};

// Format priority with badge
const formatPriority = (priority) => {
    const map = {
        'Cao': '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">CAO</span>',
        'high': '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">CAO</span>',
        'Trung bình': '<span style="background:#fef3c7;color:#ca8a04;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">TB</span>',
        'medium': '<span style="background:#fef3c7;color:#ca8a04;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">TB</span>',
        'Thấp': '<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">THẤP</span>',
        'low': '<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">THẤP</span>'
    };
    return map[priority] || '<span style="background:#e2e8f0;color:#64748b;padding:2px 8px;border-radius:4px;font-size:0.75rem;">—</span>';
};

// ============================================================
// INLINE AI CALL (Groq - không cần import)
// ============================================================
const callAI = async (prompt) => {
    // Lấy API key từ localStorage
    const apiKey = localStorage.getItem('ai_api_key_groq') ||
        localStorage.getItem('ai_api_key_google') || '';

    if (!apiKey) {
        throw new Error('Chưa cấu hình API key! Vào Cài đặt → AI để nhập key.');
    }

    // Detect provider từ key format
    const isGroq = apiKey.startsWith('gsk_');
    const isGoogle = apiKey.startsWith('AI');

    if (isGroq) {
        // Gọi Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1024,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Lỗi API');
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } else if (isGoogle) {
        // Gọi Google Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Lỗi API');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;

    } else {
        throw new Error('API key không hợp lệ. Hỗ trợ: Groq (gsk_...) hoặc Google (AI...)');
    }
};

// ============================================================
// KHỞI TẠO
// ============================================================
export const initAITasksLite = (data, user) => {
    globalData = data;
    currentUser = user;

    console.log('🔄 AI Tasks Lite: Đang setup event listeners...');
    setupEventListeners();
    console.log('✅ AI Tasks Lite initialized');
};

// ============================================================
// SETUP EVENT LISTENERS (querySelectorAll để bind TẤT CẢ buttons cùng ID)
// ============================================================
const setupEventListeners = () => {
    // Helper: Bind tất cả elements có cùng ID
    const bindAll = (id, handler) => {
        // Bind theo ID (có thể trùng)
        document.querySelectorAll(`#${id}`).forEach(el => {
            el.addEventListener('click', handler);
        });
        // Cũng bind theo class nếu có
        document.querySelectorAll(`.${id}`).forEach(el => {
            el.addEventListener('click', handler);
        });
    };

    // AI Phân tích ưu tiên
    bindAll('btn-ai-prioritize', handleAIPrioritize);
    console.log('  ✓ btn-ai-prioritize (all)');

    // AI Gợi ý công việc
    bindAll('btn-ai-suggest', handleAISuggest);
    console.log('  ✓ btn-ai-suggest (all)');

    // Ma trận Eisenhower
    bindAll('btn-eisenhower-matrix', showEisenhowerMatrix);
    console.log('  ✓ btn-eisenhower-matrix (all)');

    // Auto Priority
    bindAll('btn-ai-auto-priority', handleAutoPriority);
    console.log('  ✓ btn-ai-auto-priority (all)');

    // Task Review
    bindAll('btn-ai-task-review', handleTaskReview);
    console.log('  ✓ btn-ai-task-review (all)');

    // AI Add Task (natural language)
    bindAll('btn-ai-add-task', handleAIAddTask);
    console.log('  ✓ btn-ai-add-task (all)');

    // Subtasks AI (2 nút)
    bindAll('btn-generate-subtasks', handleGenerateSubtasks);
    bindAll('todo-btn-generate-subtasks', handleGenerateSubtasks);
    console.log('  ✓ btn-generate-subtasks & todo-btn-generate-subtasks (all)');

    // Input Enter key
    document.querySelectorAll('#ai-task-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAIAddTask();
        });
    });
    console.log('  ✓ ai-task-input (Enter key - all)');
};


// ============================================================
// 1. AI PHÂN TÍCH ƯU TIÊN
// ============================================================
const handleAIPrioritize = async () => {
    console.log('🔵 handleAIPrioritize CLICKED!');

    const btns = document.querySelectorAll('#btn-ai-prioritize');
    const tasks = globalData?.tasks || [];
    const pendingTasks = tasks.filter(t => t.status !== 'Hoàn thành');

    if (pendingTasks.length === 0) {
        showNotification('Không có công việc nào cần phân tích!', 'error');
        return;
    }

    // Loading state
    const originalTexts = [];
    btns.forEach(btn => {
        originalTexts.push(btn.innerHTML);
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang phân tích ưu tiên...';
    });

    try {
        const taskList = pendingTasks.map((t, i) =>
            `${i + 1}. ${t.name} - Deadline: ${t.dueDate || 'Không có'} - Ưu tiên: ${t.priority || 'Không'}`
        ).join('\\n');

        const prompt = `Phân tích và sắp xếp ưu tiên các công việc sau. Đưa ra lời khuyên ngắn gọn:
${taskList}

Trả lời bằng tiếng Việt, súc tích, dễ hiểu.`;

        const result = await callAI(prompt);
        showAIResult('🧠 Phân tích ưu tiên', result);

    } catch (error) {
        showNotification('Lỗi AI: ' + error.message, 'error');
        console.error('AI Error:', error);
    } finally {
        btns.forEach((btn, i) => {
            btn.disabled = false;
            btn.innerHTML = originalTexts[i] || '🧠 AI Phân tích ưu tiên';
        });
    }
};

// ============================================================
// 2. AI GỢI Ý CÔNG VIỆC
// ============================================================
const handleAISuggest = async () => {
    console.log('🔵 handleAISuggest CLICKED!');

    const btns = document.querySelectorAll('#btn-ai-suggest');

    // Loading state
    const originalTexts = [];
    btns.forEach(btn => {
        originalTexts.push(btn.innerHTML);
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang suy nghĩ...';
    });

    try {
        const tasks = globalData?.tasks || [];
        const recentTasks = tasks.slice(-10).map(t => t.name).join(', ');

        const prompt = `Dựa trên các công việc gần đây: ${recentTasks || 'chưa có'}
        
Gợi ý 3-5 công việc mới mà người dùng có thể cần làm. Trả lời súc tích bằng tiếng Việt.`;

        const result = await callAI(prompt);
        showAIResult('💡 Gợi ý công việc', result);

    } catch (error) {
        showNotification('Lỗi AI: ' + error.message, 'error');
    } finally {
        btns.forEach((btn, i) => {
            btn.disabled = false;
            btn.innerHTML = originalTexts[i] || '💡 AI Gợi ý công việc';
        });
    }
};

// ============================================================
// 3. MA TRẬN EISENHOWER (Không cần AI - nhanh)
// ============================================================
const showEisenhowerMatrix = () => {
    console.log('🔵 showEisenhowerMatrix CLICKED!');

    // Tìm button đã click
    const btns = document.querySelectorAll('#btn-eisenhower-matrix');
    btns.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang phân tích...';
    });

    // Delay nhỏ để hiện loading trước
    setTimeout(() => {
        const tasks = globalData?.tasks || [];
        console.log('📊 Tasks count:', tasks.length);
        const pending = tasks.filter(t => t.status !== 'Hoàn thành');

        // Phân loại theo ma trận
        const urgent_important = [];
        const not_urgent_important = [];
        const urgent_not_important = [];
        const not_urgent_not_important = [];

        pending.forEach(t => {
            const isUrgent = t.dueDate && new Date(t.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            const isImportant = t.priority === 'Cao' || t.priority === 'high' || t.priority === 'Trung bình';

            if (isUrgent && isImportant) urgent_important.push(t);
            else if (!isUrgent && isImportant) not_urgent_important.push(t);
            else if (isUrgent && !isImportant) urgent_not_important.push(t);
            else not_urgent_not_important.push(t);
        });

        const formatList = (arr, color) => arr.length
            ? arr.map(t => `<div style="padding:6px 10px;margin:3px 0;background:${color};border-radius:8px;font-size:0.9rem;">• ${t.name}</div>`).join('')
            : '<div style="padding:10px;text-align:center;opacity:0.6;"><em>Trống</em></div>';

        const html = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;">
                <div style="background:linear-gradient(135deg,#fee2e2,#fecaca);padding:15px;border-radius:16px;box-shadow:0 4px 15px rgba(220,38,38,0.15);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <span style="font-size:1.5rem;">🔥</span>
                        <strong style="color:#dc2626;font-size:1rem;">Làm ngay</strong>
                    </div>
                    ${formatList(urgent_important, 'rgba(255,255,255,0.7)')}
                </div>
                <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);padding:15px;border-radius:16px;box-shadow:0 4px 15px rgba(22,163,74,0.15);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <span style="font-size:1.5rem;">📅</span>
                        <strong style="color:#16a34a;font-size:1rem;">Lên lịch</strong>
                    </div>
                    ${formatList(not_urgent_important, 'rgba(255,255,255,0.7)')}
                </div>
                <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:15px;border-radius:16px;box-shadow:0 4px 15px rgba(202,138,4,0.15);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <span style="font-size:1.5rem;">👥</span>
                        <strong style="color:#ca8a04;font-size:1rem;">Ủy thác</strong>
                    </div>
                    ${formatList(urgent_not_important, 'rgba(255,255,255,0.7)')}
                </div>
                <div style="background:linear-gradient(135deg,#e2e8f0,#cbd5e1);padding:15px;border-radius:16px;box-shadow:0 4px 15px rgba(100,116,139,0.15);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <span style="font-size:1.5rem;">🗑️</span>
                        <strong style="color:#64748b;font-size:1rem;">Loại bỏ</strong>
                    </div>
                    ${formatList(not_urgent_not_important, 'rgba(255,255,255,0.7)')}
                </div>
            </div>
            <p style="margin-top:15px;padding:10px;background:#f1f5f9;border-radius:8px;font-size:0.85rem;color:#64748b;text-align:center;">
                💡 <strong>Tip:</strong> Gấp = deadline trong 3 ngày tới | Quan trọng = Ưu tiên Cao/Trung bình
            </p>
        `;

        showAIResult('📊 Ma trận Eisenhower', html, true);

        // Reset buttons
        btns.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '📊 Ma trận Eisenhower';
        });
    }, 300);
};

// ============================================================
// 4. AUTO PRIORITY
// ============================================================
const handleAutoPriority = async () => {
    console.log('🔵 handleAutoPriority CLICKED!');

    // Tìm tất cả buttons
    const btns = document.querySelectorAll('#btn-ai-auto-priority');

    const tasks = globalData?.tasks || [];
    // Lọc tasks chưa hoàn thành (không cần check priority)
    const pending = tasks.filter(t => t.status !== 'Hoàn thành');

    console.log('📊 Pending tasks:', pending.length);

    if (pending.length === 0) {
        showNotification('Không có công việc nào cần phân tích!', 'info');
        return;
    }

    const originalTexts = [];
    btns.forEach(btn => {
        originalTexts.push(btn.innerHTML);
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang phân tích ưu tiên...';
    });

    try {
        const taskList = pending.map(t => `${t.name} (deadline: ${t.dueDate || 'không có'})`).join(', ');
        const prompt = `Phân tích và đề xuất mức ưu tiên (Cao/Trung bình/Thấp) cho các công việc sau:
${taskList}

Trả lời bằng tiếng Việt, format rõ ràng:
- Tên công việc: Mức ưu tiên - Lý do ngắn`;

        const result = await callAI(prompt);
        showAIResult('🎯 AI Auto Priority', result);

    } catch (error) {
        showNotification('Lỗi AI: ' + error.message, 'error');
        console.error('Auto Priority Error:', error);
    } finally {
        btns.forEach((btn, i) => {
            btn.disabled = false;
            btn.innerHTML = originalTexts[i] || '🎯 Auto Priority';
        });
    }
};

// ============================================================
// 5. TASK REVIEW
// ============================================================
const handleTaskReview = async () => {
    console.log('🔵 handleTaskReview CLICKED!');

    const btns = document.querySelectorAll('#btn-ai-task-review');

    // Loading state
    const originalTexts = [];
    btns.forEach(btn => {
        originalTexts.push(btn.innerHTML);
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang đánh giá...';
    });

    try {
        const tasks = globalData?.tasks || [];
        const completed = tasks.filter(t => t.status === 'Hoàn thành').length;
        const pending = tasks.filter(t => t.status !== 'Hoàn thành').length;

        const prompt = `Đánh giá tiến độ công việc tuần này:
- Hoàn thành: ${completed} công việc
- Đang chờ: ${pending} công việc

Đưa ra nhận xét ngắn gọn và lời khuyên cải thiện. Tiếng Việt.`;

        const result = await callAI(prompt);
        showAIResult('📋 Task Review', result);

    } catch (error) {
        showNotification('Lỗi AI: ' + error.message, 'error');
    } finally {
        btns.forEach((btn, i) => {
            btn.disabled = false;
            btn.innerHTML = originalTexts[i] || '📋 Task Review';
        });
    }
};

// ============================================================
// 6. AI ADD TASK (NATURAL LANGUAGE) - Lưu thật vào Firebase
// ============================================================
const handleAIAddTask = async () => {
    console.log('🔵 handleAIAddTask CLICKED!');

    const inputs = document.querySelectorAll('#ai-task-input');
    const btns = document.querySelectorAll('#btn-ai-add-task');

    // Lấy text từ input đầu tiên có value
    let text = '';
    inputs.forEach(input => {
        if (input.value.trim()) text = input.value.trim();
    });

    if (!text) {
        showNotification('Vui lòng nhập mô tả công việc!', 'error');
        return;
    }

    // Loading state
    const originalTexts = [];
    btns.forEach(btn => {
        originalTexts.push(btn.innerHTML);
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang phân tích...';
    });

    try {
        const today = toLocalISOString(new Date());

        // Prompt hỗ trợ tạo nhiều tasks (tối đa 100)
        const prompt = `Phân tích câu sau và tạo danh sách công việc. Trả về JSON array:
"${text}"

Ngày hôm nay: ${today}

QUAN TRỌNG:
- Nếu có nhiều công việc, tách thành nhiều items (tối đa 100 tasks)
- Mỗi task có format: {"name": "tên", "dueDate": "YYYY-MM-DD hoặc null", "priority": "Cao/Trung bình/Thấp", "category": "Công việc/Học tập/Cá nhân"}
- Trả về dạng: {"tasks": [...]}

Ví dụ input: "Làm bài tập toán và lý, deadline ngày mai"
Output: {"tasks": [{"name": "Làm bài tập toán", "dueDate": "2025-12-10", "priority": "Trung bình", "category": "Học tập"}, {"name": "Làm bài tập lý", "dueDate": "2025-12-10", "priority": "Trung bình", "category": "Học tập"}]}`;

        const result = await callAI(prompt);
        console.log('📝 AI Response:', result);

        // Parse JSON - cải thiện để xử lý nhiều format
        let tasksToAdd = [];

        try {
            // Cách 1: Tìm JSON block trong markdown ```json ... ```
            const codeBlockMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                const jsonStr = codeBlockMatch[1].trim();
                const parsed = JSON.parse(jsonStr);
                tasksToAdd = Array.isArray(parsed.tasks) ? parsed.tasks : (Array.isArray(parsed) ? parsed : [parsed]);
                console.log('✅ Parsed from code block:', tasksToAdd.length, 'tasks');
            }

            // Cách 2: Tìm {"tasks": [...]}
            if (tasksToAdd.length === 0) {
                const jsonMatch = result.match(/\{\s*"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    tasksToAdd = parsed.tasks || [];
                    console.log('✅ Parsed tasks array:', tasksToAdd.length, 'tasks');
                }
            }

            // Cách 3: Tìm array trực tiếp [...]
            if (tasksToAdd.length === 0) {
                const arrayMatch = result.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                if (arrayMatch) {
                    tasksToAdd = JSON.parse(arrayMatch[0]);
                    console.log('✅ Parsed direct array:', tasksToAdd.length, 'tasks');
                }
            }

            // Cách 4: Fallback - tìm single object {...}
            if (tasksToAdd.length === 0) {
                const singleMatch = result.match(/\{[^{}]*"name"[^{}]*\}/g);
                if (singleMatch) {
                    tasksToAdd = singleMatch.map(m => JSON.parse(m));
                    console.log('✅ Parsed single objects:', tasksToAdd.length, 'tasks');
                }
            }
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
        }

        if (tasksToAdd.length === 0) {
            showNotification('Không thể phân tích câu này. Thử lại với câu rõ ràng hơn.', 'error');
            return;
        }

        // Giới hạn 100 tasks
        tasksToAdd = tasksToAdd.slice(0, 100);

        // Tạo preview HTML
        const previewHTML = tasksToAdd.map((t, i) => `
            <div style="padding:12px;margin:8px 0;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;border-left:4px solid #22c55e;">
                <div style="font-weight:600;color:#166534;">${i + 1}. ${t.name}</div>
                <div style="font-size:0.85rem;color:#64748b;margin-top:4px;">
                    📅 ${t.dueDate || 'Không có deadline'} • 
                    🎯 ${t.priority || 'Trung bình'} • 
                    📁 ${t.category || 'Chung'}
                </div>
            </div>
        `).join('');

        // Hiển thị modal xác nhận
        showTaskConfirmModal(tasksToAdd, previewHTML, inputs);

    } catch (error) {
        showNotification('Lỗi AI: ' + error.message, 'error');
        console.error('AI Add Task Error:', error);
    } finally {
        btns.forEach((btn, i) => {
            btn.disabled = false;
            btn.innerHTML = originalTexts[i] || '✨ Tạo với AI';
        });
    }
};

// ============================================================
// 7. GENERATE SUBTASKS - Chia nhỏ task thành subtasks
// ============================================================
const handleGenerateSubtasks = async () => {
    console.log('🔵 handleGenerateSubtasks CLICKED!');

    // Lấy task name từ input
    const taskNameInput = document.getElementById('task-name');
    const taskName = taskNameInput?.value?.trim();

    if (!taskName) {
        showNotification('Vui lòng nhập tên công việc trước!', 'error');
        taskNameInput?.focus();
        return;
    }

    // Lấy tất cả các nút subtasks
    const btns = document.querySelectorAll('#btn-generate-subtasks, #todo-btn-generate-subtasks');
    const originalTexts = [];
    btns.forEach(btn => {
        originalTexts.push(btn.innerHTML);
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang chia nhỏ...';
    });

    try {
        const today = toLocalISOString(new Date());
        const dueDateInput = document.getElementById('task-due-date');
        const dueDate = dueDateInput?.value || today;

        const prompt = `Chia nhỏ công việc sau thành các subtasks cụ thể để dễ thực hiện:
"${taskName}"

Deadline chính: ${dueDate}
Ngày hôm nay: ${today}

QUAN TRỌNG:
- Chia thành 3-7 subtasks nhỏ, cụ thể, có thể hoàn thành được
- Mỗi subtask có deadline phù hợp (trước deadline chính)
- Format JSON: {"tasks": [{"name": "...", "dueDate": "YYYY-MM-DD", "priority": "Cao/Trung bình/Thấp", "category": "..."}]}
- Chỉ trả về JSON, không giải thích`;

        const result = await callAI(prompt);
        console.log('📝 Subtasks AI Response:', result);

        let tasksToAdd = [];

        try {
            // Parse JSON
            const codeBlockMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                const parsed = JSON.parse(codeBlockMatch[1].trim());
                tasksToAdd = Array.isArray(parsed.tasks) ? parsed.tasks : (Array.isArray(parsed) ? parsed : [parsed]);
            }

            if (tasksToAdd.length === 0) {
                const jsonMatch = result.match(/\{\s*"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/);
                if (jsonMatch) {
                    tasksToAdd = JSON.parse(jsonMatch[0]).tasks || [];
                }
            }

            if (tasksToAdd.length === 0) {
                const arrayMatch = result.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                if (arrayMatch) {
                    tasksToAdd = JSON.parse(arrayMatch[0]);
                }
            }
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
        }

        if (tasksToAdd.length === 0) {
            showNotification('Không thể chia nhỏ công việc này', 'error');
            return;
        }

        // Hiển thị modal xác nhận
        showTaskConfirmModal(tasksToAdd, '', []);
        showNotification(`✅ Đã chia thành ${tasksToAdd.length} subtasks!`, 'success');

    } catch (error) {
        showNotification('Lỗi AI: ' + error.message, 'error');
        console.error('Generate Subtasks Error:', error);
    } finally {
        btns.forEach((btn, i) => {
            btn.disabled = false;
            btn.innerHTML = originalTexts[i] || '✂️ Tạo Subtasks AI';
        });
    }
};

// Modal xác nhận với EDIT trước khi lưu tasks
const showTaskConfirmModal = (tasksToAdd, previewHTML, inputs) => {
    const oldModal = document.getElementById('ai-result-modal');
    if (oldModal) oldModal.remove();

    // Tạo editable HTML cho mỗi task
    const editableHTML = tasksToAdd.map((t, i) => `
        <div class="ai-task-item" data-index="${i}" style="
            padding:16px; margin:10px 0;
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            border-radius:14px; border-left:4px solid #22c55e;
        ">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-weight:700;color:#166534;font-size:1rem;">#${i + 1}</span>
                <button class="ai-task-delete" data-index="${i}" style="
                    background:#fee2e2;color:#dc2626;border:none;
                    padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.8rem;
                ">🗑️ Xóa</button>
            </div>
            
            <!-- Tên task -->
            <div style="margin-bottom:10px;">
                <label style="font-size:0.75rem;color:#64748b;display:block;margin-bottom:4px;">Tên công việc</label>
                <input type="text" class="ai-task-name" data-index="${i}" value="${(t.name || '').replace(/"/g, '&quot;')}" style="
                    width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;
                    font-size:0.95rem;box-sizing:border-box;
                ">
            </div>
            
            <!-- Row: Deadline (Date + Time) + Priority -->
            <div style="display:grid;grid-template-columns:1fr 0.7fr 1fr;gap:10px;margin-bottom:10px;">
                <div>
                    <label style="font-size:0.75rem;color:#64748b;display:block;margin-bottom:4px;">📅 Ngày</label>
                    <input type="date" class="ai-task-date" data-index="${i}" value="${t.dueDate || ''}" style="
                        width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;
                        font-size:0.9rem;box-sizing:border-box;
                    ">
                </div>
                <div>
                    <label style="font-size:0.75rem;color:#64748b;display:block;margin-bottom:4px;">⏰ Giờ</label>
                    <input type="time" class="ai-task-time" data-index="${i}" value="${t.dueTime || '09:00'}" style="
                        width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;
                        font-size:0.9rem;box-sizing:border-box;
                    ">
                </div>
                <div>
                    <label style="font-size:0.75rem;color:#64748b;display:block;margin-bottom:4px;">🎯 Ưu tiên</label>
                    <select class="ai-task-priority" data-index="${i}" style="
                        width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;
                        font-size:0.9rem;box-sizing:border-box;
                    ">
                        <option value="Cao" ${t.priority === 'Cao' ? 'selected' : ''}>🔴 Cao</option>
                        <option value="Trung bình" ${(!t.priority || t.priority === 'Trung bình') ? 'selected' : ''}>🟡 Trung bình</option>
                        <option value="Thấp" ${t.priority === 'Thấp' ? 'selected' : ''}>🟢 Thấp</option>
                    </select>
                </div>
            </div>
            
            <!-- Category -->
            <div>
                <label style="font-size:0.75rem;color:#64748b;display:block;margin-bottom:4px;">📁 Danh mục</label>
                <select class="ai-task-category" data-index="${i}" style="
                    width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;
                    font-size:0.9rem;box-sizing:border-box;
                ">
                    <option value="Công việc" ${t.category === 'Công việc' ? 'selected' : ''}>💼 Công việc</option>
                    <option value="Học tập" ${t.category === 'Học tập' ? 'selected' : ''}>📚 Học tập</option>
                    <option value="Cá nhân" ${(!t.category || t.category === 'Cá nhân') ? 'selected' : ''}>👤 Cá nhân</option>
                    <option value="Khác" ${t.category === 'Khác' ? 'selected' : ''}>📋 Khác</option>
                </select>
            </div>
        </div>
    `).join('');

    const modal = document.createElement('div');
    modal.id = 'ai-result-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: flex; align-items: center;
        justify-content: center; z-index: 10000; backdrop-filter: blur(4px);
    `;

    modal.innerHTML = `
        <div style="
            background: white; border-radius: 20px;
            max-width: 600px; width: 95%; max-height: 90vh; overflow: hidden;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
        ">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 18px 24px;">
                <h3 style="margin:0; color:white; font-size:1.2rem;">
                    ✏️ Chỉnh sửa & Xác nhận <span id="ai-task-count">${tasksToAdd.length}</span> công việc
                </h3>
                <p style="margin:5px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem;">
                    Bạn có thể chỉnh sửa trước khi lưu
                </p>
            </div>
            
            <!-- Editable Tasks -->
            <div id="ai-tasks-container" style="padding: 16px 20px; max-height: 55vh; overflow-y: auto;">
                ${editableHTML}
            </div>
            
            <!-- Actions -->
            <div style="padding: 16px 24px; background: #f8fafc; display: flex; gap: 12px; justify-content: space-between; align-items: center;">
                <span style="font-size:0.85rem;color:#64748b;">
                    💡 Tip: Xóa task không cần bằng nút 🗑️
                </span>
                <div style="display:flex;gap:10px;">
                    <button id="ai-task-cancel" style="
                        padding: 10px 20px; border-radius: 10px; border: 1px solid #e2e8f0;
                        background: white; color: #64748b; cursor: pointer; font-weight: 500;
                    ">✕ Hủy</button>
                    <button id="ai-task-confirm" style="
                        padding: 10px 24px; border-radius: 10px; border: none;
                        background: linear-gradient(135deg, #22c55e, #16a34a);
                        color: white; cursor: pointer; font-weight: 600;
                    ">✓ Lưu tất cả</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Xử lý nút XÓA từng task
    modal.querySelectorAll('.ai-task-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            const item = modal.querySelector(`.ai-task-item[data-index="${index}"]`);
            if (item) {
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
                item.dataset.deleted = 'true';
                btn.textContent = '✓ Đã xóa';
                btn.style.background = '#e2e8f0';
                btn.style.color = '#64748b';

                // Update count
                const remaining = modal.querySelectorAll('.ai-task-item:not([data-deleted="true"])').length;
                document.getElementById('ai-task-count').textContent = remaining;
            }
        });
    });

    // Cancel button
    document.getElementById('ai-task-cancel').addEventListener('click', () => {
        modal.remove();
    });

    // Confirm button - LƯU THẬT VÀO FIREBASE (đọc từ inputs đã edit)
    document.getElementById('ai-task-confirm').addEventListener('click', async () => {
        const confirmBtn = document.getElementById('ai-task-confirm');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '⏳ Đang lưu...';

        try {
            // Thu thập dữ liệu từ các inputs (bỏ qua tasks đã xóa)
            const newTasks = [];
            const taskItems = modal.querySelectorAll('.ai-task-item:not([data-deleted="true"])');

            taskItems.forEach(item => {
                const index = item.dataset.index;
                const nameInput = item.querySelector('.ai-task-name');
                const dateInput = item.querySelector('.ai-task-date');
                const timeInput = item.querySelector('.ai-task-time');
                const prioritySelect = item.querySelector('.ai-task-priority');
                const categorySelect = item.querySelector('.ai-task-category');

                const taskName = nameInput?.value?.trim();
                if (taskName) {
                    newTasks.push({
                        id: generateID(),
                        name: taskName,
                        dueDate: dateInput?.value || null,
                        dueTime: timeInput?.value || null,
                        priority: prioritySelect?.value || 'Trung bình',
                        category: categorySelect?.value || 'Chung',
                        status: 'Chưa thực hiện',
                        createdAt: new Date().toISOString(),
                        createdBy: 'AI'
                    });
                }
            });

            if (newTasks.length === 0) {
                showNotification('Không có task nào để lưu!', 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '✓ Lưu tất cả';
                return;
            }

            // Thêm vào globalData
            if (!globalData.tasks) globalData.tasks = [];
            globalData.tasks.push(...newTasks);

            // Lưu vào Firebase
            await saveUserData(currentUser.uid, { tasks: globalData.tasks });

            // Clear inputs
            inputs.forEach(input => input.value = '');

            // Đóng modal và thông báo
            modal.remove();
            showNotification(`✅ Đã thêm ${newTasks.length} công việc thành công!`, 'success');

            // Refresh UI nếu có hàm renderTasks
            if (typeof window.renderTasks === 'function') {
                window.renderTasks();
            }

        } catch (error) {
            showNotification('Lỗi lưu: ' + error.message, 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '✓ Lưu tất cả';
        }
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
};

// Helper: Generate unique ID
const generateID = () => {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// ============================================================
// HIỂN THỊ KẾT QUẢ AI (MODAL) - Beautiful formatting
// ============================================================

// Helper: Convert markdown to HTML
const markdownToHTML = (text) => {
    return text
        // Headers
        .replace(/^### (.*$)/gim, '<h4 style="color:#1e40af;margin:12px 0 8px;font-size:1rem;">$1</h4>')
        .replace(/^## (.*$)/gim, '<h3 style="color:#1e40af;margin:15px 0 10px;font-size:1.1rem;">$1</h3>')
        .replace(/^# (.*$)/gim, '<h2 style="color:#1e40af;margin:18px 0 12px;font-size:1.2rem;">$1</h2>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1e293b;font-weight:600;">$1</strong>')
        .replace(/__(.*?)__/g, '<strong style="color:#1e293b;font-weight:600;">$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        // Numbered lists
        .replace(/^\d+\.\s+(.*)$/gim, '<div style="display:flex;gap:8px;margin:8px 0;padding:10px 12px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:10px;border-left:3px solid #0284c7;"><span style="color:#0284c7;font-weight:600;">•</span><span>$1</span></div>')
        // Bullet lists
        .replace(/^[-•]\s+(.*)$/gim, '<div style="display:flex;gap:8px;margin:6px 0;padding:8px 12px;background:#f8fafc;border-radius:8px;"><span style="color:#6366f1;">▸</span><span>$1</span></div>')
        // Line breaks
        .replace(/\n\n/g, '</p><p style="margin:12px 0;">')
        .replace(/\n/g, '<br>');
};

const showAIResult = (title, content, isHTML = false) => {
    // Xóa modal cũ nếu có
    const oldModal = document.getElementById('ai-result-modal');
    if (oldModal) oldModal.remove();

    // Format content
    const formattedContent = isHTML ? content : markdownToHTML(content);

    const modal = document.createElement('div');
    modal.id = 'ai-result-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: flex; align-items: center;
        justify-content: center; z-index: 10000; backdrop-filter: blur(4px);
        animation: fadeIn 0.2s ease;
    `;

    modal.innerHTML = `
        <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .ai-modal-content { animation: slideUp 0.3s ease; }
        </style>
        <div class="ai-modal-content" style="
            background: linear-gradient(135deg, #ffffff, #f8fafc);
            padding: 0; border-radius: 20px;
            max-width: 550px; width: 92%;
            max-height: 85vh; overflow: hidden;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #667eea, #764ba2);
                padding: 18px 24px;
                display: flex; justify-content: space-between; align-items: center;
            ">
                <h3 style="margin:0; font-size:1.2rem; color:white; font-weight:600;">
                    ${title}
                </h3>
                <button onclick="this.closest('#ai-result-modal').remove()" style="
                    background: rgba(255,255,255,0.2);
                    color: white; border: none; border-radius: 8px;
                    padding: 8px 16px; cursor: pointer; font-weight: 500;
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                   onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    ✕ Đóng
                </button>
            </div>
            
            <!-- Body -->
            <div style="
                padding: 24px;
                max-height: calc(85vh - 80px);
                overflow-y: auto;
                line-height: 1.8;
                color: #334155;
                font-size: 0.95rem;
            ">
                <p style="margin:0 0 12px 0;">${formattedContent}</p>
            </div>
            
            <!-- Footer -->
            <div style="
                padding: 12px 24px;
                background: #f1f5f9;
                border-top: 1px solid #e2e8f0;
                text-align: center;
                font-size: 0.8rem;
                color: #64748b;
            ">
                🤖 Powered by AI • Kết quả mang tính tham khảo
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // ESC to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};

// Export
export { handleAIPrioritize, handleAISuggest, showEisenhowerMatrix };
