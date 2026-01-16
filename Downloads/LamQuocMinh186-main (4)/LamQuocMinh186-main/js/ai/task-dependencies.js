/**
 * ============================================================
 * TASK DEPENDENCIES - LifeOS 2026
 * ============================================================
 * Feature #11: Cross-Task Dependency Detection
 * Feature #12: Task Effort Estimation
 * Feature #15: Recurring Pattern Detection
 * ============================================================
 */

const TaskDependencies = (function () {
    'use strict';

    // ========== DEPENDENCY DETECTION ==========

    /**
     * Phát hiện dependencies giữa các tasks
     * @param {Array} tasks - Danh sách tasks
     * @returns {Object} Dependency map
     */
    function detectDependencies(tasks) {
        const dependencies = {
            blockedBy: {},    // Task bị block bởi task khác
            blocking: {},     // Task đang block task khác
            suggestions: []   // Gợi ý dependencies
        };

        if (!tasks || tasks.length < 2) return dependencies;

        // Keywords indicating dependencies
        const dependencyKeywords = {
            before: ['trước khi', 'trước', 'before', 'prior to'],
            after: ['sau khi', 'sau', 'after', 'following'],
            requires: ['cần', 'yêu cầu', 'requires', 'needs'],
            enables: ['để', 'cho phép', 'enables', 'allows']
        };

        // Analyze each task
        tasks.forEach(task => {
            const taskName = (task.name || task.title || '').toLowerCase();
            const taskNotes = (task.notes || task.description || '').toLowerCase();
            const fullText = `${taskName} ${taskNotes}`;

            // Check for explicit dependencies in notes
            tasks.forEach(otherTask => {
                if (task.id === otherTask.id) return;

                const otherName = (otherTask.name || otherTask.title || '').toLowerCase();

                // Check if this task mentions the other
                if (fullText.includes(otherName) ||
                    containsReference(fullText, otherName)) {

                    // Determine dependency direction
                    if (dependencyKeywords.before.some(kw => fullText.includes(kw))) {
                        // This task should be done before other
                        if (!dependencies.blocking[task.id]) {
                            dependencies.blocking[task.id] = [];
                        }
                        dependencies.blocking[task.id].push(otherTask.id);

                        if (!dependencies.blockedBy[otherTask.id]) {
                            dependencies.blockedBy[otherTask.id] = [];
                        }
                        dependencies.blockedBy[otherTask.id].push(task.id);
                    }

                    if (dependencyKeywords.after.some(kw => fullText.includes(kw)) ||
                        dependencyKeywords.requires.some(kw => fullText.includes(kw))) {
                        // This task depends on other
                        if (!dependencies.blockedBy[task.id]) {
                            dependencies.blockedBy[task.id] = [];
                        }
                        dependencies.blockedBy[task.id].push(otherTask.id);

                        if (!dependencies.blocking[otherTask.id]) {
                            dependencies.blocking[otherTask.id] = [];
                        }
                        dependencies.blocking[otherTask.id].push(task.id);
                    }
                }
            });
        });

        // Suggest dependencies based on similar names/categories
        dependencies.suggestions = suggestDependencies(tasks);

        return dependencies;
    }

    /**
     * Kiểm tra text có chứa reference đến task name
     */
    function containsReference(text, taskName) {
        // Extract key words from task name
        const words = taskName.split(/\s+/).filter(w => w.length > 3);
        const matchCount = words.filter(w => text.includes(w)).length;
        return matchCount >= Math.ceil(words.length * 0.5);
    }

    /**
     * Gợi ý dependencies dựa trên phân tích
     */
    function suggestDependencies(tasks) {
        const suggestions = [];
        const grouped = groupByProject(tasks);

        // Within same project, suggest order by deadline
        Object.values(grouped).forEach(projectTasks => {
            if (projectTasks.length < 2) return;

            // Sort by deadline
            const sorted = [...projectTasks]
                .filter(t => t.dueDate)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            for (let i = 0; i < sorted.length - 1; i++) {
                const current = sorted[i];
                const next = sorted[i + 1];

                // If deadlines are close and same category, suggest dependency
                const daysDiff = (new Date(next.dueDate) - new Date(current.dueDate)) / (1000 * 60 * 60 * 24);

                if (daysDiff > 0 && daysDiff <= 3 && current.category === next.category) {
                    suggestions.push({
                        from: current.id,
                        to: next.id,
                        reason: `"${current.name}" có deadline trước "${next.name}" trong cùng category`,
                        confidence: 0.6
                    });
                }
            }
        });

        // Suggest based on naming patterns
        const phasePattern = /(?:phase|giai đoạn|bước|step)\s*(\d+)/i;
        const numbered = tasks.filter(t => phasePattern.test(t.name));

        if (numbered.length > 1) {
            numbered.sort((a, b) => {
                const numA = parseInt(a.name.match(phasePattern)[1]);
                const numB = parseInt(b.name.match(phasePattern)[1]);
                return numA - numB;
            });

            for (let i = 0; i < numbered.length - 1; i++) {
                suggestions.push({
                    from: numbered[i].id,
                    to: numbered[i + 1].id,
                    reason: `Thứ tự phase/bước`,
                    confidence: 0.9
                });
            }
        }

        return suggestions;
    }

    function groupByProject(tasks) {
        return tasks.reduce((acc, task) => {
            const projectId = task.projectId || task.project || 'none';
            if (!acc[projectId]) acc[projectId] = [];
            acc[projectId].push(task);
            return acc;
        }, {});
    }

    // ========== EFFORT ESTIMATION ==========

    /**
     * Ước tính thời gian hoàn thành task
     * @param {Object} task - Task object
     * @param {Array} historicalTasks - Tasks đã hoàn thành
     * @returns {Object} Estimation
     */
    function estimateEffort(task, historicalTasks = []) {
        const estimation = {
            minutes: 30, // Default 30 minutes
            confidence: 0.3,
            source: 'default',
            breakdown: null
        };

        // 1. Check if task already has estimated time
        if (task.estimatedTime) {
            estimation.minutes = task.estimatedTime;
            estimation.confidence = 0.9;
            estimation.source = 'user-defined';
            return estimation;
        }

        // 2. Check template if available
        if (window.TaskTemplates && task.name) {
            const templates = window.TaskTemplates.suggestFromName(task.name);
            if (templates.length > 0 && templates[0].estimatedTime) {
                estimation.minutes = templates[0].estimatedTime;
                estimation.confidence = 0.7;
                estimation.source = 'template';
                return estimation;
            }
        }

        // 3. Learn from historical data
        if (historicalTasks.length > 0 && task.category) {
            const similar = historicalTasks.filter(t =>
                t.category === task.category &&
                t.actualTime &&
                t.actualTime > 0
            );

            if (similar.length >= 3) {
                const avgTime = similar.reduce((sum, t) => sum + t.actualTime, 0) / similar.length;
                estimation.minutes = Math.round(avgTime);
                estimation.confidence = Math.min(0.8, 0.5 + (similar.length * 0.05));
                estimation.source = 'historical';
                estimation.sampleSize = similar.length;
                return estimation;
            }
        }

        // 4. Estimate from AI Memory if available
        if (window.AIMemory) {
            const predicted = window.AIMemory.predictCompletionTime(task.category);
            if (predicted) {
                estimation.minutes = predicted;
                estimation.confidence = 0.6;
                estimation.source = 'ai-memory';
                return estimation;
            }
        }

        // 5. Keyword-based estimation
        const keywordEstimates = {
            quick: { keywords: ['nhanh', 'quick', 'ngắn', 'nhỏ', 'mini'], minutes: 15 },
            short: { keywords: ['check', 'review', 'xem', 'đọc'], minutes: 20 },
            medium: { keywords: ['viết', 'làm', 'tạo', 'soạn'], minutes: 45 },
            long: { keywords: ['báo cáo', 'report', 'dự án', 'project'], minutes: 120 },
            veryLong: { keywords: ['nghiên cứu', 'luận văn', 'thesis'], minutes: 240 }
        };

        const taskName = (task.name || '').toLowerCase();
        for (const [, config] of Object.entries(keywordEstimates)) {
            if (config.keywords.some(kw => taskName.includes(kw))) {
                estimation.minutes = config.minutes;
                estimation.confidence = 0.5;
                estimation.source = 'keyword-analysis';
                break;
            }
        }

        // 6. Adjust based on subtasks
        if (task.subtasks && task.subtasks.length > 0) {
            const incompleteSubs = task.subtasks.filter(s => !s.done).length;
            estimation.minutes += incompleteSubs * 15; // Add 15 min per subtask
            estimation.breakdown = {
                baseTime: estimation.minutes - (incompleteSubs * 15),
                subtasksTime: incompleteSubs * 15,
                subtasksCount: incompleteSubs
            };
        }

        return estimation;
    }

    // ========== RECURRING PATTERN DETECTION ==========

    /**
     * Phát hiện patterns lặp lại trong tasks
     * @param {Array} tasks - Danh sách tasks (bao gồm cả completed)
     * @returns {Array} Detected patterns
     */
    function detectRecurringPatterns(tasks) {
        const patterns = [];

        if (!tasks || tasks.length < 5) return patterns;

        // Group by name similarity
        const nameGroups = groupBySimilarName(tasks);

        for (const [baseName, group] of Object.entries(nameGroups)) {
            if (group.length < 2) continue;

            // Analyze timing pattern
            const completedTasks = group
                .filter(t => t.completedAt || t.status === 'done')
                .sort((a, b) => new Date(a.completedAt || a.dueDate) - new Date(b.completedAt || b.dueDate));

            if (completedTasks.length < 2) continue;

            // Calculate intervals between completions
            const intervals = [];
            for (let i = 1; i < completedTasks.length; i++) {
                const prev = new Date(completedTasks[i - 1].completedAt || completedTasks[i - 1].dueDate);
                const curr = new Date(completedTasks[i].completedAt || completedTasks[i].dueDate);
                const daysDiff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
                intervals.push(daysDiff);
            }

            // Detect pattern
            const pattern = analyzeIntervals(intervals);

            if (pattern) {
                patterns.push({
                    baseName,
                    taskSample: group[0],
                    occurrences: group.length,
                    pattern: pattern.type,
                    intervalDays: pattern.days,
                    confidence: pattern.confidence,
                    suggestion: generateRecurrenceSuggestion(pattern)
                });
            }
        }

        return patterns;
    }

    /**
     * Group tasks by similar names
     */
    function groupBySimilarName(tasks) {
        const groups = {};

        tasks.forEach(task => {
            const name = (task.name || task.title || '').toLowerCase();
            // Normalize name - remove dates, numbers
            const normalized = name
                .replace(/\d{1,2}[\/\-\.]\d{1,2}([\/\-\.]\d{2,4})?/g, '')
                .replace(/\d+/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (!normalized || normalized.length < 3) return;

            // Find matching group
            let matched = false;
            for (const baseName of Object.keys(groups)) {
                if (similarity(normalized, baseName) > 0.7) {
                    groups[baseName].push(task);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                groups[normalized] = [task];
            }
        });

        return groups;
    }

    /**
     * Calculate simple string similarity
     */
    function similarity(s1, s2) {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;

        if (longer.length === 0) return 1.0;

        const editDistance = levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    function levenshteinDistance(s1, s2) {
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1[i - 1] !== s2[j - 1]) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    /**
     * Analyze intervals to detect pattern
     */
    function analyzeIntervals(intervals) {
        if (intervals.length < 2) return null;

        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        // High variance = no clear pattern
        if (stdDev > avg * 0.5) return null;

        // Detect specific patterns
        if (Math.abs(avg - 1) <= 0.5) {
            return { type: 'daily', days: 1, confidence: 0.9 };
        }
        if (Math.abs(avg - 7) <= 1) {
            return { type: 'weekly', days: 7, confidence: 0.85 };
        }
        if (Math.abs(avg - 14) <= 2) {
            return { type: 'biweekly', days: 14, confidence: 0.8 };
        }
        if (Math.abs(avg - 30) <= 3) {
            return { type: 'monthly', days: 30, confidence: 0.75 };
        }

        // Custom interval
        if (avg >= 2 && avg <= 60) {
            return {
                type: 'custom',
                days: Math.round(avg),
                confidence: Math.max(0.5, 1 - (stdDev / avg))
            };
        }

        return null;
    }

    /**
     * Generate suggestion based on pattern
     */
    function generateRecurrenceSuggestion(pattern) {
        const suggestions = {
            daily: 'Đề xuất: Tạo task lặp lại hàng ngày',
            weekly: 'Đề xuất: Tạo task lặp lại hàng tuần',
            biweekly: 'Đề xuất: Tạo task lặp lại 2 tuần/lần',
            monthly: 'Đề xuất: Tạo task lặp lại hàng tháng',
            custom: `Đề xuất: Tạo task lặp lại mỗi ${pattern.days} ngày`
        };
        return suggestions[pattern.type] || '';
    }

    // ========== DUE DATE SUGGESTION ==========

    /**
     * Gợi ý due date cho task
     * @param {Object} task - Task object
     * @param {Array} existingTasks - Tasks hiện có
     * @returns {Object} Suggestion
     */
    function suggestDueDate(task, existingTasks = []) {
        const suggestion = {
            date: null,
            reason: '',
            confidence: 0.3
        };

        const now = new Date();

        // 1. Check if template has typical deadline
        if (window.TaskTemplates && task.name) {
            const templates = window.TaskTemplates.suggestFromName(task.name);
            // Some templates might have deadline patterns
            // For now, use effort estimation to suggest
        }

        // 2. Based on effort estimation
        const effort = estimateEffort(task);
        const workMinutesPerDay = 180; // 3 hours of focused work
        const daysNeeded = Math.ceil(effort.minutes / workMinutesPerDay);

        // Add buffer
        const bufferDays = Math.ceil(daysNeeded * 0.3);
        const totalDays = daysNeeded + bufferDays;

        // 3. Check workload on potential dates
        const suggestedDate = new Date(now);
        suggestedDate.setDate(suggestedDate.getDate() + totalDays);

        // Avoid weekends for work tasks
        if (task.category === 'work' || task.category === 'study') {
            while (suggestedDate.getDay() === 0 || suggestedDate.getDay() === 6) {
                suggestedDate.setDate(suggestedDate.getDate() + 1);
            }
        }

        // 4. Check for conflicts
        if (existingTasks.length > 0) {
            const dateStr = suggestedDate.toISOString().split('T')[0];
            const tasksOnDate = existingTasks.filter(t =>
                t.dueDate && t.dueDate.startsWith(dateStr)
            );

            if (tasksOnDate.length >= 5) {
                // Too many tasks, push to next day
                suggestedDate.setDate(suggestedDate.getDate() + 1);
                suggestion.reason = `Ngày ${dateStr} đã có ${tasksOnDate.length} tasks, đề xuất ngày sau`;
            }
        }

        suggestion.date = suggestedDate;
        suggestion.reason = suggestion.reason ||
            `Dựa trên ước tính ${effort.minutes} phút, cần ${totalDays} ngày`;
        suggestion.confidence = Math.min(0.7, effort.confidence);

        return suggestion;
    }

    // ========== PUBLIC API ==========
    return {
        detectDependencies,
        estimateEffort,
        detectRecurringPatterns,
        suggestDueDate,

        // Utilities
        groupByProject,
        similarity
    };
})();

// Export
if (typeof window !== 'undefined') {
    window.TaskDependencies = TaskDependencies;
}
