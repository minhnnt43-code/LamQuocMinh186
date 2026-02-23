// ============================================================
// FILE: js/goals.js
// Quản lý Mục tiêu Dài hạn (OKRs / Goals)
// ============================================================

import { escapeHTML, generateID, showNotification, formatDate } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;

const GOAL_ICONS = ['🎯', '📚', '💼', '🏆', '🚀', '💡', '🎓', '⭐', '🔥', '📈', '🏅', '🎨'];

// ============================================================
// INIT
// ============================================================
export function initGoalsModule(userData, user) {
    globalData = userData;
    currentUser = user;

    if (!globalData.goals) globalData.goals = [];

    renderGoalsGrid();
    populateGoalDropdownInTaskForm();
    setupGoalEvents();

    console.log('✅ Goals/OKR Module initialized');
}

// ============================================================
// RENDER GOALS GRID
// ============================================================
function renderGoalsGrid() {
    const container = document.getElementById('goals-grid');
    if (!container) return;

    if (globalData.goals.length === 0) {
        container.innerHTML = `
            <div class="goals-empty" style="grid-column: 1/-1;">
                <div class="emoji">🎯</div>
                <p>Chưa có mục tiêu nào. Hãy tạo mục tiêu đầu tiên!</p>
            </div>
        `;
        return;
    }

    // SVG gradient definition (shared)
    let html = `
        <svg width="0" height="0" style="position:absolute;">
            <defs>
                <linearGradient id="goal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:var(--primary-color)"/>
                    <stop offset="100%" style="stop-color:var(--secondary-color)"/>
                </linearGradient>
            </defs>
        </svg>
    `;

    globalData.goals.forEach(goal => {
        const linkedTasks = getLinkedTasks(goal.id);
        const doneTasks = linkedTasks.filter(t => t.status === 'Hoàn thành');
        const progress = linkedTasks.length > 0 ? Math.round((doneTasks.length / linkedTasks.length) * 100) : 0;

        const circumference = 2 * Math.PI * 22;
        const offset = circumference - (progress / 100) * circumference;

        html += `
            <div class="goal-card" data-goal-id="${goal.id}">
                <div class="goal-card-actions">
                    <button class="goal-action-btn edit" data-goal-id="${goal.id}" title="Sửa">✏️</button>
                    <button class="goal-action-btn delete" data-goal-id="${goal.id}" title="Xóa">🗑️</button>
                </div>

                <div class="goal-card-header">
                    <div class="goal-icon">${goal.icon || '🎯'}</div>
                    <div class="goal-card-info">
                        <h3 class="goal-card-title">${escapeHTML(goal.title)}</h3>
                        <p class="goal-card-desc">${escapeHTML(goal.description || '')}</p>
                    </div>
                </div>

                <div class="goal-progress-container">
                    <div class="goal-progress-ring">
                        <svg width="56" height="56" viewBox="0 0 56 56">
                            <circle class="ring-bg" cx="28" cy="28" r="22"/>
                            <circle class="ring-fill" cx="28" cy="28" r="22"
                                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"/>
                        </svg>
                        <div class="goal-progress-text">${progress}%</div>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="goal-progress-bar-track">
                            <div class="goal-progress-bar-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="goal-progress-label">${doneTasks.length}/${linkedTasks.length} hoàn thành</div>
                    </div>
                </div>

                <div class="goal-card-meta">
                    <span class="goal-task-count">📋 ${linkedTasks.length} công việc</span>
                    ${goal.deadline ? `<span class="goal-deadline">📅 ${formatDate(goal.deadline)}</span>` : ''}
                </div>

                <div class="goal-accordion">
                    <ul class="goal-accordion-list">
                        ${linkedTasks.length > 0 ? linkedTasks.map(task => {
                            const statusClass = task.status === 'Hoàn thành' ? 'done' : (task.status === 'Đang làm' ? 'in-progress' : 'pending');
                            return `
                                <li class="goal-accordion-item">
                                    <span class="task-status-dot ${statusClass}"></span>
                                    <span class="task-name">${escapeHTML(task.name || '[Không tên]')}</span>
                                    <span class="task-due">${task.dueDate ? formatDate(task.dueDate) : ''}</span>
                                </li>
                            `;
                        }).join('') : '<li class="goal-accordion-item" style="color:var(--text-color-secondary);">Chưa có task nào liên kết</li>'}
                    </ul>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Accordion toggle
    container.querySelectorAll('.goal-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.goal-action-btn')) return;
            card.classList.toggle('expanded');
        });
    });

    // Edit buttons
    container.querySelectorAll('.goal-action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const goalId = btn.dataset.goalId;
            const goal = globalData.goals.find(g => g.id === goalId);
            if (goal) openGoalModal(goal);
        });
    });

    // Delete buttons
    container.querySelectorAll('.goal-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const goalId = btn.dataset.goalId;
            deleteGoal(goalId);
        });
    });
}

// ============================================================
// HELPERS
// ============================================================
function getLinkedTasks(goalId) {
    return (globalData.tasks || []).filter(t => t.goalId === goalId);
}

// ============================================================
// GOAL MODAL
// ============================================================
function openGoalModal(goal = null) {
    // Remove existing modal
    document.getElementById('goal-modal')?.remove();

    const isEdit = !!goal;
    const selectedIcon = goal?.icon || '🎯';

    const modal = document.createElement('div');
    modal.id = 'goal-modal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 520px; border-radius: 16px; overflow: hidden;">
            <div class="modal-header" style="background: var(--grad-main); color: white; padding: 18px 24px;">
                <h2 style="margin:0; font-size:1.15rem;">${isEdit ? '✏️ Sửa mục tiêu' : '🎯 Tạo mục tiêu mới'}</h2>
                <button class="close-btn" id="close-goal-modal" style="color:white; font-size:1.5rem;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 24px;">
                <div class="goal-modal-form">
                    <div class="form-group">
                        <label>Biểu tượng</label>
                        <div class="goal-icon-picker">
                            ${GOAL_ICONS.map(icon => `
                                <div class="goal-icon-option ${icon === selectedIcon ? 'selected' : ''}" data-icon="${icon}">${icon}</div>
                            `).join('')}
                        </div>
                        <input type="hidden" id="goal-icon-value" value="${selectedIcon}">
                    </div>
                    <div class="form-group">
                        <label>Tên mục tiêu *</label>
                        <input type="text" id="goal-title-input" placeholder="VD: Đạt IELTS 7.5" value="${escapeHTML(goal?.title || '')}">
                    </div>
                    <div class="form-group">
                        <label>Mô tả</label>
                        <textarea id="goal-desc-input" rows="3" placeholder="Mô tả chi tiết mục tiêu...">${escapeHTML(goal?.description || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Hạn hoàn thành (tùy chọn)</label>
                        <input type="date" id="goal-deadline-input" value="${goal?.deadline || ''}">
                    </div>
                    <input type="hidden" id="goal-edit-id" value="${goal?.id || ''}">
                    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
                        <button class="btn-submit" id="btn-save-goal" style="background: var(--grad-main); border:none; padding:12px 28px; border-radius:10px; color:white; font-weight:600; cursor:pointer;">
                            💾 ${isEdit ? 'Lưu thay đổi' : 'Tạo mục tiêu'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Icon picker
    modal.querySelectorAll('.goal-icon-option').forEach(opt => {
        opt.addEventListener('click', () => {
            modal.querySelectorAll('.goal-icon-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            document.getElementById('goal-icon-value').value = opt.dataset.icon;
        });
    });

    // Close
    document.getElementById('close-goal-modal').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Save
    document.getElementById('btn-save-goal').onclick = () => handleSaveGoal();

    // Focus
    setTimeout(() => document.getElementById('goal-title-input')?.focus(), 100);
}

// ============================================================
// SAVE GOAL
// ============================================================
async function handleSaveGoal() {
    const title = document.getElementById('goal-title-input')?.value.trim();
    if (!title) {
        showNotification('Vui lòng nhập tên mục tiêu!', 'warning');
        return;
    }

    const editId = document.getElementById('goal-edit-id')?.value;
    const icon = document.getElementById('goal-icon-value')?.value || '🎯';
    const description = document.getElementById('goal-desc-input')?.value.trim() || '';
    const deadline = document.getElementById('goal-deadline-input')?.value || '';

    if (editId) {
        // Update existing
        const goal = globalData.goals.find(g => g.id === editId);
        if (goal) {
            goal.title = title;
            goal.icon = icon;
            goal.description = description;
            goal.deadline = deadline;
            goal.updatedAt = new Date().toISOString();
        }
    } else {
        // Create new
        globalData.goals.push({
            id: generateID('goal_'),
            title,
            icon,
            description,
            deadline,
            createdAt: new Date().toISOString()
        });
    }

    try {
        await saveUserData(currentUser.uid, { goals: globalData.goals });
        showNotification(editId ? '✅ Đã cập nhật mục tiêu!' : '🎯 Đã tạo mục tiêu mới!', 'success');
        document.getElementById('goal-modal')?.remove();
        renderGoalsGrid();
        populateGoalDropdownInTaskForm();
    } catch (err) {
        console.error('Save goal error:', err);
        showNotification('Lỗi khi lưu mục tiêu!', 'error');
    }
}

// ============================================================
// DELETE GOAL
// ============================================================
async function deleteGoal(goalId) {
    const goal = globalData.goals.find(g => g.id === goalId);
    if (!goal) return;

    if (!confirm(`Bạn có chắc muốn xóa mục tiêu "${goal.title}"?\n\nCác task liên kết sẽ KHÔNG bị xóa, chỉ bỏ liên kết.`)) return;

    // Remove goal
    globalData.goals = globalData.goals.filter(g => g.id !== goalId);

    // Unlink tasks
    (globalData.tasks || []).forEach(task => {
        if (task.goalId === goalId) {
            delete task.goalId;
        }
    });

    try {
        await saveUserData(currentUser.uid, { goals: globalData.goals, tasks: globalData.tasks });
        showNotification('🗑️ Đã xóa mục tiêu!', 'success');
        renderGoalsGrid();
        populateGoalDropdownInTaskForm();
    } catch (err) {
        console.error('Delete goal error:', err);
        showNotification('Lỗi khi xóa mục tiêu!', 'error');
    }
}

// ============================================================
// POPULATE GOAL DROPDOWN IN TASK FORM
// ============================================================
function populateGoalDropdownInTaskForm() {
    const select = document.getElementById('task-goal');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Không</option>';

    (globalData.goals || []).forEach(goal => {
        const opt = document.createElement('option');
        opt.value = goal.id;
        opt.textContent = `${goal.icon || '🎯'} ${goal.title}`;
        select.appendChild(opt);
    });

    // Restore previous selection
    if (currentValue) select.value = currentValue;
}

// ============================================================
// SETUP EVENTS
// ============================================================
function setupGoalEvents() {
    // Add goal button
    const addBtn = document.getElementById('btn-add-goal');
    if (addBtn) {
        addBtn.addEventListener('click', () => openGoalModal());
    }

    // Listen for task saves to refresh progress
    window.addEventListener('kanban-refresh', () => {
        renderGoalsGrid();
    });
}

// ============================================================
// EXPORT for external access
// ============================================================
export { renderGoalsGrid, populateGoalDropdownInTaskForm };
