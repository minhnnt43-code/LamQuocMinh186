// --- FILE: js/eisenhower.js ---
// Eisenhower Matrix Module with Auto-Classification & Drag-Drop

import { showNotification, escapeHTML } from './common.js';

let globalData = null;
let currentUser = null;
let draggedTask = null;

/**
 * Initialize Eisenhower Matrix
 */
export const initEisenhower = (data, user) => {
    globalData = data;
    currentUser = user;
    setupDragDropZones();
};

/**
 * Render Eisenhower Matrix
 */
export const renderEisenhowerMatrix = () => {
    const tasks = (globalData?.tasks || []).filter(t => t.status !== 'Hoàn thành');

    // Classify tasks into quadrants
    const classified = classifyTasks(tasks);

    // Render each quadrant
    renderQuadrant('q1', classified.q1);
    renderQuadrant('q2', classified.q2);
    renderQuadrant('q3', classified.q3);
    renderQuadrant('q4', classified.q4);

    // Update stats
    updateStats(classified);
};

/**
 * Classify tasks into 4 quadrants based on priority & dueDate
 * Q1: Urgent & Important (high priority + deadline <= 2 days)
 * Q2: Important, Not Urgent (high/medium priority + deadline > 2 days)
 * Q3: Urgent, Not Important (low priority + deadline <= 2 days)
 * Q4: Not Urgent, Not Important (low priority + no deadline or > 7 days)
 */
const classifyTasks = (tasks) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = { q1: [], q2: [], q3: [], q4: [] };

    tasks.forEach(task => {
        // If task has explicit quadrant, use it
        if (task.eisenhowerQuadrant) {
            result[task.eisenhowerQuadrant]?.push(task);
            return;
        }

        // Auto-classify based on priority and due date
        const isHighPriority = task.priority === 'high' || task.priority === 'Cao';
        const isMediumPriority = task.priority === 'medium' || task.priority === 'Trung bình';
        const isLowPriority = task.priority === 'low' || task.priority === 'Thấp' || !task.priority;

        let daysUntilDue = Infinity;
        if (task.dueDate) {
            const due = new Date(task.dueDate);
            due.setHours(0, 0, 0, 0);
            daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        }

        const isUrgent = daysUntilDue <= 2;
        const isSoon = daysUntilDue <= 7;

        // Classification logic
        if (isHighPriority && isUrgent) {
            result.q1.push(task); // Do First
        } else if ((isHighPriority || isMediumPriority) && !isUrgent) {
            result.q2.push(task); // Schedule
        } else if (isLowPriority && isUrgent) {
            result.q3.push(task); // Delegate
        } else {
            result.q4.push(task); // Delete/Ignore
        }
    });

    return result;
};

/**
 * Render a single quadrant
 */
const renderQuadrant = (quadrantId, tasks) => {
    const container = document.getElementById(`tasks-${quadrantId}`);
    const countEl = document.getElementById(`count-${quadrantId}`);

    if (!container) return;

    // Update count
    if (countEl) countEl.textContent = tasks.length;

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="quadrant-empty">
                <div class="emoji">${getQuadrantEmoji(quadrantId)}</div>
                <p>${getEmptyMessage(quadrantId)}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    tasks.forEach(task => {
        const card = createMatrixTaskCard(task);
        container.appendChild(card);
    });
};

/**
 * Get emoji for quadrant
 */
const getQuadrantEmoji = (q) => {
    switch (q) {
        case 'q1': return '✅';
        case 'q2': return '📋';
        case 'q3': return '💬';
        case 'q4': return '🎉';
        default: return '📌';
    }
};

/**
 * Get empty message for quadrant
 */
const getEmptyMessage = (q) => {
    switch (q) {
        case 'q1': return 'Không có việc khẩn cấp!';
        case 'q2': return 'Thêm việc quan trọng vào đây';
        case 'q3': return 'Ủy quyền nếu có thể';
        case 'q4': return 'Trống trơn, tốt lắm!';
        default: return 'Trống';
    }
};

/**
 * Create Task Card for Matrix
 */
const createMatrixTaskCard = (task) => {
    const card = document.createElement('div');
    card.className = 'matrix-task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;

    // Due date formatting
    let dueBadgeClass = '';
    let dueBadgeText = 'Không có hạn';

    if (task.dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (diff < 0) {
            dueBadgeClass = 'overdue';
            dueBadgeText = `Quá ${Math.abs(diff)} ngày`;
        } else if (diff === 0) {
            dueBadgeClass = 'today';
            dueBadgeText = 'Hôm nay';
        } else if (diff === 1) {
            dueBadgeText = 'Ngày mai';
        } else {
            dueBadgeText = `${diff} ngày nữa`;
        }
    }

    card.innerHTML = `
        <div class="matrix-task-name">${escapeHTML(task.name || '[Không tên]')}</div>
        <div class="matrix-task-meta">
            <span class="matrix-due-badge ${dueBadgeClass}">${dueBadgeText}</span>
        </div>
    `;

    // Drag handlers
    card.addEventListener('dragstart', (e) => handleDragStart(e, task));
    card.addEventListener('dragend', handleDragEnd);

    return card;
};

/**
 * Drag Start Handler
 */
const handleDragStart = (e, task) => {
    draggedTask = task;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
};

/**
 * Drag End Handler
 */
const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    draggedTask = null;

    // Remove all drop targets styling
    document.querySelectorAll('.matrix-quadrant').forEach(q => {
        q.classList.remove('drop-target', 'delete-active');
    });
};

/**
 * Setup Drag-Drop Zones for all quadrants
 */
const setupDragDropZones = () => {
    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        quadrant.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            quadrant.classList.add('drop-target');

            if (quadrant.dataset.quadrant === 'q4') {
                quadrant.classList.add('delete-active');
            }
        });

        quadrant.addEventListener('dragleave', (e) => {
            quadrant.classList.remove('drop-target', 'delete-active');
        });

        quadrant.addEventListener('drop', async (e) => {
            e.preventDefault();
            quadrant.classList.remove('drop-target', 'delete-active');

            if (!draggedTask) return;

            const newQuadrant = quadrant.dataset.quadrant;
            const task = globalData.tasks.find(t => t.id === draggedTask.id);

            if (task) {
                // Special handling for Q4 (Delete quadrant)
                if (newQuadrant === 'q4') {
                    const confirmDelete = confirm(`🗑️ Bạn có muốn bỏ qua task "${task.name}"?\n\nTask sẽ được chuyển vào "Không quan trọng"`);
                    if (!confirmDelete) {
                        draggedTask = null;
                        return;
                    }
                }

                // Update task's quadrant
                task.eisenhowerQuadrant = newQuadrant;

                // Also update priority based on quadrant
                if (newQuadrant === 'q1' || newQuadrant === 'q2') {
                    task.priority = 'high';
                } else if (newQuadrant === 'q3') {
                    task.priority = 'medium';
                } else {
                    task.priority = 'low';
                }

                // Save and re-render
                await saveData();
                renderEisenhowerMatrix();

                const quadrantNames = {
                    q1: 'Làm ngay',
                    q2: 'Lên lịch',
                    q3: 'Ủy quyền',
                    q4: 'Bỏ qua'
                };

                showNotification(`✅ "${task.name}" → ${quadrantNames[newQuadrant]}`, 'success');
            }

            draggedTask = null;
        });
    });
};

/**
 * Update Stats
 */
const updateStats = (classified) => {
    const totalTasks = globalData?.tasks?.filter(t => t.status !== 'Hoàn thành').length || 0;
    const doneTasks = globalData?.tasks?.filter(t => t.status === 'Hoàn thành').length || 0;

    const totalEl = document.getElementById('e-stat-total');
    const q1El = document.getElementById('e-stat-q1');
    const q2El = document.getElementById('e-stat-q2');
    const doneEl = document.getElementById('e-stat-done');

    if (totalEl) totalEl.textContent = totalTasks;
    if (q1El) q1El.textContent = classified.q1.length;
    if (q2El) q2El.textContent = classified.q2.length;
    if (doneEl) doneEl.textContent = doneTasks;
};

/**
 * Save Data
 */
const saveData = async () => {
    if (typeof window.saveUserData === 'function') {
        await window.saveUserData();
    } else {
        localStorage.setItem('lifeos-data', JSON.stringify(globalData));
    }
};
