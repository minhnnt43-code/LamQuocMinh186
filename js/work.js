// --- FILE: js/work.js ---

import {
    escapeHTML, formatDate, toLocalISOString,
    generateID, showNotification, openModal, closeModal,
    toggleLoading
} from './common.js';

import { saveUserData } from './firebase.js';

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

    // [FIX LOGIC] Nạp dữ liệu cho Dropdown (tránh bị rỗng) và đặt mặc định ngày
    populateTaskDropdowns();
    resetTaskForm(); // Đặt ngày mặc định là hôm nay ngay khi vào

    renderDashboard();
    renderTasks();
    renderTodoList();
    renderProjects();
    renderCalendar();

    // Sự kiện Task
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', handleSaveTask);

    // [TÍNH NĂNG MỚI] Quick Add Task bằng phím Enter
    const quickAddInput = document.getElementById('quick-add-task-input');
    if (quickAddInput) {
        // Clone để xóa event cũ nếu có
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

    // To-do
    const addTodoBtn = document.getElementById('btn-add-todo');
    if (addTodoBtn) addTodoBtn.addEventListener('click', handleAddTodo);

    // Dự án
    setupProjectEvents();

    // Lịch
    setupCalendarEvents();
};

// [HÀM MỚI] Điền option cho dropdown nếu HTML đang để trống
function populateTaskDropdowns() {
    const categories = ['Học tập', 'Công việc', 'Cá nhân', 'Gia đình', 'Khác'];
    const statuses = ['Chưa thực hiện', 'Đang làm', 'Hoàn thành', 'Đã hủy'];
    
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
    if(btnSaveProj) {
         const newBtn = btnSaveProj.cloneNode(true);
         btnSaveProj.parentNode.replaceChild(newBtn, btnSaveProj);
         newBtn.addEventListener('click', handleSaveProject);
    }

    const btnDelProj = document.getElementById('btn-delete-project');
    if(btnDelProj) {
        const newBtn = btnDelProj.cloneNode(true);
        btnDelProj.parentNode.replaceChild(newBtn, btnDelProj);
        newBtn.addEventListener('click', handleDeleteProject);
    }
}

function setupCalendarEvents() {
    document.getElementById('cal-prev-btn').onclick = () => changeCalendarWeek(-1);
    document.getElementById('cal-next-btn').onclick = () => changeCalendarWeek(1);
    document.getElementById('cal-today-btn').onclick = () => {
        currentWeekStart = getMonday(new Date());
        renderCalendar();
    };

    const btnSaveEvt = document.getElementById('btn-save-event');
    const btnDelEvt = document.getElementById('btn-delete-event');

    if(btnSaveEvt) btnSaveEvt.onclick = handleSaveEvent;
    if(btnDelEvt) btnDelEvt.onclick = handleDeleteEvent;
}

// ============================================================
// 2. LỊCH BIỂU (RENDER UI) - GIỮ NGUYÊN LOGIC CŨ
// ============================================================
const changeCalendarWeek = (offset) => {
    currentWeekStart.setDate(currentWeekStart.getDate() + (offset * 7));
    renderCalendar();
};

const renderCalendar = () => {
    const calendarBody = document.getElementById('calendar-body');
    const calendarHeader = document.querySelector('.calendar-table thead tr');
    if (!calendarBody || !calendarHeader) return;

    calendarBody.innerHTML = '';
    calendarHeader.innerHTML = '<th class="time-col">Giờ</th>';
    
    const days = [];
    const todayStr = toLocalISOString(new Date());

    for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeekStart);
        day.setDate(day.getDate() + i);
        const dateStr = toLocalISOString(day);
        days.push(dateStr);
        
        const th = document.createElement('th');
        const dayName = day.toLocaleDateString('vi-VN', { weekday: 'short' });
        th.innerHTML = `<div class="day-header-name">${dayName}</div><div class="day-header-date" style="${dateStr === todayStr ? 'color: var(--primary-orange)' : ''}">${day.getDate()}</div>`;
        calendarHeader.appendChild(th);
    }
    
    const endWeek = new Date(currentWeekStart);
    endWeek.setDate(endWeek.getDate() + 6);
    document.getElementById('current-view-range').textContent = `${formatDate(currentWeekStart)} - ${formatDate(endWeek)}`;

    let allDayHtml = '<td class="time-col">Hạn chót</td>';
    days.forEach(dateStr => {
        const dayTasks = (globalData.tasks || []).filter(t => t.dueDate === dateStr && t.status !== 'Hoàn thành');
        let cellContent = '';
        dayTasks.forEach(t => { 
            cellContent += `<div class="task-event" style="background-color: var(--primary-orange); color: white; margin-bottom:2px; padding:2px; font-size:0.7rem; border-radius:3px;">${escapeHTML(t.name)}</div>`; 
        });
        allDayHtml += `<td class="all-day-slot">${cellContent}</td>`;
    });
    const rowAllDay = document.createElement('tr');
    rowAllDay.innerHTML = allDayHtml;
    calendarBody.appendChild(rowAllDay);

    for (let hour = 6; hour <= 22; hour++) {
        const row = document.createElement('tr');
        const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
        row.innerHTML = `<td class="time-col">${timeLabel}</td>`;
        
        for (let i = 0; i < 7; i++) {
            const cell = document.createElement('td');
            const cellDate = days[i];
            cell.addEventListener('click', () => openEventModal(null, cellDate, timeLabel));
            
            const cellEvents = (globalData.calendarEvents || []).filter(e => e.date === cellDate && e.startTime.startsWith(hour.toString().padStart(2, '0')));
            
            cellEvents.forEach(ev => {
                const div = document.createElement('div');
                div.className = 'calendar-event';
                div.textContent = ev.title;
                div.addEventListener('click', (e) => { e.stopPropagation(); openEventModal(ev); });
                cell.appendChild(div);
            });
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
    }
};

const openEventModal = (event = null, date = null, time = null) => {
    const modalTitle = document.getElementById('event-modal-title'); 
    const deleteBtn = document.getElementById('btn-delete-event');
    const taskSelect = document.getElementById('event-task-link');
    
    taskSelect.innerHTML = '<option value="">-- Không liên kết --</option>' + (globalData.tasks || []).map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('');

    if (event) {
        if(modalTitle) modalTitle.textContent = 'Sửa sự kiện';
        document.getElementById('event-id').value = event.id;
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-date').value = event.date;
        document.getElementById('event-start-time').value = event.startTime;
        document.getElementById('event-end-time').value = event.endTime;
        taskSelect.value = event.linkedTaskId || '';
        deleteBtn.style.display = 'inline-block';
    } else {
        if(modalTitle) modalTitle.textContent = 'Thêm sự kiện mới';
        document.getElementById('event-id').value = '';
        document.getElementById('event-title').value = '';
        document.getElementById('event-date').value = date || toLocalISOString(new Date());
        document.getElementById('event-start-time').value = time || '08:00';
        const startHour = parseInt(document.getElementById('event-start-time').value.split(':')[0]);
        document.getElementById('event-end-time').value = `${(startHour + 1).toString().padStart(2, '0')}:00`;
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
        type: 'manual'
    };
    
    if (id) { 
        const index = globalData.calendarEvents.findIndex(e => e.id === id); 
        if (index > -1) globalData.calendarEvents[index] = { ...globalData.calendarEvents[index], ...eventData }; 
    } else { 
        globalData.calendarEvents.push(eventData); 
    }
    
    await saveUserData(currentUser.uid, { calendarEvents: globalData.calendarEvents });
    renderCalendar(); renderDashboard(); closeModal('event-modal'); showNotification('Đã lưu sự kiện');
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

// ============================================================
// 3. QUẢN LÝ CÔNG VIỆC (TASKS) - [CÓ SỬA ĐỔI QUAN TRỌNG]
// ============================================================
const renderTasks = (filter = 'all') => {
    const container = document.getElementById('task-list');
    if(!container) return;
    container.innerHTML = '';

    let tasks = globalData.tasks || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (filter === 'incomplete') tasks = tasks.filter(t => t.status !== 'Hoàn thành');
    if (filter === 'important') tasks = tasks.filter(t => t.priority === 'high');
    if (filter === 'today') tasks = tasks.filter(t => t.dueDate === toLocalISOString(today));

    // Sắp xếp: Hoàn thành xuống dưới, Ngày gần lên trên
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
        
        // [NÂNG CẤP UI] Thêm Checkbox và xử lý hiển thị
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                <input type="checkbox" class="task-complete-checkbox" ${isCompleted ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                
                <div class="task-info" style="flex-grow: 1; cursor: pointer;">
                    <h3 style="${isCompleted ? 'text-decoration: line-through; color: #999;' : ''}">
                        ${escapeHTML(task.name)} ${statusClass === 'overdue' && !isCompleted ? '<span style="color:red; font-size:0.8rem">(Quá hạn)</span>' : ''}
                    </h3>
                    <div class="task-meta">
                        <span class="priority-badge ${task.priority}">${task.priority === 'high' ? 'Cao' : (task.priority === 'medium' ? 'TB' : 'Thấp')}</span>
                        <span>📅 ${formatDate(task.dueDate)}</span>
                        <span class="tag-badge">${escapeHTML(task.category)}</span>
                    </div>
                </div>
                
                <div class="task-actions">
                    <button class="edit-btn" title="Sửa">✏️</button>
                    <button class="delete-btn" title="Xóa">🗑️</button>
                </div>
            </div>
        `;

        // Sự kiện Checkbox "Tick là xong"
        const checkbox = div.querySelector('.task-complete-checkbox');
        checkbox.addEventListener('change', async () => {
            await toggleTaskCompletion(task);
        });

        div.querySelector('.task-info').addEventListener('click', () => loadTaskToEdit(task));
        div.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); loadTaskToEdit(task); });
        div.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteTask(task.id); });

        container.appendChild(div);
    });
};

// [HÀM MỚI] Xử lý bật/tắt trạng thái hoàn thành
const toggleTaskCompletion = async (task) => {
    if (task.status === 'Hoàn thành') {
        task.status = 'Chưa thực hiện'; // Hoặc trạng thái cũ nếu muốn phức tạp hơn
    } else {
        task.status = 'Hoàn thành';
    }
    
    // Cập nhật lại mảng dữ liệu
    const index = globalData.tasks.findIndex(t => t.id === task.id);
    if (index > -1) globalData.tasks[index] = task;

    // Lưu Firebase
    await saveUserData(currentUser.uid, { tasks: globalData.tasks });
    
    // Render lại giao diện
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
    document.getElementById('task-project').value = task.project || '';
    document.getElementById('task-link').value = task.link || '';
    document.getElementById('task-tags').value = task.tags || '';
    document.getElementById('task-notes').value = task.notes || '';
    document.getElementById('task-recurrence').value = task.recurrence || 'none';

    const btn = document.getElementById('add-task-btn');
    btn.textContent = "💾 Lưu thay đổi";
    btn.style.backgroundColor = "var(--primary-blue)";
    
    // Cuộn lên form để user thấy
    document.querySelector('#tasks .form-container').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('task-name').focus();
};

const resetTaskForm = () => {
    editingTaskId = null;
    document.getElementById('task-name').value = '';
    // [FIX UX] Reset về ngày hôm nay
    document.getElementById('task-due-date').value = toLocalISOString(new Date());
    document.getElementById('task-status').value = 'Chưa thực hiện';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-category').value = 'Học tập';
    
    document.getElementById('task-link').value = '';
    document.getElementById('task-tags').value = '';
    document.getElementById('task-notes').value = '';
    document.getElementById('task-recurrence').value = 'none';
    
    const btn = document.getElementById('add-task-btn');
    btn.textContent = "Thêm công việc";
    btn.style.backgroundColor = "var(--primary-orange)";
};

// [HÀM MỚI] Thêm nhanh Task
const handleQuickAddTask = async (taskName) => {
    if (!taskName || !taskName.trim()) return;

    const taskData = {
        id: generateID('task'),
        name: taskName.trim(),
        priority: 'medium', // Mặc định
        category: 'Chung', // Mặc định
        dueDate: toLocalISOString(new Date()), // Mặc định hôm nay
        status: 'Chưa thực hiện',
        project: '',
        recurrence: 'none',
        link: '', tags: '', notes: ''
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

    const taskData = {
        id: editingTaskId || generateID('task'),
        name: name,
        priority: document.getElementById('task-priority').value,
        category: document.getElementById('task-category').value || 'Chung',
        dueDate: document.getElementById('task-due-date').value,
        status: document.getElementById('task-status').value || 'Chưa thực hiện',
        project: document.getElementById('task-project').value,
        recurrence: document.getElementById('task-recurrence').value,
        link: document.getElementById('task-link').value,
        tags: document.getElementById('task-tags').value,
        notes: document.getElementById('task-notes').value
    };

    if (editingTaskId) {
        const index = globalData.tasks.findIndex(t => t.id === editingTaskId);
        if (index > -1) globalData.tasks[index] = taskData;
        showNotification('Đã cập nhật công việc');
    } else {
        globalData.tasks.push(taskData);
        showNotification('Đã thêm công việc mới');
    }

    await saveUserData(currentUser.uid, { tasks: globalData.tasks });
    resetTaskForm();
    renderTasks(); renderDashboard(); renderCalendar();
};

const deleteTask = async (id) => {
    if (confirm('Bạn chắc chắn muốn xóa công việc này?')) {
        globalData.tasks = globalData.tasks.filter(t => t.id !== id);
        if (editingTaskId === id) resetTaskForm();
        await saveUserData(currentUser.uid, { tasks: globalData.tasks });
        renderTasks(); renderDashboard(); renderCalendar();
        showNotification('Đã xóa công việc', 'success');
    }
};

// --- 4. TO-DO LIST ---
const renderTodoList = () => {
    const container = document.getElementById('todo-list-container');
    if (!container) return;
    container.innerHTML = '';
    const todos = globalData.todos || [];
    todos.forEach(todo => {
        const div = document.createElement('div');
        div.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        div.innerHTML = `<input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}><span class="todo-label">${escapeHTML(todo.text)}</span><button class="delete-todo-btn">×</button>`;
        div.querySelector('.todo-checkbox').addEventListener('change', () => toggleTodo(todo.id));
        div.querySelector('.delete-todo-btn').addEventListener('click', () => deleteTodo(todo.id));
        container.appendChild(div);
    });
};

const handleAddTodo = async () => {
    const input = document.getElementById('new-todo-input');
    if (!input.value.trim()) return;
    const newTodo = { id: generateID('todo'), text: input.value, completed: false };
    globalData.todos.push(newTodo);
    await saveUserData(currentUser.uid, { todos: globalData.todos });
    renderTodoList(); renderDashboard(); input.value = '';
};

const toggleTodo = async (id) => {
    const todo = globalData.todos.find(t => t.id === id);
    if (todo) { todo.completed = !todo.completed; await saveUserData(currentUser.uid, { todos: globalData.todos }); renderTodoList(); renderDashboard(); }
};

const deleteTodo = async (id) => {
    globalData.todos = globalData.todos.filter(t => t.id !== id);
    await saveUserData(currentUser.uid, { todos: globalData.todos });
    renderTodoList(); renderDashboard();
};

// --- 5. QUẢN LÝ DỰ ÁN ---
const renderProjects = () => {
    const container = document.getElementById('project-list-container');
    const emptyState = document.getElementById('project-list-empty');
    if (!container) return;
    
    container.innerHTML = '';
    const projects = globalData.projects || [];
    
    if (projects.length === 0) { 
        if(emptyState) emptyState.style.display = 'block'; 
        return; 
    }
    if(emptyState) emptyState.style.display = 'none';
    
    projects.forEach(p => {
        const div = document.createElement('div');
        div.className = 'project-card';
        div.innerHTML = `<h3>${escapeHTML(p.name)}</h3><p class="project-dates">Từ: ${formatDate(p.startDate)} - Đến: ${formatDate(p.endDate)}</p><p class="project-description">${escapeHTML(p.description)}</p><div class="project-actions"><button style="width:100%; background:var(--danger-color);" class="btn-submit btn-delete-proj">Xóa</button></div>`;
        div.querySelector('.btn-delete-proj').addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('project-id').value = p.id; handleDeleteProject(); });
        div.addEventListener('click', () => openEditProject(p));
        container.appendChild(div);
    });
    const select = document.getElementById('task-project');
    if(select) select.innerHTML = '<option value="">Không có</option>' + projects.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
};

const handleSaveProject = async () => {
    const id = document.getElementById('project-id').value;
    const name = document.getElementById('project-name').value;
    if (!name) return showNotification('Tên dự án là bắt buộc', 'error');
    const projectData = { id: id || generateID('proj'), name: name, description: document.getElementById('project-description').value, startDate: document.getElementById('project-start-date').value, endDate: document.getElementById('project-end-date').value };
    
    if (id) { const index = globalData.projects.findIndex(p => p.id === id); if (index > -1) globalData.projects[index] = projectData; }
    else { globalData.projects.push(projectData); }
    
    await saveUserData(currentUser.uid, { projects: globalData.projects });
    renderProjects(); closeModal('project-modal'); showNotification('Lưu dự án thành công');
};

const handleDeleteProject = async () => {
    const id = document.getElementById('project-id').value;
    if (!id) return;
    if (confirm('Xóa dự án này?')) { globalData.projects = globalData.projects.filter(p => p.id !== id); await saveUserData(currentUser.uid, { projects: globalData.projects }); renderProjects(); closeModal('project-modal'); showNotification('Đã xóa dự án'); }
};

const openEditProject = (p) => {
    document.getElementById('project-id').value = p.id; document.getElementById('project-name').value = p.name; document.getElementById('project-description').value = p.description; document.getElementById('project-start-date').value = p.startDate; document.getElementById('project-end-date').value = p.endDate; document.getElementById('btn-delete-project').style.display = 'inline-block'; openModal('project-modal');
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

    const todoListUl = document.getElementById('dashboard-todo-list');
    const todoEmpty = document.getElementById('dashboard-todo-list-empty');
    if (todoListUl) {
        const activeTodos = (globalData.todos || []).filter(t => !t.completed).slice(0, 5);
        todoListUl.innerHTML = '';
        if (activeTodos.length > 0) { todoEmpty.style.display = 'none'; activeTodos.forEach(t => { todoListUl.innerHTML += `<li>${escapeHTML(t.text)}</li>`; }); } else { todoEmpty.style.display = 'block'; }
    }

    const completedCount = (globalData.tasks || []).filter(t => t.status === 'Hoàn thành').length;
    const countEl = document.getElementById('stat-tasks-completed');
    if(countEl) countEl.textContent = completedCount;
};