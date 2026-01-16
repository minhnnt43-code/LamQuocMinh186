// ============================================================
// WORKLOAD-MANAGER.JS - Workload Balancing & Management
// Phase 3: Workload & Well-being
// ============================================================

/**
 * Workload Manager - Sustainable pace enforcement and cognitive load balancing
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class WorkloadManager {
    constructor() {
        this.config = {
            maxDailyTasks: 8,
            maxDailyHours: 8,
            maxActiveProjects: 5,
            cognitiveLoadLimit: 0.8,
            sustainablePaceMultiplier: 0.85  // 85% of max capacity
        };

        this.currentLoad = {
            tasks: 0,
            hours: 0,
            cognitiveLoad: 0
        };
    }

    // ============================================================
    // WORKLOAD ASSESSMENT
    // ============================================================

    /**
     * Assess current workload
     * @param {Array} activeTasks - Currently active tasks
     * @returns {Object} Workload assessment
     */
    assessWorkload(activeTasks) {
        const taskLoad = this._calculateTaskLoad(activeTasks);
        const cognitiveLoad = this._calculateCognitiveLoad(activeTasks);
        const timeLoad = this._calculateTimeLoad(activeTasks);

        const overallLoad = (taskLoad + cognitiveLoad + timeLoad) / 3;

        this.currentLoad = {
            tasks: taskLoad,
            cognitive: cognitiveLoad,
            time: timeLoad,
            overall: overallLoad
        };

        return {
            currentLoad: this.currentLoad,
            status: this._getLoadStatus(overallLoad),
            breakdown: {
                taskCount: activeTasks.length,
                maxTasks: this.config.maxDailyTasks,
                estimatedHours: activeTasks.reduce((sum, t) => sum + (t.estimatedTime || 30) / 60, 0),
                maxHours: this.config.maxDailyHours,
                complexTaskCount: activeTasks.filter(t => this._isComplex(t)).length
            },
            recommendations: this._getLoadRecommendations(overallLoad, activeTasks),
            canAcceptMore: overallLoad < this.config.sustainablePaceMultiplier
        };
    }

    _calculateTaskLoad(tasks) {
        return Math.min(tasks.length / this.config.maxDailyTasks, 1);
    }

    _calculateCognitiveLoad(tasks) {
        let load = 0;

        for (const task of tasks) {
            const complexity = this._getComplexityWeight(task);
            const priority = this._getPriorityWeight(task);
            const hasDeadline = task.dueDate ? 0.1 : 0;

            load += complexity + priority + hasDeadline;
        }

        return Math.min(load / (this.config.maxDailyTasks * 0.5), 1);
    }

    _calculateTimeLoad(tasks) {
        const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedTime || 30) / 60, 0);
        return Math.min(totalHours / this.config.maxDailyHours, 1);
    }

    _getComplexityWeight(task) {
        const text = `${task.name || ''} ${task.notes || ''}`.toLowerCase();

        if (['complex', 'difficult', 'research', 'design', 'architecture'].some(w => text.includes(w))) {
            return 0.3;
        }
        if (['simple', 'quick', 'easy', 'minor'].some(w => text.includes(w))) {
            return 0.1;
        }
        return 0.2;
    }

    _getPriorityWeight(task) {
        const weights = { critical: 0.15, high: 0.1, medium: 0.05, low: 0.02 };
        return weights[task.priority] || 0.05;
    }

    _isComplex(task) {
        return this._getComplexityWeight(task) >= 0.3;
    }

    _getLoadStatus(load) {
        if (load >= 1) return 'overloaded';
        if (load >= 0.85) return 'heavy';
        if (load >= 0.6) return 'moderate';
        if (load >= 0.3) return 'light';
        return 'minimal';
    }

    _getLoadRecommendations(load, tasks) {
        const recommendations = [];

        if (load >= 1) {
            recommendations.push({
                priority: 'urgent',
                action: 'Reduce workload immediately',
                suggestions: this._suggestTasksToDefer(tasks)
            });
        } else if (load >= 0.85) {
            recommendations.push({
                priority: 'high',
                action: 'At capacity - avoid new tasks',
                suggestions: ['Focus on completing current tasks', 'Defer non-urgent items']
            });
        }

        const complexCount = tasks.filter(t => this._isComplex(t)).length;
        if (complexCount > 3) {
            recommendations.push({
                priority: 'medium',
                action: 'Too many complex tasks active',
                suggestions: ['Finish one complex task before starting another', 'Mix with simpler tasks']
            });
        }

        return recommendations;
    }

    _suggestTasksToDefer(tasks) {
        // Find tasks that can be deferred
        const sortedByDeferability = tasks
            .filter(t => t.priority !== 'critical')
            .sort((a, b) => {
                // Prefer deferring low priority, no deadline, lower progress
                const scoreA = this._getDeferabilityScore(a);
                const scoreB = this._getDeferabilityScore(b);
                return scoreB - scoreA;
            });

        return sortedByDeferability.slice(0, 3).map(t => ({
            taskId: t.id,
            name: t.name,
            reason: this._getDeferReason(t)
        }));
    }

    _getDeferabilityScore(task) {
        let score = 0;

        // Priority
        const priorityScores = { low: 4, medium: 2, high: 1, critical: 0 };
        score += priorityScores[task.priority] || 2;

        // Deadline
        if (!task.dueDate) {
            score += 3;
        } else {
            const daysUntil = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
            if (daysUntil > 7) score += 2;
            else if (daysUntil > 3) score += 1;
        }

        // Progress
        if ((task.progress || 0) < 20) score += 2;

        return score;
    }

    _getDeferReason(task) {
        if (task.priority === 'low') return 'Low priority';
        if (!task.deadline) return 'No deadline';
        const daysUntil = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
        if (daysUntil > 7) return 'Deadline is more than a week away';
        return 'Can be rescheduled';
    }

    // ============================================================
    // COGNITIVE LOAD BALANCING
    // ============================================================

    /**
     * Balance cognitive load across tasks
     * @param {Array} tasks - Tasks to schedule
     * @returns {Array} Reordered tasks for optimal cognitive flow
     */
    balanceCognitiveLoad(tasks) {
        // Separate by complexity
        const complex = tasks.filter(t => this._isComplex(t));
        const moderate = tasks.filter(t => !this._isComplex(t) && this._getComplexityWeight(t) > 0.15);
        const simple = tasks.filter(t => this._getComplexityWeight(t) <= 0.15);

        // Interleave: complex, simple, moderate, simple pattern
        const balanced = [];
        let ci = 0, mi = 0, si = 0;

        while (ci < complex.length || mi < moderate.length || si < simple.length) {
            // Add a complex task
            if (ci < complex.length) {
                balanced.push({ ...complex[ci], cognitiveSlot: 'deep_work' });
                ci++;
            }

            // Add a simple task as break
            if (si < simple.length) {
                balanced.push({ ...simple[si], cognitiveSlot: 'recovery' });
                si++;
            }

            // Add a moderate task
            if (mi < moderate.length) {
                balanced.push({ ...moderate[mi], cognitiveSlot: 'steady' });
                mi++;
            }

            // Add another simple if available
            if (si < simple.length) {
                balanced.push({ ...simple[si], cognitiveSlot: 'recovery' });
                si++;
            }
        }

        return balanced;
    }

    // ============================================================
    // SUSTAINABLE PACE
    // ============================================================

    /**
     * Enforce sustainable pace limits
     * @param {Object} request - Request to add task/commitment
     * @returns {Object} Decision
     */
    evaluateNewCommitment(request) {
        const { estimatedHours, complexity, deadline, priority } = request;

        const newLoad = this._projectNewLoad(request);
        const sustainable = newLoad <= this.config.sustainablePaceMultiplier;

        return {
            canAccept: sustainable,
            projectedLoad: newLoad,
            sustainableLimit: this.config.sustainablePaceMultiplier,
            decision: sustainable ? 'accept' : 'defer_or_delegate',
            recommendations: sustainable
                ? ['Add to schedule']
                : this._getOvercommitmentSuggestions(request, newLoad)
        };
    }

    _projectNewLoad(request) {
        const currentLoad = this.currentLoad.overall || 0;
        const additionalLoad = (request.estimatedHours || 1) / this.config.maxDailyHours * 0.5
            + (request.complexity === 'high' ? 0.15 : 0.05);

        return currentLoad + additionalLoad;
    }

    _getOvercommitmentSuggestions(request, projectedLoad) {
        const suggestions = [];

        if (projectedLoad > 1.2) {
            suggestions.push('Strongly recommend declining this commitment');
            suggestions.push('Current workload is already unsustainable');
        } else {
            suggestions.push('Consider deferring to next week');
            suggestions.push('Negotiate a later deadline');
            suggestions.push('Delegate part of the work');
        }

        if (request.priority === 'low' || request.priority === 'medium') {
            suggestions.push('This can wait - focus on current priorities');
        }

        return suggestions;
    }

    // ============================================================
    // PERMISSION TO DEPRIORITIZE
    // ============================================================

    /**
     * Identify tasks that can be safely deprioritized
     * @param {Array} tasks - Current tasks
     * @returns {Array} Tasks with deprioritization options
     */
    identifyDeprioritizableTasks(tasks) {
        return tasks
            .map(task => ({
                ...task,
                canDeprioritize: this._canDeprioritize(task),
                deprioritizeReason: this._getDeprioritizeReason(task),
                guilt: this._assessGuiltLevel(task),
                permission: this._grantPermission(task)
            }))
            .filter(t => t.canDeprioritize)
            .sort((a, b) => a.guilt - b.guilt); // Lower guilt first
    }

    _canDeprioritize(task) {
        if (task.priority === 'critical') return false;
        if (task.dueDate) {
            const daysUntil = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
            if (daysUntil < 2) return false;
        }
        return true;
    }

    _getDeprioritizeReason(task) {
        if (task.priority === 'low') return 'Already low priority';
        if (!task.dueDate) return 'No fixed deadline';
        if (task.dependencies?.length === 0) return 'No one is waiting on this';
        return 'Can be rescheduled';
    }

    _assessGuiltLevel(task) {
        // Lower score = less guilt about deprioritizing
        let guilt = 0.5;

        if (task.priority === 'high') guilt += 0.2;
        if (task.dueDate) guilt += 0.1;
        if (task.dependencies?.length > 0) guilt += 0.15;
        if (task.progress > 50) guilt += 0.1; // Sunk cost

        return Math.min(guilt, 1);
    }

    _grantPermission(task) {
        const messages = [
            "It's okay to postpone this.",
            "Your wellbeing matters more than this task.",
            "This can wait - take care of yourself first.",
            "Delegating or deferring is not failure.",
            "Focus on what's truly important right now."
        ];

        return messages[Math.floor(Math.random() * messages.length)];
    }

    // ============================================================
    // OVERWHELM DETECTION
    // ============================================================

    /**
     * Detect if user is overwhelmed
     * @returns {Object} Overwhelm status
     */
    detectOverwhelmState() {
        const load = this.currentLoad;
        const isOverwhelmed = load.overall >= 0.9 || load.cognitive >= 0.85;

        return {
            isOverwhelmed,
            loadLevel: load.overall,
            cognitiveLevel: load.cognitive,
            immediateActions: isOverwhelmed ? this._getImmediateReliefActions() : [],
            supportMessage: isOverwhelmed
                ? "You have too much on your plate. Let's reduce your load together."
                : "Your workload looks manageable."
        };
    }

    _getImmediateReliefActions() {
        return [
            { action: 'Cancel next non-essential meeting', impact: 'high' },
            { action: 'Move 2 tasks to tomorrow', impact: 'medium' },
            { action: 'Take a 15-minute walk now', impact: 'quick' },
            { action: 'Ask for help on complex task', impact: 'high' }
        ];
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const workloadManager = new WorkloadManager();

export function initWorkloadManager() {
    console.log('⚖️ [Workload Manager] Initialized');
    return workloadManager;
}
