// --- FILE: js/ai-events.js ---
// AI Calendar Events Enhancements - Phase D
// #96 Recurring Events, #106 Location Map, #113 Event Status

import { aiService } from './ai-service.js';
import { showNotification, generateID, escapeHTML } from './common.js';
import { saveUserData } from './firebase.js';

let globalData = null;
let currentUser = null;

/**
 * Khởi tạo AI Events module
 */
export const initAIEvents = (data, user) => {
    globalData = data;
    currentUser = user;
    setupEventsEnhancements();
};

/**
 * Setup events
 */
const setupEventsEnhancements = () => {
    // Recurring event toggle
    document.getElementById('event-recurring-type')?.addEventListener('change', handleRecurringChange);

    // Location search
    document.getElementById('btn-search-location')?.addEventListener('click', handleLocationSearch);

    // Status selector
    document.getElementById('event-status')?.addEventListener('change', updateEventStatusUI);
};

// ============================================================
// #96 - RECURRING EVENTS (Sự kiện lặp lại)
// ============================================================
const RECURRENCE_PATTERNS = {
    none: { label: 'Không lặp', icon: '📌' },
    daily: { label: 'Hàng ngày', icon: '📅' },
    weekly: { label: 'Hàng tuần', icon: '📆' },
    biweekly: { label: '2 tuần/lần', icon: '📆' },
    monthly: { label: 'Hàng tháng', icon: '🗓️' },
    yearly: { label: 'Hàng năm', icon: '🎂' },
    weekdays: { label: 'Ngày trong tuần', icon: '💼' },
    custom: { label: 'Tùy chỉnh', icon: '⚙️' }
};

const handleRecurringChange = (e) => {
    const type = e.target.value;
    const customContainer = document.getElementById('recurring-custom-options');

    if (customContainer) {
        customContainer.style.display = type === 'custom' ? 'block' : 'none';
    }
};

/**
 * Generate recurring events
 */
const generateRecurringEvents = (baseEvent, pattern, endDate, count = 10) => {
    const events = [];
    const startDate = new Date(baseEvent.date);
    let current = new Date(startDate);
    let generated = 0;
    const maxDate = endDate ? new Date(endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    while (generated < count && current <= maxDate) {
        events.push({
            ...baseEvent,
            id: generateID('event'),
            date: current.toISOString().split('T')[0],
            isRecurring: true,
            recurringParentId: baseEvent.id,
            recurringPattern: pattern
        });

        // Move to next occurrence
        switch (pattern) {
            case 'daily':
                current.setDate(current.getDate() + 1);
                break;
            case 'weekly':
                current.setDate(current.getDate() + 7);
                break;
            case 'biweekly':
                current.setDate(current.getDate() + 14);
                break;
            case 'monthly':
                current.setMonth(current.getMonth() + 1);
                break;
            case 'yearly':
                current.setFullYear(current.getFullYear() + 1);
                break;
            case 'weekdays':
                do {
                    current.setDate(current.getDate() + 1);
                } while (current.getDay() === 0 || current.getDay() === 6);
                break;
            default:
                current.setDate(current.getDate() + 7);
        }
        generated++;
    }

    return events;
};

/**
 * Add recurring event
 */
const addRecurringEvent = async (baseEvent, pattern, endDate) => {
    if (pattern === 'none') {
        // Single event
        if (!globalData.calendarEvents) globalData.calendarEvents = [];
        globalData.calendarEvents.push(baseEvent);
    } else {
        // Generate recurring events
        const events = generateRecurringEvents(baseEvent, pattern, endDate);
        if (!globalData.calendarEvents) globalData.calendarEvents = [];
        globalData.calendarEvents.push(...events);
        showNotification(`Đã tạo ${events.length} sự kiện ${RECURRENCE_PATTERNS[pattern].label}!`);
    }

    await saveUserData(currentUser.uid, { calendarEvents: globalData.calendarEvents });
    if (window.renderCalendar) window.renderCalendar();
};

// ============================================================
// #106 - LOCATION MAP (Bản đồ địa điểm)
// ============================================================
const handleLocationSearch = async () => {
    const input = document.getElementById('event-location');
    const location = input?.value?.trim();

    if (!location) {
        showNotification('Vui lòng nhập địa điểm!', 'error');
        return;
    }

    // Open Google Maps in new tab
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
    window.open(mapsUrl, '_blank');
};

/**
 * Show location preview
 */
const showLocationPreview = (location) => {
    if (!location) return;

    const container = document.getElementById('location-preview');
    if (!container) return;

    // Google Maps embed
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(location)}`;

    container.innerHTML = `
        <div style="margin-top:10px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="padding:10px;background:#f3f4f6;display:flex;align-items:center;gap:8px;">
                <span>📍</span>
                <span style="flex:1;font-size:0.9rem;">${escapeHTML(location)}</span>
                <a href="https://www.google.com/maps/search/${encodeURIComponent(location)}" 
                   target="_blank" style="color:#3b82f6;font-size:0.8rem;">Xem bản đồ →</a>
            </div>
        </div>
    `;
    container.style.display = 'block';
};

// ============================================================
// #113 - EVENT STATUS (Trạng thái sự kiện)
// ============================================================
const EVENT_STATUSES = {
    confirmed: { label: 'Xác nhận', color: '#10b981', icon: '✅' },
    tentative: { label: 'Tạm thời', color: '#f59e0b', icon: '❓' },
    cancelled: { label: 'Đã hủy', color: '#ef4444', icon: '❌' },
    completed: { label: 'Hoàn thành', color: '#6366f1', icon: '🎉' }
};

const updateEventStatusUI = (e) => {
    const status = e.target.value;
    const statusInfo = EVENT_STATUSES[status] || EVENT_STATUSES.confirmed;

    const indicator = document.getElementById('event-status-indicator');
    if (indicator) {
        indicator.innerHTML = `${statusInfo.icon} ${statusInfo.label}`;
        indicator.style.color = statusInfo.color;
    }
};

/**
 * Get status badge HTML
 */
const getEventStatusBadge = (status) => {
    const info = EVENT_STATUSES[status] || EVENT_STATUSES.confirmed;
    return `<span style="
        display:inline-flex;align-items:center;gap:4px;
        padding:2px 8px;border-radius:12px;font-size:0.75rem;
        background:${info.color}20;color:${info.color};font-weight:500;
    ">${info.icon} ${info.label}</span>`;
};

// ============================================================
// AI: Suggest Best Time for Event
// ============================================================
const suggestBestEventTime = async (eventTitle, duration = 60) => {
    const events = globalData?.calendarEvents || [];
    const tasks = globalData?.tasks || [];

    const existingSlots = events.map(e => `${e.date} ${e.startTime}-${e.endTime}`).join(', ');
    const busyDays = tasks.filter(t => t.dueDate).map(t => t.dueDate).join(', ');

    const prompt = `Gợi ý thời gian tốt nhất cho sự kiện "${eventTitle}" (${duration} phút).

Slots đã có: ${existingSlots || 'Không có'}
Ngày bận (có deadline): ${busyDays || 'Không có'}

Trả về JSON:
{"date": "YYYY-MM-DD", "startTime": "HH:MM", "reason": "lý do"}`;

    try {
        const response = await aiService.ask(prompt, {
            systemPrompt: 'Bạn là trợ lý lên lịch. Tìm slot tốt nhất.'
        });

        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
    } catch (e) {
        console.error('Suggest time error:', e);
    }
    return null;
};

// Export
export {
    RECURRENCE_PATTERNS,
    generateRecurringEvents,
    addRecurringEvent,
    handleLocationSearch,
    showLocationPreview,
    EVENT_STATUSES,
    getEventStatusBadge,
    suggestBestEventTime
};
