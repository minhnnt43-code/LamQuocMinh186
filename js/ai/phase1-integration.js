/**
 * ============================================================
 * AI PHASE 1 INTEGRATION - LifeOS 2026
 * ============================================================
 * Integrates all Phase 1 AI modules:
 * - AI Memory
 * - Abbreviations
 * - Date Parser
 * - Task Templates
 * - Smart Priority
 * ============================================================
 */

const AIPhase1 = (function () {
    'use strict';

    let initialized = false;

    // ========== INITIALIZATION ==========

    /**
     * Initialize all Phase 1 modules
     */
    function init() {
        if (initialized) return;

        console.log('🚀 Initializing AI Phase 1 modules...');

        // Init each module
        if (window.AIMemory) {
            window.AIMemory.init();
            console.log('  ✓ AI Memory');
        }

        if (window.Abbreviations) {
            window.Abbreviations.init();
            console.log('  ✓ Abbreviations');
        }

        if (window.TaskTemplates) {
            window.TaskTemplates.init();
            console.log('  ✓ Task Templates');
        }

        // DateParser and SmartPriority don't need init

        initialized = true;
        console.log('✅ AI Phase 1 ready!');

        // Dispatch event for other modules
        document.dispatchEvent(new CustomEvent('ai-phase1-ready'));
    }

    // ========== SMART TASK CREATION ==========

    /**
     * Process natural language input to create task
     * Combines all Phase 1 features
     * @param {string} input - Natural language input
     * @returns {Object} Processed task with suggestions
     */
    function processTaskInput(input) {
        if (!input) return null;

        let processedInput = input;
        const suggestions = {
            expansions: [],
            date: null,
            time: null,
            template: null,
            priority: null,
            tags: [],
            category: null
        };

        // Step 1: Expand abbreviations
        if (window.Abbreviations) {
            const { expanded, replacements } = window.Abbreviations.expand(processedInput);
            processedInput = expanded;
            suggestions.expansions = replacements;
        }

        // Step 2: Parse date/time
        if (window.DateParser) {
            const dateResult = window.DateParser.parse(processedInput);
            if (dateResult) {
                suggestions.date = dateResult.date;
                suggestions.time = dateResult.time;
                suggestions.dateDetected = dateResult.detected;
            }
        }

        // Step 3: Check for matching templates
        if (window.TaskTemplates) {
            const templates = window.TaskTemplates.suggestFromName(processedInput);
            if (templates.length > 0) {
                suggestions.template = templates[0]; // Top match
                suggestions.allTemplates = templates;
            }
        }

        // Step 4: Analyze priority and tags
        if (window.SmartPriority) {
            const emojiIntent = window.SmartPriority.parseEmojis(processedInput);

            if (emojiIntent.urgency || emojiIntent.importance) {
                const avgScore = ((emojiIntent.urgency || 5) + (emojiIntent.importance || 5)) / 2;
                suggestions.priority = avgScore >= 7 ? 'high' : avgScore >= 4 ? 'medium' : 'low';
            }

            suggestions.tags = window.SmartPriority.suggestTags({ name: processedInput });
            suggestions.category = emojiIntent.category ||
                window.SmartPriority.suggestCategory({ name: processedInput });
        }

        // Step 5: Build task object
        const task = {
            name: cleanTaskName(processedInput, suggestions.dateDetected),
            originalInput: input,
            processedInput: processedInput,
            dueDate: suggestions.date ? formatDateForInput(suggestions.date) : null,
            priority: suggestions.priority || 'medium',
            category: suggestions.category,
            tags: suggestions.tags,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        // Apply template subtasks if matched
        if (suggestions.template && suggestions.template.subtasks) {
            task.subtasks = suggestions.template.subtasks.map(st => ({ ...st }));
            task.estimatedTime = suggestions.template.estimatedTime;
        }

        // Add to AI Memory context
        if (window.AIMemory) {
            window.AIMemory.addContext('task_created', {
                name: task.name,
                input: input
            });
        }

        return {
            task,
            suggestions,
            confidence: calculateConfidence(suggestions)
        };
    }

    /**
     * Clean task name by removing detected date/time text
     */
    function cleanTaskName(text, dateDetected) {
        if (!dateDetected) return text.trim();

        // Remove the detected date portion
        return text.replace(new RegExp(escapeRegex(dateDetected), 'gi'), '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function formatDateForInput(date) {
        if (!date) return null;
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function calculateConfidence(suggestions) {
        let confidence = 0.5; // Base confidence

        if (suggestions.date) confidence += 0.2;
        if (suggestions.template) confidence += 0.15;
        if (suggestions.category) confidence += 0.1;
        if (suggestions.tags.length > 0) confidence += 0.05;

        return Math.min(1, confidence);
    }

    // ========== ENHANCED TASK ANALYSIS ==========

    /**
     * Analyze a task and provide AI insights
     * @param {Object} task - Task object
     * @returns {Object} Analysis results
     */
    function analyzeTask(task) {
        const analysis = {
            priorityScore: null,
            estimatedTime: null,
            suggestedTags: [],
            suggestedCategory: null,
            patterns: null,
            recommendations: []
        };

        // Priority analysis
        if (window.SmartPriority) {
            const scoreResult = window.SmartPriority.calculateScore(task);
            analysis.priorityScore = scoreResult.score;
            analysis.priorityLevel = scoreResult.level;
            analysis.priorityBreakdown = scoreResult.breakdown;
            analysis.suggestedTags = window.SmartPriority.suggestTags(task);
            analysis.suggestedCategory = window.SmartPriority.suggestCategory(task);
            analysis.recommendations = scoreResult.recommendations;
        }

        // Time estimation from memory
        if (window.AIMemory && task.category) {
            const estimatedTime = window.AIMemory.predictCompletionTime(task.category);
            if (estimatedTime) {
                analysis.estimatedTime = estimatedTime;
                analysis.timeEstimateSource = 'historical';
            }
        }

        // Template-based estimation
        if (!analysis.estimatedTime && window.TaskTemplates) {
            const templates = window.TaskTemplates.suggestFromName(task.name);
            if (templates.length > 0 && templates[0].estimatedTime) {
                analysis.estimatedTime = templates[0].estimatedTime;
                analysis.timeEstimateSource = 'template';
            }
        }

        // Get relevant patterns from memory
        if (window.AIMemory) {
            analysis.patterns = {
                peakHours: window.AIMemory.getPeakHours(),
                topCategories: window.AIMemory.getTopCategories(3),
                mostProductiveDay: window.AIMemory.getMostProductiveDay()
            };
        }

        return analysis;
    }

    /**
     * Batch analyze and auto-prioritize tasks
     * @param {Array} tasks 
     * @returns {Array} Tasks with analysis
     */
    function batchAnalyze(tasks) {
        if (!window.SmartPriority) return tasks;

        const analyzed = window.SmartPriority.autoPrioritize(tasks);
        const sorted = window.SmartPriority.sortByScore(analyzed);

        return sorted.map(task => ({
            ...task,
            analysis: analyzeTask(task)
        }));
    }

    // ========== CONTEXT AWARENESS ==========

    /**
     * Resolve context references like "cái đó", "việc hôm qua"
     * @param {string} input - User input
     * @returns {Object|null} Resolved context
     */
    function resolveContext(input) {
        if (!window.AIMemory) return null;
        return window.AIMemory.findRelevantContext(input);
    }

    /**
     * Get smart suggestions based on current context
     * @returns {Object} Suggestions
     */
    function getSmartSuggestions() {
        const suggestions = {
            templates: [],
            focus: [],
            tags: []
        };

        // Top used templates
        if (window.TaskTemplates) {
            const templates = window.TaskTemplates.getAll();
            suggestions.templates = Object.entries(templates)
                .slice(0, 5)
                .map(([id, t]) => ({ id, ...t }));
        }

        // Focus suggestions based on time
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) {
            suggestions.focus = ['Làm việc quan trọng nhất buổi sáng', 'Review kế hoạch ngày'];
        } else if (hour >= 12 && hour < 14) {
            suggestions.focus = ['Nghỉ trưa', 'Tasks nhẹ sau ăn'];
        } else if (hour >= 14 && hour < 18) {
            suggestions.focus = ['Meeting', 'Collaboration tasks'];
        } else {
            suggestions.focus = ['Review ngày', 'Chuẩn bị ngày mai'];
        }

        // Popular tags from memory
        if (window.AIMemory) {
            suggestions.tags = window.AIMemory.getTopTags(5).map(t => t.tag);
        }

        return suggestions;
    }

    // ========== STATS & INSIGHTS ==========

    /**
     * Get comprehensive AI stats
     * @returns {Object}
     */
    function getStats() {
        const stats = {
            memory: null,
            abbreviations: null,
            templates: null
        };

        if (window.AIMemory) {
            stats.memory = window.AIMemory.getMemoryStats();
        }

        if (window.Abbreviations) {
            stats.abbreviations = window.Abbreviations.getStats();
        }

        if (window.TaskTemplates) {
            const all = window.TaskTemplates.getAll();
            stats.templates = {
                total: Object.keys(all).length,
                categories: window.TaskTemplates.getCategories()
            };
        }

        return stats;
    }

    // ========== HOOKS FOR EXISTING SYSTEM ==========

    /**
     * Hook: Call when a task is completed
     * @param {Object} task 
     */
    function onTaskCompleted(task) {
        if (window.AIMemory) {
            window.AIMemory.rememberCompletedTask(task);
        }
    }

    /**
     * Hook: Call when user creates/mentions a task
     * @param {Object} task 
     */
    function onTaskMentioned(task) {
        if (window.AIMemory) {
            window.AIMemory.addContext('task_mentioned', {
                id: task.id,
                name: task.name
            });
        }
    }

    // ========== PUBLIC API ==========
    return {
        init,

        // Main features
        processTaskInput,
        analyzeTask,
        batchAnalyze,

        // Context
        resolveContext,
        getSmartSuggestions,

        // Stats
        getStats,

        // Hooks
        onTaskCompleted,
        onTaskMentioned,

        // Check if ready
        get isReady() { return initialized; }
    };
})();

// Auto-init on DOM ready
if (typeof window !== 'undefined') {
    window.AIPhase1 = AIPhase1;

    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure other modules are loaded
        setTimeout(() => {
            AIPhase1.init();
        }, 100);
    });
}
