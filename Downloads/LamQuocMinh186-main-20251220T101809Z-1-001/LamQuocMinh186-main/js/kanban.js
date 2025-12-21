// ============================================================
// FILE: js/kanban.js
// Mục đích: Kanban Board với drag & drop cho task management
// ============================================================

import { saveUserData, auth } from './firebase.js';
import { showNotification } from './common.js';

export class KanbanBoard {
    constructor(tasks, onTaskUpdate) {
        this.tasks = tasks || []; // Source of truth (ALL tasks)
        this.onTaskUpdate = onTaskUpdate;
        this.containerId = null;
        this.activeFilters = {
            project: 'all',
            priority: 'all'
        };
        // [UPGRADED] Columns with WIP limits
        this.columns = {
            'todo': { title: 'To Do', icon: '📋', color: '#94a3b8', wipLimit: null },
            'inprogress': { title: 'In Progress', icon: '⚡', color: '#3b82f6', wipLimit: 3 },
            'review': { title: 'Review', icon: '👀', color: '#f59e0b', wipLimit: 2 },
            'done': { title: 'Done', icon: '✅', color: '#10b981', wipLimit: null }
        };
        this.draggedTask = null;
    }

    getFilteredTasks() {
        return this.tasks.filter(task => {
            const matchesProject = this.activeFilters.project === 'all' || task.project === this.activeFilters.project;
            const matchesPriority = this.activeFilters.priority === 'all' || task.priority === this.activeFilters.priority;
            return matchesProject && matchesPriority;
        });
    }

    render(containerId) {
        if (containerId) this.containerId = containerId;
        const container = document.getElementById(this.containerId);

        if (!container) {
            console.error('Container not found:', this.containerId);
            return;
        }

        const filteredTasks = this.getFilteredTasks();

        const html = `
            <div class="kanban-container">
                ${Object.keys(this.columns).map(status => this.renderColumn(status, filteredTasks)).join('')}
            </div>
        `;

        container.innerHTML = html;
        this.setupDragAndDrop(container);
        this.setupQuickMenu(container); // [MỚI] Setup quick menu
    }

    renderColumn(status, tasks) {
        const column = this.columns[status];
        const tasksInColumn = tasks.filter(t => (t.status || 'todo') === status);

        // [MỚI] Check WIP limit
        const isOverWIP = column.wipLimit && tasksInColumn.length >= column.wipLimit;
        const wipWarningClass = isOverWIP ? 'wip-warning' : '';

        return `
            <div class="kanban-column ${wipWarningClass}" data-status="${status}">
                <div class="kanban-column-header" style="border-left: 4px solid ${column.color}">
                    <span class="column-icon">${column.icon}</span>
                    <span class="column-title">${column.title}</span>
                    <span class="column-count ${isOverWIP ? 'count-warning' : ''}">${tasksInColumn.length}${column.wipLimit ? '/' + column.wipLimit : ''}</span>
                </div>
                ${isOverWIP ? '<div class="wip-limit-warning">⚠️ Vượt giới hạn WIP!</div>' : ''}
                <div class="kanban-column-body" data-status="${status}">
                    ${tasksInColumn.map(task => this.renderCard(task)).join('')}
                </div>
            </div>
        `;
    }

    renderCard(task) {
        const priorityColors = {
            'Cao': '#ef4444',
            'high': '#ef4444',
            'Trung bình': '#f59e0b',
            'medium': '#f59e0b',
            'Thấp': '#10b981',
            'low': '#10b981'
        };

        const priorityLabels = {
            'Cao': '🔴 Cao',
            'high': '🔴 Cao',
            'Trung bình': '🟡 TB',
            'medium': '🟡 TB',
            'Thấp': '🟢 Thấp',
            'low': '🟢 Thấp'
        };

        const priorityColor = priorityColors[task.priority] || '#94a3b8';
        const priorityLabel = priorityLabels[task.priority] || '⚪ --';

        // [MỚI] Calculate time left
        const timeLeftBadge = this.getTimeLeftBadge(task.deadline);

        // [MỚI] Subtask progress
        const subtasks = task.subtasks || [];
        const completedSubtasks = subtasks.filter(s => s.completed).length;
        const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

        // [MỚI] Time display
        const timeDisplay = task.startTime ? `${task.startTime}${task.endTime ? ' → ' + task.endTime : ''}` : '';

        // [MỚI] Time spent progress
        const estimatedTime = task.estimatedTime || 3600; // Default 1 hour in seconds
        const timeSpent = task.timeSpent || 0;
        const timeProgress = Math.min(100, Math.round((timeSpent / estimatedTime) * 100));

        return `
            <div class="kanban-card kanban-card-v2" 
                 draggable="true" 
                 data-task-id="${task.id}"
                 data-status="${task.status || 'todo'}">
                
                <!-- Priority Ribbon -->
                <div class="card-ribbon" style="background: ${priorityColor}"></div>
                
                <!-- Header with badges -->
                <div class="card-header-v2">
                    <span class="priority-badge" style="background: ${priorityColor}15; color: ${priorityColor}; border: 1px solid ${priorityColor}30">
                        ${priorityLabel}
                    </span>
                    ${timeLeftBadge}
                </div>
                
                <!-- Title -->
                <div class="card-title-v2">${task.title || 'Untitled'}</div>
                
                <!-- Time display -->
                ${timeDisplay ? `<div class="card-time-display">⏰ ${timeDisplay}</div>` : ''}
                
                <!-- Description -->
                ${task.description ? `<div class="card-desc-v2">${this.truncate(task.description, 50)}</div>` : ''}
                
                <!-- Subtask Progress -->
                ${subtasks.length > 0 ? `
                <div class="subtask-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${subtaskProgress}%"></div>
                    </div>
                    <span class="progress-text">${completedSubtasks}/${subtasks.length} subtasks</span>
                </div>
                ` : ''}
                
                <!-- Time Tracking -->
                ${timeSpent > 0 ? `
                <div class="time-tracking">
                    <div class="time-bar-container">
                        <div class="time-bar-fill ${timeProgress >= 100 ? 'overtime' : ''}" style="width: ${Math.min(timeProgress, 100)}%"></div>
                    </div>
                    <span class="time-text">⏱️ ${this.formatTime(timeSpent)}${estimatedTime ? ' / ' + this.formatTime(estimatedTime) : ''}</span>
                </div>
                ` : ''}
                
                <!-- Footer -->
                <div class="card-footer-v2">
                    <div class="card-tags">
                        ${task.project ? `<span class="card-tag">${task.project}</span>` : ''}
                        ${task.category ? `<span class="card-category">${task.category}</span>` : ''}
                    </div>
                    <button class="quick-menu-btn" data-task-id="${task.id}" title="Menu">⋮</button>
                </div>
            </div>
        `;
    }

    // [MỚI] Calculate time left badge
    getTimeLeftBadge(deadline) {
        if (!deadline) return '';

        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffMs = deadlineDate - now;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs < 0) {
            return '<span class="time-badge overdue">⏰ Quá hạn</span>';
        } else if (diffHours < 2) {
            return `<span class="time-badge urgent">⚡ ${diffHours}h</span>`;
        } else if (diffHours < 24) {
            return `<span class="time-badge today">🔥 ${diffHours}h</span>`;
        } else if (diffDays <= 3) {
            return `<span class="time-badge soon">📅 ${diffDays}d</span>`;
        } else {
            return `<span class="time-badge normal">📅 ${deadlineDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}</span>`;
        }
    }

    setupDragAndDrop(container) {
        const cards = container.querySelectorAll('.kanban-card');
        const columns = container.querySelectorAll('.kanban-column-body');

        // Drag start
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.draggedTask = card.getAttribute('data-task-id');
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });

        // Drop zones
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');

                const newStatus = column.getAttribute('data-status');
                this.moveTask(this.draggedTask, newStatus);
            });
        });
    }

    async moveTask(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const oldStatus = task.status || 'todo';
        if (oldStatus === newStatus) return;

        // Update task
        task.status = newStatus;
        task.lastUpdated = new Date().toISOString();

        // Save to Firebase
        try {
            const user = auth.currentUser;
            if (user) {
                await saveUserData(user.uid, { tasks: this.tasks });
            }

            // Callback
            if (this.onTaskUpdate) {
                this.onTaskUpdate(task);
            }

            // Re-render
            this.render();

            // Notification
            const statusNames = {
                'todo': 'To Do',
                'inprogress': 'In Progress',
                'review': 'Review',
                'done': 'Done'
            };
            showNotification(`✅ Đã chuyển "${task.title}" sang ${statusNames[newStatus]}`);

        } catch (error) {
            console.error('Error moving task:', error);
            showNotification('Lỗi khi cập nhật task!', 'error');

            // Revert
            task.status = oldStatus;
        }
    }

    filterByProject(project) {
        this.activeFilters.project = project || 'all';
        this.render();
    }

    filterByPriority(priority) {
        this.activeFilters.priority = priority || 'all';
        this.render();
    }

    // Helpers
    truncate(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    // [MỚI] Setup Quick Actions Menu
    setupQuickMenu(container) {
        // Close any existing menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.quick-menu-popup') && !e.target.closest('.quick-menu-btn')) {
                this.closeQuickMenu();
            }
        });

        // Handle quick menu button clicks
        container.querySelectorAll('.quick-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.getAttribute('data-task-id');
                this.showQuickMenu(btn, taskId);
            });
        });
    }

    // [MỚI] Show Quick Menu Popup
    showQuickMenu(buttonEl, taskId) {
        this.closeQuickMenu();

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const rect = buttonEl.getBoundingClientRect();

        const popup = document.createElement('div');
        popup.className = 'quick-menu-popup';
        popup.innerHTML = `
            <div class="quick-menu-header">${this.truncate(task.title, 25)}</div>
            <div class="quick-menu-items">
                <button class="quick-menu-item" data-action="edit" data-task-id="${taskId}">
                    ✏️ Chỉnh sửa
                </button>
                <button class="quick-menu-item" data-action="duplicate" data-task-id="${taskId}">
                    📋 Sao chép
                </button>
                <div class="quick-menu-divider"></div>
                <div class="quick-menu-submenu">
                    <span class="quick-menu-label">🏷️ Ưu tiên:</span>
                    <div class="priority-buttons">
                        <button class="priority-btn priority-high ${task.priority === 'high' || task.priority === 'Cao' ? 'active' : ''}" 
                                data-action="priority" data-priority="high" data-task-id="${taskId}">Cao</button>
                        <button class="priority-btn priority-medium ${task.priority === 'medium' || task.priority === 'Trung bình' ? 'active' : ''}" 
                                data-action="priority" data-priority="medium" data-task-id="${taskId}">TB</button>
                        <button class="priority-btn priority-low ${task.priority === 'low' || task.priority === 'Thấp' ? 'active' : ''}" 
                                data-action="priority" data-priority="low" data-task-id="${taskId}">Thấp</button>
                    </div>
                </div>
                <div class="quick-menu-divider"></div>
                <button class="quick-menu-item quick-menu-danger" data-action="delete" data-task-id="${taskId}">
                    🗑️ Xóa task
                </button>
            </div>
        `;

        // Position popup
        popup.style.position = 'fixed';
        popup.style.top = `${rect.bottom + 5}px`;
        popup.style.left = `${rect.left - 150}px`;
        popup.style.zIndex = '9999';

        document.body.appendChild(popup);

        // Handle action clicks
        popup.querySelectorAll('[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                const taskId = e.target.getAttribute('data-task-id');
                const priority = e.target.getAttribute('data-priority');

                this.handleQuickAction(action, taskId, priority);
            });
        });
    }

    // [MỚI] Close Quick Menu
    closeQuickMenu() {
        document.querySelectorAll('.quick-menu-popup').forEach(p => p.remove());
    }

    // [MỚI] Handle Quick Actions
    async handleQuickAction(action, taskId, priority) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.closeQuickMenu();

        switch (action) {
            case 'edit':
                // Trigger edit modal (dispatch custom event)
                window.dispatchEvent(new CustomEvent('editTask', { detail: { taskId } }));
                showNotification('📝 Mở form chỉnh sửa...', 'info');
                break;

            case 'duplicate':
                const newTask = {
                    ...task,
                    id: 'task-' + Date.now(),
                    title: task.title + ' (Copy)',
                    status: 'todo',
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
                this.tasks.push(newTask);
                await this.saveAndRender();
                showNotification('📋 Đã sao chép task!', 'success');
                break;

            case 'priority':
                task.priority = priority;
                task.lastUpdated = new Date().toISOString();
                await this.saveAndRender();
                const priorityNames = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
                showNotification(`🏷️ Đã đổi ưu tiên thành "${priorityNames[priority]}"`, 'success');
                break;

            case 'delete':
                if (confirm(`Xóa task "${task.title}"?`)) {
                    const index = this.tasks.findIndex(t => t.id === taskId);
                    if (index > -1) {
                        this.tasks.splice(index, 1);
                        await this.saveAndRender();
                        showNotification('🗑️ Đã xóa task!', 'success');
                    }
                }
                break;
        }
    }

    // [MỚI] Save và re-render
    async saveAndRender() {
        try {
            const user = auth.currentUser;
            if (user) {
                await saveUserData(user.uid, { tasks: this.tasks });
            }
            if (this.onTaskUpdate) {
                this.onTaskUpdate();
            }
            this.render();
        } catch (error) {
            console.error('Error saving:', error);
            showNotification('Lỗi lưu dữ liệu!', 'error');
        }
    }
}

/**
 * Toggle giữa List view và Kanban view
 */
export function toggleView(viewType) {
    const listView = document.getElementById('tasks-list-view');
    const kanbanView = document.getElementById('tasks-kanban-view');
    const btnList = document.getElementById('btn-view-list');
    const btnKanban = document.getElementById('btn-view-kanban');

    if (viewType === 'list') {
        listView.style.display = 'block';
        kanbanView.style.display = 'none';
        btnList.classList.add('active');
        btnKanban.classList.remove('active');
    } else {
        listView.style.display = 'none';
        kanbanView.style.display = 'block';
        btnList.classList.remove('active');
        btnKanban.classList.add('active');
    }

    localStorage.setItem('taskViewPreference', viewType);
}

/**
 * Load view preference
 */
export function loadViewPreference() {
    const preference = localStorage.getItem('taskViewPreference') || 'list';
    toggleView(preference);
}
