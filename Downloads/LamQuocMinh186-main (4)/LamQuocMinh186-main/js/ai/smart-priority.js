/**
 * ============================================================
 * SMART PRIORITY SCORE - LifeOS 2026
 * ============================================================
 * Feature #7: Priority Score Algorithm
 * Score = Urgency×0.4 + Importance×0.3 + Effort×0.2 + Dependencies×0.1
 * 
 * Feature #5: Emoji Intent Understanding
 * Feature #8: Auto-Tag Intelligence
 * Feature #6: Smart Task Clustering
 * ============================================================
 */

const SmartPriority = (function () {
    'use strict';

    // ========== SCORING WEIGHTS ==========
    const WEIGHTS = {
        urgency: 0.4,
        importance: 0.3,
        effort: 0.2,
        dependencies: 0.1
    };

    // ========== EMOJI PATTERNS ==========
    const EMOJI_INTENT = {
        // Urgency indicators
        '🔥': { urgency: 10, importance: 8 },
        '⚡': { urgency: 9, importance: 7 },
        '🚨': { urgency: 10, importance: 9 },
        '⏰': { urgency: 8, importance: 5 },
        '⏳': { urgency: 7, importance: 5 },
        '❗': { urgency: 8, importance: 7 },
        '‼️': { urgency: 9, importance: 8 },

        // Importance indicators
        '⭐': { urgency: 5, importance: 9 },
        '🌟': { urgency: 5, importance: 10 },
        '💎': { urgency: 4, importance: 10 },
        '🎯': { urgency: 6, importance: 9 },
        '🏆': { urgency: 5, importance: 9 },
        '👑': { urgency: 4, importance: 10 },

        // Low priority indicators
        '💤': { urgency: 2, importance: 3 },
        '🐢': { urgency: 2, importance: 4 },
        '☕': { urgency: 3, importance: 4 },
        '🧘': { urgency: 2, importance: 5 },

        // Category hints
        '📚': { category: 'study', tags: ['learning'] },
        '💼': { category: 'work', tags: ['professional'] },
        '🏠': { category: 'personal', tags: ['home'] },
        '💰': { category: 'finance', tags: ['money'] },
        '🏋️': { category: 'health', tags: ['fitness'] },
        '❤️': { category: 'personal', tags: ['relationship'] },
        '🎉': { category: 'event', tags: ['celebration'] },
        '📅': { tags: ['deadline', 'scheduled'] },
        '📧': { category: 'communication', tags: ['email'] },
        '📞': { category: 'communication', tags: ['call'] },
        '✈️': { category: 'travel', tags: ['trip'] },
        '🛒': { category: 'shopping', tags: ['buy'] }
    };

    // ========== KEYWORD PATTERNS FOR AUTO-TAG ==========
    const KEYWORD_TAGS = {
        // Urgency keywords
        'gấp': ['urgent', 'high-priority'],
        'khẩn': ['urgent', 'high-priority'],
        'ngay': ['urgent', 'asap'],
        'sớm': ['urgent'],
        'deadline': ['deadline', 'urgent'],
        'hạn chót': ['deadline', 'urgent'],

        // Category keywords
        'họp': ['meeting', 'collaboration'],
        'meeting': ['meeting', 'collaboration'],
        'gặp': ['meeting'],
        'email': ['email', 'communication'],
        'gọi': ['call', 'communication'],
        'call': ['call', 'communication'],
        'nộp': ['submission', 'deadline'],
        'submit': ['submission', 'deadline'],
        'báo cáo': ['report', 'documentation'],
        'report': ['report'],
        'học': ['study', 'learning'],
        'ôn': ['study', 'exam'],
        'thi': ['exam', 'important'],
        'exam': ['exam', 'important'],
        'dự án': ['project'],
        'project': ['project'],
        'review': ['review'],
        'fix': ['bug', 'development'],
        'bug': ['bug', 'urgent'],
        'test': ['testing', 'qa'],
        'deploy': ['deployment', 'urgent'],

        // Low priority keywords
        'khi nào rảnh': ['low-priority', 'whenever'],
        'không gấp': ['low-priority'],
        'từ từ': ['low-priority'],
        'optional': ['optional', 'low-priority']
    };

    // ========== CATEGORY DETECTION ==========
    const CATEGORY_KEYWORDS = {
        'study': ['học', 'ôn', 'thi', 'bài tập', 'homework', 'exam', 'assignment', 'thesis', 'luận văn', 'môn'],
        'work': ['làm việc', 'công việc', 'office', 'văn phòng', 'meeting', 'họp', 'báo cáo', 'report'],
        'personal': ['cá nhân', 'riêng', 'bản thân', 'nhà'],
        'health': ['tập', 'gym', 'chạy bộ', 'khám', 'bác sĩ', 'thuốc', 'yoga'],
        'finance': ['tiền', 'ngân hàng', 'bank', 'trả', 'nộp tiền', 'hóa đơn'],
        'social': ['gặp bạn', 'party', 'sinh nhật', 'gathering'],
        'shopping': ['mua', 'shopping', 'order', 'đặt hàng'],
        'travel': ['du lịch', 'đi', 'chuyến', 'bay', 'xe']
    };

    // ========== CORE FUNCTIONS ==========

    /**
     * Calculate priority score for a task
     * @param {Object} task - Task object with name, dueDate, priority, etc.
     * @returns {Object} { score: number, breakdown: Object, recommendations: Array }
     */
    function calculateScore(task) {
        const urgencyScore = calculateUrgency(task);
        const importanceScore = calculateImportance(task);
        const effortScore = calculateEffort(task);
        const dependencyScore = calculateDependencies(task);

        const totalScore = (
            urgencyScore * WEIGHTS.urgency +
            importanceScore * WEIGHTS.importance +
            effortScore * WEIGHTS.effort +
            dependencyScore * WEIGHTS.dependencies
        );

        // Normalize to 0-100
        const normalizedScore = Math.min(100, Math.max(0, totalScore * 10));

        return {
            score: Math.round(normalizedScore),
            level: getScoreLevel(normalizedScore),
            breakdown: {
                urgency: { score: urgencyScore, weight: WEIGHTS.urgency },
                importance: { score: importanceScore, weight: WEIGHTS.importance },
                effort: { score: effortScore, weight: WEIGHTS.effort },
                dependencies: { score: dependencyScore, weight: WEIGHTS.dependencies }
            },
            recommendations: generateRecommendations(task, normalizedScore)
        };
    }

    /**
     * Calculate urgency score (0-10)
     */
    function calculateUrgency(task) {
        let score = 5; // Default medium

        // Check due date
        if (task.dueDate) {
            const daysUntilDue = getDaysUntilDue(task.dueDate);

            if (daysUntilDue < 0) {
                score = 10; // Overdue
            } else if (daysUntilDue === 0) {
                score = 10; // Due today
            } else if (daysUntilDue === 1) {
                score = 9; // Due tomorrow
            } else if (daysUntilDue <= 3) {
                score = 8; // Due in 3 days
            } else if (daysUntilDue <= 7) {
                score = 6; // Due this week
            } else if (daysUntilDue <= 14) {
                score = 4; // 2 weeks
            } else {
                score = 3; // More than 2 weeks
            }
        }

        // Check priority level
        if (task.priority === 'high') score = Math.max(score, 8);
        if (task.priority === 'low') score = Math.min(score, 4);

        // Check emojis in name
        if (task.name) {
            for (const [emoji, intent] of Object.entries(EMOJI_INTENT)) {
                if (task.name.includes(emoji) && intent.urgency) {
                    score = Math.max(score, intent.urgency);
                }
            }
        }

        return Math.min(10, score);
    }

    /**
     * Calculate importance score (0-10)
     */
    function calculateImportance(task) {
        let score = 5; // Default medium

        // Check priority flag
        if (task.priority === 'high') score = 8;
        if (task.priority === 'low') score = 3;

        // Check if marked important
        if (task.important || task.isImportant) {
            score = Math.max(score, 9);
        }

        // Check project association (project tasks are usually important)
        if (task.projectId || task.project) {
            score = Math.max(score, 6);
        }

        // Check emojis
        if (task.name) {
            for (const [emoji, intent] of Object.entries(EMOJI_INTENT)) {
                if (task.name.includes(emoji) && intent.importance) {
                    score = Math.max(score, intent.importance);
                }
            }
        }

        return Math.min(10, score);
    }

    /**
     * Calculate effort/complexity score (0-10)
     * Higher score = needs more attention
     */
    function calculateEffort(task) {
        let score = 5;

        // Check estimated time
        if (task.estimatedTime) {
            const hours = task.estimatedTime / 60;
            if (hours >= 4) score = 9;
            else if (hours >= 2) score = 7;
            else if (hours >= 1) score = 5;
            else score = 3;
        }

        // Check subtasks count
        if (task.subtasks && task.subtasks.length > 0) {
            const incompleteSubs = task.subtasks.filter(s => !s.done).length;
            if (incompleteSubs >= 5) score = Math.max(score, 8);
            else if (incompleteSubs >= 3) score = Math.max(score, 6);
        }

        return Math.min(10, score);
    }

    /**
     * Calculate dependencies score (0-10)
     */
    function calculateDependencies(task) {
        let score = 5;

        // Check if other tasks depend on this
        if (task.blockedBy && task.blockedBy.length > 0) {
            score = Math.max(score, 8);
        }

        // Check if this is a blocker for others
        if (task.blocking && task.blocking.length > 0) {
            score = Math.max(score, 9);
        }

        return Math.min(10, score);
    }

    /**
     * Get score level description
     */
    function getScoreLevel(score) {
        if (score >= 90) return { level: 'critical', label: '🔴 Rất quan trọng', color: '#ef4444' };
        if (score >= 75) return { level: 'high', label: '🟠 Quan trọng', color: '#f97316' };
        if (score >= 50) return { level: 'medium', label: '🟡 Trung bình', color: '#eab308' };
        if (score >= 25) return { level: 'low', label: '🟢 Thấp', color: '#22c55e' };
        return { level: 'minimal', label: '⚪ Tối thiểu', color: '#9ca3af' };
    }

    /**
     * Generate recommendations based on score
     */
    function generateRecommendations(task, score) {
        const recommendations = [];

        if (score >= 80 && !task.scheduledTime) {
            recommendations.push({
                type: 'schedule',
                message: 'Nên đặt lịch cố định cho task này'
            });
        }

        if (score >= 70 && task.subtasks && task.subtasks.length === 0) {
            recommendations.push({
                type: 'breakdown',
                message: 'Nên chia nhỏ thành subtasks'
            });
        }

        const daysUntilDue = task.dueDate ? getDaysUntilDue(task.dueDate) : null;
        if (daysUntilDue !== null && daysUntilDue <= 1 && score < 70) {
            recommendations.push({
                type: 'priority',
                message: 'Deadline gần nhưng priority thấp - cần review lại'
            });
        }

        return recommendations;
    }

    // ========== EMOJI UNDERSTANDING ==========

    /**
     * Parse emojis in task name and extract intent
     * @param {string} text - Task name/description
     * @returns {Object} Extracted intents
     */
    function parseEmojis(text) {
        if (!text) return { urgency: null, importance: null, category: null, tags: [] };

        let result = {
            urgency: null,
            importance: null,
            category: null,
            tags: []
        };

        for (const [emoji, intent] of Object.entries(EMOJI_INTENT)) {
            if (text.includes(emoji)) {
                if (intent.urgency && (!result.urgency || intent.urgency > result.urgency)) {
                    result.urgency = intent.urgency;
                }
                if (intent.importance && (!result.importance || intent.importance > result.importance)) {
                    result.importance = intent.importance;
                }
                if (intent.category) {
                    result.category = intent.category;
                }
                if (intent.tags) {
                    result.tags = [...new Set([...result.tags, ...intent.tags])];
                }
            }
        }

        return result;
    }

    // ========== AUTO-TAG INTELLIGENCE ==========

    /**
     * Suggest tags for a task based on its content
     * @param {Object} task - Task object
     * @returns {Array} Suggested tags
     */
    function suggestTags(task) {
        const text = `${task.name || ''} ${task.notes || ''}`.toLowerCase();
        const suggestedTags = new Set();

        // From keywords
        for (const [keyword, tags] of Object.entries(KEYWORD_TAGS)) {
            if (text.includes(keyword)) {
                tags.forEach(tag => suggestedTags.add(tag));
            }
        }

        // From emojis
        const emojiIntent = parseEmojis(task.name);
        emojiIntent.tags.forEach(tag => suggestedTags.add(tag));

        // From priority
        if (task.priority === 'high') {
            suggestedTags.add('high-priority');
        }

        // From due date
        if (task.dueDate) {
            const days = getDaysUntilDue(task.dueDate);
            if (days <= 1) suggestedTags.add('urgent');
            if (days <= 7) suggestedTags.add('this-week');
        }

        // Exclude existing tags
        const existingTags = new Set((task.tags || []).map(t => t.toLowerCase()));
        return Array.from(suggestedTags).filter(tag => !existingTags.has(tag));
    }

    /**
     * Suggest category for a task
     * @param {Object} task - Task object
     * @returns {string|null} Suggested category
     */
    function suggestCategory(task) {
        const text = `${task.name || ''} ${task.notes || ''}`.toLowerCase();

        // From emojis first
        const emojiIntent = parseEmojis(task.name);
        if (emojiIntent.category) {
            return emojiIntent.category;
        }

        // From keywords
        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    return category;
                }
            }
        }

        return null;
    }

    // ========== TASK CLUSTERING ==========

    /**
     * Cluster similar tasks together
     * @param {Array} tasks - Array of tasks
     * @returns {Object} Clusters by similarity
     */
    function clusterTasks(tasks) {
        const clusters = {
            byCategory: {},
            byProject: {},
            byDeadline: {
                overdue: [],
                today: [],
                thisWeek: [],
                later: [],
                noDeadline: []
            },
            byPriority: {
                critical: [],
                high: [],
                medium: [],
                low: []
            },
            similar: []
        };

        tasks.forEach(task => {
            // By category
            const category = task.category || 'uncategorized';
            if (!clusters.byCategory[category]) {
                clusters.byCategory[category] = [];
            }
            clusters.byCategory[category].push(task);

            // By project
            if (task.projectId || task.project) {
                const projectId = task.projectId || task.project;
                if (!clusters.byProject[projectId]) {
                    clusters.byProject[projectId] = [];
                }
                clusters.byProject[projectId].push(task);
            }

            // By deadline
            if (task.dueDate) {
                const days = getDaysUntilDue(task.dueDate);
                if (days < 0) clusters.byDeadline.overdue.push(task);
                else if (days === 0) clusters.byDeadline.today.push(task);
                else if (days <= 7) clusters.byDeadline.thisWeek.push(task);
                else clusters.byDeadline.later.push(task);
            } else {
                clusters.byDeadline.noDeadline.push(task);
            }

            // By priority score
            const { score } = calculateScore(task);
            if (score >= 80) clusters.byPriority.critical.push(task);
            else if (score >= 60) clusters.byPriority.high.push(task);
            else if (score >= 40) clusters.byPriority.medium.push(task);
            else clusters.byPriority.low.push(task);
        });

        // Find similar tasks (basic text similarity)
        clusters.similar = findSimilarTasks(tasks);

        return clusters;
    }

    /**
     * Find similar tasks that might be duplicates or related
     */
    function findSimilarTasks(tasks) {
        const similar = [];
        const processed = new Set();

        for (let i = 0; i < tasks.length; i++) {
            if (processed.has(tasks[i].id)) continue;

            const group = [tasks[i]];
            const words1 = getWords(tasks[i].name || '');

            for (let j = i + 1; j < tasks.length; j++) {
                if (processed.has(tasks[j].id)) continue;

                const words2 = getWords(tasks[j].name || '');
                const similarity = calculateSimilarity(words1, words2);

                if (similarity > 0.5) {
                    group.push(tasks[j]);
                    processed.add(tasks[j].id);
                }
            }

            if (group.length > 1) {
                similar.push({
                    tasks: group,
                    suggestion: 'Có thể gộp hoặc liên kết các tasks này'
                });
            }
            processed.add(tasks[i].id);
        }

        return similar;
    }

    // ========== UTILITIES ==========

    function getDaysUntilDue(dueDate) {
        const due = new Date(dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    }

    function getWords(text) {
        return text.toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .split(/\s+/)
            .filter(w => w.length > 2);
    }

    function calculateSimilarity(words1, words2) {
        if (words1.length === 0 || words2.length === 0) return 0;

        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = [...set1].filter(w => set2.has(w)).length;
        const union = new Set([...words1, ...words2]).size;

        return intersection / union; // Jaccard similarity
    }

    // ========== BATCH OPERATIONS ==========

    /**
     * Sort tasks by priority score
     * @param {Array} tasks 
     * @param {string} order - 'asc' or 'desc'
     * @returns {Array}
     */
    function sortByScore(tasks, order = 'desc') {
        return [...tasks].sort((a, b) => {
            const scoreA = calculateScore(a).score;
            const scoreB = calculateScore(b).score;
            return order === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        });
    }

    /**
     * Auto-prioritize all tasks
     * @param {Array} tasks 
     * @returns {Array} Tasks with updated priority field
     */
    function autoPrioritize(tasks) {
        return tasks.map(task => {
            const { score, level } = calculateScore(task);
            let priority = 'medium';

            if (score >= 70) priority = 'high';
            else if (score < 40) priority = 'low';

            return {
                ...task,
                priorityScore: score,
                priorityLevel: level,
                priority,
                suggestedTags: suggestTags(task),
                suggestedCategory: suggestCategory(task)
            };
        });
    }

    // ========== PUBLIC API ==========
    return {
        calculateScore,
        parseEmojis,
        suggestTags,
        suggestCategory,
        clusterTasks,
        sortByScore,
        autoPrioritize,

        // Expose utils
        getDaysUntilDue,
        getScoreLevel,

        // Expose constants
        WEIGHTS,
        EMOJI_INTENT,
        KEYWORD_TAGS
    };
})();

// Export
if (typeof window !== 'undefined') {
    window.SmartPriority = SmartPriority;
}
