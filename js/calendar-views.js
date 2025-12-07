// --- FILE: js/calendar-views.js ---
// Calendar Views - Phase C
// #93 Month View, #94 Year View, #95 List View, #98 Drag Resize

import { showNotification, escapeHTML } from './common.js';

let globalData = null;
let currentUser = null;
let currentView = 'week'; // week, month, year, list
let currentDate = new Date();

/**
 * Khởi tạo Calendar Views
 */
export const initCalendarViews = (data, user) => {
    globalData = data;
    currentUser = user;
    setupViewToggleButtons();

    // Lắng nghe event từ view buttons trong ui-enhancements.js
    window.addEventListener('calendar-view-change', (e) => {
        const view = e.detail?.view;
        if (view) {
            handleViewChange(view);
        }
    });
};

/**
 * Xử lý thay đổi view từ buttons
 */
const handleViewChange = (view) => {
    currentView = view;
    const container = document.getElementById('week-view-container') ||
        document.getElementById('calendar-body') ||
        document.querySelector('.calendar-grid-container');

    if (!container) {
        console.log('Calendar container not found');
        return;
    }

    switch (view) {
        case 'month':
            renderMonthView(container);
            break;
        case 'year':
            renderYearView(container);
            break;
        case 'list':
            renderListView(container);
            break;
        case 'kanban':
            // Import from ui-enhancements
            const tasks = globalData?.tasks || [];
            import('./ui-enhancements.js').then(m => {
                m.renderKanbanBoard(tasks, container.id || 'calendar-container');
            });
            break;
        case 'timeline':
            const events = globalData?.calendarEvents || [];
            const allTasks = globalData?.tasks || [];
            import('./ui-enhancements.js').then(m => {
                m.renderTimelineView([...events, ...allTasks], container.id || 'calendar-container');
            });
            break;
        case 'week':
        default:
            if (window.renderCalendar) window.renderCalendar();
            break;
    }
};

/**
 * Setup view toggle buttons
 */
const setupViewToggleButtons = () => {
    document.querySelectorAll('[data-calendar-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.calendarView;
            switchView(view);
        });
    });
};

/**
 * Switch calendar view
 */
const switchView = (view) => {
    currentView = view;

    // Update active button
    document.querySelectorAll('[data-calendar-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.calendarView === view);
    });

    // Render appropriate view
    const container = document.getElementById('calendar-container') || document.getElementById('calendar-body');
    if (!container) return;

    switch (view) {
        case 'month':
            renderMonthView(container);
            break;
        case 'year':
            renderYearView(container);
            break;
        case 'list':
            renderListView(container);
            break;
        default:
            // Week view is default, handled by work.js
            if (window.renderCalendar) window.renderCalendar();
    }
};

// ============================================================
// #93 - MONTH VIEW
// ============================================================
const renderMonthView = (container) => {
    const events = globalData?.calendarEvents || [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // Build calendar grid
    let html = `
        <div class="month-view">
            <div class="month-header" style="display:flex;justify-content:space-between;align-items:center;padding:15px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:12px 12px 0 0;">
                <button id="prev-month" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:8px 15px;border-radius:8px;cursor:pointer;">← Trước</button>
                <h3 style="margin:0;">${monthNames[month]} ${year}</h3>
                <button id="next-month" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:8px 15px;border-radius:8px;cursor:pointer;">Sau →</button>
            </div>
            <div class="month-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:#e5e7eb;border:1px solid #e5e7eb;border-radius:0 0 12px 12px;overflow:hidden;">
                ${dayNames.map(d => `<div style="background:#f3f4f6;padding:10px;text-align:center;font-weight:600;color:#4b5563;">${d}</div>`).join('')}
    `;

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<div style="background:white;padding:10px;min-height:80px;"></div>`;
    }

    // Days
    const today = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = events.filter(e => e.date === dateStr);
        const isToday = dateStr === today;

        html += `
            <div class="month-day ${isToday ? 'today' : ''}" data-date="${dateStr}" 
                 style="background:${isToday ? '#eff6ff' : 'white'};padding:8px;min-height:80px;cursor:pointer;transition:background 0.2s;"
                 onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='${isToday ? '#eff6ff' : 'white'}'">
                <div style="font-weight:${isToday ? '700' : '500'};color:${isToday ? '#3b82f6' : '#1f2937'};margin-bottom:5px;">${day}</div>
                ${dayEvents.slice(0, 3).map(e => `
                    <div style="font-size:0.7rem;background:${e.color || '#667eea'};color:white;padding:2px 5px;border-radius:3px;margin:2px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHTML(e.title)}
                    </div>
                `).join('')}
                ${dayEvents.length > 3 ? `<div style="font-size:0.65rem;color:#6b7280;">+${dayEvents.length - 3} more</div>` : ''}
            </div>
        `;
    }

    html += `</div></div>`;
    container.innerHTML = html;

    // Navigation events
    container.querySelector('#prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderMonthView(container);
    });
    container.querySelector('#next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderMonthView(container);
    });

    // Day click events
    container.querySelectorAll('.month-day').forEach(el => {
        el.addEventListener('click', () => {
            const date = el.dataset.date;
            showNotification(`Đã chọn ngày ${date}`);
            // Could open add event modal here
        });
    });
};

// ============================================================
// #94 - YEAR VIEW
// ============================================================
const renderYearView = (container) => {
    const events = globalData?.calendarEvents || [];
    const year = currentDate.getFullYear();
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

    let html = `
        <div class="year-view">
            <div class="year-header" style="display:flex;justify-content:space-between;align-items:center;padding:15px;background:linear-gradient(135deg,#10b981,#059669);color:white;border-radius:12px;margin-bottom:15px;">
                <button id="prev-year" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:8px 15px;border-radius:8px;cursor:pointer;">← ${year - 1}</button>
                <h3 style="margin:0;">📅 Năm ${year}</h3>
                <button id="next-year" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:8px 15px;border-radius:8px;cursor:pointer;">${year + 1} →</button>
            </div>
            <div class="year-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;">
    `;

    for (let month = 0; month < 12; month++) {
        const monthEvents = events.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        html += `
            <div class="mini-month" data-month="${month}" 
                 style="background:white;border-radius:12px;padding:15px;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;transition:all 0.2s;"
                 onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 15px rgba(0,0,0,0.15)'"
                 onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                <div style="font-weight:600;color:#1f2937;margin-bottom:8px;">${monthNames[month]}</div>
                <div style="display:flex;align-items:center;gap:5px;">
                    <span style="font-size:1.5rem;font-weight:700;color:${monthEvents.length > 0 ? '#10b981' : '#9ca3af'};">${monthEvents.length}</span>
                    <span style="font-size:0.75rem;color:#6b7280;">sự kiện</span>
                </div>
                ${monthEvents.length > 0 ? `
                    <div style="margin-top:8px;font-size:0.7rem;color:#6b7280;">
                        ${monthEvents.slice(0, 2).map(e => escapeHTML(e.title).substring(0, 15) + '...').join('<br>')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    html += `</div></div>`;
    container.innerHTML = html;

    // Navigation
    container.querySelector('#prev-year')?.addEventListener('click', () => {
        currentDate.setFullYear(currentDate.getFullYear() - 1);
        renderYearView(container);
    });
    container.querySelector('#next-year')?.addEventListener('click', () => {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        renderYearView(container);
    });

    // Month click
    container.querySelectorAll('.mini-month').forEach(el => {
        el.addEventListener('click', () => {
            currentDate.setMonth(parseInt(el.dataset.month));
            switchView('month');
        });
    });
};

// ============================================================
// #95 - LIST VIEW
// ============================================================
const renderListView = (container) => {
    const events = globalData?.calendarEvents || [];
    const tasks = globalData?.tasks || [];

    // Combine and sort by date
    const items = [
        ...events.map(e => ({ ...e, type: 'event', date: e.date })),
        ...tasks.map(t => ({ ...t, type: 'task', date: t.dueDate, title: t.name }))
    ].filter(i => i.date).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by date
    const grouped = {};
    items.forEach(item => {
        if (!grouped[item.date]) grouped[item.date] = [];
        grouped[item.date].push(item);
    });

    const today = new Date().toISOString().split('T')[0];

    let html = `
        <div class="list-view">
            <div style="padding:15px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border-radius:12px;margin-bottom:15px;">
                <h3 style="margin:0;">📋 Danh sách sự kiện & công việc</h3>
                <p style="margin:5px 0 0;opacity:0.9;font-size:0.9rem;">${items.length} items</p>
            </div>
            <div class="list-items" style="display:flex;flex-direction:column;gap:10px;">
    `;

    Object.entries(grouped).forEach(([date, dayItems]) => {
        const isPast = date < today;
        const isToday = date === today;
        const dateObj = new Date(date);
        const dateStr = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

        html += `
            <div class="list-date-group" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);${isPast ? 'opacity:0.6;' : ''}">
                <div style="padding:12px 15px;background:${isToday ? '#3b82f6' : '#f3f4f6'};color:${isToday ? 'white' : '#374151'};font-weight:600;">
                    ${isToday ? '📌 Hôm nay - ' : ''}${dateStr}
                </div>
                <div style="padding:10px 15px;">
                    ${dayItems.map(item => `
                        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;">
                            <span style="font-size:1.2rem;">${item.type === 'event' ? '📅' : '✅'}</span>
                            <div style="flex:1;">
                                <div style="font-weight:500;color:#1f2937;">${escapeHTML(item.title)}</div>
                                ${item.startTime ? `<div style="font-size:0.8rem;color:#6b7280;">⏰ ${item.startTime}</div>` : ''}
                            </div>
                            ${item.priority ? `
                                <span style="padding:2px 8px;border-radius:10px;font-size:0.7rem;background:${item.priority === 'high' ? '#fee2e2' : item.priority === 'low' ? '#dcfce7' : '#fef9c3'};color:${item.priority === 'high' ? '#dc2626' : item.priority === 'low' ? '#16a34a' : '#ca8a04'};">
                                    ${item.priority}
                                </span>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    if (items.length === 0) {
        html += `
            <div style="text-align:center;padding:40px;color:#9ca3af;">
                <div style="font-size:3rem;margin-bottom:10px;">📭</div>
                <p>Chưa có sự kiện hoặc công việc nào</p>
            </div>
        `;
    }

    html += `</div></div>`;
    container.innerHTML = html;
};

// ============================================================
// VIEW SELECTOR UI COMPONENT
// ============================================================
export const renderViewSelector = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="view-selector" style="display:flex;gap:5px;background:#f3f4f6;padding:5px;border-radius:10px;">
            <button data-calendar-view="week" class="view-btn active" style="padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;background:${currentView === 'week' ? '#667eea' : 'transparent'};color:${currentView === 'week' ? 'white' : '#4b5563'};">
                📅 Tuần
            </button>
            <button data-calendar-view="month" class="view-btn" style="padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;background:${currentView === 'month' ? '#667eea' : 'transparent'};color:${currentView === 'month' ? 'white' : '#4b5563'};">
                📆 Tháng
            </button>
            <button data-calendar-view="year" class="view-btn" style="padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;background:${currentView === 'year' ? '#667eea' : 'transparent'};color:${currentView === 'year' ? 'white' : '#4b5563'};">
                🗓️ Năm
            </button>
            <button data-calendar-view="list" class="view-btn" style="padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;background:${currentView === 'list' ? '#667eea' : 'transparent'};color:${currentView === 'list' ? 'white' : '#4b5563'};">
                📋 List
            </button>
        </div>
    `;

    setupViewToggleButtons();
};

// Export
export {
    switchView,
    renderMonthView,
    renderYearView,
    renderListView
};
