// === FILE: js/workspace-hub.js ===
// Phase 1 Features: Subtasks, Smart Tags, Project Folders, Task Snooze

import { generateID, showNotification, escapeHTML } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;

// Default Tags
const DEFAULT_TAGS = [
    { id: 'tag_urgent', name: 'Khẩn cấp', color: 'red' },
    { id: 'tag_important', name: 'Quan trọng', color: 'orange' },
    { id: 'tag_work', name: 'Công việc', color: 'blue' },
    { id: 'tag_personal', name: 'Cá nhân', color: 'green' },
    { id: 'tag_study', name: 'Học tập', color: 'purple' },
    { id: 'tag_meeting', name: 'Họp', color: 'pink' },
    { id: 'tag_idea', name: 'Ý tưởng', color: 'yellow' },
    { id: 'tag_later', name: 'Để sau', color: 'gray' }
];

// Default Project Folders
const DEFAULT_FOLDERS = [
    { id: 'folder_inbox', name: 'Inbox', icon: '📥', color: '#667eea' },
    { id: 'folder_work', name: 'Công việc', icon: '💼', color: '#f59e0b' },
    { id: 'folder_personal', name: 'Cá nhân', icon: '🏠', color: '#22c55e' },
    { id: 'folder_study', name: 'Học tập', icon: '📚', color: '#8b5cf6' }
];

// ============================================
// INITIALIZATION
// ============================================
export const initWorkspaceHub = (data, user) => {
    globalData = data;
    currentUser = user;

    // Initialize data structures if not exist
    if (!globalData.smartTags) {
        globalData.smartTags = [...DEFAULT_TAGS];
    }
    if (!globalData.projectFolders) {
        globalData.projectFolders = [...DEFAULT_FOLDERS];
    }

    // Migrate existing tasks to support new fields
    if (globalData.tasks) {
        globalData.tasks.forEach(task => {
            if (!task.subtasks) task.subtasks = [];
            if (!task.smartTags) task.smartTags = [];
            if (!task.folderId) task.folderId = '';
            if (!task.snoozedUntil) task.snoozedUntil = null;
        });
    }

    // Setup event listeners
    setupSubtaskEvents();
    setupTagEvents();
    setupFolderEvents();
    setupSnoozeEvents();

    // Render project folders filter
    renderProjectFoldersFilter();

    // Check for snoozed tasks that should be unsnoozed
    checkSnoozedTasks();
    setInterval(checkSnoozedTasks, 60000); // Check every minute

    console.log('✅ Workspace Hub initialized');
};

// ============================================
// 1. SUBTASKS FEATURE
// ============================================

// Render subtasks for a task
export const renderSubtasks = (taskId, container) => {
    const task = globalData.tasks.find(t => t.id === taskId);
    if (!task || !container) return;

    const subtasks = task.subtasks || [];
    const completedCount = subtasks.filter(s => s.completed).length;
    const totalCount = subtasks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    container.innerHTML = `
        <div class="subtasks-container">
            <div class="subtasks-header">
                <h4>📋 Công việc con</h4>
                <span class="subtasks-progress">${completedCount}/${totalCount} (${progressPercent}%)</span>
            </div>
            <div class="subtask-progress-bar">
                <div class="subtask-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="subtask-list" id="subtask-list-${taskId}">
                ${subtasks.map((sub, index) => `
                    <div class="subtask-item ${sub.completed ? 'completed' : ''}" data-subtask-id="${sub.id}">
                        <input type="checkbox" class="subtask-checkbox" ${sub.completed ? 'checked' : ''} data-task-id="${taskId}" data-subtask-index="${index}">
                        <span class="subtask-text">${escapeHTML(sub.name)}</span>
                        <button class="subtask-delete" data-task-id="${taskId}" data-subtask-index="${index}" title="Xóa">×</button>
                    </div>
                `).join('')}
            </div>
            <div class="add-subtask-row">
                <input type="text" id="new-subtask-${taskId}" placeholder="Thêm công việc con..." class="add-subtask-input">
                <button class="add-subtask-btn" data-task-id="${taskId}">+ Thêm</button>
            </div>
        </div>
    `;

    // Attach event listeners
    attachSubtaskListeners(taskId, container);
};

// Attach event listeners for subtasks
const attachSubtaskListeners = (taskId, container) => {
    // Toggle subtask completion
    container.querySelectorAll('.subtask-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const index = parseInt(e.target.dataset.subtaskIndex);
            await toggleSubtaskCompletion(taskId, index);
        });
    });

    // Delete subtask
    container.querySelectorAll('.subtask-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = parseInt(e.target.dataset.subtaskIndex);
            await deleteSubtask(taskId, index);
        });
    });

    // Add new subtask
    const addBtn = container.querySelector('.add-subtask-btn');
    const input = container.querySelector(`#new-subtask-${taskId}`);

    if (addBtn && input) {
        addBtn.addEventListener('click', () => addSubtask(taskId, input.value));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addSubtask(taskId, input.value);
        });
    }
};

// Add a new subtask
const addSubtask = async (taskId, name) => {
    if (!name || !name.trim()) return;

    const task = globalData.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.subtasks) task.subtasks = [];

    task.subtasks.push({
        id: generateID('sub'),
        name: name.trim(),
        completed: false,
        createdAt: new Date().toISOString()
    });

    await saveUserData(currentUser.uid, { tasks: globalData.tasks });

    // Re-render subtasks
    const container = document.querySelector(`#subtask-list-${taskId}`)?.closest('.subtasks-container')?.parentElement;
    if (container) {
        renderSubtasks(taskId, container);
    }

    showNotification('✅ Đã thêm công việc con!');

    // Trigger refresh
    window.dispatchEvent(new CustomEvent('workspace-refresh'));
};

// Toggle subtask completion
const toggleSubtaskCompletion = async (taskId, subtaskIndex) => {
    const task = globalData.tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks[subtaskIndex]) return;

    task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;

    await saveUserData(currentUser.uid, { tasks: globalData.tasks });

    // Re-render subtasks
    const container = document.querySelector(`#subtask-list-${taskId}`)?.closest('.subtasks-container')?.parentElement;
    if (container) {
        renderSubtasks(taskId, container);
    }

    // Check if all subtasks completed
    const allCompleted = task.subtasks.every(s => s.completed);
    if (allCompleted && task.subtasks.length > 0) {
        showNotification('🎉 Tất cả công việc con đã hoàn thành!');
    }
};

// Delete a subtask
const deleteSubtask = async (taskId, subtaskIndex) => {
    const task = globalData.tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks[subtaskIndex]) return;

    task.subtasks.splice(subtaskIndex, 1);

    await saveUserData(currentUser.uid, { tasks: globalData.tasks });

    // Re-render subtasks
    const container = document.querySelector(`#subtask-list-${taskId}`)?.closest('.subtasks-container')?.parentElement;
    if (container) {
        renderSubtasks(taskId, container);
    }

    showNotification('Đã xóa công việc con');
};

// Setup subtask events
const setupSubtaskEvents = () => {
    // Listen for task modal open to render subtasks
    window.addEventListener('task-modal-opened', (e) => {
        const taskId = e.detail?.taskId;
        if (taskId) {
            const container = document.getElementById('subtasks-section');
            if (container) {
                renderSubtasks(taskId, container);
            }
        }
    });
};

// ============================================
// 2. SMART TAGS FEATURE
// ============================================

// Get all available tags
export const getSmartTags = () => {
    if (!globalData) return DEFAULT_TAGS;
    return globalData.smartTags || DEFAULT_TAGS;
};

// Render tags for a task
export const renderTaskTags = (taskId) => {
    const task = globalData.tasks.find(t => t.id === taskId);
    if (!task) return '';

    const taskTags = task.smartTags || [];
    const allTags = getSmartTags();

    return taskTags.map(tagId => {
        const tag = allTags.find(t => t.id === tagId);
        if (!tag) return '';
        return `<span class="smart-tag tag-${tag.color}" data-tag-id="${tag.id}">${tag.name}</span>`;
    }).join('');
};

// Render tag selector in modal
export const renderTagSelector = (containerId, selectedTagIds = []) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allTags = getSmartTags();

    container.innerHTML = `
        <div class="modal-section">
            <div class="modal-section-title">🏷️ Nhãn (Tags)</div>
            <div class="tag-selector">
                ${allTags.map(tag => `
                    <div class="tag-option tag-${tag.color} ${selectedTagIds.includes(tag.id) ? 'selected' : ''}" 
                         data-tag-id="${tag.id}">
                        ${tag.name}
                    </div>
                `).join('')}
            </div>
            <div class="custom-tag-input" style="margin-top: 12px;">
                <input type="text" id="new-tag-name" placeholder="Tạo nhãn mới...">
                <select id="new-tag-color">
                    <option value="red">🔴 Đỏ</option>
                    <option value="orange">🟠 Cam</option>
                    <option value="yellow">🟡 Vàng</option>
                    <option value="green">🟢 Xanh lá</option>
                    <option value="blue">🔵 Xanh dương</option>
                    <option value="purple">🟣 Tím</option>
                    <option value="pink">💗 Hồng</option>
                    <option value="gray">⚫ Xám</option>
                </select>
                <button id="btn-create-tag" style="padding: 8px 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">+</button>
            </div>
        </div>
    `;

    // Attach click events for tag selection
    container.querySelectorAll('.tag-option').forEach(tagEl => {
        tagEl.addEventListener('click', () => {
            tagEl.classList.toggle('selected');
        });
    });

    // Create new tag
    const createBtn = container.querySelector('#btn-create-tag');
    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            const name = document.getElementById('new-tag-name')?.value?.trim();
            const color = document.getElementById('new-tag-color')?.value || 'blue';

            if (!name) return;

            const newTag = {
                id: generateID('tag'),
                name: name,
                color: color
            };

            globalData.smartTags.push(newTag);
            await saveUserData(currentUser.uid, { smartTags: globalData.smartTags });

            // Re-render
            const selectedIds = Array.from(container.querySelectorAll('.tag-option.selected'))
                .map(el => el.dataset.tagId);
            renderTagSelector(containerId, [...selectedIds, newTag.id]);

            showNotification('✅ Đã tạo nhãn mới!');
        });
    }
};

// Get selected tag IDs from selector
export const getSelectedTags = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return [];

    return Array.from(container.querySelectorAll('.tag-option.selected'))
        .map(el => el.dataset.tagId);
};

// Add tag to task
export const addTagToTask = async (taskId, tagId) => {
    const task = globalData.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.smartTags) task.smartTags = [];
    if (!task.smartTags.includes(tagId)) {
        task.smartTags.push(tagId);
        await saveUserData(currentUser.uid, { tasks: globalData.tasks });
    }
};

// Remove tag from task
export const removeTagFromTask = async (taskId, tagId) => {
    const task = globalData.tasks.find(t => t.id === taskId);
    if (!task || !task.smartTags) return;

    task.smartTags = task.smartTags.filter(id => id !== tagId);
    await saveUserData(currentUser.uid, { tasks: globalData.tasks });
};

// Setup tag events
const setupTagEvents = () => {
    // Tag click event delegation
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('smart-tag')) {
            const tagId = e.target.dataset.tagId;
            if (tagId) {
                filterTasksByTag(tagId);
            }
        }
    });
};

// Filter tasks by tag
const filterTasksByTag = (tagId) => {
    const tag = getSmartTags().find(t => t.id === tagId);
    if (!tag) return;

    showNotification(`🏷️ Đang lọc theo: ${tag.name}`);
    window.dispatchEvent(new CustomEvent('filter-by-tag', { detail: { tagId } }));
};

// ============================================
// 3. PROJECT FOLDERS FEATURE
// ============================================

// Get all project folders
export const getProjectFolders = () => {
    if (!globalData) return DEFAULT_FOLDERS;
    return globalData.projectFolders || DEFAULT_FOLDERS;
};

// Render project folders filter
export const renderProjectFoldersFilter = () => {
    const container = document.getElementById('project-folders-filter');
    if (!container) return;

    const folders = getProjectFolders();
    const allTasksCount = (globalData.tasks || []).length;

    container.innerHTML = `
        <div class="project-filter-pills">
            <button class="project-pill active" data-folder-id="all">
                📋 Tất cả <span class="pill-count">${allTasksCount}</span>
            </button>
            ${folders.map(folder => {
        const count = (globalData.tasks || []).filter(t => t.folderId === folder.id).length;
        return `
                    <button class="project-pill" data-folder-id="${folder.id}">
                        ${folder.icon} ${folder.name} <span class="pill-count">${count}</span>
                    </button>
                `;
    }).join('')}
            <button class="project-pill" id="btn-manage-folders" style="background: #e2e8f0;">
                ⚙️ Quản lý
            </button>
        </div>
    `;

    // Attach events
    container.querySelectorAll('.project-pill[data-folder-id]').forEach(pill => {
        pill.addEventListener('click', () => {
            container.querySelectorAll('.project-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const folderId = pill.dataset.folderId;
            filterTasksByFolder(folderId);
        });
    });

    // Manage folders button
    const manageBtn = container.querySelector('#btn-manage-folders');
    if (manageBtn) {
        manageBtn.addEventListener('click', openFolderManageModal);
    }
};

// Filter tasks by folder
const filterTasksByFolder = (folderId) => {
    window.dispatchEvent(new CustomEvent('filter-by-folder', { detail: { folderId } }));

    // Update Kanban and task list
    if (window.renderTasks) {
        window.renderTasks(folderId === 'all' ? 'all' : folderId);
    }
};

// Render folder selector in task modal
export const renderFolderSelector = (containerId, selectedFolderId = '') => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const folders = getProjectFolders();

    container.innerHTML = `
        <select id="task-folder-select" class="folder-select" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem;">
            <option value="">📥 Không phân loại (Inbox)</option>
            ${folders.map(folder => `
                <option value="${folder.id}" ${selectedFolderId === folder.id ? 'selected' : ''}>
                    ${folder.icon} ${folder.name}
                </option>
            `).join('')}
        </select>
    `;
};

// Get selected folder from modal
export const getSelectedFolder = () => {
    const select = document.getElementById('task-folder-select');
    return select ? select.value : '';
};

// Create new folder
export const createFolder = async (name, icon = '📁', color = '#667eea') => {
    const newFolder = {
        id: generateID('folder'),
        name: name,
        icon: icon,
        color: color
    };

    globalData.projectFolders.push(newFolder);
    await saveUserData(currentUser.uid, { projectFolders: globalData.projectFolders });

    renderProjectFoldersFilter();
    showNotification('✅ Đã tạo thư mục mới!');

    return newFolder;
};

// Delete folder
export const deleteFolder = async (folderId) => {
    // Move tasks in this folder to inbox
    globalData.tasks.forEach(task => {
        if (task.folderId === folderId) {
            task.folderId = '';
        }
    });

    globalData.projectFolders = globalData.projectFolders.filter(f => f.id !== folderId);

    await saveUserData(currentUser.uid, {
        projectFolders: globalData.projectFolders,
        tasks: globalData.tasks
    });

    renderProjectFoldersFilter();
    showNotification('Đã xóa thư mục');
};

// Open folder manage panel
const openFolderManageModal = () => {
    if (!window.PanelManager) return;

    const folders = getProjectFolders();

    // Generate HTML
    const listHTML = folders.map(folder => `
        <div class="folder-manage-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 10px; margin-bottom: 10px;">
            <span style="font-size: 1.5rem;">${folder.icon}</span>
            <span style="flex: 1; font-weight: 600;">${folder.name}</span>
            <span style="color: #94a3b8; font-size: 0.85rem;">${(globalData.tasks || []).filter(t => t.folderId === folder.id).length} tasks</span>
            <button class="folder-delete-btn" data-folder-id="${folder.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem;">🗑️</button>
        </div>
    `).join('');

    const contentHTML = `
        <div id="folder-list" style="margin-bottom: 20px;">
            ${listHTML}
        </div>
        <div style="display: flex; gap: 10px;">
            <input type="text" id="new-folder-name" placeholder="Tên thư mục mới..." style="flex: 1; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px;">
            <select id="new-folder-icon" style="padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px;">
                <option value="📁">📁</option>
                <option value="💼">💼</option>
                <option value="🏠">🏠</option>
                <option value="📚">📚</option>
                <option value="🎯">🎯</option>
                <option value="💡">💡</option>
                <option value="🎨">🎨</option>
                <option value="🔧">🔧</option>
            </select>
            <button id="btn-add-folder" style="padding: 12px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">+ Thêm</button>
        </div>
    `;

    // Callback to attach events
    const onRender = (bodyEl) => {
        // Delete
        bodyEl.querySelectorAll('.folder-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const folderId = btn.dataset.folderId;
                if (confirm('Xóa thư mục này? Các task sẽ được chuyển về Inbox.')) {
                    await deleteFolder(folderId);
                    openFolderManageModal(); // Refresh
                }
            });
        });

        // Add
        const addBtn = bodyEl.querySelector('#btn-add-folder');
        if (addBtn) {
            addBtn.onclick = async () => {
                const nameInput = bodyEl.querySelector('#new-folder-name');
                const name = nameInput.value.trim();
                const icon = bodyEl.querySelector('#new-folder-icon').value;
                if (name) {
                    await createFolder(name, icon);
                    openFolderManageModal(); // Refresh
                }
            };
        }
    };

    window.PanelManager.openDynamic('📁 Quản lý Thư mục', contentHTML, onRender);
};

// Setup folder events
const setupFolderEvents = () => {
    // Render on page load
    setTimeout(() => {
        renderProjectFoldersFilter();
    }, 500);
};

// ============================================
// 4. TASK SNOOZE FEATURE
// ============================================

// Snooze options
const SNOOZE_OPTIONS = [
    { label: '1 giờ sau', duration: 60 * 60 * 1000 },
    { label: '2 giờ sau', duration: 2 * 60 * 60 * 1000 },
    { label: '4 giờ sau', duration: 4 * 60 * 60 * 1000 },
    { label: 'Sáng mai (8:00)', type: 'tomorrow_morning' },
    { label: 'Chiều mai (14:00)', type: 'tomorrow_afternoon' },
    { label: 'Tuần sau', type: 'next_week' }
];

// Snooze a task
export const snoozeTask = async (taskId, option) => {
    const task = globalData.tasks.find(t => t.id === taskId);
    if (!task) return;

    let snoozeUntil = new Date();

    if (option.duration) {
        snoozeUntil = new Date(Date.now() + option.duration);
    } else if (option.type === 'tomorrow_morning') {
        snoozeUntil.setDate(snoozeUntil.getDate() + 1);
        snoozeUntil.setHours(8, 0, 0, 0);
    } else if (option.type === 'tomorrow_afternoon') {
        snoozeUntil.setDate(snoozeUntil.getDate() + 1);
        snoozeUntil.setHours(14, 0, 0, 0);
    } else if (option.type === 'next_week') {
        snoozeUntil.setDate(snoozeUntil.getDate() + 7);
        snoozeUntil.setHours(8, 0, 0, 0);
    }

    task.snoozedUntil = snoozeUntil.toISOString();
    task.isSnoozed = true;

    await saveUserData(currentUser.uid, { tasks: globalData.tasks });

    showNotification(`⏰ Tạm ẩn đến ${formatSnoozeTime(snoozeUntil)}`);

    // Trigger refresh
    window.dispatchEvent(new CustomEvent('workspace-refresh'));
    if (window.renderTasks) window.renderTasks();
};

// Format snooze time for display
const formatSnoozeTime = (date) => {
    const d = new Date(date);
    const today = new Date();

    if (d.toDateString() === today.toDateString()) {
        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === tomorrow.toDateString()) {
        return `Ngày mai ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Check and unsnooze tasks
const checkSnoozedTasks = () => {
    if (!globalData.tasks) return;

    const now = new Date();
    let unsnoozedCount = 0;

    globalData.tasks.forEach(task => {
        if (task.isSnoozed && task.snoozedUntil) {
            const snoozeTime = new Date(task.snoozedUntil);
            if (now >= snoozeTime) {
                task.isSnoozed = false;
                task.snoozedUntil = null;
                unsnoozedCount++;
            }
        }
    });

    if (unsnoozedCount > 0) {
        saveUserData(currentUser.uid, { tasks: globalData.tasks });
        showNotification(`⏰ ${unsnoozedCount} công việc đã trở lại!`);

        if (window.renderTasks) window.renderTasks();
        window.dispatchEvent(new CustomEvent('workspace-refresh'));
    }
};

// Render snooze button
export const renderSnoozeButton = (taskId) => {
    return `
        <div class="snooze-wrapper" style="position: relative;">
            <button class="snooze-btn" data-task-id="${taskId}">
                ⏰ Tạm ẩn
            </button>
        </div>
    `;
};

// Show snooze dropdown
const showSnoozeDropdown = (button, taskId) => {
    // Remove existing dropdown
    document.querySelector('.snooze-dropdown')?.remove();

    const dropdown = document.createElement('div');
    dropdown.className = 'snooze-dropdown';
    dropdown.innerHTML = SNOOZE_OPTIONS.map((opt, index) => `
        <div class="snooze-option" data-option-index="${index}">
            <span class="snooze-icon">⏰</span>
            <span class="snooze-label">${opt.label}</span>
        </div>
    `).join('');

    button.parentElement.appendChild(dropdown);

    // Handle option click
    dropdown.querySelectorAll('.snooze-option').forEach((optEl, index) => {
        optEl.addEventListener('click', async () => {
            await snoozeTask(taskId, SNOOZE_OPTIONS[index]);
            dropdown.remove();
        });
    });

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && !button.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 100);
};

// Setup snooze events
const setupSnoozeEvents = () => {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('snooze-btn') || e.target.closest('.snooze-btn')) {
            const btn = e.target.classList.contains('snooze-btn') ? e.target : e.target.closest('.snooze-btn');
            const taskId = btn.dataset.taskId;
            if (taskId) {
                showSnoozeDropdown(btn, taskId);
            }
        }
    });
};

// ============================================
// HELPER EXPORTS FOR OTHER MODULES
// ============================================

// Check if task is snoozed
export const isTaskSnoozed = (taskId) => {
    const task = globalData.tasks?.find(t => t.id === taskId);
    return task?.isSnoozed && new Date(task.snoozedUntil) > new Date();
};

// Get visible tasks (excluding snoozed)
export const getVisibleTasks = () => {
    if (!globalData.tasks) return [];
    return globalData.tasks.filter(t => !isTaskSnoozed(t.id));
};

// Get tasks by folder
export const getTasksByFolder = (folderId) => {
    if (!globalData.tasks) return [];
    if (folderId === 'all' || !folderId) {
        return getVisibleTasks();
    }
    return getVisibleTasks().filter(t => t.folderId === folderId);
};

// Get tasks by tag
export const getTasksByTag = (tagId) => {
    if (!globalData.tasks) return [];
    return getVisibleTasks().filter(t => t.smartTags?.includes(tagId));
};

export default {
    initWorkspaceHub,
    renderSubtasks,
    renderTagSelector,
    getSelectedTags,
    renderFolderSelector,
    getSelectedFolder,
    renderSnoozeButton,
    isTaskSnoozed,
    getVisibleTasks,
    getTasksByFolder,
    getTasksByTag,
    getSmartTags,
    getProjectFolders
};
