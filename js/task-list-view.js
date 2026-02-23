// ============================================================
// FILE: js/task-list-view.js
// List View - Hiển thị task dạng bảng (Notion/Airtable style)
// ============================================================

import { escapeHTML, formatDate, showNotification } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;
let currentSort = { column: 'priority', direction: 'desc' };

const PRIORITY_ORDER = { 'high': 3, 'medium': 2, 'low': 1 };
const PRIORITY_LABELS = { 'high': '🔴 Cao', 'medium': '🟡 TB', 'low': '🟢 Thấp' };
const STATUS_OPTIONS = ['Chưa thực hiện', 'Đang làm', 'Hoàn thành', 'Đã hủy'];

// --- INIT ---
export function initListView(data, user) {
    globalData = data;
    currentUser = user;
}

// --- RENDER ---
export function renderListView() {
    const container = document.getElementById('list-view');
    if (!container) return;

    const tasks = globalData?.tasks || [];
    const sorted = sortTasks([...tasks]);

    container.innerHTML = `
        <div class="list-view-wrapper">
            <table class="task-list-table">
                <thead>
                    <tr>
                        <th class="col-check" style="width:44px"></th>
                        <th class="col-name sortable" data-sort="name">
                            Tên công việc ${getSortIcon('name')}
                        </th>
                        <th class="col-status sortable" data-sort="status" style="width:140px">
                            Trạng thái ${getSortIcon('status')}
                        </th>
                        <th class="col-priority sortable" data-sort="priority" style="width:100px">
                            Ưu tiên ${getSortIcon('priority')}
                        </th>
                        <th class="col-category sortable" data-sort="category" style="width:120px">
                            Phân loại ${getSortIcon('category')}
                        </th>
                        <th class="col-due sortable" data-sort="dueDate" style="width:130px">
                            Hạn chót ${getSortIcon('dueDate')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.length === 0
            ? `<tr><td colspan="6" class="list-empty">
                            <div class="list-empty-icon">📝</div>
                            <div>Chưa có công việc nào</div>
                           </td></tr>`
            : sorted.map(t => renderRow(t)).join('')
        }
                </tbody>
            </table>
        </div>
    `;

    // Attach event listeners
    setupSortListeners(container);
    setupCheckboxListeners(container);
    setupStatusDropdowns(container);
    setupRowClick(container);
}

// --- RENDER 1 ROW ---
function renderRow(task) {
    const isDone = task.status === 'Hoàn thành' || task.status === 'Đã hủy';
    const isOverdue = !isDone && task.dueDate && new Date(task.dueDate) < new Date();
    const priorityClass = task.priority || 'medium';

    return `
        <tr class="task-row ${isDone ? 'done' : ''} ${isOverdue ? 'overdue' : ''}" data-id="${task.id}">
            <td class="col-check">
                <label class="list-checkbox">
                    <input type="checkbox" ${isDone ? 'checked' : ''} data-task-id="${task.id}">
                    <span class="checkmark"></span>
                </label>
            </td>
            <td class="col-name">
                <span class="task-name-text">${escapeHTML(task.name || 'Không tên')}</span>
            </td>
            <td class="col-status">
                <select class="inline-status" data-task-id="${task.id}">
                    ${STATUS_OPTIONS.map(s => `<option value="${s}" ${task.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </td>
            <td class="col-priority">
                <span class="priority-dot priority-${priorityClass}"></span>
                ${PRIORITY_LABELS[priorityClass] || '🟡 TB'}
            </td>
            <td class="col-category">
                <span class="category-tag cat-${getCatClass(task.category)}">${escapeHTML(task.category || 'Khác')}</span>
            </td>
            <td class="col-due ${isOverdue ? 'text-overdue' : ''}">
                ${task.dueDate ? formatDueDate(task.dueDate) : '<span class="no-date">—</span>'}
            </td>
        </tr>
    `;
}

// --- SORT ---
function sortTasks(tasks) {
    const { column, direction } = currentSort;
    const dir = direction === 'asc' ? 1 : -1;

    return tasks.sort((a, b) => {
        let valA, valB;
        switch (column) {
            case 'name':
                valA = (a.name || '').toLowerCase();
                valB = (b.name || '').toLowerCase();
                return valA.localeCompare(valB) * dir;
            case 'status':
                valA = STATUS_OPTIONS.indexOf(a.status);
                valB = STATUS_OPTIONS.indexOf(b.status);
                return (valA - valB) * dir;
            case 'priority':
                valA = PRIORITY_ORDER[a.priority] || 2;
                valB = PRIORITY_ORDER[b.priority] || 2;
                return (valA - valB) * dir;
            case 'category':
                valA = (a.category || '').toLowerCase();
                valB = (b.category || '').toLowerCase();
                return valA.localeCompare(valB) * dir;
            case 'dueDate':
                valA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                valB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return (valA - valB) * dir;
            default:
                return 0;
        }
    });
}

function getSortIcon(col) {
    if (currentSort.column !== col) return '<span class="sort-icon">⇅</span>';
    return currentSort.direction === 'asc'
        ? '<span class="sort-icon active">↑</span>'
        : '<span class="sort-icon active">↓</span>';
}

// --- EVENT LISTENERS ---
function setupSortListeners(container) {
    container.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (currentSort.column === col) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort = { column: col, direction: 'asc' };
            }
            renderListView();
        });
    });
}

function setupCheckboxListeners(container) {
    container.querySelectorAll('.list-checkbox input').forEach(cb => {
        cb.addEventListener('change', async (e) => {
            const taskId = e.target.dataset.taskId;
            const task = globalData.tasks.find(t => t.id === taskId);
            if (!task) return;

            task.status = e.target.checked ? 'Hoàn thành' : 'Chưa thực hiện';
            task.lastUpdated = new Date().toISOString();
            if (e.target.checked) task.completedAt = new Date().toISOString();

            try {
                await saveUserData(currentUser.uid, { tasks: globalData.tasks });
                showNotification(e.target.checked ? '✅ Đã hoàn thành!' : '↩️ Đã mở lại');
                renderListView();
                syncOtherViews();
            } catch (err) {
                console.error('List view save error:', err);
            }
        });
    });
}

function setupStatusDropdowns(container) {
    container.querySelectorAll('.inline-status').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            const taskId = e.target.dataset.taskId;
            const task = globalData.tasks.find(t => t.id === taskId);
            if (!task) return;

            task.status = e.target.value;
            task.lastUpdated = new Date().toISOString();
            if (task.status === 'Hoàn thành') task.completedAt = new Date().toISOString();

            try {
                await saveUserData(currentUser.uid, { tasks: globalData.tasks });
                showNotification(`📋 Đổi trạng thái → "${task.status}"`);
                renderListView();
                syncOtherViews();
            } catch (err) {
                console.error('Status change error:', err);
            }
        });
    });
}

function setupRowClick(container) {
    container.querySelectorAll('.task-row .col-name').forEach(td => {
        td.addEventListener('click', () => {
            const row = td.closest('.task-row');
            const taskId = row?.dataset.id;
            if (taskId) {
                // Dispatch event to open task panel for editing
                window.dispatchEvent(new CustomEvent('open-task-panel', { detail: { taskId } }));
            }
        });
    });
}

// --- HELPERS ---
function syncOtherViews() {
    window.dispatchEvent(new CustomEvent('kanban-refresh', { detail: { tasks: globalData.tasks } }));
    if (window.renderDashboard) window.renderDashboard();
    if (window.renderTasks) window.renderTasks();
}

function getCatClass(cat) {
    const map = { 'Học tập': 'study', 'Công việc': 'work', 'Cá nhân': 'personal', 'Gia đình': 'family' };
    return map[cat] || 'other';
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    if (d.getTime() === today.getTime()) return '📍 Hôm nay';
    if (d.getTime() === tomorrow.getTime()) return '🔜 Ngày mai';
    if (d < today) return `⚠️ ${formatDate(dateStr)}`;
    return `📅 ${formatDate(dateStr)}`;
}
