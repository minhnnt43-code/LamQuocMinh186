// ============================================================
// FILE: js/recurring-engine.js
// Mục đích: Sinh sự kiện lặp lại (Recurring) trên Calendar
// mà không tạo rác trong Database
// ============================================================

/**
 * Nhận vào danh sách events từ DB + khoảng thời gian view,
 * trả về danh sách events mở rộng (gồm cả bản gốc + bản clone ảo)
 *
 * Ví dụ: Event "Họp team" có rrule: { freq: 'weekly', byDay: 2 }
 * → Khi xem tuần sau, engine sẽ tự clone sự kiện đó vào Thứ 3 tuần sau
 * 
 * @param {Array} events - Mảng sự kiện từ DB
 * @param {Date} viewStart - Ngày bắt đầu view (ví dụ: Thứ 2 tuần hiện tại)
 * @param {Date} viewEnd - Ngày kết thúc view (ví dụ: CN tuần hiện tại)
 * @returns {Array} Mảng events gồm gốc + clones
 */
export function expandRecurringEvents(events, viewStart, viewEnd) {
    if (!events || !viewStart || !viewEnd) return events || [];

    const result = [];
    const startStr = toDateStr(viewStart);
    const endStr = toDateStr(viewEnd);

    for (const event of events) {
        // Event không có rrule → giữ nguyên
        if (!event.rrule) {
            result.push(event);
            continue;
        }

        // Event có rrule → sinh các bản clone ảo trong khoảng view
        const clones = generateOccurrences(event, viewStart, viewEnd);
        result.push(...clones);
    }

    return result;
}

/**
 * Sinh các lần xuất hiện (occurrences) của event lặp lại
 */
function generateOccurrences(event, viewStart, viewEnd) {
    const { rrule } = event;
    if (!rrule || !rrule.freq) return [event];

    const occurrences = [];
    const eventStartDate = new Date(event.date || event.startDate);

    // Ngày kết thúc lặp (nếu có)
    const untilDate = rrule.until ? new Date(rrule.until) : new Date(viewEnd);
    // Giới hạn xa nhất có thể generate
    const maxDate = new Date(Math.min(untilDate.getTime(), viewEnd.getTime()));
    // Khoảng cách lặp (mặc định 1)
    const interval = rrule.interval || 1;

    let current = new Date(eventStartDate);

    // Tối đa 100 lần lặp (phòng vòng lặp vô hạn)
    let safetyCounter = 0;

    while (current <= maxDate && safetyCounter < 100) {
        safetyCounter++;
        const currentStr = toDateStr(current);

        // Chỉ thêm nếu nằm trong khoảng view
        if (current >= viewStart && current <= viewEnd) {
            // Kiểm tra byDay nếu có (chỉ áp dụng cho weekly)
            let shouldAdd = true;

            if (rrule.freq === 'weekly' && rrule.byDay !== undefined) {
                shouldAdd = current.getDay() === rrule.byDay;
            }

            if (shouldAdd) {
                occurrences.push({
                    ...event,
                    id: `${event.id}_recur_${currentStr}`,
                    date: currentStr,
                    isRecurring: true,           // Đánh dấu là bản clone
                    originalEventId: event.id,    // Tham chiếu về event gốc
                    title: `🔄 ${event.title}`    // Icon lặp lại
                });
            }
        }

        // Tăng ngày theo tần suất
        switch (rrule.freq) {
            case 'daily':
                current.setDate(current.getDate() + interval);
                break;
            case 'weekly':
                current.setDate(current.getDate() + (7 * interval));
                break;
            case 'monthly':
                current.setMonth(current.getMonth() + interval);
                break;
            default:
                current.setDate(current.getDate() + 1);
        }
    }

    return occurrences;
}

// Helper: Date → YYYY-MM-DD string
function toDateStr(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
