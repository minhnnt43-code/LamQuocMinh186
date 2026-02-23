// --- FILE: js/day-preview.js ---
// Quick Preview Popup for Month View Calendar

import { escapeHTML } from './common.js';

let popupElement = null;
let overlayElement = null;
let currentDate = null;

/**
 * Initialize Day Preview Popup
 */
export const initDayPreview = () => {
    createPopupElements();
    setupMonthViewClickHandlers();
};

/**
 * Create popup DOM elements
 */
const createPopupElements = () => {
    // Overlay
    overlayElement = document.createElement('div');
    overlayElement.className = 'popup-overlay';
    overlayElement.addEventListener('click', hidePopup);
    document.body.appendChild(overlayElement);

    // Popup
    popupElement = document.createElement('div');
    popupElement.className = 'day-preview-popup';
    popupElement.id = 'day-preview-popup';
    document.body.appendChild(popupElement);
};

/**
 * Setup click handlers for month view cells
 */
const setupMonthViewClickHandlers = () => {
    // Use event delegation on calendar container
    document.addEventListener('click', (e) => {
        // Check if clicking on a month view day cell
        const dayCell = e.target.closest('.month-day-cell, .calendar-day, td[data-date]');

        if (dayCell && isMonthViewActive()) {
            e.preventDefault();
            e.stopPropagation();

            const date = dayCell.dataset.date || extractDateFromCell(dayCell);
            if (date) {
                showPopup(date, e.clientX, e.clientY);
            }
        }
    });
};

/**
 * Check if month view is currently active
 */
const isMonthViewActive = () => {
    const activeBtn = document.querySelector('.view-btn.active[data-calendar-view]');
    return activeBtn && activeBtn.dataset.calendarView === 'month';
};

/**
 * Extract date from cell element
 */
const extractDateFromCell = (cell) => {
    // Try to get date from cell's data attributes or content
    if (cell.dataset.date) return cell.dataset.date;

    // Try to construct from cell position and current month
    const dayNumber = cell.querySelector('.day-number, .month-day-number')?.textContent?.trim();
    if (dayNumber) {
        const currentMonth = getCurrentMonthYear();
        if (currentMonth) {
            return `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        }
    }

    return null;
};

/**
 * Get current displayed month/year
 */
const getCurrentMonthYear = () => {
    // Try to get from calendar header
    const headerText = document.querySelector('.calendar-title, #calendar-header, .current-month-year')?.textContent;
    if (headerText) {
        const match = headerText.match(/(\d{1,2})\/(\d{4})|Tháng (\d{1,2}) (\d{4})/);
        if (match) {
            return {
                month: parseInt(match[1] || match[3]),
                year: parseInt(match[2] || match[4])
            };
        }
    }

    // Fallback to current date
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
};

/**
 * Show popup at position
 */
const showPopup = (date, x, y) => {
    currentDate = date;

    // Get events/tasks for this date
    const items = getItemsForDate(date);

    // Format date for display
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Build popup content
    popupElement.innerHTML = `
        <div class="popup-header">
            <h4>📅 ${formattedDate}</h4>
            <button class="popup-close-btn" id="popup-close">✕</button>
        </div>
        <div class="popup-content">
            ${items.length > 0 ? `
                <div class="popup-event-list">
                    ${items.map(item => renderPopupItem(item)).join('')}
                </div>
            ` : `
                <div class="popup-empty">
                    <div class="emoji">📭</div>
                    <p>Không có sự kiện nào</p>
                </div>
            `}
            <button class="popup-add-btn" id="popup-add-task">+ Thêm công việc</button>
        </div>
    `;

    // Position popup
    positionPopup(x, y);

    // Show
    popupElement.classList.add('active');
    overlayElement.classList.add('active');

    // Event listeners
    popupElement.querySelector('#popup-close').addEventListener('click', hidePopup);
    popupElement.querySelector('#popup-add-task').addEventListener('click', () => {
        hidePopup();
        openAddTaskModal(date);
    });

    // Click on items
    popupElement.querySelectorAll('.popup-event-item').forEach(item => {
        item.addEventListener('click', () => {
            const taskId = item.dataset.taskId;
            hidePopup();
            openTaskDetail(taskId);
        });
    });
};

/**
 * Position popup near click point
 */
const positionPopup = (x, y) => {
    const popup = popupElement;
    const padding = 20;

    // Temporarily show to get dimensions
    popup.style.visibility = 'hidden';
    popup.style.display = 'block';

    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position
    let left = x + 10;
    let top = y + 10;

    // Adjust if out of viewport
    if (left + popupWidth > viewportWidth - padding) {
        left = x - popupWidth - 10;
    }
    if (top + popupHeight > viewportHeight - padding) {
        top = y - popupHeight - 10;
    }
    if (left < padding) left = padding;
    if (top < padding) top = padding;

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.visibility = 'visible';
};

/**
 * Hide popup
 */
const hidePopup = () => {
    popupElement.classList.remove('active');
    overlayElement.classList.remove('active');
    currentDate = null;
};

/**
 * Get items (events + tasks) for a specific date
 */
const getItemsForDate = (date) => {
    const items = [];
    const globalData = window.globalData || {};

    // Get tasks with this due date or scheduled date
    const tasks = globalData.tasks || [];
    tasks.forEach(task => {
        if (task.dueDate === date || task.scheduledDate === date) {
            items.push({
                type: 'task',
                id: task.id,
                title: task.name || task.title,
                time: task.scheduledTime || null,
                priority: task.priority,
                status: task.status
            });
        }
    });

    // Get events/meetings
    const events = globalData.events || globalData.meetings || [];
    events.forEach(event => {
        if (event.date === date || event.startDate === date) {
            items.push({
                type: 'event',
                id: event.id,
                title: event.title || event.name,
                time: event.time || event.startTime,
                color: event.color
            });
        }
    });

    // Sort by time
    items.sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
    });

    return items;
};

/**
 * Render a popup item
 */
const renderPopupItem = (item) => {
    let priorityClass = '';
    if (item.priority === 'high' || item.priority === 'Cao') priorityClass = 'high-priority';
    else if (item.priority === 'medium' || item.priority === 'Trung bình') priorityClass = 'medium-priority';
    else if (item.priority === 'low' || item.priority === 'Thấp') priorityClass = 'low-priority';

    return `
        <div class="popup-event-item ${item.type} ${priorityClass}" data-task-id="${item.id}">
            <div class="popup-event-title">${escapeHTML(item.title || '[Không tên]')}</div>
            ${item.time ? `<div class="popup-event-time">🕐 ${item.time}</div>` : ''}
        </div>
    `;
};

/**
 * Open add task modal with pre-filled date
 */
const openAddTaskModal = (date) => {
    // Try to find existing add task modal/function
    if (typeof window.openAddTaskModal === 'function') {
        window.openAddTaskModal({ dueDate: date });
    } else if (typeof window.showTaskModal === 'function') {
        window.showTaskModal({ dueDate: date });
    } else {
        // Fallback: try clicking add task button
        const addBtn = document.querySelector('#btn-add-task, .add-task-btn, [data-action="add-task"]');
        if (addBtn) addBtn.click();
    }
};

/**
 * Open task detail
 */
const openTaskDetail = (taskId) => {
    if (typeof window.openTaskDetail === 'function') {
        window.openTaskDetail(taskId);
    } else if (typeof window.editTask === 'function') {
        window.editTask(taskId);
    }
    // If no function available, the click just closes the popup
};

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDayPreview);
} else {
    initDayPreview();
}
