// ============================================================
// FILE: js/ai-task-analytics.js
// Mục đích: Phase 3 - Nhóm 3: Phân tích Công việc (10 tính năng)
// ============================================================

import { showNotification } from './common.js';
import { contextMemory, extractEntities, classifyIntent } from './ai-core-engine.js';

// Cấu hình API
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

let globalData = null;
let currentUser = null;

/**
 * Khởi tạo module
 */
export function initTaskAnalytics(data, user) {
    globalData = data;
    currentUser = user;
    console.log('✅ AI Task Analytics (Phase 3) đã sẵn sàng');
}

// ============================================================
// #21 - PHÂN TÍCH PATTERN HOÀN THÀNH (Completion Pattern Analysis)
// Phân tích thời gian và patterns hoàn thành task
// ============================================================
export function analyzeCompletionPatterns() {
    const tasks = globalData?.tasks || [];
    const completedTasks = tasks.filter(t => t.completed);

    if (completedTasks.length < 5) {
        return {
            message: 'Cần ít nhất 5 task hoàn thành để phân tích',
            hasEnoughData: false
        };
    }

    // Phân tích theo ngày trong tuần
    const dayStats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    // Phân tích theo giờ
    const hourStats = {};
    for (let i = 0; i < 24; i++) hourStats[i] = 0;

    // Phân tích theo category
    const categoryStats = {};

    for (const task of completedTasks) {
        if (task.completedAt) {
            const date = new Date(task.completedAt);
            dayStats[date.getDay()]++;
            hourStats[date.getHours()]++;
        }
        if (task.category) {
            categoryStats[task.category] = (categoryStats[task.category] || 0) + 1;
        }
    }

    // Tìm ngày hiệu quả nhất
    let bestDay = 0, bestDayCount = 0;
    for (const [day, count] of Object.entries(dayStats)) {
        if (count > bestDayCount) {
            bestDayCount = count;
            bestDay = parseInt(day);
        }
    }

    // Tìm giờ hiệu quả nhất
    let bestHour = 9, bestHourCount = 0;
    for (const [hour, count] of Object.entries(hourStats)) {
        if (count > bestHourCount) {
            bestHourCount = count;
            bestHour = parseInt(hour);
        }
    }

    return {
        hasEnoughData: true,
        totalCompleted: completedTasks.length,
        bestDay: dayNames[bestDay],
        bestDayCount,
        bestHour: `${bestHour}:00 - ${bestHour + 1}:00`,
        bestHourCount,
        categoryStats,
        dayStats: Object.entries(dayStats).map(([day, count]) => ({
            day: dayNames[parseInt(day)],
            count
        })),
        insight: `Bạn hoàn thành nhiều task nhất vào ${dayNames[bestDay]}, đặc biệt lúc ${bestHour}:00`
    };
}

// ============================================================
// #22 - DỰ ĐOÁN THỜI GIAN HOÀN THÀNH (Time Estimation)
// Ước tính thời gian hoàn thành dựa trên lịch sử
// ============================================================
export function estimateTaskDuration(taskTitle, category) {
    const tasks = globalData?.tasks || [];
    const completedTasks = tasks.filter(t => t.completed && t.duration);

    // Tìm tasks tương tự
    const similarTasks = completedTasks.filter(t => {
        if (category && t.category === category) return true;
        const titleWords = taskTitle.toLowerCase().split(/\s+/);
        const taskWords = t.title.toLowerCase().split(/\s+/);
        return titleWords.some(w => taskWords.includes(w) && w.length > 3);
    });

    if (similarTasks.length === 0) {
        // Ước tính mặc định theo category
        const defaults = {
            'Họp': 60,
            'Học tập': 90,
            'Công việc': 45,
            'Cá nhân': 30,
            'Khác': 30
        };
        return {
            estimated: defaults[category] || 30,
            confidence: 30,
            basedOn: 'default'
        };
    }

    // Tính trung bình từ tasks tương tự
    const avgDuration = Math.round(
        similarTasks.reduce((sum, t) => sum + (t.duration || 30), 0) / similarTasks.length
    );

    return {
        estimated: avgDuration,
        confidence: Math.min(90, 50 + similarTasks.length * 10),
        basedOn: `${similarTasks.length} task tương tự`,
        similarTasks: similarTasks.slice(0, 3).map(t => t.title)
    };
}

// ============================================================
// #23 - PHÂN TÍCH BOTTLENECK (Bottleneck Detection)
// Phát hiện các "nút cổ chai" trong workflow
// ============================================================
export function detectBottlenecks() {
    const tasks = globalData?.tasks || [];
    const bottlenecks = [];

    // 1. Tasks quá hạn nhiều lần
    const overdueTasks = tasks.filter(t => {
        if (t.completed || !t.deadline) return false;
        return new Date(t.deadline) < new Date();
    });

    if (overdueTasks.length > 3) {
        bottlenecks.push({
            type: 'overdue',
            severity: 'high',
            count: overdueTasks.length,
            message: `${overdueTasks.length} task đang quá hạn`,
            suggestion: 'Xem xét ưu tiên lại hoặc điều chỉnh deadline'
        });
    }

    // 2. Category bị tắc nghẽn
    const categoryPending = {};
    for (const task of tasks.filter(t => !t.completed)) {
        const cat = task.category || 'Khác';
        categoryPending[cat] = (categoryPending[cat] || 0) + 1;
    }

    for (const [cat, count] of Object.entries(categoryPending)) {
        if (count > 5) {
            bottlenecks.push({
                type: 'category_overload',
                severity: count > 10 ? 'high' : 'medium',
                category: cat,
                count,
                message: `${count} task pending trong "${cat}"`,
                suggestion: `Tập trung hoàn thành các task "${cat}" trước`
            });
        }
    }

    // 3. Priority imbalance
    const highPriorityPending = tasks.filter(t => !t.completed && t.priority === 'high').length;
    if (highPriorityPending > 5) {
        bottlenecks.push({
            type: 'priority_overload',
            severity: 'high',
            count: highPriorityPending,
            message: `${highPriorityPending} task ưu tiên cao đang pending`,
            suggestion: 'Quá nhiều task được đánh dấu ưu tiên cao'
        });
    }

    return {
        hasBottlenecks: bottlenecks.length > 0,
        bottlenecks,
        summary: bottlenecks.length > 0
            ? `Phát hiện ${bottlenecks.length} điểm nghẽn`
            : 'Workflow đang hoạt động tốt'
    };
}

// ============================================================
// #24 - PHÂN TÍCH NĂNG LỰC (Capacity Analysis)
// Đánh giá khả năng hoàn thành dựa trên workload
// ============================================================
export function analyzeCapacity() {
    const tasks = globalData?.tasks || [];
    const pendingTasks = tasks.filter(t => !t.completed);

    // Tính workload theo tuần
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const thisWeekTasks = pendingTasks.filter(t => {
        if (!t.deadline) return false;
        const deadline = new Date(t.deadline);
        return deadline >= now && deadline <= weekEnd;
    });

    // Ước tính thời gian cần
    let totalMinutes = 0;
    for (const task of thisWeekTasks) {
        const est = estimateTaskDuration(task.title, task.category);
        totalMinutes += est.estimated;
    }

    const hoursNeeded = Math.round(totalMinutes / 60);
    const workHoursPerDay = 8;
    const workDaysThisWeek = 5;
    const availableHours = workHoursPerDay * workDaysThisWeek;

    const utilizationPercent = Math.round((hoursNeeded / availableHours) * 100);

    let status = 'normal';
    let message = '';
    if (utilizationPercent > 100) {
        status = 'overloaded';
        message = `Quá tải! Cần ${hoursNeeded}h nhưng chỉ có ${availableHours}h`;
    } else if (utilizationPercent > 80) {
        status = 'busy';
        message = `Workload cao (${utilizationPercent}%). Cân nhắc trước khi nhận thêm việc`;
    } else if (utilizationPercent < 30) {
        status = 'light';
        message = `Workload nhẹ (${utilizationPercent}%). Có thể nhận thêm công việc`;
    } else {
        status = 'normal';
        message = `Workload hợp lý (${utilizationPercent}%)`;
    }

    return {
        thisWeekTaskCount: thisWeekTasks.length,
        hoursNeeded,
        availableHours,
        utilizationPercent,
        status,
        message
    };
}

// ============================================================
// #25 - GỢI Ý TỐI ƯU (Optimization Suggestions)
// Đề xuất cách tối ưu workflow
// ============================================================
export function getOptimizationSuggestions() {
    const suggestions = [];
    const tasks = globalData?.tasks || [];
    const pendingTasks = tasks.filter(t => !t.completed);

    // 1. Gợi ý batch similar tasks
    const categories = {};
    for (const task of pendingTasks) {
        const cat = task.category || 'Khác';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(task);
    }

    for (const [cat, catTasks] of Object.entries(categories)) {
        if (catTasks.length >= 3) {
            suggestions.push({
                type: 'batch',
                priority: 'medium',
                title: `Gộp ${catTasks.length} task "${cat}"`,
                description: `Làm cùng lúc các task thuộc "${cat}" để tiết kiệm thời gian chuyển đổi`,
                tasks: catTasks.slice(0, 3).map(t => t.title)
            });
        }
    }

    // 2. Gợi ý deadline sắp đến
    const urgentTasks = pendingTasks.filter(t => {
        if (!t.deadline) return false;
        const daysLeft = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 2 && daysLeft >= 0;
    });

    if (urgentTasks.length > 0) {
        suggestions.push({
            type: 'urgent',
            priority: 'high',
            title: `${urgentTasks.length} task cần hoàn thành trong 2 ngày`,
            description: 'Ưu tiên các task này trước',
            tasks: urgentTasks.map(t => t.title)
        });
    }

    // 3. Gợi ý quick wins
    const quickWins = pendingTasks.filter(t => {
        const est = estimateTaskDuration(t.title, t.category);
        return est.estimated <= 15;
    });

    if (quickWins.length >= 2) {
        suggestions.push({
            type: 'quick_wins',
            priority: 'low',
            title: `${quickWins.length} task có thể hoàn thành nhanh (<15 phút)`,
            description: 'Làm các task nhỏ khi có thời gian rảnh',
            tasks: quickWins.slice(0, 5).map(t => t.title)
        });
    }

    return suggestions;
}

// ============================================================
// #26 - PHÂN TÍCH TREND (Trend Analysis)
// Phân tích xu hướng năng suất theo thời gian
// ============================================================
export function analyzeTrends() {
    const tasks = globalData?.tasks || [];
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);

    if (completedTasks.length < 10) {
        return { hasEnoughData: false, message: 'Cần ít nhất 10 task hoàn thành' };
    }

    // Nhóm theo tuần
    const weeklyData = {};
    for (const task of completedTasks) {
        const date = new Date(task.completedAt);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { count: 0, totalDuration: 0 };
        }
        weeklyData[weekKey].count++;
        weeklyData[weekKey].totalDuration += task.duration || 30;
    }

    const weeks = Object.entries(weeklyData).sort((a, b) => a[0].localeCompare(b[0]));

    // Tính trend
    let trend = 'stable';
    if (weeks.length >= 3) {
        const lastWeek = weeks[weeks.length - 1][1].count;
        const prevWeek = weeks[weeks.length - 2][1].count;
        const change = ((lastWeek - prevWeek) / prevWeek) * 100;

        if (change > 20) trend = 'increasing';
        else if (change < -20) trend = 'decreasing';
    }

    return {
        hasEnoughData: true,
        weeklyData: weeks.slice(-8).map(([week, data]) => ({
            week,
            tasksCompleted: data.count,
            avgDuration: Math.round(data.totalDuration / data.count)
        })),
        trend,
        trendMessage: trend === 'increasing'
            ? '📈 Năng suất đang tăng!'
            : trend === 'decreasing'
                ? '📉 Năng suất đang giảm'
                : '📊 Năng suất ổn định'
    };
}

// ============================================================
// #27 - PHÂN LOẠI TỰ ĐỘNG (Auto-Categorization)
// Tự động gợi ý category cho task mới
// ============================================================
export function suggestCategory(taskTitle) {
    const intents = classifyIntent(taskTitle);

    // Map intents to categories
    const intentToCategory = {
        'Họp': 'Họp',
        'Học tập': 'Học tập',
        'Công việc': 'Công việc',
        'Cá nhân': 'Cá nhân',
        'Gấp': 'Công việc',
        'Định kỳ': 'Công việc'
    };

    for (const intent of intents) {
        if (intentToCategory[intent]) {
            return {
                category: intentToCategory[intent],
                confidence: 80,
                basedOn: `Phát hiện intent: ${intent}`
            };
        }
    }

    // Fallback: dựa vào context memory
    const mostUsed = contextMemory.getMostUsedCategory();
    return {
        category: mostUsed,
        confidence: 50,
        basedOn: 'Category hay dùng nhất'
    };
}

// ============================================================
// #28 - ĐÁNH GIÁ ĐỘ KHÓ (Difficulty Assessment)
// Đánh giá độ khó của task
// ============================================================
export function assessDifficulty(task) {
    let score = 50; // Base score (medium)
    const factors = [];

    // 1. Độ dài title
    if (task.title.length > 50) {
        score += 10;
        factors.push('Mô tả phức tạp');
    }

    // 2. Deadline gấp
    if (task.deadline) {
        const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 1) {
            score += 20;
            factors.push('Deadline gấp');
        } else if (daysLeft <= 3) {
            score += 10;
            factors.push('Deadline sắp đến');
        }
    }

    // 3. Priority
    if (task.priority === 'high') {
        score += 15;
        factors.push('Ưu tiên cao');
    }

    // 4. Keywords khó
    const hardKeywords = ['phức tạp', 'khó', 'quan trọng', 'dự án lớn', 'báo cáo', 'luận văn', 'nghiên cứu'];
    const lowerTitle = task.title.toLowerCase();
    if (hardKeywords.some(k => lowerTitle.includes(k))) {
        score += 15;
        factors.push('Từ khóa phức tạp');
    }

    // Determine level
    let level = 'medium';
    if (score >= 80) level = 'hard';
    else if (score >= 60) level = 'medium-hard';
    else if (score <= 30) level = 'easy';
    else if (score <= 45) level = 'easy-medium';

    return {
        score: Math.min(100, score),
        level,
        factors,
        emoji: level === 'hard' ? '🔴' : level.includes('medium') ? '🟡' : '🟢'
    };
}

// ============================================================
// #29 - PHÂN TÍCH DEPENDENCIES (Dependency Analysis)
// Phân tích và visualize dependencies
// ============================================================
export function analyzeDependencies() {
    const tasks = globalData?.tasks || [];
    const pendingTasks = tasks.filter(t => !t.completed);

    const dependencies = [];
    const blockers = [];

    for (let i = 0; i < pendingTasks.length; i++) {
        const task = pendingTasks[i];
        const title = task.title.toLowerCase();

        // Tìm dependencies
        if (title.includes('sau khi') || title.includes('sau') || title.includes('then')) {
            for (let j = 0; j < pendingTasks.length; j++) {
                if (i !== j) {
                    const other = pendingTasks[j];
                    const similarity = calculateSimilarity(title, other.title.toLowerCase());
                    if (similarity > 30) {
                        dependencies.push({
                            from: other.id,
                            fromTitle: other.title,
                            to: task.id,
                            toTitle: task.title,
                            type: 'blocks'
                        });
                    }
                }
            }
        }

        // Tìm blockers (tasks không có dependency nhưng đang block)
        if (task.priority === 'high' && task.deadline) {
            const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 2) {
                blockers.push({
                    id: task.id,
                    title: task.title,
                    reason: `Deadline trong ${daysLeft} ngày`
                });
            }
        }
    }

    return {
        dependencies,
        blockers,
        hasDependencies: dependencies.length > 0,
        hasBlockers: blockers.length > 0
    };
}

// Helper: Calculate similarity
function calculateSimilarity(str1, str2) {
    const words1 = str1.split(/\s+/).filter(w => w.length > 3);
    const words2 = str2.split(/\s+/).filter(w => w.length > 3);
    const common = words1.filter(w => words2.includes(w));
    if (words1.length === 0 || words2.length === 0) return 0;
    return Math.round((common.length / Math.max(words1.length, words2.length)) * 100);
}

// ============================================================
// #30 - BÁO CÁO TỔNG HỢP (Comprehensive Report)
// Tạo báo cáo tổng hợp về công việc
// ============================================================
export function generateComprehensiveReport() {
    const patterns = analyzeCompletionPatterns();
    const bottlenecks = detectBottlenecks();
    const capacity = analyzeCapacity();
    const suggestions = getOptimizationSuggestions();
    const trends = analyzeTrends();
    const dependencies = analyzeDependencies();

    const tasks = globalData?.tasks || [];
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;
    const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    return {
        summary: {
            totalTasks: tasks.length,
            completed,
            pending,
            completionRate
        },
        patterns: patterns.hasEnoughData ? patterns : null,
        bottlenecks: bottlenecks.hasBottlenecks ? bottlenecks : null,
        capacity,
        suggestions: suggestions.length > 0 ? suggestions : null,
        trends: trends.hasEnoughData ? trends : null,
        dependencies: dependencies.hasDependencies || dependencies.hasBlockers ? dependencies : null,
        generatedAt: new Date().toISOString()
    };
}

