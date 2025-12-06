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
 * [MỚI] Quick Add Event - Thêm sự kiện bằng ngôn ngữ tự nhiên
 */
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
    btn.innerHTML = '⏳...';

    try {
        const today = new Date();
        const systemPrompt = `Bạn là trợ lý lịch biểu. Phân tích yêu cầu và trích xuất thông tin sự kiện.

Ngày hôm nay: ${today.toLocaleDateString('vi-VN')} (${['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][today.getDay()]})

Yêu cầu của người dùng: "${text}"

Trả lời theo định dạng JSON (CHỈ JSON, không có text khác):
{
  "title": "Tên sự kiện",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "category": "Công việc/Học tập/Cá nhân/Họp/Khác",
  "description": "Mô tả ngắn (nếu có)"
}

Lưu ý:
- "ngày mai" = ngày tiếp theo
- "thứ 5" = thứ 5 tuần này hoặc tuần sau nếu đã qua
- "2h chiều" = 14:00
- "9h sáng" = 09:00
- Nếu không có endTime, mặc định +1 giờ sau startTime`;

        const result = await aiService.ask(text, { systemPrompt });

        // Parse JSON từ response
        let eventData;
        try {
            // Tìm JSON trong response
            const jsonMatch = result.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                eventData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Không tìm thấy JSON');
            }
        } catch (e) {
            showNotification('AI không thể phân tích. Vui lòng thử lại với câu rõ ràng hơn.', 'error');
            return;
        }

        // Validate dữ liệu
        if (!eventData.title || !eventData.date || !eventData.startTime) {
            showNotification('Thiếu thông tin sự kiện. Vui lòng nhập rõ hơn.', 'error');
            return;
        }

        // Thêm vào globalData
        const newEvent = {
            id: Date.now().toString(),
            title: eventData.title,
            date: eventData.date,
            startTime: eventData.startTime,
            endTime: eventData.endTime || (() => {
                const [h, m] = eventData.startTime.split(':').map(Number);
                return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            })(),
            category: eventData.category || 'Chung',
            description: eventData.description || '',
            createdAt: new Date().toISOString()
        };

        if (!globalData.calendarEvents) globalData.calendarEvents = [];
        globalData.calendarEvents.push(newEvent);

        // Lưu vào Firebase nếu có
        if (window.saveUserData) {
            await window.saveUserData(globalData);
        }

        // Render lại calendar nếu có function
        if (window.renderCalendar) {
            window.renderCalendar();
        }

        showNotification(`✅ Đã thêm: "${newEvent.title}" vào ${newEvent.date} lúc ${newEvent.startTime}`, 'success');
        input.value = '';

    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
};

// Export
export { handleCalendarOptimize, handleTimeBlocking, handleFocusHours, handleQuickAddEvent };

