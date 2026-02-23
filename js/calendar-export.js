// ============================================================
// FILE: js/calendar-export.js
// Export Lịch (File .ics) ra Google Calendar
// ============================================================

import { showNotification, toLocalISOString } from './common.js';

let globalData = null;
let currentUser = null;

// ============================================================
// INIT
// ============================================================
export function initCalendarExport(userData, user) {
    globalData = userData;
    currentUser = user;

    setupExportButton();
    console.log('✅ Calendar Export (.ics) Module initialized');
}

// ============================================================
// SETUP BUTTON
// ============================================================
function setupExportButton() {
    const btn = document.getElementById('btn-export-ics');
    if (!btn) return;

    btn.addEventListener('click', () => openExportModal());
}

// ============================================================
// EXPORT MODAL
// ============================================================
function openExportModal() {
    document.getElementById('ics-export-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'ics-export-modal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 460px; border-radius: 16px; overflow: hidden;">
            <div class="modal-header" style="background: var(--grad-main); color: white; padding: 18px 24px;">
                <h2 style="margin:0; font-size:1.1rem;">📤 Tải Lịch (.ics)</h2>
                <button class="close-btn" id="close-ics-modal" style="color:white; font-size:1.5rem;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 24px;">
                <div style="margin-bottom:18px;">
                    <label style="display:block; font-weight:600; margin-bottom:8px; color:var(--text-color); font-size:0.9rem;">
                        Khoảng thời gian
                    </label>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <label style="display:flex; align-items:center; gap:6px; padding:8px 14px; border:2px solid var(--border-color); border-radius:10px; cursor:pointer; transition:all 0.2s;">
                            <input type="radio" name="ics-range" value="week" checked> Tuần này
                        </label>
                        <label style="display:flex; align-items:center; gap:6px; padding:8px 14px; border:2px solid var(--border-color); border-radius:10px; cursor:pointer; transition:all 0.2s;">
                            <input type="radio" name="ics-range" value="month"> Tháng này
                        </label>
                        <label style="display:flex; align-items:center; gap:6px; padding:8px 14px; border:2px solid var(--border-color); border-radius:10px; cursor:pointer; transition:all 0.2s;">
                            <input type="radio" name="ics-range" value="all"> Toàn bộ
                        </label>
                    </div>
                </div>

                <div style="margin-bottom:18px;">
                    <label style="display:block; font-weight:600; margin-bottom:8px; color:var(--text-color); font-size:0.9rem;">
                        Lọc ưu tiên
                    </label>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <label style="display:flex; align-items:center; gap:6px; padding:8px 14px; border:2px solid var(--border-color); border-radius:10px; cursor:pointer;">
                            <input type="radio" name="ics-priority" value="all" checked> Tất cả
                        </label>
                        <label style="display:flex; align-items:center; gap:6px; padding:8px 14px; border:2px solid var(--border-color); border-radius:10px; cursor:pointer;">
                            <input type="radio" name="ics-priority" value="high"> Chỉ Quan trọng
                        </label>
                    </div>
                </div>

                <div style="padding:12px 16px; background:rgba(102,126,234,0.08); border-radius:10px; font-size:0.85rem; color:var(--text-color-secondary); margin-bottom:20px;">
                    💡 File <strong>.ics</strong> có thể mở bằng Google Calendar, Apple Calendar, Outlook... để nhập lịch tự động.
                </div>

                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button id="ics-cancel-btn" style="padding:12px 24px; border:2px solid var(--border-color); border-radius:10px; background:transparent; cursor:pointer; font-family:var(--font-body); color:var(--text-color-secondary);">Hủy</button>
                    <button id="ics-download-btn" style="padding:12px 28px; border:none; border-radius:10px; background:var(--grad-main); color:white; font-weight:600; cursor:pointer; font-family:var(--font-body);">📥 Download</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close
    document.getElementById('close-ics-modal').onclick = () => modal.remove();
    document.getElementById('ics-cancel-btn').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Download
    document.getElementById('ics-download-btn').onclick = () => {
        const range = document.querySelector('input[name="ics-range"]:checked')?.value || 'all';
        const priority = document.querySelector('input[name="ics-priority"]:checked')?.value || 'all';
        handleDownloadICS(range, priority);
        modal.remove();
    };
}

// ============================================================
// GENERATE & DOWNLOAD .ics
// ============================================================
function handleDownloadICS(range, priorityFilter) {
    const events = globalData.calendarEvents || [];
    const tasks = globalData.tasks || [];

    // Combine items that have dates
    let items = [];

    // Add calendar events
    events.forEach(ev => {
        if (!ev.date) return;
        items.push({
            title: ev.title || 'Sự kiện',
            date: ev.date,
            startTime: ev.startTime || '00:00',
            endTime: ev.endTime || '23:59',
            description: ev.description || '',
            priority: 'medium',
            type: 'event'
        });
    });

    // Add tasks with due dates
    tasks.forEach(task => {
        if (!task.dueDate) return;
        if (task.status === 'Đã hủy') return;
        items.push({
            title: task.name || 'Công việc',
            date: task.dueDate,
            startTime: task.dueTime || task.scheduledTime || '08:00',
            endTime: task.dueTime ? addMinutes(task.dueTime, task.duration || 60) : '09:00',
            description: task.notes || '',
            priority: task.priority || 'medium',
            type: 'task'
        });
    });

    // Filter by date range
    const today = new Date();
    if (range === 'week') {
        const monday = getMonday(today);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        const monStr = toLocalISOString(monday);
        const sunStr = toLocalISOString(sunday);
        items = items.filter(i => i.date >= monStr && i.date <= sunStr);
    } else if (range === 'month') {
        const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const monthEnd = toLocalISOString(nextMonth);
        items = items.filter(i => i.date >= monthStart && i.date <= monthEnd);
    }

    // Filter by priority
    if (priorityFilter === 'high') {
        items = items.filter(i => i.priority === 'high');
    }

    if (items.length === 0) {
        showNotification('Không có sự kiện/công việc nào để xuất!', 'warning');
        return;
    }

    // Generate ICS content
    const icsContent = generateICS(items);

    // Download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'LifeOS_Calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    showNotification(`✅ Đã tải ${items.length} mục lịch (.ics)!`, 'success');
}

// ============================================================
// ICS GENERATOR
// ============================================================
function generateICS(items) {
    let ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//LifeOS//Personal Life Management//VI',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:LifeOS Calendar',
        'X-WR-TIMEZONE:Asia/Ho_Chi_Minh'
    ];

    items.forEach(item => {
        const dtStart = formatICSDateTime(item.date, item.startTime);
        const dtEnd = formatICSDateTime(item.date, item.endTime);
        const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@lifeos`;
        const summary = item.priority === 'high' ? `[HIGH] ${item.title}` : item.title;
        const category = item.type === 'task' ? 'TASK' : 'EVENT';

        ics.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTART;TZID=Asia/Ho_Chi_Minh:${dtStart}`,
            `DTEND;TZID=Asia/Ho_Chi_Minh:${dtEnd}`,
            `SUMMARY:${escapeICSText(summary)}`,
            `DESCRIPTION:${escapeICSText(item.description)}`,
            `CATEGORIES:${category}`,
            `STATUS:CONFIRMED`,
            'END:VEVENT'
        );
    });

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
}

// ============================================================
// HELPERS
// ============================================================
function formatICSDateTime(dateStr, timeStr) {
    // dateStr: "YYYY-MM-DD", timeStr: "HH:mm"
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const [hh, mm] = (timeStr || '00:00').split(':');
    return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}T${(hh || '00').padStart(2, '0')}${(mm || '00').padStart(2, '0')}00`;
}

function escapeICSText(text) {
    if (!text) return '';
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function addMinutes(timeStr, minutes) {
    const [h, m] = (timeStr || '08:00').split(':').map(Number);
    const totalMin = h * 60 + m + minutes;
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
