// === ENHANCED TASK KANBAN MODULE (v2 - 9 Upgrades) ===
// Renders tasks in a 4-column Kanban board with drag-and-drop, batch actions,
// deadline countdown, progress %, My Day, dependencies, activity log,
// color coding, and advanced filters.

import { escapeHTML, formatDate, openModal, closeModal, showNotification } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;
let currentFilter = 'all';
let dateFilter = '';
let batchMode = false;
let selectedTaskIds = new Set();

// Advanced filter state
let advancedFilters = { priority: '', category: '', folder: '', tag: '', dateFrom: '', dateTo: '', myDay: false };

// Default category colors
const DEFAULT_CATEGORY_COLORS = {
    'Học tập': '#8b5cf6', 'Công việc': '#3b82f6', 'Cá nhân': '#22c55e',
    'Khác': '#94a3b8', 'Chung': '#94a3b8'
};

// Status mapping (added 'waiting')
const STATUS_MAP = {
    'Chưa thực hiện': 'todo',
    'Đang làm': 'in-progress',
    'Đang chờ': 'waiting',
    'Hoàn thành': 'done',
    'Đã hủy': 'done'
};

const REVERSE_STATUS_MAP = {
    'todo': 'Chưa thực hiện',
    'in-progress': 'Đang làm',
    'waiting': 'Đang chờ',
    'done': 'Hoàn thành'
};

export const initTaskKanban = (data, user) => {
    globalData = data;
    currentUser = user;
    if (!globalData.tasks) globalData.tasks = [];
    if (!globalData.categoryColors) globalData.categoryColors = { ...DEFAULT_CATEGORY_COLORS };

    setupFilterPills();
    setupAddButtons();
    setupModalEvents();
    setupDateFilter();
    setupCollapseToggles();
    setupImportModal();
    setupDeleteAllTasks();
    setupScheduledDateSync();
    setupBatchMode();
    setupAdvancedFilterPanel();
    renderKanbanBoard();
    setupDragAndDrop();

    // Listen for refresh events from work.js
    window.addEventListener('kanban-refresh', (e) => {
        if (e.detail && e.detail.tasks) {
            globalData.tasks = e.detail.tasks;
        }
        renderKanbanBoard();
    });
};

const setupFilterPills = () => {
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderKanbanBoard();
        });
    });
};

const setupDateFilter = () => {
    const dateInput = document.getElementById('task-date-filter');
    if (dateInput) {
        dateInput.addEventListener('change', (e) => {
            dateFilter = e.target.value;
            renderKanbanBoard();
        });
    }
};

const setupCollapseToggles = () => {
    document.querySelectorAll('.column-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const column = e.target.closest('.task-kanban-column');
            if (column) {
                column.classList.toggle('collapsed');
                e.target.textContent = column.classList.contains('collapsed') ? '▶' : '▼';
            }
        });
    });
};

const setupAddButtons = () => {
    // Main add button in header
    const mainBtn = document.getElementById('btn-add-task-main');
    if (mainBtn) {
        mainBtn.addEventListener('click', () => openTaskPanel());
    }

    // FAB button
    const fab = document.getElementById('btn-add-task-fab');
    if (fab) {
        fab.addEventListener('click', () => openTaskPanel());
    }
};

const setupModalEvents = () => {
    // Panel Close Button
    const closeBtn = document.getElementById('close-task-panel');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (window.PanelManager) window.PanelManager.close('task-form-panel');
        });
    }

    // Note: Backdrop click is handled by PanelManager
};

const openTaskPanel = (task = null) => {
    if (task) {
        // Dispatch event to let work.js handle full form population
        window.dispatchEvent(new CustomEvent('request-edit-task', { detail: { task } }));
    } else {
        // New task: just open the panel and reset
        window.dispatchEvent(new CustomEvent('request-new-task'));
        if (window.PanelManager) {
            window.PanelManager.open('task-form-panel');
            const nameInput = document.getElementById('task-name');
            if (nameInput) setTimeout(() => nameInput.focus(), 100);
        }
    }
};

const getFilteredTasks = () => {
    let tasks = [...(globalData.tasks || [])];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    if (dateFilter) tasks = tasks.filter(t => t.dueDate === dateFilter);

    switch (currentFilter) {
        case 'today': tasks = tasks.filter(t => t.dueDate === todayStr); break;
        case 'important': tasks = tasks.filter(t => t.priority === 'high'); break;
        case 'incomplete': tasks = tasks.filter(t => t.status !== 'Hoàn thành'); break;
        case 'myday': tasks = tasks.filter(t => t.myDay); break;
    }

    // Advanced filters
    const af = advancedFilters;
    if (af.priority) tasks = tasks.filter(t => t.priority === af.priority);
    if (af.category) tasks = tasks.filter(t => t.category === af.category);
    if (af.folder) tasks = tasks.filter(t => t.folderId === af.folder);
    if (af.tag) tasks = tasks.filter(t => (t.tags || []).includes(af.tag));
    if (af.dateFrom) tasks = tasks.filter(t => t.dueDate && t.dueDate >= af.dateFrom);
    if (af.dateTo) tasks = tasks.filter(t => t.dueDate && t.dueDate <= af.dateTo);
    if (af.myDay) tasks = tasks.filter(t => t.myDay);

    return tasks;
};

const calculateProgress = (task) => {
    if (typeof task.progress === 'number') return task.progress;
    if (task.subtasks && task.subtasks.length > 0) {
        const done = task.subtasks.filter(s => s.completed).length;
        return Math.round((done / task.subtasks.length) * 100);
    }
    switch (task.status) {
        case 'Hoàn thành': return 100;
        case 'Đang làm': return 50;
        default: return 0;
    }
};

const getCategoryColor = (category) => {
    const colors = globalData.categoryColors || DEFAULT_CATEGORY_COLORS;
    return colors[category] || '#94a3b8';
};

const getCategoryClass = (category) => {
    if (!category) return 'khac';
    const cat = category.toLowerCase();
    if (cat.includes('học') || cat.includes('tập')) return 'hoc-tap';
    if (cat.includes('công') || cat.includes('việc')) return 'cong-viec';
    if (cat.includes('cá') || cat.includes('nhân')) return 'ca-nhan';
    return 'khac';
};

// Deadline countdown helper
const getDeadlineBadge = (task) => {
    if (task.status === 'Hoàn thành') return '<span class="deadline-badge done-badge">✅ Xong</span>';
    if (!task.dueDate) return '';
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `<span class="deadline-badge overdue">⚠️ Trễ ${Math.abs(diff)} ngày</span>`;
    if (diff === 0) return '<span class="deadline-badge urgent">🔥 Hôm nay</span>';
    if (diff === 1) return '<span class="deadline-badge urgent">⏳ Ngày mai</span>';
    if (diff <= 3) return `<span class="deadline-badge soon">⏱️ Còn ${diff} ngày</span>`;
    return `<span class="deadline-badge safe">📅 Còn ${diff} ngày</span>`;
};

const createTaskCard = (task) => {
    const progress = calculateProgress(task);
    const categoryClass = getCategoryClass(task.category);
    const catColor = getCategoryColor(task.category);
    const priorityClass = `priority-${task.priority || 'medium'}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < today && task.status !== 'Hoàn thành';

    // Check dependency
    let depHTML = '';
    if (task.dependsOn) {
        const depTask = (globalData.tasks || []).find(t => t.id === task.dependsOn);
        if (depTask && depTask.status !== 'Hoàn thành') {
            depHTML = `<div class="dependency-badge blocked">🔒 Chờ: ${escapeHTML(depTask.name || '')}</div>`;
        } else if (depTask) {
            depHTML = `<div class="dependency-badge">✅ ${escapeHTML(depTask.name || '')}</div>`;
        }
    }

    const card = document.createElement('div');
    card.className = `task-card-minimal ${priorityClass}${isOverdue ? ' overdue-card' : ''}`;
    card.draggable = !batchMode;
    card.dataset.taskId = task.id;

    card.innerHTML = `
        <div class="task-card-header">
            <div class="task-card-title">${escapeHTML(task.name || '[Không có tên]')}</div>
            <button class="my-day-btn ${task.myDay ? 'active' : ''}" data-myday-id="${task.id}" title="My Day">
                ${task.myDay ? '☀️' : '☆'}
            </button>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0">
            <span class="category-chip ${categoryClass}" style="border-left:3px solid ${catColor}">${escapeHTML(task.category || 'Khác')}</span>
            ${getDeadlineBadge(task)}
        </div>
        ${depHTML}
        <div class="task-progress-section">
            <input type="range" class="task-progress-slider" min="0" max="100" step="5" value="${progress}" data-progress-id="${task.id}">
            <span class="task-progress-percent">${progress}%</span>
        </div>
        <div class="task-progress-bar-gradient"><div class="fill" style="width:${progress}%"></div></div>
        ${task.blockedReason ? `<div class="blocked-reason">🚫 ${escapeHTML(task.blockedReason)}</div>` : ''}
    `;

    // My Day toggle
    card.querySelector('.my-day-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        task.myDay = !task.myDay;
        addActivityLog(task, task.myDay ? 'Thêm vào My Day' : 'Bỏ khỏi My Day');
        try { await saveUserData(currentUser.uid, { tasks: globalData.tasks }); } catch (err) { console.error(err); }
        renderKanbanBoard();
        showNotification(task.myDay ? '☀️ Đã thêm vào My Day' : '❌ Đã bỏ khỏi My Day');
    });

    // Progress slider
    card.querySelector('.task-progress-slider').addEventListener('input', (e) => {
        e.stopPropagation();
        const val = parseInt(e.target.value);
        card.querySelector('.task-progress-percent').textContent = val + '%';
        card.querySelector('.task-progress-bar-gradient .fill').style.width = val + '%';
    });
    card.querySelector('.task-progress-slider').addEventListener('change', async (e) => {
        e.stopPropagation();
        const val = parseInt(e.target.value);
        const oldProgress = task.progress || 0;
        task.progress = val;
        task.lastUpdated = new Date().toISOString();
        addActivityLog(task, `Tiến độ: ${oldProgress}% → ${val}%`);
        if (val === 100 && task.status !== 'Hoàn thành') {
            task.status = 'Hoàn thành';
            task.completedAt = new Date().toISOString();
            addActivityLog(task, 'Tự động hoàn thành (100%)');
            showNotification('🎉 Hoàn thành xuất sắc!');
        }
        try { await saveUserData(currentUser.uid, { tasks: globalData.tasks }); } catch (err) { console.error(err); }
        renderKanbanBoard();
    });

    // Card click (open panel unless batch mode)
    card.addEventListener('click', (e) => {
        if (e.target.closest('.my-day-btn') || e.target.closest('.task-progress-slider')) return;
        if (batchMode) {
            e.preventDefault();
            if (selectedTaskIds.has(task.id)) { selectedTaskIds.delete(task.id); card.classList.remove('batch-selected'); }
            else { selectedTaskIds.add(task.id); card.classList.add('batch-selected'); }
            updateBatchToolbar();
            return;
        }
        openTaskPanel(task);
    });

    return card;
};

const updateStatistics = (todoCount, inProgressCount, doneCount, waitingCount = 0) => {
    const total = todoCount + inProgressCount + doneCount + waitingCount;

    const statTotal = document.getElementById('stat-total');
    const statPending = document.getElementById('stat-pending');
    const statProgress = document.getElementById('stat-progress');
    const statDone = document.getElementById('stat-done');

    if (statTotal) statTotal.textContent = total;
    if (statPending) statPending.textContent = todoCount + waitingCount;
    if (statProgress) statProgress.textContent = inProgressCount;
    if (statDone) statDone.textContent = doneCount;

    drawDonutChart(todoCount + waitingCount, inProgressCount, doneCount);
};

const drawDonutChart = (todo, progress, done) => {
    const canvas = document.getElementById('task-donut-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const total = todo + progress + done;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.6;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (total === 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 20;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('0%', centerX, centerY);
        return;
    }

    const data = [
        { value: todo, color: '#f59e0b' },
        { value: progress, color: '#3b82f6' },
        { value: done, color: '#22c55e' }
    ];

    let startAngle = -Math.PI / 2;

    data.forEach(segment => {
        if (segment.value === 0) return;

        const sliceAngle = (segment.value / total) * 2 * Math.PI;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = segment.color;
        ctx.fill();

        startAngle += sliceAngle;
    });

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${completionRate}%`, centerX, centerY);
};

const renderKanbanBoard = () => {
    const todoContainer = document.getElementById('cards-todo');
    const inProgressContainer = document.getElementById('cards-in-progress');
    const waitingContainer = document.getElementById('cards-waiting');
    const doneContainer = document.getElementById('cards-done');

    if (!todoContainer || !inProgressContainer || !doneContainer) return;

    todoContainer.innerHTML = '';
    inProgressContainer.innerHTML = '';
    if (waitingContainer) waitingContainer.innerHTML = '';
    doneContainer.innerHTML = '';

    const tasks = getFilteredTasks();
    // Sort overdue tasks first within each column
    const now = new Date(); now.setHours(0, 0, 0, 0);
    tasks.sort((a, b) => {
        const aOver = a.dueDate && new Date(a.dueDate) < now && a.status !== 'Hoàn thành' ? 0 : 1;
        const bOver = b.dueDate && new Date(b.dueDate) < now && b.status !== 'Hoàn thành' ? 0 : 1;
        return aOver - bOver;
    });

    let todoCount = 0, inProgressCount = 0, waitingCount = 0, doneCount = 0;

    tasks.forEach(task => {
        const card = createTaskCard(task);
        const statusKey = STATUS_MAP[task.status] || 'todo';
        switch (statusKey) {
            case 'todo': todoContainer.appendChild(card); todoCount++; break;
            case 'in-progress': inProgressContainer.appendChild(card); inProgressCount++; break;
            case 'waiting': if (waitingContainer) { waitingContainer.appendChild(card); waitingCount++; } else { todoContainer.appendChild(card); todoCount++; } break;
            case 'done': doneContainer.appendChild(card); doneCount++; break;
        }
    });

    const countTodo = document.getElementById('count-todo');
    const countInProgress = document.getElementById('count-in-progress');
    const countWaiting = document.getElementById('count-waiting');
    const countDone = document.getElementById('count-done');
    if (countTodo) countTodo.textContent = todoCount;
    if (countInProgress) countInProgress.textContent = inProgressCount;
    if (countWaiting) countWaiting.textContent = waitingCount;
    if (countDone) countDone.textContent = doneCount;

    updateStatistics(todoCount, inProgressCount, doneCount, waitingCount);

    const emptyStates = [
        [todoContainer, todoCount, '📋', 'Chưa có task nào'],
        [inProgressContainer, inProgressCount, '🔄', 'Kéo task vào đây'],
        [doneContainer, doneCount, '✅', 'Hoàn thành task đi!'],
    ];
    if (waitingContainer) emptyStates.push([waitingContainer, waitingCount, '⏳', 'Chưa có task chờ']);
    emptyStates.forEach(([el, count, emoji, text]) => {
        if (count === 0) el.innerHTML = `<div class="column-empty-state"><span class="emoji">${emoji}</span>${text}</div>`;
    });

    // Render active filters bar
    renderActiveFiltersBar();
};

const setupDragAndDrop = () => {
    const columns = document.querySelectorAll('.column-cards');

    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = column.parentElement.dataset.status;
            const newStatusText = REVERSE_STATUS_MAP[newStatus];

            if (taskId && newStatusText) {
                window.dispatchEvent(new CustomEvent('kanban-task-moved', {
                    detail: { taskId, newStatus: newStatusText }
                }));
            }
        });
    });

    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-card-minimal')) {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-card-minimal')) {
            e.target.classList.remove('dragging');
        }
    });
};

// Show/hide calendar sync notice when scheduled date is set
const setupScheduledDateSync = () => {
    const scheduledDateInput = document.getElementById('task-scheduled-date');
    const syncNotice = document.getElementById('calendar-sync-notice');

    if (scheduledDateInput && syncNotice) {
        scheduledDateInput.addEventListener('change', () => {
            syncNotice.style.display = scheduledDateInput.value ? 'block' : 'none';
        });
    }
};

// ============================================
// DELETE ALL TASKS - dispatches to work.js
// ============================================
const setupDeleteAllTasks = () => {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#btn-delete-all-tasks');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('request-delete-all-tasks'));
    });
};

// [PHASE 6] Inline editable table for bulk task entry
const EXCEL_STORAGE_KEY = 'lqm_excel_draft';
let _excelSaveTimer = null;

const setupImportModal = () => {
    const openImportBtn = document.getElementById('btn-open-import-modal');
    const importModal = document.getElementById('import-tasks-modal');
    const closeImportBtn = document.getElementById('close-import-modal');

    // Open modal → render table with saved data
    if (openImportBtn && importModal) {
        openImportBtn.addEventListener('click', () => {
            importModal.style.display = 'flex';
            renderExcelInlineTable();
        });
    }

    // Close modal (data persists in localStorage)
    if (closeImportBtn && importModal) {
        closeImportBtn.addEventListener('click', () => {
            importModal.style.display = 'none';
        });
        importModal.addEventListener('click', (e) => {
            if (e.target === importModal) importModal.style.display = 'none';
        });
    }

    // Add rows button
    const addRowsBtn = document.getElementById('btn-excel-add-rows');
    if (addRowsBtn) {
        addRowsBtn.addEventListener('click', () => {
            addExcelRows(5);
            saveExcelDraft();
        });
    }

    // Clear all button
    const clearBtn = document.getElementById('btn-excel-clear-all');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (!confirm('Xóa toàn bộ bảng nhập? Dữ liệu nháp sẽ bị mất!')) return;
            localStorage.removeItem(EXCEL_STORAGE_KEY);
            renderExcelInlineTable();
            showNotification('🗑️ Đã xóa bảng nhập', 'info');
        });
    }

    // Import all button
    const importAllBtn = document.getElementById('btn-excel-import-all');
    if (importAllBtn) {
        importAllBtn.addEventListener('click', () => {
            const rows = collectExcelRows();
            const filledRows = rows.filter(r => r.name.trim());

            if (filledRows.length === 0) {
                showNotification('Chưa có dòng nào có tên công việc!', 'warning');
                return;
            }

            const tasks = filledRows.map((r, i) => ({
                id: 'bulk_' + Date.now() + '_' + i,
                name: r.name.trim(),
                dueDate: r.dueDate || '',
                scheduledTime: r.time || '08:00',
                priority: r.priority || 'medium',
                category: r.category || 'Khác',
                notes: r.notes || '',
                status: 'Chưa thực hiện',
                syncCalendar: true
            }));

            // Dispatch to work.js import handler
            window.dispatchEvent(new CustomEvent('import-tasks', {
                detail: { tasks }
            }));

            // Clear table after successful import
            localStorage.removeItem(EXCEL_STORAGE_KEY);
            renderExcelInlineTable();

            const modal = document.getElementById('import-tasks-modal');
            if (modal) modal.style.display = 'none';

            showNotification(`✅ Đã nhập ${tasks.length} công việc!`, 'success');
        });
    }
};

// Render editable table rows
const renderExcelInlineTable = () => {
    const tbody = document.getElementById('excel-inline-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Load saved draft from localStorage
    let savedRows = [];
    try {
        const raw = localStorage.getItem(EXCEL_STORAGE_KEY);
        if (raw) savedRows = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    // Ensure at least 5 rows
    const rowCount = Math.max(savedRows.length, 5);
    for (let i = 0; i < rowCount; i++) {
        const data = savedRows[i] || {};
        appendExcelRow(tbody, i + 1, data);
    }

    updateExcelRowCount();
};

// Append a single row to the table
const appendExcelRow = (tbody, num, data = {}) => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'transition: background 0.15s;';
    tr.addEventListener('mouseenter', () => tr.style.background = '#f0f9ff');
    tr.addEventListener('mouseleave', () => tr.style.background = '');

    const cellStyle = 'padding: 6px 8px; border-bottom: 1px solid #f1f5f9;';
    const inputStyle = 'width: 100%; border: 1px solid transparent; padding: 6px 8px; border-radius: 6px; font-family: inherit; font-size: 0.9rem; background: transparent; transition: all 0.2s; box-sizing: border-box;';
    const inputFocusCSS = `onfocus="this.style.border='1px solid #3b82f6';this.style.background='white'" onblur="this.style.border='1px solid transparent';this.style.background='transparent'"`;

    tr.innerHTML = `
        <td style="${cellStyle} text-align: center; color: #94a3b8; font-size: 0.85rem;">${num}</td>
        <td style="${cellStyle}">
            <input type="text" class="excel-cell" data-col="name" value="${escapeHTML(data.name || '')}" placeholder="Tên công việc..." style="${inputStyle}" ${inputFocusCSS}>
        </td>
        <td style="${cellStyle}">
            <input type="date" class="excel-cell" data-col="dueDate" value="${data.dueDate || ''}" style="${inputStyle}">
        </td>
        <td style="${cellStyle}">
            <input type="time" class="excel-cell" data-col="time" value="${data.time || ''}" style="${inputStyle}" placeholder="08:00">
        </td>
        <td style="${cellStyle}">
            <select class="excel-cell" data-col="priority" style="${inputStyle} cursor: pointer;">
                <option value="low" ${data.priority === 'low' ? 'selected' : ''}>🟢 Thấp</option>
                <option value="medium" ${data.priority !== 'low' && data.priority !== 'high' ? 'selected' : ''}>🟡 TB</option>
                <option value="high" ${data.priority === 'high' ? 'selected' : ''}>🔴 Cao</option>
            </select>
        </td>
        <td style="${cellStyle}">
            <select class="excel-cell" data-col="category" style="${inputStyle} cursor: pointer;">
                <option value="Học tập" ${data.category === 'Học tập' ? 'selected' : ''}>📚 Học tập</option>
                <option value="Công việc" ${(data.category === 'Công việc' || !data.category) ? 'selected' : ''}>💼 Công việc</option>
                <option value="Cá nhân" ${data.category === 'Cá nhân' ? 'selected' : ''}>🏠 Cá nhân</option>
                <option value="Gia đình" ${data.category === 'Gia đình' ? 'selected' : ''}>👨‍👩‍👧 Gia đình</option>
                <option value="Khác" ${data.category === 'Khác' ? 'selected' : ''}>📌 Khác</option>
            </select>
        </td>
        <td style="${cellStyle}">
            <input type="text" class="excel-cell" data-col="notes" value="${escapeHTML(data.notes || '')}" placeholder="Ghi chú..." style="${inputStyle}" ${inputFocusCSS}>
        </td>
        <td style="${cellStyle} text-align: center;">
            <button class="excel-row-delete" style="background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.4; transition: opacity 0.2s;" title="Xóa dòng">✕</button>
        </td>
    `;

    // Auto-save on any change
    tr.querySelectorAll('.excel-cell').forEach(cell => {
        cell.addEventListener('input', () => debouncedSaveExcelDraft());
        cell.addEventListener('change', () => debouncedSaveExcelDraft());
    });

    // Delete row
    tr.querySelector('.excel-row-delete').addEventListener('click', () => {
        tr.remove();
        renumberExcelRows();
        saveExcelDraft();
    });

    tbody.appendChild(tr);
};

// Add more rows
const addExcelRows = (count) => {
    const tbody = document.getElementById('excel-inline-tbody');
    if (!tbody) return;
    const currentCount = tbody.children.length;
    for (let i = 0; i < count; i++) {
        appendExcelRow(tbody, currentCount + i + 1);
    }
    updateExcelRowCount();
};

// Re-number rows after deletion
const renumberExcelRows = () => {
    const tbody = document.getElementById('excel-inline-tbody');
    if (!tbody) return;
    Array.from(tbody.children).forEach((tr, i) => {
        tr.firstElementChild.textContent = i + 1;
    });
    updateExcelRowCount();
};

// Collect all row data from the table
const collectExcelRows = () => {
    const tbody = document.getElementById('excel-inline-tbody');
    if (!tbody) return [];
    return Array.from(tbody.children).map(tr => {
        const data = {};
        tr.querySelectorAll('.excel-cell').forEach(cell => {
            data[cell.dataset.col] = cell.value;
        });
        return data;
    });
};

// Save draft to localStorage
const saveExcelDraft = () => {
    const rows = collectExcelRows();
    try {
        localStorage.setItem(EXCEL_STORAGE_KEY, JSON.stringify(rows));
    } catch (e) { /* storage full, ignore */ }

    // Update UI
    updateExcelRowCount();
    const status = document.getElementById('excel-autosave-status');
    if (status) {
        status.textContent = '💾 Đã lưu nháp';
        status.style.opacity = '1';
        setTimeout(() => { status.style.opacity = '0.8'; }, 1000);
    }
};

// Debounced save (500ms)
const debouncedSaveExcelDraft = () => {
    clearTimeout(_excelSaveTimer);
    _excelSaveTimer = setTimeout(saveExcelDraft, 500);
};

// Update row count display
const updateExcelRowCount = () => {
    const el = document.getElementById('excel-row-count');
    if (!el) return;
    const rows = collectExcelRows();
    const filled = rows.filter(r => r.name && r.name.trim()).length;
    el.textContent = `${filled} dòng có dữ liệu`;
};

// Generate Excel template using SheetJS
const generateExcelTemplate = () => {
    if (typeof XLSX === 'undefined') {
        showNotification('Thư viện Excel chưa tải xong, vui lòng thử lại!', 'warning');
        return;
    }

    // Template data - matching form fields EXACTLY (date format: DD/MM/YYYY)
    // Order: Tên → Ưu tiên → Phân loại → Ngày làm → Giờ bắt đầu → Hạn chót (ngày) → Hạn chót (giờ) → Đồng bộ Lịch → Thời lượng → Nhắc nhở → Lặp lại → Tiến độ → Link → Tags → Ghi chú
    const templateData = [
        ['Tên công việc', 'Ưu tiên', 'Phân loại', 'Ngày làm (sync lịch)', 'Giờ bắt đầu', 'Hạn chót (ngày)', 'Hạn chót (giờ)', 'Đồng bộ Lịch', 'Thời lượng (phút)', 'Nhắc nhở (phút)', 'Lặp lại', 'Tiến độ', 'Trạng thái Link', 'Tags', 'Ghi chú'],
        ['Làm bài tập GDQP', 'high', 'Học tập', '05/02/2026', '08:00', '05/02/2026', '12:00', 'X', 60, 15, 'Không', 'Chưa thực hiện', '', 'quan trọng', 'Nộp trước 12h trưa'],
        ['Họp nhóm công ty', 'medium', 'Công việc', '03/02/2026', '14:00', '03/02/2026', '16:00', 'X', 120, 30, 'Hàng tuần', 'Chưa thực hiện', 'https://meet.google.com/abc', '', 'Phòng họp Online'],
        ['Đi khám sức khỏe', 'low', 'Cá nhân', '10/02/2026', '09:00', '10/02/2026', '11:00', 'X', 90, 0, 'Không', 'Chưa thực hiện', '', '', 'Bệnh viện ĐH Y']
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
        { wch: 25 }, // Tên công việc
        { wch: 10 }, // Ưu tiên
        { wch: 12 }, // Phân loại
        { wch: 18 }, // Ngày làm
        { wch: 12 }, // Giờ bắt đầu
        { wch: 18 }, // Hạn chót (ngày)
        { wch: 12 }, // Hạn chót (giờ)
        { wch: 14 }, // Đồng bộ Lịch
        { wch: 15 }, // Thời lượng
        { wch: 15 }, // Nhắc nhở
        { wch: 12 }, // Lặp lại
        { wch: 15 }, // Tiến độ
        { wch: 25 }, // Trạng thái Link
        { wch: 15 }, // Tags
        { wch: 25 }  // Ghi chú
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

    // Download file
    XLSX.writeFile(wb, 'Task_Import_Template.xlsx');
};

// Parse Excel file and show preview modal
const parseExcelAndImport = (data) => {
    if (typeof XLSX === 'undefined') {
        showNotification('Thư viện Excel chưa tải xong!', 'warning');
        return;
    }

    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    importedTasks = [];

    // Skip header row
    // Columns: Tên, Ưu tiên, Phân loại, Ngày làm, Giờ bắt đầu, Hạn chót (ngày), Hạn chót (giờ), Đồng bộ Lịch, Thời lượng, Nhắc nhở, Lặp lại, Tiến độ, Link, Tags, Ghi chú
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row[0]) {
            const syncCalValue = String(row[7] || '').trim().toUpperCase();
            const syncCalendar = (syncCalValue === 'X' || syncCalValue === 'YES' || syncCalValue === 'TRUE' || syncCalValue === '1');

            // Map recurrence value
            const recurrenceRaw = String(row[10] || '').trim().toLowerCase();
            let recurrence = 'none';
            if (recurrenceRaw.includes('ngày') || recurrenceRaw === 'daily' || recurrenceRaw === 'hàng ngày') recurrence = 'daily';
            else if (recurrenceRaw.includes('tuần') || recurrenceRaw === 'weekly' || recurrenceRaw === 'hàng tuần') recurrence = 'weekly';
            else if (recurrenceRaw.includes('tháng') || recurrenceRaw === 'monthly' || recurrenceRaw === 'hàng tháng') recurrence = 'monthly';

            importedTasks.push({
                id: 'import_' + Date.now() + '_' + i,
                name: String(row[0] || ''),
                priority: ['low', 'medium', 'high'].includes(String(row[1])?.toLowerCase()) ? String(row[1]).toLowerCase() : 'medium',
                category: String(row[2] || 'Khác'),
                scheduledDate: formatExcelDate(row[3]),
                scheduledTime: String(row[4] || '08:00'),
                dueDate: formatExcelDate(row[5]),
                dueTime: String(row[6] || '23:59'),
                syncCalendar: syncCalendar,
                duration: parseInt(row[8]) || 60,
                reminder: parseInt(row[9]) || 0,
                recurrence: recurrence,
                status: String(row[11] || 'Chưa thực hiện'),
                link: String(row[12] || ''),
                tags: String(row[13] || ''),
                notes: String(row[14] || '')
            });
        }
    }

    if (importedTasks.length === 0) {
        showNotification('Không tìm thấy công việc nào trong file!', 'warning');
        return;
    }

    // Show preview modal
    showImportPreviewModal(importedTasks);
};

// Show import preview modal with table
const showImportPreviewModal = (tasks) => {
    // Remove existing modal if any
    document.querySelector('.import-preview-modal')?.remove();

    const priorityLabels = { 'high': '🔴 Cao', 'medium': '🟡 TB', 'low': '🟢 Thấp' };

    // Build table rows
    const tableRows = tasks.map((task, idx) => `
        < tr data - id="${task.id}" >
            <td style="text-align: center;"><input type="checkbox" class="import-task-cb" value="${task.id}" checked style="width: 16px; height: 16px; accent-color: #3b82f6; cursor: pointer;"></td>
            <td>${idx + 1}</td>
            <td><input type="text" value="${escapeHTML(task.name)}" class="edit-import-name" data-id="${task.id}" style="width:100%; min-width:150px; border:1px solid #e2e8f0; padding:6px; border-radius:6px; font-family:inherit;"></td>
            <td>${priorityLabels[task.priority] || '🟡 TB'}</td>
            <td>${escapeHTML(task.category)}</td>
            <td>${task.dueDate || '-'}</td>
            <td>${escapeHTML(task.status)}</td>
        </tr >
    `).join('');

    const modal = document.createElement('div');
    modal.className = 'import-preview-modal';
    modal.style.cssText = `
position: fixed; top: 0; left: 0; right: 0; bottom: 0;
background: rgba(0, 0, 0, 0.6); display: flex; align - items: center;
justify - content: center; z - index: 10000; backdrop - filter: blur(4px);
`;

    modal.innerHTML = `
    < div style = "
background: white; border - radius: 16px; max - width: 900px; width: 95 %;
max - height: 85vh; overflow: hidden; box - shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
display: flex; flex - direction: column;
">
    < div style = "
padding: 20px 24px; border - bottom: 1px solid #e5e7eb;
display: flex; justify - content: space - between; align - items: center;
background: linear - gradient(135deg, #667eea 0 %, #764ba2 100 %);
color: white;
">
    < h3 style = "margin: 0; font-size: 1.2rem;" >📋 Xem trước dữ liệu Import(${tasks.length} công việc)</h3 >
        <button class="close-preview-btn" style="
                    background: rgba(255,255,255,0.2); border: none; color: white;
                    width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
                    font-size: 1.2rem; display: flex; align-items: center; justify-content: center;
                ">&times;</button>
            </div >
            
            <div style="padding: 20px; overflow-y: auto; flex: 1;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0; width: 50px;">
                                <input type="checkbox" id="import-all-cb" checked style="width: 16px; height: 16px; accent-color: #3b82f6; cursor: pointer;">
                            </th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">#</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Tên công việc</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Ưu tiên</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Phân loại</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Hạn chót</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            
            <div style="
                padding: 16px 24px; border-top: 1px solid #e5e7eb;
                display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc;
            ">
                <button class="cancel-import-btn" style="
                    padding: 10px 24px; border: 2px solid #e5e7eb; background: white;
                    border-radius: 8px; cursor: pointer; font-weight: 600; color: #64748b;
                ">❌ Hủy</button>
                <button class="confirm-import-btn" style="
                    padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer;
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                    color: white; font-weight: 600;
                ">✅ Xác nhận Import</button>
            </div>
        </div >
    `;

    document.body.appendChild(modal);

    // Add row hover styles
    modal.querySelectorAll('tbody tr').forEach(row => {
        row.style.cssText = 'transition: background 0.2s;';
        row.addEventListener('mouseenter', () => row.style.background = '#f0f9ff');
        row.addEventListener('mouseleave', () => row.style.background = '');
    });
    modal.querySelectorAll('td').forEach(td => {
        td.style.cssText = 'padding: 10px 12px; border-bottom: 1px solid #f1f5f9;';
    });

    // Close handlers
    modal.querySelector('.close-preview-btn').onclick = () => modal.remove();
    modal.querySelector('.cancel-import-btn').onclick = () => {
        modal.remove();
        importedTasks = [];
        showNotification('Đã hủy import.', 'info');
    };

    // Confirm import
    modal.querySelector('.confirm-import-btn').onclick = () => {
        const selectedIds = Array.from(modal.querySelectorAll('.import-task-cb:checked')).map(cb => cb.value);
        if (selectedIds.length === 0) {
            showNotification('Vui lòng chọn ít nhất 1 công việc để import!', 'warning');
            return;
        }

        // Apply edits back to importedTasks before dispatch
        modal.querySelectorAll('.edit-import-name').forEach(input => {
            const t = importedTasks.find(x => x.id === input.dataset.id);
            if (t) t.name = input.value;
        });

        const finalTasks = importedTasks.filter(t => selectedIds.includes(t.id));

        modal.remove();

        // Dispatch event to work.js to add tasks
        window.dispatchEvent(new CustomEvent('import-tasks', {
            detail: { tasks: finalTasks }
        }));

        importedTasks = [];
    };

    // Toggle all checkboxes
    const allCb = modal.querySelector('#import-all-cb');
    if (allCb) {
        allCb.addEventListener('change', (e) => {
            modal.querySelectorAll('.import-task-cb').forEach(cb => cb.checked = e.target.checked);
        });
    }

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
};

// Format Excel date (can be number or string, supports DD/MM/YYYY and YYYY-MM-DD)
const formatExcelDate = (value) => {
    if (!value) return '';

    // If it's a number (Excel serial date)
    if (typeof value === 'number') {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }

    const str = String(value);

    // If DD/MM/YYYY format, convert to YYYY-MM-DD
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            return `${parts[2]} -${parts[1].padStart(2, '0')} -${parts[0].padStart(2, '0')} `;
        }
    }

    // Already in YYYY-MM-DD format or other
    return str;
};


// Parse CSV content and import directly
const parseCSVAndImport = (csvText) => {
    const lines = csvText.trim().split('\n');
    importedTasks = [];

    // Skip header row if exists
    const startRow = lines[0].toLowerCase().includes('tên') || lines[0].toLowerCase().includes('task') ? 1 : 0;

    for (let i = startRow; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 1 && parts[0]) {
            importedTasks.push({
                id: 'import_' + Date.now() + '_' + i,
                name: parts[0],
                dueDate: parts[1] || '',
                priority: ['low', 'medium', 'high'].includes(parts[2]?.toLowerCase()) ? parts[2].toLowerCase() : 'medium',
                category: parts[3] || 'Khác',
                notes: parts[4] || '',
                status: 'Chưa thực hiện'
            });
        }
    }

    if (importedTasks.length === 0) {
        showNotification('Không tìm thấy công việc nào trong file!', 'warning');
        return;
    }
    // Dispatch event to work.js to add tasks directly
    window.dispatchEvent(new CustomEvent('import-tasks', {
        detail: { tasks: importedTasks }
    }));

    importedTasks = [];
};


// ============================================
// ACTIVITY LOG HELPER
// ============================================
const addActivityLog = (task, action) => {
    if (!task.history) task.history = [];
    task.history.push({
        time: new Date().toISOString(),
        action: action
    });
    // Keep last 50 entries
    if (task.history.length > 50) task.history = task.history.slice(-50);
};

// ============================================
// BATCH MODE
// ============================================
const setupBatchMode = () => {
    // Insert batch toggle button in header
    const headerActions = document.querySelector('.task-header-actions');
    if (headerActions && !document.getElementById('btn-batch-toggle')) {
        const btn = document.createElement('button');
        btn.id = 'btn-batch-toggle';
        btn.className = 'batch-toggle-btn';
        btn.innerHTML = '☑️ Chọn nhiều';
        btn.addEventListener('click', () => toggleBatchMode());
        headerActions.insertBefore(btn, headerActions.firstChild);
    }

    // Create batch toolbar (hidden initially)
    if (!document.getElementById('batch-toolbar')) {
        const toolbar = document.createElement('div');
        toolbar.id = 'batch-toolbar';
        toolbar.className = 'batch-toolbar';
        toolbar.innerHTML = `
    < span class="batch-count" > 0 đã chọn</span >
            <button class="batch-action-btn" data-batch="status">🔄 Đổi trạng thái</button>
            <button class="batch-action-btn" data-batch="priority">🎯 Đổi ưu tiên</button>
            <button class="batch-action-btn" data-batch="myday">☀️ My Day</button>
            <button class="batch-action-btn danger" data-batch="delete">🗑️ Xoá</button>
            <button class="batch-close-btn" title="Đóng">✕</button>
`;
        document.body.appendChild(toolbar);

        toolbar.querySelector('.batch-close-btn').addEventListener('click', () => toggleBatchMode(false));

        toolbar.querySelectorAll('.batch-action-btn').forEach(btn => {
            btn.addEventListener('click', () => executeBatchAction(btn.dataset.batch));
        });
    }
};

const toggleBatchMode = (forceState) => {
    batchMode = forceState !== undefined ? forceState : !batchMode;
    selectedTaskIds.clear();
    const board = document.getElementById('task-kanban-board');
    const toggleBtn = document.getElementById('btn-batch-toggle');
    if (board) board.classList.toggle('batch-mode-active', batchMode);
    if (toggleBtn) toggleBtn.classList.toggle('active', batchMode);
    updateBatchToolbar();
    renderKanbanBoard();
};

const updateBatchToolbar = () => {
    const toolbar = document.getElementById('batch-toolbar');
    if (!toolbar) return;
    const count = selectedTaskIds.size;
    toolbar.querySelector('.batch-count').textContent = `${count} đã chọn`;
    toolbar.classList.toggle('visible', batchMode && count > 0);
};

const executeBatchAction = async (action) => {
    const ids = [...selectedTaskIds];
    if (ids.length === 0) return;

    const tasks = globalData.tasks || [];
    const selected = tasks.filter(t => ids.includes(t.id));

    switch (action) {
        case 'status': {
            const newStatus = prompt('Nhập trạng thái mới:\n- Chưa thực hiện\n- Đang làm\n- Đang chờ\n- Hoàn thành');
            if (!newStatus || !['Chưa thực hiện', 'Đang làm', 'Đang chờ', 'Hoàn thành'].includes(newStatus)) return;
            selected.forEach(t => {
                const old = t.status;
                t.status = newStatus;
                t.lastUpdated = new Date().toISOString();
                if (newStatus === 'Hoàn thành') { t.completedAt = new Date().toISOString(); t.progress = 100; }
                addActivityLog(t, `Batch: ${old} → ${newStatus} `);
            });
            showNotification(`✅ Đã cập nhật ${selected.length} task`);
            break;
        }
        case 'priority': {
            const newPri = prompt('Nhập ưu tiên mới: low / medium / high');
            if (!['low', 'medium', 'high'].includes(newPri)) return;
            selected.forEach(t => { addActivityLog(t, `Batch ưu tiên: ${t.priority} → ${newPri} `); t.priority = newPri; t.lastUpdated = new Date().toISOString(); });
            showNotification(`🎯 Đã cập nhật ưu tiên ${selected.length} task`);
            break;
        }
        case 'myday':
            selected.forEach(t => { t.myDay = true; addActivityLog(t, 'Batch: Thêm vào My Day'); });
            showNotification(`☀️ Đã thêm ${selected.length} task vào My Day`);
            break;
        case 'delete':
            if (!confirm(`Xác nhận xoá ${selected.length} công việc ? `)) return;
            globalData.tasks = tasks.filter(t => !ids.includes(t.id));
            showNotification(`🗑️ Đã xoá ${selected.length} task`);
            break;
    }

    try { await saveUserData(currentUser.uid, { tasks: globalData.tasks }, { forceOverwrite: true }); } catch (err) { console.error(err); }
    toggleBatchMode(false);
    window.dispatchEvent(new CustomEvent('kanban-refresh', { detail: { tasks: globalData.tasks } }));
};

// ============================================
// ADVANCED FILTERS PANEL
// ============================================
const setupAdvancedFilterPanel = () => {
    // Insert "My Day" filter pill
    const filterPills = document.querySelector('.task-filter-pills');
    if (filterPills && !filterPills.querySelector('[data-filter="myday"]')) {
        const myDayPill = document.createElement('button');
        myDayPill.className = 'filter-pill';
        myDayPill.dataset.filter = 'myday';
        myDayPill.textContent = '☀️ My Day';
        filterPills.appendChild(myDayPill);
    }

    // Insert advanced filter toggle button + panel
    const searchRow = document.querySelector('.task-search-row');
    if (searchRow && !document.getElementById('btn-advanced-filter')) {
        const btn = document.createElement('button');
        btn.id = 'btn-advanced-filter';
        btn.style.cssText = 'padding:8px 14px;border:2px solid #e2e8f0;background:white;border-radius:10px;cursor:pointer;font-weight:600;color:#64748b;white-space:nowrap;';
        btn.textContent = '🔍 Lọc nâng cao';
        btn.addEventListener('click', () => {
            const panel = document.getElementById('advanced-filter-panel');
            if (panel) panel.classList.toggle('open');
        });
        searchRow.appendChild(btn);

        // Create panel
        const panel = document.createElement('div');
        panel.id = 'advanced-filter-panel';
        panel.className = 'advanced-filter-panel';

        const categories = [...new Set((globalData.tasks || []).map(t => t.category).filter(Boolean))];
        const catOptions = categories.map(c => `< option value = "${escapeHTML(c)}" > ${escapeHTML(c)}</option > `).join('');

        panel.innerHTML = `
    < div class="filter-panel-header" >
                <h4>🔍 Lọc nâng cao</h4>
                <button class="filter-panel-close">&times;</button>
            </div >
            <div class="filter-grid">
                <div class="filter-group">
                    <label>🎯 Ưu tiên</label>
                    <select id="af-priority"><option value="">Tất cả</option><option value="high">🔴 Cao</option><option value="medium">🟡 Trung bình</option><option value="low">🟢 Thấp</option></select>
                </div>
                <div class="filter-group">
                    <label>🏷️ Danh mục</label>
                    <select id="af-category"><option value="">Tất cả</option>${catOptions}</select>
                </div>
                <div class="filter-group">
                    <label>📅 Từ ngày</label>
                    <input type="date" id="af-date-from">
                </div>
                <div class="filter-group">
                    <label>📅 Đến ngày</label>
                    <input type="date" id="af-date-to">
                </div>
            </div>
            <div class="filter-actions">
                <button class="filter-reset-btn" id="af-reset">↻ Xoá lọc</button>
                <button class="filter-apply-btn" id="af-apply">✓ Áp dụng</button>
            </div>
`;
        searchRow.parentElement.insertBefore(panel, searchRow.nextSibling);

        panel.querySelector('.filter-panel-close').addEventListener('click', () => panel.classList.remove('open'));
        panel.querySelector('#af-apply').addEventListener('click', () => {
            advancedFilters.priority = document.getElementById('af-priority').value;
            advancedFilters.category = document.getElementById('af-category').value;
            advancedFilters.dateFrom = document.getElementById('af-date-from').value;
            advancedFilters.dateTo = document.getElementById('af-date-to').value;
            panel.classList.remove('open');
            renderKanbanBoard();
        });
        panel.querySelector('#af-reset').addEventListener('click', () => {
            advancedFilters = { priority: '', category: '', folder: '', tag: '', dateFrom: '', dateTo: '', myDay: false };
            document.getElementById('af-priority').value = '';
            document.getElementById('af-category').value = '';
            document.getElementById('af-date-from').value = '';
            document.getElementById('af-date-to').value = '';
            panel.classList.remove('open');
            renderKanbanBoard();
        });
    }
};

// Render active filters chips
const renderActiveFiltersBar = () => {
    let bar = document.getElementById('active-filters-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'active-filters-bar';
        bar.className = 'active-filters-bar';
        const board = document.getElementById('task-kanban-board');
        if (board) board.parentElement.insertBefore(bar, board);
    }

    const af = advancedFilters;
    const chips = [];
    if (af.priority) chips.push({ label: `Ưu tiên: ${af.priority} `, key: 'priority' });
    if (af.category) chips.push({ label: `Danh mục: ${af.category} `, key: 'category' });
    if (af.dateFrom) chips.push({ label: `Từ: ${af.dateFrom} `, key: 'dateFrom' });
    if (af.dateTo) chips.push({ label: `Đến: ${af.dateTo} `, key: 'dateTo' });

    bar.innerHTML = chips.map(c =>
        `< span class="active-filter-chip" > ${c.label} <span class="remove-filter" data-key="${c.key}">&times;</span></span > `
    ).join('');

    bar.querySelectorAll('.remove-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            advancedFilters[btn.dataset.key] = '';
            renderKanbanBoard();
        });
    });
};

// ============================================
// RENDER ACTIVITY LOG IN PANEL
// ============================================
const renderActivityLog = (task) => {
    const section = document.getElementById('subtasks-section');
    if (!section) return;

    // Remove existing log
    section.querySelector('.activity-log-section')?.remove();

    const history = task.history || [];
    const logDiv = document.createElement('div');
    logDiv.className = 'activity-log-section';

    const items = history.slice().reverse().map(h => {
        const d = new Date(h.time);
        const timeStr = `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `<div class="activity-log-item"><span class="log-time">${timeStr}</span><span class="log-action">${escapeHTML(h.action)}</span></div>`;
    }).join('') || '<div class="activity-log-empty">Chưa có lịch sử</div>';

    logDiv.innerHTML = `
        <div class="activity-log-title" id="toggle-activity-log">
            📋 Lịch sử thay đổi (${history.length})
            <span class="toggle-icon">▼</span>
        </div>
        <div class="activity-log-list">${items}</div>
    `;
    section.appendChild(logDiv);

    logDiv.querySelector('#toggle-activity-log').addEventListener('click', () => {
        const title = logDiv.querySelector('.activity-log-title');
        const list = logDiv.querySelector('.activity-log-list');
        title.classList.toggle('open');
        list.classList.toggle('open');
    });
};

// Listen for panel open to render activity log
window.addEventListener('open-task-panel', (e) => {
    const taskId = e.detail?.taskId;
    if (taskId) {
        const task = (globalData.tasks || []).find(t => t.id === taskId);
        if (task) setTimeout(() => renderActivityLog(task), 200);
    }
});

export { renderKanbanBoard, addActivityLog, renderActivityLog, getCategoryColor };
