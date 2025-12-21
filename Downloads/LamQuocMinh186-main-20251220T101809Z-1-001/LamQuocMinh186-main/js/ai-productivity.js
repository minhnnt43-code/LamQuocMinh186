// ============================================================
// FILE: js/ai-productivity.js
// Mục đích: Phase 4 - Nhóm 4: Năng suất (10 tính năng)
// ============================================================

import { showNotification } from './common.js';
import { contextMemory } from './ai-core-engine.js';
import { analyzeCompletionPatterns, analyzeCapacity } from './ai-task-analytics.js';

// Cấu hình API
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

let globalData = null;
let currentUser = null;

// Focus session tracking
let focusSession = null;
let focusTimer = null;

/**
 * Khởi tạo module
 */
export function initProductivity(data, user) {
    globalData = data;
    currentUser = user;
    loadProductivityData();
    console.log('✅ AI Productivity (Phase 4) đã sẵn sàng');
}

// ============================================================
// #31 - POMODORO THÔNG MINH (Smart Pomodoro)
// Pomodoro tự điều chỉnh dựa trên patterns
// ============================================================
let pomodoroSettings = {
    workDuration: 25,   // phút
    shortBreak: 5,
    longBreak: 15,
    sessionsBeforeLong: 4,
    currentSession: 0
};

export function getSmartPomodoroSettings() {
    const patterns = analyzeCompletionPatterns();

    // Điều chỉnh dựa trên patterns
    if (patterns.hasEnoughData) {
        // Nếu thường hoàn thành task vào buổi sáng -> tăng work duration
        const currentHour = new Date().getHours();
        if (patterns.bestHour && parseInt(patterns.bestHour) <= 12) {
            if (currentHour >= 6 && currentHour <= 12) {
                pomodoroSettings.workDuration = 35; // Tăng lên 35 phút
            }
        }
    }

    return pomodoroSettings;
}

export function startPomodoro(taskId = null) {
    const settings = getSmartPomodoroSettings();

    focusSession = {
        type: 'work',
        taskId,
        startTime: new Date(),
        duration: settings.workDuration,
        sessionNumber: pomodoroSettings.currentSession + 1
    };

    return {
        message: `Bắt đầu Pomodoro ${focusSession.sessionNumber} (${settings.workDuration} phút)`,
        duration: settings.workDuration,
        endTime: new Date(Date.now() + settings.workDuration * 60 * 1000)
    };
}

export function endPomodoro(completed = true) {
    if (!focusSession) return null;

    const result = {
        completed,
        duration: focusSession.duration,
        sessionNumber: focusSession.sessionNumber
    };

    if (completed) {
        pomodoroSettings.currentSession++;

        // Determine break type
        if (pomodoroSettings.currentSession % pomodoroSettings.sessionsBeforeLong === 0) {
            result.breakType = 'long';
            result.breakDuration = pomodoroSettings.longBreak;
            result.message = `🎉 Hoàn thành ${pomodoroSettings.sessionsBeforeLong} sessions! Nghỉ dài ${pomodoroSettings.longBreak} phút`;
        } else {
            result.breakType = 'short';
            result.breakDuration = pomodoroSettings.shortBreak;
            result.message = `✅ Hoàn thành session! Nghỉ ngắn ${pomodoroSettings.shortBreak} phút`;
        }
    }

    focusSession = null;
    return result;
}

// ============================================================
// #32 - FOCUS MODE (Chế độ tập trung)
// Tự động detect và suggest focus time
// ============================================================
let focusModeActive = false;
let distractionLog = [];

export function startFocusMode(durationMinutes = 60) {
    focusModeActive = true;
    distractionLog = [];

    return {
        active: true,
        startTime: new Date(),
        duration: durationMinutes,
        endTime: new Date(Date.now() + durationMinutes * 60 * 1000),
        message: `🎯 Focus Mode bật trong ${durationMinutes} phút`
    };
}

export function endFocusMode() {
    const result = {
        active: false,
        distractions: distractionLog.length,
        message: `Focus Mode kết thúc. ${distractionLog.length} lần xao nhãng được ghi nhận.`
    };

    focusModeActive = false;
    distractionLog = [];

    return result;
}

export function logDistraction(type = 'general') {
    if (focusModeActive) {
        distractionLog.push({
            time: new Date(),
            type
        });
    }
}

export function getFocusSuggestion() {
    const patterns = analyzeCompletionPatterns();
    const currentHour = new Date().getHours();

    let suggestion = {
        recommended: true,
        optimalDuration: 60,
        reason: ''
    };

    if (patterns.hasEnoughData) {
        const bestHour = parseInt(patterns.bestHour);
        if (Math.abs(currentHour - bestHour) <= 2) {
            suggestion.optimalDuration = 90;
            suggestion.reason = `Đây là khung giờ hiệu quả nhất của bạn (${patterns.bestHour})`;
        } else if (currentHour >= 12 && currentHour <= 14) {
            suggestion.optimalDuration = 30;
            suggestion.reason = 'Sau giờ ăn trưa, nên focus ngắn hơn';
        } else if (currentHour >= 21) {
            suggestion.optimalDuration = 45;
            suggestion.reason = 'Buổi tối nên focus vừa phải';
        }
    }

    return suggestion;
}

// ============================================================
// #33 - DAILY GOALS (Mục tiêu hàng ngày)
// Tự động đề xuất daily goals
// ============================================================
export function suggestDailyGoals() {
    const tasks = globalData?.tasks || [];
    const pendingTasks = tasks.filter(t => !t.completed);
    const today = new Date().toDateString();

    const goals = [];

    // 1. Tasks có deadline hôm nay
    const todayDeadline = pendingTasks.filter(t => {
        if (!t.deadline) return false;
        return new Date(t.deadline).toDateString() === today;
    });

    if (todayDeadline.length > 0) {
        goals.push({
            type: 'deadline',
            priority: 'must',
            title: `Hoàn thành ${todayDeadline.length} task có deadline hôm nay`,
            tasks: todayDeadline.map(t => ({ id: t.id, title: t.title }))
        });
    }

    // 2. High priority tasks
    const highPriority = pendingTasks.filter(t => t.priority === 'high').slice(0, 3);
    if (highPriority.length > 0) {
        goals.push({
            type: 'priority',
            priority: 'should',
            title: `Xử lý ${highPriority.length} task ưu tiên cao`,
            tasks: highPriority.map(t => ({ id: t.id, title: t.title }))
        });
    }

    // 3. Quick wins (tasks < 15 phút)
    const quickWins = pendingTasks.filter(t => {
        const est = t.estimatedDuration || 30;
        return est <= 15;
    }).slice(0, 3);

    if (quickWins.length > 0) {
        goals.push({
            type: 'quick_wins',
            priority: 'could',
            title: `Dọn dẹp ${quickWins.length} task nhỏ`,
            tasks: quickWins.map(t => ({ id: t.id, title: t.title }))
        });
    }

    // Tính ideal count
    const capacity = analyzeCapacity();
    const idealCount = capacity.status === 'overloaded' ? 3 :
        capacity.status === 'busy' ? 5 : 7;

    return {
        goals,
        idealTaskCount: idealCount,
        capacityStatus: capacity.status,
        message: `Đề xuất hoàn thành ${idealCount} task hôm nay`
    };
}

// ============================================================
// #34 - STREAK TRACKING (Theo dõi chuỗi)
// Theo dõi streak hoàn thành task
// ============================================================
function loadProductivityData() {
    try {
        const saved = localStorage.getItem('productivity_data');
        if (saved) {
            const data = JSON.parse(saved);
            return data;
        }
    } catch (e) {
        console.error('Lỗi load productivity data:', e);
    }
    return { streaks: {}, lastActiveDate: null };
}

function saveProductivityData(data) {
    localStorage.setItem('productivity_data', JSON.stringify(data));
}

export function updateStreak() {
    const data = loadProductivityData();
    const today = new Date().toDateString();

    if (data.lastActiveDate === today) {
        // Đã update hôm nay
        return data.streaks;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (data.lastActiveDate === yesterday.toDateString()) {
        // Tiếp tục streak
        data.streaks.current = (data.streaks.current || 0) + 1;
        data.streaks.best = Math.max(data.streaks.best || 0, data.streaks.current);
    } else if (data.lastActiveDate !== today) {
        // Reset streak
        data.streaks.current = 1;
    }

    data.lastActiveDate = today;
    saveProductivityData(data);

    return data.streaks;
}

export function getStreakInfo() {
    const data = loadProductivityData();
    const streak = data.streaks || { current: 0, best: 0 };

    let message = '';
    if (streak.current >= 7) {
        message = `🔥 Chuỗi ${streak.current} ngày! Tuyệt vời!`;
    } else if (streak.current >= 3) {
        message = `🌟 ${streak.current} ngày liên tiếp hoạt động`;
    } else {
        message = `Bắt đầu streak của bạn!`;
    }

    return {
        current: streak.current,
        best: streak.best,
        message
    };
}

// ============================================================
// #35 - ENERGY TRACKING (Theo dõi năng lượng)
// Gợi ý task dựa trên mức năng lượng
// ============================================================
export function getTasksForEnergyLevel(level = 'medium') {
    const tasks = globalData?.tasks || [];
    const pendingTasks = tasks.filter(t => !t.completed);

    let filteredTasks = [];
    let message = '';

    switch (level) {
        case 'high':
            // Năng lượng cao -> tasks khó, quan trọng
            filteredTasks = pendingTasks.filter(t =>
                t.priority === 'high' ||
                (t.deadline && new Date(t.deadline) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))
            );
            message = '💪 Năng lượng cao - Làm tasks quan trọng!';
            break;

        case 'low':
            // Năng lượng thấp -> tasks nhẹ nhàng
            filteredTasks = pendingTasks.filter(t =>
                t.priority === 'low' ||
                (t.estimatedDuration && t.estimatedDuration <= 15) ||
                t.category === 'Cá nhân'
            );
            message = '😌 Năng lượng thấp - Làm tasks nhẹ nhàng';
            break;

        default:
            // Medium -> tasks bình thường
            filteredTasks = pendingTasks.filter(t => t.priority === 'medium');
            message = '⚡ Năng lượng bình thường - Tasks tiêu chuẩn';
    }

    return {
        level,
        message,
        suggestedTasks: filteredTasks.slice(0, 5).map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            category: t.category
        })),
        totalMatching: filteredTasks.length
    };
}

// ============================================================
// #36 - WEEKLY REVIEW (Đánh giá tuần)
// Tự động tạo weekly review
// ============================================================
export function generateWeeklyReview() {
    const tasks = globalData?.tasks || [];
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Tasks hoàn thành trong tuần
    const completedThisWeek = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        return completedDate >= weekAgo && completedDate <= now;
    });

    // Tasks tạo trong tuần
    const createdThisWeek = tasks.filter(t => {
        if (!t.createdAt) return false;
        const createdDate = new Date(t.createdAt);
        return createdDate >= weekAgo && createdDate <= now;
    });

    // Thống kê theo category
    const categoryStats = {};
    for (const task of completedThisWeek) {
        const cat = task.category || 'Khác';
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    }

    // Top category
    let topCategory = 'Không có';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryStats)) {
        if (count > maxCount) {
            maxCount = count;
            topCategory = cat;
        }
    }

    const streak = getStreakInfo();
    const completion = createdThisWeek.length > 0
        ? Math.round((completedThisWeek.length / createdThisWeek.length) * 100)
        : 0;

    return {
        period: {
            start: weekAgo.toLocaleDateString('vi-VN'),
            end: now.toLocaleDateString('vi-VN')
        },
        stats: {
            tasksCompleted: completedThisWeek.length,
            tasksCreated: createdThisWeek.length,
            completionRate: completion,
            topCategory,
            categoryStats
        },
        streak: streak,
        highlights: completedThisWeek
            .filter(t => t.priority === 'high')
            .slice(0, 3)
            .map(t => t.title),
        score: Math.min(100, completedThisWeek.length * 10 + (streak.current * 5))
    };
}

// ============================================================
// #37 - PROCRASTINATION DETECTOR (Phát hiện trì hoãn)
// Phát hiện và cảnh báo trì hoãn
// ============================================================
export function detectProcrastination() {
    const tasks = globalData?.tasks || [];
    const pendingTasks = tasks.filter(t => !t.completed);
    const warnings = [];

    for (const task of pendingTasks) {
        if (!task.createdAt) continue;

        const createdDate = new Date(task.createdAt);
        const daysSinceCreated = Math.ceil((new Date() - createdDate) / (1000 * 60 * 60 * 24));

        // Task quá 7 ngày chưa hoàn thành
        if (daysSinceCreated > 7) {
            warnings.push({
                taskId: task.id,
                title: task.title,
                daysOld: daysSinceCreated,
                severity: daysSinceCreated > 14 ? 'high' : 'medium',
                suggestion: daysSinceCreated > 14
                    ? 'Xem xét xóa hoặc chia nhỏ task này'
                    : 'Đặt lịch cụ thể để hoàn thành'
            });
        }

        // Task đã chỉnh sửa nhiều lần nhưng chưa done
        if (task.editCount && task.editCount > 5) {
            warnings.push({
                taskId: task.id,
                title: task.title,
                editCount: task.editCount,
                severity: 'medium',
                suggestion: 'Task có vẻ khó xác định. Thử chia nhỏ hơn.'
            });
        }
    }

    return {
        hasProcrastination: warnings.length > 0,
        warnings: warnings.sort((a, b) => b.daysOld - a.daysOld),
        message: warnings.length > 0
            ? `⚠️ ${warnings.length} task có dấu hiệu trì hoãn`
            : '✅ Không có dấu hiệu trì hoãn'
    };
}

// ============================================================
// #38 - MOTIVATION BOOSTER (Tăng động lực)
// Gợi ý để tăng động lực
// ============================================================
export function getMotivationBoost() {
    const streak = getStreakInfo();
    const review = generateWeeklyReview();
    const messages = [];

    // Streak encouragement
    if (streak.current >= 7) {
        messages.push({
            type: 'streak',
            emoji: '🔥',
            message: `${streak.current} ngày streak! Bạn đang làm rất tốt!`
        });
    } else if (streak.current > 0) {
        messages.push({
            type: 'streak',
            emoji: '⭐',
            message: `Tiếp tục ${streak.current + 1} ngày để tạo thói quen!`
        });
    }

    // Weekly progress
    if (review.stats.tasksCompleted > 10) {
        messages.push({
            type: 'achievement',
            emoji: '🏆',
            message: `Wow! ${review.stats.tasksCompleted} task hoàn thành tuần này!`
        });
    }

    // Quick win suggestion
    const tasks = globalData?.tasks || [];
    const quickTask = tasks.find(t => !t.completed && t.priority === 'low');
    if (quickTask) {
        messages.push({
            type: 'quick_win',
            emoji: '🎯',
            message: `Bắt đầu với task nhỏ: "${quickTask.title}"`
        });
    }

    // Random motivation
    const motivationalQuotes = [
        'Tiến bộ nhỏ mỗi ngày tạo nên thành công lớn! 💪',
        'Bạn không cần phải hoàn hảo, chỉ cần bắt đầu! 🚀',
        'Mỗi task hoàn thành là một bước tiến! 📈',
        'Hãy tự hào về những gì bạn đã làm được! 🌟'
    ];

    messages.push({
        type: 'quote',
        emoji: '💬',
        message: motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
    });

    return {
        messages,
        currentStreak: streak.current,
        weeklyScore: review.score
    };
}

// ============================================================
// #39 - WORK-LIFE BALANCE CHECK
// Kiểm tra cân bằng công việc/cuộc sống
// ============================================================
export function checkWorkLifeBalance() {
    const tasks = globalData?.tasks || [];
    const recentTasks = tasks.filter(t => {
        if (!t.createdAt) return false;
        const daysSince = (new Date() - new Date(t.createdAt)) / (1000 * 60 * 60 * 24);
        return daysSince <= 14;
    });

    const categoryCount = {};
    for (const task of recentTasks) {
        const cat = task.category || 'Khác';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }

    const total = recentTasks.length || 1;
    const workPercent = Math.round(((categoryCount['Công việc'] || 0) / total) * 100);
    const personalPercent = Math.round(((categoryCount['Cá nhân'] || 0) / total) * 100);

    let status = 'balanced';
    let message = '';
    let suggestion = '';

    if (workPercent > 70) {
        status = 'work_heavy';
        message = '⚠️ Bạn đang làm việc quá nhiều';
        suggestion = 'Thêm một số hoạt động cá nhân vào lịch';
    } else if (personalPercent > 70) {
        status = 'personal_heavy';
        message = '💡 Cân nhắc thêm tasks công việc';
        suggestion = 'Đặt mục tiêu công việc cho tuần tới';
    } else {
        message = '✅ Cân bằng tốt!';
        suggestion = 'Tiếp tục duy trì';
    }

    return {
        status,
        message,
        suggestion,
        breakdown: categoryCount,
        workPercent,
        personalPercent
    };
}

// ============================================================
// #40 - PRODUCTIVITY SCORE (Điểm năng suất)
// Tính toán điểm năng suất tổng hợp
// ============================================================
export function calculateProductivityScore() {
    const streak = getStreakInfo();
    const review = generateWeeklyReview();
    const balance = checkWorkLifeBalance();
    const procrastination = detectProcrastination();
    const capacity = analyzeCapacity();

    let score = 50; // Base score
    const factors = [];

    // Streak bonus (max 20)
    const streakBonus = Math.min(20, streak.current * 2);
    score += streakBonus;
    if (streakBonus > 0) factors.push(`Streak: +${streakBonus}`);

    // Completion rate (max 20)
    const completionBonus = Math.round((review.stats.completionRate / 100) * 20);
    score += completionBonus;
    factors.push(`Completion rate: +${completionBonus}`);

    // Balance (max 10)
    if (balance.status === 'balanced') {
        score += 10;
        factors.push('Work-life balance: +10');
    }

    // Procrastination penalty
    const procrastinationPenalty = Math.min(15, procrastination.warnings.length * 3);
    score -= procrastinationPenalty;
    if (procrastinationPenalty > 0) factors.push(`Trì hoãn: -${procrastinationPenalty}`);

    // Capacity utilization
    if (capacity.utilizationPercent >= 50 && capacity.utilizationPercent <= 80) {
        score += 10;
        factors.push('Workload hợp lý: +10');
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine grade
    let grade = 'C';
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B+';
    else if (score >= 60) grade = 'B';
    else if (score >= 50) grade = 'C+';

    return {
        score,
        grade,
        factors,
        message: `Điểm năng suất: ${score}/100 (${grade})`,
        breakdown: {
            streak: streak.current,
            completionRate: review.stats.completionRate,
            balanceStatus: balance.status,
            procrastinationCount: procrastination.warnings.length
        }
    };
}

