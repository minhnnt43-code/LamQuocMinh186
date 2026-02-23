// ============================================================
// FILE: js/task-focus-view.js
// Focus Mode - Hiện 1 task ưu tiên nhất + Pomodoro Timer
// ============================================================

import { escapeHTML, showNotification } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;
let timer = null;
let timeLeft = 25 * 60; // 25 phút
let isRunning = false;
let currentTaskIndex = 0;

// --- INIT ---
export function initFocusView(data, user) {
    globalData = data;
    currentUser = user;
}

// --- GET PRIORITIZED TASKS ---
function getPendingTasks() {
    const tasks = globalData?.tasks || [];
    const priOrder = { high: 3, medium: 2, low: 1 };
    return tasks
        .filter(t => t.status !== 'Hoàn thành' && t.status !== 'Đã hủy')
        .sort((a, b) => (priOrder[b.priority] || 2) - (priOrder[a.priority] || 2));
}

// --- RENDER ---
export function renderFocusView() {
    const container = document.getElementById('focus-view');
    if (!container) return;

    const pending = getPendingTasks();
    const task = pending[currentTaskIndex] || null;

    if (!task) {
        container.innerHTML = `
            <div class="focus-wrapper">
                <div class="focus-complete-all">
                    <div class="focus-celebration">🎉</div>
                    <h2>Tất cả đã hoàn thành!</h2>
                    <p>Bạn đã hoàn thành mọi công việc. Nghỉ ngơi đi nào!</p>
                </div>
            </div>
        `;
        return;
    }

    const priColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    const priLabels = { high: '🔴 Ưu tiên cao', medium: '🟡 Trung bình', low: '🟢 Thấp' };
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    const progress = ((25 * 60 - timeLeft) / (25 * 60)) * 100;

    container.innerHTML = `
        <div class="focus-wrapper">
            <!-- Progress bar -->
            <div class="focus-queue">
                <span>📋 Việc ${currentTaskIndex + 1} / ${pending.length}</span>
                <div class="focus-queue-bar">
                    <div class="focus-queue-fill" style="width: ${((currentTaskIndex) / pending.length) * 100}%"></div>
                </div>
            </div>

            <!-- Task Card -->
            <div class="focus-card" style="border-top: 4px solid ${priColors[task.priority] || '#f59e0b'}">
                <div class="focus-priority">${priLabels[task.priority] || priLabels.medium}</div>
                <h1 class="focus-task-name">${escapeHTML(task.name || 'Không tên')}</h1>
                ${task.category ? `<div class="focus-category">${escapeHTML(task.category)}</div>` : ''}
                ${task.notes ? `<div class="focus-notes">${escapeHTML(task.notes)}</div>` : ''}
            </div>

            <!-- Pomodoro Timer -->
            <div class="focus-timer-section">
                <div class="focus-timer-ring">
                    <svg viewBox="0 0 120 120" class="timer-svg">
                        <circle cx="60" cy="60" r="54" class="timer-bg"></circle>
                        <circle cx="60" cy="60" r="54" class="timer-progress"
                            style="stroke-dasharray: ${2 * Math.PI * 54}; stroke-dashoffset: ${2 * Math.PI * 54 * (1 - progress / 100)}">
                        </circle>
                    </svg>
                    <div class="focus-timer-display">${minutes}:${seconds}</div>
                </div>
                <div class="focus-timer-controls">
                    <button class="focus-btn focus-btn-start" id="focus-timer-toggle">
                        ${isRunning ? '⏸️ Tạm dừng' : '▶️ Bắt đầu'}
                    </button>
                    <button class="focus-btn focus-btn-reset" id="focus-timer-reset">🔄 Reset</button>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="focus-actions">
                <button class="focus-btn focus-btn-done" id="focus-complete">✅ Xong!</button>
                <button class="focus-btn focus-btn-skip" id="focus-skip">⏭️ Bỏ qua</button>
            </div>
        </div>
    `;

    setupFocusEvents(container, task, pending);
}

// --- EVENTS ---
function setupFocusEvents(container, task, pending) {
    // Timer toggle
    const toggleBtn = document.getElementById('focus-timer-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (isRunning) {
                clearInterval(timer);
                isRunning = false;
            } else {
                isRunning = true;
                timer = setInterval(() => {
                    timeLeft--;
                    if (timeLeft <= 0) {
                        clearInterval(timer);
                        isRunning = false;
                        timeLeft = 0;
                        showNotification('⏰ Hết giờ Pomodoro! Nghỉ 5 phút nhé!');
                    }
                    renderFocusView();
                }, 1000);
            }
            renderFocusView();
        });
    }

    // Timer reset
    const resetBtn = document.getElementById('focus-timer-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            clearInterval(timer);
            isRunning = false;
            timeLeft = 25 * 60;
            renderFocusView();
        });
    }

    // Complete task
    const completeBtn = document.getElementById('focus-complete');
    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            task.status = 'Hoàn thành';
            task.completedAt = new Date().toISOString();
            task.lastUpdated = new Date().toISOString();

            try {
                await saveUserData(currentUser.uid, { tasks: globalData.tasks });
                showNotification('🎉 Tuyệt vời! Đã hoàn thành!');
                showCelebration();

                // Reset timer
                clearInterval(timer);
                isRunning = false;
                timeLeft = 25 * 60;

                // Di chuyển index (hoặc giữ nguyên vì task đã bị loại khỏi pending)
                const newPending = getPendingTasks();
                if (currentTaskIndex >= newPending.length) currentTaskIndex = 0;

                syncOtherViews();

                setTimeout(() => renderFocusView(), 1500);
            } catch (err) {
                console.error('Focus complete error:', err);
            }
        });
    }

    // Skip task
    const skipBtn = document.getElementById('focus-skip');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            currentTaskIndex++;
            if (currentTaskIndex >= pending.length) currentTaskIndex = 0;
            clearInterval(timer);
            isRunning = false;
            timeLeft = 25 * 60;
            renderFocusView();
        });
    }
}

// --- CELEBRATION ANIMATION ---
function showCelebration() {
    const overlay = document.createElement('div');
    overlay.className = 'focus-celebration-overlay';
    overlay.innerHTML = `
        <div class="celebration-content">
            <div class="celebration-emoji">🎉🎊✨</div>
            <div class="celebration-text">Xuất sắc!</div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 1500);
}

function syncOtherViews() {
    window.dispatchEvent(new CustomEvent('kanban-refresh', { detail: { tasks: globalData.tasks } }));
    if (window.renderDashboard) window.renderDashboard();
    if (window.renderTasks) window.renderTasks();
}
