/**
 * ============================================================
 * TASK DECOMPOSITION AI - LifeOS 2026
 * ============================================================
 * Feature #17: AI Task Decomposition 2.0 (GTD method)
 * Feature #18: Milestone Generation
 * Feature #20: Smart Merge Tasks
 * ============================================================
 */

const TaskDecomposition = (function () {
    'use strict';

    // ========== GTD DECOMPOSITION ==========

    /**
     * Phân chia task thành subtasks theo phương pháp GTD
     * @param {Object} task - Task lớn cần chia
     * @param {Object} options - Options
     * @returns {Object} Task với subtasks
     */
    function decompose(task, options = {}) {
        const {
            maxSubtasks = 7,    // Max subtasks (7±2 rule)
            minDuration = 15,   // Min 15 phút/subtask
            use2MinRule = true  // Apply 2-minute rule
        } = options;

        const result = {
            originalTask: task,
            subtasks: [],
            milestones: [],
            twoMinuteTasks: [],
            recommendations: []
        };

        // Get appropriate decomposition based on task type
        const decompositionStrategy = selectStrategy(task);

        switch (decompositionStrategy) {
            case 'template':
                result.subtasks = decomposeFromTemplate(task);
                break;
            case 'ai-suggest':
                result.subtasks = decomposeWithAI(task);
                break;
            case 'keyword':
                result.subtasks = decomposeFromKeywords(task);
                break;
            default:
                result.subtasks = generateGenericSubtasks(task);
        }

        // Apply 2-minute rule
        if (use2MinRule) {
            const separated = apply2MinuteRule(result.subtasks);
            result.subtasks = separated.regular;
            result.twoMinuteTasks = separated.quick;
        }

        // Limit subtasks
        if (result.subtasks.length > maxSubtasks) {
            // Group some subtasks
            result.subtasks = consolidateSubtasks(result.subtasks, maxSubtasks);
        }

        // Generate milestones for long tasks
        if (task.estimatedTime && task.estimatedTime > 240) { // > 4 hours
            result.milestones = generateMilestones(task, result.subtasks);
        }

        // Add recommendations
        result.recommendations = generateRecommendations(task, result);

        return result;
    }

    /**
     * Chọn strategy phân chia phù hợp
     */
    function selectStrategy(task) {
        // Check template match
        if (window.TaskTemplates) {
            const templates = window.TaskTemplates.suggestFromName(task.name);
            if (templates.length > 0 && templates[0].subtasks) {
                return 'template';
            }
        }

        // Check if AI available
        if (window.AIPhase1 && window.AIPhase1.isReady) {
            return 'ai-suggest';
        }

        // Keyword-based
        return 'keyword';
    }

    /**
     * Phân chia từ template
     */
    function decomposeFromTemplate(task) {
        if (!window.TaskTemplates) return [];

        const templates = window.TaskTemplates.suggestFromName(task.name);
        if (templates.length === 0) return [];

        const template = templates[0];
        return (template.subtasks || []).map(st => ({
            ...st,
            id: generateId(),
            parentId: task.id,
            done: false,
            createdAt: new Date().toISOString()
        }));
    }

    /**
     * Phân chia bằng AI gợi ý
     */
    function decomposeWithAI(task) {
        // This would call AI API, for now use rule-based
        return decomposeFromKeywords(task);
    }

    /**
     * Phân chia dựa trên keywords
     */
    function decomposeFromKeywords(task) {
        const taskName = (task.name || '').toLowerCase();
        const subtasks = [];

        // Common patterns
        const patterns = [
            {
                keywords: ['báo cáo', 'report', 'bài tập'],
                steps: [
                    'Nghiên cứu và thu thập thông tin',
                    'Lập dàn ý/outline',
                    'Viết nội dung chính',
                    'Review và chỉnh sửa',
                    'Format và hoàn thiện'
                ]
            },
            {
                keywords: ['họp', 'meeting'],
                steps: [
                    'Xác nhận thời gian và địa điểm',
                    'Chuẩn bị tài liệu/agenda',
                    'Thông báo cho thành viên',
                    'Ghi chú trong buổi họp',
                    'Gửi meeting notes'
                ]
            },
            {
                keywords: ['dự án', 'project'],
                steps: [
                    'Phân tích yêu cầu',
                    'Lên kế hoạch chi tiết',
                    'Triển khai giai đoạn 1',
                    'Review và điều chỉnh',
                    'Hoàn thiện và bàn giao'
                ]
            },
            {
                keywords: ['nghiên cứu', 'research'],
                steps: [
                    'Xác định câu hỏi nghiên cứu',
                    'Tìm kiếm tài liệu liên quan',
                    'Đọc và tổng hợp',
                    'Phân tích và đánh giá',
                    'Viết kết luận'
                ]
            },
            {
                keywords: ['học', 'ôn', 'exam'],
                steps: [
                    'Tổng hợp tài liệu cần học',
                    'Đọc và ghi chú',
                    'Làm bài tập/đề mẫu',
                    'Ôn lại phần khó',
                    'Self-test'
                ]
            },
            {
                keywords: ['viết', 'soạn', 'tạo'],
                steps: [
                    'Brainstorm ý tưởng',
                    'Lập outline',
                    'Viết draft đầu tiên',
                    'Chỉnh sửa và hoàn thiện',
                    'Review lần cuối'
                ]
            },
            {
                keywords: ['sự kiện', 'event'],
                steps: [
                    'Lên ý tưởng và mục tiêu',
                    'Lập kế hoạch chi tiết',
                    'Chuẩn bị logistics',
                    'Truyền thông và đăng ký',
                    'Tổ chức và follow-up'
                ]
            }
        ];

        // Find matching pattern
        for (const pattern of patterns) {
            if (pattern.keywords.some(kw => taskName.includes(kw))) {
                return pattern.steps.map((step, idx) => ({
                    id: generateId(),
                    name: step,
                    parentId: task.id,
                    done: false,
                    order: idx,
                    createdAt: new Date().toISOString()
                }));
            }
        }

        // Default decomposition
        return generateGenericSubtasks(task);
    }

    /**
     * Tạo subtasks chung
     */
    function generateGenericSubtasks(task) {
        return [
            { name: 'Xác định mục tiêu và yêu cầu', done: false },
            { name: 'Thu thập thông tin cần thiết', done: false },
            { name: 'Thực hiện phần chính', done: false },
            { name: 'Review và hoàn thiện', done: false }
        ].map((st, idx) => ({
            ...st,
            id: generateId(),
            parentId: task.id,
            order: idx,
            createdAt: new Date().toISOString()
        }));
    }

    /**
     * Áp dụng 2-minute rule
     */
    function apply2MinuteRule(subtasks) {
        const quick = [];
        const regular = [];

        const quickKeywords = ['gọi', 'gửi', 'check', 'xác nhận', 'reply',
            'trả lời', 'book', 'đặt', 'download', 'tải'];

        subtasks.forEach(st => {
            const name = (st.name || '').toLowerCase();
            const isQuick = quickKeywords.some(kw => name.includes(kw));

            if (isQuick) {
                quick.push({ ...st, estimatedMinutes: 2 });
            } else {
                regular.push(st);
            }
        });

        return { quick, regular };
    }

    /**
     * Gộp subtasks khi quá nhiều
     */
    function consolidateSubtasks(subtasks, maxCount) {
        if (subtasks.length <= maxCount) return subtasks;

        // Group by phase
        const phases = Math.ceil(subtasks.length / 3);
        const consolidated = [];

        for (let i = 0; i < phases && consolidated.length < maxCount; i++) {
            const start = i * 3;
            const group = subtasks.slice(start, start + 3);

            if (group.length === 1) {
                consolidated.push(group[0]);
            } else {
                consolidated.push({
                    id: generateId(),
                    name: `Giai đoạn ${i + 1}: ${group[0].name}...`,
                    done: false,
                    children: group,
                    createdAt: new Date().toISOString()
                });
            }
        }

        return consolidated;
    }

    // ========== MILESTONE GENERATION ==========

    /**
     * Tạo milestones cho task lớn
     * @param {Object} task - Task gốc
     * @param {Array} subtasks - Subtasks đã phân chia
     * @returns {Array} Milestones
     */
    function generateMilestones(task, subtasks = []) {
        const milestones = [];
        const totalTime = task.estimatedTime || 240;
        const numMilestones = Math.min(4, Math.ceil(totalTime / 120)); // 1 milestone per 2 hours

        if (subtasks.length === 0) {
            // Generate time-based milestones
            for (let i = 1; i <= numMilestones; i++) {
                const percent = Math.round((i / numMilestones) * 100);
                milestones.push({
                    id: generateId(),
                    name: `Milestone ${i}: ${percent}% hoàn thành`,
                    percent,
                    dueOffset: Math.round((i / numMilestones) * getDaysFromMinutes(totalTime)),
                    status: 'pending'
                });
            }
        } else {
            // Generate subtask-based milestones
            const subtasksPerMilestone = Math.ceil(subtasks.length / numMilestones);

            for (let i = 1; i <= numMilestones; i++) {
                const endIdx = Math.min(i * subtasksPerMilestone, subtasks.length);
                const subtaskNames = subtasks.slice((i - 1) * subtasksPerMilestone, endIdx)
                    .map(st => st.name)
                    .join(', ');

                milestones.push({
                    id: generateId(),
                    name: `Milestone ${i}: Hoàn thành ${subtaskNames.substring(0, 50)}${subtaskNames.length > 50 ? '...' : ''}`,
                    subtaskIds: subtasks.slice((i - 1) * subtasksPerMilestone, endIdx).map(st => st.id),
                    percent: Math.round((endIdx / subtasks.length) * 100),
                    status: 'pending'
                });
            }
        }

        return milestones;
    }

    function getDaysFromMinutes(minutes) {
        return Math.ceil(minutes / (60 * 3)); // 3 hours work per day
    }

    // ========== SMART MERGE ==========

    /**
     * Gợi ý merge các tasks tương tự
     * @param {Array} tasks - Danh sách tasks
     * @returns {Array} Merge suggestions
     */
    function suggestMerge(tasks) {
        const suggestions = [];

        if (!tasks || tasks.length < 2) return suggestions;

        // Find similar tasks
        const processed = new Set();

        tasks.forEach(task => {
            if (processed.has(task.id)) return;

            const similar = tasks.filter(other => {
                if (other.id === task.id || processed.has(other.id)) return false;
                return areSimilarTasks(task, other);
            });

            if (similar.length > 0) {
                const group = [task, ...similar];
                group.forEach(t => processed.add(t.id));

                suggestions.push({
                    tasks: group,
                    mergedName: generateMergedName(group),
                    reason: getMergeReason(group),
                    action: 'merge'
                });
            }
        });

        return suggestions;
    }

    /**
     * Kiểm tra 2 tasks có tương tự không
     */
    function areSimilarTasks(task1, task2) {
        const name1 = (task1.name || '').toLowerCase();
        const name2 = (task2.name || '').toLowerCase();

        // Same category and similar priority
        if (task1.category !== task2.category) return false;

        // Name similarity
        const words1 = new Set(name1.split(/\s+/).filter(w => w.length > 2));
        const words2 = new Set(name2.split(/\s+/).filter(w => w.length > 2));

        const intersection = [...words1].filter(w => words2.has(w));
        const unionSize = new Set([...words1, ...words2]).size;

        const similarity = unionSize > 0 ? intersection.length / unionSize : 0;

        return similarity > 0.4;
    }

    /**
     * Tạo tên merged
     */
    function generateMergedName(tasks) {
        // Find common words
        const allNames = tasks.map(t => (t.name || '').toLowerCase());
        const wordCounts = {};

        allNames.forEach(name => {
            const words = name.split(/\s+/).filter(w => w.length > 2);
            words.forEach(word => {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            });
        });

        // Get common words (appear in all)
        const commonWords = Object.entries(wordCounts)
            .filter(([_, count]) => count >= tasks.length * 0.7)
            .map(([word]) => word)
            .slice(0, 5);

        if (commonWords.length > 0) {
            return `${capitalizeFirst(commonWords.join(' '))} (${tasks.length} tasks gộp)`;
        }

        return `${tasks[0].name} và ${tasks.length - 1} tasks khác`;
    }

    function getMergeReason(tasks) {
        return `${tasks.length} tasks tương tự có thể gộp để quản lý hiệu quả hơn`;
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ========== UTILITIES ==========

    function generateId() {
        return 'st_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function generateRecommendations(task, result) {
        const recommendations = [];

        if (result.twoMinuteTasks.length > 0) {
            recommendations.push({
                type: 'quick-win',
                message: `Có ${result.twoMinuteTasks.length} việc nhỏ (<2 phút) - làm ngay!`,
                tasks: result.twoMinuteTasks
            });
        }

        if (result.subtasks.length > 5) {
            recommendations.push({
                type: 'focus',
                message: 'Task phức tạp - tập trung vào 3 subtasks đầu tiên'
            });
        }

        if (result.milestones.length > 0) {
            recommendations.push({
                type: 'milestone',
                message: `Đặt ${result.milestones.length} milestones để theo dõi tiến độ`
            });
        }

        return recommendations;
    }

    // ========== PUBLIC API ==========
    return {
        decompose,
        generateMilestones,
        suggestMerge,

        // Utilities
        apply2MinuteRule,
        areSimilarTasks,
        generateId
    };
})();

// Export
if (typeof window !== 'undefined') {
    window.TaskDecomposition = TaskDecomposition;
}
