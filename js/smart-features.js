// ============================================================
// FILE: js/smart-features.js
// 44 Nâng cấp Thông minh cho LifeOS
// ============================================================

import { showNotification, toLocalISOString, formatDate } from './common.js';
import { saveUserData } from './firebase.js';
import { aiPowerHub } from './ai-power-hub.js';

// ============================================================
// #2 SMART GREETING - Lời chào thông minh
// ============================================================
export function getSmartGreeting() {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

    let greeting = '';
    let emoji = '';

    if (hour >= 5 && hour < 12) {
        greeting = 'Chào buổi sáng';
        emoji = '🌅';
    } else if (hour >= 12 && hour < 14) {
        greeting = 'Chào buổi trưa';
        emoji = '☀️';
    } else if (hour >= 14 && hour < 18) {
        greeting = 'Chào buổi chiều';
        emoji = '🌤️';
    } else if (hour >= 18 && hour < 22) {
        greeting = 'Chào buổi tối';
        emoji = '🌙';
    } else {
        greeting = 'Làm việc khuya à';
        emoji = '🦉';
    }

    // Special messages
    if (day === 0) greeting += ', nghỉ ngơi đi nào!';
    else if (day === 1) greeting += ', tuần mới bắt đầu!';
    else if (day === 5) greeting += ', cuối tuần rồi!';

    return { greeting, emoji, dayName: dayNames[day] };
}

// ============================================================
// #5 QUICK ACTIONS BAR - Thanh hành động nhanh
// ============================================================
export function renderQuickActionsBar(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="quick-actions-bar" style="
            display: flex;
            gap: 12px;
            padding: 15px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        ">
            <button class="quick-action-btn" id="qa-add-task" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 10px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            ">
                ➕ Thêm Task
            </button>
            <button class="quick-action-btn" id="qa-add-event" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 10px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                📅 Thêm Sự kiện
            </button>
            <button class="quick-action-btn" id="qa-start-focus" style="
                background: rgba(16, 185, 129, 0.8);
                border: none;
                color: white;
                padding: 10px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                🎯 Bắt đầu Focus
            </button>
            <button class="quick-action-btn" id="qa-ai-summary" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 10px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                🤖 AI Tóm tắt
            </button>
        </div>
    `;

    // Event listeners
    document.getElementById('qa-add-task')?.addEventListener('click', () => {
        document.querySelector('[data-target="tasks"]')?.click();
        setTimeout(() => document.getElementById('task-name')?.focus(), 300);
    });

    document.getElementById('qa-add-event')?.addEventListener('click', () => {
        document.querySelector('[data-target="time-management"]')?.click();
    });

    document.getElementById('qa-start-focus')?.addEventListener('click', () => {
        document.querySelector('[data-target="focus-mode"]')?.click();
        showNotification('🎯 Chế độ tập trung đã bật!', 'success');
    });

    document.getElementById('qa-ai-summary')?.addEventListener('click', async () => {
        showNotification('🤖 Đang tạo tóm tắt...', 'info');
        // Trigger AI summary
        window.dispatchEvent(new CustomEvent('request-ai-summary'));
    });
}

// ============================================================
// #10 SMART DUE DATE - Nhập ngày thông minh
// ============================================================
export function parseSmartDate(input) {
    if (!input) return null;

    const today = new Date();
    const lowerInput = input.toLowerCase().trim();

    // Vietnamese natural language
    const patterns = {
        'hôm nay': 0,
        'mai': 1,
        'ngày mai': 1,
        'mốt': 2,
        'ngày mốt': 2,
        'tuần sau': 7,
        'tuần tới': 7,
        'tháng sau': 30,
        'tháng tới': 30,
    };

    // Check exact matches
    if (patterns[lowerInput] !== undefined) {
        const result = new Date(today);
        result.setDate(result.getDate() + patterns[lowerInput]);
        return toLocalISOString(result);
    }

    // Check "thứ X" patterns
    const dayPatterns = {
        'thứ 2': 1, 'thứ hai': 1, 't2': 1,
        'thứ 3': 2, 'thứ ba': 2, 't3': 2,
        'thứ 4': 3, 'thứ tư': 3, 't4': 3,
        'thứ 5': 4, 'thứ năm': 4, 't5': 4,
        'thứ 6': 5, 'thứ sáu': 5, 't6': 5,
        'thứ 7': 6, 'thứ bảy': 6, 't7': 6,
        'chủ nhật': 0, 'cn': 0,
    };

    for (const [pattern, dayOfWeek] of Object.entries(dayPatterns)) {
        if (lowerInput.includes(pattern)) {
            const result = new Date(today);
            const currentDay = result.getDay();
            let daysToAdd = dayOfWeek - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7; // Next week
            result.setDate(result.getDate() + daysToAdd);
            return toLocalISOString(result);
        }
    }

    // Check "X ngày nữa" pattern
    const daysMatch = lowerInput.match(/(\d+)\s*(ngày|hôm)\s*(nữa|sau)?/);
    if (daysMatch) {
        const result = new Date(today);
        result.setDate(result.getDate() + parseInt(daysMatch[1]));
        return toLocalISOString(result);
    }

    // Check "X tuần nữa" pattern
    const weeksMatch = lowerInput.match(/(\d+)\s*tuần\s*(nữa|sau)?/);
    if (weeksMatch) {
        const result = new Date(today);
        result.setDate(result.getDate() + parseInt(weeksMatch[1]) * 7);
        return toLocalISOString(result);
    }

    return null; // Không parse được
}

// ============================================================
// #31 POMODORO TIMER
// ============================================================
class PomodoroTimer {
    constructor() {
        this.workDuration = 25 * 60; // 25 phút
        this.breakDuration = 5 * 60; // 5 phút
        this.longBreakDuration = 15 * 60; // 15 phút
        this.sessionsBeforeLongBreak = 4;

        this.currentTime = this.workDuration;
        this.isRunning = false;
        this.isWorkSession = true;
        this.completedSessions = 0;
        this.interval = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        this.interval = setInterval(() => {
            this.currentTime--;
            this.updateDisplay();

            if (this.currentTime <= 0) {
                this.completeSession();
            }
        }, 1000);

        this.updateDisplay();
    }

    pause() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.updateDisplay();
    }

    reset() {
        this.pause();
        this.currentTime = this.isWorkSession ? this.workDuration : this.breakDuration;
        this.updateDisplay();
    }

    completeSession() {
        this.pause();

        if (this.isWorkSession) {
            this.completedSessions++;
            showNotification(`🎉 Hoàn thành session ${this.completedSessions}! Nghỉ ngơi nào!`, 'success');

            // Play sound
            this.playNotificationSound();

            // Switch to break
            this.isWorkSession = false;
            this.currentTime = (this.completedSessions % this.sessionsBeforeLongBreak === 0)
                ? this.longBreakDuration
                : this.breakDuration;
        } else {
            showNotification('⏰ Hết giờ nghỉ! Quay lại làm việc nào!', 'info');
            this.isWorkSession = true;
            this.currentTime = this.workDuration;
        }

        this.updateDisplay();
    }

    playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleWxqaW9ubWppYl9bW1xdXV5gY2ZoamxtbW1sa2poZWJfXFpZWVlaW11fYmVoamxub3BwcG9tamdhXVpXVVRUVVZYWl1gY2ZpbG5wcXJycXBuamZiXlpXVFJRUVJTVVdaXWBjZmlsbnBxcnJxcG5qZmJeWlZTUVBQUFFTVVdaXWBjZmlsbnBycnJxcG5qZmJeWlZTUVBQUFFTVQ==');
            audio.volume = 0.5;
            audio.play();
        } catch (e) {
            console.log('Sound not supported');
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        const timerDisplay = document.getElementById('pomodoro-timer-display');
        const statusDisplay = document.getElementById('pomodoro-status');
        const sessionsDisplay = document.getElementById('pomodoro-sessions');
        const startBtn = document.getElementById('pomodoro-start');
        const pauseBtn = document.getElementById('pomodoro-pause');

        if (timerDisplay) timerDisplay.textContent = this.formatTime(this.currentTime);
        if (statusDisplay) statusDisplay.textContent = this.isWorkSession ? '🎯 Tập trung' : '☕ Nghỉ ngơi';
        if (sessionsDisplay) sessionsDisplay.textContent = `${this.completedSessions} sessions`;
        if (startBtn) startBtn.style.display = this.isRunning ? 'none' : 'inline-block';
        if (pauseBtn) pauseBtn.style.display = this.isRunning ? 'inline-block' : 'none';
    }

    render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="pomodoro-widget" style="
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                border-radius: 16px;
                padding: 25px;
                color: white;
                text-align: center;
            ">
                <div id="pomodoro-status" style="font-size: 1rem; margin-bottom: 10px; opacity: 0.9;">🎯 Tập trung</div>
                <div id="pomodoro-timer-display" style="font-size: 4rem; font-weight: 700; font-family: 'Montserrat', sans-serif;">25:00</div>
                <div id="pomodoro-sessions" style="font-size: 0.9rem; margin: 10px 0; opacity: 0.8;">0 sessions</div>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <button id="pomodoro-start" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        padding: 12px 30px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 1rem;
                    ">▶️ Bắt đầu</button>
                    <button id="pomodoro-pause" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        padding: 12px 30px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 1rem;
                        display: none;
                    ">⏸️ Tạm dừng</button>
                    <button id="pomodoro-reset" style="
                        background: rgba(255,255,255,0.1);
                        border: none;
                        color: white;
                        padding: 12px 20px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                    ">🔄</button>
                </div>
            </div>
        `;

        document.getElementById('pomodoro-start')?.addEventListener('click', () => this.start());
        document.getElementById('pomodoro-pause')?.addEventListener('click', () => this.pause());
        document.getElementById('pomodoro-reset')?.addEventListener('click', () => this.reset());

        this.updateDisplay();
    }
}

// ============================================================
// #3 PRODUCTIVITY SCORE
// ============================================================
export function calculateProductivityScore(userData) {
    if (!userData) return { score: 0, breakdown: {} };

    const today = toLocalISOString(new Date());
    // [FIX] Safe filter
    const tasks = (userData.tasks || []).filter(t => t && t.dueDate);
    const calendarEvents = (userData.calendarEvents || []).filter(e => e && e.date);

    // Tasks completed today
    const tasksToday = tasks.filter(t => t.dueDate === today);
    const tasksCompleted = tasksToday.filter(t => t.status === 'Hoàn thành').length;
    const taskScore = tasksToday.length > 0 ? (tasksCompleted / tasksToday.length) * 40 : 20;

    // Events attended
    const eventsToday = calendarEvents.filter(e => e.date === today).length;
    const eventScore = Math.min(eventsToday * 5, 20);

    // Streak (consecutive days with activity)
    const streakScore = Math.min((userData.streak || 0) * 2, 20);

    // Focus time (mock for now)
    const focusScore = 20;

    const totalScore = Math.round(taskScore + eventScore + streakScore + focusScore);

    return {
        score: Math.min(totalScore, 100),
        breakdown: {
            tasks: Math.round(taskScore),
            events: Math.round(eventScore),
            streak: Math.round(streakScore),
            focus: Math.round(focusScore)
        }
    };
}

export function renderProductivityScore(container, userData) {
    if (!container) return;

    const { score, breakdown } = calculateProductivityScore(userData);
    const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

    container.innerHTML = `
        <div class="productivity-widget" style="
            background: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        ">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 1rem; color: #374151;">📊 Điểm năng suất</h3>
                <span style="font-size: 2rem; font-weight: 700; color: ${color};">${score}%</span>
            </div>
            <div style="height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden;">
                <div style="height: 100%; width: ${score}%; background: ${color}; border-radius: 5px; transition: width 0.5s;"></div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px; font-size: 0.8rem; color: #6b7280;">
                <div style="text-align: center;">
                    <div style="font-weight: 600; color: #374151;">${breakdown.tasks}%</div>
                    <div>Tasks</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: 600; color: #374151;">${breakdown.events}%</div>
                    <div>Events</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: 600; color: #374151;">${breakdown.streak}%</div>
                    <div>Streak</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: 600; color: #374151;">${breakdown.focus}%</div>
                    <div>Focus</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// #1 AI MORNING BRIEFING
// ============================================================
export async function generateMorningBriefing(userData) {
    const today = toLocalISOString(new Date());
    // [FIX] Safe filter - chỉ lấy tasks có name và dueDate hợp lệ
    const allTasks = (userData.tasks || []).filter(t => t && t.name && t.dueDate);
    const tasks = allTasks.filter(t => t.dueDate === today && t.status !== 'Hoàn thành');
    const events = (userData.calendarEvents || []).filter(e => e && e.date === today);
    const overdue = allTasks.filter(t => t.dueDate < today && t.status !== 'Hoàn thành');

    const { greeting, emoji } = getSmartGreeting();

    const briefing = {
        greeting: `${emoji} ${greeting}!`,
        summary: `Hôm nay bạn có ${tasks.length} tasks cần làm và ${events.length} sự kiện.`,
        tasks: tasks.slice(0, 5),
        events: events.slice(0, 5),
        overdueCount: overdue.length,
        tips: []
    };

    // Add tips
    if (overdue.length > 0) {
        briefing.tips.push(`⚠️ Có ${overdue.length} task quá hạn cần xử lý!`);
    }
    if (tasks.length === 0) {
        briefing.tips.push('✨ Tuyệt vời! Không có task nào hôm nay. Nghỉ ngơi hoặc xử lý task quá hạn!');
    }
    if (tasks.length > 5) {
        briefing.tips.push('📋 Nhiều việc quá! Hãy ưu tiên 3 task quan trọng nhất.');
    }

    return briefing;
}

export function renderMorningBriefing(container, briefing) {
    if (!container || !briefing) return;

    container.innerHTML = `
        <div class="morning-briefing" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            padding: 25px;
            color: white;
            margin-bottom: 20px;
        ">
            <h2 style="margin: 0 0 10px 0; font-size: 1.5rem;">${briefing.greeting}</h2>
            <p style="margin: 0 0 20px 0; opacity: 0.9;">${briefing.summary}</p>
            
            ${briefing.tasks.length > 0 ? `
                <div style="background: rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 0.9rem;">📌 Tasks hôm nay:</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
                        ${briefing.tasks.map(t => `<li>${t.name}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${briefing.tips.length > 0 ? `
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    ${briefing.tips.map(tip => `<div style="margin-bottom: 5px;">${tip}</div>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================================
// #9 AI AUTO-PRIORITY
// ============================================================
export function autoAssignPriority(taskName, dueDate) {
    const keywords = {
        high: ['gấp', 'khẩn', 'urgent', 'quan trọng', 'deadline', 'nộp', 'thi', 'họp', 'meeting', 'báo cáo'],
        low: ['khi rảnh', 'tham khảo', 'xem', 'đọc', 'optional', 'nếu có thời gian']
    };

    const lowerName = taskName.toLowerCase();

    // Check keywords
    for (const kw of keywords.high) {
        if (lowerName.includes(kw)) return 'high';
    }
    for (const kw of keywords.low) {
        if (lowerName.includes(kw)) return 'low';
    }

    // Check due date
    if (dueDate) {
        const today = new Date();
        const due = new Date(dueDate);
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) return 'high';
        if (diffDays <= 3) return 'medium';
        if (diffDays > 7) return 'low';
    }

    return 'medium';
}

// ============================================================
// #11 TASK BREAKDOWN - Chia nhỏ task
// ============================================================
export async function breakdownTask(taskName) {
    try {
        const prompt = `Chia nhỏ công việc "${taskName}" thành 3-5 bước cụ thể, ngắn gọn.
        
Trả về JSON array với format:
["Bước 1: ...", "Bước 2: ...", "Bước 3: ..."]

Chỉ trả về JSON, không giải thích thêm.`;

        const response = await aiPowerHub.call(prompt, { maxTokens: 500 });

        // Parse JSON from response
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback: split by newlines
        return response.content.split('\n').filter(line => line.trim()).slice(0, 5);
    } catch (error) {
        console.error('Task breakdown error:', error);
        return [
            `Bước 1: Chuẩn bị tài liệu cho "${taskName}"`,
            `Bước 2: Thực hiện ${taskName}`,
            `Bước 3: Kiểm tra và hoàn thiện`
        ];
    }
}

// ============================================================
// EXPORT SINGLETON INSTANCES
// ============================================================
export const pomodoroTimer = new PomodoroTimer();

// ============================================================
// INIT FUNCTION
// ============================================================
export function initSmartFeatures(userData, user) {
    console.log('✅ Smart Features initialized');

    // Render Quick Actions Bar
    const quickActionsContainer = document.getElementById('quick-actions-container');
    if (quickActionsContainer) {
        renderQuickActionsBar(quickActionsContainer);
    }

    // Render Productivity Score
    const productivityContainer = document.getElementById('productivity-score-widget');
    if (productivityContainer) {
        renderProductivityScore(productivityContainer, userData);
    }

    // Render Pomodoro (in focus mode section)
    const pomodoroContainer = document.getElementById('pomodoro-widget-container');
    if (pomodoroContainer) {
        pomodoroTimer.render(pomodoroContainer);
    }

    // Update smart greeting
    const greetingEl = document.querySelector('.briefing-greeting');
    if (greetingEl) {
        const { greeting, emoji } = getSmartGreeting();
        greetingEl.textContent = `${emoji} ${greeting}!`;
    }

    // Setup smart date input
    setupSmartDateInputs();

    // Setup Voice Input
    setupVoiceInput();

    // Setup Task Templates
    setupTaskTemplates();
}

// ============================================================
// SETUP VOICE INPUT
// ============================================================
function setupVoiceInput() {
    const voiceBtn = document.getElementById('voice-input-btn');
    const inputField = document.getElementById('todo-quick-add-input');

    if (!voiceBtn || !inputField) return;

    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        voiceBtn.title = 'Trình duyệt không hỗ trợ giọng nói';
        voiceBtn.style.opacity = '0.5';
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'vi-VN';
    recognition.interimResults = true;
    recognition.continuous = false;

    let isRecording = false;

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        inputField.value = transcript;
    };

    recognition.onend = () => {
        voiceBtn.innerHTML = '🎤';
        voiceBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        isRecording = false;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showNotification('Lỗi nhận diện giọng nói: ' + event.error, 'error');
        isRecording = false;
    };

    voiceBtn.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
            voiceBtn.innerHTML = '🎤';
            voiceBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            isRecording = false;
        } else {
            recognition.start();
            voiceBtn.innerHTML = '⏹️';
            voiceBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            isRecording = true;
            showNotification('🎤 Đang lắng nghe... Nói tên công việc!', 'info');
        }
    });
}

// ============================================================
// SETUP TASK TEMPLATES
// ============================================================
function setupTaskTemplates() {
    const templateBtns = document.querySelectorAll('.template-quick-btn');
    const inputField = document.getElementById('todo-quick-add-input');

    if (!templateBtns.length || !inputField) return;

    const templates = {
        'meeting': 'Họp nhóm: ',
        'homework': 'Nộp bài: ',
        'report': 'Viết báo cáo: ',
        'review': 'Review: '
    };

    templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const templateType = btn.dataset.template;
            const prefix = templates[templateType] || '';
            inputField.value = prefix;
            inputField.focus();

            // Animate button
            btn.style.background = '#667eea';
            btn.style.color = 'white';
            btn.style.borderColor = '#667eea';

            setTimeout(() => {
                btn.style.background = '#f3f4f6';
                btn.style.color = 'inherit';
                btn.style.borderColor = '#e5e7eb';
            }, 500);
        });

        // Hover effects
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
// SETUP SMART DATE INPUTS
// ============================================================
function setupSmartDateInputs() {
    // Find all date inputs and add smart parsing
    const dateInputs = document.querySelectorAll('input[type="date"]');

    dateInputs.forEach(input => {
        // Create a companion text input for natural language
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.placeholder = 'VD: mai, thứ 5, tuần sau...';
        textInput.className = 'smart-date-input';
        textInput.style.cssText = 'width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 5px; font-size: 0.9rem;';

        textInput.addEventListener('input', (e) => {
            const parsed = parseSmartDate(e.target.value);
            if (parsed) {
                input.value = parsed;
                textInput.style.borderColor = '#10b981';
            } else {
                textInput.style.borderColor = '#e2e8f0';
            }
        });

        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const parsed = parseSmartDate(e.target.value);
                if (parsed) {
                    input.value = parsed;
                    showNotification(`📅 Đã chọn: ${formatDate(parsed)}`, 'success');
                }
            }
        });
    });
}
