// --- FILE: js/ui-enhancements.js ---
// UI Enhancements - Phase J
// #1 Theme System, #14 Tab Reorder, #15 Kanban View, #16 Timeline View

import { showNotification } from './common.js';

// ============================================================
// #1 - THEME SYSTEM (20+ presets)
// ============================================================
const THEMES = {
    default: {
        name: 'Mặc định',
        primary: '#667eea',
        secondary: '#764ba2',
        background: '#f8fafc'
    },
    ocean: {
        name: 'Đại dương',
        primary: '#0ea5e9',
        secondary: '#06b6d4',
        background: '#f0f9ff'
    },
    sunset: {
        name: 'Hoàng hôn',
        primary: '#f97316',
        secondary: '#ef4444',
        background: '#fef3c7'
    },
    forest: {
        name: 'Rừng xanh',
        primary: '#22c55e',
        secondary: '#10b981',
        background: '#f0fdf4'
    },
    lavender: {
        name: 'Lavender',
        primary: '#a855f7',
        secondary: '#8b5cf6',
        background: '#faf5ff'
    },
    rose: {
        name: 'Hồng',
        primary: '#f43f5e',
        secondary: '#ec4899',
        background: '#fdf2f8'
    },
    midnight: {
        name: 'Đêm',
        primary: '#6366f1',
        secondary: '#8b5cf6',
        background: '#1e1b4b',
        dark: true
    },
    charcoal: {
        name: 'Than chì',
        primary: '#64748b',
        secondary: '#475569',
        background: '#1e293b',
        dark: true
    },
    coffee: {
        name: 'Cà phê',
        primary: '#a16207',
        secondary: '#92400e',
        background: '#fef3c7'
    },
    mint: {
        name: 'Bạc hà',
        primary: '#14b8a6',
        secondary: '#0d9488',
        background: '#f0fdfa'
    }
};

let currentTheme = 'default';

const applyTheme = (themeName) => {
    const theme = THEMES[themeName] || THEMES.default;
    currentTheme = themeName;

    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--secondary-color', theme.secondary);
    document.documentElement.style.setProperty('--bg-color', theme.background);

    if (theme.dark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    localStorage.setItem('app-theme', themeName);
    showNotification(`Đã áp dụng theme ${theme.name}! 🎨`);
};

const loadSavedTheme = () => {
    const saved = localStorage.getItem('app-theme');
    if (saved && THEMES[saved]) {
        applyTheme(saved);
    }
};

const renderThemeSelector = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;">
            ${Object.entries(THEMES).map(([key, theme]) => `
                <button class="theme-option ${key === currentTheme ? 'active' : ''}" 
                        data-theme="${key}"
                        style="padding:15px 10px;border:2px solid ${key === currentTheme ? theme.primary : '#e5e7eb'};
                               border-radius:12px;background:${theme.background};cursor:pointer;
                               transition:all 0.2s;">
                    <div style="width:30px;height:30px;border-radius:50%;margin:0 auto 8px;
                                background:linear-gradient(135deg,${theme.primary},${theme.secondary});"></div>
                    <div style="font-size:0.8rem;color:${theme.dark ? '#fff' : '#374151'};">${theme.name}</div>
                </button>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
};

// ============================================================
// #15 - KANBAN VIEW (Bảng Kanban)
// ============================================================
const KANBAN_COLUMNS = [
    { id: 'todo', title: '📋 Chờ làm', status: 'Chưa thực hiện', color: '#6b7280' },
    { id: 'inprogress', title: '🔄 Đang làm', status: 'Đang thực hiện', color: '#3b82f6' },
    { id: 'review', title: '👀 Review', status: 'Chờ review', color: '#f59e0b' },
    { id: 'done', title: '✅ Xong', status: 'Hoàn thành', color: '#10b981' }
];

// Normalize status to match KANBAN_COLUMNS format
const normalizeStatus = (status) => {
    if (!status) return 'Chưa thực hiện';
    const s = status.toLowerCase().trim();
    if (s.includes('done') || s.includes('xong') || s.includes('hoàn thành') || s.includes('completed')) return 'Hoàn thành';
    if (s.includes('progress') || s.includes('đang') || s.includes('doing')) return 'Đang thực hiện';
    if (s.includes('review') || s.includes('chờ duyệt')) return 'Chờ review';
    return 'Chưa thực hiện';
};

const renderKanbanBoard = (tasks, containerId, filterDate = null) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Get selected date (default: today)
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = filterDate || localStorage.getItem('kanban-date') || today;

    // Filter tasks by selected date if filtering by day
    const showAllDates = selectedDate === 'all';
    const filteredTasks = showAllDates ? tasks : tasks.filter(t => t.dueDate === selectedDate);

    // Status to background color mapping
    const statusBgColors = {
        'Chưa thực hiện': '#f1f5f9',   // Gray
        'Đang thực hiện': '#dbeafe',   // Blue
        'Chờ review': '#fef3c7',       // Yellow
        'Hoàn thành': '#dcfce7'        // Green
    };

    // Format date for display
    const dateObj = new Date(selectedDate);
    const dateDisplay = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

    container.innerHTML = `
        <!-- Date Filter Header -->
        <div class="kanban-date-header" style="display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:15px;padding:12px 15px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;color:white;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:1.1rem;">📅</span>
                <input type="date" id="kanban-date-picker" value="${selectedDate}" 
                       style="padding:8px 12px;border:none;border-radius:8px;font-size:0.9rem;cursor:pointer;">
                <button id="kanban-show-all" style="padding:8px 15px;background:${showAllDates ? 'white' : 'rgba(255,255,255,0.2)'};color:${showAllDates ? '#667eea' : 'white'};border:none;border-radius:8px;cursor:pointer;font-weight:600;">
                    Tất cả
                </button>
            </div>
            <div style="display:flex;gap:8px;">
                <button id="kanban-prev-day" style="padding:8px 12px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:8px;cursor:pointer;">← Hôm qua</button>
                <button id="kanban-today" style="padding:8px 12px;background:white;color:#667eea;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Hôm nay</button>
                <button id="kanban-next-day" style="padding:8px 12px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:8px;cursor:pointer;">Ngày mai →</button>
            </div>
        </div>
        
        <!-- Stats -->
        <div style="margin-bottom:15px;font-size:0.9rem;color:#6b7280;">
            📊 Hiển thị ${filteredTasks.length}/${tasks.length} công việc ${!showAllDates ? `cho ngày ${dateDisplay}` : '(tất cả)'}
        </div>

        <!-- Kanban Board -->
        <div class="kanban-board" style="display:flex;gap:15px;overflow-x:auto;padding:10px 0;">
            ${KANBAN_COLUMNS.map(col => `
                <div class="kanban-column" data-status="${col.status}" 
                     style="min-width:280px;background:${statusBgColors[col.status] || '#f8fafc'};border-radius:12px;padding:15px;border-top:4px solid ${col.color};">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:15px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-weight:600;color:${col.color};">${col.title}</span>
                            <span style="background:${col.color};color:white;padding:2px 10px;
                                         border-radius:10px;font-size:0.75rem;font-weight:600;">
                                ${filteredTasks.filter(t => t.status === col.status).length}
                            </span>
                        </div>
                        ${col.status !== 'Hoàn thành' ? `
                            <button class="kanban-move-tomorrow-btn" data-status="${col.status}"
                                    title="Chuyển tất cả sang ngày mai"
                                    style="padding:4px 8px;background:${col.color}20;color:${col.color};border:none;border-radius:6px;font-size:0.7rem;cursor:pointer;">
                                ➡️ Mai
                            </button>
                        ` : ''}
                    </div>
                    <div class="kanban-cards" style="display:flex;flex-direction:column;align-items:center;gap:10px;min-height:200px;">
                        ${filteredTasks.filter(t => t.status === col.status).map(task => `
                            <div class="kanban-card" draggable="true" data-id="${task.id}"
                                 style="background:white;padding:12px;border-radius:10px;width:100%;max-width:250px;
                                        box-shadow:0 2px 8px rgba(0,0,0,0.1);cursor:grab;
                                        border-left:4px solid ${task.priority === 'high' || task.priority === 'Cao' ? '#ef4444' : task.priority === 'low' || task.priority === 'Thấp' ? '#10b981' : '#f59e0b'};
                                        transition:all 0.2s ease;">
                                <div style="font-weight:600;margin-bottom:6px;color:#1f2937;">${task.title || task.name || 'Untitled'}</div>
                                ${task.dueDate ? `<div style="font-size:0.75rem;color:#6b7280;margin-bottom:4px;">📅 ${task.dueDate}</div>` : ''}
                                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                    ${task.category ? `<span style="background:${col.color}20;color:${col.color};padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:500;">${task.category}</span>` : ''}
                                    ${task.estimatedMinutes ? `<span style="background:#e0e7ff;color:#4f46e5;padding:2px 8px;border-radius:4px;font-size:0.7rem;">⏱️ ${task.estimatedMinutes}p</span>` : ''}
                                </div>
                            </div>
                        `).join('') || '<p style="color:#9ca3af;font-size:0.85rem;text-align:center;padding:20px;">Kéo thả task vào đây</p>'}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Setup drag and drop
    setupKanbanDragDrop(container);

    // Setup date navigation
    setupKanbanDateNav(container, tasks, containerId, selectedDate);
};

// Setup date navigation events
const setupKanbanDateNav = (container, tasks, containerId, currentDate) => {
    const datePicker = container.querySelector('#kanban-date-picker');
    const prevBtn = container.querySelector('#kanban-prev-day');
    const todayBtn = container.querySelector('#kanban-today');
    const nextBtn = container.querySelector('#kanban-next-day');
    const showAllBtn = container.querySelector('#kanban-show-all');
    const moveTomorrowBtns = container.querySelectorAll('.kanban-move-tomorrow-btn');

    if (datePicker) {
        datePicker.addEventListener('change', () => {
            localStorage.setItem('kanban-date', datePicker.value);
            renderKanbanBoard(tasks, containerId, datePicker.value);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            const newDate = d.toISOString().split('T')[0];
            localStorage.setItem('kanban-date', newDate);
            renderKanbanBoard(tasks, containerId, newDate);
        });
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem('kanban-date', today);
            renderKanbanBoard(tasks, containerId, today);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            const newDate = d.toISOString().split('T')[0];
            localStorage.setItem('kanban-date', newDate);
            renderKanbanBoard(tasks, containerId, newDate);
        });
    }

    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            localStorage.setItem('kanban-date', 'all');
            renderKanbanBoard(tasks, containerId, 'all');
        });
    }

    // Move to tomorrow buttons
    moveTomorrowBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.dataset.status;
            const tasksToMove = tasks.filter(t => t.status === status && t.dueDate === currentDate);
            if (tasksToMove.length === 0) return;

            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            // Dispatch events to move tasks
            tasksToMove.forEach(task => {
                window.dispatchEvent(new CustomEvent('kanban-task-date-change', {
                    detail: { taskId: task.id, newDate: tomorrowStr }
                }));
            });
        });
    });
};

const setupKanbanDragDrop = (container) => {
    let draggedCard = null;

    container.querySelectorAll('.kanban-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedCard = card;
            card.style.opacity = '0.5';
        });
        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
            draggedCard = null;
        });
    });

    container.querySelectorAll('.kanban-column').forEach(col => {
        col.addEventListener('dragover', (e) => e.preventDefault());
        col.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedCard) {
                const taskId = draggedCard.dataset.id;
                const newStatus = col.dataset.status;
                const newDate = col.dataset.date;
                const isPast = col.dataset.past === 'true';

                // Block drops on past dates
                if (isPast && newDate) {
                    col.style.background = '#fee2e2';
                    setTimeout(() => col.style.background = '', 500);
                    window.dispatchEvent(new CustomEvent('show-notification', {
                        detail: { message: '❌ Không thể thêm task vào ngày đã qua!', type: 'error' }
                    }));
                    return;
                }

                // Dispatch custom event for status change
                window.dispatchEvent(new CustomEvent('kanban-task-moved', {
                    detail: { taskId, newStatus }
                }));

                // If date cell, also update date
                if (newDate) {
                    window.dispatchEvent(new CustomEvent('kanban-task-date-change', {
                        detail: { taskId, newDate }
                    }));
                }

                col.querySelector('.kanban-cards')?.appendChild(draggedCard);
            }
        });
    });
};

// ============================================================
// #15b - WEEKLY KANBAN VIEW (Tuần theo chiều dọc)
// ============================================================
let currentWeekOffset = parseInt(localStorage.getItem('kanban-week-offset') || '0');

const renderWeeklyKanban = (tasks, containerId, weekOffset = null) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Use passed offset or stored offset
    if (weekOffset !== null) {
        currentWeekOffset = weekOffset;
        localStorage.setItem('kanban-week-offset', weekOffset.toString());
    }

    // Get week based on offset (0 = this week, -1 = last week, 1 = next week)
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + (currentWeekOffset * 7));

    const weekDays = [];
    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const todayStr = today.toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        weekDays.push({
            date: dateStr,
            dayName: dayNames[i],
            dayNum: d.getDate(),
            isToday: d.toDateString() === today.toDateString(),
            isPast: dateStr < todayStr  // Past date check
        });
    }

    // Get tasks outside this week or without date
    const weekDateSet = new Set(weekDays.map(d => d.date));
    const otherTasks = tasks.filter(t => !t.dueDate || !weekDateSet.has(t.dueDate));
    const weekTasks = tasks.filter(t => t.dueDate && weekDateSet.has(t.dueDate));

    // Status counts using normalized values
    const statusCounts = {
        'Chưa thực hiện': tasks.filter(t => normalizeStatus(t.status) === 'Chưa thực hiện').length,
        'Đang thực hiện': tasks.filter(t => normalizeStatus(t.status) === 'Đang thực hiện').length,
        'Chờ review': tasks.filter(t => normalizeStatus(t.status) === 'Chờ review').length,
        'Hoàn thành': tasks.filter(t => normalizeStatus(t.status) === 'Hoàn thành').length
    };
    const totalTasks = tasks.length;

    container.innerHTML = `
        <!-- Header with week nav and stats -->
        <div style="margin-bottom:15px;">
            <!-- Week Navigation -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:12px 15px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;color:white;">
                <button id="kanban-prev-week" style="padding:8px 15px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:500;">← Tuần trước</button>
                <div style="text-align:center;">
                    <h3 style="margin:0;font-size:1.1rem;">📅 Kanban Hàng Tuần ${currentWeekOffset === 0 ? '' : `(${currentWeekOffset > 0 ? '+' : ''}${currentWeekOffset})`}</h3>
                    <p style="margin:3px 0 0;opacity:0.9;font-size:0.8rem;">${monday.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })} - ${new Date(weekDays[6].date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })}</p>
                </div>
                <div style="display:flex;gap:8px;">
                    ${currentWeekOffset !== 0 ? `<button id="kanban-this-week" style="padding:8px 12px;background:white;color:#667eea;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Tuần này</button>` : ''}
                    <button id="kanban-next-week" style="padding:8px 15px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:500;">Tuần sau →</button>
                </div>
            </div>
            <!-- Stats Row with Mini Chart -->
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:#f8fafc;border-radius:8px;">
                <div style="display:flex;align-items:center;gap:15px;">
                    <span style="font-size:0.85rem;color:#6b7280;">📊 ${weekTasks.length} trong tuần | ${otherTasks.length} khác</span>
                    <!-- Mini Bar Chart -->
                    <div style="display:flex;align-items:flex-end;gap:3px;height:30px;">
                        <div title="${statusCounts['Chưa thực hiện']} Chờ" style="width:18px;background:#6b7280;border-radius:3px 3px 0 0;height:${Math.max(8, (statusCounts['Chưa thực hiện'] / Math.max(totalTasks, 1)) * 30)}px;"></div>
                        <div title="${statusCounts['Đang thực hiện']} Đang" style="width:18px;background:#3b82f6;border-radius:3px 3px 0 0;height:${Math.max(8, (statusCounts['Đang thực hiện'] / Math.max(totalTasks, 1)) * 30)}px;"></div>
                        <div title="${statusCounts['Chờ review']} Review" style="width:18px;background:#f59e0b;border-radius:3px 3px 0 0;height:${Math.max(8, (statusCounts['Chờ review'] / Math.max(totalTasks, 1)) * 30)}px;"></div>
                        <div title="${statusCounts['Hoàn thành']} Xong" style="width:18px;background:#10b981;border-radius:3px 3px 0 0;height:${Math.max(8, (statusCounts['Hoàn thành'] / Math.max(totalTasks, 1)) * 30)}px;"></div>
                    </div>
                </div>
                <div style="display:flex;gap:12px;align-items:center;">
                    <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;background:#6b7280;border-radius:2px;"></div><span style="font-size:0.7rem;">${statusCounts['Chưa thực hiện']}</span></div>
                    <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;background:#3b82f6;border-radius:2px;"></div><span style="font-size:0.7rem;">${statusCounts['Đang thực hiện']}</span></div>
                    <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;background:#f59e0b;border-radius:2px;"></div><span style="font-size:0.7rem;">${statusCounts['Chờ review']}</span></div>
                    <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;background:#10b981;border-radius:2px;"></div><span style="font-size:0.7rem;">${statusCounts['Hoàn thành']}</span></div>
                </div>
            </div>

            <!-- Charts Section (Larger) -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
                <!-- Bar Chart -->
                <div style="background:white;border-radius:10px;padding:15px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <h4 style="margin:0 0 12px 0;font-size:0.9rem;color:#374151;">📊 Phân bố Status</h4>
                    <div style="display:flex;align-items:flex-end;justify-content:space-around;height:80px;padding:10px 0;">
                        <div style="text-align:center;">
                            <div style="width:40px;background:linear-gradient(180deg,#9ca3af,#6b7280);border-radius:6px 6px 0 0;height:${Math.max(15, (statusCounts['Chưa thực hiện'] / Math.max(totalTasks, 1)) * 70)}px;margin:0 auto;"></div>
                            <span style="font-size:0.7rem;color:#6b7280;margin-top:5px;display:block;">${statusCounts['Chưa thực hiện']}</span>
                            <span style="font-size:0.6rem;color:#9ca3af;">Chờ</span>
                        </div>
                        <div style="text-align:center;">
                            <div style="width:40px;background:linear-gradient(180deg,#60a5fa,#3b82f6);border-radius:6px 6px 0 0;height:${Math.max(15, (statusCounts['Đang thực hiện'] / Math.max(totalTasks, 1)) * 70)}px;margin:0 auto;"></div>
                            <span style="font-size:0.7rem;color:#3b82f6;margin-top:5px;display:block;">${statusCounts['Đang thực hiện']}</span>
                            <span style="font-size:0.6rem;color:#9ca3af;">Đang</span>
                        </div>
                        <div style="text-align:center;">
                            <div style="width:40px;background:linear-gradient(180deg,#fbbf24,#f59e0b);border-radius:6px 6px 0 0;height:${Math.max(15, (statusCounts['Chờ review'] / Math.max(totalTasks, 1)) * 70)}px;margin:0 auto;"></div>
                            <span style="font-size:0.7rem;color:#f59e0b;margin-top:5px;display:block;">${statusCounts['Chờ review']}</span>
                            <span style="font-size:0.6rem;color:#9ca3af;">Review</span>
                        </div>
                        <div style="text-align:center;">
                            <div style="width:40px;background:linear-gradient(180deg,#34d399,#10b981);border-radius:6px 6px 0 0;height:${Math.max(15, (statusCounts['Hoàn thành'] / Math.max(totalTasks, 1)) * 70)}px;margin:0 auto;"></div>
                            <span style="font-size:0.7rem;color:#10b981;margin-top:5px;display:block;">${statusCounts['Hoàn thành']}</span>
                            <span style="font-size:0.6rem;color:#9ca3af;">Xong</span>
                        </div>
                    </div>
                </div>
                
                <!-- Progress/Stats -->
                <div style="background:white;border-radius:10px;padding:15px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <h4 style="margin:0 0 12px 0;font-size:0.9rem;color:#374151;">📈 Tổng quan tuần</h4>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:0.8rem;color:#6b7280;">Tổng task:</span>
                            <span style="font-weight:700;color:#374151;">${totalTasks}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:0.8rem;color:#6b7280;">Trong tuần:</span>
                            <span style="font-weight:600;color:#3b82f6;">${weekTasks.length}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:0.8rem;color:#6b7280;">Hoàn thành:</span>
                            <span style="font-weight:600;color:#10b981;">${statusCounts['Hoàn thành']} (${totalTasks > 0 ? Math.round(statusCounts['Hoàn thành'] / totalTasks * 100) : 0}%)</span>
                        </div>
                        <!-- Progress bar -->
                        <div style="margin-top:5px;">
                            <div style="height:10px;background:#e5e7eb;border-radius:5px;overflow:hidden;">
                                <div style="height:100%;background:linear-gradient(90deg,#10b981,#34d399);width:${totalTasks > 0 ? (statusCounts['Hoàn thành'] / totalTasks * 100) : 0}%;border-radius:5px;transition:width 0.5s;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Column Headers -->
        <div style="display:grid;grid-template-columns:80px repeat(4,1fr);gap:8px;margin-bottom:10px;">
            <div style="font-weight:600;color:#6b7280;text-align:center;">Ngày</div>
            ${KANBAN_COLUMNS.map(col => `
                <div style="font-weight:600;color:${col.color};text-align:center;font-size:0.9rem;">${col.title}</div>
            `).join('')}
        </div>

        <!-- Weekly Grid -->
        <div class="weekly-kanban-grid" style="display:flex;flex-direction:column;gap:8px;">
            ${weekDays.map(day => {
        const dayTasks = tasks.filter(t => t.dueDate === day.date);
        const pastStyle = day.isPast ? 'opacity:0.6;background:#f3f4f6;' : '';
        const pastLabel = day.isPast ? ' (đã qua)' : '';
        return `
                    <div class="week-row ${day.isPast ? 'past-row' : ''}" data-past="${day.isPast}" style="display:grid;grid-template-columns:80px repeat(4,1fr);gap:8px;padding:10px 0;border-bottom:1px solid #e5e7eb;${day.isToday ? 'background:#eff6ff;border-radius:8px;' : pastStyle}">
                        <!-- Day Label -->
                        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;">
                            <span style="font-weight:700;color:${day.isToday ? '#3b82f6' : day.isPast ? '#9ca3af' : '#374151'};font-size:1.1rem;">${day.dayName}</span>
                            <span style="font-size:0.85rem;color:#6b7280;">${day.dayNum}${pastLabel}</span>
                            <span style="font-size:0.7rem;color:#9ca3af;margin-top:2px;">${dayTasks.length} task</span>
                        </div>
                        
                        <!-- Status Columns -->
                        ${KANBAN_COLUMNS.map(col => {
            const colTasks = dayTasks.filter(t => normalizeStatus(t.status) === col.status);
            return `
                                <div class="kanban-column ${day.isPast ? 'past-column' : ''}" data-status="${col.status}" data-date="${day.date}" data-past="${day.isPast}"
                                     style="min-height:80px;background:${day.isPast ? '#e5e7eb50' : col.status === 'Hoàn thành' ? '#dcfce720' : '#f8fafc'};border-radius:8px;padding:8px;border:2px dashed transparent;transition:all 0.2s;${day.isPast ? 'cursor:not-allowed;' : ''}"
                                     ${day.isPast ? '' : `onmouseover="this.style.borderColor='${col.color}40'" onmouseout="this.style.borderColor='transparent'"`}>
                                    <div class="kanban-cards" style="display:flex;flex-direction:column;gap:6px;">
                                        ${colTasks.map(task => `
                                            <div class="kanban-card" draggable="true" data-id="${task.id}"
                                                 style="background:white;padding:8px;border-radius:6px;font-size:0.8rem;
                                                        box-shadow:0 1px 3px rgba(0,0,0,0.1);cursor:grab;
                                                        border-left:3px solid ${task.priority === 'high' || task.priority === 'Cao' ? '#ef4444' : '#f59e0b'};">
                                                <div style="font-weight:500;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${task.title || task.name || 'Untitled'}</div>
                                                ${task.estimatedMinutes ? `<span style="font-size:0.65rem;color:#6b7280;">⏱️ ${task.estimatedMinutes}p</span>` : ''}
                                            </div>
                                        `).join('') || ''}
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                `;
    }).join('')}

            <!-- Other Tasks Row (no date or outside week) -->
            ${otherTasks.length > 0 ? `
                <div class="week-row" style="display:grid;grid-template-columns:80px repeat(4,1fr);gap:8px;padding:10px 0;border-top:2px solid #fbbf24;background:#fef3c7;border-radius:8px;margin-top:10px;">
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;">
                        <span style="font-weight:700;color:#d97706;font-size:0.9rem;">📦 Khác</span>
                        <span style="font-size:0.65rem;color:#92400e;margin-top:2px;">${otherTasks.length} task</span>
                    </div>
                    ${KANBAN_COLUMNS.map(col => {
        const colTasks = otherTasks.filter(t => normalizeStatus(t.status) === col.status);
        return `
                            <div class="kanban-column" data-status="${col.status}" data-date=""
                                 style="min-height:60px;background:#fffbeb;border-radius:8px;padding:8px;border:2px dashed transparent;"
                                 onmouseover="this.style.borderColor='${col.color}'" onmouseout="this.style.borderColor='transparent'">
                                <div class="kanban-cards" style="display:flex;flex-direction:column;gap:6px;">
                                    ${colTasks.map(task => `
                                        <div class="kanban-card" draggable="true" data-id="${task.id}"
                                             style="background:white;padding:8px;border-radius:6px;font-size:0.8rem;box-shadow:0 1px 3px rgba(0,0,0,0.1);cursor:grab;border-left:3px solid #f59e0b;">
                                            <div style="font-weight:500;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${task.title || task.name || 'Untitled'}</div>
                                            <span style="font-size:0.6rem;color:#92400e;">${task.dueDate || 'Không có ngày'}</span>
                                        </div>
                                    `).join('') || ''}
                                </div>
                            </div>
                        `;
    }).join('')}
                </div>
            ` : ''}
        </div>

        <!-- Legend -->
        <div style="margin-top:15px;padding:10px;background:#f8fafc;border-radius:8px;font-size:0.75rem;color:#6b7280;">
            💡 Kéo thả task giữa các ô để thay đổi ngày và trạng thái | 📦 Khác = Task không có deadline hoặc ngoài tuần này
        </div>
    `;

    // Setup drag and drop
    setupKanbanDragDrop(container);

    // Setup week navigation
    container.querySelector('#kanban-prev-week')?.addEventListener('click', () => {
        renderWeeklyKanban(tasks, containerId, currentWeekOffset - 1);
    });
    container.querySelector('#kanban-next-week')?.addEventListener('click', () => {
        renderWeeklyKanban(tasks, containerId, currentWeekOffset + 1);
    });
    container.querySelector('#kanban-this-week')?.addEventListener('click', () => {
        renderWeeklyKanban(tasks, containerId, 0);
    });

    // Listen for kanban refresh events (auto-update after drag-drop)
    const refreshHandler = (e) => {
        if (e.detail?.tasks) {
            renderWeeklyKanban(e.detail.tasks, containerId);
        }
    };
    window.removeEventListener('kanban-refresh', refreshHandler); // Prevent duplicates
    window.addEventListener('kanban-refresh', refreshHandler);
};

// ============================================================
// #16 - TIMELINE VIEW (Vertical Timeline)
// ============================================================
const renderTimelineView = (items, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Separate Items: Upcoming vs Past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = [];
    const past = [];

    items.forEach(item => {
        const d = new Date(item.date || item.dueDate);
        if (d >= today) {
            upcoming.push(item);
        } else {
            past.push(item);
        }
    });

    // 2. Sort: Upcoming ASC (Nearest first), Past DESC (Nearest past first)
    upcoming.sort((a, b) => new Date(a.date || a.dueDate) - new Date(b.date || b.dueDate));
    past.sort((a, b) => new Date(b.date || b.dueDate) - new Date(a.date || a.dueDate));

    const sortedItems = [...upcoming, ...past];

    // Helper: Format Date DD/MM/YYYY
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Không có ngày';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    container.innerHTML = `
        <div class="timeline" style="position:relative;padding-left:30px;padding-top:10px;">
            <div style="position:absolute;left:10px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,#667eea,#764ba2);"></div>
            
            ${sortedItems.length === 0 ? '<p style="color:#9ca3af;font-style:italic;">Chưa có hoạt động nào.</p>' : ''}

            ${sortedItems.map((item, i) => {
        const dateRaw = new Date(item.date || item.dueDate);
        const isPast = dateRaw < today;
        const isToday = dateRaw.toDateString() === today.toDateString();

        return `
                <div class="timeline-item" style="position:relative;padding:15px 0 15px 25px;
                            ${i < sortedItems.length - 1 ? 'border-bottom:1px dashed #e5e7eb;' : ''}
                            ${isPast ? 'opacity:0.6;' : ''}">
                    
                    <!-- Centered Dot on Line -->
                    <div style="position:absolute;left:-25px;top:50%;transform:translateY(-50%);
                                width:12px;height:12px;
                                background:${item.status === 'Hoàn thành' ? '#10b981' : isToday ? '#f59e0b' : '#667eea'};
                                border-radius:50%;border:2px solid white;box-shadow:0 0 0 2px ${item.status === 'Hoàn thành' ? '#10b981' : isToday ? '#f59e0b' : '#667eea'};
                                z-index:2;">
                    </div>

                    <div style="font-size:0.75rem;color:${isToday ? '#f59e0b' : '#6b7280'};font-weight:${isToday ? 'bold' : 'normal'};margin-bottom:4px;">
                        📅 ${formatDate(item.date || item.dueDate)} ${isToday ? '(Hôm nay)' : ''}
                    </div>
                    
                    <div style="font-weight:600;color:#1f2937;font-size:1rem;margin-bottom:4px;">
                        ${item.title || item.name}
                    </div>
                    
                    ${item.description || item.notes ?
                `<div style="font-size:0.85rem;color:#6b7280;line-height:1.4;">
                            ${(item.description || item.notes).substring(0, 100)}...
                        </div>` : ''}

                    ${item.status ? `
                        <div style="margin-top:5px;">
                            <span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;
                                         background:${item.status === 'Hoàn thành' ? '#d1fae5' : '#e0e7ff'};
                                         color:${item.status === 'Hoàn thành' ? '#065f46' : '#3730a3'};">
                                ${item.status}
                            </span>
                        </div>
                    `: ''}
                </div>
            `}).join('')}
        </div>
    `;
};

// ============================================================
// #36 - CUSTOM CSS EDITOR
// ============================================================
const showCustomCSSEditor = () => {
    const savedCSS = localStorage.getItem('custom-css') || '';

    const modal = document.createElement('div');
    modal.id = 'css-editor-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;width:90%;max-width:600px;overflow:hidden;">
            <div style="padding:20px;background:linear-gradient(135deg,#1e293b,#334155);color:white;">
                <h3 style="margin:0;">🎨 Custom CSS Editor</h3>
            </div>
            <div style="padding:20px;">
                <textarea id="custom-css-input" style="width:100%;height:300px;font-family:monospace;
                          padding:15px;border:1px solid #e5e7eb;border-radius:8px;resize:vertical;
                          background:#1e293b;color:#22d3ee;">${savedCSS}</textarea>
                <div style="display:flex;gap:10px;margin-top:15px;">
                    <button id="btn-apply-css" style="flex:1;padding:12px;background:#10b981;color:white;
                            border:none;border-radius:8px;cursor:pointer;">✅ Áp dụng</button>
                    <button id="btn-reset-css" style="padding:12px 20px;background:#f3f4f6;
                            border:none;border-radius:8px;cursor:pointer;">🔄 Reset</button>
                    <button id="btn-close-css" style="padding:12px 20px;background:#f3f4f6;
                            border:none;border-radius:8px;cursor:pointer;">❌ Đóng</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#custom-css-input');

    modal.querySelector('#btn-apply-css').onclick = () => {
        applyCustomCSS(input.value);
        localStorage.setItem('custom-css', input.value);
        showNotification('Đã áp dụng CSS!');
    };

    modal.querySelector('#btn-reset-css').onclick = () => {
        input.value = '';
        applyCustomCSS('');
        localStorage.removeItem('custom-css');
        showNotification('Đã reset CSS!');
    };

    modal.querySelector('#btn-close-css').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

const applyCustomCSS = (css) => {
    let styleEl = document.getElementById('custom-user-css');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-user-css';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
};

const loadCustomCSS = () => {
    const saved = localStorage.getItem('custom-css');
    if (saved) applyCustomCSS(saved);
};

// ============================================================
// #7 - SIDEBAR COLLAPSE (Thu gọn sidebar)
// ============================================================
let sidebarCollapsed = false;

const setupSidebarCollapse = () => {
    const btn = document.getElementById('btn-collapse-sidebar');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (!btn || !sidebar) return;

    // Load saved state
    sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent?.classList.add('sidebar-collapsed');
        btn.textContent = '▶';
    }

    btn.addEventListener('click', () => {
        sidebarCollapsed = !sidebarCollapsed;

        if (sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent?.classList.add('sidebar-collapsed');
            btn.textContent = '▶';
        } else {
            sidebar.classList.remove('collapsed');
            mainContent?.classList.remove('sidebar-collapsed');
            btn.textContent = '◀';
        }

        localStorage.setItem('sidebar-collapsed', sidebarCollapsed);
    });

    // Add CSS for collapse
    addCollapsibleStyles();
};

const addCollapsibleStyles = () => {
    if (document.getElementById('sidebar-collapse-styles')) return;

    const style = document.createElement('style');
    style.id = 'sidebar-collapse-styles';
    style.textContent = `
        .sidebar.collapsed {
            width: 70px !important;
            overflow: hidden;
        }
        .sidebar.collapsed .sidebar-header > *:not(#btn-collapse-sidebar) {
            display: none !important;
        }
        .sidebar.collapsed .nav-menu .nav-btn,
        .sidebar.collapsed .nav-menu .nav-group-toggle {
            font-size: 0 !important;
            padding: 12px !important;
        }
        .sidebar.collapsed .nav-menu .nav-btn::before,
        .sidebar.collapsed .nav-menu .nav-group-toggle::before {
            font-size: 1.2rem !important;
        }
        .sidebar.collapsed .sidebar-footer,
        .sidebar.collapsed .nav-submenu,
        .sidebar.collapsed .info-widget {
            display: none !important;
        }
        .main-content.sidebar-collapsed {
            margin-left: 70px !important;
        }
    `;
    document.head.appendChild(style);
};

// ============================================================
// #54 - VOICE INPUT (Nhập bằng giọng nói)
// ============================================================
const startVoiceInput = (targetInputId, callback) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification('Trình duyệt không hỗ trợ nhập giọng nói!', 'error');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        showNotification('🎤 Đang nghe... Hãy nói!', 'info');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById(targetInputId);
        if (input) {
            input.value = transcript;
            input.focus();
        }
        if (callback) callback(transcript);
        showNotification(`Đã nhận: "${transcript}"`, 'success');
    };

    recognition.onerror = (event) => {
        showNotification('Lỗi nhận giọng nói: ' + event.error, 'error');
    };

    recognition.start();
    return recognition;
};

// ============================================================
// #2 - DARK MODE 2.0 (Auto-switch by time)
// ============================================================
const initDarkMode2 = () => {
    const savedMode = localStorage.getItem('dark-mode');
    const autoSwitch = localStorage.getItem('dark-mode-auto') === 'true';

    if (autoSwitch) {
        const hour = new Date().getHours();
        const isDark = hour >= 19 || hour < 6; // 7PM - 6AM
        document.body.classList.toggle('dark-theme', isDark);
    } else if (savedMode === 'dark') {
        document.body.classList.add('dark-theme');
    }
};

const toggleDarkMode = (auto = false) => {
    if (auto) {
        const current = localStorage.getItem('dark-mode-auto') === 'true';
        localStorage.setItem('dark-mode-auto', !current);
        showNotification(`Dark Mode Auto: ${!current ? 'BẬT' : 'TẮT'}`);
        initDarkMode2();
    } else {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('dark-mode', isDark ? 'dark' : 'light');
        showNotification(`Dark Mode: ${isDark ? 'BẬT' : 'TẮT'}`);
    }
};

// ============================================================
// #53 - AUTOCOMPLETE (Gợi ý câu khi gõ)
// ============================================================
const setupAutocomplete = (inputId, suggestions) => {
    const input = document.getElementById(inputId);
    if (!input) return;

    const container = document.createElement('div');
    container.className = 'autocomplete-container';
    container.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
    `;
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(container);

    input.addEventListener('input', () => {
        const value = input.value.toLowerCase().trim();
        if (value.length < 2) {
            container.style.display = 'none';
            return;
        }

        const matches = suggestions.filter(s =>
            s.toLowerCase().includes(value)
        ).slice(0, 5);

        if (matches.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = matches.map(m => `
            <div class="autocomplete-item" style="padding:10px 15px;cursor:pointer;border-bottom:1px solid #f3f4f6;"
                 onmouseover="this.style.background='#f3f4f6'"
                 onmouseout="this.style.background='white'">
                ${m}
            </div>
        `).join('');
        container.style.display = 'block';

        container.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.textContent.trim();
                container.style.display = 'none';
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !container.contains(e.target)) {
            container.style.display = 'none';
        }
    });
};

// ============================================================
// SETUP EVENT LISTENERS CHO BUTTONS MỚI
// ============================================================

const setupThemeButtons = () => {
    // Dùng event delegation để bắt click từ theme buttons
    document.addEventListener('click', (e) => {
        const themeBtn = e.target.closest('.theme-btn[data-theme]');
        if (themeBtn) {
            const theme = themeBtn.dataset.theme;
            applyTheme(theme);

            // Visual feedback
            document.querySelectorAll('.theme-btn').forEach(b => {
                b.style.transform = 'scale(1)';
                b.style.boxShadow = 'none';
            });
            themeBtn.style.transform = 'scale(1.05)';
            themeBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        }

        // Custom CSS button
        if (e.target.id === 'btn-custom-css-settings') {
            showCustomCSSEditor();
        }
    });
};

const setupCalendarViewButtons = () => {
    document.querySelectorAll('.view-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;

            // Update active state
            document.querySelectorAll('.view-btn').forEach(b => {
                b.style.background = 'transparent';
                b.style.color = '#4b5563';
            });
            btn.style.background = '#667eea';
            btn.style.color = 'white';

            // Dispatch event for calendar-views.js to handle
            window.dispatchEvent(new CustomEvent('calendar-view-change', { detail: { view } }));

            showNotification(`Chuyển sang view: ${view}`);
        });
    });
};

const setupAutoDarkToggle = () => {
    const toggle = document.getElementById('toggle-auto-dark');
    if (!toggle) return;

    // Load saved state
    toggle.checked = localStorage.getItem('dark-mode-auto') === 'true';

    toggle.addEventListener('change', () => {
        localStorage.setItem('dark-mode-auto', toggle.checked);
        if (toggle.checked) {
            initDarkMode2();
            showNotification('Auto Dark Mode: BẬT (7PM-6AM)');
        } else {
            showNotification('Auto Dark Mode: TẮT');
        }
    });
};

// Initialize
export const initUIEnhancements = () => {
    loadSavedTheme();
    loadCustomCSS();
    setupSidebarCollapse();
    initDarkMode2();

    // Setup buttons sau khi DOM ready
    setTimeout(() => {
        setupThemeButtons();
        setupCalendarViewButtons();
        setupAutoDarkToggle();
    }, 100);
};

// Export
export {
    THEMES,
    applyTheme,
    renderThemeSelector,
    KANBAN_COLUMNS,
    renderKanbanBoard,
    renderWeeklyKanban,
    renderTimelineView,
    showCustomCSSEditor,
    setupSidebarCollapse,
    startVoiceInput,
    toggleDarkMode,
    setupAutocomplete,
    setupThemeButtons,
    setupCalendarViewButtons
};
