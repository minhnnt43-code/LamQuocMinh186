/**
 * ============================================================
 * TASK QUICK ACTIONS - LifeOS 2026
 * ============================================================
 * Feature #21: Parallel vs Sequential Detection
 * Feature #22: Workload Calculator
 * Feature #23: Task Complexity Score
 * Feature #24: Time Buffer Suggestion
 * Feature #25: Quick Action Shortcuts
 * ============================================================
 */

const TaskQuickActions = (function () {
    'use strict';

    // ========== PARALLEL VS SEQUENTIAL ==========

    /**
     * Xác định tasks có thể làm song song hay phải tuần tự
     * @param {Array} tasks - Danh sách tasks
     * @returns {Object} Analysis result
     */
    function analyzeParallelism(tasks) {
        const result = {
            parallel: [],    // Groups of tasks that can be done in parallel
            sequential: [],  // Tasks that must be done in order
            independent: []  // Tasks with no dependencies
        };

        if (!tasks || tasks.length === 0) return result;

        // Get dependencies
        const dependencies = window.TaskDependencies
            ? window.TaskDependencies.detectDependencies(tasks)
            : { blockedBy: {}, blocking: {} };

        const dependentIds = new Set([
            ...Object.keys(dependencies.blockedBy),
            ...Object.keys(dependencies.blocking)
        ]);

        // Find independent tasks (can be parallel)
        const independentTasks = tasks.filter(t => !dependentIds.has(t.id));
        result.independent = independentTasks;

        // Group independent tasks by context (can do together)
        if (independentTasks.length >= 2) {
            const contextGroups = groupByContext(independentTasks);
            result.parallel = Object.values(contextGroups).filter(g => g.length >= 2);
        }

        // Find sequential chains
        Object.entries(dependencies.blockedBy).forEach(([taskId, blockers]) => {
            const task = tasks.find(t => t.id === taskId);
            const blockerTasks = blockers.map(id => tasks.find(t => t.id === id)).filter(Boolean);

            if (task && blockerTasks.length > 0) {
                result.sequential.push({
                    task: task,
                    mustCompleteBefore: blockerTasks,
                    order: blockerTasks.map(b => b.name).join(' → ') + ' → ' + task.name
                });
            }
        });

        return result;
    }

    /**
     * Group tasks by context (location, tool, energy level)
     */
    function groupByContext(tasks) {
        const contexts = {
            computer: [],
            phone: [],
            outside: [],
            meeting: [],
            lowEnergy: [],
            highFocus: []
        };

        const contextKeywords = {
            computer: ['email', 'làm', 'viết', 'code', 'report', 'báo cáo', 'design'],
            phone: ['gọi', 'call', 'nhắn', 'message', 'text'],
            outside: ['đi', 'mua', 'gặp', 'nộp', 'lấy', 'ship'],
            meeting: ['họp', 'meeting', 'thảo luận', 'discuss'],
            lowEnergy: ['check', 'review', 'đọc', 'xem', 'organize'],
            highFocus: ['nghiên cứu', 'phân tích', 'thesis', 'luận văn', 'exam']
        };

        tasks.forEach(task => {
            const name = (task.name || '').toLowerCase();
            let matched = false;

            for (const [context, keywords] of Object.entries(contextKeywords)) {
                if (keywords.some(kw => name.includes(kw))) {
                    contexts[context].push(task);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                contexts.computer.push(task); // Default
            }
        });

        return contexts;
    }

    // ========== WORKLOAD CALCULATOR ==========

    /**
     * Tính workload theo ngày/tuần
     * @param {Array} tasks - Tasks có due date
     * @param {string} period - 'day' | 'week'
     * @returns {Object} Workload by date
     */
    function calculateWorkload(tasks, period = 'day') {
        const workload = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        tasks.forEach(task => {
            if (!task.dueDate || task.status === 'done') return;

            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            let key;
            if (period === 'day') {
                key = dueDate.toISOString().split('T')[0];
            } else {
                // Week number
                const startOfYear = new Date(dueDate.getFullYear(), 0, 1);
                const weekNum = Math.ceil(((dueDate - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
                key = `${dueDate.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
            }

            if (!workload[key]) {
                workload[key] = {
                    date: key,
                    tasks: [],
                    totalMinutes: 0,
                    taskCount: 0,
                    overloaded: false
                };
            }

            const effort = window.TaskDependencies
                ? window.TaskDependencies.estimateEffort(task)
                : { minutes: 30 };

            workload[key].tasks.push({
                id: task.id,
                name: task.name,
                minutes: effort.minutes,
                priority: task.priority
            });
            workload[key].totalMinutes += effort.minutes;
            workload[key].taskCount++;

            // Check overload (more than 6 productive hours per day)
            const maxMinutes = period === 'day' ? 360 : 1800; // 6h/day, 30h/week
            workload[key].overloaded = workload[key].totalMinutes > maxMinutes;
        });

        return workload;
    }

    /**
     * Lấy workload summary
     */
    function getWorkloadSummary(tasks) {
        const daily = calculateWorkload(tasks, 'day');
        const weekly = calculateWorkload(tasks, 'week');

        const today = new Date().toISOString().split('T')[0];
        const todayWorkload = daily[today] || { totalMinutes: 0, taskCount: 0 };

        // Find overloaded days
        const overloadedDays = Object.values(daily).filter(d => d.overloaded);

        return {
            today: {
                minutes: todayWorkload.totalMinutes,
                hours: Math.round(todayWorkload.totalMinutes / 60 * 10) / 10,
                taskCount: todayWorkload.taskCount,
                status: todayWorkload.overloaded ? 'overloaded' :
                    todayWorkload.totalMinutes > 240 ? 'heavy' : 'normal'
            },
            overloadedDays: overloadedDays.map(d => d.date),
            weeklyTrend: Object.values(weekly).map(w => ({
                week: w.date,
                hours: Math.round(w.totalMinutes / 60)
            }))
        };
    }

    // ========== COMPLEXITY SCORE ==========

    /**
     * Đánh giá độ phức tạp của task (1-10)
     * @param {Object} task 
     * @returns {Object} Complexity analysis
     */
    function calculateComplexity(task) {
        let score = 3; // Base score
        const factors = [];

        // Factor 1: Subtasks
        if (task.subtasks && task.subtasks.length > 0) {
            const subscore = Math.min(3, task.subtasks.length / 2);
            score += subscore;
            factors.push(`${task.subtasks.length} subtasks (+${subscore.toFixed(1)})`);
        }

        // Factor 2: Dependencies
        if (task.blockedBy && task.blockedBy.length > 0) {
            score += 1;
            factors.push(`Có dependencies (+1)`);
        }

        // Factor 3: Time estimate
        const effort = window.TaskDependencies
            ? window.TaskDependencies.estimateEffort(task)
            : { minutes: 30 };

        if (effort.minutes > 120) {
            const timeScore = Math.min(2, (effort.minutes - 120) / 120);
            score += timeScore;
            factors.push(`${effort.minutes} phút (+${timeScore.toFixed(1)})`);
        }

        // Factor 4: Due date pressure
        if (task.dueDate) {
            const days = window.SmartPriority
                ? window.SmartPriority.getDaysUntilDue(task.dueDate)
                : 999;

            if (days <= 1) {
                score += 2;
                factors.push('Deadline gấp (+2)');
            } else if (days <= 3) {
                score += 1;
                factors.push('Deadline gần (+1)');
            }
        }

        // Factor 5: Keywords
        const complexKeywords = ['nghiên cứu', 'phân tích', 'design', 'architecture', 'thesis', 'luận văn'];
        const name = (task.name || '').toLowerCase();
        if (complexKeywords.some(kw => name.includes(kw))) {
            score += 1;
            factors.push('Công việc phức tạp (+1)');
        }

        score = Math.min(10, Math.max(1, Math.round(score)));

        const levels = {
            1: { label: 'Rất đơn giản', emoji: '🟢', color: '#22c55e' },
            2: { label: 'Đơn giản', emoji: '🟢', color: '#22c55e' },
            3: { label: 'Bình thường', emoji: '🟡', color: '#eab308' },
            4: { label: 'Bình thường', emoji: '🟡', color: '#eab308' },
            5: { label: 'Trung bình', emoji: '🟠', color: '#f97316' },
            6: { label: 'Trung bình+', emoji: '🟠', color: '#f97316' },
            7: { label: 'Phức tạp', emoji: '🔴', color: '#ef4444' },
            8: { label: 'Rất phức tạp', emoji: '🔴', color: '#ef4444' },
            9: { label: 'Cực kỳ phức tạp', emoji: '⚫', color: '#7c3aed' },
            10: { label: 'Epic', emoji: '⚫', color: '#7c3aed' }
        };

        return {
            score,
            level: levels[score],
            factors,
            recommendation: getComplexityRecommendation(score)
        };
    }

    function getComplexityRecommendation(score) {
        if (score <= 3) return 'Có thể làm nhanh, batch với các tasks khác';
        if (score <= 5) return 'Cần tập trung, schedule 1-2 giờ';
        if (score <= 7) return 'Cần chia nhỏ và lên kế hoạch chi tiết';
        return 'Nên chia thành milestone và track progress';
    }

    // ========== TIME BUFFER ==========

    /**
     * Gợi ý thêm buffer time cho tasks quan trọng
     * @param {Object} task 
     * @returns {Object} Buffer suggestion
     */
    function suggestBuffer(task) {
        const baseBuffer = {
            minutes: 0,
            reason: '',
            apply: false
        };

        const effort = window.TaskDependencies
            ? window.TaskDependencies.estimateEffort(task)
            : { minutes: 30 };

        // Factor 1: Priority
        if (task.priority === 'high') {
            baseBuffer.minutes += Math.ceil(effort.minutes * 0.2);
            baseBuffer.reason = 'Task quan trọng';
            baseBuffer.apply = true;
        }

        // Factor 2: External dependencies
        const name = (task.name || '').toLowerCase();
        if (['gặp', 'họp', 'meeting', 'call', 'phỏng vấn'].some(kw => name.includes(kw))) {
            baseBuffer.minutes += 15;
            baseBuffer.reason += (baseBuffer.reason ? ' + ' : '') + 'Có yếu tố ngoại vi';
            baseBuffer.apply = true;
        }

        // Factor 3: Complexity
        const complexity = calculateComplexity(task);
        if (complexity.score >= 7) {
            baseBuffer.minutes += Math.ceil(effort.minutes * 0.3);
            baseBuffer.reason += (baseBuffer.reason ? ' + ' : '') + 'Độ phức tạp cao';
            baseBuffer.apply = true;
        }

        // Factor 4: New/unfamiliar task
        if (window.AIMemory) {
            const category = task.category;
            const history = window.AIMemory.getMemoryStats().topCategories;
            const isNewCategory = !history.some(h => h.category === category);

            if (isNewCategory) {
                baseBuffer.minutes += 15;
                baseBuffer.reason += (baseBuffer.reason ? ' + ' : '') + 'Category mới';
                baseBuffer.apply = true;
            }
        }

        return baseBuffer;
    }

    // ========== QUICK ACTION SHORTCUTS ==========

    const SHORTCUTS = {
        // Task actions
        'n': { action: 'new-task', label: 'Tạo task mới', key: 'n' },
        'v': { action: 'voice-input', label: 'Nhập giọng nói', key: 'v' },
        'q': { action: 'quick-add', label: 'Quick add', key: 'q' },

        // Navigation
        't': { action: 'go-tasks', label: 'Đến Tasks', key: 't' },
        'c': { action: 'go-calendar', label: 'Đến Calendar', key: 'c' },
        'd': { action: 'go-dashboard', label: 'Dashboard', key: 'd' },

        // Views
        '1': { action: 'view-today', label: 'Xem hôm nay', key: '1' },
        '2': { action: 'view-week', label: 'Xem tuần này', key: '2' },
        '3': { action: 'view-all', label: 'Xem tất cả', key: '3' },

        // Task operations on selected
        'e': { action: 'edit', label: 'Sửa task', key: 'e' },
        'Enter': { action: 'complete', label: 'Hoàn thành', key: 'Enter' },
        'Delete': { action: 'delete', label: 'Xóa', key: 'Delete' },
        'p': { action: 'priority-cycle', label: 'Đổi priority', key: 'p' },
        's': { action: 'add-subtask', label: 'Thêm subtask', key: 's' },

        // Special
        '/': { action: 'command-palette', label: 'Command palette', key: '/' },
        '?': { action: 'show-shortcuts', label: 'Hiện shortcuts', key: '?' },
        'Escape': { action: 'close', label: 'Đóng/Cancel', key: 'Escape' }
    };

    let shortcutsEnabled = false;
    let shortcutHandler = null;

    /**
     * Enable keyboard shortcuts
     * @param {Function} actionHandler - Function(action, event)
     */
    function enableShortcuts(actionHandler) {
        if (shortcutsEnabled) return;

        shortcutHandler = (e) => {
            // Skip if typing in input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                return;
            }

            const key = e.key;
            const shortcut = SHORTCUTS[key];

            if (shortcut) {
                e.preventDefault();
                if (actionHandler) {
                    actionHandler(shortcut.action, e);
                }
            }
        };

        document.addEventListener('keydown', shortcutHandler);
        shortcutsEnabled = true;
        console.log('⌨️ Shortcuts enabled');
    }

    /**
     * Disable keyboard shortcuts
     */
    function disableShortcuts() {
        if (!shortcutsEnabled) return;

        document.removeEventListener('keydown', shortcutHandler);
        shortcutHandler = null;
        shortcutsEnabled = false;
    }

    /**
     * Get all shortcuts
     */
    function getShortcuts() {
        return { ...SHORTCUTS };
    }

    /**
     * Generate shortcuts help HTML
     */
    function getShortcutsHelpHTML() {
        const groups = {
            'Tạo mới': ['n', 'v', 'q'],
            'Navigation': ['d', 't', 'c'],
            'Views': ['1', '2', '3'],
            'Task actions': ['e', 'Enter', 'Delete', 'p', 's'],
            'Khác': ['/', '?', 'Escape']
        };

        let html = '<div class="shortcuts-help">';

        for (const [group, keys] of Object.entries(groups)) {
            html += `<div class="shortcut-group"><h4>${group}</h4>`;
            keys.forEach(key => {
                const sc = SHORTCUTS[key];
                if (sc) {
                    html += `<div class="shortcut-item">
                        <kbd>${sc.key}</kbd>
                        <span>${sc.label}</span>
                    </div>`;
                }
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // ========== PUBLIC API ==========
    return {
        // Parallelism
        analyzeParallelism,
        groupByContext,

        // Workload
        calculateWorkload,
        getWorkloadSummary,

        // Complexity
        calculateComplexity,

        // Buffer
        suggestBuffer,

        // Shortcuts
        enableShortcuts,
        disableShortcuts,
        getShortcuts,
        getShortcutsHelpHTML
    };
})();

// Export
if (typeof window !== 'undefined') {
    window.TaskQuickActions = TaskQuickActions;
}
