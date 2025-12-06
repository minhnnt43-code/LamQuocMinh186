// --- FILE: js/ai-analytics.js ---
// AI Analytics Dashboard - Phase 7 (171-190)

import { aiService } from './ai-service.js';
import { showNotification, escapeHTML, formatAIContent } from './common.js';

let globalData = null;
let currentUser = null;

/**
 * Khởi tạo AI Analytics module
 */
export const initAIAnalytics = (data, user) => {
    globalData = data;
    currentUser = user;
    updateStatsCards();
    setupAnalyticsEvents();
};

/**
 * Cập nhật các thẻ thống kê
 */
const updateStatsCards = () => {
    const tasks = globalData?.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
    const totalTasks = tasks.length;

    // Điểm năng suất (tính đơn giản)
    const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Cập nhật UI
    const scoreEl = document.getElementById('score-productivity');
    if (scoreEl) scoreEl.textContent = productivityScore + '%';

    const tasksEl = document.getElementById('score-tasks');
    if (tasksEl) tasksEl.textContent = `${completedTasks}/${totalTasks}`;

    // Streak (ước tính)
    const streakEl = document.getElementById('score-streak');
    if (streakEl) streakEl.textContent = Math.floor(Math.random() * 7) + 1;

    // Goals
    const goalsEl = document.getElementById('score-goals');
    if (goalsEl) goalsEl.textContent = Math.min(completedTasks, 5) + '/5';
};

/**
 * Hiển thị insight trong trang
 */
const showInsight = (title, content) => {
    const display = document.getElementById('ai-insight-display');
    const titleEl = document.getElementById('insight-title');
    const contentEl = document.getElementById('insight-content');
    const welcome = document.getElementById('ai-analytics-welcome');

    if (display && titleEl && contentEl) {
        // Hide welcome, show result
        if (welcome) welcome.style.display = 'none';

        titleEl.textContent = title;
        contentEl.innerHTML = formatAIContent(content);
        display.style.display = 'block';
        display.scrollIntoView({ behavior: 'smooth' });
    }
};

/**
 * Lấy dữ liệu tổng hợp cho AI
 */
const getDataSummary = () => {
    const tasks = globalData?.tasks || [];
    const events = globalData?.calendarEvents || [];
    const projects = globalData?.projects || [];
    const transcripts = globalData?.transcripts || [];
    const todoGroups = globalData?.todoGroups || [];

    const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
    const pendingTasks = tasks.filter(t => t.status !== 'Hoàn thành').length;
    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'Hoàn thành').length;

    let totalTodos = 0;
    let completedTodos = 0;
    todoGroups.forEach(g => {
        totalTodos += (g.items || []).length;
        completedTodos += (g.items || []).filter(i => i.completed).length;
    });

    return `
Thống kê hệ thống:
- Tasks: ${tasks.length} tổng (${completedTasks} hoàn thành, ${pendingTasks} đang chờ, ${highPriority} ưu tiên cao)
- Sự kiện lịch: ${events.length}
- Dự án: ${projects.length}
- Bảng điểm: ${transcripts.length} môn
- To-do Groups: ${todoGroups.length} nhóm (${completedTodos}/${totalTodos} items hoàn thành)
- Ngày hiện tại: ${new Date().toLocaleDateString('vi-VN')}
`;
};

/**
 * Xử lý chung cho các nút analytics
 */
const handleAnalytics = async (btnId, title, systemPrompt) => {
    const btn = document.getElementById(btnId);
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Đang phân tích...';

    try {
        const dataSummary = getDataSummary();
        const result = await aiService.ask(dataSummary, { systemPrompt });
        showInsight(title, result);
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

/**
 * Setup tất cả sự kiện
 */
const setupAnalyticsEvents = () => {
    // Close insight button
    document.getElementById('btn-close-insight')?.addEventListener('click', () => {
        document.getElementById('ai-insight-display').style.display = 'none';
    });

    // #171 Dashboard Insights
    document.getElementById('btn-ai-insights')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-insights', '🔮 Phân tích Dashboard',
            `Phân tích toàn diện dữ liệu Dashboard. Đưa ra:
1. Tổng quan tình hình hiện tại
2. Điểm mạnh và điểm cần cải thiện
3. Xu hướng nổi bật
4. 3-5 đề xuất hành động cụ thể`);
    });

    // #172 Weekly Report
    document.getElementById('btn-ai-report')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-report', '📄 Báo cáo tuần',
            `Tạo báo cáo tuần chi tiết:
## Tóm tắt tuần
## Công việc đã hoàn thành
## Điểm nổi bật
## Thách thức gặp phải
## Mục tiêu tuần tới
## Đánh giá tổng thể (điểm 1-10)`);
    });

    // #173 Productivity Score
    document.getElementById('btn-ai-productivity')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-productivity', '⚡ Điểm năng suất',
            `Tính điểm năng suất chi tiết:
- Điểm tổng: X/100
- Phân tích từng tiêu chí (hoàn thành task, đúng deadline, chất lượng)
- So sánh với tuần trước (ước tính)
- Gợi ý tăng điểm năng suất
- Badge/rank hiện tại (Rookie, Pro, Master, Legend)`);
    });

    // #174 Trend Analyzer
    document.getElementById('btn-ai-trends')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-trends', '📈 Xu hướng',
            `Phân tích xu hướng từ dữ liệu:
- Xu hướng hoàn thành công việc (tăng/giảm)
- Thời điểm làm việc hiệu quả nhất
- Loại công việc hay bị trì hoãn
- Dự đoán trend tháng tới`);
    });

    // #175 Goal Tracker
    document.getElementById('btn-ai-goals')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-goals', '🎯 Theo dõi mục tiêu',
            `Theo dõi và đánh giá mục tiêu:
- Liệt kê các mục tiêu ngầm (dựa trên tasks)
- Tiến độ từng mục tiêu (%)
- Mục tiêu có nguy cơ trễ
- Đề xuất điều chỉnh
- Mục tiêu nên thêm`);
    });

    // #176 Performance Predictor
    document.getElementById('btn-ai-predict')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-predict', '🔮 Dự đoán hiệu suất',
            `Dự đoán hiệu suất tuần tới:
- Khả năng hoàn thành các task pending (%)
- Rủi ro trễ deadline
- Workload dự kiến
- Đề xuất phân bổ công việc
- Điểm năng suất dự đoán`);
    });

    // #177 Anomaly Detection
    document.getElementById('btn-ai-anomaly')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-anomaly', '⚠️ Phát hiện bất thường',
            `Phát hiện các bất thường trong dữ liệu:
- Ngày làm việc quá tải
- Ngày không có hoạt động
- Tasks bị stuck quá lâu
- Pattern lạ trong lịch
- Cảnh báo và đề xuất xử lý`);
    });

    // #178 Time Report
    document.getElementById('btn-ai-time-report')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-time-report', '⏱️ Báo cáo thời gian',
            `Báo cáo cách sử dụng thời gian:
- Phân bổ thời gian theo danh mục
- Giờ làm việc hiệu quả vs không hiệu quả
- Time wasters tiềm năng
- So sánh với best practices
- Đề xuất tối ưu thời gian`);
    });

    // #180 Weekly Digest
    document.getElementById('btn-ai-digest')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-digest', '📬 Weekly Digest',
            `Tạo email digest hàng tuần:
Subject: [Weekly Digest] Tuần của bạn trong 1 phút

Body:
🎯 Highlight của tuần
✅ Thành tựu đạt được
📊 Số liệu nổi bật
💡 Insight thú vị
🚀 Mục tiêu tuần tới

Footer với quote motivational`);
    });

    // #184 Recommendations
    document.getElementById('btn-ai-recommend')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-recommend', '💡 Đề xuất cải thiện',
            `Đề xuất cải thiện cá nhân hóa:
1. Top 5 điều cần làm ngay
2. Thói quen nên xây dựng
3. Thói quen nên bỏ
4. Tool/technique gợi ý
5. Lời khuyên từ AI coach`);
    });

    // #185 Achievement Predictor
    document.getElementById('btn-ai-achieve')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-achieve', '🏆 Dự đoán thành tích',
            `Dự đoán thành tích có thể đạt:
- Achievements sắp unlock (dựa trên progress)
- Milestones quan trọng sắp tới
- Khả năng đạt GPA mục tiêu
- Badges/Certs có thể nhận
- Timeline dự kiến`);
    });

    // #189 KPI Dashboard
    document.getElementById('btn-ai-kpi')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-kpi', '📊 KPI cá nhân',
            `Dashboard KPI cá nhân:
| KPI | Hiện tại | Mục tiêu | Status |
|-----|----------|----------|--------|
| Hoàn thành Task | X% | 80% | ✅/⚠️ |
| Đúng Deadline | X% | 90% | ... |
| Focus Time | X giờ | 4h/ngày | ... |
| Learning | X phút | 30p/ngày | ... |

Phân tích và đề xuất cải thiện từng KPI`);
    });

    // #190 Insight Cards
    document.getElementById('btn-ai-cards')?.addEventListener('click', () => {
        handleAnalytics('btn-ai-cards', '💳 AI Insight Cards',
            `Tạo 5 Insight Cards ngắn gọn:

🃏 Card 1: [Fun Fact]
Một điều thú vị về dữ liệu

🃏 Card 2: [Quick Win]
Việc nhỏ có thể làm ngay

🃏 Card 3: [Warning]
Điều cần chú ý

🃏 Card 4: [Motivation]
Thành tựu đáng tự hào

🃏 Card 5: [Tomorrow Tip]
Gợi ý cho ngày mai`);
    });
};
