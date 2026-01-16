/**
 * ============================================================
 * AI CONTEXT MEMORY ENGINE - LifeOS 2026
 * ============================================================
 * Feature #1: Lưu trữ và nhớ bối cảnh 30 ngày gần nhất
 * - Tasks đã hoàn thành
 * - Patterns người dùng
 * - Preferences cá nhân
 * ============================================================
 */

const AIMemory = (function () {
    'use strict';

    // ========== CONSTANTS ==========
    const MEMORY_KEY = 'lifeos_ai_memory';
    const MAX_MEMORY_DAYS = 30;
    const MAX_ITEMS_PER_TYPE = 500;

    // ========== MEMORY STRUCTURE ==========
    let memoryStore = {
        // Task completion history
        completedTasks: [],

        // User behavior patterns
        patterns: {
            peakHours: [],           // Giờ làm việc hiệu quả nhất
            preferredCategories: {}, // Category hay dùng
            avgCompletionTime: {},   // Thời gian trung bình theo category
            commonTags: {},          // Tags hay dùng
            weekdayActivity: [0, 0, 0, 0, 0, 0, 0] // Activity by day of week
        },

        // User preferences learned
        preferences: {
            priorityBias: 'balanced',     // 'urgent', 'important', 'balanced'
            workingHoursStart: 8,
            workingHoursEnd: 18,
            breakPreference: 'pomodoro',  // 'pomodoro', 'ultradian', 'custom'
            reminderStyle: 'gentle'       // 'gentle', 'persistent', 'minimal'
        },

        // Recent context for conversations
        recentContext: [],

        // Last updated timestamp
        lastUpdated: null
    };

    // ========== INITIALIZATION ==========

    /**
     * Khởi tạo AI Memory từ localStorage
     */
    function init() {
        try {
            const saved = localStorage.getItem(MEMORY_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                memoryStore = { ...memoryStore, ...parsed };
                cleanOldMemories();
            }
            console.log('🧠 AI Memory initialized with', memoryStore.completedTasks.length, 'task records');
        } catch (error) {
            console.error('AI Memory init error:', error);
        }
        return memoryStore;
    }

    /**
     * Lưu memory vào localStorage
     */
    function save() {
        try {
            memoryStore.lastUpdated = new Date().toISOString();
            localStorage.setItem(MEMORY_KEY, JSON.stringify(memoryStore));
        } catch (error) {
            console.error('AI Memory save error:', error);
        }
    }

    // ========== TASK MEMORY ==========

    /**
     * Ghi nhớ task đã hoàn thành
     * @param {Object} task - Task object vừa complete
     */
    function rememberCompletedTask(task) {
        const taskMemory = {
            id: task.id,
            name: task.name || task.title,
            category: task.category,
            priority: task.priority,
            tags: task.tags || [],
            completedAt: new Date().toISOString(),
            createdAt: task.createdAt,
            estimatedTime: task.estimatedTime,
            actualTime: task.actualTime,
            dayOfWeek: new Date().getDay()
        };

        memoryStore.completedTasks.unshift(taskMemory);

        // Keep only recent items
        if (memoryStore.completedTasks.length > MAX_ITEMS_PER_TYPE) {
            memoryStore.completedTasks = memoryStore.completedTasks.slice(0, MAX_ITEMS_PER_TYPE);
        }

        // Update patterns
        updatePatterns(taskMemory);
        save();
    }

    /**
     * Cập nhật patterns từ task vừa hoàn thành
     */
    function updatePatterns(taskMemory) {
        const hour = new Date(taskMemory.completedAt).getHours();
        const day = taskMemory.dayOfWeek;
        const category = taskMemory.category || 'uncategorized';

        // Peak hours
        if (!memoryStore.patterns.peakHours[hour]) {
            memoryStore.patterns.peakHours[hour] = 0;
        }
        memoryStore.patterns.peakHours[hour]++;

        // Preferred categories
        if (!memoryStore.patterns.preferredCategories[category]) {
            memoryStore.patterns.preferredCategories[category] = 0;
        }
        memoryStore.patterns.preferredCategories[category]++;

        // Weekday activity
        memoryStore.patterns.weekdayActivity[day]++;

        // Common tags
        if (taskMemory.tags && taskMemory.tags.length > 0) {
            taskMemory.tags.forEach(tag => {
                if (!memoryStore.patterns.commonTags[tag]) {
                    memoryStore.patterns.commonTags[tag] = 0;
                }
                memoryStore.patterns.commonTags[tag]++;
            });
        }

        // Average completion time by category
        if (taskMemory.actualTime) {
            if (!memoryStore.patterns.avgCompletionTime[category]) {
                memoryStore.patterns.avgCompletionTime[category] = {
                    total: 0,
                    count: 0
                };
            }
            memoryStore.patterns.avgCompletionTime[category].total += taskMemory.actualTime;
            memoryStore.patterns.avgCompletionTime[category].count++;
        }
    }

    // ========== CONTEXT MEMORY ==========

    /**
     * Thêm context gần đây (cho conversations)
     * @param {string} type - Loại context: 'task_created', 'query', 'action'
     * @param {Object} data - Data context
     */
    function addContext(type, data) {
        const context = {
            type,
            data,
            timestamp: new Date().toISOString()
        };

        memoryStore.recentContext.unshift(context);

        // Keep only last 50 contexts
        if (memoryStore.recentContext.length > 50) {
            memoryStore.recentContext = memoryStore.recentContext.slice(0, 50);
        }

        save();
    }

    /**
     * Lấy context gần đây
     * @param {number} limit - Số lượng context cần lấy
     * @returns {Array}
     */
    function getRecentContext(limit = 10) {
        return memoryStore.recentContext.slice(0, limit);
    }

    /**
     * Tìm context phù hợp với query
     * @param {string} query - Query để tìm
     * @returns {Object|null}
     */
    function findRelevantContext(query) {
        const lowerQuery = query.toLowerCase();

        // Các từ khóa reference
        const referenceWords = ['cái đó', 'việc đó', 'task đó', 'công việc đó',
            'hôm qua', 'lúc nãy', 'vừa nãy', 'cái trước'];

        const hasReference = referenceWords.some(word => lowerQuery.includes(word));

        if (hasReference) {
            // Tìm task context gần nhất
            const taskContext = memoryStore.recentContext.find(c =>
                c.type === 'task_created' || c.type === 'task_mentioned'
            );
            if (taskContext) {
                return taskContext.data;
            }
        }

        return null;
    }

    // ========== PATTERN INSIGHTS ==========

    /**
     * Lấy giờ làm việc hiệu quả nhất
     * @returns {Array} Top 3 giờ hiệu quả
     */
    function getPeakHours() {
        const hours = memoryStore.patterns.peakHours;
        const sorted = Object.entries(hours)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour, count]) => ({
                hour: parseInt(hour),
                count,
                label: `${hour}:00 - ${parseInt(hour) + 1}:00`
            }));

        return sorted;
    }

    /**
     * Lấy categories hay dùng nhất
     * @returns {Array}
     */
    function getTopCategories(limit = 5) {
        return Object.entries(memoryStore.patterns.preferredCategories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([category, count]) => ({ category, count }));
    }

    /**
     * Lấy tags hay dùng nhất
     * @returns {Array}
     */
    function getTopTags(limit = 10) {
        return Object.entries(memoryStore.patterns.commonTags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([tag, count]) => ({ tag, count }));
    }

    /**
     * Dự đoán thời gian hoàn thành task
     * @param {string} category - Category của task
     * @returns {number|null} Thời gian ước tính (phút)
     */
    function predictCompletionTime(category) {
        const data = memoryStore.patterns.avgCompletionTime[category];
        if (data && data.count > 0) {
            return Math.round(data.total / data.count);
        }
        return null;
    }

    /**
     * Lấy ngày làm việc hiệu quả nhất trong tuần
     * @returns {Object}
     */
    function getMostProductiveDay() {
        const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const activity = memoryStore.patterns.weekdayActivity;

        let maxIndex = 0;
        let maxValue = activity[0];

        activity.forEach((val, idx) => {
            if (val > maxValue) {
                maxValue = val;
                maxIndex = idx;
            }
        });

        return {
            day: days[maxIndex],
            dayIndex: maxIndex,
            tasksCompleted: maxValue
        };
    }

    // ========== PREFERENCES ==========

    /**
     * Cập nhật preferences người dùng
     * @param {Object} prefs - Preferences mới
     */
    function updatePreferences(prefs) {
        memoryStore.preferences = { ...memoryStore.preferences, ...prefs };
        save();
    }

    /**
     * Lấy preferences hiện tại
     * @returns {Object}
     */
    function getPreferences() {
        return { ...memoryStore.preferences };
    }

    // ========== UTILITIES ==========

    /**
     * Xóa memories cũ hơn MAX_MEMORY_DAYS
     */
    function cleanOldMemories() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - MAX_MEMORY_DAYS);
        const cutoffISO = cutoffDate.toISOString();

        // Clean completed tasks
        memoryStore.completedTasks = memoryStore.completedTasks.filter(
            task => task.completedAt > cutoffISO
        );

        // Clean context
        memoryStore.recentContext = memoryStore.recentContext.filter(
            ctx => ctx.timestamp > cutoffISO
        );

        save();
    }

    /**
     * Lấy thống kê tổng quan
     * @returns {Object}
     */
    function getMemoryStats() {
        return {
            totalTasksRemembered: memoryStore.completedTasks.length,
            recentContextCount: memoryStore.recentContext.length,
            peakHours: getPeakHours(),
            topCategories: getTopCategories(3),
            topTags: getTopTags(5),
            mostProductiveDay: getMostProductiveDay(),
            lastUpdated: memoryStore.lastUpdated
        };
    }

    /**
     * Xóa toàn bộ memory (reset)
     */
    function clearAll() {
        localStorage.removeItem(MEMORY_KEY);
        memoryStore = {
            completedTasks: [],
            patterns: {
                peakHours: [],
                preferredCategories: {},
                avgCompletionTime: {},
                commonTags: {},
                weekdayActivity: [0, 0, 0, 0, 0, 0, 0]
            },
            preferences: {
                priorityBias: 'balanced',
                workingHoursStart: 8,
                workingHoursEnd: 18,
                breakPreference: 'pomodoro',
                reminderStyle: 'gentle'
            },
            recentContext: [],
            lastUpdated: null
        };
        console.log('🧠 AI Memory cleared');
    }

    /**
     * Export memory để backup
     * @returns {string} JSON string
     */
    function exportMemory() {
        return JSON.stringify(memoryStore, null, 2);
    }

    /**
     * Import memory từ backup
     * @param {string} jsonString - JSON string
     */
    function importMemory(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            memoryStore = { ...memoryStore, ...data };
            save();
            console.log('🧠 AI Memory imported successfully');
        } catch (error) {
            console.error('AI Memory import error:', error);
        }
    }

    // ========== PUBLIC API ==========
    return {
        init,
        save,

        // Task memory
        rememberCompletedTask,

        // Context memory
        addContext,
        getRecentContext,
        findRelevantContext,

        // Pattern insights
        getPeakHours,
        getTopCategories,
        getTopTags,
        predictCompletionTime,
        getMostProductiveDay,

        // Preferences
        updatePreferences,
        getPreferences,

        // Utilities
        getMemoryStats,
        clearAll,
        exportMemory,
        importMemory
    };
})();

// Auto-init when script loads
if (typeof window !== 'undefined') {
    window.AIMemory = AIMemory;
    document.addEventListener('DOMContentLoaded', () => {
        AIMemory.init();
    });
}
