// ============================================================
// TASK-SWITCHER.JS - Intelligent Task Switching
// Phase 6: Context Intelligence
// ============================================================

/**
 * Task Switcher - Manages context switching between tasks
 */

import { contextEngine } from './context-engine.js';

export class TaskSwitcher {
    constructor() {
        this.config = {
            minTaskDuration: 15,        // Minimum minutes before switch
            contextSwitchCost: 5,       // Minutes lost per switch
            maxSwitchesPerHour: 4
        };

        this.currentTask = null;
        this.taskStack = [];
        this.switchHistory = [];
    }

    // ============================================================
    // TASK SWITCHING
    // ============================================================

    /**
     * Switch to a new task
     * @param {Object} newTask - Task to switch to
     * @param {string} reason - Reason for switch
     * @returns {Object} Switch result
     */
    switchTo(newTask, reason = 'user_initiated') {
        const previousTask = this.currentTask;

        // Calculate switch cost
        const cost = this._calculateSwitchCost(previousTask, newTask);

        // Save current task to stack if incomplete
        if (previousTask && previousTask.status !== 'completed') {
            this.taskStack.push({
                task: previousTask,
                suspendedAt: new Date().toISOString(),
                progress: previousTask.progress || 0
            });
        }

        // Record switch
        this.switchHistory.push({
            from: previousTask?.id,
            to: newTask.id,
            reason,
            timestamp: new Date().toISOString(),
            cost
        });

        this.currentTask = newTask;

        return {
            switched: true,
            from: previousTask?.title,
            to: newTask.title,
            cost,
            recommendation: this._getSwitchRecommendation(cost, reason),
            stackSize: this.taskStack.length
        };
    }

    _calculateSwitchCost(fromTask, toTask) {
        if (!fromTask) return 0;

        let cost = this.config.contextSwitchCost;

        // Same project = lower cost
        if (fromTask.project === toTask.project) {
            cost *= 0.5;
        }

        // Same category = lower cost
        if (fromTask.category === toTask.category) {
            cost *= 0.7;
        }

        // Deep work to shallow = higher cost
        const fromComplexity = this._getComplexity(fromTask);
        const toComplexity = this._getComplexity(toTask);
        if (fromComplexity === 'high' && toComplexity === 'low') {
            cost *= 1.5;
        }

        // Recent switches = higher cost
        const recentSwitches = this._countRecentSwitches(60);
        if (recentSwitches >= this.config.maxSwitchesPerHour) {
            cost *= 1.5;
        }

        return Math.round(cost);
    }

    _getComplexity(task) {
        const text = `${task.title} ${task.description || ''}`.toLowerCase();
        if (['complex', 'design', 'research'].some(w => text.includes(w))) return 'high';
        if (['simple', 'quick', 'update'].some(w => text.includes(w))) return 'low';
        return 'medium';
    }

    _countRecentSwitches(minutes) {
        const cutoff = Date.now() - minutes * 60 * 1000;
        return this.switchHistory.filter(s =>
            new Date(s.timestamp).getTime() >= cutoff
        ).length;
    }

    _getSwitchRecommendation(cost, reason) {
        if (cost <= 2) return 'Smooth transition';
        if (cost <= 5) return 'Minor context shift needed';
        if (cost <= 8) return 'Take a moment to refocus';
        return 'Significant context switch - consider completing current task first';
    }

    // ============================================================
    // TASK STACK MANAGEMENT
    // ============================================================

    /**
     * Return to previous task
     * @returns {Object} Previous task or null
     */
    popTask() {
        if (this.taskStack.length === 0) {
            return { success: false, message: 'No suspended tasks' };
        }

        const suspended = this.taskStack.pop();
        const result = this.switchTo(suspended.task, 'resume_suspended');

        return {
            success: true,
            task: suspended.task,
            suspendedFor: Math.round((Date.now() - new Date(suspended.suspendedAt)) / 60000),
            ...result
        };
    }

    /**
     * Get suspended tasks
     * @returns {Array} Suspended tasks
     */
    getSuspendedTasks() {
        return this.taskStack.map(s => ({
            task: { id: s.task.id, title: s.task.title },
            suspendedAt: s.suspendedAt,
            minutesSuspended: Math.round((Date.now() - new Date(s.suspendedAt)) / 60000)
        }));
    }

    /**
     * Clear suspended tasks
     */
    clearStack() {
        const cleared = this.taskStack.length;
        this.taskStack = [];
        return { cleared };
    }

    // ============================================================
    // SWITCH ANALYSIS
    // ============================================================

    /**
     * Analyze context switching patterns
     * @returns {Object} Switch analysis
     */
    analyzeSwitchPatterns() {
        if (this.switchHistory.length < 5) {
            return { hasData: false, message: 'Not enough data' };
        }

        const totalSwitches = this.switchHistory.length;
        const totalCost = this.switchHistory.reduce((s, h) => s + h.cost, 0);

        // Group by reason
        const byReason = {};
        for (const s of this.switchHistory) {
            byReason[s.reason] = (byReason[s.reason] || 0) + 1;
        }

        // Switches per hour
        const hourGroups = {};
        for (const s of this.switchHistory) {
            const hour = new Date(s.timestamp).getHours();
            hourGroups[hour] = (hourGroups[hour] || 0) + 1;
        }

        const peakHour = Object.entries(hourGroups)
            .sort((a, b) => b[1] - a[1])[0];

        return {
            hasData: true,
            totalSwitches,
            totalCostMinutes: totalCost,
            averageCost: Math.round(totalCost / totalSwitches),
            byReason,
            peakSwitchingHour: peakHour ? parseInt(peakHour[0]) : null,
            recommendations: this._generateSwitchRecommendations(totalSwitches, totalCost, byReason)
        };
    }

    _generateSwitchRecommendations(switches, cost, byReason) {
        const recs = [];

        if (cost > 60) { // More than an hour lost
            recs.push('High context-switching cost. Try batching similar tasks.');
        }

        if (byReason.interruption > switches * 0.3) {
            recs.push('Many interruption-based switches. Consider focus blocks.');
        }

        if (byReason.user_initiated > switches * 0.5) {
            recs.push('Frequent voluntary switches. Try the Pomodoro technique.');
        }

        return recs;
    }

    // ============================================================
    // SWITCH GUIDANCE
    // ============================================================

    /**
     * Should user switch tasks?
     * @param {Object} potentialTask - Task considering switching to
     * @returns {Object} Guidance
     */
    shouldSwitch(potentialTask) {
        if (!this.currentTask) {
            return { should: true, reason: 'No current task' };
        }

        const currentProgress = this.currentTask.progress || 0;
        const timeOnTask = this._getTimeOnCurrentTask();

        // Don't switch if making progress
        if (currentProgress > 70) {
            return {
                should: false,
                reason: 'Almost done with current task',
                suggestion: `Complete current task first (${currentProgress}% done)`
            };
        }

        // Don't switch too quickly
        if (timeOnTask < this.config.minTaskDuration) {
            return {
                should: false,
                reason: 'Not enough time on current task',
                suggestion: `Give current task at least ${this.config.minTaskDuration} minutes`
            };
        }

        // Priority override
        if (potentialTask.priority === 'critical' && this.currentTask.priority !== 'critical') {
            return {
                should: true,
                reason: 'Higher priority task',
                cost: this._calculateSwitchCost(this.currentTask, potentialTask)
            };
        }

        // Deadline urgency
        if (potentialTask.deadline) {
            const daysUntil = (new Date(potentialTask.deadline) - new Date()) / (1000 * 60 * 60 * 24);
            if (daysUntil < 0.5) {
                return {
                    should: true,
                    reason: 'Urgent deadline approaching',
                    cost: this._calculateSwitchCost(this.currentTask, potentialTask)
                };
            }
        }

        // Same project = ok to switch
        if (potentialTask.project === this.currentTask.project) {
            return {
                should: true,
                reason: 'Same project context',
                cost: this._calculateSwitchCost(this.currentTask, potentialTask)
            };
        }

        return {
            should: false,
            reason: 'No compelling reason to switch',
            suggestion: 'Consider completing current task'
        };
    }

    _getTimeOnCurrentTask() {
        if (!this.currentTask) return 0;

        const lastSwitch = this.switchHistory[this.switchHistory.length - 1];
        if (!lastSwitch) return 0;

        return (Date.now() - new Date(lastSwitch.timestamp)) / 60000;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const taskSwitcher = new TaskSwitcher();

export function initTaskSwitcher() {
    console.log('🔄 [Task Switcher] Initialized');
    return taskSwitcher;
}
