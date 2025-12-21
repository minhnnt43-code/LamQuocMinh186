// ============================================================
// FILE: js/smart_calendar.js
// Mục đích: Smart Calendar - Auto color coding & Conflict detection
// ============================================================

import { generateContent } from './ai/gemini.js';
import { showNotification } from './common.js';

/**
 * Tự động gán màu cho sự kiện dựa trên AI hoặc keywords
 */
export async function autoColorCode(event) {
    const colorMap = {
        'Họp': '#3498db',       // Blue
        'Deadline': '#e74c3c',  // Red
        'Học': '#f39c12',       // Yellow/Orange
        'Cá nhân': '#9b59b6',   // Purple
        'Đoàn - Hội': '#27ae60', // Green
        'Khác': '#95a5a6'       // Gray
    };

    // Try simple keyword matching first (faster)
    const category = detectCategoryByKeywords(event.title);
    if (category) {
        return {
            color: colorMap[category],
            category: category
        };
    }

    // Fallback to AI if no keywords matched
    try {
        const prompt = `
Phân loại sự kiện sau vào 1 trong các loại: Họp, Deadline, Học, Cá nhân, Đoàn - Hội, Khác

Sự kiện: "${event.title}"
${event.description ? `Mô tả: ${event.description}` : ''}

Trả về CHỈ 1 TỪ duy nhất là tên loại sự kiện.
        `.trim();

        const result = await generateContent(prompt, { temperature: 0.1 });
        const detected = result.trim();

        if (colorMap[detected]) {
            return {
                color: colorMap[detected],
                category: detected
            };
        }
    } catch (error) {
        console.log('AI color detection skipped:', error.message);
    }

    // Default
    return {
        color: colorMap['Khác'],
        category: 'Khác'
    };
}

/**
 * Phát hiện category bằng keywords (nhanh, không cần AI)
 */
function detectCategoryByKeywords(title) {
    const lowerTitle = title.toLowerCase();

    const keywordMap = {
        'Họp': ['họp', 'meeting', 'cuộc họp', 'buổi họp', 'gặp mặt', 'hội nghị'],
        'Deadline': ['deadline', 'nộp', 'hạn chót', 'đến hạn', 'gấp', 'cuối kỳ'],
        'Học': ['học', 'ôn thi', 'lớp học', 'buổi học', 'thực hành', 'bài giảng', 'lecture', 'seminar'],
        'Cá nhân': ['sinh nhật', 'đi chơi', 'du lịch', 'cà phê', 'ăn uống', 'party'],
        'Đoàn - Hội': ['đoàn', 'hội', 'chi bộ', 'đảng', 'sinh hoạt', 'tình nguyện', 'xuân tình nguyện', 'mùa hè xanh']
    };

    for (const [category, keywords] of Object.entries(keywordMap)) {
        if (keywords.some(kw => lowerTitle.includes(kw))) {
            return category;
        }
    }

    return null;
}

/**
 * Phát hiện xung đột lịch
 */
export function detectConflicts(newEvent, existingEvents) {
    const newStart = parseDateTime(newEvent.start);
    const newEnd = parseDateTime(newEvent.end || newEvent.start);

    const conflicts = existingEvents.filter(event => {
        if (event.id === newEvent.id) return false; // Bỏ qua chính nó

        const existStart = parseDateTime(event.start);
        const existEnd = parseDateTime(event.end || event.start);

        // Check overlap: (StartA < EndB) && (EndA > StartB)
        return (newStart < existEnd && newEnd > existStart);
    });

    return conflicts;
}

/**
 * Gợi ý thời gian thay thế khi có conflict
 */
export function suggestAlternativeTimes(event, existingEvents, count = 3) {
    const eventDuration = calculateDuration(event);
    const workHours = { start: 8, end: 18 }; // 8 AM - 6 PM

    const suggestions = [];
    let currentDate = new Date();
    currentDate.setHours(workHours.start, 0, 0, 0);

    const maxDays = 7; // Tìm trong 7 ngày tới

    for (let day = 0; day < maxDays && suggestions.length < count; day++) {
        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() + day);

        for (let hour = workHours.start; hour < workHours.end; hour++) {
            if (suggestions.length >= count) break;

            const slotStart = new Date(checkDate);
            slotStart.setHours(hour, 0, 0, 0);

            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + eventDuration);

            // Check if slot is free
            const testEvent = {
                start: slotStart.toISOString(),
                end: slotEnd.toISOString()
            };

            const conflicts = detectConflicts(testEvent, existingEvents);

            if (conflicts.length === 0) {
                suggestions.push({
                    start: formatDateTimeLocal(slotStart),
                    end: formatDateTimeLocal(slotEnd),
                    label: formatFriendlyDate(slotStart)
                });
            }
        }
    }

    return suggestions;
}

/**
 * Hiển thị warning khi có conflict
 */
export function showConflictWarning(conflicts, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (conflicts.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    const html = `
        <div class="conflict-warning">
            <div class="conflict-header">
                <span>⚠️</span>
                <strong>Phát hiện ${conflicts.length} sự kiện trùng lịch!</strong>
            </div>
            <ul class="conflict-list">
                ${conflicts.map(c => `
                    <li>
                        <span class="conflict-title">${c.title}</span>
                        <span class="conflict-time">${formatEventTime(c)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    container.innerHTML = html;
    container.style.display = 'block';
}

/**
 * Hiển thị gợi ý thời gian thay thế
 */
export function showAlternativeSuggestions(suggestions, onSelect) {
    if (suggestions.length === 0) {
        return '<p>Không tìm thấy thời gian trống phù hợp.</p>';
    }

    return `
        <div class="alternative-suggestions">
            <p><strong>💡 Gợi ý thời gian khác:</strong></p>
            <div class="suggestion-list">
                ${suggestions.map((sug, i) => `
                    <button class="suggestion-btn" data-index="${i}" 
                            data-start="${sug.start}" data-end="${sug.end}">
                        ${sug.label}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// ==================== HELPERS ====================

function parseDateTime(str) {
    return new Date(str);
}

function calculateDuration(event) {
    if (!event.end) return 60; // Default 1 hour
    const start = new Date(event.start);
    const end = new Date(event.end);
    return (end - start) / (1000 * 60); // Minutes
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatFriendlyDate(date) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dayName}, ${day}/${month} lúc ${hours}:${minutes}`;
}

function formatEventTime(event) {
    const start = new Date(event.start);
    const hours = String(start.getHours()).padStart(2, '0');
    const minutes = String(start.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// ==================== CSS INJECTION ====================

export function injectCalendarStyles() {
    const styles = `
        .conflict-warning {
            background: linear-gradient(135deg, #fff3cd, #ffe4a7);
            border: 1px solid #ffc107;
            border-radius: 10px;
            padding: 15px;
            margin: 10px 0;
        }
        
        .conflict-header {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #856404;
            margin-bottom: 10px;
        }
        
        .conflict-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .conflict-list li {
            display: flex;
            justify-content: space-between;
            padding: 8px 10px;
            background: rgba(255,255,255,0.5);
            border-radius: 6px;
            margin-bottom: 5px;
        }
        
        .conflict-title {
            font-weight: 600;
        }
        
        .conflict-time {
            color: #666;
        }
        
        .alternative-suggestions {
            margin-top: 15px;
        }
        
        .suggestion-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
        }
        
        .suggestion-btn {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .suggestion-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        [data-theme="dark"] .conflict-warning {
            background: linear-gradient(135deg, #3a3000, #4a4000);
            border-color: #665500;
        }
        
        [data-theme="dark"] .conflict-header {
            color: #ffd700;
        }
        
        [data-theme="dark"] .conflict-list li {
            background: rgba(0,0,0,0.3);
        }
    `;

    if (!document.getElementById('smart-calendar-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'smart-calendar-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
}
