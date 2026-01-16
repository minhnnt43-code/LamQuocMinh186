// --- FILE: js/advanced-features.js ---
// Advanced Features - 3 Features còn lại
// #98 Drag Resize Events, #117 Task Dependencies, #18 Infinite Scroll

import { showNotification, escapeHTML } from './common.js';

// ============================================================
// #98 - DRAG RESIZE EVENTS (Kéo thay đổi thời lượng)
// ============================================================

/**
 * Setup drag resize cho calendar events
 */
const setupEventResize = (calendarContainer) => {
    if (!calendarContainer) return;

    let isResizing = false;
    let currentEvent = null;
    let startY = 0;
    let startHeight = 0;

    calendarContainer.addEventListener('mousedown', (e) => {
        const resizeHandle = e.target.closest('.event-resize-handle');
        if (!resizeHandle) return;

        isResizing = true;
        currentEvent = resizeHandle.closest('.calendar-event');
        startY = e.clientY;
        startHeight = currentEvent.offsetHeight;

        e.preventDefault();
        document.body.style.cursor = 'ns-resize';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing || !currentEvent) return;

        const deltaY = e.clientY - startY;
        const newHeight = Math.max(30, startHeight + deltaY);
        currentEvent.style.height = `${newHeight}px`;

        // Calculate new duration based on height (assuming 60px = 1 hour)
        const hours = Math.round(newHeight / 60 * 2) / 2; // Round to 30 min
        const durationLabel = currentEvent.querySelector('.event-duration');
        if (durationLabel) {
            durationLabel.textContent = `${hours}h`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing && currentEvent) {
            const eventId = currentEvent.dataset.id;
            const newHeight = currentEvent.offsetHeight;
            const newDurationMinutes = Math.round(newHeight / 60 * 60);

            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('event-resized', {
                detail: { eventId, newDurationMinutes }
            }));

            showNotification(`Đã thay đổi thời lượng: ${Math.round(newDurationMinutes / 60 * 10) / 10}h`);
        }

        isResizing = false;
        currentEvent = null;
        document.body.style.cursor = '';
    });
};

/**
 * Add resize handle to event element
 */
const addResizeHandle = (eventElement) => {
    if (!eventElement || eventElement.querySelector('.event-resize-handle')) return;

    const handle = document.createElement('div');
    handle.className = 'event-resize-handle';
    handle.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 8px;
        cursor: ns-resize;
        background: linear-gradient(transparent, rgba(0,0,0,0.2));
        border-radius: 0 0 4px 4px;
    `;
    eventElement.appendChild(handle);
    eventElement.style.position = 'relative';
};

// ============================================================
// #117 - TASK DEPENDENCIES (Phụ thuộc công việc)
// ============================================================

/**
 * Add dependency to task
 */
const addTaskDependency = (taskId, dependsOnId, tasks) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return false;

    if (!task.dependencies) task.dependencies = [];

    // Check circular dependency
    if (hasCircularDependency(taskId, dependsOnId, tasks)) {
        showNotification('Không thể thêm: phụ thuộc vòng!', 'error');
        return false;
    }

    if (!task.dependencies.includes(dependsOnId)) {
        task.dependencies.push(dependsOnId);
        return true;
    }
    return false;
};

/**
 * Remove dependency from task
 */
const removeTaskDependency = (taskId, dependsOnId, tasks) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.dependencies) return false;

    const index = task.dependencies.indexOf(dependsOnId);
    if (index > -1) {
        task.dependencies.splice(index, 1);
        return true;
    }
    return false;
};

/**
 * Check if task can be started (all dependencies completed)
 */
const canStartTask = (taskId, tasks) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) return true;

    return task.dependencies.every(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask && depTask.status === 'Hoàn thành';
    });
};

/**
 * Check circular dependency
 */
const hasCircularDependency = (taskId, newDepId, tasks, visited = new Set()) => {
    if (taskId === newDepId) return true;
    if (visited.has(newDepId)) return false;

    visited.add(newDepId);
    const depTask = tasks.find(t => t.id === newDepId);
    if (!depTask || !depTask.dependencies) return false;

    return depTask.dependencies.some(d => hasCircularDependency(taskId, d, tasks, visited));
};

/**
 * Render dependency selector UI
 */
const renderDependencySelector = (taskId, tasks, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentTask = tasks.find(t => t.id === taskId);
    const currentDeps = currentTask?.dependencies || [];
    const otherTasks = tasks.filter(t => t.id !== taskId && t.status !== 'Hoàn thành');

    container.innerHTML = `
        <div class="dependency-selector" style="padding:15px;background:#f8fafc;border-radius:12px;">
            <h4 style="margin:0 0 10px;color:#4b5563;">🔗 Phụ thuộc (phải xong trước)</h4>
            <div style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;">
                ${otherTasks.length === 0 ? '<p style="color:#9ca3af;font-size:0.85rem;">Không có task khác</p>' :
            otherTasks.map(t => `
                        <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:white;border-radius:8px;cursor:pointer;border:1px solid ${currentDeps.includes(t.id) ? '#3b82f6' : '#e5e7eb'};">
                            <input type="checkbox" class="dep-checkbox" data-dep-id="${t.id}" 
                                   ${currentDeps.includes(t.id) ? 'checked' : ''}>
                            <span style="flex:1;">${escapeHTML(t.name)}</span>
                            ${t.dueDate ? `<span style="font-size:0.75rem;color:#6b7280;">📅 ${t.dueDate}</span>` : ''}
                        </label>
                    `).join('')
        }
            </div>
        </div>
    `;

    container.querySelectorAll('.dep-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const depId = cb.dataset.depId;
            if (cb.checked) {
                addTaskDependency(taskId, depId, tasks);
            } else {
                removeTaskDependency(taskId, depId, tasks);
            }
        });
    });
};

/**
 * Render dependency arrows (visual)
 */
const renderDependencyArrows = (tasks, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing arrows
    container.querySelectorAll('.dependency-arrow').forEach(a => a.remove());

    tasks.forEach(task => {
        if (!task.dependencies || task.dependencies.length === 0) return;

        const taskEl = container.querySelector(`[data-task-id="${task.id}"]`);
        if (!taskEl) return;

        task.dependencies.forEach(depId => {
            const depEl = container.querySelector(`[data-task-id="${depId}"]`);
            if (!depEl) return;

            // Create arrow line
            const arrow = document.createElement('div');
            arrow.className = 'dependency-arrow';
            arrow.style.cssText = `
                position: absolute;
                background: #3b82f6;
                height: 2px;
                transform-origin: left center;
                z-index: 1;
                pointer-events: none;
            `;

            // Calculate position (simplified - would need proper calculation in real app)
            const depRect = depEl.getBoundingClientRect();
            const taskRect = taskEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const startX = depRect.right - containerRect.left;
            const startY = depRect.top + depRect.height / 2 - containerRect.top;
            const endX = taskRect.left - containerRect.left;
            const endY = taskRect.top + taskRect.height / 2 - containerRect.top;

            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

            arrow.style.left = `${startX}px`;
            arrow.style.top = `${startY}px`;
            arrow.style.width = `${length}px`;
            arrow.style.transform = `rotate(${angle}deg)`;

            container.appendChild(arrow);
        });
    });
};

// ============================================================
// #18 - INFINITE SCROLL (Cuộn vô hạn)
// ============================================================

/**
 * Setup infinite scroll for a container
 */
const setupInfiniteScroll = (containerId, loadMoreCallback, options = {}) => {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const {
        threshold = 100,  // px from bottom to trigger load
        loadingText = 'Đang tải thêm...',
        noMoreText = 'Đã hết dữ liệu'
    } = options;

    let isLoading = false;
    let hasMore = true;
    let page = 1;

    // Create loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.id = `${containerId}-loading`;
    loadingEl.style.cssText = `
        text-align: center;
        padding: 20px;
        color: #6b7280;
        display: none;
    `;
    loadingEl.innerHTML = `<span class="infinite-loading-spinner">⏳</span> ${loadingText}`;
    container.appendChild(loadingEl);

    const checkScroll = async () => {
        if (isLoading || !hasMore) return;

        const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

        if (scrollBottom < threshold) {
            isLoading = true;
            loadingEl.style.display = 'block';

            try {
                const result = await loadMoreCallback(page);

                if (result && result.hasMore === false) {
                    hasMore = false;
                    loadingEl.innerHTML = `📭 ${noMoreText}`;
                } else {
                    page++;
                    loadingEl.style.display = 'none';
                }
            } catch (e) {
                console.error('Infinite scroll error:', e);
                loadingEl.innerHTML = '❌ Lỗi tải dữ liệu';
            }

            isLoading = false;
        }
    };

    container.addEventListener('scroll', checkScroll);

    return {
        reset: () => {
            page = 1;
            hasMore = true;
            isLoading = false;
            loadingEl.style.display = 'none';
            loadingEl.innerHTML = `<span class="infinite-loading-spinner">⏳</span> ${loadingText}`;
        },
        setHasMore: (value) => { hasMore = value; },
        destroy: () => {
            container.removeEventListener('scroll', checkScroll);
            loadingEl.remove();
        }
    };
};

/**
 * Paginate array for infinite scroll
 */
const paginateData = (data, page, pageSize = 20) => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = data.slice(start, end);

    return {
        items,
        hasMore: end < data.length,
        page,
        total: data.length
    };
};

// ============================================================
// CSS cho các features
// ============================================================
const addAdvancedStyles = () => {
    if (document.getElementById('advanced-features-styles')) return;

    const style = document.createElement('style');
    style.id = 'advanced-features-styles';
    style.textContent = `
        .event-resize-handle:hover {
            background: linear-gradient(transparent, rgba(59,130,246,0.3)) !important;
        }
        
        .task-blocked {
            opacity: 0.6;
            position: relative;
        }
        .task-blocked::before {
            content: '🔒';
            position: absolute;
            top: 5px;
            right: 5px;
            font-size: 0.8rem;
        }
        
        .infinite-loading-spinner {
            display: inline-block;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .dependency-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #dbeafe;
            color: #1d4ed8;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.7rem;
        }
    `;
    document.head.appendChild(style);
};

// Initialize
export const initAdvancedFeatures = () => {
    addAdvancedStyles();
};

// Export
export {
    setupEventResize,
    addResizeHandle,
    addTaskDependency,
    removeTaskDependency,
    canStartTask,
    hasCircularDependency,
    renderDependencySelector,
    renderDependencyArrows,
    setupInfiniteScroll,
    paginateData
};
