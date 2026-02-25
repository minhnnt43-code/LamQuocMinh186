// --- FILE: js/work.js ---

import {
    escapeHTML, formatDate, toLocalISOString,
    generateID, showNotification, openModal, closeModal,
    toggleLoading
} from './common.js';

import { saveUserData } from './firebase.js';
import { initTaskCharts } from './task-charts.js';
import { renderKanbanBoard, initTaskKanban, addActivityLog, renderActivityLog } from './task-kanban.js';
import { applySmartRules } from './rules-engine.js';
import { checkConflict, showConflictWarning } from './conflict-detector.js';
import { expandRecurringEvents } from './recurring-engine.js';
import { initListView, renderListView } from './task-list-view.js';
import { initAgendaView, renderAgendaView } from './task-agenda-view.js';
import { initFocusView, renderFocusView } from './task-focus-view.js';
import { initAnalyticsView, renderAnalyticsView } from './task-analytics-view.js';
import { initSecretDiary } from './secret-diary.js';

// [MỚI] Import Workspace Hub functions
import {
    renderFolderSelector, getSelectedFolder,
    renderTagSelector, getSelectedTags,
    renderSubtasks, isTaskSnoozed, renderSnoozeButton
} from './workspace-hub.js';

let globalData = null;
let currentUser = null;
let currentWeekStart = getMonday(new Date());
let editingTaskId = null;

// --- 1. HÀM KHỞI TẠO ---
export const initWorkModule = (data, user) => {
    globalData = data;
    currentUser = user;

    // Khởi tạo dữ liệu mảng nếu chưa có
    if (!globalData.calendarEvents) globalData.calendarEvents = [];
    if (!globalData.tasks) globalData.tasks = [];
    if (!globalData.todos) globalData.todos = [];
    if (!globalData.projects) globalData.projects = [];
    if (!globalData.todoGroups) globalData.todoGroups = []; // [MỚI] To-do Groups

    populateTaskDropdowns();
    resetTaskForm();

    renderDashboard();
    renderTasks();
    renderTodoList(); // Sẽ gọi renderTodoGroups()
    renderProjects();
    renderCalendar();

    // [MỚI] Sync với task-kanban.js
    try {
        initTaskKanban(globalData, currentUser);
    } catch (e) {
        console.log('Task Kanban init skipped - will use event sync');
    }

    // [MỚI] Init Smart Views
    try { initListView(globalData, currentUser); } catch (e) { console.log('List view init skipped'); }
    try { initAgendaView(globalData, currentUser); } catch (e) { console.log('Agenda view init skipped'); }
    try { initFocusView(globalData, currentUser); } catch (e) { console.log('Focus view init skipped'); }
    try { initAnalyticsView(globalData, currentUser); } catch (e) { console.log('Analytics view init skipped'); }
    try { initSecretDiary(globalData, currentUser); } catch (e) { console.log('Secret diary init skipped'); }

    // [MỚI] Setup Smart View Toggle
    setupSmartViewToggle();

    window.dispatchEvent(new CustomEvent('kanban-refresh', {
        detail: { tasks: globalData.tasks }
    }));

    // Sự kiện Task
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', handleSaveTask);

    // Quick Add Task
    const quickAddInput = document.getElementById('quick-add-task-input');
    if (quickAddInput) {
        const newQuickInput = quickAddInput.cloneNode(true);
        quickAddInput.parentNode.replaceChild(newQuickInput, quickAddInput);
        newQuickInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                await handleQuickAddTask(newQuickInput.value);
                newQuickInput.value = '';
            }
        });
    }

    // Filter Task
    document.querySelectorAll('.task-filter-controls .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.task-filter-controls .filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderTasks(e.target.dataset.filter);
        });
    });

    // [MỚI] Setup To-do Groups
    setupTodoGroupsEvents();

    setupProjectEvents();
    setupCalendarEvents();
    setupExportCSV();

    // [MỚI] Export render functions ra window để AI Tasks module có thể gọi
    window.renderTasks = renderTasks;
    window.renderDashboard = renderDashboard;
    window.renderCalendar = renderCalendar;

    // [MỚI] Listen for Kanban drag-drop events to sync task status
    window.addEventListener('kanban-task-moved', async (e) => {
        const { taskId, newStatus } = e.detail;
        if (!taskId || !newStatus) return;

        const task = globalData.tasks.find(t => t.id === taskId);
        if (!task) return;

        const oldStatus = task.status;
        task.status = newStatus;
        task.lastUpdated = new Date().toISOString();

        try {
            await saveUserData(currentUser.uid, { tasks: globalData.tasks });
            renderTasks();
            renderDashboard();
            showNotification(`✅ Đã chuyển "${task.name}" sang "${newStatus}"`);

            // Trigger Kanban refresh
            window.dispatchEvent(new CustomEvent('kanban-refresh', {
                detail: { tasks: globalData.tasks }
            }));
        } catch (err) {
            console.error('Kanban sync error:', err);
            task.status = oldStatus; // Revert
            showNotification('Lỗi khi cập nhật task!', 'error');
        }
    });

    // [MỚI] Listen for Kanban date change events (chuyển task sang ngày khác)
    window.addEventListener('kanban-task-date-change', async (e) => {
        const { taskId, newDate } = e.detail;
        if (!taskId || !newDate) return;

        const task = globalData.tasks.find(t => t.id === taskId);
        if (!task) return;

        const oldDate = task.dueDate;
        task.dueDate = newDate;
        task.lastUpdated = new Date().toISOString();

        try {
            await saveUserData(currentUser.uid, { tasks: globalData.tasks });
            renderTasks();
            renderDashboard();
            showNotification(`📅 Đã chuyển "${task.name}" sang ${newDate}`);

            // Trigger Kanban refresh
            window.dispatchEvent(new CustomEvent('kanban-refresh', {
                detail: { tasks: globalData.tasks }
            }));
        } catch (err) {
            console.error('Kanban date change error:', err);
            task.dueDate = oldDate; // Revert
            showNotification('Lỗi khi chuyển ngày!', 'error');
        }
    });

    // [MỚI] Listen for import-tasks event from task-kanban.js
    window.addEventListener('import-tasks', async (e) => {
        const { tasks: importedTasks } = e.detail;
        if (!importedTasks || importedTasks.length === 0) return;

        // Ensure schedule array exists
        if (!globalData.schedule) globalData.schedule = [];

        // Add imported tasks to globalData
        importedTasks.forEach(task => {
            // Sanitize: Firebase rejects undefined values
            const sanitized = {
                id: generateID(),
                createdAt: new Date().toISOString(),
                name: task.name || '',
                priority: task.priority || 'medium',
                category: task.category || 'Khác',
                scheduledDate: task.scheduledDate || '',
                scheduledTime: task.scheduledTime || '08:00',
                dueDate: task.dueDate || '',
                dueTime: task.dueTime || '23:59',
                duration: task.duration || 60,
                reminder: task.reminder || 0,
                recurrence: task.recurrence || 'none',
                status: task.status || 'Chưa thực hiện',
                project: '',
                link: task.link || '',
                tags: task.tags || '',
                notes: task.notes || '',
                folderId: '',
                smartTags: [],
                subtasks: [],
                snoozedUntil: '',
                isSnoozed: false,
                goalId: '',
                // v2 fields
                dependsOn: '',
                blockedReason: '',
                progress: 0,
                myDay: false,
                history: [{ time: new Date().toISOString(), action: 'Import từ Excel' }]
            };

            // Apply smart rules
            const smartResult = applySmartRules(sanitized.name);
            if (!sanitized.category || sanitized.category === 'Khác') {
                sanitized.category = smartResult.category;
            }
            sanitized.autoColor = smartResult.color || '';
            sanitized.autoIcon = smartResult.icon || '';

            globalData.tasks.push(sanitized);

            // Calendar sync: if syncCalendar flag is set, create a calendar event
            if (task.syncCalendar && globalData.schedule) {
                const eventDate = sanitized.dueDate || sanitized.scheduledDate || new Date().toISOString().split('T')[0];
                const eventTime = sanitized.dueTime || sanitized.scheduledTime || '08:00';
                const calendarEvent = {
                    id: generateID('cal'),
                    linkedTaskId: sanitized.id,
                    title: `📌 ${sanitized.name}`,
                    date: eventDate,
                    startTime: eventTime,
                    endTime: calculateEndTime(eventTime, sanitized.duration || 60),
                    type: 'task',
                    reminder: sanitized.reminder || 0,
                    color: sanitized.priority === 'high' ? '#ef4444' : (sanitized.priority === 'medium' ? '#f59e0b' : '#10b981')
                };
                globalData.schedule.push(calendarEvent);
            }
        });

        try {
            await saveUserData(currentUser.uid, { tasks: globalData.tasks, schedule: globalData.schedule });
            renderTasks();
            renderDashboard();
            renderCalendar();

            // Refresh Kanban
            window.dispatchEvent(new CustomEvent('kanban-refresh', {
                detail: { tasks: globalData.tasks }
            }));

            showNotification(`✅ Đã import ${importedTasks.length} công việc!`, 'success');
        } catch (err) {
            console.error('Import tasks error:', err);
            showNotification('Lỗi khi import tasks!', 'error');
        }
    });

    // [MỚI] Listen for delete-all-tasks-confirmed event from task-kanban.js
    window.addEventListener('delete-all-tasks-confirmed', async (e) => {
        const count = globalData.tasks.length;
        globalData.tasks = [];

        // Also clear linked calendar events
        if (globalData.schedule) {
            globalData.schedule = globalData.schedule.filter(ev => ev.type !== 'task');
        }

        try {
            await saveUserData(currentUser.uid, {
                tasks: globalData.tasks,
                schedule: globalData.schedule || []
            }, { forceOverwrite: true });

            renderTasks();
            renderDashboard();
            renderCalendar();

            // Refresh Kanban
            window.dispatchEvent(new CustomEvent('kanban-refresh', {
                detail: { tasks: globalData.tasks }
            }));

            showNotification(`🗑️ Đã xoá ${count} công việc!`, 'success');
        } catch (err) {
            console.error('Delete all tasks error:', err);
            showNotification('Lỗi khi xoá!', 'error');
        }
    });

    // [MỚI v2] Listen for request-edit-task from task-kanban.js
    window.addEventListener('request-edit-task', (e) => {
        const task = e.detail?.task;
        if (task) loadTaskToEdit(task);
    });

    // [MỚI v2] Listen for request-new-task from task-kanban.js
    window.addEventListener('request-new-task', () => {
        resetTaskForm();
    });

    // [MỚI v2] Listen for request-delete-all-tasks from task-kanban.js
    window.addEventListener('request-delete-all-tasks', () => {
        if (!confirm('Bạn chắc chắn muốn xoá TẤT CẢ công việc? Hành động này không thể hoàn tác!')) return;
        window.dispatchEvent(new CustomEvent('delete-all-tasks-confirmed'));
    });
};

// --- [MỚI] SMART VIEW TOGGLE ---
function setupSmartViewToggle() {
    const viewContainers = {
        'kanban': 'task-kanban-board',
        'list': 'list-view',
        'agenda': 'agenda-view',
        'focus': 'focus-view',
        'gantt': 'gantt-view',
        'analytics': 'analytics-view'
    };

    const viewRenderers = {
        'kanban': () => {
            window.dispatchEvent(new CustomEvent('kanban-refresh', { detail: { tasks: globalData.tasks } }));
        },
        'list': () => renderListView(),
        'agenda': () => renderAgendaView(),
        'focus': () => renderFocusView(),
        'gantt': () => { /* Gantt có logic riêng */ },
        'analytics': () => renderAnalyticsView()
    };

    document.querySelectorAll('#task-view-toggle .view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.taskView;

            // Active button
            document.querySelectorAll('#task-view-toggle .view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Hide ALL view containers
            Object.values(viewContainers).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            // Show selected view
            const targetEl = document.getElementById(viewContainers[view]);
            if (targetEl) targetEl.style.display = '';

            // Render the view
            if (viewRenderers[view]) viewRenderers[view]();
        });
    });

    // [PHASE 3] Chỉ ẩn Focus và Agenda — giữ Kanban, List, Gantt, Analytics
    const HIDDEN_VIEWS = ['focus', 'agenda'];
    HIDDEN_VIEWS.forEach(viewName => {
        const btn = document.querySelector(`#task-view-toggle .view-btn[data-task-view="${viewName}"]`);
        if (btn) btn.style.display = 'none';
    });
}

function populateTaskDropdowns() {
    const categories = ['Học tập', 'Công việc', 'Cá nhân', 'Gia đình', 'Khác'];
    const statuses = ['Chưa thực hiện', 'Đang làm', 'Đang chờ', 'Hoàn thành', 'Đã hủy'];

    const catSelect = document.getElementById('task-category');
    const statusSelect = document.getElementById('task-status');

    if (catSelect && catSelect.options.length === 0) {
        catSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    if (statusSelect && statusSelect.options.length === 0) {
        statusSelect.innerHTML = statuses.map(s => `<option value="${s}">${s}</option>`).join('');
    }
}

// --- HELPER NGÀY THÁNG ---
function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Hàm cộng ngày (cho logic xuyên đêm & CSV)
function addDays(dateStr, days) {
    const result = new Date(dateStr);
    result.setDate(result.getDate() + days);
    return toLocalISOString(result);
}

// Helper: Chuyển đổi giờ 'HH:mm' thành phút để so sánh
const timeToMinutes = (timeStr) => {
    // [FIX] Xử lý trường hợp timeStr undefined hoặc format không hợp lệ
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
        return 0; // Fallback về 00:00
    }
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
};

function setupProjectEvents() {
    const openProjectBtn = document.getElementById('btn-open-project-modal');
    if (openProjectBtn) {
        const newBtn = openProjectBtn.cloneNode(true);
        openProjectBtn.parentNode.replaceChild(newBtn, openProjectBtn);
        newBtn.addEventListener('click', () => {
            document.getElementById('project-id').value = '';
            document.getElementById('project-name').value = '';
            document.getElementById('project-description').value = '';
            document.getElementById('project-start-date').value = toLocalISOString(new Date());
            document.getElementById('project-end-date').value = '';
            document.getElementById('btn-delete-project').style.display = 'none';
            openModal('project-modal');
        });
    }
    const btnSaveProj = document.getElementById('btn-save-project');
    if (btnSaveProj) {
        const newBtn = btnSaveProj.cloneNode(true);
        btnSaveProj.parentNode.replaceChild(newBtn, btnSaveProj);
        newBtn.addEventListener('click', handleSaveProject);
    }
    const btnDelProj = document.getElementById('btn-delete-project');
    if (btnDelProj) {
        const newBtn = btnDelProj.cloneNode(true);
        btnDelProj.parentNode.replaceChild(newBtn, btnDelProj);
        newBtn.addEventListener('click', handleDeleteProject);
    }
}

function setupCalendarEvents() {
    const prevBtn = document.getElementById('cal-prev-btn');
    const nextBtn = document.getElementById('cal-next-btn');
    const todayBtn = document.getElementById('cal-today-btn');
    const syncBtn = document.getElementById('btn-google-sync');

    if (prevBtn) prevBtn.onclick = () => changeCalendarWeek(-1);
    if (nextBtn) nextBtn.onclick = () => changeCalendarWeek(1);
    if (todayBtn) todayBtn.onclick = () => {
        currentWeekStart = getMonday(new Date());
        renderCalendar();
    };

    if (syncBtn) {
        // [PHASE 3] Ẩn nút Google Sync mock — không dùng, tránh nhầm lẫn với sync thật
        syncBtn.style.display = 'none';
    }

    // [FIX] Gán sự kiện cho nút Lưu và Xóa sự kiện
    const btnSaveEvent = document.getElementById('btn-save-event');
    if (btnSaveEvent) {
        const newBtn = btnSaveEvent.cloneNode(true);
        btnSaveEvent.parentNode.replaceChild(newBtn, btnSaveEvent);
        newBtn.addEventListener('click', handleSaveEvent);
    }

    const btnDeleteEvent = document.getElementById('btn-delete-event');
    if (btnDeleteEvent) {
        const newBtn = btnDeleteEvent.cloneNode(true);
        btnDeleteEvent.parentNode.replaceChild(newBtn, btnDeleteEvent);
        newBtn.addEventListener('click', handleDeleteEvent);
    }

    const closeEventModalBtn = document.getElementById('close-event-modal');
    if (closeEventModalBtn) {
        closeEventModalBtn.onclick = () => closeModal('event-modal');
    }
}

// Export Calendar to CSV with Date Range Picker
const exportCalendarToCSV = () => {
    // Create date range picker popup
    const popup = document.createElement('div');
    popup.className = 'quick-add-popup';
    popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);min-width:350px;z-index:10000;';

    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAhead = new Date(today);
    monthAhead.setMonth(monthAhead.getMonth() + 1);

    popup.innerHTML = `
        <h4 style="margin:0 0 16px;color:#374151;font-size:1.1rem;">📤 Xuất CSV cho Google Calendar</h4>
        
        <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#6b7280;font-size:0.85rem;">Chọn khoảng thời gian:</label>
            <div style="display:flex;gap:12px;align-items:center;">
                <div style="flex:1;">
                    <label style="font-size:0.75rem;color:#9ca3af;">Từ ngày</label>
                    <input type="date" id="export-from-date" value="${toLocalISOString(monthAgo)}" style="width:100%;padding:8px;border:2px solid #e5e7eb;border-radius:8px;">
                </div>
                <span style="margin-top:12px;">→</span>
                <div style="flex:1;">
                    <label style="font-size:0.75rem;color:#9ca3af;">Đến ngày</label>
                    <input type="date" id="export-to-date" value="${toLocalISOString(monthAhead)}" style="width:100%;padding:8px;border:2px solid #e5e7eb;border-radius:8px;">
                </div>
            </div>
        </div>
        
        <div style="margin-bottom:16px;padding:12px;background:#f0f9ff;border-radius:8px;font-size:0.85rem;color:#0369a1;">
            💡 <strong>Tip:</strong> Để trống để xuất tất cả sự kiện
        </div>
        
        <div class="quick-add-actions" style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-cancel" style="padding:10px 20px;border:none;border-radius:8px;background:#f3f4f6;color:#6b7280;cursor:pointer;">Hủy</button>
            <button id="export-all-btn" style="padding:10px 20px;border:none;border-radius:8px;background:#22c55e;color:white;cursor:pointer;font-weight:600;">📋 Xuất tất cả</button>
            <button id="export-range-btn" style="padding:10px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;cursor:pointer;font-weight:600;">📅 Xuất theo ngày</button>
        </div>
    `;

    document.body.appendChild(popup);

    // Close button
    popup.querySelector('.btn-cancel').onclick = () => popup.remove();

    // Export All
    popup.querySelector('#export-all-btn').onclick = () => {
        doExportCSV(null, null);
        popup.remove();
    };

    // Export by Range
    popup.querySelector('#export-range-btn').onclick = () => {
        const fromDate = document.getElementById('export-from-date').value;
        const toDate = document.getElementById('export-to-date').value;
        doExportCSV(fromDate, toDate);
        popup.remove();
    };
};

// Actual CSV Export Logic
const doExportCSV = (fromDate, toDate) => {
    let events = globalData.calendarEvents || [];

    // Filter by date range if specified
    if (fromDate && toDate) {
        events = events.filter(e => e.date >= fromDate && e.date <= toDate);
    }

    if (events.length === 0) {
        showNotification('Không có sự kiện nào để xuất!', 'warning');
        return;
    }

    // Google Calendar CSV format headers
    const headers = ['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'All Day Event', 'Description', 'Location'];

    const rows = events.map(e => {
        const startDate = formatDateForCSV(e.date);
        // [FIX] Use endDate if available, otherwise fallback to date
        const endDate = formatDateForCSV(e.endDate || e.date);

        // [FIX] Smart endTime: nếu trống → lấy startTime + 1 giờ
        let endTime = e.endTime;
        if (!endTime && e.startTime) {
            const [h, m] = e.startTime.split(':').map(Number);
            const newH = Math.min(h + 1, 23);
            endTime = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        endTime = endTime || '09:00';

        return [
            `"${(e.title || '').replace(/"/g, '""')}"`,
            startDate,
            formatTimeForCSV(e.startTime || '08:00'),
            endDate,
            formatTimeForCSV(endTime),
            e.allDay ? 'True' : 'False',
            `"${(e.description || '').replace(/"/g, '""')}"`,
            `"${(e.location || '').replace(/"/g, '""')}"`
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `calendar_export_${toLocalISOString(new Date())}.csv`;
    link.click();

    showNotification(`✅ Đã xuất ${events.length} sự kiện!`);
};

// Format date for CSV — Google Calendar chuẩn MM/DD/YYYY
// [FIX L2] Đổi từ DD/MM/YYYY sang MM/DD/YYYY để Google Calendar import đúng ngày
const formatDateForCSV = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
};

// [FIX] Format time 24h → 12h AM/PM cho Google Calendar import
const formatTimeForCSV = (timeStr) => {
    if (!timeStr) return '08:00 AM';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

function setupExportCSV() {
    const exportBtn = document.getElementById('btn-export-calendar-csv');
    if (exportBtn) {
        const newBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newBtn, exportBtn);
        newBtn.addEventListener('click', exportCalendarToCSV);
    }
}

const changeCalendarWeek = (offset) => {
    currentWeekStart.setDate(currentWeekStart.getDate() + (offset * 7));
    renderCalendar();
};

const handleGoogleSync = async () => {
    if (!confirm('Bạn có muốn đồng bộ sự kiện từ Google Calendar? (Mô phỏng)')) return;

    toggleLoading(true);
    showNotification('Đang kết nối Google Calendar...', 'info');

    setTimeout(async () => {
        const mockEvents = [
            {
                id: generateID('ev_g'),
                title: 'Họp nhóm Google Meet',
                date: toLocalISOString(new Date()),
                startTime: '14:00',
                endTime: '15:30',
                description: 'Đồng bộ từ Google Calendar',
                color: '#4285F4',
                type: 'google'
            },
            {
                id: generateID('ev_g'),
                title: 'Deadline Nộp bài',
                date: addDays(toLocalISOString(new Date()), 1),
                startTime: '09:00',
                endTime: '10:00',
                description: 'Đồng bộ từ Google Calendar',
                color: '#EA4335',
                type: 'google'
            }
        ];

        if (!globalData.calendarEvents) globalData.calendarEvents = [];

        mockEvents.forEach(mockEv => {
            const exists = globalData.calendarEvents.some(ev =>
                ev.title === mockEv.title && ev.date === mockEv.date && ev.startTime === mockEv.startTime
            );
            if (!exists) {
                globalData.calendarEvents.push(mockEv);
            }
        });

        await saveUserData(currentUser.uid, { calendarEvents: globalData.calendarEvents });
        renderCalendar();
        renderDashboard();

        toggleLoading(false);
        showNotification('Đã đồng bộ thành công! 🎉');
    }, 1500);
};

// === CALENDAR REDESIGN FUNCTIONS ===

// Mini Calendar State
let miniCalendarDate = new Date();

// Render Mini Calendar
const renderMiniCalendar = () => {
    const daysContainer = document.getElementById('mini-cal-days');
    const titleEl = document.getElementById('mini-cal-title');
    if (!daysContainer || !titleEl) return;

    const year = miniCalendarDate.getFullYear();
    const month = miniCalendarDate.getMonth();

    // Set title
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    titleEl.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0 = CN
    const daysInMonth = lastDay.getDate();

    const today = new Date();
    // [FIX H1] Sử dụng padStart để đảm bảo format YYYY-MM-DD chuẩn (getMonth()+1, không bị thiếu zero)
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Get current week range
    const weekStartStr = toLocalISOString(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = toLocalISOString(weekEnd);

    let html = '';

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
        html += `<div class="mini-day other-month">${prevMonth.getDate() - i}</div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${month}-${d}`;
        const fullDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const isSelected = fullDateStr >= weekStartStr && fullDateStr <= weekEndStr;

        // [NEW] Check for events on this day
        const dayEvents = (globalData.calendarEvents || []).filter(e => e.date === fullDateStr);
        const dayTasks = (globalData.tasks || []).filter(t => t.dueDate === fullDateStr);
        const hasEvents = dayEvents.length > 0 || dayTasks.length > 0;

        let classes = 'mini-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (hasEvents) classes += ' has-events';

        // Generate event dots (max 3)
        let dotsHtml = '';
        if (hasEvents) {
            const dots = [];
            dayEvents.slice(0, 2).forEach(e => {
                const color = e.color || '#667eea';
                dots.push(`<span class="event-dot" style="background:${color}"></span>`);
            });
            if (dayTasks.length > 0) {
                dots.push(`<span class="event-dot" style="background:#22c55e"></span>`);
            }
            dotsHtml = `<div class="mini-day-dots">${dots.slice(0, 3).join('')}</div>`;
        }

        html += `<div class="${classes}" data-date="${fullDateStr}" title="${hasEvents ? `${dayEvents.length + dayTasks.length} sự kiện` : ''}">${d}${dotsHtml}</div>`;
    }

    // Next month days
    const remaining = 42 - (startDay + daysInMonth);
    for (let i = 1; i <= remaining && remaining < 14; i++) {
        html += `<div class="mini-day other-month">${i}</div>`;
    }

    daysContainer.innerHTML = html;

    // Click events for days
    daysContainer.querySelectorAll('.mini-day:not(.other-month)').forEach(day => {
        day.addEventListener('click', () => {
            const dateStr = day.dataset.date;
            if (dateStr) {
                currentWeekStart = getMonday(new Date(dateStr));
                renderCalendar();
                renderMiniCalendar();
            }
        });
    });

    // [FIX] Setup navigation buttons every render
    const prevBtn = document.getElementById('mini-cal-prev');
    const nextBtn = document.getElementById('mini-cal-next');

    if (prevBtn && !prevBtn._hasHandler) {
        prevBtn._hasHandler = true;
        prevBtn.onclick = () => {
            miniCalendarDate.setMonth(miniCalendarDate.getMonth() - 1);
            renderMiniCalendar();
        };
    }
    if (nextBtn && !nextBtn._hasHandler) {
        nextBtn._hasHandler = true;
        nextBtn.onclick = () => {
            miniCalendarDate.setMonth(miniCalendarDate.getMonth() + 1);
            renderMiniCalendar();
        };
    }
};

// Setup Mini Calendar Navigation
const setupMiniCalendar = () => {
    const prevBtn = document.getElementById('mini-cal-prev');
    const nextBtn = document.getElementById('mini-cal-next');

    if (prevBtn) {
        prevBtn.onclick = () => {
            miniCalendarDate.setMonth(miniCalendarDate.getMonth() - 1);
            renderMiniCalendar();
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            miniCalendarDate.setMonth(miniCalendarDate.getMonth() + 1);
            renderMiniCalendar();
        };
    }

    renderMiniCalendar();
};

// Update Current Time Indicator
const updateCurrentTimeLine = () => {
    const timeLine = document.getElementById('current-time-line');
    const container = document.querySelector('.calendar-grid-new');
    if (!timeLine || !container) return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Calculate position: header is ~56px, all-day row ~40px, each hour row ~60px
    const headerHeight = 56;
    const allDayHeight = 40;
    const hourHeight = 60;

    const top = headerHeight + allDayHeight + (hours * hourHeight) + (minutes / 60 * hourHeight);

    timeLine.style.top = `${top}px`;
    timeLine.style.display = 'block';
};

// Update Quick Stats in Sidebar
const updateQuickStats = (days) => {
    const events = globalData.calendarEvents || [];
    const tasks = globalData.tasks || [];

    // Filter events/tasks for this week
    const weekEvents = events.filter(e => days.includes(e.date));
    const weekTasks = tasks.filter(t => days.includes(t.dueDate));

    // Count by type (simplified)
    const meetingCount = weekEvents.filter(e =>
        e.title?.toLowerCase().includes('họp') ||
        e.title?.toLowerCase().includes('meeting') ||
        e.color === '#8b5cf6'
    ).length;

    const taskCount = weekTasks.length + weekEvents.filter(e => !e.title?.toLowerCase().includes('họp')).length - meetingCount;

    const deadlineCount = weekTasks.filter(t => t.priority === 'high').length;

    // Update DOM
    const statMeetings = document.getElementById('stat-meetings');
    const statTasks = document.getElementById('stat-tasks');
    const statDeadlines = document.getElementById('stat-deadlines');

    if (statMeetings) statMeetings.textContent = meetingCount || weekEvents.length;
    if (statTasks) statTasks.textContent = taskCount || weekTasks.length;
    if (statDeadlines) statDeadlines.textContent = deadlineCount || 0;
};

// Setup Filter Pills Click Handlers
let activeFilters = ['all'];

const setupFilterPills = () => {
    const filterPills = document.querySelectorAll('.filter-pill');

    filterPills.forEach(pill => {
        // Remove old handlers
        const newPill = pill.cloneNode(true);
        pill.parentNode?.replaceChild(newPill, pill);

        newPill.addEventListener('click', () => {
            const checkbox = newPill.querySelector('input');
            const filterType = checkbox?.dataset.filter;

            if (filterType === 'all') {
                // Toggle all
                const isActive = newPill.classList.contains('active');
                filterPills.forEach(p => p.classList.toggle('active', !isActive));
                activeFilters = isActive ? [] : ['all', 'meeting', 'task', 'deadline'];
            } else {
                newPill.classList.toggle('active');

                // Update activeFilters array
                if (newPill.classList.contains('active')) {
                    if (!activeFilters.includes(filterType)) activeFilters.push(filterType);
                } else {
                    activeFilters = activeFilters.filter(f => f !== filterType);
                }
            }

            // Apply filter to events
            applyEventFilters();
        });
    });
};

const applyEventFilters = () => {
    const allEvents = document.querySelectorAll('.calendar-event, .event-card');

    allEvents.forEach(event => {
        const title = event.textContent?.toLowerCase() || '';
        let type = 'task';

        if (title.includes('họp') || title.includes('meeting')) type = 'meeting';
        else if (title.includes('deadline') || title.includes('hạn')) type = 'deadline';

        const shouldShow = activeFilters.includes('all') || activeFilters.includes(type);
        event.style.display = shouldShow ? '' : 'none';
    });
};

// Quick Add Popup for fast event creation
const showQuickAddPopup = (event, date, time) => {
    // Remove existing popup
    document.querySelector('.quick-add-popup')?.remove();

    const popup = document.createElement('div');
    popup.className = 'quick-add-popup';
    popup.innerHTML = `
        <h4>⚡ Thêm nhanh sự kiện</h4>
        <input type="text" id="quick-event-title" placeholder="Tên sự kiện..." autofocus>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
            <input type="time" id="quick-start-time" value="${time}" style="flex:1">
            <span style="align-self:center;">→</span>
            <input type="time" id="quick-end-time" value="${String(Math.min(parseInt(time) + 1, 23)).padStart(2, '0')}:00" style="flex:1">
        </div>
        <div class="quick-add-actions">
            <button class="btn-cancel" onclick="this.closest('.quick-add-popup').remove()">Hủy</button>
            <button class="btn-save" id="quick-save-btn">Lưu</button>
        </div>
    `;

    // Position near cursor
    popup.style.left = `${Math.min(event.clientX, window.innerWidth - 300)}px`;
    popup.style.top = `${Math.min(event.clientY, window.innerHeight - 200)}px`;

    document.body.appendChild(popup);

    // Focus input
    setTimeout(() => document.getElementById('quick-event-title')?.focus(), 50);

    // Save handler
    document.getElementById('quick-save-btn').onclick = async () => {
        const title = document.getElementById('quick-event-title').value.trim();
        if (!title) {
            document.getElementById('quick-event-title').style.borderColor = '#ef4444';
            return;
        }

        const newEvent = {
            id: Date.now().toString(),
            title,
            date,
            startTime: document.getElementById('quick-start-time').value,
            endTime: document.getElementById('quick-end-time').value,
            color: '#667eea',
            createdAt: new Date().toISOString()
        };

        if (!globalData.calendarEvents) globalData.calendarEvents = [];
        globalData.calendarEvents.push(newEvent);

        // Save to Firebase
        if (currentUser) {
            await saveUserData(currentUser.uid, { calendarEvents: globalData.calendarEvents });
        }

        popup.remove();
        renderCalendar();
        showNotification('✅ Đã thêm sự kiện nhanh!');
    };

    // Enter to save
    document.getElementById('quick-event-title').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('quick-save-btn').click();
    });

    // Click outside to close
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 100);
};

// Start time indicator update interval
setInterval(updateCurrentTimeLine, 60000); // Update every minute

const renderCalendar = () => {
    const calendarBody = document.getElementById('calendar-body');
    // Support both old and new calendar structure
    const calendarHeader = document.querySelector('.calendar-table-new thead tr') || document.querySelector('.calendar-table thead tr');
    if (!calendarBody || !calendarHeader) return;

    calendarBody.innerHTML = '';
    calendarHeader.innerHTML = '<th class="time-col">Giờ</th>';

    const days = []; // Mảng chứa chuỗi ngày 'YYYY-MM-DD' của tuần hiện tại
    const todayStr = toLocalISOString(new Date());

    // 1. Vẽ Header (Thứ/Ngày)
    for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeekStart);
        day.setDate(day.getDate() + i);
        const dateStr = toLocalISOString(day);
        days.push(dateStr);

        const th = document.createElement('th');
        th.dataset.date = dateStr;
        const isToday = dateStr === todayStr;
        if (isToday) th.classList.add('today-col');
        const dayName = day.toLocaleDateString('vi-VN', { weekday: 'short' });
        th.innerHTML = `<div class="day-header-name">${dayName}</div><div class="day-header-date">${day.getDate()}</div>`;
        calendarHeader.appendChild(th);
    }

    const endWeek = new Date(currentWeekStart);
    endWeek.setDate(endWeek.getDate() + 6);
    document.getElementById('current-view-range').textContent = `${formatDate(currentWeekStart)} - ${formatDate(endWeek)}`;

    // [SMART] Mở rộng recurring events (sinh các bản clone ảo cho lịch lặp lại)
    const expandedEvents = expandRecurringEvents(
        globalData.calendarEvents || [],
        new Date(currentWeekStart),
        endWeek
    );

    // 2. Vẽ Hàng "Hạn chót" (All-day tasks) - Đồng bộ với công việc
    let allDayHtml = '<td class="time-col" style="color: #667eea; font-weight: 600;">Hạn chót</td>';
    days.forEach(dateStr => {
        const dayTasks = (globalData.tasks || []).filter(t => t.dueDate === dateStr && t.status !== 'Hoàn thành');
        let cellContent = '';
        dayTasks.forEach(t => {
            // [SMART] Dùng autoColor (từ rules-engine) thay vì chỉ dựa priority
            const taskColor = t.autoColor || (t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#22c55e');
            const taskIcon = t.autoIcon || '';
            cellContent += `<div class="task-event" data-task-id="${t.id}" style="background: ${taskColor}; color: white; margin-bottom:3px; padding:4px 8px; font-size:0.75rem; border-radius:6px; cursor:pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">${taskIcon ? taskIcon + ' ' : ''}${escapeHTML(t.name)}</div>`;
        });
        allDayHtml += `<td class="all-day-slot">${cellContent}</td>`;
    });
    const rowAllDay = document.createElement('tr');
    rowAllDay.innerHTML = allDayHtml;
    calendarBody.appendChild(rowAllDay);

    // Thêm click handler cho task trên calendar
    rowAllDay.querySelectorAll('.task-event[data-task-id]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = el.dataset.taskId;
            const task = (globalData.tasks || []).find(t => t.id === taskId);
            if (task) {
                openTaskModal(task);
            }
        });
    });

    // 3. Vẽ Lưới Giờ (0:00 - 23:00) - FULL 24 HOURS with logic xuyên đêm
    for (let hour = 0; hour <= 23; hour++) {
        const row = document.createElement('tr');
        const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
        row.innerHTML = `<td class="time-col">${timeLabel}</td>`;

        for (let i = 0; i < 7; i++) {
            const cell = document.createElement('td');
            const cellDate = days[i]; // Ngày của cột hiện tại
            const cellHour = hour;

            // Sự kiện click vào ô trống -> Thêm mới (full modal)
            cell.addEventListener('click', () => openEventModal(null, cellDate, timeLabel));

            // [NEW] Double-click -> Quick Add popup
            cell.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                showQuickAddPopup(e, cellDate, timeLabel);
            });

            // --- LOGIC TÌM SỰ KIỆN HIỂN THỊ TẠI Ô NÀY ---
            // [SMART] Dùng expandedEvents thay vì globalData.calendarEvents để hỗ trợ recurring
            const cellEvents = (expandedEvents || []).filter(e => {
                // [FIX] Check e.startTime và e.endTime có tồn tại không
                if (!e.startTime || !e.endTime) return false;

                const startMin = timeToMinutes(e.startTime);
                const endMin = timeToMinutes(e.endTime);

                // Case 1: Sự kiện bình thường trong ngày (VD: 8h - 10h cùng ngày)
                if (e.date === cellDate && endMin > startMin) {
                    return e.startTime.startsWith(hour.toString().padStart(2, '0'));
                }

                // Case 2: Sự kiện xuyên đêm (VD: 23h ngày 01 -> 03h ngày 02)
                if (endMin < startMin) {
                    // Phần 1: Hiển thị ở ngày bắt đầu (Từ giờ bắt đầu -> 24h)
                    if (e.date === cellDate) {
                        return e.startTime.startsWith(hour.toString().padStart(2, '0'));
                    }
                    // Phần 2: Hiển thị ở ngày hôm sau (Từ 00h -> giờ kết thúc)
                    const nextDayStr = addDays(e.date, 1);
                    if (nextDayStr === cellDate) {
                        // Nếu là ngày hôm sau, hiển thị từ 00:00 đến giờ kết thúc
                        // Ở đây ta hiển thị ở ô đầu tiên của ngày (ví dụ 6h sáng nếu grid bắt đầu từ 6h)
                        // Hoặc chính xác hơn: kiểm tra nếu giờ hiện tại < giờ kết thúc
                        return (cellHour * 60) < endMin && cellHour >= 0;
                        // Lưu ý: Grid của bạn bắt đầu từ 6h, nên sự kiện 0h-3h sẽ không hiện nếu không vẽ hàng 0h-5h.
                        // Tuy nhiên logic này sẽ bắt được nếu nó kéo dài tới khung giờ hiển thị.
                    }
                }
                return false;
            });

            // [NEW] Also show TASKS with scheduledDate on the time grid
            const cellTasks = (globalData.tasks || []).filter(t => {
                if (!t.scheduledDate || !t.scheduledTime) return false;
                if (t.scheduledDate !== cellDate) return false;
                return t.scheduledTime.startsWith(hour.toString().padStart(2, '0'));
            });

            cellTasks.forEach(task => {
                const div = document.createElement('div');
                div.className = 'calendar-event task-scheduled';
                div.dataset.taskId = task.id;
                // [SMART] Dùng autoColor thay vì chỉ priority
                const taskColor = task.autoColor || (task.priority === 'high' ? '#ef4444' :
                    task.priority === 'medium' ? '#f59e0b' : '#22c55e');
                div.style.cssText = `background: ${taskColor}; color: white; border: none;`;
                div.textContent = `📋 ${task.name}`;
                div.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTaskModal(task);
                });
                cell.appendChild(div);
            });

            cellEvents.forEach(ev => {
                const div = document.createElement('div');
                div.className = 'calendar-event';

                // [MỚI] Hiển thị tiêu đề có chú thích nếu là phần tiếp theo
                const startMin = timeToMinutes(ev.startTime);
                const endMin = timeToMinutes(ev.endTime);
                let displayTitle = ev.title;

                if (endMin < startMin && ev.date !== cellDate) {
                    displayTitle = `(Tiếp) ${ev.title}`; // Đánh dấu phần đuôi
                }

                div.textContent = displayTitle;

                // [MỚI] Áp dụng màu sắc
                if (ev.color) {
                    div.style.backgroundColor = ev.color;
                    div.style.border = 'none';
                }

                div.addEventListener('click', (e) => { e.stopPropagation(); openEventModal(ev); });
                cell.appendChild(div);
            });
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
    }

    // [NEW] Render mini calendar and update time line
    renderMiniCalendar();
    updateCurrentTimeLine();

    // [NEW] Add today class to today's column
    const todayCol = calendarHeader.querySelector(`th[data-date="${todayStr}"]`);
    if (todayCol) todayCol.classList.add('today-col');

    // [NEW] Update Quick Stats
    updateQuickStats(days);

    // [NEW] Setup Filter Pills
    setupFilterPills();
};

const openEventModal = (event = null, date = null, time = null) => {
    const modalTitle = document.getElementById('event-modal-title');
    const deleteBtn = document.getElementById('btn-delete-event');
    const taskSelect = document.getElementById('event-task-link');

    taskSelect.innerHTML = '<option value="">-- Không liên kết --</option>' + (globalData.tasks || []).map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('');

    if (event) {
        if (modalTitle) modalTitle.textContent = 'Sửa sự kiện';
        document.getElementById('event-id').value = event.id;
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-date').value = event.date;
        document.getElementById('event-start-time').value = event.startTime;
        document.getElementById('event-end-time').value = event.endTime;
        // [MỚI] Load màu và các trường mới
        document.getElementById('event-color').value = event.color || '#667eea';
        // [NEW] Load new fields
        const locEl = document.getElementById('event-location');
        const descEl = document.getElementById('event-description');
        const meetEl = document.getElementById('event-meet-link');
        const endDateEl = document.getElementById('event-end-date');
        const allDayEl = document.getElementById('event-all-day');
        if (locEl) locEl.value = event.location || '';
        if (descEl) descEl.value = event.description || '';
        if (meetEl) meetEl.value = event.meetLink || '';
        if (endDateEl) endDateEl.value = event.endDate || event.date;
        if (allDayEl) allDayEl.checked = event.allDay || false;

        taskSelect.value = event.linkedTaskId || '';
        deleteBtn.style.display = 'inline-block';
    } else {
        if (modalTitle) modalTitle.textContent = 'Thêm sự kiện mới';
        document.getElementById('event-id').value = '';
        document.getElementById('event-title').value = '';
        document.getElementById('event-date').value = date || toLocalISOString(new Date());
        document.getElementById('event-start-time').value = time || '08:00';

        // Tự động chỉnh giờ kết thúc = giờ bắt đầu + 1
        const startHour = parseInt(document.getElementById('event-start-time').value.split(':')[0]);
        document.getElementById('event-end-time').value = `${(startHour + 1).toString().padStart(2, '0')}:00`;

        // [MỚI] Reset màu
        document.getElementById('event-color').value = '#667eea';
        // [NEW] Reset new fields
        const locEl = document.getElementById('event-location');
        const descEl = document.getElementById('event-description');
        const meetEl = document.getElementById('event-meet-link');
        const endDateEl = document.getElementById('event-end-date');
        const allDayEl = document.getElementById('event-all-day');
        if (locEl) locEl.value = '';
        if (descEl) descEl.value = '';
        if (meetEl) meetEl.value = '';
        if (endDateEl) endDateEl.value = date || toLocalISOString(new Date());
        if (allDayEl) allDayEl.checked = false;

        taskSelect.value = '';
        deleteBtn.style.display = 'none';
    }
    openModal('event-modal');
};

const handleSaveEvent = async () => {
    const id = document.getElementById('event-id').value;
    const title = document.getElementById('event-title').value.trim();
    if (!title) return showNotification('Vui lòng nhập tiêu đề', 'error');

    const eventData = {
        id: id || generateID('ev'),
        title: title,
        date: document.getElementById('event-date').value,
        startTime: document.getElementById('event-start-time').value,
        endTime: document.getElementById('event-end-time').value,
        linkedTaskId: document.getElementById('event-task-link').value,
        color: document.getElementById('event-color').value,
        location: document.getElementById('event-location')?.value || '',
        description: document.getElementById('event-description')?.value || '',
        meetLink: document.getElementById('event-meet-link')?.value || '',
        endDate: document.getElementById('event-end-date')?.value || document.getElementById('event-date').value,
        allDay: document.getElementById('event-all-day')?.checked || false,
        type: 'manual'
    };

    // Lưu quy tắc lặp lại nếu user chọn
    const recurrenceValue = document.getElementById('event-recurrence')?.value || '';
    if (recurrenceValue) {
        const eventDate = new Date(eventData.date);
        eventData.rrule = {
            freq: recurrenceValue,
            interval: 1,
            byDay: recurrenceValue === 'weekly' ? eventDate.getDay() : undefined
        };
    }

    // Nếu user không chọn màu → tự động gắn màu theo tên sự kiện
    if (!eventData.color) {
        const smartResult = applySmartRules(title);
        eventData.color = smartResult.color;
        eventData.autoCategory = smartResult.category;
        eventData.autoIcon = smartResult.icon;
    }

    // [FIX H3] Tách logic lưu vào hàm riêng — chỉ gọi sau khi user quyết định
    const doSaveEvent = async () => {
        if (id) {
            const index = globalData.calendarEvents.findIndex(e => e.id === id);
            if (index > -1) globalData.calendarEvents[index] = { ...globalData.calendarEvents[index], ...eventData };
        } else {
            globalData.calendarEvents.push(eventData);
        }

        // [PHASE 4 - Calendar→Task REVERSE SYNC]
        // Khi user sửa event có liên kết với task → cập nhật ngược về task
        if (eventData.linkedTaskId && globalData.tasks) {
            const taskIdx = globalData.tasks.findIndex(t => t.id === eventData.linkedTaskId);
            if (taskIdx > -1) {
                const task = globalData.tasks[taskIdx];
                const updatedTask = {
                    ...task,
                    dueDate: eventData.date,
                    scheduledTime: eventData.startTime,
                    dueTime: eventData.endTime,
                    lastUpdated: new Date().toISOString()
                };
                globalData.tasks[taskIdx] = updatedTask;
                showNotification(`🔄 Đã cập nhật lịch hẹn của task "${task.name}"`, 'info');
            }
        }

        // [PHASE 7] AUTO-CREATE TASK khi tạo event loại "Việc cần làm" mà chưa link task
        const activeTab = document.querySelector('.gcal-type-tabs .gcal-tab.active');
        const isTaskType = activeTab && activeTab.dataset.type === 'task';
        if (isTaskType && !eventData.linkedTaskId && !id) {
            // Tạo task mới tự động từ event
            const newTaskId = generateID('task');
            const newTask = {
                id: newTaskId,
                name: eventData.title,
                dueDate: eventData.date,
                scheduledDate: eventData.date,
                scheduledTime: eventData.startTime,
                dueTime: eventData.endTime,
                priority: 'medium',
                category: 'Công việc',
                status: 'Chưa thực hiện',
                syncCalendar: true,
                linkedEventId: eventData.id,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            if (!globalData.tasks) globalData.tasks = [];
            globalData.tasks.push(newTask);

            // Link ngược event → task
            eventData.linkedTaskId = newTaskId;
            const evIdx = globalData.calendarEvents.findIndex(e => e.id === eventData.id);
            if (evIdx > -1) globalData.calendarEvents[evIdx].linkedTaskId = newTaskId;

            showNotification(`📋 Đã tự tạo task "${eventData.title}" từ lịch!`, 'success');
        }

        await saveUserData(currentUser.uid, { calendarEvents: globalData.calendarEvents, tasks: globalData.tasks });
        renderCalendar(); renderDashboard(); renderTasks(); closeModal('event-modal'); showNotification('Đã lưu sự kiện');
    };

    // Kiểm tra trùng lịch trước khi lưu
    const conflictResult = checkConflict(eventData, globalData.calendarEvents || []);
    if (conflictResult.hasConflict) {
        // [FIX H3] Hiển thị cảnh báo, KHÔNG lưu ngay — chờ user chọn
        showConflictWarning(
            conflictResult,
            async (suggestedSlot) => {
                // "Dời lịch" → cập nhật giờ rồi mới lưu
                eventData.startTime = suggestedSlot.startTime;
                eventData.endTime = suggestedSlot.endTime;
                document.getElementById('event-start-time').value = suggestedSlot.startTime;
                document.getElementById('event-end-time').value = suggestedSlot.endTime;
                showNotification(`✅ Đã dời xuống ${suggestedSlot.startTime} - ${suggestedSlot.endTime}`, 'success');
                await doSaveEvent();
            },
            async () => {
                // "Giữ nguyên" → lưu với giờ cũ
                await doSaveEvent();
            }
        );
        return; // [FIX] KHÔNG lưu tự động, dừng tại đây
    }

    // Không conflict → lưu ngay
    await doSaveEvent();
};

// [NEW] Open task in main Tasks section form (for calendar click)
const openTaskModal = (task) => {
    if (!task) return;

    // Load task into main form
    loadTaskToEdit(task);

    // Switch to Tasks section
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.nav-btn[data-target="tasks"]')?.classList.add('active');
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('tasks')?.classList.add('active');

    // Scroll to form
    document.querySelector('#tasks .form-container')?.scrollIntoView({ behavior: 'smooth' });
    showNotification('📝 Đang chỉnh sửa công việc', 'info');
};

const handleDeleteEvent = async () => {
    const id = document.getElementById('event-id').value;
    if (!id) return;
    if (confirm('Xóa sự kiện này?')) {
        globalData.calendarEvents = globalData.calendarEvents.filter(e => e.id !== id);
        await saveUserData(currentUser.uid, { calendarEvents: globalData.calendarEvents });
        renderCalendar(); closeModal('event-modal'); showNotification('Đã xóa sự kiện');
    }
};

// [OLD EXPORT FUNCTION REMOVED - Now using new version with date range picker at line 287]

// ============================================================
// 3. QUẢN LÝ CÔNG VIỆC (TASKS) - (GIỮ NGUYÊN)
// ============================================================
const renderTasks = (filter = 'all') => {
    const container = document.getElementById('task-list');
    if (!container) return;
    container.innerHTML = '';

    let tasks = globalData.tasks || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // [MỚI] Lọc bỏ tasks đã bị snooze
    tasks = tasks.filter(t => !isTaskSnoozed(t.id));

    // [MỚI] Lọc theo folder nếu filter là folderId
    if (filter && filter.startsWith && filter.startsWith('folder_')) {
        tasks = tasks.filter(t => t.folderId === filter);
    } else if (filter === 'incomplete') {
        tasks = tasks.filter(t => t.status !== 'Hoàn thành');
    } else if (filter === 'important') {
        tasks = tasks.filter(t => t.priority === 'high');
    } else if (filter === 'today') {
        tasks = tasks.filter(t => t.dueDate === toLocalISOString(today));
    }

    tasks.sort((a, b) => {
        if (a.status === 'Hoàn thành' && b.status !== 'Hoàn thành') return 1;
        if (a.status !== 'Hoàn thành' && b.status === 'Hoàn thành') return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    tasks.forEach(task => {
        const div = document.createElement('div');
        let statusClass = '';
        const isCompleted = task.status === 'Hoàn thành';

        if (isCompleted) {
            statusClass = 'completed';
        } else if (task.dueDate) {
            const taskDate = new Date(task.dueDate); taskDate.setHours(0, 0, 0, 0);
            const diffTime = taskDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 0) statusClass = 'overdue';
            else if (diffDays >= 0 && diffDays <= 3) statusClass = 'due-soon';
        }

        div.className = `task-item ${statusClass}`;
        const taskId = task.id;

        // Kiểm tra có chi tiết không
        const hasDetails = task.notes || task.tags || task.link;

        // [MỚI] Tính toán subtask progress
        const subtasks = task.subtasks || [];
        const subtaskCompleted = subtasks.filter(s => s.completed).length;
        const subtaskTotal = subtasks.length;
        const hasSubtasks = subtaskTotal > 0;
        const subtaskProgressHTML = hasSubtasks
            ? `<span class="subtask-badge" style="background: ${subtaskCompleted === subtaskTotal ? '#22c55e' : '#667eea'}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: 8px;">📋 ${subtaskCompleted}/${subtaskTotal}</span>`
            : '';

        // [MỚI] Render Smart Tags
        const smartTags = task.smartTags || [];
        let smartTagsHTML = '';
        if (smartTags.length > 0) {
            const allTags = globalData.smartTags || [];
            smartTagsHTML = smartTags.slice(0, 3).map(tagId => {
                const tag = allTags.find(t => t.id === tagId);
                if (!tag) return '';
                return `<span class="smart-tag tag-${tag.color}" style="padding: 2px 8px; font-size: 0.65rem;">${tag.name}</span>`;
            }).join('');
        }

        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                <input type="checkbox" class="task-complete-checkbox" ${isCompleted ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                <div class="task-info" style="flex-grow: 1; cursor: pointer;">
                    <h3 style="${isCompleted ? 'text-decoration: line-through; color: #999;' : ''}">
                        ${escapeHTML(task.name || '[Không có tên]')}
                        ${statusClass === 'overdue' && !isCompleted ? '<span style="color:red; font-size:0.8rem">(Quá hạn)</span>' : ''}
                        ${subtaskProgressHTML}
                    </h3>
                    <div class="task-meta">
                        <span class="priority-badge ${task.priority === 'high' || task.priority === 'Cao' ? 'high' : (task.priority === 'medium' || task.priority === 'Trung bình' ? 'medium' : 'low')}">${task.priority === 'high' || task.priority === 'Cao' ? 'CAO' : (task.priority === 'medium' || task.priority === 'Trung bình' ? 'TB' : (task.priority === 'Thấp' || task.priority === 'low' ? 'THẤP' : task.priority || 'TB'))}</span>
                        <span>📅 ${formatDate(task.dueDate)}</span>
                        <span class="tag-badge">${escapeHTML(task.category || 'Chung')}</span>
                        ${smartTagsHTML ? `<div class="tags-container" style="display: inline-flex; gap: 4px; margin-left: 8px;">${smartTagsHTML}</div>` : ''}
                    </div>
                </div>
                <div class="task-actions" style="display: flex; gap: 5px; position: relative;">
                    ${!isCompleted ? `<button class="snooze-btn" data-task-id="${taskId}" title="Tạm ẩn" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border: none; padding: 5px 10px; border-radius: 6px; color: white; font-size: 0.8rem; cursor: pointer;">⏰</button>` : ''}
                    ${hasDetails ? `<button class="details-btn" data-task-id="${taskId}" title="Chi tiết" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 0.85rem; color: #1e3a5f;">Chi tiết ▼</button>` : ''}
                    <button class="edit-btn" title="Sửa">✏️</button>
                    <button class="delete-btn" title="Xóa">🗑️</button>
                </div>
            </div>
            <!-- Chi tiết ẩn -->
            ${hasDetails ? `
            <div class="task-details-panel" id="details-${taskId}" style="display: none; margin-top: 10px; padding: 10px 15px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #FF7A00;">
                ${task.notes ? `<div style="margin-bottom: 8px;"><strong style="color: #1e3a5f;">📝 Ghi chú:</strong><br><span style="color: #475569;">${escapeHTML(task.notes)}</span></div>` : ''}
                ${task.tags ? `<div style="margin-bottom: 8px;"><strong style="color: #1e3a5f;">🏷️ Tags:</strong> <span style="color: #475569;">${escapeHTML(task.tags)}</span></div>` : ''}
                ${task.link ? `<div><strong style="color: #1e3a5f;">🔗 Link:</strong> <a href="${escapeHTML(task.link)}" target="_blank" style="color: #005B96;">${escapeHTML(task.link)}</a></div>` : ''}
            </div>` : ''}
        `;

        const checkbox = div.querySelector('.task-complete-checkbox');
        checkbox.addEventListener('change', async () => {
            await toggleTaskCompletion(task);
        });

        // Toggle details
        const detailsBtn = div.querySelector('.details-btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const panel = div.querySelector(`#details-${taskId}`);
                if (panel.style.display === 'none') {
                    panel.style.display = 'block';
                    detailsBtn.textContent = 'Ẩn ▲';
                } else {
                    panel.style.display = 'none';
                    detailsBtn.textContent = 'Chi tiết ▼';
                }
            });
        }

        div.querySelector('.task-info').addEventListener('click', () => loadTaskToEdit(task));
        div.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); loadTaskToEdit(task); });
        div.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteTask(task.id); });

        container.appendChild(div);
    });
};

const toggleTaskCompletion = async (task) => {
    if (task.status === 'Hoàn thành') {
        task.status = 'Chưa thực hiện';
    } else {
        task.status = 'Hoàn thành';
    }

    const index = globalData.tasks.findIndex(t => t.id === task.id);
    if (index > -1) globalData.tasks[index] = task;

    await saveUserData(currentUser.uid, { tasks: globalData.tasks });
    renderTasks();
    renderDashboard();
    showNotification(task.status === 'Hoàn thành' ? "Đã hoàn thành công việc! 🎉" : "Đã mở lại công việc");
};

const loadTaskToEdit = (task) => {
    editingTaskId = task.id;
    document.getElementById('task-name').value = task.name;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-due-date').value = task.dueDate;
    document.getElementById('task-status').value = task.status;
    const projectEl = document.getElementById('task-project');
    if (projectEl) projectEl.value = task.project || '';
    // [MỚI] Goals link
    const goalSelect = document.getElementById('task-goal');
    if (goalSelect) goalSelect.value = task.goalId || '';
    document.getElementById('task-link').value = task.link || '';
    document.getElementById('task-tags').value = task.tags || '';
    document.getElementById('task-notes').value = task.notes || '';
    document.getElementById('task-recurrence').value = task.recurrence || 'none';

    // [MỚI] Render Folder Selector
    renderFolderSelector('task-folder-container', task.folderId || '');

    // [MỚI] Render Smart Tags Selector
    renderTagSelector('task-smart-tags-container', task.smartTags || []);

    // [MỚI] Render Subtasks
    const subtasksSection = document.getElementById('subtasks-section');
    if (subtasksSection) {
        renderSubtasks(task.id, subtasksSection);
    }

    // [MỚI v2] Populate Dependency Dropdown
    const depSelect = document.getElementById('task-depends-on');
    if (depSelect) {
        const otherTasks = (globalData.tasks || []).filter(t => t.id !== task.id);
        depSelect.innerHTML = '<option value="">Không phụ thuộc</option>' +
            otherTasks.map(t => `<option value="${t.id}"${t.id === task.dependsOn ? ' selected' : ''}>${escapeHTML(t.name)}</option>`).join('');
    }

    // [MỚI v2] Blocked Reason
    const blockedInput = document.getElementById('task-blocked-reason');
    if (blockedInput) blockedInput.value = task.blockedReason || '';

    // [MỚI] Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('task-modal-opened', { detail: { taskId: task.id } }));

    // [MỚI v2] Dispatch open-task-panel event for Activity Log rendering
    window.dispatchEvent(new CustomEvent('open-task-panel', { detail: { taskId: task.id } }));

    const btn = document.getElementById('add-task-btn');
    btn.textContent = "💾 Lưu thay đổi";
    btn.style.backgroundColor = "var(--primary-blue)";

    // Update Sync Calendar Checkbox state
    const syncCheckbox = document.getElementById('task-sync-calendar');
    if (syncCheckbox && globalData.schedule) {
        const hasEvent = globalData.schedule.some(e => e.linkedTaskId === task.id);
        syncCheckbox.checked = hasEvent;
    }

    // Update Header Title
    const titleEl = document.getElementById('task-panel-title');
    if (titleEl) titleEl.textContent = 'Chỉnh sửa công việc';

    // [MỚI] Open Panel
    if (window.PanelManager) {
        window.PanelManager.open('task-form-panel');
    }

    document.getElementById('task-name').focus();
};

const resetTaskForm = () => {
    editingTaskId = null;
    document.getElementById('task-name').value = '';
    document.getElementById('task-due-date').value = toLocalISOString(new Date());
    document.getElementById('task-status').value = 'Chưa thực hiện';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-category').value = 'Học tập';
    document.getElementById('task-link').value = '';
    document.getElementById('task-tags').value = '';
    document.getElementById('task-notes').value = '';
    document.getElementById('task-recurrence').value = 'none';

    // Reset new fields
    if (document.getElementById('task-scheduled-date')) {
        document.getElementById('task-scheduled-date').value = '';
    }
    if (document.getElementById('task-scheduled-time')) {
        document.getElementById('task-scheduled-time').value = '08:00';
    }
    if (document.getElementById('task-due-time')) {
        document.getElementById('task-due-time').value = '23:59';
    }
    if (document.getElementById('task-duration')) {
        document.getElementById('task-duration').value = '60';
    }
    if (document.getElementById('task-reminder')) {
        document.getElementById('task-reminder').value = '15';
    }
    // [MỚI] Reset goal
    const goalSelect = document.getElementById('task-goal');
    if (goalSelect) goalSelect.value = '';

    // Hide calendar sync notice
    const syncNotice = document.getElementById('calendar-sync-notice');
    if (syncNotice) syncNotice.style.display = 'none';

    // Reset sync calendar checkbox
    const syncCheckbox = document.getElementById('task-sync-calendar');
    if (syncCheckbox) syncCheckbox.checked = false;

    // [MỚI] Reset Phase 1 fields
    renderFolderSelector('task-folder-container', '');
    renderTagSelector('task-smart-tags-container', []);
    const subtasksSection = document.getElementById('subtasks-section');
    if (subtasksSection) subtasksSection.innerHTML = '';

    // [MỚI v2] Reset dependency & blocked fields
    const depSelect = document.getElementById('task-depends-on');
    if (depSelect) depSelect.innerHTML = '<option value="">Không phụ thuộc</option>';
    const blockedInput = document.getElementById('task-blocked-reason');
    if (blockedInput) blockedInput.value = '';

    const btn = document.getElementById('add-task-btn');
    btn.textContent = "💾 Lưu công việc";
    btn.style.backgroundColor = "var(--primary-orange)";
};

const handleQuickAddTask = async (taskName) => {
    if (!taskName || !taskName.trim()) return;

    const taskData = {
        id: generateID('task'),
        name: taskName.trim(),
        priority: 'medium',
        category: 'Chung',
        dueDate: toLocalISOString(new Date()),
        status: 'Chưa thực hiện',
        project: '',
        recurrence: 'none',
        link: '', tags: '', notes: '',
        // [MỚI] Phase 1 fields
        folderId: '',
        smartTags: [],
        subtasks: [],
        snoozedUntil: '',
        isSnoozed: false,
        // [MỚI v2] Fields
        dependsOn: '',
        blockedReason: '',
        progress: 0,
        myDay: false,
        history: [{ time: new Date().toISOString(), action: 'Tạo nhanh' }]
    };

    globalData.tasks.push(taskData);
    await saveUserData(currentUser.uid, { tasks: globalData.tasks });

    renderTasks();
    renderDashboard();
    renderCalendar();
    showNotification('Đã thêm nhanh công việc!');
};

const handleSaveTask = async () => {
    const name = document.getElementById('task-name').value.trim();
    if (!name) return showNotification('Vui lòng nhập tên công việc!', 'error');

    // Collect new fields
    const scheduledDate = document.getElementById('task-scheduled-date')?.value || '';
    const scheduledTime = document.getElementById('task-scheduled-time')?.value || '08:00';
    const dueTime = document.getElementById('task-due-time')?.value || '23:59';
    const duration = parseInt(document.getElementById('task-duration')?.value) || 60;
    const reminder = parseInt(document.getElementById('task-reminder')?.value) || 0;

    const taskData = {
        id: editingTaskId || generateID('task'),
        name: name,
        priority: document.getElementById('task-priority').value,
        category: document.getElementById('task-category').value || 'Chung',
        dueDate: document.getElementById('task-due-date').value,
        dueTime: dueTime,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        duration: duration,
        reminder: reminder,
        status: document.getElementById('task-status').value || 'Chưa thực hiện',
        project: document.getElementById('task-project')?.value || '',
        recurrence: document.getElementById('task-recurrence').value,
        link: document.getElementById('task-link').value,
        tags: document.getElementById('task-tags').value,
        notes: document.getElementById('task-notes').value,
        // [MỚI] Phase 1 Fields
        folderId: getSelectedFolder() || '',
        smartTags: getSelectedTags('task-smart-tags-container') || [],
        // Preserve existing subtasks when editing
        subtasks: editingTaskId ? (globalData.tasks.find(t => t.id === editingTaskId)?.subtasks || []) : [],
        // Preserve snooze state when editing
        snoozedUntil: editingTaskId ? (globalData.tasks.find(t => t.id === editingTaskId)?.snoozedUntil || '') : '',
        isSnoozed: editingTaskId ? (globalData.tasks.find(t => t.id === editingTaskId)?.isSnoozed || false) : false,
        // [MỚI] Goal link
        goalId: document.getElementById('task-goal')?.value || '',
        // [MỚI v2] Dependencies, Blocked Reason, Progress, My Day, History
        dependsOn: document.getElementById('task-depends-on')?.value || '',
        blockedReason: document.getElementById('task-blocked-reason')?.value || '',
        progress: editingTaskId ? (globalData.tasks.find(t => t.id === editingTaskId)?.progress ?? 0) : 0,
        myDay: editingTaskId ? (globalData.tasks.find(t => t.id === editingTaskId)?.myDay || false) : false,
        history: editingTaskId ? (globalData.tasks.find(t => t.id === editingTaskId)?.history || []) : []
    };

    // [SMART] Tự động phân loại & đổ màu theo tên công việc
    const smartResult = applySmartRules(name);
    // Chỉ tự động gắn nếu user chưa chọn thủ công
    if (!taskData.category || taskData.category === 'Chung') {
        taskData.category = smartResult.category;
    }
    taskData.autoColor = smartResult.color;
    taskData.autoIcon = smartResult.icon;
    // Nếu từ khóa thuộc nhóm Khẩn cấp → tự đẩy priority lên Cao
    if (smartResult.priorityBoost && taskData.priority !== 'Cao' && taskData.priority !== 'high') {
        taskData.priority = smartResult.priorityBoost;
    }

    if (editingTaskId) {
        const index = globalData.tasks.findIndex(t => t.id === editingTaskId);
        const oldTask = globalData.tasks[index];
        if (index > -1) {
            // Activity log for status change
            if (oldTask && oldTask.status !== taskData.status) {
                addActivityLog(taskData, `Trạng thái: ${oldTask.status} → ${taskData.status}`);
            }
            if (oldTask && oldTask.priority !== taskData.priority) {
                addActivityLog(taskData, `Ưu tiên: ${oldTask.priority} → ${taskData.priority}`);
            }
            globalData.tasks[index] = taskData;
        }
        showNotification('Đã cập nhật công việc');
    } else {
        addActivityLog(taskData, 'Tạo mới công việc');
        globalData.tasks.push(taskData);
        showNotification('Đã thêm công việc mới');
    }

    // [PHASE 4 - Task→Schedule sync (legacy array kept for compatibility)]
    const syncCheckbox = document.getElementById('task-sync-calendar');
    const syncCalendar = syncCheckbox ? syncCheckbox.checked : false;

    if (globalData.schedule) {
        const existingEventIdx = globalData.schedule.findIndex(e => e.linkedTaskId === taskData.id);

        if (syncCalendar || scheduledDate) {
            const eventDate = syncCalendar ? taskData.dueDate : scheduledDate;
            const eventTime = syncCalendar ? taskData.dueTime : scheduledTime;

            const calendarEvent = {
                id: existingEventIdx > -1 ? globalData.schedule[existingEventIdx].id : generateID('cal'),
                linkedTaskId: taskData.id,
                title: `📌 ${taskData.name}`,
                date: eventDate || new Date().toISOString().split('T')[0],
                startTime: eventTime || '08:00',
                endTime: calculateEndTime(eventTime || '08:00', duration),
                type: 'task',
                reminder: reminder,
                color: taskData.priority === 'high' ? '#ef4444' : (taskData.priority === 'medium' ? '#f59e0b' : '#10b981')
            };

            if (existingEventIdx > -1) {
                globalData.schedule[existingEventIdx] = calendarEvent;
            } else {
                globalData.schedule.push(calendarEvent);
            }
        } else if (existingEventIdx > -1) {
            globalData.schedule.splice(existingEventIdx, 1);
        }
    }

    // [PHASE 4 - Task→calendarEvents SYNC: đây là mảng mà Week/Month View hiển thị]
    // Nếu task có dueDate → tạo/cập nhật event tương ứng trong calendarEvents
    if (!globalData.calendarEvents) globalData.calendarEvents = [];
    const ceIdx = globalData.calendarEvents.findIndex(e => e.linkedTaskId === taskData.id);

    if (taskData.dueDate) {
        // Màu theo priority
        const taskColor = taskData.priority === 'high' || taskData.priority === 'Cao'
            ? '#ef4444'
            : taskData.priority === 'medium' || taskData.priority === 'Trung bình'
                ? '#f59e0b' : '#22c55e';

        const linkedEvent = {
            id: ceIdx > -1 ? globalData.calendarEvents[ceIdx].id : generateID('ev'),
            linkedTaskId: taskData.id,            // Liên kết ngược về task
            title: `📋 ${taskData.name}`,
            date: taskData.dueDate,
            startTime: taskData.scheduledTime || taskData.dueTime || '08:00',
            endTime: calculateEndTime(taskData.scheduledTime || taskData.dueTime || '08:00', duration),
            color: taskColor,
            type: 'task',                         // Phân biệt với event thủ công
            description: taskData.notes || '',
            allDay: false
        };

        if (ceIdx > -1) {
            // Cập nhật event hiện có
            globalData.calendarEvents[ceIdx] = { ...globalData.calendarEvents[ceIdx], ...linkedEvent };
        } else {
            // Tạo event mới
            globalData.calendarEvents.push(linkedEvent);
        }
    } else if (ceIdx > -1) {
        // Task không còn dueDate → xóa event tương ứng
        globalData.calendarEvents.splice(ceIdx, 1);
    }

    await saveUserData(currentUser.uid, { tasks: globalData.tasks, schedule: globalData.schedule, calendarEvents: globalData.calendarEvents });
    resetTaskForm();

    // Close panel
    if (window.PanelManager) {
        window.PanelManager.close('task-form-panel');
    } else {
        const panel = document.getElementById('task-form-panel');
        if (panel) panel.classList.remove('active');
        const backdrop = document.getElementById('slide-panel-backdrop');
        if (backdrop) backdrop.classList.remove('active');
    }

    renderTasks(); renderDashboard(); renderCalendar();

    // Refresh Kanban
    window.dispatchEvent(new CustomEvent('kanban-refresh', {
        detail: { tasks: globalData.tasks }
    }));

    // [PHASE 5] Nếu đang promote todo → xóa todo gốc sau khi task được tạo
    if (window._promotingTodo) {
        const { groupId, itemId, todoText } = window._promotingTodo;
        const group = globalData.todoGroups?.find(g => g.id === groupId);
        if (group) {
            group.items = (group.items || []).filter(i => i.id !== itemId);
            await saveUserData(currentUser.uid, { todoGroups: globalData.todoGroups });
            renderTodoGroups();
            showNotification(`✅ Đã chuyển "${todoText}" thành công việc!`, 'success');
        }
        window._promotingTodo = null; // Reset marker
    }
};

// Helper function to calculate end time
const calculateEndTime = (startTime, durationMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

const deleteTask = async (id) => {
    if (confirm('Bạn chắc chắn muốn xóa công việc này?')) {
        globalData.tasks = globalData.tasks.filter(t => t.id !== id);
        if (editingTaskId === id) resetTaskForm();

        // [PHASE 4] Xóa calendar event liên kết khi task bị xóa
        if (globalData.calendarEvents) {
            globalData.calendarEvents = globalData.calendarEvents.filter(e => e.linkedTaskId !== id);
        }

        await saveUserData(currentUser.uid, { tasks: globalData.tasks, calendarEvents: globalData.calendarEvents });
        renderTasks(); renderDashboard(); renderCalendar();
        showNotification('Đã xóa công việc', 'success');
    }
};

// --- 4. TO-DO LIST VỚI NHÓM (GROUPS) ---

// Hàm format ngày cho hiển thị
const formatDateVN = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Hàm render danh sách nhóm To-do
const renderTodoGroups = () => {
    // Tìm container (đã thống nhất dùng todo-groups-container)
    const container = document.getElementById('todo-groups-container');
    const emptyState = document.getElementById('todo-groups-empty');
    if (!container) return;

    container.innerHTML = '';

    // Khởi tạo todoGroups nếu chưa có
    if (!globalData.todoGroups) globalData.todoGroups = [];

    const groups = globalData.todoGroups || [];

    if (groups.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    // Sắp xếp nhóm theo ngày (mới nhất lên trước)
    groups.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'todo-group-card';

        // Tính số item đã hoàn thành
        const items = group.items || [];
        const completedCount = items.filter(i => i.completed).length;
        const totalCount = items.length;
        const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        groupDiv.innerHTML = `
            <div class="todo-group-header" style="cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="group-toggle-icon" style="font-size: 1.2rem; transition: transform 0.3s;">▼</span>
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem;">${escapeHTML(group.name)}</h3>
                        <span style="font-size: 0.8rem; opacity: 0.9;">📅 ${formatDateVN(group.createdDate)}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.85rem; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px;">
                        ${completedCount}/${totalCount} ✓
                    </span>
                    <button class="btn-delete-group" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1rem;" title="Xóa nhóm">🗑️</button>
                </div>
            </div>
            
            <div class="todo-group-body" style="padding: 15px;">
                <!-- Progress bar -->
                <div style="background: #eee; height: 6px; border-radius: 3px; margin-bottom: 15px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #00C853, #69F0AE); height: 100%; width: ${progress}%; transition: width 0.5s ease;"></div>
                </div>
                
                <!-- Form thêm to-do mới -->
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" class="todo-input-in-group" placeholder="Thêm việc mới..." style="flex: 1; padding: 10px 15px; border: 2px solid #eee; border-radius: 8px; font-size: 0.95rem;">
                    <button class="btn-add-todo-in-group btn-submit" style="padding: 10px 15px;">+ Thêm</button>
                </div>
                
                <!-- Danh sách items -->
                <div class="todo-items-list">
                    ${items.length === 0 ? '<p style="color: #999; text-align: center; font-style: italic;">Chưa có việc nào trong nhóm này</p>' : ''}
                    ${items.map(item => `
                        <div class="todo-item-row" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; margin-bottom: 8px; background: ${item.completed ? '#f9f9f9' : '#fff'}; border: 1px solid #eee; transition: all 0.3s;">
                            <input type="checkbox" class="todo-item-checkbox" data-group-id="${group.id}" data-item-id="${item.id}" ${item.completed ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary-blue);">
                            <span class="todo-item-text" style="flex: 1; ${item.completed ? 'text-decoration: line-through; color: #999;' : ''}">${escapeHTML(item.text)}</span>
                            ${item.parsedDate ? `<span style="font-size: 0.75rem; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">📅 ${item.parsedDate.slice(5).replace('-', '/')}</span>` : ''}
                            ${!item.completed ? `<button class="btn-promote-todo" data-group-id="${group.id}" data-item-id="${item.id}" style="background: linear-gradient(135deg, #10b981, #059669); border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; flex-shrink: 0;" title="Chuyển thành công việc">📋</button>` : ''}
                            <button class="btn-delete-todo-item" data-group-id="${group.id}" data-item-id="${item.id}" style="background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.5; transition: opacity 0.3s;" title="Xóa">✕</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Sự kiện toggle collapse/expand
        const header = groupDiv.querySelector('.todo-group-header');
        const body = groupDiv.querySelector('.todo-group-body');
        const toggleIcon = groupDiv.querySelector('.group-toggle-icon');

        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete-group')) return;
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
            toggleIcon.style.transform = body.style.display === 'none' ? 'rotate(-90deg)' : 'rotate(0deg)';
        });

        // Sự kiện xóa nhóm
        groupDiv.querySelector('.btn-delete-group').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteTodoGroup(group.id);
        });

        // Sự kiện thêm to-do trong nhóm
        const inputInGroup = groupDiv.querySelector('.todo-input-in-group');
        const addBtnInGroup = groupDiv.querySelector('.btn-add-todo-in-group');

        addBtnInGroup.addEventListener('click', () => handleAddTodoToGroup(group.id, inputInGroup.value));
        inputInGroup.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAddTodoToGroup(group.id, inputInGroup.value);
        });

        // Sự kiện checkbox và xóa item
        groupDiv.querySelectorAll('.todo-item-checkbox').forEach(cb => {
            cb.addEventListener('change', () => handleToggleTodoItem(cb.dataset.groupId, cb.dataset.itemId));
        });

        groupDiv.querySelectorAll('.btn-delete-todo-item').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteTodoItem(btn.dataset.groupId, btn.dataset.itemId));
        });

        // [PHASE 5] Sự kiện 📋 Promote todo → Task
        groupDiv.querySelectorAll('.btn-promote-todo').forEach(btn => {
            btn.addEventListener('click', () => handlePromoteTodoToTask(btn.dataset.groupId, btn.dataset.itemId));
        });

        container.appendChild(groupDiv);
    });
};

// Hàm tạo nhóm mới (hỗ trợ cả UI cũ và mới)
const handleAddTodoGroup = async () => {
    // Fallback: tìm cả ID cũ và ID mới
    const nameInput = document.getElementById('new-group-name') || document.getElementById('new-todo-group-name');
    const dateInput = document.getElementById('new-group-deadline') || document.getElementById('new-todo-group-date');
    const colorInput = document.getElementById('new-group-color');

    const name = nameInput?.value.trim();
    if (!name) {
        showNotification('Vui lòng nhập tên nhóm!', 'error');
        nameInput?.focus();
        return;
    }

    const newGroup = {
        id: generateID('tg'),
        name: name,
        createdDate: dateInput?.value || toLocalISOString(new Date()),
        color: colorInput?.value || '#667eea',
        items: []
    };

    if (!globalData.todoGroups) globalData.todoGroups = [];
    globalData.todoGroups.push(newGroup);

    await saveUserData(currentUser.uid, { todoGroups: globalData.todoGroups });

    // Reset form
    if (nameInput) nameInput.value = '';
    if (dateInput) dateInput.value = toLocalISOString(new Date());

    renderTodoGroups();
    renderDashboard();
    showNotification(`Đã tạo nhóm "${name}" 📁`);
};

// Hàm xóa nhóm
const handleDeleteTodoGroup = async (groupId) => {
    const group = globalData.todoGroups.find(g => g.id === groupId);
    if (!group) return;

    if (confirm(`Xóa nhóm "${group.name}" và tất cả công việc trong đó?`)) {
        globalData.todoGroups = globalData.todoGroups.filter(g => g.id !== groupId);
        await saveUserData(currentUser.uid, { todoGroups: globalData.todoGroups });
        renderTodoGroups();
        renderDashboard();
        showNotification(`Đã xóa nhóm "${group.name}"`);
    }
};

// [PHASE 5] Parse date shortcuts từ todo text
// VD: "Nộp báo cáo /T6" → { cleanText: "Nộp báo cáo", parsedDate: "2026-02-27" }
const parseTodoDate = (rawText) => {
    const result = { cleanText: rawText.trim(), parsedDate: '' };

    // Regex: tìm /... ở cuối chuỗi
    const dateMatch = rawText.match(/\s*\/(\S+)\s*$/);
    if (!dateMatch) return result;

    const dateToken = dateMatch[1].toLowerCase();
    result.cleanText = rawText.replace(dateMatch[0], '').trim();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // /hn → hôm nay
    if (dateToken === 'hn') {
        result.parsedDate = toLocalISOString(today);
        return result;
    }

    // /mn → ngày mai
    if (dateToken === 'mn') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        result.parsedDate = toLocalISOString(tomorrow);
        return result;
    }

    // /t2 → /t7, /cn → Thứ (2=Monday...7=Saturday, CN=Sunday)
    const dayMap = { 'cn': 0, 't2': 1, 't3': 2, 't4': 3, 't5': 4, 't6': 5, 't7': 6 };
    if (dayMap[dateToken] !== undefined) {
        const targetDay = dayMap[dateToken];
        const currentDay = today.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7; // Nếu đã qua → tuần sau
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
        result.parsedDate = toLocalISOString(targetDate);
        return result;
    }

    // /DD-MM hoặc /DD-MM-YYYY
    const fullDateMatch = dateToken.match(/^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/);
    if (fullDateMatch) {
        const day = parseInt(fullDateMatch[1], 10);
        const month = parseInt(fullDateMatch[2], 10) - 1; // 0-indexed
        const year = fullDateMatch[3] ? parseInt(fullDateMatch[3], 10) : today.getFullYear();

        const targetDate = new Date(year, month, day);
        // Nếu ngày đã qua trong năm nay (và user không gõ năm) → sang năm sau
        if (!fullDateMatch[3] && targetDate < today) {
            targetDate.setFullYear(targetDate.getFullYear() + 1);
        }
        result.parsedDate = toLocalISOString(targetDate);
        return result;
    }

    // Không nhận ra → giữ nguyên text gốc, không parse
    result.cleanText = rawText.trim();
    return result;
};

// Hàm thêm to-do vào nhóm
const handleAddTodoToGroup = async (groupId, text) => {
    if (!text || !text.trim()) return;

    const group = globalData.todoGroups.find(g => g.id === groupId);
    if (!group) return;

    if (!group.items) group.items = [];

    // [PHASE 5] Parse date shortcuts
    const { cleanText, parsedDate } = parseTodoDate(text);

    group.items.push({
        id: generateID('ti'),
        text: cleanText,
        completed: false,
        createdAt: new Date().toISOString(),
        parsedDate: parsedDate // ngày được parse từ shortcut (nếu có)
    });

    await saveUserData(currentUser.uid, { todoGroups: globalData.todoGroups });
    renderTodoGroups();
    renderDashboard();

    if (parsedDate) {
        showNotification(`📅 Đã ghi nhận ngày: ${parsedDate}`);
    }
};

// Hàm toggle hoàn thành to-do
const handleToggleTodoItem = async (groupId, itemId) => {
    const group = globalData.todoGroups.find(g => g.id === groupId);
    if (!group) return;

    const item = group.items.find(i => i.id === itemId);
    if (!item) return;

    item.completed = !item.completed;

    await saveUserData(currentUser.uid, { todoGroups: globalData.todoGroups });
    renderTodoGroups();
    renderDashboard();
};

// Hàm xóa to-do item
const handleDeleteTodoItem = async (groupId, itemId) => {
    const group = globalData.todoGroups.find(g => g.id === groupId);
    if (!group) return;

    group.items = group.items.filter(i => i.id !== itemId);

    await saveUserData(currentUser.uid, { todoGroups: globalData.todoGroups });
    renderTodoGroups();
    renderDashboard();
};

// [PHASE 5] Chuyển todo → Task chính thức
const handlePromoteTodoToTask = (groupId, itemId) => {
    const group = globalData.todoGroups.find(g => g.id === groupId);
    if (!group) return;

    const item = group.items.find(i => i.id === itemId);
    if (!item) return;

    // Reset form trước
    resetTaskForm();

    // Pre-fill tên từ todo
    const nameInput = document.getElementById('task-name');
    if (nameInput) nameInput.value = item.text;

    // Pre-fill ngày nếu có parsedDate
    if (item.parsedDate) {
        const dueDateInput = document.getElementById('task-due-date');
        if (dueDateInput) dueDateInput.value = item.parsedDate;
    }

    // Cập nhật title panel
    const titleEl = document.getElementById('task-panel-title');
    if (titleEl) titleEl.textContent = '📋 Chuyển thành Công việc';

    // Cập nhật nút save
    const btn = document.getElementById('add-task-btn');
    if (btn) {
        btn.textContent = '📋 Tạo công việc';
        btn.style.backgroundColor = 'var(--primary-blue)';
    }

    // Mở panel
    if (window.PanelManager) {
        window.PanelManager.open('task-form-panel');
    }

    // Focus vào trường ngày nếu chưa có date (để user phải chọn)
    if (!item.parsedDate) {
        const dueDateInput = document.getElementById('task-due-date');
        if (dueDateInput) setTimeout(() => dueDateInput.focus(), 300);
    } else {
        if (nameInput) setTimeout(() => nameInput.focus(), 300);
    }

    // [QUAN TRỌNG] Đánh dấu promote — sau khi handleSaveTask xong sẽ xóa todo này
    window._promotingTodo = { groupId, itemId, todoText: item.text };

    showNotification(`📋 Điền thêm chi tiết rồi bấm "Tạo công việc"`, 'info');
};

// Setup sự kiện cho To-do Groups (hỗ trợ cả UI cũ và mới)
const setupTodoGroupsEvents = () => {
    // Set ngày mặc định
    const dateInputOld = document.getElementById('new-todo-group-date');
    const dateInputNew = document.getElementById('new-group-deadline');
    if (dateInputOld) dateInputOld.value = toLocalISOString(new Date());
    if (dateInputNew) dateInputNew.value = toLocalISOString(new Date());

    // Sự kiện nút tạo nhóm (cả 2 nút)
    const addGroupBtnOld = document.getElementById('btn-add-todo-group');
    const addGroupBtnNew = document.getElementById('btn-create-todo-group');
    if (addGroupBtnOld) addGroupBtnOld.addEventListener('click', handleAddTodoGroup);
    if (addGroupBtnNew) addGroupBtnNew.addEventListener('click', handleAddTodoGroup);

    // Sự kiện nhấn Enter (cả 2 input)
    const nameInputOld = document.getElementById('new-todo-group-name');
    const nameInputNew = document.getElementById('new-group-name');
    if (nameInputOld) nameInputOld.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAddTodoGroup(); });
    if (nameInputNew) nameInputNew.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAddTodoGroup(); });

    renderTodoGroups();
};

// Giữ lại hàm cũ để tương thích với Dashboard (nếu cần)
const renderTodoList = () => {
    // Gọi render nhóm mới
    renderTodoGroups();
};

// --- 5. QUẢN LÝ DỰ ÁN ---
const renderProjects = () => {
    const container = document.getElementById('project-list-container');
    const emptyState = document.getElementById('project-list-empty');
    if (!container) return;

    container.innerHTML = '';
    const projects = globalData.projects || [];

    if (projects.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    projects.forEach(p => {
        const div = document.createElement('div');
        div.className = 'project-card';
        div.innerHTML = `<h3>${escapeHTML(p.name)}</h3><p class="project-dates">Từ: ${formatDate(p.startDate)} - Đến: ${formatDate(p.endDate)}</p><p class="project-description">${escapeHTML(p.description)}</p><div class="project-actions"><button style="width:100%; background:var(--danger-color);" class="btn-submit btn-delete-proj">Xóa</button></div>`;
        div.querySelector('.btn-delete-proj').addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('project-id').value = p.id; handleDeleteProject(); });
        div.addEventListener('click', () => openProjectPanel(p));
        container.appendChild(div);
    });
    const select = document.getElementById('task-project');
    if (select) select.innerHTML = '<option value="">Không có</option>' + projects.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
};

const handleSaveProject = async () => {
    const id = document.getElementById('project-id').value;
    const name = document.getElementById('project-name').value;
    if (!name) return showNotification('Tên dự án là bắt buộc', 'error');
    const projectData = { id: id || generateID('proj'), name: name, description: document.getElementById('project-description').value, startDate: document.getElementById('project-start-date').value, endDate: document.getElementById('project-end-date').value };

    if (id) { const index = globalData.projects.findIndex(p => p.id === id); if (index > -1) globalData.projects[index] = projectData; }
    else { globalData.projects.push(projectData); }

    await saveUserData(currentUser.uid, { projects: globalData.projects });
    renderProjects();
    if (window.PanelManager) window.PanelManager.close('project-form-panel');
    showNotification('Lưu dự án thành công');
};

const handleDeleteProject = async () => {
    const id = document.getElementById('project-id').value;
    if (!id) return;
    if (confirm('Xóa dự án này?')) {
        globalData.projects = globalData.projects.filter(p => p.id !== id);
        await saveUserData(currentUser.uid, { projects: globalData.projects });
        renderProjects();
        if (window.PanelManager) window.PanelManager.close('project-form-panel');
        showNotification('Đã xóa dự án');
    }
};

const openProjectPanel = (p = null) => {
    document.getElementById('project-id').value = p ? p.id : '';
    document.getElementById('project-name').value = p ? p.name : '';
    document.getElementById('project-description').value = p ? p.description : '';
    document.getElementById('project-start-date').value = p ? p.startDate : '';
    document.getElementById('project-end-date').value = p ? p.endDate : '';

    const deleteBtn = document.getElementById('btn-delete-project');
    if (deleteBtn) deleteBtn.style.display = p ? 'inline-block' : 'none';

    // Title
    const title = document.getElementById('project-panel-title');
    if (title) title.textContent = p ? 'Chỉnh sửa dự án' : 'Thêm dự án';

    if (window.PanelManager) window.PanelManager.open('project-form-panel');
};

// --- 6. DASHBOARD ---
const renderDashboard = () => {
    const todayStr = toLocalISOString(new Date());
    const todayTasks = (globalData.tasks || []).filter(t => t.dueDate === todayStr && t.status !== 'Hoàn thành');
    const taskListUl = document.getElementById('dashboard-today-tasks');
    const taskEmpty = document.getElementById('dashboard-today-tasks-empty');
    if (taskListUl) {
        taskListUl.innerHTML = '';
        if (todayTasks.length > 0) { taskEmpty.style.display = 'none'; todayTasks.forEach(t => { taskListUl.innerHTML += `<li><span class="task-title">${escapeHTML(t.name)}</span><span class="due-date">${t.priority}</span></li>`; }); } else { taskEmpty.style.display = 'block'; }
    }

    // [CẬP NHẬT] Lấy to-do từ todoGroups mới
    const todoListUl = document.getElementById('dashboard-todo-list');
    const todoEmpty = document.getElementById('dashboard-todo-list-empty');
    if (todoListUl) {
        // Gom tất cả items chưa hoàn thành từ tất cả các nhóm
        let allTodoItems = [];
        (globalData.todoGroups || []).forEach(group => {
            const items = (group.items || []).filter(i => !i.completed);
            items.forEach(item => {
                allTodoItems.push({
                    text: item.text,
                    groupName: group.name
                });
            });
        });

        // Lấy 5 items đầu tiên
        const displayItems = allTodoItems.slice(0, 5);

        todoListUl.innerHTML = '';
        if (displayItems.length > 0) {
            todoEmpty.style.display = 'none';
            displayItems.forEach(t => {
                todoListUl.innerHTML += `<li><span style="font-size:0.75rem;color:#888;">[${escapeHTML(t.groupName)}]</span> ${escapeHTML(t.text)}</li>`;
            });
        } else {
            todoEmpty.style.display = 'block';
        }
    }

    const completedCount = (globalData.tasks || []).filter(t => t.status === 'Hoàn thành').length;
    const countEl = document.getElementById('stat-tasks-completed');
    if (countEl) countEl.textContent = completedCount;

    // [MỚI] Render Charts
    try {
        initTaskCharts(globalData.tasks || []);
    } catch (e) {
        console.log('Charts not ready:', e);
    }
};
