// --- FILE: js/time-blocking.js ---
// Smart Time Blocking Module with Drag & Drop

import { showNotification, escapeHTML } from './common.js';

let globalData = null;
let currentUser = null;
let currentWeekStart = null;
let draggedTask = null;

/**
 * Initialize Time Blocking Module
 */
export const initTimeBlocking = (data, user) => {
    globalData = data;
    currentUser = user;
    currentWeekStart = getWeekStart(new Date());

    setupCollapseButton();
    setupFilterPills();
};

/**
 * Render Time Blocking View
 */
export const renderTimeBlockingView = () => {
    renderTBCalendar();
    renderUnscheduledTasks();
    updateStats();
};

/**
 * Get week start (Monday)
 */
const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Render Calendar Grid for Time Blocking
 */
const renderTBCalendar = () => {
    const header = document.getElementById('tb-calendar-header');
    const body = document.getElementById('tb-calendar-body');
    if (!header || !body) return;

    header.innerHTML = '<th class="time-col">Giờ</th>';
    body.innerHTML = '';

    const days = [];
    const todayStr = toLocalISOString(new Date());

    // Render header days
    for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeekStart);
        day.setDate(day.getDate() + i);
        const dateStr = toLocalISOString(day);
        days.push(dateStr);

        const th = document.createElement('th');
        th.dataset.date = dateStr;
        if (dateStr === todayStr) th.classList.add('today-col');
        const dayName = day.toLocaleDateString('vi-VN', { weekday: 'short' });
        th.innerHTML = `<div class="day-header-name">${dayName}</div><div class="day-header-date">${day.getDate()}</div>`;
        header.appendChild(th);
    }

    // Render hourly grid
    for (let hour = 6; hour <= 22; hour++) {
        const row = document.createElement('tr');
        const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
        row.innerHTML = `<td class="time-col">${timeLabel}</td>`;

        for (let i = 0; i < 7; i++) {
            const cell = document.createElement('td');
            const cellDate = days[i];
            const cellHour = hour;

            cell.dataset.date = cellDate;
            cell.dataset.hour = cellHour;
            cell.classList.add('tb-droppable');

            // Drop zone handlers
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('dragleave', handleDragLeave);
            cell.addEventListener('drop', handleDrop);

            // Render scheduled tasks in this cell
            const scheduledTasks = (globalData.tasks || []).filter(t => {
                if (!t.scheduledDate || !t.scheduledTime) return false;
                const taskHour = parseInt(t.scheduledTime.split(':')[0], 10);
                return t.scheduledDate === cellDate && taskHour === cellHour;
            });

            scheduledTasks.forEach(task => {
                const taskEl = createScheduledTaskElement(task);
                cell.appendChild(taskEl);
            });

            row.appendChild(cell);
        }
        body.appendChild(row);
    }
};

/**
 * Render Unscheduled Tasks in Sidebar
 */
const renderUnscheduledTasks = (filter = 'all') => {
    const container = document.getElementById('unscheduled-tasks-list');
    if (!container) return;

    const todayStr = toLocalISOString(new Date());

    let tasks = (globalData.tasks || []).filter(t => {
        // Unscheduled = no scheduledDate or scheduledTime
        const isUnscheduled = !t.scheduledDate || !t.scheduledTime;
        // Not completed
        const isNotDone = t.status !== 'Hoàn thành';
        return isUnscheduled && isNotDone;
    });

    // Apply filters
    if (filter === 'high') {
        tasks = tasks.filter(t => t.priority === 'high' || t.priority === 'Cao');
    } else if (filter === 'today') {
        tasks = tasks.filter(t => t.dueDate === todayStr);
    }

    // Sort by priority
    const priorityOrder = { 'high': 0, 'Cao': 0, 'medium': 1, 'Trung bình': 1, 'low': 2, 'Thấp': 2 };
    tasks.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="tb-empty-state">
                <div class="emoji">🎉</div>
                <p>Tất cả công việc đã được lên lịch!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    tasks.forEach(task => {
        const card = createDraggableTaskCard(task);
        container.appendChild(card);
    });
};

/**
 * Create Draggable Task Card
 */
const createDraggableTaskCard = (task) => {
    const card = document.createElement('div');
    card.className = 'tb-task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;

    const priorityClass = (task.priority === 'high' || task.priority === 'Cao') ? 'high' :
        (task.priority === 'medium' || task.priority === 'Trung bình') ? 'medium' : 'low';
    const priorityLabel = priorityClass === 'high' ? 'CAO' : priorityClass === 'medium' ? 'TB' : 'THẤP';
    const duration = task.duration || 60;

    card.innerHTML = `
        <div class="tb-task-name">${escapeHTML(task.name || '[Không tên]')}</div>
        <div class="tb-task-meta">
            <span class="tb-priority-badge ${priorityClass}">${priorityLabel}</span>
            <span class="tb-duration-badge">⏱️ ${duration}p</span>
        </div>
    `;

    // Drag handlers
    card.addEventListener('dragstart', (e) => handleDragStart(e, task));
    card.addEventListener('dragend', handleDragEnd);

    return card;
};

/**
 * Create Scheduled Task Element (on calendar)
 */
const createScheduledTaskElement = (task) => {
    const el = document.createElement('div');
    el.className = 'calendar-scheduled-task';
    const priorityClass = (task.priority === 'high' || task.priority === 'Cao') ? 'priority-high' :
        (task.priority === 'medium' || task.priority === 'Trung bình') ? 'priority-medium' : '';
    if (priorityClass) el.classList.add(priorityClass);

    el.dataset.taskId = task.id;
    el.draggable = true;
    el.textContent = escapeHTML(task.name || '[Không tên]');

    // Calculate height based on duration
    const duration = task.duration || 60;
    const heightPx = Math.max(30, (duration / 60) * 70 - 4);
    el.style.height = `${heightPx}px`;
    el.style.top = '2px';
    el.style.zIndex = '10';

    // Drag from calendar back to sidebar
    el.addEventListener('dragstart', (e) => handleDragStart(e, task));
    el.addEventListener('dragend', handleDragEnd);

    // Double-click to unschedule
    el.addEventListener('dblclick', () => unscheduleTask(task));

    return el;
};

/**
 * Drag Start Handler
 */
const handleDragStart = (e, task) => {
    draggedTask = task;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);

    // Highlight all droppable cells
    document.querySelectorAll('.tb-droppable').forEach(cell => {
        cell.classList.add('drop-highlight');
    });
};

/**
 * Drag End Handler
 */
const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    draggedTask = null;

    // Remove highlights
    document.querySelectorAll('.tb-droppable').forEach(cell => {
        cell.classList.remove('drop-highlight', 'drop-hover');
    });
};

/**
 * Drag Over Handler
 */
const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drop-hover');
};

/**
 * Drag Leave Handler
 */
const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drop-hover');
};

/**
 * Drop Handler - Schedule Task
 */
const handleDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-hover', 'drop-highlight');

    if (!draggedTask) return;

    const cell = e.currentTarget;
    const date = cell.dataset.date;
    const hour = parseInt(cell.dataset.hour, 10);
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;

    // Check for overlap
    const existingTasks = (globalData.tasks || []).filter(t => {
        if (!t.scheduledDate || !t.scheduledTime) return false;
        const taskHour = parseInt(t.scheduledTime.split(':')[0], 10);
        return t.scheduledDate === date && taskHour === hour && t.id !== draggedTask.id;
    });

    if (existingTasks.length > 0) {
        // Show overlap warning
        const confirmOverlap = confirm(`⚠️ Đã có ${existingTasks.length} công việc khác vào khung giờ này.\n\nBạn có muốn tiếp tục xếp lịch không?`);
        if (!confirmOverlap) {
            draggedTask = null;
            return;
        }
    }

    // Update task
    const task = globalData.tasks.find(t => t.id === draggedTask.id);
    if (task) {
        task.scheduledDate = date;
        task.scheduledTime = timeStr;

        // Save to storage
        await saveData();

        // Re-render
        renderTimeBlockingView();

        showNotification(`✅ Đã lên lịch "${task.name}" vào ${timeStr}`, 'success');
    }

    draggedTask = null;
};

/**
 * Unschedule Task (double-click on calendar)
 */
const unscheduleTask = async (task) => {
    const t = globalData.tasks.find(tt => tt.id === task.id);
    if (t) {
        delete t.scheduledDate;
        delete t.scheduledTime;

        await saveData();
        renderTimeBlockingView();

        showNotification(`📋 "${task.name}" đã được gỡ khỏi lịch`, 'info');
    }
};

/**
 * Update Stats
 */
const updateStats = () => {
    const tasks = globalData.tasks || [];
    const unscheduled = tasks.filter(t => !t.scheduledDate && t.status !== 'Hoàn thành').length;
    const scheduled = tasks.filter(t => t.scheduledDate && t.status !== 'Hoàn thành').length;

    const unscheduledEl = document.getElementById('tb-unscheduled-count');
    const scheduledEl = document.getElementById('tb-scheduled-count');

    if (unscheduledEl) unscheduledEl.textContent = unscheduled;
    if (scheduledEl) scheduledEl.textContent = scheduled;
};

/**
 * Setup Collapse Button
 */
const setupCollapseButton = () => {
    const btn = document.getElementById('tb-collapse-btn');
    const sidebar = document.getElementById('tb-sidebar');

    if (btn && sidebar) {
        btn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
        });
    }
};

/**
 * Setup Filter Pills
 */
const setupFilterPills = () => {
    document.querySelectorAll('.tb-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.tb-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const filter = pill.dataset.tbFilter;
            renderUnscheduledTasks(filter);
        });
    });
};

/**
 * Helper: toLocalISOString
 */
const toLocalISOString = (d) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().split('T')[0];
};

/**
 * Save Data
 */
const saveData = async () => {
    // Try to use the global saveUserData function
    if (typeof window.saveUserData === 'function') {
        await window.saveUserData();
    } else {
        // Fallback to localStorage
        localStorage.setItem('lifeos-data', JSON.stringify(globalData));
    }
};
