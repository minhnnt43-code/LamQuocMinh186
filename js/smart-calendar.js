// ============================================================
// FILE: js/smart-calendar.js
// Các tính năng thông minh cho Calendar (10 nâng cấp)
// ============================================================

import { showNotification, toLocalISOString, formatDate, generateID } from './common.js';
import { saveUserData } from './api.js';
import { aiPowerHub } from './ai-power-hub.js';

// ============================================================
// #21 DRAG & DROP EVENTS
// ============================================================
export function initDragDropEvents(calendarContainer) {
    if (!calendarContainer) return;

    // Make events draggable
    const events = calendarContainer.querySelectorAll('.calendar-event');
    events.forEach(event => {
        event.draggable = true;
        event.style.cursor = 'grab';

        event.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('eventId', event.dataset.eventId);
            event.style.opacity = '0.5';
        });

        event.addEventListener('dragend', () => {
            event.style.opacity = '1';
        });
    });

    // Make cells droppable
    const cells = calendarContainer.querySelectorAll('td:not(.time-col)');
    cells.forEach(cell => {
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.style.background = 'rgba(102, 126, 234, 0.2)';
        });

        cell.addEventListener('dragleave', () => {
            cell.style.background = '';
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.style.background = '';
            const eventId = e.dataTransfer.getData('eventId');
            const newDate = cell.dataset.date;
            const newTime = cell.dataset.time;

            if (eventId && newDate) {
                window.dispatchEvent(new CustomEvent('calendar-event-moved', {
                    detail: { eventId, newDate, newTime }
                }));
            }
        });
    });
}

// ============================================================
// #22 AUTO TIME BLOCKING
// ============================================================
export async function autoTimeBlock(tasks, existingEvents, preferences = {}) {
    const workStartHour = preferences.workStart || 9;
    const workEndHour = preferences.workEnd || 18;
    const minBlockDuration = preferences.minBlock || 30; // minutes

    const today = toLocalISOString(new Date());
    const unscheduledTasks = tasks.filter(t =>
        t.status !== 'Hoàn thành' &&
        !existingEvents.some(e => e.linkedTaskId === t.id)
    );

    // Find free slots
    const freeSlots = [];
    for (let hour = workStartHour; hour < workEndHour; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        const isOccupied = existingEvents.some(e =>
            e.date === today &&
            e.startTime <= timeStr &&
            e.endTime > timeStr
        );

        if (!isOccupied) {
            freeSlots.push({ hour, date: today });
        }
    }

    // Assign tasks to slots
    const suggestions = [];
    let slotIndex = 0;

    for (const task of unscheduledTasks) {
        if (slotIndex >= freeSlots.length) break;

        const slot = freeSlots[slotIndex];
        const duration = task.estimatedHours || 1;

        suggestions.push({
            task,
            suggestedEvent: {
                id: generateID('ev_auto'),
                title: task.name,
                date: slot.date,
                startTime: `${slot.hour.toString().padStart(2, '0')}:00`,
                endTime: `${(slot.hour + duration).toString().padStart(2, '0')}:00`,
                linkedTaskId: task.id,
                type: 'auto-blocked',
                color: '#667eea'
            }
        });

        slotIndex += duration;
    }

    return suggestions;
}

export function renderTimeBlockSuggestions(container, suggestions, onAccept, onReject) {
    if (!container || !suggestions.length) return;

    container.innerHTML = `
        <div class="time-block-suggestions" style="
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            border: 1px solid #86efac;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        ">
            <h4 style="margin: 0 0 15px 0; color: #166534; display: flex; align-items: center; gap: 8px;">
                🤖 AI gợi ý xếp lịch cho ${suggestions.length} tasks
            </h4>
            <div class="suggestions-list" style="display: flex; flex-direction: column; gap: 10px;">
                ${suggestions.map((s, i) => `
                    <div class="suggestion-item" style="
                        background: white;
                        border-radius: 8px;
                        padding: 12px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <strong>${s.task.name}</strong>
                            <div style="font-size: 0.85rem; color: #6b7280;">
                                📅 ${formatDate(s.suggestedEvent.date)} 
                                ⏰ ${s.suggestedEvent.startTime} - ${s.suggestedEvent.endTime}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="accept-btn" data-index="${i}" style="
                                background: #10b981;
                                color: white;
                                border: none;
                                padding: 6px 12px;
                                border-radius: 6px;
                                cursor: pointer;
                            ">✓ Chấp nhận</button>
                            <button class="reject-btn" data-index="${i}" style="
                                background: #ef4444;
                                color: white;
                                border: none;
                                padding: 6px 12px;
                                border-radius: 6px;
                                cursor: pointer;
                            ">✗</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button id="accept-all-blocks" style="
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">✓ Chấp nhận tất cả</button>
                <button id="dismiss-blocks" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                ">Để sau</button>
            </div>
        </div>
    `;

    container.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            if (onAccept) onAccept(suggestions[index]);
            btn.closest('.suggestion-item').remove();
        });
    });

    container.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            if (onReject) onReject(suggestions[index]);
            btn.closest('.suggestion-item').remove();
        });
    });

    document.getElementById('accept-all-blocks')?.addEventListener('click', () => {
        suggestions.forEach(s => onAccept && onAccept(s));
        container.innerHTML = '';
        showNotification(`✅ Đã thêm ${suggestions.length} sự kiện vào lịch!`, 'success');
    });

    document.getElementById('dismiss-blocks')?.addEventListener('click', () => {
        container.innerHTML = '';
    });
}

// ============================================================
// #23 MEETING FINDER
// ============================================================
export function findFreeSlots(events, options = {}) {
    const duration = options.duration || 60; // minutes
    const startDate = options.startDate || new Date();
    const daysToSearch = options.days || 7;
    const workStart = options.workStart || 9;
    const workEnd = options.workEnd || 18;

    const freeSlots = [];

    for (let day = 0; day < daysToSearch; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);

        // Skip weekends if option set
        if (options.skipWeekends && (date.getDay() === 0 || date.getDay() === 6)) continue;

        const dateStr = toLocalISOString(date);
        // [FIX] Safe filter
        const dayEvents = events.filter(e => e && e.date === dateStr && e.startTime && e.endTime);

        // Find free hours
        for (let hour = workStart; hour < workEnd - (duration / 60); hour++) {
            const slotStart = `${hour.toString().padStart(2, '0')}:00`;
            const slotEnd = `${(hour + Math.ceil(duration / 60)).toString().padStart(2, '0')}:00`;

            const hasConflict = dayEvents.some(e => {
                if (!e.startTime || !e.endTime) return false;
                return (e.startTime < slotEnd && e.endTime > slotStart);
            });

            if (!hasConflict) {
                freeSlots.push({
                    date: dateStr,
                    startTime: slotStart,
                    endTime: slotEnd,
                    dayName: date.toLocaleDateString('vi-VN', { weekday: 'long' })
                });
            }
        }
    }

    return freeSlots.slice(0, 10); // Return max 10 slots
}

export function renderMeetingFinder(container, events) {
    if (!container) return;

    container.innerHTML = `
        <div class="meeting-finder" style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        ">
            <h4 style="margin: 0 0 15px 0;">🔍 Tìm slot họp</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <select id="meeting-duration" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <option value="30">30 phút</option>
                    <option value="60" selected>1 tiếng</option>
                    <option value="90">1.5 tiếng</option>
                    <option value="120">2 tiếng</option>
                </select>
                <button id="find-slots-btn" style="
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">Tìm slot</button>
            </div>
            <div id="meeting-slots-result"></div>
        </div>
    `;

    document.getElementById('find-slots-btn')?.addEventListener('click', () => {
        const duration = parseInt(document.getElementById('meeting-duration').value);
        const slots = findFreeSlots(events, { duration });

        const resultContainer = document.getElementById('meeting-slots-result');
        if (slots.length === 0) {
            resultContainer.innerHTML = '<p style="color: #6b7280;">Không tìm thấy slot phù hợp.</p>';
            return;
        }

        resultContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                ${slots.map(s => `
                    <div class="slot-option" style="
                        background: #f3f4f6;
                        padding: 10px;
                        border-radius: 8px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <span>${s.dayName}, ${formatDate(s.date)} - ${s.startTime}</span>
                        <button class="select-slot-btn" data-date="${s.date}" data-time="${s.startTime}" style="
                            background: #10b981;
                            color: white;
                            border: none;
                            padding: 4px 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.85rem;
                        ">Chọn</button>
                    </div>
                `).join('')}
            </div>
        `;

        resultContainer.querySelectorAll('.select-slot-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                showNotification(`✅ Đã chọn: ${btn.dataset.date} lúc ${btn.dataset.time}`, 'success');
                // Could trigger event creation here
            });
        });
    });
}

// ============================================================
// #24 BUFFER TIME
// ============================================================
export function addBufferTime(events, bufferMinutes = 15) {
    // [FIX] Filter valid events first
    const validEvents = (events || []).filter(e => e && e.endTime);

    const adjustedEvents = validEvents.map(event => {
        const [endHour, endMin] = (event.endTime || '00:00').split(':').map(Number);
        const totalMin = endHour * 60 + endMin + bufferMinutes;
        const newEndHour = Math.floor(totalMin / 60);
        const newEndMin = totalMin % 60;

        return {
            ...event,
            endTimeWithBuffer: `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`
        };
    });

    return adjustedEvents;
}

// ============================================================
// #27 EVENT COLORS BY TYPE
// ============================================================
export function getEventColorByType(eventTitle, eventType) {
    const colorMap = {
        // By type
        'meeting': '#f59e0b',  // Orange for meetings
        'study': '#3b82f6',   // Blue for study
        'personal': '#8b5cf6', // Purple for personal
        'google': '#4285F4',   // Google blue
        'deadline': '#ef4444', // Red for deadlines

        // By keyword detection
        'keywords': {
            'họp': '#f59e0b',
            'học': '#3b82f6',
            'thi': '#ef4444',
            'nộp': '#ef4444',
            'deadline': '#ef4444',
            'party': '#ec4899',
            'sinh nhật': '#ec4899',
            'gym': '#10b981',
            'thể dục': '#10b981'
        }
    };

    // Check by type first
    if (eventType && colorMap[eventType]) {
        return colorMap[eventType];
    }

    // Check keywords
    const lowerTitle = eventTitle.toLowerCase();
    for (const [keyword, color] of Object.entries(colorMap.keywords)) {
        if (lowerTitle.includes(keyword)) {
            return color;
        }
    }

    return '#667eea'; // Default purple
}

// ============================================================
// #28 WEEKLY HEATMAP
// ============================================================
export function generateWeeklyHeatmap(events, tasks) {
    const heatmap = {};
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // Initialize
    for (let i = 0; i < 7; i++) {
        heatmap[i] = { count: 0, hours: 0, dayName: dayNames[i] };
    }

    // Count events - [FIX] safe checks
    (events || []).forEach(event => {
        if (!event || !event.date) return;
        const dayOfWeek = new Date(event.date).getDay();
        heatmap[dayOfWeek].count++;

        // Calculate hours
        if (event.startTime && event.endTime) {
            const [startH, startM] = event.startTime.split(':').map(Number);
            const [endH, endM] = event.endTime.split(':').map(Number);
            const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
            heatmap[dayOfWeek].hours += hours;
        }
    });

    // Count tasks
    tasks.forEach(task => {
        if (task.dueDate) {
            const dayOfWeek = new Date(task.dueDate).getDay();
            heatmap[dayOfWeek].count++;
        }
    });

    return heatmap;
}

export function renderWeeklyHeatmap(container, events, tasks) {
    if (!container) return;

    const heatmap = generateWeeklyHeatmap(events, tasks);
    const maxCount = Math.max(...Object.values(heatmap).map(h => h.count), 1);

    container.innerHTML = `
        <div class="weekly-heatmap" style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        ">
            <h4 style="margin: 0 0 15px 0;">🔥 Độ bận theo ngày trong tuần</h4>
            <div style="display: flex; justify-content: space-between; gap: 5px;">
                ${Object.values(heatmap).map(day => {
        const intensity = day.count / maxCount;
        const bgColor = intensity > 0.7 ? '#ef4444' :
            intensity > 0.4 ? '#f59e0b' :
                intensity > 0 ? '#10b981' : '#e5e7eb';
        return `
                        <div style="
                            flex: 1;
                            text-align: center;
                            padding: 10px 5px;
                            background: ${bgColor}20;
                            border-radius: 8px;
                            border: 2px solid ${bgColor};
                        ">
                            <div style="font-weight: 600; margin-bottom: 5px;">${day.dayName}</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: ${bgColor};">${day.count}</div>
                            <div style="font-size: 0.75rem; color: #6b7280;">${day.hours.toFixed(1)}h</div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

// ============================================================
// #30 EVENT SUGGESTIONS
// ============================================================
export function generateEventSuggestions(recentEvents) {
    if (!recentEvents || recentEvents.length < 3) return [];

    const suggestions = [];
    const patternCount = {};

    // Count patterns by day of week + time - [FIX] safe checks
    recentEvents.forEach(event => {
        if (!event || !event.date || !event.startTime || !event.title) return;
        const dayOfWeek = new Date(event.date).getDay();
        const key = `${dayOfWeek}_${event.startTime}_${(event.title || '').substring(0, 10)}`;

        if (!patternCount[key]) {
            patternCount[key] = { count: 0, event };
        }
        patternCount[key].count++;
    });

    // Find patterns that occur 2+ times
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    for (const [key, data] of Object.entries(patternCount)) {
        if (data.count >= 2) {
            const [dayOfWeek, time] = key.split('_');
            suggestions.push({
                message: `Bạn hay "${data.event.title}" vào ${dayNames[dayOfWeek]} lúc ${time}`,
                event: data.event,
                dayOfWeek: parseInt(dayOfWeek),
                time
            });
        }
    }

    return suggestions.slice(0, 3);
}

// ============================================================
// INIT FUNCTION
// ============================================================
export function initSmartCalendar(userData, user) {
    console.log('✅ Smart Calendar initialized');

    // Render weekly heatmap
    const heatmapContainer = document.getElementById('weekly-heatmap-widget');
    if (heatmapContainer) {
        renderWeeklyHeatmap(heatmapContainer, userData.calendarEvents || [], userData.tasks || []);
    }

    // Render meeting finder
    const meetingFinderContainer = document.getElementById('meeting-finder-widget');
    if (meetingFinderContainer) {
        renderMeetingFinder(meetingFinderContainer, userData.calendarEvents || []);
    }

    // Generate event suggestions
    const suggestions = generateEventSuggestions(userData.calendarEvents || []);
    if (suggestions.length > 0) {
        console.log('Event suggestions:', suggestions);
    }
}
