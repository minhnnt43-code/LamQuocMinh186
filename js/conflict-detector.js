// ============================================================
// FILE: js/conflict-detector.js
// Mục đích: Phát hiện trùng lịch & gợi ý khe trống
// ============================================================

import { showNotification } from './common.js';

/**
 * Kiểm tra xem sự kiện mới có đụng giờ với sự kiện nào không.
 * 
 * @param {Object} newEvent - { date, startTime, endTime, title }
 * @param {Array}  existingEvents - Danh sách sự kiện hiện có
 * @returns {{ hasConflict, conflictingEvent, suggestedSlot }}
 */
export function checkConflict(newEvent, existingEvents) {
    if (!newEvent.date || !newEvent.startTime || !newEvent.endTime) {
        return { hasConflict: false, conflictingEvent: null, suggestedSlot: null };
    }

    // Lọc các sự kiện cùng ngày
    const sameDayEvents = (existingEvents || []).filter(e =>
        e && e.date === newEvent.date &&
        e.startTime && e.endTime &&
        e.id !== newEvent.id   // Bỏ qua chính nó (khi sửa)
    );

    // [FIX M2] Cũng kiểm tra sự kiện xuyên đêm từ ngày hôm trước
    // VD: event 23:00-02:00 của ngày trước có thể đụng event 01:00 của ngày này
    const prevDate = getPrevDateStr(newEvent.date);
    const overnightEvents = (existingEvents || []).filter(e =>
        e && e.date === prevDate &&
        e.startTime && e.endTime &&
        e.id !== newEvent.id &&
        timeToMin(e.endTime) < timeToMin(e.startTime) // overnight: endTime < startTime
    );

    // Ghép tất cả events cần kiểm tra
    const allRelevantEvents = [...sameDayEvents, ...overnightEvents];

    // Chuyển giờ thành phút để dễ so sánh
    const newStart = timeToMin(newEvent.startTime);
    const newEnd = timeToMin(newEvent.endTime);

    // Tìm sự kiện bị trùng
    for (const existing of allRelevantEvents) {
        const existStart = timeToMin(existing.startTime);
        const existEnd = timeToMin(existing.endTime);

        let conflict = false;
        if (existing.date === newEvent.date) {
            // Cùng ngày: logic trùng thông thường
            conflict = newStart < existEnd && newEnd > existStart;
        } else {
            // Ngày hôm trước xuyên đêm: phần kéo sang hôm nay là 00:00 → existEnd
            conflict = newStart < existEnd;
        }

        if (conflict) {
            const suggested = findNextFreeSlot(
                newEvent.date,
                newEnd - newStart,
                sameDayEvents
            );
            return {
                hasConflict: true,
                conflictingEvent: existing,
                suggestedSlot: suggested
            };
        }
    }

    return { hasConflict: false, conflictingEvent: null, suggestedSlot: null };
}

/**
 * Tìm khe giờ trống gần nhất (tăng dần 15 phút)
 */
function findNextFreeSlot(date, durationMin, existingEvents) {
    // [FIX M3] Chỉ dùng giờ hiện tại nếu date là hôm nay
    // Với ngày khác, bắt đầu tìm từ 7:00 sáng
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let startMin;
    if (date === todayStr) {
        startMin = Math.max(now.getHours() * 60 + now.getMinutes(), 7 * 60);
    } else {
        startMin = 7 * 60; // Ngày khác: bắt đầu từ 7:00 sáng
    }

    // Làm tròn lên bội 15 phút
    startMin = Math.ceil(startMin / 15) * 15;

    const maxMin = 22 * 60; // Không gợi ý quá 22h

    while (startMin + durationMin <= maxMin) {
        const candidateStart = startMin;
        const candidateEnd = startMin + durationMin;

        // Kiểm tra xem candidate có đụng ngày nào không
        let isFree = true;
        for (const ev of existingEvents) {
            const evStart = timeToMin(ev.startTime);
            const evEnd = timeToMin(ev.endTime);
            if (candidateStart < evEnd && candidateEnd > evStart) {
                isFree = false;
                break;
            }
        }

        if (isFree) {
            return {
                date: date,
                startTime: minToTime(candidateStart),
                endTime: minToTime(candidateEnd)
            };
        }

        startMin += 15; // Tăng 15 phút rồi thử lại
    }

    return null; // Không tìm thấy khe trống
}

/**
 * Hiển thị popup cảnh báo trùng lịch
 */
// [FIX H3] Nhận thêm callback onKeep để "Giữ nguyên" cũng kích hoạt save
export function showConflictWarning(conflictResult, onAcceptSuggestion, onKeep) {
    const { conflictingEvent, suggestedSlot } = conflictResult;

    // Tạo popup toast đẹp
    const toast = document.createElement('div');
    toast.className = 'conflict-toast';
    toast.innerHTML = `
        <div style="
            position: fixed; top: 20px; right: 20px; z-index: 99999;
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
            border: 2px solid #ef4444;
            border-radius: 16px;
            padding: 20px;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(239, 68, 68, 0.3);
            animation: slideInRight 0.3s ease;
            font-family: var(--font-body, Arial, sans-serif);
        ">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <span style="font-size: 1.5rem;">⚠️</span>
                <strong style="color: #991b1b; font-size: 1rem;">Phát hiện trùng lịch!</strong>
            </div>
            <p style="color: #7f1d1d; margin: 0 0 12px; font-size: 0.9rem; line-height: 1.5;">
                Khung giờ này đã có sự kiện
                <strong>"${conflictingEvent.title}"</strong>
                (${conflictingEvent.startTime} - ${conflictingEvent.endTime})
            </p>
            ${suggestedSlot ? `
            <div style="
                background: white;
                border-radius: 10px;
                padding: 12px;
                margin-bottom: 12px;
                border: 1px solid #fca5a5;
            ">
                <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 6px;">💡 Khe trống gần nhất:</div>
                <strong style="color: #059669; font-size: 1.1rem;">
                    ${suggestedSlot.startTime} - ${suggestedSlot.endTime}
                </strong>
            </div>
            ` : ''}
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                ${suggestedSlot ? `
                <button id="conflict-accept-btn" style="
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white; border: none; padding: 8px 16px;
                    border-radius: 8px; cursor: pointer; font-weight: 600;
                    font-size: 0.85rem;
                ">✓ Dời lịch</button>
                ` : ''}
                <button id="conflict-keep-btn" style="
                    background: #f59e0b; color: white; border: none;
                    padding: 8px 16px; border-radius: 8px; cursor: pointer;
                    font-weight: 600; font-size: 0.85rem;
                ">Giữ nguyên</button>
                <button id="conflict-dismiss-btn" style="
                    background: #6b7280; color: white; border: none;
                    padding: 8px 16px; border-radius: 8px; cursor: pointer;
                    font-size: 0.85rem;
                ">Hủy bỏ</button>
            </div>
        </div>
    `;

    document.body.appendChild(toast);

    // "Dời lịch" → áp dụng slot mới rồi lưu
    toast.querySelector('#conflict-accept-btn')?.addEventListener('click', () => {
        if (onAcceptSuggestion && suggestedSlot) {
            onAcceptSuggestion(suggestedSlot);
        }
        toast.remove();
    });

    // "Giữ nguyên" → lưu với giờ gốc (có conflict, user chấp nhận)
    toast.querySelector('#conflict-keep-btn')?.addEventListener('click', () => {
        if (onKeep) onKeep(); // [FIX H3] Gọi callback → kích hoạt doSaveEvent()
        toast.remove();
    });

    // "Hủy bỏ" → đóng popup, KHÔNG lưu gì cả
    toast.querySelector('#conflict-dismiss-btn')?.addEventListener('click', () => {
        toast.remove();
    });

    // Tự đóng sau 15 giây (không lưu)
    setTimeout(() => toast.remove(), 15000);
}

// === Helpers ===
function timeToMin(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
}

function minToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// [FIX M2] Helper: Trả về chuỗi ngày hôm trước (YYYY-MM-DD)
function getPrevDateStr(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
