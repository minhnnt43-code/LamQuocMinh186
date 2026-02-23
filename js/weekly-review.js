// ============================================================
// FILE: js/weekly-review.js
// Chế độ Đánh giá & Lên Kế hoạch Tuần (Weekly Review Routine)
// ============================================================

import { escapeHTML, formatDate, showNotification, toLocalISOString } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;

// ============================================================
// INIT
// ============================================================
export function initWeeklyReview(userData, user) {
    globalData = userData;
    currentUser = user;

    checkAndShowBanner();
    console.log('✅ Weekly Review Module initialized');
}

// ============================================================
// CHECK IF WEEKEND → SHOW BANNER
// ============================================================
function checkAndShowBanner() {
    const today = new Date();
    const day = today.getDay(); // 0=CN, 6=T7
    const banner = document.getElementById('weekly-review-banner');
    if (!banner) return;

    if (day === 0 || day === 6) {
        banner.style.display = 'block';
        banner.innerHTML = `
            <div class="wr-banner-card" id="wr-open-btn">
                <div class="wr-banner-icon">✨</div>
                <div class="wr-banner-text">
                    <h3>Đã đến lúc Weekly Review!</h3>
                    <p>Nhìn lại tuần qua và lên kế hoạch cho tuần mới</p>
                </div>
                <div class="wr-banner-arrow">→</div>
            </div>
        `;
        document.getElementById('wr-open-btn').addEventListener('click', () => openWeeklyReview());
    } else {
        banner.style.display = 'none';
    }
}

// ============================================================
// OPEN WEEKLY REVIEW (FULLSCREEN OVERLAY)
// ============================================================
function openWeeklyReview() {
    document.getElementById('wr-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wr-overlay';
    overlay.className = 'weekly-review-overlay';

    // Gather data
    const weekStats = getWeekStats();
    const overdueTasks = getOverdueTasks();
    const unscheduledTasks = getUnscheduledTasks();

    overlay.innerHTML = `
        <div class="wr-content">
            <button class="wr-close-btn" id="wr-close">&times;</button>
            <div class="wr-steps-indicator">
                <span class="wr-dot active" data-step="1"></span>
                <span class="wr-dot" data-step="2"></span>
                <span class="wr-dot" data-step="3"></span>
            </div>

            <!-- STEP 1: Celebrate -->
            <div class="wr-step active" data-step="1">
                <div class="wr-step1-content">
                    <div class="wr-celebrate-emoji">🎉</div>
                    <h2>Tuần này bạn đã hoàn thành</h2>
                    <div class="wr-big-number">${weekStats.completed}</div>
                    <p class="wr-subtitle">công việc</p>
                    <div class="wr-stats-row">
                        <div class="wr-stat-item">
                            <span class="wr-stat-num">${weekStats.total}</span>
                            <span class="wr-stat-label">Tổng task</span>
                        </div>
                        <div class="wr-stat-item">
                            <span class="wr-stat-num">${weekStats.inProgress}</span>
                            <span class="wr-stat-label">Đang làm</span>
                        </div>
                        <div class="wr-stat-item">
                            <span class="wr-stat-num">${overdueTasks.length}</span>
                            <span class="wr-stat-label">Quá hạn</span>
                        </div>
                    </div>
                    <button class="wr-next-btn" data-next="2">Tiếp theo →</button>
                </div>
            </div>

            <!-- STEP 2: Handle Overdue -->
            <div class="wr-step" data-step="2">
                <h2>📋 Xử lý việc quá hạn</h2>
                <p class="wr-subtitle">Có ${overdueTasks.length} task bị lỡ hạn. Hãy dọn dẹp!</p>
                <div class="wr-overdue-list" id="wr-overdue-list">
                    ${overdueTasks.length > 0 ? overdueTasks.map(task => `
                        <div class="wr-task-card" data-task-id="${task.id}">
                            <div class="wr-task-info">
                                <span class="wr-task-name">${escapeHTML(task.name)}</span>
                                <span class="wr-task-date">Hạn: ${formatDate(task.dueDate)}</span>
                            </div>
                            <div class="wr-task-actions">
                                <button class="wr-btn-reschedule" data-task-id="${task.id}" title="Dời sang tuần này">📅 Dời</button>
                                <button class="wr-btn-cancel" data-task-id="${task.id}" title="Hủy bỏ">🗑️ Hủy</button>
                            </div>
                        </div>
                    `).join('') : '<div class="wr-empty">🎉 Không có task quá hạn! Tuyệt vời!</div>'}
                </div>
                <div class="wr-step-nav">
                    <button class="wr-prev-btn" data-prev="1">← Quay lại</button>
                    <button class="wr-next-btn" data-next="3">Tiếp theo →</button>
                </div>
            </div>

            <!-- STEP 3: Plan Next Week -->
            <div class="wr-step" data-step="3">
                <h2>📅 Lên kế hoạch tuần mới</h2>
                <p class="wr-subtitle">Kéo thả công việc vào từng ngày</p>
                <div class="wr-planner-layout">
                    <div class="wr-week-grid" id="wr-week-grid">
                        ${buildWeekGrid()}
                    </div>
                    <div class="wr-inbox" id="wr-inbox">
                        <h4>📥 Chưa lên lịch (${unscheduledTasks.length})</h4>
                        <div class="wr-inbox-list" id="wr-inbox-list">
                            ${unscheduledTasks.map(task => `
                                <div class="wr-draggable-task" draggable="true" data-task-id="${task.id}">
                                    <span class="wr-drag-handle">⠿</span>
                                    <span>${escapeHTML(task.name)}</span>
                                </div>
                            `).join('') || '<div class="wr-empty">Tất cả đã được lên lịch!</div>'}
                        </div>
                    </div>
                </div>
                <div class="wr-step-nav">
                    <button class="wr-prev-btn" data-prev="2">← Quay lại</button>
                    <button class="wr-done-btn" id="wr-done-btn">✅ Hoàn tất</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Confetti on step 1
    if (window.confetti && weekStats.completed > 0) {
        setTimeout(() => {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }, 300);
    }

    setupOverlayEvents(overlay);
}

// ============================================================
// HELPERS
// ============================================================
function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getWeekStats() {
    const now = new Date();
    const monday = getMonday(now);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const mondayStr = toLocalISOString(monday);
    const sundayStr = toLocalISOString(sunday);

    const weekTasks = (globalData.tasks || []).filter(t => {
        const d = t.dueDate || t.createdAt?.split('T')[0] || '';
        return d >= mondayStr && d <= sundayStr;
    });

    return {
        total: weekTasks.length,
        completed: weekTasks.filter(t => t.status === 'Hoàn thành').length,
        inProgress: weekTasks.filter(t => t.status === 'Đang làm').length
    };
}

function getOverdueTasks() {
    const today = toLocalISOString(new Date());
    return (globalData.tasks || []).filter(t =>
        t.dueDate && t.dueDate < today && t.status !== 'Hoàn thành' && t.status !== 'Đã hủy'
    );
}

function getUnscheduledTasks() {
    return (globalData.tasks || []).filter(t =>
        (!t.dueDate || t.dueDate === '') && t.status !== 'Hoàn thành' && t.status !== 'Đã hủy'
    );
}

function buildWeekGrid() {
    const nextMonday = getMonday(new Date());
    nextMonday.setDate(nextMonday.getDate() + 7);
    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    let html = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(nextMonday);
        date.setDate(date.getDate() + i);
        const dateStr = toLocalISOString(date);
        html += `
            <div class="wr-day-slot" data-date="${dateStr}">
                <div class="wr-day-header">
                    <span class="wr-day-name">${dayNames[i]}</span>
                    <span class="wr-day-date">${date.getDate()}/${date.getMonth() + 1}</span>
                </div>
                <div class="wr-day-tasks" data-date="${dateStr}"></div>
            </div>
        `;
    }
    return html;
}

// ============================================================
// OVERLAY EVENTS
// ============================================================
function setupOverlayEvents(overlay) {
    // Close
    overlay.querySelector('#wr-close').onclick = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    // Navigation
    overlay.querySelectorAll('.wr-next-btn').forEach(btn => {
        btn.onclick = () => goToStep(overlay, parseInt(btn.dataset.next));
    });
    overlay.querySelectorAll('.wr-prev-btn').forEach(btn => {
        btn.onclick = () => goToStep(overlay, parseInt(btn.dataset.prev));
    });

    // Reschedule overdue
    overlay.querySelectorAll('.wr-btn-reschedule').forEach(btn => {
        btn.onclick = async () => {
            const taskId = btn.dataset.taskId;
            const nextMon = getMonday(new Date());
            nextMon.setDate(nextMon.getDate() + 7);
            const task = globalData.tasks.find(t => t.id === taskId);
            if (task) {
                task.dueDate = toLocalISOString(nextMon);
                task.lastUpdated = new Date().toISOString();
                await saveUserData(currentUser.uid, { tasks: globalData.tasks });
                btn.closest('.wr-task-card').style.opacity = '0.4';
                btn.closest('.wr-task-card').style.pointerEvents = 'none';
                showNotification(`📅 Đã dời "${task.name}" sang tuần mới`);
            }
        };
    });

    // Cancel overdue
    overlay.querySelectorAll('.wr-btn-cancel').forEach(btn => {
        btn.onclick = async () => {
            const taskId = btn.dataset.taskId;
            const task = globalData.tasks.find(t => t.id === taskId);
            if (task && confirm(`Hủy bỏ "${task.name}"?`)) {
                task.status = 'Đã hủy';
                task.lastUpdated = new Date().toISOString();
                await saveUserData(currentUser.uid, { tasks: globalData.tasks });
                btn.closest('.wr-task-card').style.opacity = '0.4';
                btn.closest('.wr-task-card').style.pointerEvents = 'none';
                showNotification(`🗑️ Đã hủy "${task.name}"`);
            }
        };
    });

    // Drag & Drop on step 3
    setupDragDrop(overlay);

    // Done button
    overlay.querySelector('#wr-done-btn').onclick = () => {
        overlay.remove();
        showNotification('✅ Weekly Review hoàn tất! Chúc tuần mới hiệu quả! 🚀');
        // Refresh main views
        window.renderTasks?.();
        window.renderDashboard?.();
        window.renderCalendar?.();
        window.dispatchEvent(new CustomEvent('kanban-refresh', { detail: { tasks: globalData.tasks } }));
    };
}

function goToStep(overlay, step) {
    overlay.querySelectorAll('.wr-step').forEach(s => s.classList.remove('active'));
    overlay.querySelectorAll('.wr-dot').forEach(d => d.classList.remove('active'));

    overlay.querySelector(`.wr-step[data-step="${step}"]`)?.classList.add('active');
    overlay.querySelectorAll(`.wr-dot`).forEach(d => {
        if (parseInt(d.dataset.step) <= step) d.classList.add('active');
    });

    // Confetti on step 1
    if (step === 1 && window.confetti) {
        setTimeout(() => confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } }), 200);
    }
}

// ============================================================
// DRAG & DROP
// ============================================================
function setupDragDrop(overlay) {
    const draggables = overlay.querySelectorAll('.wr-draggable-task');
    const daySlots = overlay.querySelectorAll('.wr-day-tasks');

    draggables.forEach(el => {
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', el.dataset.taskId);
            el.classList.add('dragging');
        });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });

    daySlots.forEach(slot => {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
        slot.addEventListener('drop', async (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            const newDate = slot.dataset.date;
            const task = globalData.tasks.find(t => t.id === taskId);
            if (!task) return;

            task.dueDate = newDate;
            task.lastUpdated = new Date().toISOString();

            // Move visual element
            const dragEl = overlay.querySelector(`.wr-draggable-task[data-task-id="${taskId}"]`);
            if (dragEl) {
                slot.appendChild(dragEl);
                dragEl.classList.add('scheduled');
            }

            await saveUserData(currentUser.uid, { tasks: globalData.tasks });
            showNotification(`📅 Đã đặt "${task.name}" vào ${newDate}`);
        });
    });
}
