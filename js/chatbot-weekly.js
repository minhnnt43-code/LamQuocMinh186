// ============================================================
// FILE: js/chatbot-weekly.js
// Mục đích: Chatbot Lập kế hoạch Tuần - Phase 0
// Tích hợp: ai-core-engine.js (Phase 1 - 10 tính năng lõi)
// ============================================================

import { saveUserData } from './firebase.js';
import { showNotification, generateID, toLocalISOString } from './common.js';

// [MỚI] Import từ AI Core Engine (Phase 1)
import {
    analyzeWithAI,
    detectDuplicates,
    evolvePriority,
    contextMemory,
    extractEntities,
    classifyIntent
} from './ai-core-engine.js';

let globalData = null;
let currentUser = null;
let parsedTasks = []; // Lưu tasks đã phân tích

// ============================================================
// FUNCTION: PARSE VIETNAMESE DATE
// Convert ngày tiếng Việt sang YYYY-MM-DD
// ============================================================
function parseVietnameseDate(dateStr) {
    if (!dateStr) return null;

    const today = new Date();
    const lowerDate = dateStr.toLowerCase().trim();

    // 1. Nếu đã là format YYYY-MM-DD thì giữ nguyên
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // 2. Format DD/MM/YYYY hoặc DD-MM-YYYY
    const ddmmMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (ddmmMatch) {
        const day = parseInt(ddmmMatch[1]);
        const month = parseInt(ddmmMatch[2]) - 1;
        const year = ddmmMatch[3] ? (ddmmMatch[3].length === 2 ? 2000 + parseInt(ddmmMatch[3]) : parseInt(ddmmMatch[3])) : today.getFullYear();
        const d = new Date(year, month, day);
        return d.toISOString().split('T')[0];
    }

    // 3. "hôm nay", "today"
    if (lowerDate.includes('hôm nay') || lowerDate === 'today') {
        return today.toISOString().split('T')[0];
    }

    // 4. "ngày mai", "tomorrow"
    if (lowerDate.includes('ngày mai') || lowerDate === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    // 5. "hôm qua", "yesterday"
    if (lowerDate.includes('hôm qua') || lowerDate === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    // 6. "tuần sau", "tuần tới", "next week"
    if (lowerDate.includes('tuần sau') || lowerDate.includes('tuần tới') || lowerDate.includes('next week')) {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.toISOString().split('T')[0];
    }

    // 7. "cuối tuần", "weekend"
    if (lowerDate.includes('cuối tuần') || lowerDate.includes('weekend')) {
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const daysUntilSaturday = dayOfWeek === 0 ? 6 : (6 - dayOfWeek);
        const saturday = new Date(today);
        saturday.setDate(saturday.getDate() + daysUntilSaturday);
        return saturday.toISOString().split('T')[0];
    }

    // 8. "thứ X" (thứ 2 đến thứ 7, chủ nhật)
    const thuMap = {
        'thứ hai': 1, 'thứ 2': 1, 't2': 1,
        'thứ ba': 2, 'thứ 3': 2, 't3': 2,
        'thứ tư': 3, 'thứ 4': 3, 't4': 3,
        'thứ năm': 4, 'thứ 5': 4, 't5': 4,
        'thứ sáu': 5, 'thứ 6': 5, 't6': 5,
        'thứ bảy': 6, 'thứ 7': 6, 't7': 6,
        'chủ nhật': 0, 'cn': 0
    };

    for (const [key, targetDay] of Object.entries(thuMap)) {
        if (lowerDate.includes(key)) {
            const currentDay = today.getDay();
            let daysUntil = targetDay - currentDay;
            if (daysUntil <= 0) daysUntil += 7; // Nếu ngày đã qua, lấy tuần sau
            const targetDate = new Date(today);
            targetDate.setDate(targetDate.getDate() + daysUntil);
            return targetDate.toISOString().split('T')[0];
        }
    }

    // 9. "ngày X" (ngày 20, ngày 25...)
    const ngayMatch = lowerDate.match(/ngày\s*(\d{1,2})/);
    if (ngayMatch) {
        const day = parseInt(ngayMatch[1]);
        let month = today.getMonth();
        let year = today.getFullYear();
        // Nếu ngày đã qua trong tháng này, lấy tháng sau
        if (day < today.getDate()) {
            month++;
            if (month > 11) { month = 0; year++; }
        }
        const d = new Date(year, month, day);
        return d.toISOString().split('T')[0];
    }

    // 10. Default: ngày mai
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

/**
 * Khởi tạo module Chatbot Lập kế hoạch Tuần
 */
export function initChatbotWeekly(data, user) {
    globalData = data;
    currentUser = user;
    setupEventListeners();
    console.log('✅ Chatbot Lập kế hoạch Tuần đã sẵn sàng');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Nút Phân tích
    const btnAnalyze = document.getElementById('btn-chatbot-analyze');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', handleAnalyze);
    }

    // Nút Thêm đã chọn
    const btnAddSelected = document.getElementById('btn-chatbot-add-selected');
    if (btnAddSelected) {
        btnAddSelected.addEventListener('click', handleAddSelected);
    }

    // Nút Chọn tất cả
    const btnSelectAll = document.getElementById('btn-chatbot-select-all');
    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', handleSelectAll);
    }

    // Nút Xóa form
    const btnClear = document.getElementById('btn-chatbot-clear');
    if (btnClear) {
        btnClear.addEventListener('click', handleClear);
    }
}

/**
 * Xử lý phân tích văn bản - Sử dụng AI Core Engine
 */
async function handleAnalyze() {
    const textarea = document.getElementById('chatbot-weekly-input');
    const resultContainer = document.getElementById('chatbot-result-container');
    const btnAnalyze = document.getElementById('btn-chatbot-analyze');

    if (!textarea || !textarea.value.trim()) {
        showNotification('Vui lòng nhập nội dung cần phân tích', 'error');
        return;
    }

    const inputText = textarea.value.trim();

    // Loading state
    btnAnalyze.disabled = true;
    btnAnalyze.innerHTML = '⏳ Đang phân tích...';

    try {
        // [MỚI] Sử dụng analyzeWithAI từ Core Engine (tích hợp 10 tính năng)
        const result = await analyzeWithAI(inputText);
        const aiResponse = result.response;
        const confidence = result.confidence;
        const entities = result.entities;

        // Parse JSON từ response - với nhiều fallback
        let tasks = [];
        try {
            // Clean up response - loại bỏ markdown code blocks
            let cleanResponse = aiResponse
                .replace(/```json\n?/gi, '')
                .replace(/```\n?/gi, '')
                .trim();

            // Thử parse trực tiếp nếu là JSON valid
            try {
                const directParse = JSON.parse(cleanResponse);
                if (Array.isArray(directParse)) {
                    tasks = directParse;
                } else if (directParse.tasks && Array.isArray(directParse.tasks)) {
                    tasks = directParse.tasks;
                }
            } catch (e) {
                // Nếu không parse được trực tiếp, tìm pattern array
                const jsonMatch = cleanResponse.match(/\[[\s\S]*?\]/);
                if (jsonMatch) {
                    // Clean up trước khi parse
                    let jsonStr = jsonMatch[0]
                        .replace(/,\s*]/g, ']')  // Loại bỏ trailing commas
                        .replace(/'/g, '"');      // Đổi single quotes thành double quotes
                    tasks = JSON.parse(jsonStr);
                }
            }
        } catch (parseError) {
            console.error('Lỗi parse JSON:', parseError);
            console.log('AI Response:', aiResponse);

            // Fallback: Tạo 1 task từ text input
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            tasks = [{
                title: inputText.substring(0, 100),
                deadline: tomorrow.toISOString().split('T')[0],
                priority: 'Trung bình',
                category: 'Công việc',
                note: 'Tạo từ text (AI parse thất bại)'
            }];
            showNotification('AI không trả về đúng format, đã tạo task mặc định', 'warning');
        }

        if (tasks.length === 0) {
            showNotification('Không tìm thấy công việc nào trong văn bản', 'warning');
            return;
        }

        // [MỚI] Áp dụng evolvePriority và parseVietnameseDate cho mỗi task
        parsedTasks = tasks.map((task, index) => {
            const evolvedPriority = evolvePriority(task, contextMemory);
            // Convert deadline từ tiếng Việt sang YYYY-MM-DD
            const parsedDeadline = parseVietnameseDate(task.deadline);

            return {
                ...task,
                id: 'parsed-' + Date.now() + '-' + index,
                deadline: parsedDeadline,
                priority: evolvedPriority,
                selected: true
            };
        });

        // [MỚI] Kiểm tra trùng lặp với tasks hiện có
        const existingTasks = globalData?.tasks || [];
        let duplicateCount = 0;
        for (const task of parsedTasks) {
            const duplicates = detectDuplicates(task, existingTasks);
            if (duplicates.length > 0) {
                task.hasDuplicate = true;
                task.duplicateInfo = duplicates[0].message;
                duplicateCount++;
            }
        }

        // Hiển thị kết quả
        renderResultTable(parsedTasks);
        resultContainer.style.display = 'block';

        // [MỚI] Hiển thị thông tin chi tiết với confidence và entities
        let message = `✅ Đã tìm thấy ${tasks.length} công việc (Độ tin cậy: ${confidence}%)`;
        if (duplicateCount > 0) {
            message += ` | ⚠️ ${duplicateCount} có thể trùng lặp`;
        }
        if (entities.dates.length > 0) {
            message += ` | 📅 ${entities.dates.length} ngày phát hiện`;
        }
        showNotification(message, 'success');

    } catch (error) {
        console.error('Lỗi phân tích:', error);
        showNotification('Có lỗi xảy ra khi phân tích. Vui lòng thử lại.', 'error');
    } finally {
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = '🔍 Phân tích';
    }
}

/**
 * Render bảng kết quả
 */
function renderResultTable(tasks) {
    const tbody = document.getElementById('chatbot-result-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    tasks.forEach((task, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-task-id', task.id);

        const priorityColors = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#10b981'
        };

        const priorityLabels = {
            high: '🔴 Cao',
            medium: '🟡 TB',
            low: '🟢 Thấp'
        };

        // Format time for display
        const startTime = task.startTime || '';
        const endTime = task.endTime || '';
        const hasTime = startTime || endTime;

        // Special indicator for immediate tasks
        const isImmediate = task.isImmediate || false;

        tr.innerHTML = `
            <td style="text-align:center;">
                <input type="checkbox" class="task-checkbox" data-index="${index}" ${task.selected ? 'checked' : ''}>
            </td>
            <td>
                <input type="text" value="${escapeHTML(task.title)}" class="edit-title" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                    ${isImmediate ? '<span style="background:#ef4444; color:white; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:600;">⚡ Ngay</span>' : `
                    <input type="time" value="${startTime}" class="edit-start-time" 
                        style="padding:6px; border:1px solid #e2e8f0; border-radius:6px; width:80px; font-size:0.85rem;"
                        title="Giờ bắt đầu">
                    <span style="color:#64748b;">→</span>
                    <input type="time" value="${endTime}" class="edit-end-time" 
                        style="padding:6px; border:1px solid #e2e8f0; border-radius:6px; width:80px; font-size:0.85rem;"
                        title="Giờ kết thúc">
                    `}
                </div>
            </td>
            <td>
                <input type="date" value="${task.deadline || ''}" class="edit-deadline" style="padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
            </td>
            <td>
                <select class="edit-priority" style="padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🔴 Cao</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>🟡 TB</option>
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 Thấp</option>
                </select>
            </td>
            <td>
                <select class="edit-category" style="padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                    <option value="Công việc" ${task.category === 'Công việc' ? 'selected' : ''}>💼 Công việc</option>
                    <option value="Học tập" ${task.category === 'Học tập' ? 'selected' : ''}>📚 Học tập</option>
                    <option value="Cá nhân" ${task.category === 'Cá nhân' ? 'selected' : ''}>👤 Cá nhân</option>
                    <option value="Họp" ${task.category === 'Họp' ? 'selected' : ''}>🤝 Họp</option>
                    <option value="Khác" ${task.category === 'Khác' ? 'selected' : ''}>📌 Khác</option>
                </select>
            </td>
            <td style="text-align:center;">
                <button class="btn-remove-task" data-index="${index}" title="Xóa" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">🗑️</button>
            </td>
        `;

        // Event listeners cho row
        const checkbox = tr.querySelector('.task-checkbox');
        checkbox.addEventListener('change', (e) => {
            parsedTasks[index].selected = e.target.checked;
            updateSelectedCount();
        });

        const removeBtn = tr.querySelector('.btn-remove-task');
        removeBtn.addEventListener('click', () => {
            parsedTasks.splice(index, 1);
            renderResultTable(parsedTasks);
            updateSelectedCount();
        });

        // Update values on change
        tr.querySelector('.edit-title').addEventListener('change', (e) => {
            parsedTasks[index].title = e.target.value;
        });

        // Time inputs (only if not immediate task)
        const startTimeInput = tr.querySelector('.edit-start-time');
        const endTimeInput = tr.querySelector('.edit-end-time');
        if (startTimeInput) {
            startTimeInput.addEventListener('change', (e) => {
                parsedTasks[index].startTime = e.target.value || null;
                detectTimeConflicts(); // [MỚI] Re-check conflicts
            });
        }
        if (endTimeInput) {
            endTimeInput.addEventListener('change', (e) => {
                parsedTasks[index].endTime = e.target.value || null;
                detectTimeConflicts(); // [MỚI] Re-check conflicts
            });
        }

        tr.querySelector('.edit-deadline').addEventListener('change', (e) => {
            parsedTasks[index].deadline = e.target.value || null;
            detectTimeConflicts(); // [MỚI] Re-check conflicts
        });
        tr.querySelector('.edit-priority').addEventListener('change', (e) => {
            parsedTasks[index].priority = e.target.value;
        });
        tr.querySelector('.edit-category').addEventListener('change', (e) => {
            parsedTasks[index].category = e.target.value;
        });

        tbody.appendChild(tr);
    });

    updateSelectedCount();
    detectTimeConflicts(); // [MỚI] Check for conflicts after render
}

/**
 * [MỚI] Detect time conflicts between tasks on the same day
 */
function detectTimeConflicts() {
    const conflictContainer = document.getElementById('chatbot-conflict-warning');

    // Group tasks by deadline
    const tasksByDate = {};
    parsedTasks.forEach((task, index) => {
        if (task.deadline && task.startTime) {
            if (!tasksByDate[task.deadline]) {
                tasksByDate[task.deadline] = [];
            }
            tasksByDate[task.deadline].push({ ...task, index });
        }
    });

    const conflicts = [];

    // Check for overlaps within each day
    Object.entries(tasksByDate).forEach(([date, tasks]) => {
        if (tasks.length < 2) return;

        // Sort by start time
        tasks.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        for (let i = 0; i < tasks.length - 1; i++) {
            const current = tasks[i];
            const next = tasks[i + 1];

            if (!current.endTime || !next.startTime) continue;

            // Check overlap: if current end time > next start time
            if (current.endTime > next.startTime) {
                conflicts.push({
                    date,
                    task1: { title: current.title, time: `${current.startTime}-${current.endTime}` },
                    task2: { title: next.title, time: `${next.startTime}-${next.endTime || '?'}` }
                });
            }
        }
    });

    // Display warnings
    if (conflicts.length > 0) {
        const warningHTML = `
            <div class="conflict-warning" id="chatbot-conflict-warning">
                <div class="conflict-header">
                    <span>⚠️ Phát hiện ${conflicts.length} xung đột thời gian!</span>
                    <button class="conflict-dismiss" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <ul class="conflict-list">
                    ${conflicts.map(c => `
                        <li>
                            <strong>${c.date}</strong>: 
                            "${truncateText(c.task1.title, 20)}" (${c.task1.time}) 
                            ↔ "${truncateText(c.task2.title, 20)}" (${c.task2.time})
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        // Insert before table
        const table = document.getElementById('chatbot-result-table');
        if (table) {
            // Remove existing warning
            const existing = document.querySelector('.conflict-warning');
            if (existing) existing.remove();

            table.insertAdjacentHTML('beforebegin', warningHTML);
        }
    } else {
        // Remove warning if no conflicts
        const existing = document.querySelector('.conflict-warning');
        if (existing) existing.remove();
    }
}

// Helper function for truncating text
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
}

/**
 * Cập nhật số lượng đã chọn
 */
function updateSelectedCount() {
    const countEl = document.getElementById('chatbot-selected-count');
    if (!countEl) return;

    const selectedCount = parsedTasks.filter(t => t.selected).length;
    countEl.textContent = `Đã chọn: ${selectedCount}/${parsedTasks.length}`;
}

/**
 * Chọn/Bỏ chọn tất cả
 */
function handleSelectAll() {
    const allSelected = parsedTasks.every(t => t.selected);
    parsedTasks.forEach(t => t.selected = !allSelected);
    renderResultTable(parsedTasks);
}

/**
 * Thêm các task đã chọn vào hệ thống + TỰ ĐỘNG ĐỒNG BỘ LÊN LỊCH
 */
async function handleAddSelected() {
    const selectedTasks = parsedTasks.filter(t => t.selected);

    if (selectedTasks.length === 0) {
        showNotification('Chưa chọn công việc nào', 'warning');
        return;
    }

    const btnAdd = document.getElementById('btn-chatbot-add-selected');
    btnAdd.disabled = true;
    btnAdd.innerHTML = '⏳ Đang thêm...';

    try {
        // Tạo tasks mới - [FIX] Đồng nhất field names với work.js
        const newTasks = selectedTasks.map(task => ({
            id: generateID('task'),
            name: task.title,  // [FIX] work.js dùng 'name' không phải 'title'
            notes: task.description || '',
            dueDate: task.deadline || null,  // [FIX] work.js dùng 'dueDate' không phải 'deadline'
            priority: task.priority || 'medium',
            status: 'Chưa thực hiện',  // [FIX] work.js dùng 'Chưa thực hiện' không phải 'pending'
            category: task.category || 'Khác',
            createdAt: toLocalISOString(new Date()),
            subtasks: [],
            // [MỚI] Lưu thông tin thời gian nếu có
            startTime: task.startTime || null,
            endTime: task.endTime || null
        }));

        // Thêm vào data
        if (!globalData.tasks) globalData.tasks = [];
        globalData.tasks.push(...newTasks);

        // [MỚI] TẠO CALENDAR EVENTS CHO TASKS CÓ THỜI GIAN
        if (!globalData.calendarEvents) globalData.calendarEvents = [];

        let calendarEventsCreated = 0;
        for (const task of newTasks) {
            if (task.deadline && task.startTime) {
                const calendarEvent = createCalendarEvent(task);
                if (calendarEvent) {
                    globalData.calendarEvents.push(calendarEvent);
                    calendarEventsCreated++;
                }
            }
        }

        // Lưu vào Firebase
        await saveUserData(currentUser.uid, {
            tasks: globalData.tasks,
            calendarEvents: globalData.calendarEvents
        });

        // [MỚI] Ghi nhớ vào Context Memory
        for (const task of newTasks) {
            contextMemory.rememberTask(task);
        }

        // Thông báo kết quả
        let message = `✅ Đã thêm ${newTasks.length} công việc`;
        if (calendarEventsCreated > 0) {
            message += ` và đồng bộ ${calendarEventsCreated} sự kiện lên lịch!`;
        } else {
            message += ` vào hệ thống!`;
        }
        showNotification(message, 'success');

        // Reset form
        handleClear();

        // Ẩn kết quả
        const resultContainer = document.getElementById('chatbot-result-container');
        if (resultContainer) resultContainer.style.display = 'none';

    } catch (error) {
        console.error('Lỗi thêm tasks:', error);
        showNotification('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
    } finally {
        btnAdd.disabled = false;
        btnAdd.innerHTML = '✅ Thêm đã chọn';
    }
}

/**
 * [MỚI] Tạo calendar event từ task có thời gian
 */
function createCalendarEvent(task) {
    if (!task.deadline || !task.startTime) return null;

    try {
        const [year, month, day] = task.deadline.split('-').map(Number);
        const [startHour, startMin] = task.startTime.split(':').map(Number);

        // Tính end time (mặc định 1 giờ nếu không có)
        let endHour = startHour + 1;
        let endMin = startMin;

        if (task.endTime) {
            [endHour, endMin] = task.endTime.split(':').map(Number);
        }

        const start = new Date(year, month - 1, day, startHour, startMin);
        const end = new Date(year, month - 1, day, endHour, endMin);

        return {
            id: generateID('event'),
            title: task.title,
            description: task.description || `Công việc từ Chatbot Lập kế hoạch Tuần`,
            start: toLocalISOString(start),
            end: toLocalISOString(end),
            color: getCategoryColor(task.category),
            category: task.category || 'Khác',
            priority: task.priority || 'medium',
            linkedTaskId: task.id, // Liên kết với task
            createdAt: toLocalISOString(new Date()),
            allDay: false
        };
    } catch (error) {
        console.error('Lỗi tạo calendar event:', error);
        return null;
    }
}

/**
 * [MỚI] Parse thời gian từ text tiếng Việt
 */
function parseVietnameseTime(text) {
    if (!text) return null;

    const lowerText = text.toLowerCase();

    // Pattern: "lúc Xh", "X giờ", "Xh sáng/chiều/tối"
    const timePatterns = [
        /(\d{1,2})\s*[h:]\s*(\d{0,2})?\s*(sáng|chiều|tối)?/i,
        /(\d{1,2})\s*giờ\s*(\d{0,2})?\s*(sáng|chiều|tối)?/i,
        /lúc\s*(\d{1,2})\s*[h:]?\s*(\d{0,2})?\s*(sáng|chiều|tối)?/i
    ];

    for (const pattern of timePatterns) {
        const match = lowerText.match(pattern);
        if (match) {
            let hour = parseInt(match[1]);
            const minute = match[2] ? parseInt(match[2]) : 0;
            const period = match[3];

            // Chuyển đổi 12h -> 24h
            if (period === 'chiều' && hour < 12) hour += 12;
            if (period === 'tối' && hour < 18) hour += 12;
            if (period === 'sáng' && hour === 12) hour = 0;

            return {
                startTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                endTime: `${(hour + 1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            };
        }
    }

    return null;
}

/**
 * [MỚI] Lấy màu theo category
 */
function getCategoryColor(category) {
    const colors = {
        'Công việc': '#3788d8',
        'Học tập': '#28a745',
        'Cá nhân': '#9c27b0',
        'Họp': '#ff5722',
        'Khác': '#607d8b'
    };
    return colors[category] || '#3788d8';
}

/**
 * Xóa form
 */
function handleClear() {
    const textarea = document.getElementById('chatbot-weekly-input');
    const resultContainer = document.getElementById('chatbot-result-container');

    if (textarea) textarea.value = '';
    if (resultContainer) resultContainer.style.display = 'none';

    parsedTasks = [];
}

/**
 * Helper: Escape HTML
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

// Export
export { handleAnalyze, handleAddSelected };
