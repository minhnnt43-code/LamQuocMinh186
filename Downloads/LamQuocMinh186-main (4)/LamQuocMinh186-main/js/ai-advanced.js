// ============================================================
// FILE: js/ai-advanced.js
// Mục đích: Phase 8 - Nhóm 10: Tính năng Nâng cao (10 tính năng)
// ============================================================

import { showNotification, generateID } from './common.js';
import { saveUserData } from './firebase.js';
import { contextMemory, analyzeWithAI } from './ai-core-engine.js';
import { calculateProductivityScore } from './ai-productivity.js';
import { getDashboardStats } from './ai-data-analytics.js';

// Cấu hình API
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

let globalData = null;
let currentUser = null;

/**
 * Khởi tạo module
 */
export function initAdvancedAI(data, user) {
    globalData = data;
    currentUser = user;
    console.log('✅ AI Advanced Features (Phase 8) đã sẵn sàng');
}

// ============================================================
// #91 - TRỢ LÝ ẢO THÔNG MINH (Smart Virtual Assistant)
// Trò chuyện tự nhiên với trợ lý
// ============================================================
export async function chatWithAssistant(message, conversationHistory = []) {
    const stats = getDashboardStats();
    const productivity = calculateProductivityScore();

    const systemPrompt = `Bạn là "Trợ lý Thông minh" - trợ lý cá nhân cho người dùng Việt Nam.

CONTEXT HIỆN TẠI:
- Số task đang pending: ${stats.tasks.pending}
- Task quá hạn: ${stats.tasks.overdue}
- Điểm năng suất: ${productivity.score}/100 (${productivity.grade})
- Task hôm nay: ${stats.today.tasks}

PHONG CÁCH:
- Thân thiện, gọi người dùng là "bạn"
- Ngắn gọn, đi thẳng vào trọng tâm
- Chủ động đề xuất giải pháp
- Dùng emoji phù hợp

KHẢ NĂNG:
- Trả lời câu hỏi về công việc, lịch trình
- Gợi ý cách tối ưu năng suất
- Hỗ trợ lập kế hoạch
- Động viên và tạo động lực`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // Keep last 10 messages
        { role: 'user', content: message }
    ];

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages,
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        const reply = data.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.';

        return {
            reply,
            context: {
                pendingTasks: stats.tasks.pending,
                productivityScore: productivity.score
            }
        };
    } catch (e) {
        console.error('Lỗi chat:', e);
        return {
            reply: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại!',
            error: e.message
        };
    }
}

// ============================================================
// #92 - GỢI Ý THÔNG MINH PROACTIVE (Proactive Suggestions)
// Chủ động đề xuất dựa trên context
// ============================================================
export function getProactiveSuggestions() {
    const stats = getDashboardStats();
    const suggestions = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Morning suggestions
    if (currentHour >= 7 && currentHour <= 9) {
        suggestions.push({
            type: 'morning',
            icon: '🌅',
            title: 'Chào buổi sáng!',
            message: `Bạn có ${stats.today.tasks} task hôm nay. Hãy bắt đầu với task quan trọng nhất!`,
            action: 'view_today_tasks'
        });
    }

    // Overdue alert
    if (stats.tasks.overdue > 0) {
        suggestions.push({
            type: 'overdue',
            icon: '⚠️',
            title: 'Tasks quá hạn',
            message: `${stats.tasks.overdue} task đang quá hạn. Cần xử lý ngay!`,
            action: 'view_overdue',
            priority: 'high'
        });
    }

    // End of day review
    if (currentHour >= 17 && currentHour <= 19) {
        suggestions.push({
            type: 'evening',
            icon: '📋',
            title: 'Daily Review',
            message: 'Đã cuối ngày, hãy review những gì đã làm được và lập kế hoạch cho ngày mai!',
            action: 'daily_review'
        });
    }

    // Low productivity warning
    const productivity = calculateProductivityScore();
    if (productivity.score < 40) {
        suggestions.push({
            type: 'productivity',
            icon: '💪',
            title: 'Tăng năng suất',
            message: `Điểm năng suất đang thấp (${productivity.score}). Thử hoàn thành 1 task nhỏ để lấy đà!`,
            action: 'quick_task'
        });
    }

    // Weekend suggestion
    if (now.getDay() === 0 || now.getDay() === 6) {
        suggestions.push({
            type: 'weekend',
            icon: '🌴',
            title: 'Cuối tuần rồi!',
            message: 'Hãy dành thời gian nghỉ ngơi và tái tạo năng lượng cho tuần mới!',
            action: null
        });
    }

    return suggestions.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });
}

// ============================================================
// #93 - LEARNING & ADAPTATION (Học và thích nghi)
// Học từ hành vi người dùng
// ============================================================
let userBehaviorLog = [];

export function logUserBehavior(action, data = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        action,
        data,
        hour: new Date().getHours(),
        dayOfWeek: new Date().getDay()
    };

    userBehaviorLog.push(entry);

    // Keep last 500 entries
    if (userBehaviorLog.length > 500) {
        userBehaviorLog = userBehaviorLog.slice(-500);
    }

    saveUserBehavior();
}

function saveUserBehavior() {
    localStorage.setItem('user_behavior_log', JSON.stringify(userBehaviorLog));
}

function loadUserBehavior() {
    try {
        const saved = localStorage.getItem('user_behavior_log');
        if (saved) userBehaviorLog = JSON.parse(saved);
    } catch (e) { }
}

export function analyzeUserBehavior() {
    loadUserBehavior();

    if (userBehaviorLog.length < 20) {
        return { hasEnoughData: false, message: 'Cần thêm dữ liệu hành vi' };
    }

    // Analyze by hour
    const hourlyActivity = {};
    for (let i = 0; i < 24; i++) hourlyActivity[i] = 0;

    for (const entry of userBehaviorLog) {
        hourlyActivity[entry.hour]++;
    }

    // Find peak hours
    const peakHours = Object.entries(hourlyActivity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

    // Analyze actions
    const actionFrequency = {};
    for (const entry of userBehaviorLog) {
        actionFrequency[entry.action] = (actionFrequency[entry.action] || 0) + 1;
    }

    const topActions = Object.entries(actionFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

    return {
        hasEnoughData: true,
        totalActions: userBehaviorLog.length,
        peakHours,
        topActions,
        recommendation: `Bạn hoạt động nhiều nhất lúc ${peakHours[0]}:00. Hãy lên lịch các task quan trọng vào thời điểm này!`
    };
}

// ============================================================
// #94 - SMART PREDICTIONS (Dự đoán thông minh)
// Dự đoán các vấn đề và cơ hội
// ============================================================
export function getPredictions() {
    const stats = getDashboardStats();
    const tasks = globalData?.tasks || [];
    const predictions = [];

    // Predict potential overdue
    const atRisk = tasks.filter(t => {
        if (t.completed || !t.deadline) return false;
        const daysLeft = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 3 && daysLeft > 0;
    });

    if (atRisk.length > 0) {
        predictions.push({
            type: 'risk',
            confidence: 75,
            icon: '🔮',
            title: 'Dự đoán: Tasks có thể trễ hạn',
            message: `${atRisk.length} task có nguy cơ trễ deadline trong 3 ngày tới`,
            tasks: atRisk.map(t => ({ id: t.id, title: t.title })),
            suggestion: 'Ưu tiên các task này ngay hôm nay'
        });
    }

    // Predict workload
    const pendingCount = stats.tasks.pending;
    if (pendingCount > 15) {
        predictions.push({
            type: 'workload',
            confidence: 80,
            icon: '📈',
            title: 'Dự đoán: Workload cao',
            message: `Với ${pendingCount} tasks pending, bạn có thể bị quá tải`,
            suggestion: 'Xem xét ủy quyền hoặc điều chỉnh deadline một số task'
        });
    }

    // Predict streak break
    const behavior = analyzeUserBehavior();
    if (behavior.hasEnoughData) {
        const lastActivity = userBehaviorLog[userBehaviorLog.length - 1];
        if (lastActivity) {
            const hoursSinceActivity = (new Date() - new Date(lastActivity.timestamp)) / (1000 * 60 * 60);
            if (hoursSinceActivity > 24) {
                predictions.push({
                    type: 'streak',
                    confidence: 60,
                    icon: '🔥',
                    title: 'Cảnh báo: Streak có thể bị reset',
                    message: 'Bạn chưa hoạt động trong 24h qua',
                    suggestion: 'Hoàn thành 1 task nhỏ để duy trì streak!'
                });
            }
        }
    }

    return predictions;
}

// ============================================================
// #95 - GOAL TRACKING (Theo dõi mục tiêu)
// Đặt và theo dõi mục tiêu dài hạn
// ============================================================
let goals = [];

export function createGoal(goal) {
    const newGoal = {
        id: generateID('goal'),
        title: goal.title,
        description: goal.description || '',
        type: goal.type || 'task_count', // task_count, streak, category, custom
        target: goal.target,
        current: 0,
        deadline: goal.deadline,
        milestones: goal.milestones || [],
        createdAt: new Date().toISOString(),
        status: 'active'
    };

    goals.push(newGoal);
    saveGoals();
    return newGoal;
}

export function updateGoalProgress(goalId, progress) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return null;

    goal.current = progress;
    goal.lastUpdated = new Date().toISOString();

    // Check if completed
    if (goal.current >= goal.target) {
        goal.status = 'completed';
        goal.completedAt = new Date().toISOString();
        showNotification(`🎉 Chúc mừng! Bạn đã đạt mục tiêu "${goal.title}"!`, 'success');
    }

    // Check milestones
    for (const milestone of goal.milestones) {
        if (!milestone.reached && goal.current >= milestone.value) {
            milestone.reached = true;
            milestone.reachedAt = new Date().toISOString();
            showNotification(`🏆 Milestone: ${milestone.name}`, 'info');
        }
    }

    saveGoals();
    return goal;
}

export function getGoals(filter = {}) {
    loadGoals();
    let filtered = goals;

    if (filter.status) {
        filtered = filtered.filter(g => g.status === filter.status);
    }
    if (filter.type) {
        filtered = filtered.filter(g => g.type === filter.type);
    }

    return filtered;
}

function saveGoals() {
    localStorage.setItem('ai_goals', JSON.stringify(goals));
}

function loadGoals() {
    try {
        const saved = localStorage.getItem('ai_goals');
        if (saved) goals = JSON.parse(saved);
    } catch (e) { }
}

// ============================================================
// #96 - GAMIFICATION (Game hóa)
// Hệ thống điểm, huy hiệu, level
// ============================================================
let gamificationData = {
    points: 0,
    level: 1,
    badges: [],
    achievements: []
};

export function awardPoints(amount, reason) {
    loadGamificationData();
    gamificationData.points += amount;

    // Level up check (every 100 points)
    const newLevel = Math.floor(gamificationData.points / 100) + 1;
    if (newLevel > gamificationData.level) {
        gamificationData.level = newLevel;
        showNotification(`🎉 Level Up! Bạn đã đạt Level ${newLevel}!`, 'success');
    }

    saveGamificationData();

    return {
        pointsEarned: amount,
        totalPoints: gamificationData.points,
        level: gamificationData.level,
        reason
    };
}

export function awardBadge(badgeId) {
    loadGamificationData();

    const badges = {
        'first_task': { name: 'Bước đầu tiên', icon: '🌱', description: 'Hoàn thành task đầu tiên' },
        'streak_7': { name: '7 ngày liên tục', icon: '🔥', description: 'Duy trì streak 7 ngày' },
        'streak_30': { name: '30 ngày liên tục', icon: '💎', description: 'Duy trì streak 30 ngày' },
        'task_master': { name: 'Task Master', icon: '🏆', description: 'Hoàn thành 100 tasks' },
        'early_bird': { name: 'Early Bird', icon: '🌅', description: 'Hoàn thành task trước 7h sáng' },
        'night_owl': { name: 'Cú đêm', icon: '🦉', description: 'Hoàn thành task sau 11h đêm' },
        'speedster': { name: 'Speedster', icon: '⚡', description: 'Hoàn thành 5 task trong 1 giờ' },
        'organizer': { name: 'Organizer', icon: '📋', description: 'Sử dụng tất cả categories' }
    };

    if (!badges[badgeId]) return null;
    if (gamificationData.badges.includes(badgeId)) return null;

    gamificationData.badges.push(badgeId);
    const badge = badges[badgeId];

    showNotification(`🏅 Badge mới: ${badge.icon} ${badge.name}`, 'success');
    saveGamificationData();

    return badge;
}

export function getGamificationStatus() {
    loadGamificationData();

    const pointsToNextLevel = ((gamificationData.level) * 100) - gamificationData.points;
    const progressToNextLevel = Math.round(((gamificationData.points % 100) / 100) * 100);

    return {
        ...gamificationData,
        pointsToNextLevel,
        progressToNextLevel
    };
}

function saveGamificationData() {
    localStorage.setItem('gamification_data', JSON.stringify(gamificationData));
}

function loadGamificationData() {
    try {
        const saved = localStorage.getItem('gamification_data');
        if (saved) gamificationData = JSON.parse(saved);
    } catch (e) { }
}

// ============================================================
// #97 - INSIGHTS ENGINE (Động cơ insights)
// Tạo insights từ dữ liệu
// ============================================================
export async function generateInsights() {
    const stats = getDashboardStats();
    const productivity = calculateProductivityScore();
    const behavior = analyzeUserBehavior();

    const dataForAI = `
Thống kê công việc:
- Tổng tasks: ${stats.tasks.total}
- Đã hoàn thành: ${stats.tasks.completed} (${stats.tasks.completionRate}%)
- Đang pending: ${stats.tasks.pending}
- Quá hạn: ${stats.tasks.overdue}
- Điểm năng suất: ${productivity.score}/100

Hành vi người dùng:
${behavior.hasEnoughData ? `
- Giờ hoạt động cao nhất: ${behavior.peakHours.join(', ')}h
- Actions phổ biến: ${behavior.topActions.map(a => a.action).join(', ')}
` : '- Chưa đủ dữ liệu'}`;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: [{
                    role: 'user',
                    content: `Dựa trên dữ liệu sau, tạo 3-5 insights ngắn gọn bằng tiếng Việt:

${dataForAI}

Trả về JSON:
{ "insights": [{ "icon": "emoji", "title": "Tiêu đề", "description": "Mô tả ngắn", "actionable": "Gợi ý hành động" }] }`
                }],
                temperature: 0.5,
                max_tokens: 800
            })
        });

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]).insights;
        }
    } catch (e) {
        console.error('Lỗi tạo insights:', e);
    }

    // Fallback insights
    return [
        {
            icon: '📊',
            title: 'Tỉ lệ hoàn thành',
            description: `Bạn đã hoàn thành ${stats.tasks.completionRate}% công việc`,
            actionable: stats.tasks.completionRate < 50 ? 'Thử ưu tiên các task nhỏ trước' : 'Tiếp tục phát huy!'
        }
    ];
}

// ============================================================
// #98 - PERSONAL ASSISTANT MODES (Chế độ trợ lý)
// Các chế độ trợ lý khác nhau
// ============================================================
export const ASSISTANT_MODES = {
    FOCUS: {
        name: 'Focus Mode',
        icon: '🎯',
        description: 'Tập trung hoàn thành task, giảm thông báo',
        settings: {
            notifications: 'minimal',
            suggestions: 'focused',
            distractionBlock: true
        }
    },
    CREATIVE: {
        name: 'Creative Mode',
        icon: '🎨',
        description: 'Khuyến khích sáng tạo, gợi ý mở rộng',
        settings: {
            notifications: 'normal',
            suggestions: 'exploratory',
            distractionBlock: false
        }
    },
    PLANNING: {
        name: 'Planning Mode',
        icon: '📋',
        description: 'Tập trung lập kế hoạch và tổ chức',
        settings: {
            notifications: 'normal',
            suggestions: 'organizational',
            distractionBlock: false
        }
    },
    RELAXED: {
        name: 'Relaxed Mode',
        icon: '🌴',
        description: 'Giảm áp lực, không nhắc nhở deadline',
        settings: {
            notifications: 'minimal',
            suggestions: 'gentle',
            distractionBlock: false
        }
    }
};

let currentMode = 'FOCUS';

export function setAssistantMode(mode) {
    if (!ASSISTANT_MODES[mode]) return null;
    currentMode = mode;
    localStorage.setItem('assistant_mode', mode);
    return ASSISTANT_MODES[mode];
}

export function getAssistantMode() {
    const saved = localStorage.getItem('assistant_mode');
    if (saved && ASSISTANT_MODES[saved]) currentMode = saved;
    return { mode: currentMode, ...ASSISTANT_MODES[currentMode] };
}

// ============================================================
// #99 - SMART SEARCH (Tìm kiếm thông minh)
// Tìm kiếm ngữ nghĩa
// ============================================================
export function smartSearch(query) {
    const tasks = globalData?.tasks || [];
    const events = globalData?.events || [];
    const projects = globalData?.projects || [];

    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);

    const results = [];

    // Search tasks
    for (const task of tasks) {
        const score = calculateSearchScore(task, queryWords, lowerQuery);
        if (score > 0) {
            results.push({
                type: 'task',
                item: task,
                score,
                highlight: highlightMatch(task.title, query)
            });
        }
    }

    // Search events
    for (const event of events) {
        const score = calculateSearchScore(event, queryWords, lowerQuery);
        if (score > 0) {
            results.push({
                type: 'event',
                item: event,
                score,
                highlight: highlightMatch(event.title, query)
            });
        }
    }

    // Search projects
    for (const project of projects) {
        const score = calculateSearchScore(project, queryWords, lowerQuery);
        if (score > 0) {
            results.push({
                type: 'project',
                item: project,
                score,
                highlight: highlightMatch(project.name, query)
            });
        }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    return {
        query,
        totalResults: results.length,
        results: results.slice(0, 20)
    };
}

function calculateSearchScore(item, queryWords, fullQuery) {
    let score = 0;
    const title = (item.title || item.name || '').toLowerCase();
    const description = (item.description || '').toLowerCase();

    // Exact match in title
    if (title.includes(fullQuery)) score += 100;

    // Word matches
    for (const word of queryWords) {
        if (title.includes(word)) score += 20;
        if (description.includes(word)) score += 5;
    }

    // Category/priority match
    if (item.category?.toLowerCase().includes(fullQuery)) score += 15;
    if (item.priority?.toLowerCase().includes(fullQuery)) score += 10;

    return score;
}

function highlightMatch(text, query) {
    if (!text) return '';
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// ============================================================
// #100 - COMPREHENSIVE AI REPORT (Báo cáo AI tổng hợp)
// Báo cáo toàn diện với AI analysis
// ============================================================
export async function generateAIReport() {
    const stats = getDashboardStats();
    const productivity = calculateProductivityScore();
    const predictions = getPredictions();
    const suggestions = getProactiveSuggestions();
    const behavior = analyzeUserBehavior();
    const gamification = getGamificationStatus();
    const goals = getGoals({ status: 'active' });

    // Generate AI summary
    let aiSummary = '';
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: [{
                    role: 'user',
                    content: `Viết một đoạn tổng kết ngắn (2-3 câu) về tình trạng công việc dựa trên:
- Điểm năng suất: ${productivity.score}/100
- Tasks pending: ${stats.tasks.pending}
- Tasks quá hạn: ${stats.tasks.overdue}
- Level: ${gamification.level}
- Streak points: ${gamification.points}

Viết thân thiện, tích cực bằng tiếng Việt.`
                }],
                temperature: 0.7,
                max_tokens: 200
            })
        });

        if (response.ok) {
            const data = await response.json();
            aiSummary = data.choices[0]?.message?.content || '';
        }
    } catch (e) {
        aiSummary = 'Không thể tạo tổng kết AI.';
    }

    return {
        generatedAt: new Date().toISOString(),
        aiSummary,
        stats,
        productivity,
        predictions,
        suggestions,
        behavior: behavior.hasEnoughData ? behavior : null,
        gamification,
        activeGoals: goals,
        mode: getAssistantMode()
    };
}

