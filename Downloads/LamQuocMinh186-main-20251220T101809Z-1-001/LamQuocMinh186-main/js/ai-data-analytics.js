// ============================================================
// FILE: js/ai-data-analytics.js
// Mục đích: Phase 6 - Nhóm 7: Dữ liệu & Thống kê (10 tính năng)
// ============================================================

import { showNotification } from './common.js';
import { contextMemory } from './ai-core-engine.js';
import { analyzeCompletionPatterns, analyzeCapacity } from './ai-task-analytics.js';
import { calculateProductivityScore, generateWeeklyReview } from './ai-productivity.js';

let globalData = null;
let currentUser = null;

/**
 * Khởi tạo module
 */
export function initDataAnalytics(data, user) {
    globalData = data;
    currentUser = user;
    console.log('✅ AI Data Analytics (Phase 6) đã sẵn sàng');
}

// ============================================================
// #61 - DASHBOARD THỐNG KÊ TỔNG HỢP (Unified Dashboard Stats)
// Tổng hợp tất cả thống kê chính
// ============================================================
export function getDashboardStats() {
    const tasks = globalData?.tasks || [];
    const events = globalData?.events || [];
    const todos = globalData?.todos || [];
    const projects = globalData?.projects || [];

    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    // Task stats
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const overdueTasks = tasks.filter(t => {
        if (t.completed || !t.deadline) return false;
        return new Date(t.deadline) < now;
    }).length;

    // Today's stats
    const todayTasks = tasks.filter(t => {
        if (!t.deadline) return false;
        return new Date(t.deadline).toDateString() === today;
    });
    const todayEvents = events.filter(e => {
        if (!e.date) return false;
        return new Date(e.date).toDateString() === today;
    });

    // Week stats
    const thisWeekCompleted = tasks.filter(t => {
        if (!t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        return completedDate >= weekStart;
    }).length;

    // Project progress
    const projectProgress = projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const completed = projectTasks.filter(t => t.completed).length;
        return {
            id: p.id,
            name: p.name,
            total: projectTasks.length,
            completed,
            progress: projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0
        };
    });

    return {
        tasks: {
            total: tasks.length,
            completed: completedTasks,
            pending: pendingTasks,
            overdue: overdueTasks,
            completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
        },
        today: {
            tasks: todayTasks.length,
            events: todayEvents.length,
            pending: todayTasks.filter(t => !t.completed).length
        },
        week: {
            completed: thisWeekCompleted,
            target: 20, // Mục tiêu tuần
            progress: Math.min(100, Math.round((thisWeekCompleted / 20) * 100))
        },
        projects: projectProgress,
        todos: {
            total: todos.length,
            completed: todos.filter(t => t.completed).length
        }
    };
}

// ============================================================
// #62 - BIỂU ĐỒ COMPLETION RATE (Completion Rate Charts)
// Dữ liệu cho biểu đồ tỉ lệ hoàn thành
// ============================================================
export function getCompletionRateData(period = 'week') {
    const tasks = globalData?.tasks || [];
    const data = [];
    const now = new Date();

    let days = period === 'week' ? 7 : period === 'month' ? 30 : 90;

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();

        const created = tasks.filter(t => {
            if (!t.createdAt) return false;
            return new Date(t.createdAt).toDateString() === dateStr;
        }).length;

        const completed = tasks.filter(t => {
            if (!t.completedAt) return false;
            return new Date(t.completedAt).toDateString() === dateStr;
        }).length;

        data.push({
            date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            created,
            completed,
            net: completed - created
        });
    }

    return {
        period,
        data,
        summary: {
            totalCreated: data.reduce((sum, d) => sum + d.created, 0),
            totalCompleted: data.reduce((sum, d) => sum + d.completed, 0)
        }
    };
}

// ============================================================
// #63 - PHÂN TÍCH THEO CATEGORY (Category Analysis)
// Phân tích chi tiết theo từng category
// ============================================================
export function getCategoryAnalysis() {
    const tasks = globalData?.tasks || [];
    const categories = {};

    for (const task of tasks) {
        const cat = task.category || 'Khác';
        if (!categories[cat]) {
            categories[cat] = {
                name: cat,
                total: 0,
                completed: 0,
                overdue: 0,
                avgDuration: 0,
                durations: [],
                priorities: { high: 0, medium: 0, low: 0 }
            };
        }

        categories[cat].total++;
        if (task.completed) categories[cat].completed++;
        if (task.duration) categories[cat].durations.push(task.duration);
        if (task.priority) categories[cat].priorities[task.priority]++;

        if (!task.completed && task.deadline && new Date(task.deadline) < new Date()) {
            categories[cat].overdue++;
        }
    }

    // Calculate averages and rates
    const result = Object.values(categories).map(cat => ({
        ...cat,
        completionRate: cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0,
        avgDuration: cat.durations.length > 0
            ? Math.round(cat.durations.reduce((a, b) => a + b, 0) / cat.durations.length)
            : null,
        durations: undefined // Remove raw data
    }));

    // Sort by total
    result.sort((a, b) => b.total - a.total);

    return result;
}

// ============================================================
// #64 - TIME TRACKING ANALYTICS (Phân tích thời gian)
// Thống kê thời gian làm việc
// ============================================================
export function getTimeAnalytics() {
    const tasks = globalData?.tasks || [];
    const completedWithDuration = tasks.filter(t => t.completed && t.duration);

    if (completedWithDuration.length < 5) {
        return {
            hasEnoughData: false,
            message: 'Cần ít nhất 5 task có duration để phân tích'
        };
    }

    const durations = completedWithDuration.map(t => t.duration);
    const totalMinutes = durations.reduce((a, b) => a + b, 0);
    const avgMinutes = Math.round(totalMinutes / durations.length);

    // Group by time of day
    const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const task of completedWithDuration) {
        if (!task.completedAt) continue;
        const hour = new Date(task.completedAt).getHours();
        if (hour >= 5 && hour < 12) timeOfDay.morning++;
        else if (hour >= 12 && hour < 17) timeOfDay.afternoon++;
        else if (hour >= 17 && hour < 21) timeOfDay.evening++;
        else timeOfDay.night++;
    }

    // Most productive time
    const maxTime = Math.max(...Object.values(timeOfDay));
    const mostProductiveTime = Object.entries(timeOfDay).find(([_, v]) => v === maxTime)?.[0];

    const timeLabels = {
        morning: 'Buổi sáng (5h-12h)',
        afternoon: 'Buổi chiều (12h-17h)',
        evening: 'Buổi tối (17h-21h)',
        night: 'Đêm khuya (21h-5h)'
    };

    return {
        hasEnoughData: true,
        totalTasks: completedWithDuration.length,
        totalMinutes,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        avgMinutesPerTask: avgMinutes,
        timeOfDay,
        mostProductiveTime: timeLabels[mostProductiveTime] || mostProductiveTime,
        insight: `Bạn làm việc hiệu quả nhất vào ${timeLabels[mostProductiveTime] || mostProductiveTime}`
    };
}

// ============================================================
// #65 - PRIORITY DISTRIBUTION (Phân bố ưu tiên)
// Phân tích phân bố priority
// ============================================================
export function getPriorityDistribution() {
    const tasks = globalData?.tasks || [];

    const distribution = {
        high: { total: 0, completed: 0, pending: 0, overdue: 0 },
        medium: { total: 0, completed: 0, pending: 0, overdue: 0 },
        low: { total: 0, completed: 0, pending: 0, overdue: 0 }
    };

    const now = new Date();

    for (const task of tasks) {
        const priority = task.priority || 'medium';
        if (!distribution[priority]) continue;

        distribution[priority].total++;

        if (task.completed) {
            distribution[priority].completed++;
        } else {
            distribution[priority].pending++;
            if (task.deadline && new Date(task.deadline) < now) {
                distribution[priority].overdue++;
            }
        }
    }

    // Calculate completion rates
    for (const priority of Object.keys(distribution)) {
        const d = distribution[priority];
        d.completionRate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
    }

    // Health check
    let health = 'good';
    if (distribution.high.overdue > 0) health = 'warning';
    if (distribution.high.overdue > 3) health = 'critical';

    return {
        distribution,
        total: tasks.length,
        health,
        insights: [
            distribution.high.overdue > 0
                ? `⚠️ ${distribution.high.overdue} task ưu tiên cao đang quá hạn`
                : '✅ Không có task quan trọng quá hạn',
            `Tỉ lệ hoàn thành task cao: ${distribution.high.completionRate}%`
        ]
    };
}

// ============================================================
// #66 - DEADLINE ANALYTICS (Phân tích deadline)
// Thống kê về deadline và on-time rate
// ============================================================
export function getDeadlineAnalytics() {
    const tasks = globalData?.tasks || [];
    const tasksWithDeadline = tasks.filter(t => t.deadline);

    if (tasksWithDeadline.length < 5) {
        return { hasEnoughData: false, message: 'Cần ít nhất 5 task có deadline' };
    }

    let onTime = 0;
    let late = 0;
    let pending = 0;
    const lateAmount = []; // Days late

    for (const task of tasksWithDeadline) {
        const deadline = new Date(task.deadline);

        if (!task.completed) {
            if (deadline < new Date()) {
                late++;
                const daysLate = Math.ceil((new Date() - deadline) / (1000 * 60 * 60 * 24));
                lateAmount.push(daysLate);
            } else {
                pending++;
            }
        } else if (task.completedAt) {
            const completedDate = new Date(task.completedAt);
            if (completedDate <= deadline) {
                onTime++;
            } else {
                late++;
                const daysLate = Math.ceil((completedDate - deadline) / (1000 * 60 * 60 * 24));
                lateAmount.push(daysLate);
            }
        }
    }

    const avgDaysLate = lateAmount.length > 0
        ? Math.round(lateAmount.reduce((a, b) => a + b, 0) / lateAmount.length)
        : 0;

    return {
        hasEnoughData: true,
        total: tasksWithDeadline.length,
        onTime,
        late,
        pending,
        onTimeRate: Math.round((onTime / (onTime + late)) * 100) || 0,
        avgDaysLate,
        insight: late > onTime
            ? '⚠️ Bạn thường xuyên trễ deadline. Cân nhắc để buffer time.'
            : '✅ Bạn hoàn thành đúng hạn tốt!'
    };
}

// ============================================================
// #67 - PROJECT ANALYTICS (Phân tích dự án)
// Thống kê chi tiết từng dự án
// ============================================================
export function getProjectAnalytics(projectId = null) {
    const tasks = globalData?.tasks || [];
    const projects = globalData?.projects || [];

    if (projectId) {
        // Single project analysis
        const project = projects.find(p => p.id === projectId);
        if (!project) return null;

        const projectTasks = tasks.filter(t => t.projectId === projectId);
        const completed = projectTasks.filter(t => t.completed);
        const pending = projectTasks.filter(t => !t.completed);
        const overdue = pending.filter(t => t.deadline && new Date(t.deadline) < new Date());

        return {
            project: project.name,
            tasks: {
                total: projectTasks.length,
                completed: completed.length,
                pending: pending.length,
                overdue: overdue.length
            },
            progress: projectTasks.length > 0
                ? Math.round((completed.length / projectTasks.length) * 100)
                : 0,
            velocity: calculateVelocity(projectTasks),
            estimatedCompletion: estimateProjectCompletion(projectTasks)
        };
    }

    // All projects summary
    return projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const completed = projectTasks.filter(t => t.completed).length;

        return {
            id: p.id,
            name: p.name,
            total: projectTasks.length,
            completed,
            progress: projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0,
            status: p.status || 'active'
        };
    });
}

function calculateVelocity(tasks) {
    const completed = tasks.filter(t => t.completed && t.completedAt);
    if (completed.length < 3) return null;

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const lastWeekCompleted = completed.filter(t => new Date(t.completedAt) >= weekAgo);
    return lastWeekCompleted.length; // Tasks/week
}

function estimateProjectCompletion(tasks) {
    const pending = tasks.filter(t => !t.completed).length;
    const velocity = calculateVelocity(tasks);

    if (!velocity || velocity === 0) return null;

    const weeksNeeded = Math.ceil(pending / velocity);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + weeksNeeded * 7);

    return {
        weeksNeeded,
        estimatedDate: estimatedDate.toLocaleDateString('vi-VN')
    };
}

// ============================================================
// #68 - EXPORT DATA (Xuất dữ liệu)
// Xuất dữ liệu ra các format khác nhau
// ============================================================
export function exportData(type = 'tasks', format = 'json') {
    let data;
    let filename;

    switch (type) {
        case 'tasks':
            data = globalData?.tasks || [];
            filename = 'tasks_export';
            break;
        case 'analytics':
            data = {
                dashboard: getDashboardStats(),
                categories: getCategoryAnalysis(),
                priorities: getPriorityDistribution(),
                time: getTimeAnalytics(),
                deadlines: getDeadlineAnalytics()
            };
            filename = 'analytics_export';
            break;
        case 'all':
            data = globalData;
            filename = 'full_backup';
            break;
        default:
            data = globalData?.[type] || [];
            filename = `${type}_export`;
    }

    if (format === 'json') {
        return {
            content: JSON.stringify(data, null, 2),
            filename: `${filename}_${new Date().toISOString().split('T')[0]}.json`,
            mimeType: 'application/json'
        };
    }

    if (format === 'csv' && Array.isArray(data)) {
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(item => Object.values(item).map(v =>
            typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
        ).join(','));

        return {
            content: [headers, ...rows].join('\n'),
            filename: `${filename}_${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv'
        };
    }

    return null;
}

// ============================================================
// #69 - COMPARISON ANALYTICS (So sánh giai đoạn)
// So sánh hiệu suất giữa các giai đoạn
// ============================================================
export function comparePeriodsAnalytics(period1Days = 7, period2Days = 7) {
    const tasks = globalData?.tasks || [];
    const now = new Date();

    // Period 1: Most recent
    const p1End = now;
    const p1Start = new Date(now);
    p1Start.setDate(p1Start.getDate() - period1Days);

    // Period 2: Before period 1
    const p2End = new Date(p1Start);
    const p2Start = new Date(p2End);
    p2Start.setDate(p2Start.getDate() - period2Days);

    const getStats = (start, end) => {
        const periodTasks = tasks.filter(t => {
            if (!t.completedAt) return false;
            const date = new Date(t.completedAt);
            return date >= start && date <= end;
        });

        return {
            completed: periodTasks.length,
            avgDuration: periodTasks.length > 0
                ? Math.round(periodTasks.reduce((sum, t) => sum + (t.duration || 30), 0) / periodTasks.length)
                : 0
        };
    };

    const p1Stats = getStats(p1Start, p1End);
    const p2Stats = getStats(p2Start, p2End);

    const change = p2Stats.completed > 0
        ? Math.round(((p1Stats.completed - p2Stats.completed) / p2Stats.completed) * 100)
        : 0;

    return {
        period1: {
            label: `${period1Days} ngày gần nhất`,
            start: p1Start.toLocaleDateString('vi-VN'),
            end: p1End.toLocaleDateString('vi-VN'),
            ...p1Stats
        },
        period2: {
            label: `${period2Days} ngày trước đó`,
            start: p2Start.toLocaleDateString('vi-VN'),
            end: p2End.toLocaleDateString('vi-VN'),
            ...p2Stats
        },
        change,
        trend: change > 10 ? 'improving' : change < -10 ? 'declining' : 'stable',
        message: change > 10
            ? `📈 Tăng ${change}% so với giai đoạn trước!`
            : change < -10
                ? `📉 Giảm ${Math.abs(change)}% so với giai đoạn trước`
                : '📊 Hiệu suất ổn định'
    };
}

// ============================================================
// #70 - COMPREHENSIVE REPORT (Báo cáo tổng hợp)
// Tạo báo cáo toàn diện
// ============================================================
export function generateComprehensiveDataReport() {
    const dashboardStats = getDashboardStats();
    const categoryAnalysis = getCategoryAnalysis();
    const priorityDist = getPriorityDistribution();
    const timeAnalytics = getTimeAnalytics();
    const deadlineAnalytics = getDeadlineAnalytics();
    const comparison = comparePeriodsAnalytics();
    const productivityScore = calculateProductivityScore();
    const weeklyReview = generateWeeklyReview();

    return {
        generatedAt: new Date().toISOString(),
        summary: {
            totalTasks: dashboardStats.tasks.total,
            completionRate: dashboardStats.tasks.completionRate,
            productivityScore: productivityScore.score,
            productivityGrade: productivityScore.grade
        },
        sections: {
            dashboard: dashboardStats,
            categories: categoryAnalysis,
            priorities: priorityDist,
            time: timeAnalytics.hasEnoughData ? timeAnalytics : null,
            deadlines: deadlineAnalytics.hasEnoughData ? deadlineAnalytics : null,
            comparison,
            weeklyReview
        },
        insights: [
            dashboardStats.tasks.overdue > 0
                ? `⚠️ ${dashboardStats.tasks.overdue} task đang quá hạn`
                : '✅ Không có task quá hạn',
            comparison.message,
            `🏆 Điểm năng suất: ${productivityScore.score}/100 (${productivityScore.grade})`
        ]
    };
}

