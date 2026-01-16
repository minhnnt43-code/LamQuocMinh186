// ============================================================
// FILE: js/smart-features-advanced.js
// Các tính năng nâng cao (Phase 2 & 3)
// ============================================================

import { showNotification, toLocalISOString, formatDate, generateID } from './common.js';
import { saveUserData } from './firebase.js';
import { aiPowerHub } from './ai-power-hub.js';

// ============================================================
// #6 UPCOMING CONFLICTS - Phát hiện xung đột lịch
// ============================================================
export function detectCalendarConflicts(events) {
    if (!events || events.length < 2) return [];

    // [FIX] Lọc ra các events hợp lệ (có date, startTime, endTime)
    const validEvents = events.filter(e =>
        e && e.date && e.startTime && e.endTime && e.title
    );

    if (validEvents.length < 2) return [];

    const conflicts = [];
    const sortedEvents = [...validEvents].sort((a, b) => {
        // [FIX] Safe comparison với fallback
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA.localeCompare(timeB);
    });

    for (let i = 0; i < sortedEvents.length - 1; i++) {
        const current = sortedEvents[i];
        const next = sortedEvents[i + 1];

        if (current.date === next.date) {
            // Check time overlap
            if (current.endTime > next.startTime) {
                conflicts.push({
                    event1: current,
                    event2: next,
                    type: 'overlap',
                    message: `"${current.title}" và "${next.title}" bị trùng giờ vào ${formatDate(current.date)}`
                });
            }
        }
    }

    return conflicts;
}

export function renderConflictsWarning(container, conflicts) {
    if (!container || conflicts.length === 0) {
        if (container) container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="conflicts-warning" style="
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        ">
            <h4 style="margin: 0 0 10px 0; color: #92400e; display: flex; align-items: center; gap: 8px;">
                ⚠️ Phát hiện ${conflicts.length} xung đột lịch
            </h4>
            <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 0.9rem;">
                ${conflicts.map(c => `<li>${c.message}</li>`).join('')}
            </ul>
        </div>
    `;
}

// ============================================================
// #7 SMART REMINDERS
// ============================================================
export function getSmartReminders(userData) {
    const reminders = [];
    const today = toLocalISOString(new Date());
    const tomorrow = toLocalISOString(new Date(Date.now() + 24 * 60 * 60 * 1000));

    const tasks = userData.tasks || [];
    const events = userData.calendarEvents || [];

    // Overdue tasks
    const overdue = tasks.filter(t => t.dueDate < today && t.status !== 'Hoàn thành');
    if (overdue.length > 0) {
        reminders.push({
            type: 'urgent',
            icon: '🔴',
            message: `${overdue.length} task quá hạn cần xử lý ngay!`,
            action: 'view-overdue'
        });
    }

    // Tasks due tomorrow
    const dueTomorrow = tasks.filter(t => t.dueDate === tomorrow && t.status !== 'Hoàn thành');
    if (dueTomorrow.length > 0) {
        reminders.push({
            type: 'warning',
            icon: '🟡',
            message: `${dueTomorrow.length} task cần hoàn thành trước ngày mai`,
            action: 'view-tomorrow'
        });
    }

    // Events today
    const eventsToday = events.filter(e => e && e.date === today);
    if (eventsToday.length > 0) {
        const now = new Date();
        const currentHour = now.getHours();
        const upcoming = eventsToday.filter(e => {
            // [FIX] Safe check cho startTime
            if (!e.startTime) return false;
            const eventHour = parseInt(e.startTime.split(':')[0]) || 0;
            return eventHour > currentHour && eventHour <= currentHour + 2;
        });

        if (upcoming.length > 0) {
            reminders.push({
                type: 'info',
                icon: '🔵',
                message: `Sắp có sự kiện: "${upcoming[0].title}" lúc ${upcoming[0].startTime}`,
                action: 'view-calendar'
            });
        }
    }

    return reminders;
}

// ============================================================
// #8 FOCUS RECOMMENDATION
// ============================================================
export function getFocusRecommendation() {
    const hour = new Date().getHours();

    // Based on typical productivity patterns
    const recommendations = {
        morning: { start: 9, end: 11, quality: 'Tối ưu', emoji: '🌟', message: 'Thời điểm tốt nhất để làm việc sáng tạo!' },
        noon: { start: 11, end: 13, quality: 'Trung bình', emoji: '☀️', message: 'Nên xử lý tasks đơn giản, sắp tới giờ nghỉ.' },
        afternoon: { start: 14, end: 16, quality: 'Tốt', emoji: '⚡', message: 'Năng lượng phục hồi sau nghỉ trưa!' },
        lateAfternoon: { start: 16, end: 18, quality: 'Khá', emoji: '🌤️', message: 'Phù hợp họp nhóm và review công việc.' },
        evening: { start: 19, end: 21, quality: 'Tùy người', emoji: '🌙', message: 'Một số người làm việc hiệu quả buổi tối.' },
        night: { start: 21, end: 24, quality: 'Thấp', emoji: '😴', message: 'Nên nghỉ ngơi, giấc ngủ quan trọng!' }
    };

    for (const [period, data] of Object.entries(recommendations)) {
        if (hour >= data.start && hour < data.end) {
            return {
                period,
                ...data,
                currentHour: hour
            };
        }
    }

    // Default for early morning
    return {
        period: 'early',
        quality: 'Thức sớm tốt!',
        emoji: '🌅',
        message: 'Buổi sáng sớm là thời gian vàng cho deep work!',
        currentHour: hour
    };
}

// ============================================================
// #12 SIMILAR TASKS - Gợi ý tasks tương tự
// ============================================================
export function findSimilarTasks(taskName, existingTasks) {
    if (!taskName || !existingTasks || existingTasks.length === 0) return [];

    const keywords = taskName.toLowerCase().split(/\s+/);
    const scored = [];

    for (const task of existingTasks) {
        let score = 0;
        const taskWords = task.name.toLowerCase().split(/\s+/);

        for (const kw of keywords) {
            if (kw.length < 2) continue;
            for (const tw of taskWords) {
                if (tw.includes(kw) || kw.includes(tw)) {
                    score++;
                }
            }
        }

        if (score > 0) {
            scored.push({ task, score });
        }
    }

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(s => s.task);
}

// ============================================================
// #13 TIME ESTIMATE
// ============================================================
export function estimateTaskTime(taskName, similarTasks) {
    // Keywords that suggest duration
    const durationHints = {
        quick: ['xem', 'đọc', 'check', 'gửi email', 'trả lời'],
        medium: ['viết', 'làm', 'chuẩn bị', 'họp'],
        long: ['báo cáo', 'luận văn', 'dự án', 'nghiên cứu', 'phân tích']
    };

    const lowerName = taskName.toLowerCase();

    // Check keywords
    for (const kw of durationHints.quick) {
        if (lowerName.includes(kw)) return { estimate: '15-30 phút', confidence: 'medium' };
    }
    for (const kw of durationHints.long) {
        if (lowerName.includes(kw)) return { estimate: '2-4 giờ', confidence: 'medium' };
    }

    // Default medium
    return { estimate: '30-60 phút', confidence: 'low' };
}

// ============================================================
// #14 RECURRING PATTERNS
// ============================================================
export function detectRecurringPatterns(tasks) {
    if (!tasks || tasks.length < 5) return [];

    const patterns = [];
    const dayOfWeekCount = {};
    const namePatterns = {};

    for (const task of tasks) {
        // [FIX] Skip invalid tasks
        if (!task || !task.dueDate || !task.name) continue;

        const dayOfWeek = new Date(task.dueDate).getDay();
        const simpleName = (task.name || '').toLowerCase().split(' ').slice(0, 2).join(' ');

        // Count by day of week
        if (!dayOfWeekCount[dayOfWeek]) dayOfWeekCount[dayOfWeek] = [];
        dayOfWeekCount[dayOfWeek].push(task);

        // Count by name pattern
        if (!namePatterns[simpleName]) namePatterns[simpleName] = [];
        namePatterns[simpleName].push(task);
    }

    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    // Find patterns
    for (const [name, tasksWithName] of Object.entries(namePatterns)) {
        if (tasksWithName.length >= 3) {
            patterns.push({
                type: 'name',
                pattern: name,
                count: tasksWithName.length,
                suggestion: `Bạn hay làm "${name}" - Tạo task recurring?`
            });
        }
    }

    return patterns.slice(0, 3);
}

// ============================================================
// #15 OVERDUE RESCUE
// ============================================================
export function getOverdueRescueOptions(task) {
    const today = new Date();
    const options = [];

    // Option 1: Reschedule to today
    options.push({
        id: 'today',
        label: '📅 Dời sang hôm nay',
        newDate: toLocalISOString(today)
    });

    // Option 2: Reschedule to tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    options.push({
        id: 'tomorrow',
        label: '📅 Dời sang ngày mai',
        newDate: toLocalISOString(tomorrow)
    });

    // Option 3: Next week
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    options.push({
        id: 'nextWeek',
        label: '📅 Dời sang tuần sau',
        newDate: toLocalISOString(nextWeek)
    });

    // Option 4: Break down
    options.push({
        id: 'breakdown',
        label: '✂️ Chia nhỏ task này',
        action: 'breakdown'
    });

    // Option 5: Cancel
    options.push({
        id: 'cancel',
        label: '❌ Hủy task này',
        action: 'cancel'
    });

    return options;
}

// ============================================================
// #16 BATCH OPERATIONS
// ============================================================
export function renderBatchOperationsBar(container, selectedCount, onAction) {
    if (!container) return;

    if (selectedCount === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = `
        <div class="batch-operations-bar" style="
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-radius: 12px;
            color: white;
            margin-bottom: 15px;
        ">
            <span style="font-weight: 600;">✓ Đã chọn ${selectedCount} items</span>
            <button class="batch-btn" data-action="complete" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
            ">✅ Hoàn thành tất cả</button>
            <button class="batch-btn" data-action="reschedule" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
            ">📅 Dời deadline</button>
            <button class="batch-btn" data-action="delete" style="
                background: rgba(239,68,68,0.8);
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
            ">🗑️ Xóa</button>
            <button class="batch-btn" data-action="cancel" style="
                background: transparent;
                border: 1px solid rgba(255,255,255,0.5);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
            ">Bỏ chọn</button>
        </div>
    `;

    container.querySelectorAll('.batch-btn').forEach(btn => {
        btn.addEventListener('click', () => onAction(btn.dataset.action));
    });
}

// ============================================================
// #17 TASK TEMPLATES
// ============================================================
const DEFAULT_TEMPLATES = [
    { id: 't1', name: 'Họp nhóm', category: 'Công việc', priority: 'medium', defaultDuration: '1 giờ' },
    { id: 't2', name: 'Nộp bài tập', category: 'Học tập', priority: 'high', defaultDuration: '30 phút' },
    { id: 't3', name: 'Đọc tài liệu', category: 'Học tập', priority: 'low', defaultDuration: '1 giờ' },
    { id: 't4', name: 'Viết báo cáo', category: 'Công việc', priority: 'high', defaultDuration: '3 giờ' },
    { id: 't5', name: 'Review code', category: 'Công việc', priority: 'medium', defaultDuration: '1 giờ' },
];

export function getTaskTemplates() {
    const saved = localStorage.getItem('task_templates');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) { }
    }
    return DEFAULT_TEMPLATES;
}

export function saveTaskTemplate(template) {
    const templates = getTaskTemplates();
    template.id = generateID('tpl');
    templates.push(template);
    localStorage.setItem('task_templates', JSON.stringify(templates));
    return template;
}

export function renderTemplateSelector(container, onSelect) {
    if (!container) return;

    const templates = getTaskTemplates();

    container.innerHTML = `
        <div class="template-selector" style="
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 15px;
        ">
            <span style="font-size: 0.85rem; color: #6b7280; width: 100%; margin-bottom: 5px;">📋 Templates nhanh:</span>
            ${templates.map(t => `
                <button class="template-btn" data-id="${t.id}" style="
                    background: #f3f4f6;
                    border: 1px solid #e5e7eb;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                ">${t.name}</button>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const template = templates.find(t => t.id === btn.dataset.id);
            if (template && onSelect) onSelect(template);
        });

        // Hover effect
        btn.addEventListener('mouseenter', () => {
            btn.style.background = '#667eea';
            btn.style.color = 'white';
            btn.style.borderColor = '#667eea';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = '#f3f4f6';
            btn.style.color = 'inherit';
            btn.style.borderColor = '#e5e7eb';
        });
    });
}

// ============================================================
// #18 VOICE INPUT - Web Speech API
// ============================================================
export function initVoiceInput(inputElement, onResult) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Speech recognition not supported');
        return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'vi-VN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

        if (inputElement) inputElement.value = transcript;
        if (onResult) onResult(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showNotification('Lỗi nhận diện giọng nói', 'error');
    };

    return recognition;
}

export function renderVoiceInputButton(container, inputElement) {
    if (!container) return;

    const recognition = initVoiceInput(inputElement);
    if (!recognition) return;

    const button = document.createElement('button');
    button.innerHTML = '🎤';
    button.title = 'Nhập bằng giọng nói';
    button.style.cssText = `
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        margin-left: 10px;
    `;

    let isRecording = false;

    button.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
            button.innerHTML = '🎤';
            button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            isRecording = false;
        } else {
            recognition.start();
            button.innerHTML = '⏹️';
            button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            isRecording = true;
            showNotification('🎤 Đang lắng nghe...', 'info');
        }
    });

    recognition.onend = () => {
        button.innerHTML = '🎤';
        button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        isRecording = false;
    };

    container.appendChild(button);
}

// ============================================================
// #19 NATURAL LANGUAGE TASK PARSING
// ============================================================
export function parseNaturalLanguageTask(input) {
    if (!input) return null;

    const result = {
        name: input,
        dueDate: null,
        priority: 'medium',
        category: 'Chung'
    };

    const lowerInput = input.toLowerCase();

    // Extract due date
    const datePatterns = [
        { pattern: /(?:vào|lúc|ngày)?\s*thứ\s*(hai|ba|tư|năm|sáu|bảy|2|3|4|5|6|7)/i, handler: parseWeekday },
        { pattern: /(?:vào|ngày)?\s*(hôm nay|mai|mốt|ngày mai)/i, handler: parseRelativeDay },
        { pattern: /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/, handler: parseDateFormat }
    ];

    for (const { pattern, handler } of datePatterns) {
        const match = lowerInput.match(pattern);
        if (match) {
            result.dueDate = handler(match);
            result.name = input.replace(pattern, '').trim();
            break;
        }
    }

    // Extract time
    const timeMatch = lowerInput.match(/(?:lúc|vào)\s*(\d{1,2})(?::(\d{2}))?\s*(sáng|chiều|tối|h|giờ)?/i);
    if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        if (timeMatch[3] === 'chiều' || timeMatch[3] === 'tối') hour += 12;
        result.time = `${hour.toString().padStart(2, '0')}:${timeMatch[2] || '00'}`;
        result.name = result.name.replace(timeMatch[0], '').trim();
    }

    // Extract priority keywords
    if (/gấp|khẩn|urgent|quan trọng/i.test(lowerInput)) {
        result.priority = 'high';
    } else if (/khi rảnh|optional|có thể/i.test(lowerInput)) {
        result.priority = 'low';
    }

    // Extract category
    if (/họp|meeting|gặp/i.test(lowerInput)) result.category = 'Công việc';
    else if (/học|bài|thi|nộp/i.test(lowerInput)) result.category = 'Học tập';
    else if (/mua|ăn|đi|chơi/i.test(lowerInput)) result.category = 'Cá nhân';

    // Clean up name
    result.name = result.name
        .replace(/\s+/g, ' ')
        .replace(/^(cần|phải|nhớ|đừng quên)\s+/i, '')
        .trim();

    return result;
}

function parseWeekday(match) {
    const dayMap = { 'hai': 1, '2': 1, 'ba': 2, '3': 2, 'tư': 3, '4': 3, 'năm': 4, '5': 4, 'sáu': 5, '6': 5, 'bảy': 6, '7': 6 };
    const targetDay = dayMap[match[1].toLowerCase()];
    const today = new Date();
    const currentDay = today.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    today.setDate(today.getDate() + daysToAdd);
    return toLocalISOString(today);
}

function parseRelativeDay(match) {
    const dayMap = { 'hôm nay': 0, 'mai': 1, 'ngày mai': 1, 'mốt': 2 };
    const daysToAdd = dayMap[match[1].toLowerCase()] || 0;
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return toLocalISOString(date);
}

function parseDateFormat(match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
    return toLocalISOString(new Date(year, month, day));
}

// ============================================================
// #20 TASK DEPENDENCIES
// ============================================================
export function checkTaskDependencies(task, allTasks) {
    if (!task.dependsOn || task.dependsOn.length === 0) return { canStart: true, blockers: [] };

    const blockers = [];

    for (const depId of task.dependsOn) {
        const depTask = allTasks.find(t => t.id === depId);
        if (depTask && depTask.status !== 'Hoàn thành') {
            blockers.push(depTask);
        }
    }

    return {
        canStart: blockers.length === 0,
        blockers
    };
}

// ============================================================
// EXPORT INIT FUNCTION
// ============================================================
export function initAdvancedSmartFeatures(userData, user) {
    console.log('✅ Advanced Smart Features initialized');

    // Detect and show calendar conflicts
    const conflicts = detectCalendarConflicts(userData.calendarEvents || []);
    const conflictsContainer = document.getElementById('conflicts-warning-container');
    if (conflictsContainer && conflicts.length > 0) {
        renderConflictsWarning(conflictsContainer, conflicts);
    }

    // Show smart reminders
    const reminders = getSmartReminders(userData);
    console.log('Smart Reminders:', reminders);

    // Detect recurring patterns
    const patterns = detectRecurringPatterns(userData.tasks || []);
    if (patterns.length > 0) {
        console.log('Recurring patterns detected:', patterns);
    }
}
