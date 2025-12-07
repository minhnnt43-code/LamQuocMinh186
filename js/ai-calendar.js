// --- FILE: js/ai-calendar.js ---
// AI cho Lịch & Thời gian - Group C (71-95 trừ 80)

import { aiService } from './ai-service.js';
import { showNotification, escapeHTML, formatDate } from './common.js';

let globalData = null;
let currentUser = null;

/**
 * Khởi tạo AI Calendar module
 */
export const initAICalendar = (data, user) => {
    globalData = data;
    currentUser = user;
    setupCalendarAIEvents();
};

/**
 * Setup các sự kiện
 */
const setupCalendarAIEvents = () => {
    // #71 - Calendar Optimizer
    document.getElementById('btn-ai-cal-optimize')?.addEventListener('click', handleCalendarOptimize);

    // #72 - Meeting Scheduler
    document.getElementById('btn-ai-meeting')?.addEventListener('click', handleMeetingScheduler);

    // #75 - Time Blocking
    document.getElementById('btn-ai-time-block')?.addEventListener('click', handleTimeBlocking);

    // #76 - Conflict Resolver
    document.getElementById('btn-ai-conflict')?.addEventListener('click', handleConflictResolver);

    // #82 - Calendar Analytics
    document.getElementById('btn-ai-cal-analytics')?.addEventListener('click', handleCalendarAnalytics);

    // #84 - Smart Booking
    document.getElementById('btn-ai-smart-booking')?.addEventListener('click', handleSmartBooking);

    // #88 - Time Spent Analytics
    document.getElementById('btn-ai-time-spent')?.addEventListener('click', handleTimeSpent);

    // #89 - Focus Hours Protector
    document.getElementById('btn-ai-focus-hours')?.addEventListener('click', handleFocusHours);

    // [MỚI] Quick Add Event - Thêm sự kiện bằng ngôn ngữ tự nhiên
    document.getElementById('btn-quick-add-event')?.addEventListener('click', handleQuickAddEvent);
    document.getElementById('quick-event-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleQuickAddEvent();
    });
};

/**
 * Lấy sự kiện trong tuần hiện tại
 */
const getWeekEvents = () => {
    const events = globalData?.calendarEvents || [];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return events.filter(e => {
        const eventDate = new Date(e.date || e.startDate);
        return eventDate >= weekStart && eventDate <= weekEnd;
    });
};

/**
 * Format events for AI
 */
const formatEventsForAI = (events) => {
    if (!events || events.length === 0) return 'Không có sự kiện nào.';

    return events.map(e => {
        const date = e.date || e.startDate;
        return `- ${e.title || e.name}: ${date} ${e.startTime || ''}-${e.endTime || ''} (${e.category || 'Chung'})`;
    }).join('\n');
};

/**
 * Hiển thị modal kết quả - Styling đẹp hơn
 */
const showCalendarAIModal = (title, content) => {
    const existingModal = document.getElementById('ai-calendar-modal');
    if (existingModal) existingModal.remove();

    // Format content để đẹp hơn
    const formatContent = (text) => {
        let formatted = escapeHTML(text);

        // Format headings
        formatted = formatted.replace(/^\*\*(.+?)\*\*$/gm, '<h3 style="color: #4facfe; margin: 20px 0 10px 0; font-size: 1.1rem;">$1</h3>');
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #333;">$1</strong>');

        // Format bullets
        formatted = formatted.replace(/^[-•]\s+(.+)$/gm, '<div style="display: flex; gap: 8px; margin: 6px 0;"><span style="color: #4facfe;">•</span><span>$1</span></div>');
        formatted = formatted.replace(/^\*\s+(.+)$/gm, '<div style="display: flex; gap: 8px; margin: 6px 0;"><span style="color: #4facfe;">•</span><span>$1</span></div>');

        // Format numbered lists
        formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display: flex; gap: 10px; margin: 8px 0;"><span style="background: #4facfe; color: white; min-width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">$1</span><span style="flex: 1;">$2</span></div>');

        // Format time blocks
        formatted = formatted.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g, '<span style="background: rgba(79, 172, 254, 0.15); padding: 2px 8px; border-radius: 4px; font-family: monospace; color: #0077b6;">$1 - $2</span>');

        // Convert newlines
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    };

    const modal = document.createElement('div');
    modal.id = 'ai-calendar-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; backdrop-filter: blur(4px);
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; max-width: 700px; width: 100%; max-height: 85vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: modalSlideUp 0.3s ease;">
            <div style="padding: 20px 25px; background: linear-gradient(135deg, #4facfe, #00f2fe); color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size: 1.3rem;">📅 ${title}</h2>
                    <button id="close-ai-cal-modal" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 1.3rem; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">×</button>
                </div>
            </div>
            <div style="padding: 25px; overflow-y: auto; max-height: 65vh; background: #fafbfc;">
                <div style="line-height: 1.75; font-size: 0.95rem; color: #333;">
                    ${formatContent(content)}
                </div>
            </div>
        </div>
    `;

    // Add animation style
    if (!document.getElementById('modal-animation-style')) {
        const style = document.createElement('style');
        style.id = 'modal-animation-style';
        style.textContent = `
            @keyframes modalSlideUp {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);
    modal.querySelector('#close-ai-cal-modal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

/**
 * #71 - AI Calendar Optimizer - Tối ưu lịch tuần
 */
const handleCalendarOptimize = async () => {
    const btn = document.getElementById('btn-ai-cal-optimize');
    const events = getWeekEvents();
    const tasks = (globalData?.tasks || []).filter(t => t.status !== 'Hoàn thành');

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang tối ưu...';

    try {
        const systemPrompt = `Bạn là chuyên gia tối ưu lịch làm việc.
Phân tích lịch tuần này và đề xuất cải thiện.

Sự kiện tuần này:
${formatEventsForAI(events)}

Công việc cần làm:
${tasks.map(t => `- ${t.name} (Hạn: ${t.dueDate || 'Không có'}, Ưu tiên: ${t.priority})`).join('\n') || 'Không có'}

Yêu cầu:
1. Đánh giá hiệu quả lịch hiện tại
2. Phát hiện vấn đề (quá tải, thiếu nghỉ, xung đột...)
3. Đề xuất điều chỉnh cụ thể
4. Gợi ý slot trống để hoàn thành công việc`;

        const result = await aiService.ask('Tối ưu lịch tuần', { systemPrompt });
        showCalendarAIModal('🎯 Đề xuất tối ưu lịch tuần', result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🎯 Tối ưu lịch tuần';
    }
};

/**
 * #72 - Smart Meeting Scheduler - Tìm giờ họp phù hợp
 */
const handleMeetingScheduler = async () => {
    const btn = document.getElementById('btn-ai-meeting');
    const events = getWeekEvents();

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang tìm...';

    try {
        const systemPrompt = `Bạn là trợ lý lên lịch họp.
Dựa trên lịch hiện tại, tìm các slot phù hợp để họp.

Lịch hiện tại:
${formatEventsForAI(events)}

Yêu cầu:
1. Tìm 5 slot trống phù hợp để họp trong tuần
2. Ưu tiên giờ làm việc (9h-17h)
3. Tránh đầu tuần (Thứ 2 sáng) và cuối tuần
4. Đề xuất độ dài phù hợp (30 phút, 1 giờ)
5. Giải thích lý do chọn mỗi slot`;

        const result = await aiService.ask('Tìm giờ họp phù hợp', { systemPrompt });
        showCalendarAIModal('🤝 Các slot họp gợi ý', result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🤝 Tìm giờ họp';
    }
};

/**
 * #75 - Smart Time Blocking - Chia block thời gian
 */
const handleTimeBlocking = async () => {
    const btn = document.getElementById('btn-ai-time-block');
    const events = getWeekEvents();
    const tasks = (globalData?.tasks || []).filter(t => t.status !== 'Hoàn thành');

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang phân chia...';

    try {
        const systemPrompt = `Bạn là chuyên gia Time Blocking.
Phân chia thời gian thành các block hiệu quả.

Lịch hiện tại:
${formatEventsForAI(events)}

Công việc cần làm:
${tasks.map(t => `- ${t.name} (Ưu tiên: ${t.priority})`).join('\n') || 'Không có'}

Yêu cầu:
1. Tạo kế hoạch Time Block cho ngày mai
2. Chia thành các block 90 phút (Deep Work) và 25 phút (Tasks)
3. Có thời gian nghỉ giữa các block
4. Xếp việc khó vào giờ năng lượng cao (9-11h, 15-17h)
5. Format dễ đọc theo giờ`;

        const result = await aiService.ask('Tạo Time Blocking', { systemPrompt });
        showCalendarAIModal('⏰ Kế hoạch Time Blocking', result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '⏰ Chia block thời gian';
    }
};

/**
 * #76 - Calendar Conflict Resolver - Xử lý xung đột lịch
 */
const handleConflictResolver = async () => {
    const btn = document.getElementById('btn-ai-conflict');
    const events = globalData?.calendarEvents || [];

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang kiểm tra...';

    try {
        // Tìm xung đột
        const conflicts = [];
        for (let i = 0; i < events.length; i++) {
            for (let j = i + 1; j < events.length; j++) {
                if (events[i].date === events[j].date) {
                    if (events[i].startTime && events[j].startTime) {
                        if (events[i].startTime < events[j].endTime && events[j].startTime < events[i].endTime) {
                            conflicts.push(`${events[i].title} và ${events[j].title} (${events[i].date})`);
                        }
                    }
                }
            }
        }

        const systemPrompt = `Bạn là trợ lý giải quyết xung đột lịch.

Lịch hiện tại:
${formatEventsForAI(events)}

${conflicts.length > 0 ? `Xung đột phát hiện:\n${conflicts.join('\n')}` : 'Không phát hiện xung đột rõ ràng.'}

Yêu cầu:
1. Phân tích các sự kiện có thể chồng chéo hoặc quá gần nhau
2. Đề xuất cách sắp xếp lại
3. Cảnh báo nếu có ngày quá tải
4. Gợi ý thời gian di chuyển giữa các sự kiện (nếu cần)`;

        const result = await aiService.ask('Kiểm tra xung đột lịch', { systemPrompt });
        showCalendarAIModal('⚡ Phân tích xung đột lịch', result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '⚡ Xử lý xung đột';
    }
};

/**
 * #82 - Calendar Analytics Dashboard - Phân tích thời gian
 */
const handleCalendarAnalytics = async () => {
    const btn = document.getElementById('btn-ai-cal-analytics');
    const events = globalData?.calendarEvents || [];

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang phân tích...';

    try {
        const systemPrompt = `Bạn là chuyên gia phân tích thời gian.

Dữ liệu lịch (${events.length} sự kiện):
${formatEventsForAI(events)}

Yêu cầu phân tích:
1. Phân bổ thời gian theo danh mục (Học tập, Công việc, Cá nhân...)
2. Thống kê số giờ bận/rảnh trung bình mỗi ngày
3. Xu hướng: Ngày nào thường bận nhất?
4. Đề xuất cải thiện cách sử dụng thời gian
5. So sánh với best practices (40h làm việc/tuần, 8h nghỉ...)`;

        const result = await aiService.ask('Phân tích thời gian', { systemPrompt });
        showCalendarAIModal('📊 Phân tích sử dụng thời gian', result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📊 Phân tích thời gian';
    }
};

/**
 * #84 - Smart Appointment Booking - Gợi ý slot hẹn tốt nhất
 */
const handleSmartBooking = async () => {
    const btn = document.getElementById('btn-ai-smart-booking');
    const events = getWeekEvents();

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang tìm...';

    try {
        const systemPrompt = `Bạn là trợ lý đặt lịch hẹn thông minh.

Lịch tuần này:
${formatEventsForAI(events)}

Yêu cầu:
1. Tìm 10 slot tốt nhất để nhận lịch hẹn từ khách
2. Ưu tiên các slot:
   - Không quá gần sự kiện khác (buffer 30 phút)
   - Giờ làm việc thông thường
   - Tránh đầu tuần và cuối ngày
3. Giải thích tại sao mỗi slot là lựa chọn tốt
4. Đề xuất thời lượng cho các loại hẹn khác nhau`;

        const result = await aiService.ask('Gợi ý slot đặt hẹn', { systemPrompt });
        showCalendarAIModal('📌 Các slot hẹn tốt nhất', result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📌 Gợi ý slot hẹn';
    }
};

/**
 * #88 - Time Spent Analytics - Thống kê thời gian đã dùng
 */
const handleTimeSpent = async () => {
    const btn = document.getElementById('btn-ai-time-spent');
    const events = globalData?.calendarEvents || [];
    const tasks = globalData?.tasks || [];

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang thống kê...';

    try {
        // Tính tổng giờ
        let totalHours = 0;
        events.forEach(e => {
            if (e.startTime && e.endTime) {
                const start = e.startTime.split(':').map(Number);
                const end = e.endTime.split(':').map(Number);
                const hours = (end[0] * 60 + end[1] - start[0] * 60 - start[1]) / 60;
                totalHours += hours;
            }
        });

        const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;

        const systemPrompt = `Bạn là chuyên gia phân tích năng suất.

Thống kê:
- Tổng sự kiện: ${events.length}
- Tổng giờ lên lịch: ~${totalHours.toFixed(1)} giờ
- Công việc hoàn thành: ${completedTasks}/${tasks.length}

Dữ liệu chi tiết:
${formatEventsForAI(events.slice(0, 20))}

Yêu cầu:
1. Tạo báo cáo thống kê chi tiết
2. Tính trung bình giờ/ngày
3. Phân loại thời gian theo mục đích
4. Đánh giá hiệu suất 1-10
5. Gợi ý cải thiện cụ thể`;

        const result = await aiService.ask('Thống kê thời gian', { systemPrompt });
        showCalendarAIModal('⏱️ Báo cáo thống kê thời gian', result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '⏱️ Thống kê thời gian';
    }
};

/**
 * #89 - AI Focus Hours Protector - Bảo vệ giờ tập trung
 */
const handleFocusHours = async () => {
    const btn = document.getElementById('btn-ai-focus-hours');
    const events = getWeekEvents();

    btn.disabled = true;
    btn.innerHTML = '⏳ Đang phân tích...';

    try {
        const systemPrompt = `Bạn là chuyên gia bảo vệ thời gian tập trung (Focus Time).

Lịch tuần này:
${formatEventsForAI(events)}

Yêu cầu:
1. Tìm các khung giờ "Focus Time" lý tưởng trong tuần
2. Thường là 2-3 giờ liên tục không bị gián đoạn
3. Ưu tiên buổi sáng (9-12h) hoặc chiều muộn (15-18h)
4. Đề xuất cách "bảo vệ" các khung giờ này
5. Cảnh báo nếu lịch hiện tại có quá ít Focus Time
6. Gợi ý block cụ thể nên thêm vào lịch`;

        const result = await aiService.ask('Tìm giờ tập trung', { systemPrompt });
        showCalendarAIModal('🧘 Bảo vệ giờ tập trung', result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🧘 Giờ tập trung';
    }
};

/**
 * [MỚI] Quick Add Event - Thêm sự kiện bằng ngôn ngữ tự nhiên (#91)
 * Hiển thị bảng preview trước khi thêm, hỗ trợ nhiều sự kiện
 */
let pendingEvents = []; // Lưu events đang chờ xác nhận

const handleQuickAddEvent = async () => {
    const input = document.getElementById('quick-event-input');
    const btn = document.getElementById('btn-quick-add-event');
    const text = input?.value?.trim();

    if (!text) {
        showNotification('Vui lòng nhập mô tả sự kiện!', 'error');
        return;
    }

    const originalBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ AI đang phân tích...';

    try {
        const today = new Date();
        const systemPrompt = `Bạn là trợ lý lịch biểu thông minh. Phân tích yêu cầu và trích xuất TẤT CẢ sự kiện được đề cập.

Ngày hôm nay: ${today.toLocaleDateString('vi-VN')} (${['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][today.getDay()]})
Năm hiện tại: ${today.getFullYear()}

Yêu cầu của người dùng: "${text}"

Trả lời theo định dạng JSON array (CHỈ JSON, không có text khác):
[
  {
    "title": "Tên sự kiện",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "category": "Học tập/Công việc/Họp/Cá nhân/Khác"
  }
]

Lưu ý quan trọng:
- Có thể có NHIỀU sự kiện trong 1 yêu cầu
- "ngày mai" = ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}
- "thứ 5" = thứ 5 tuần này hoặc tuần sau nếu đã qua
- "2h chiều" = 14:00, "9h sáng" = 09:00
- Nếu không có endTime, +1 giờ từ startTime
- Maximum 100 events`;

        const result = await aiService.ask(text, { systemPrompt });

        // Parse JSON từ response
        let eventsData;
        try {
            // Tìm JSON array trong response
            const jsonMatch = result.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                eventsData = JSON.parse(jsonMatch[0]);
            } else {
                // Thử parse single object
                const singleMatch = result.match(/\{[\s\S]*?\}/);
                if (singleMatch) {
                    eventsData = [JSON.parse(singleMatch[0])];
                } else {
                    throw new Error('Không tìm thấy JSON');
                }
            }
        } catch (e) {
            showNotification('AI không thể phân tích. Vui lòng mô tả rõ hơn.', 'error');
            return;
        }

        // Validate và chuẩn hóa dữ liệu
        pendingEvents = eventsData
            .filter(e => e.title && e.date && e.startTime)
            .slice(0, 100) // Max 100 events
            .map((e, i) => ({
                tempId: Date.now() + i,
                title: e.title,
                date: e.date,
                startTime: e.startTime,
                endTime: e.endTime || calculateEndTime(e.startTime),
                category: e.category || 'Chung',
                selected: true
            }));

        if (pendingEvents.length === 0) {
            showNotification('Không tìm thấy sự kiện hợp lệ. Vui lòng nhập rõ hơn.', 'error');
            return;
        }

        // Hiển thị preview table
        showEventPreviewTable(pendingEvents);
        input.value = '';

    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
};

/**
 * Tính endTime từ startTime (+1 giờ)
 */
const calculateEndTime = (startTime) => {
    const [h, m] = startTime.split(':').map(Number);
    return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Hiển thị bảng preview sự kiện (#91)
 */
const showEventPreviewTable = (events) => {
    const existingModal = document.getElementById('event-preview-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'event-preview-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); z-index: 10001;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; backdrop-filter: blur(5px);
    `;

    const selectedCount = events.filter(e => e.selected).length;

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 900px; width: 100%; max-height: 85vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4);">
            <div style="padding: 18px 24px; background: linear-gradient(135deg, #4facfe, #00f2fe); color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin: 0; font-size: 1.2rem;">📅 Xem trước sự kiện</h2>
                        <small style="opacity: 0.9;">Đã tìm thấy ${events.length} sự kiện - Chọn để thêm vào lịch</small>
                    </div>
                    <button id="close-preview-modal" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 1.4rem; cursor: pointer; width: 36px; height: 36px; border-radius: 50%;">×</button>
                </div>
            </div>
            
            <div style="padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; gap: 10px; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" id="select-all-events" ${selectedCount === events.length ? 'checked' : ''}>
                    <span style="font-size: 0.9rem;">Chọn tất cả</span>
                </label>
                <span style="color: #666; font-size: 0.85rem;">|</span>
                <span id="selected-count" style="color: #4facfe; font-weight: 600; font-size: 0.9rem;">${selectedCount} đã chọn</span>
            </div>
            
            <div style="max-height: 50vh; overflow-y: auto; padding: 10px 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: #f1f5f9; position: sticky; top: 0;">
                            <th style="padding: 10px 8px; text-align: center; width: 40px;">✓</th>
                            <th style="padding: 10px 8px; text-align: left;">Tên sự kiện</th>
                            <th style="padding: 10px 8px; text-align: center; width: 110px;">Ngày</th>
                            <th style="padding: 10px 8px; text-align: center; width: 100px;">Giờ</th>
                            <th style="padding: 10px 8px; text-align: center; width: 90px;">Loại</th>
                            <th style="padding: 10px 8px; text-align: center; width: 60px;">Xóa</th>
                        </tr>
                    </thead>
                    <tbody id="preview-table-body">
                        ${events.map((e, i) => `
                            <tr data-id="${e.tempId}" style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px 8px; text-align: center;">
                                    <input type="checkbox" class="event-checkbox" data-id="${e.tempId}" ${e.selected ? 'checked' : ''}>
                                </td>
                                <td style="padding: 10px 8px;">
                                    <input type="text" class="event-title" data-id="${e.tempId}" value="${escapeHTML(e.title)}" 
                                        style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;">
                                </td>
                                <td style="padding: 10px 8px; text-align: center;">
                                    <input type="date" class="event-date" data-id="${e.tempId}" value="${e.date}"
                                        style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                                </td>
                                <td style="padding: 10px 8px; text-align: center;">
                                    <input type="time" class="event-start" data-id="${e.tempId}" value="${e.startTime}"
                                        style="width: 70px; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem;">
                                    -
                                    <input type="time" class="event-end" data-id="${e.tempId}" value="${e.endTime}"
                                        style="width: 70px; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem;">
                                </td>
                                <td style="padding: 10px 8px; text-align: center;">
                                    <select class="event-category" data-id="${e.tempId}" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem;">
                                        <option value="Học tập" ${e.category === 'Học tập' ? 'selected' : ''}>📚 Học tập</option>
                                        <option value="Công việc" ${e.category === 'Công việc' ? 'selected' : ''}>💼 Công việc</option>
                                        <option value="Họp" ${e.category === 'Họp' ? 'selected' : ''}>🤝 Họp</option>
                                        <option value="Cá nhân" ${e.category === 'Cá nhân' ? 'selected' : ''}>👤 Cá nhân</option>
                                        <option value="Chung" ${e.category === 'Chung' ? 'selected' : ''}>📌 Chung</option>
                                    </select>
                                </td>
                                <td style="padding: 10px 8px; text-align: center;">
                                    <button class="btn-delete-event" data-id="${e.tempId}" style="background: #fee2e2; border: none; color: #dc2626; padding: 6px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="padding: 15px 24px; background: #f8f9fa; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <button id="btn-cancel-events" style="background: #f1f5f9; border: 1px solid #ddd; color: #666; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    ✖️ Hủy
                </button>
                <button id="btn-confirm-events" style="background: linear-gradient(135deg, #4facfe, #00f2fe); border: none; color: white; padding: 12px 28px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                    ✅ Thêm <span id="confirm-count">${selectedCount}</span> sự kiện
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setupPreviewTableEvents(modal);
};

/**
 * Setup event handlers cho preview table
 */
const setupPreviewTableEvents = (modal) => {
    // Close button
    modal.querySelector('#close-preview-modal').onclick = () => {
        pendingEvents = [];
        modal.remove();
    };

    // Cancel button
    modal.querySelector('#btn-cancel-events').onclick = () => {
        pendingEvents = [];
        modal.remove();
    };

    // Click outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            pendingEvents = [];
            modal.remove();
        }
    };

    // Select all checkbox
    modal.querySelector('#select-all-events').onchange = (e) => {
        const checkboxes = modal.querySelectorAll('.event-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            const event = pendingEvents.find(ev => ev.tempId == cb.dataset.id);
            if (event) event.selected = e.target.checked;
        });
        updateSelectedCount(modal);
    };

    // Individual checkboxes
    modal.querySelectorAll('.event-checkbox').forEach(cb => {
        cb.onchange = (e) => {
            const event = pendingEvents.find(ev => ev.tempId == e.target.dataset.id);
            if (event) event.selected = e.target.checked;
            updateSelectedCount(modal);
        };
    });

    // Input changes
    modal.querySelectorAll('.event-title, .event-date, .event-start, .event-end, .event-category').forEach(input => {
        input.onchange = (e) => {
            const event = pendingEvents.find(ev => ev.tempId == e.target.dataset.id);
            if (event) {
                if (e.target.classList.contains('event-title')) event.title = e.target.value;
                if (e.target.classList.contains('event-date')) event.date = e.target.value;
                if (e.target.classList.contains('event-start')) event.startTime = e.target.value;
                if (e.target.classList.contains('event-end')) event.endTime = e.target.value;
                if (e.target.classList.contains('event-category')) event.category = e.target.value;
            }
        };
    });

    // Delete buttons
    modal.querySelectorAll('.btn-delete-event').forEach(btn => {
        btn.onclick = (e) => {
            const id = parseInt(e.target.dataset.id);
            pendingEvents = pendingEvents.filter(ev => ev.tempId !== id);
            const row = modal.querySelector(`tr[data-id="${id}"]`);
            if (row) row.remove();
            updateSelectedCount(modal);
            if (pendingEvents.length === 0) modal.remove();
        };
    });

    // Confirm button
    modal.querySelector('#btn-confirm-events').onclick = async () => {
        const selectedEvents = pendingEvents.filter(e => e.selected);
        if (selectedEvents.length === 0) {
            showNotification('Vui lòng chọn ít nhất 1 sự kiện!', 'error');
            return;
        }

        // Thêm vào globalData
        if (!globalData.calendarEvents) globalData.calendarEvents = [];

        selectedEvents.forEach(e => {
            globalData.calendarEvents.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                title: e.title,
                date: e.date,
                startTime: e.startTime,
                endTime: e.endTime,
                category: e.category,
                createdAt: new Date().toISOString()
            });
        });

        // Lưu Firebase
        if (window.saveUserData) {
            await window.saveUserData(globalData);
        }

        // Render calendar
        if (window.renderCalendar) {
            window.renderCalendar();
        }

        showNotification(`✅ Đã thêm ${selectedEvents.length} sự kiện vào lịch!`, 'success');
        pendingEvents = [];
        modal.remove();
    };
};

/**
 * Cập nhật số lượng đã chọn
 */
const updateSelectedCount = (modal) => {
    const count = pendingEvents.filter(e => e.selected).length;
    const countEl = modal.querySelector('#selected-count');
    const confirmCountEl = modal.querySelector('#confirm-count');
    if (countEl) countEl.textContent = `${count} đã chọn`;
    if (confirmCountEl) confirmCountEl.textContent = count;
};

// Export
export { handleCalendarOptimize, handleTimeBlocking, handleFocusHours, handleQuickAddEvent };

