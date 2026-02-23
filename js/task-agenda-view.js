// ============================================================
// FILE: js/task-agenda-view.js
// Agenda View - Nhóm task theo mốc thời gian (Todoist-style)
// ============================================================

import { escapeHTML, formatDate, showNotification } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;

// --- INIT ---
export function initAgendaView(data, user) {
    globalData = data;
    currentUser = user;
}

// --- RENDER ---
export function renderAgendaView() {
    const container = document.getElementById('agenda-view');
    if (!container) return;

    const tasks = globalData?.tasks || [];
    const groups = groupByTimeline(tasks);

    container.innerHTML = `
        <div class="agenda-wrapper">
            ${renderGroup('⚠️ Quá hạn', groups.overdue, 'overdue')}
            ${renderGroup('📍 Hôm nay', groups.today, 'today')}
            ${renderGroup('🔜 Ngày mai', groups.tomorrow, 'tomorrow')}
            ${renderGroup('📅 7 ngày tới', groups.upcoming, 'upcoming')}
            ${renderGroup('📥 Chưa xếp lịch', groups.unscheduled, 'unscheduled')}
            ${renderGroup('✅ Đã hoàn thành', groups.done, 'done')}
        </div>
    `;

    setupAgendaEvents(container);
}

// --- GROUP BY TIMELINE ---
function groupByTimeline(tasks) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const groups = {
        overdue: [],
        today: [],
        tomorrow: [],
        upcoming: [],
        unscheduled: [],
        done: []
    };

    tasks.forEach(task => {
        // Hoàn thành / Hủy → nhóm riêng
        if (task.status === 'Hoàn thành' || task.status === 'Đã hủy') {
            groups.done.push(task);
            return;
        }

        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const scheduledDate = task.scheduledDate ? new Date(task.scheduledDate) : null;
        const refDate = dueDate || scheduledDate;

        if (!refDate) {
            groups.unscheduled.push(task);
        } else {
            const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
            if (d < today) groups.overdue.push(task);
            else if (d.getTime() === today.getTime()) groups.today.push(task);
            else if (d.getTime() === tomorrow.getTime()) groups.tomorrow.push(task);
            else if (d < nextWeek) groups.upcoming.push(task);
            else groups.upcoming.push(task); // Xa hơn 7 ngày cũng lên upcoming
        }
    });

    // Sort mỗi nhóm theo priority
    const priOrder = { high: 3, medium: 2, low: 1 };
    Object.values(groups).forEach(arr => {
        arr.sort((a, b) => (priOrder[b.priority] || 2) - (priOrder[a.priority] || 2));
    });

    return groups;
}

// --- RENDER 1 GROUP ---
function renderGroup(title, tasks, type) {
    if (tasks.length === 0 && type !== 'today') return ''; // Luôn hiện "Hôm nay" dù rỗng

    return `
        <div class="agenda-group agenda-${type}">
            <div class="agenda-group-header">
                <h3 class="agenda-group-title">${title}</h3>
                <span class="agenda-group-count">${tasks.length}</span>
            </div>
            <div class="agenda-group-items">
                ${tasks.length === 0
            ? `<div class="agenda-empty">
                        <span>🎉 Không có việc gì — Tuyệt vời!</span>
                       </div>`
            : tasks.map(t => renderAgendaItem(t, type)).join('')
        }
            </div>
        </div>
    `;
}

// --- RENDER 1 ITEM ---
function renderAgendaItem(task, groupType) {
    const isDone = groupType === 'done';
    const priClass = task.priority || 'medium';
    const priLabels = { high: '🔴', medium: '🟡', low: '🟢' };

    return `
        <div class="agenda-item ${isDone ? 'done' : ''}" data-id="${task.id}">
            <div class="agenda-item-check">
                <label class="agenda-checkbox">
                    <input type="checkbox" ${isDone ? 'checked' : ''} data-task-id="${task.id}">
                    <span class="agenda-checkmark priority-${priClass}"></span>
                </label>
            </div>
            <div class="agenda-item-content">
                <div class="agenda-item-title">${escapeHTML(task.name || 'Không tên')}</div>
                <div class="agenda-item-meta">
                    ${task.category ? `<span class="agenda-cat">${escapeHTML(task.category)}</span>` : ''}
                    ${task.dueDate ? `<span class="agenda-date">${priLabels[priClass]} ${formatDate(task.dueDate)}</span>` : ''}
                    ${task.scheduledTime ? `<span class="agenda-time">⏰ ${task.scheduledTime}</span>` : ''}
                </div>
            </div>
            <div class="agenda-item-actions">
                <span class="agenda-status-badge status-${task.status === 'Đang làm' ? 'progress' : 'todo'}">
                    ${task.status || 'Chưa thực hiện'}
                </span>
            </div>
        </div>
    `;
}

// --- EVENTS ---
function setupAgendaEvents(container) {
    // Checkbox toggle
    container.querySelectorAll('.agenda-checkbox input').forEach(cb => {
        cb.addEventListener('change', async (e) => {
            const taskId = e.target.dataset.taskId;
            const task = globalData.tasks.find(t => t.id === taskId);
            if (!task) return;

            task.status = e.target.checked ? 'Hoàn thành' : 'Chưa thực hiện';
            task.lastUpdated = new Date().toISOString();
            if (e.target.checked) task.completedAt = new Date().toISOString();

            try {
                await saveUserData(currentUser.uid, { tasks: globalData.tasks });
                showNotification(e.target.checked ? '✅ Hoàn thành!' : '↩️ Đã mở lại');
                renderAgendaView();
                syncOtherViews();
            } catch (err) {
                console.error('Agenda save error:', err);
            }
        });
    });

    // Click item → open edit panel
    container.querySelectorAll('.agenda-item-content').forEach(el => {
        el.addEventListener('click', () => {
            const item = el.closest('.agenda-item');
            const taskId = item?.dataset.id;
            if (taskId) {
                window.dispatchEvent(new CustomEvent('open-task-panel', { detail: { taskId } }));
            }
        });
    });
}

function syncOtherViews() {
    window.dispatchEvent(new CustomEvent('kanban-refresh', { detail: { tasks: globalData.tasks } }));
    if (window.renderDashboard) window.renderDashboard();
    if (window.renderTasks) window.renderTasks();
}
