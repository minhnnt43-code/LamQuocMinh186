/**
 * VIEW-WORK.JS
 * LANDING PAGE CÔNG KHAI - AI VÀO CŨNG XEM ĐƯỢC (KHÔNG CẦN ĐĂNG NHẬP)
 * Chỉ có quyền ĐỌC, không có quyền sửa/xóa
 */

// ===== CẤU HÌNH CHỦ SỞ HỮU =====
// ⚠️ QUAN TRỌNG: Thay UID này bằng UID Firebase của bạn
// Để lấy UID: Đăng nhập vào index.html > F12 > Console > gõ: firebase.auth().currentUser.uid
const OWNER_UID = '5a6YielwJJYFwB2DyFfUB9DVQXR2';  // UID của Lâm Quốc Minh

// ===== GLOBAL STATE =====
let globalData = {
    tasks: [],
    calendarEvents: [],
    projects: []
};

const ownerInfo = {
    name: 'Lâm Quốc Minh',
    uid: OWNER_UID,
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user'
};

let currentDate = new Date();
let currentView = 'month';

// ===== DOM READY - LOAD NGAY KHÔNG CẦN ĐĂNG NHẬP =====
document.addEventListener('DOMContentLoaded', async () => {
    // Load data trực tiếp từ UID của chủ sở hữu - KHÔNG CẦN AUTH
    await loadData();
    initApp();

    // Listen for realtime updates
    setupRealtimeListener();
});

// ===== LOAD DATA TỪ FIREBASE (PUBLIC READ) =====
async function loadData() {
    try {
        const db = firebase.firestore();
        const docRef = db.collection('users').doc(OWNER_UID);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            globalData.tasks = data.tasks || [];
            globalData.calendarEvents = data.calendarEvents || [];
            globalData.projects = data.projects || [];

            // Get owner profile if exists
            if (data.profile) {
                if (data.profile.name) ownerInfo.name = data.profile.name;
                if (data.profile.bio) ownerInfo.bio = data.profile.bio;
            }

            // Get avatar from settings (where it's actually stored)
            if (data.settings && data.settings.customAvatarUrl) {
                ownerInfo.avatarUrl = data.settings.customAvatarUrl;
            }
        } else {
            console.log('No data found for owner');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        // Show error but don't block the page
        document.getElementById('loading-spinner').innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
                <h3>Không thể tải dữ liệu</h3>
                <p style="opacity: 0.8; margin-top: 8px;">Vui lòng kiểm tra Firebase Rules</p>
            </div>
        `;
    }
}

// ===== INIT APP =====
function initApp() {
    // Hide loading, show app
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';

    // Set owner info
    document.getElementById('user-name').textContent = ownerInfo.name;

    // Set avatar
    const avatarEl = document.getElementById('owner-avatar');
    if (avatarEl && ownerInfo.avatarUrl) {
        avatarEl.src = ownerInfo.avatarUrl;
        avatarEl.onerror = () => avatarEl.src = 'https://lh3.googleusercontent.com/a/default-user';
    }

    // Bio is hardcoded in HTML - no need to override

    // Setup navigation
    setupNavigation();

    // Setup time display
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // Setup calendar controls
    setupCalendarControls();

    // Setup search & filter
    setupSearchFilter();

    // Setup modal
    setupModal();

    // Render all sections
    renderOverview();
    renderCalendar();
    renderTaskList();
}

// ===== NAVIGATION =====
function setupNavigation() {
    const buttons = document.querySelectorAll('.work-nav-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;

            // Update active button
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show section
            document.querySelectorAll('.work-section').forEach(s => s.classList.remove('active'));
            document.getElementById(section)?.classList.add('active');
        });
    });
}

// ===== TIME DISPLAY =====
function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('current-time').textContent = timeStr;

    // Custom Vietnamese date format: thứ Hai, ngày 02 tháng 02 năm 2026
    const weekdays = ['Chủ nhật', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
    const dayOfWeek = now.getDay();
    const dayName = dayOfWeek === 0 ? 'Chủ nhật' : `thứ ${weekdays[dayOfWeek]}`;

    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Days 01-09 have leading zero
    const dayStr = day < 10 ? `0${day}` : day;

    // Months 01-02 have leading zero, 3+ no leading zero
    const monthStr = month <= 2 ? (month < 10 ? `0${month}` : month) : month;

    const dateStr = `${dayName}, ngày ${dayStr} tháng ${monthStr} năm ${year}`;
    document.getElementById('today-date').textContent = dateStr;
}

// ===== RENDER OVERVIEW =====
function renderOverview() {
    const today = new Date().toISOString().split('T')[0];
    const tasks = globalData.tasks || [];

    // Today's task count
    const todayTasks = tasks.filter(t =>
        (t.scheduledDate === today || t.dueDate === today) && t.status !== 'Hoàn thành'
    );
    document.getElementById('today-task-count').textContent = todayTasks.length;

    // Stats
    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'Hoàn thành').length;
    const doing = tasks.filter(t => t.status === 'Đang thực hiện').length;

    // Due soon (next 3 days)
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const dueSoon = tasks.filter(t => {
        if (t.status === 'Hoàn thành') return false;
        const due = new Date(t.dueDate);
        return due >= new Date() && due <= threeDaysLater;
    }).length;

    // Done this week
    const weekStart = getWeekStart(new Date());
    const doneThisWeek = tasks.filter(t => {
        if (t.status !== 'Hoàn thành') return false;
        const completedDate = t.completedDate ? new Date(t.completedDate) : null;
        return completedDate && completedDate >= weekStart;
    }).length;

    // Calculate completion percentage
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Update progress ring
    const progressCircle = document.getElementById('progress-circle');
    const progressValue = document.getElementById('progress-value');
    if (progressCircle && progressValue) {
        const circumference = 264; // 2 * PI * 42
        const offset = circumference - (progressPercent / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
        progressValue.textContent = progressPercent;
    }



    document.getElementById('stat-high').textContent = highPriority;
    document.getElementById('stat-doing').textContent = doing;
    document.getElementById('stat-due').textContent = dueSoon;
    document.getElementById('stat-done').textContent = doneThisWeek;

    // Render today's tasks
    const todayContainer = document.getElementById('today-tasks');
    if (todayTasks.length === 0) {
        todayContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎉</div>
                <h4>Không có việc hôm nay!</h4>
                <p>Hãy tận hưởng ngày của bạn</p>
            </div>
        `;
    } else {
        todayContainer.innerHTML = todayTasks.map(t => createTaskItemHTML(t)).join('');
    }

    // Render upcoming tasks (next 7 days, excluding today)
    const upcomingContainer = document.getElementById('upcoming-tasks');
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const upcomingTasks = tasks
        .filter(t => {
            if (t.status === 'Hoàn thành') return false;
            const date = t.scheduledDate || t.dueDate;
            if (!date) return false;
            const d = new Date(date);
            return d > new Date(today) && d <= sevenDaysLater;
        })
        .sort((a, b) => new Date(a.dueDate || a.scheduledDate) - new Date(b.dueDate || b.scheduledDate))
        .slice(0, 5);

    if (upcomingTasks.length === 0) {
        upcomingContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h4>Không có việc sắp tới</h4>
            </div>
        `;
    } else {
        upcomingContainer.innerHTML = upcomingTasks.map(t => createTaskItemHTML(t)).join('');
    }

    // Add click handlers
    todayContainer.querySelectorAll('.task-item').forEach(item => {
        item.addEventListener('click', () => openTaskModal(item.dataset.taskId));
    });
    upcomingContainer.querySelectorAll('.task-item').forEach(item => {
        item.addEventListener('click', () => openTaskModal(item.dataset.taskId));
    });
}

// ===== RENDER CALENDAR =====
function setupCalendarControls() {
    document.getElementById('cal-prev').addEventListener('click', () => {
        if (currentView === 'week') {
            currentDate.setDate(currentDate.getDate() - 7);
        } else {
            currentDate.setMonth(currentDate.getMonth() - 1);
        }
        renderCalendar();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
        if (currentView === 'week') {
            currentDate.setDate(currentDate.getDate() + 7);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        renderCalendar();
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            renderCalendar();
        });
    });
}

function renderCalendar() {
    if (currentView === 'week') {
        renderWeekCalendar();
    } else {
        renderMonthCalendar();
    }
}

function renderMonthCalendar() {
    const grid = document.getElementById('calendar-grid');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update title
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    document.getElementById('cal-month-year').textContent = `${monthNames[month]}, ${year}`;

    // Build calendar
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() || 7; // Monday = 1
    const daysInMonth = lastDay.getDate();

    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date().toISOString().split('T')[0];

    let html = `
        <div class="cal-weekdays">
            ${weekdays.map(d => `<div class="cal-weekday">${d}</div>`).join('')}
        </div>
        <div class="cal-days">
    `;

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevDays = prevMonth.getDate();
    for (let i = startDay - 1; i > 0; i--) {
        const day = prevDays - i + 1;
        html += `<div class="cal-day other-month"><div class="cal-day-number">${day}</div></div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === today;
        const dayTasks = getTasksForDate(dateStr);
        const dayEvents = getEventsForDate(dateStr);

        html += `
            <div class="cal-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
                <div class="cal-day-number">${day}</div>
                <div class="cal-events">
                    ${dayTasks.slice(0, 3).map(t => `
                        <div class="cal-event priority-${t.priority || 'medium'}" 
                             data-task-id="${t.id}" 
                             title="${escapeHTML(t.name)}">
                            ${escapeHTML(t.name)}
                        </div>
                    `).join('')}
                    ${dayEvents.slice(0, 2).map(e => `
                        <div class="cal-event" 
                             style="background: ${e.color}20; color: ${e.color};"
                             title="${escapeHTML(e.title)}">
                            ${escapeHTML(e.title)}
                        </div>
                    `).join('')}
                    ${(dayTasks.length + dayEvents.length) > 4 ?
                `<div class="cal-event" style="background:#f1f5f9;color:#64748b;">+${(dayTasks.length + dayEvents.length) - 4} thêm</div>` : ''}
                </div>
            </div>
        `;
    }

    // Next month days
    const totalCells = Math.ceil((startDay - 1 + daysInMonth) / 7) * 7;
    const nextDays = totalCells - (startDay - 1 + daysInMonth);
    for (let i = 1; i <= nextDays; i++) {
        html += `<div class="cal-day other-month"><div class="cal-day-number">${i}</div></div>`;
    }

    html += '</div>';
    grid.innerHTML = html;
    addEventHandlers(grid);
}

function renderWeekCalendar() {
    const grid = document.getElementById('calendar-grid');

    const currentDay = currentDate.getDay(); // 0=Sun
    const startOfCurrentWeek = new Date(currentDate);
    startOfCurrentWeek.setDate(currentDate.getDate() - currentDay);

    const weekStart = new Date(startOfCurrentWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Update Title
    document.getElementById('cal-month-year').textContent =
        `Tuần ${formatDateRefined(weekStart)} - ${formatDateRefined(weekEnd)}`;

    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date().toISOString().split('T')[0];

    // 1. Build Header
    let html = `
        <div class="week-view-container">
            <div class="week-grid-header">
                <div class="time-col-header"></div>
                <div class="days-header-container">
    `;

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        weekDates.push(new Date(d)); // Store copy

        // Manual Date String Construction to avoid Timezone issues
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const dayNum = d.getDate();
        const isToday = dateStr === today;

        html += `
            <div class="week-header-cell ${isToday ? 'today' : ''}">
                <div class="day-name">${weekdays[i]}</div>
                <div class="day-date">${dayNum}</div>
            </div>
        `;
    }
    html += `</div></div>`; // Close header parts

    // 2. Build Body
    html += `
        <div class="week-grid-body">
            <div class="time-column">
                ${Array.from({ length: 24 }, (_, i) =>
        `<div class="time-slot-label">${i}:00</div>`
    ).join('')}
            </div>
            
            <div class="week-events-grid">
                <!-- Current Time Indicator -->
                <div id="current-time-line" class="current-time-line" style="display:none;">
                    <div class="time-dot"></div>
                </div>
    `;

    // 3. Render Columns and Events
    for (let i = 0; i < 7; i++) {
        const d = weekDates[i];

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        // Determine isToday for column background
        const isToday = dateKey === today;

        const dayTasks = getTasksForDate(dateKey);
        const dayEvents = getEventsForDate(dateKey);

        html += `<div class="day-column ${isToday ? 'today' : ''}" data-date="${dateKey}">`;

        // Render Tasks/Events
        const allItems = [
            ...dayTasks.map(t => ({ ...t, type: 'task' })),
            ...dayEvents.map(e => ({ ...e, type: 'event' }))
        ];

        allItems.forEach((item, index) => {
            // Calculate Top & Height
            let hour = 8;
            let minute = 0;
            let duration = 60; // 1 hour default

            // Try to parse time
            if (item.scheduledTime) {
                const parts = item.scheduledTime.split(':');
                if (parts.length >= 2) {
                    hour = parseInt(parts[0]);
                    minute = parseInt(parts[1]);
                }
            } else if (item.startTime) {
                const parts = item.startTime.split(':');
                if (parts.length >= 2) {
                    hour = parseInt(parts[0]);
                    minute = parseInt(parts[1]);
                }
            } else {
                // If no time, stagger them at 8 AM + offset
                hour = 8 + (index % 5); // Spread them out a bit
            }

            const top = (hour * 60) + minute; // 1px per minute (based on CSS 60px height per hour)
            const height = duration;

            let colorClass = '';
            let style = `top:${top}px; height:${height}px;`;

            if (item.type === 'task') {
                colorClass = `priority-${item.priority || 'medium'}`;
                // Specific coloring for tasks is handled by class usually
                if (item.status === 'Hoàn thành') style += 'opacity: 0.7; text-decoration: line-through; filter: grayscale(0.5);';
            } else {
                // Event
                if (item.color) {
                    style += `background: linear-gradient(135deg, ${item.color}20, ${item.color}40); border-left:4px solid ${item.color}; color:${item.color}; fill:${item.color};`;
                } else {
                    style += `background: linear-gradient(135deg, #e0f2fe, #bfdbfe); border-left:4px solid #3b82f6; color:#1e40af;`;
                }
            }

            html += `
                <div class="week-event ${colorClass}" 
                     style="${style}"
                     title="${escapeHTML(item.name || item.title)}"
                     data-task-id="${item.id || ''}">
                     <div class="week-event-title">${escapeHTML(item.name || item.title)}</div>
                     <div class="week-event-time">
                        <span style="opacity:0.7">⏰</span> ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} - ${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}
                     </div>
                </div>
            `;
        });

        html += `</div>`; // Close day column
    }

    html += `</div></div></div>`; // Close grid, body, container

    grid.innerHTML = html;

    // Logic for Current Time Line
    updateCurrentTimeLine();
    // Update every minute
    if (window.weekTimer) clearInterval(window.weekTimer);
    window.weekTimer = setInterval(updateCurrentTimeLine, 60000);

    // Scroll to Current Time - 2 hours, OR 8 AM
    setTimeout(() => {
        const body = grid.querySelector('.week-grid-body');
        if (body) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            // Scroll to 2 hours before now, or 7 AM if early
            let scrollPos = Math.max(0, currentMinutes - 120);
            if (scrollPos < 420) scrollPos = 420; // Default min 7 AM
            body.scrollTop = scrollPos;
        }
    }, 100);

    addEventHandlers(grid);
}

function updateCurrentTimeLine() {
    const line = document.getElementById('current-time-line');
    if (!line) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Check if today is in the current view
    // We can check if we have a .day-column.today
    const todayCol = document.querySelector('.day-column.today');

    if (todayCol) {
        line.style.display = 'block';
        const minutes = now.getHours() * 60 + now.getMinutes();
        line.style.top = `${minutes}px`;
    } else {
        line.style.display = 'none';
    }
}



function formatDateRefined(date) {
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

function addEventHandlers(grid) {
    // Determine selectors for both Month view (.cal-event) and Week view (.week-event)
    const selectors = '.cal-event[data-task-id], .week-event[data-task-id]';

    grid.querySelectorAll(selectors).forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (el.dataset.taskId) {
                openTaskModal(el.dataset.taskId);
            }
        });
    });
}

function getTasksForDate(dateStr) {
    return (globalData.tasks || []).filter(t =>
        t.scheduledDate === dateStr || t.dueDate === dateStr
    );
}

function getEventsForDate(dateStr) {
    return (globalData.calendarEvents || []).filter(e => e.date === dateStr);
}

// ===== RENDER TASK LIST =====
function setupSearchFilter() {
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('filter-status');
    const priorityFilter = document.getElementById('filter-priority');
    const categoryFilter = document.getElementById('filter-category');

    const doFilter = () => renderTaskList();

    searchInput.addEventListener('input', debounce(doFilter, 300));
    statusFilter.addEventListener('change', doFilter);
    priorityFilter.addEventListener('change', doFilter);
    categoryFilter.addEventListener('change', doFilter);
}

function renderTaskList() {
    const container = document.getElementById('task-list-container');
    const countEl = document.getElementById('task-count-result');

    const search = document.getElementById('search-input').value.toLowerCase().trim();
    const status = document.getElementById('filter-status').value;
    const priority = document.getElementById('filter-priority').value;
    const category = document.getElementById('filter-category').value;

    let filtered = [...(globalData.tasks || [])];

    // Apply filters
    if (search) {
        filtered = filtered.filter(t =>
            (t.name || '').toLowerCase().includes(search) ||
            (t.notes || '').toLowerCase().includes(search) ||
            (t.tags || '').toLowerCase().includes(search)
        );
    }
    if (status) {
        filtered = filtered.filter(t => t.status === status);
    }
    if (priority) {
        filtered = filtered.filter(t => t.priority === priority);
    }
    if (category) {
        filtered = filtered.filter(t => t.category === category);
    }

    // Sort by due date
    filtered.sort((a, b) => {
        const dateA = new Date(a.dueDate || a.scheduledDate || '9999-12-31');
        const dateB = new Date(b.dueDate || b.scheduledDate || '9999-12-31');
        return dateA - dateB;
    });

    countEl.textContent = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h4>Không tìm thấy công việc</h4>
                <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(t => createTaskItemHTML(t)).join('');

    // Add click handlers
    container.querySelectorAll('.task-item').forEach(item => {
        item.addEventListener('click', () => openTaskModal(item.dataset.taskId));
    });
}

function createTaskItemHTML(task) {
    const statusIcons = {
        'Chưa thực hiện': '⏳',
        'Đang thực hiện': '🔄',
        'Hoàn thành': '✅'
    };
    const statusIcon = statusIcons[task.status] || '📋';
    const dueDate = task.dueDate ? formatDate(task.dueDate) : '';
    const time = task.scheduledTime || '';
    const location = task.location || 'Thành phố Hồ Chí Minh';

    return `
        <div class="task-item priority-${task.priority || 'medium'}" data-task-id="${task.id}">
            <div class="task-item-left">
                <span class="task-status-icon">${statusIcon}</span>
                <div class="task-info">
                    <h4>${escapeHTML(task.name)}</h4>
                    <p>${time ? time + ' • ' : ''}${dueDate}</p>
                    <p class="task-location">📍 ${escapeHTML(location)}</p>
                </div>
            </div>
            <div class="task-item-right">
                ${task.category ? `<span class="task-tag category">${escapeHTML(task.category)}</span>` : ''}
                <span class="task-arrow">›</span>
            </div>
        </div>
    `;
}

// ===== MODAL =====
function setupModal() {
    const modal = document.getElementById('task-view-modal');
    const closeBtn = document.getElementById('close-task-view-modal');
    const closeFooterBtn = document.getElementById('btn-close-modal');

    const closeModal = () => modal.classList.remove('show');

    closeBtn.addEventListener('click', closeModal);
    closeFooterBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function openTaskModal(taskId) {
    const task = globalData.tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('task-view-modal');

    // Fill data
    document.getElementById('modal-task-title').textContent = 'Chi tiết công việc';
    document.getElementById('modal-name').textContent = task.name || '(Không có tên)';

    // Time
    let timeStr = '';
    if (task.scheduledDate) {
        timeStr += `📅 ${formatDate(task.scheduledDate)}`;
        if (task.scheduledTime) timeStr += ` lúc ${task.scheduledTime}`;
    }
    if (task.dueDate) {
        timeStr += (timeStr ? '\n' : '') + `⏰ Hạn chót: ${formatDate(task.dueDate)}`;
        if (task.dueTime) timeStr += ` ${task.dueTime}`;
    }
    document.getElementById('modal-time').textContent = timeStr || 'Chưa đặt lịch';

    // Status & Priority
    const priorityLabels = { high: '🔴 Cao', medium: '🟡 Trung bình', low: '🟢 Thấp' };
    document.getElementById('modal-status').textContent =
        `${task.status || 'Chưa thực hiện'} • ${priorityLabels[task.priority] || '🟡 Trung bình'}`;

    // Tags
    let tagsStr = task.category || '';
    if (task.tags) tagsStr += (tagsStr ? ' • ' : '') + task.tags;
    document.getElementById('modal-tags').textContent = tagsStr || '(Không có)';

    // Link
    const linkRow = document.getElementById('modal-link-row');
    const linkEl = document.getElementById('modal-link');
    if (task.link) {
        linkRow.style.display = 'flex';
        linkEl.href = task.link;
        linkEl.textContent = task.link.length > 40 ? task.link.substring(0, 40) + '...' : task.link;
    } else {
        linkRow.style.display = 'none';
    }

    // Notes
    document.getElementById('modal-notes').textContent = task.notes || '(Không có ghi chú)';

    // Show modal
    modal.classList.add('show');
}

// ===== REALTIME LISTENER (PUBLIC READ) =====
function setupRealtimeListener() {
    const db = firebase.firestore();
    db.collection('users').doc(OWNER_UID).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            globalData.tasks = data.tasks || [];
            globalData.calendarEvents = data.calendarEvents || [];
            globalData.projects = data.projects || [];

            // Re-render
            renderOverview();
            renderCalendar();
            renderTaskList();
        }
    }, (error) => {
        console.error('Realtime listener error:', error);
    });
}

// ===== UTILITIES =====
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
