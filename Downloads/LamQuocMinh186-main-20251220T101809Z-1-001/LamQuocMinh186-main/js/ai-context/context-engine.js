// ============================================================
// CONTEXT-ENGINE.JS - Context Awareness Core
// Phase 6: Context Intelligence
// ============================================================

/**
 * Context Engine - Understands and adapts to user's current context
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class ContextEngine {
    constructor() {
        this.currentContext = null;
        this.contextHistory = [];

        this.contextTypes = {
            deep_work: { focusLevel: 'high', interruptions: 'blocked' },
            collaborative: { focusLevel: 'medium', interruptions: 'allowed' },
            admin: { focusLevel: 'low', interruptions: 'allowed' },
            planning: { focusLevel: 'medium', interruptions: 'limited' },
            review: { focusLevel: 'medium', interruptions: 'limited' },
            break: { focusLevel: 'none', interruptions: 'allowed' }
        };
    }

    // ============================================================
    // CONTEXT DETECTION
    // ============================================================

    /**
     * Detect current context
     * @param {Object} signals - Context signals
     * @returns {Object} Detected context
     */
    detectContext(signals = {}) {
        const {
            activeTask = null,
            recentActivity = [],
            timeOfDay = new Date().getHours(),
            dayOfWeek = new Date().getDay(),
            focusSession = null,
            calendar = []
        } = signals;

        // Infer context from signals
        const inferred = {
            type: this._inferContextType(activeTask, recentActivity, focusSession),
            energy: this._inferEnergyLevel(timeOfDay),
            workMode: this._inferWorkMode(dayOfWeek, timeOfDay),
            project: activeTask?.project || null,
            category: activeTask?.category || null,
            urgency: this._inferUrgency(activeTask, calendar),
            constraints: this._detectConstraints(calendar, timeOfDay)
        };

        this.currentContext = {
            ...inferred,
            detectedAt: new Date().toISOString(),
            confidence: this._calculateConfidence(signals)
        };

        // Track history
        this.contextHistory.push({
            ...this.currentContext,
            timestamp: Date.now()
        });

        // Keep last 50 contexts
        if (this.contextHistory.length > 50) {
            this.contextHistory.shift();
        }

        return this.currentContext;
    }

    _inferContextType(activeTask, recentActivity, focusSession) {
        if (focusSession?.active) return 'deep_work';

        if (activeTask) {
            const text = `${activeTask.title} ${activeTask.description || ''}`.toLowerCase();

            if (['plan', 'review', 'strategy'].some(w => text.includes(w))) return 'planning';
            if (['meeting', 'call', 'discuss'].some(w => text.includes(w))) return 'collaborative';
            if (['email', 'admin', 'organize'].some(w => text.includes(w))) return 'admin';
            if (['review', 'check', 'approve'].some(w => text.includes(w))) return 'review';
        }

        // Infer from recent activity
        if (recentActivity.length > 0) {
            const lastType = recentActivity[recentActivity.length - 1]?.type;
            if (lastType === 'task_start') return 'deep_work';
            if (lastType === 'break_start') return 'break';
        }

        return 'deep_work'; // Default
    }

    _inferEnergyLevel(hour) {
        if (hour >= 9 && hour <= 11) return 'high';
        if (hour >= 14 && hour <= 16) return 'medium';
        if (hour >= 12 && hour <= 13) return 'low';
        if (hour >= 17) return 'declining';
        return 'medium';
    }

    _inferWorkMode(day, hour) {
        const isWeekend = day === 0 || day === 6;
        const isWorkHours = hour >= 9 && hour < 18;

        if (isWeekend) return 'off';
        if (!isWorkHours) return 'off';
        if (hour >= 9 && hour <= 12) return 'peak';
        if (hour >= 13 && hour <= 15) return 'recovery';
        return 'winding_down';
    }

    _inferUrgency(activeTask, calendar) {
        if (!activeTask) return 'normal';

        if (activeTask.priority === 'critical') return 'high';
        if (activeTask.deadline) {
            const daysUntil = (new Date(activeTask.deadline) - new Date()) / (1000 * 60 * 60 * 24);
            if (daysUntil < 1) return 'high';
            if (daysUntil < 3) return 'elevated';
        }

        // Check if meeting soon
        const now = Date.now();
        const upcomingMeeting = calendar.find(e =>
            new Date(e.start).getTime() - now < 30 * 60 * 1000
        );
        if (upcomingMeeting) return 'elevated';

        return 'normal';
    }

    _detectConstraints(calendar, hour) {
        const constraints = [];

        // Time constraint
        const hoursLeft = 18 - hour;
        if (hoursLeft <= 2) {
            constraints.push({ type: 'time', reason: 'End of day approaching' });
        }

        // Meeting constraint
        const now = Date.now();
        for (const event of calendar) {
            const timeUntil = (new Date(event.start).getTime() - now) / (1000 * 60);
            if (timeUntil > 0 && timeUntil <= 60) {
                constraints.push({
                    type: 'meeting',
                    in: Math.round(timeUntil),
                    title: event.title
                });
            }
        }

        return constraints;
    }

    _calculateConfidence(signals) {
        let confidence = 0.5;

        if (signals.activeTask) confidence += 0.2;
        if (signals.focusSession) confidence += 0.15;
        if (signals.recentActivity?.length > 0) confidence += 0.1;
        if (signals.calendar?.length > 0) confidence += 0.05;

        return Math.min(1, confidence);
    }

    // ============================================================
    // CONTEXT-AWARE RECOMMENDATIONS
    // ============================================================

    /**
     * Get context-appropriate task recommendations
     * @param {Array} availableTasks - Tasks to filter
     * @returns {Array} Recommended tasks
     */
    getContextualRecommendations(availableTasks) {
        if (!this.currentContext) {
            this.detectContext({});
        }

        const ctx = this.currentContext;

        // Score tasks for current context
        const scored = availableTasks.map(task => ({
            task,
            score: this._scoreTaskForContext(task, ctx),
            reasons: this._getMatchReasons(task, ctx)
        }));

        return scored
            .filter(s => s.score > 0.3)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }

    _scoreTaskForContext(task, context) {
        let score = 0.5;

        // Energy match
        const taskComplexity = this._getTaskComplexity(task);
        if (context.energy === 'high' && taskComplexity === 'high') score += 0.2;
        if (context.energy === 'low' && taskComplexity === 'low') score += 0.2;
        if (context.energy === 'high' && taskComplexity === 'low') score -= 0.1;

        // Context type match
        if (context.type === 'deep_work' && taskComplexity === 'high') score += 0.15;
        if (context.type === 'admin' && task.category === 'admin') score += 0.15;

        // Time constraints
        const constraints = context.constraints || [];
        const hasTimeConstraint = constraints.some(c => c.type === 'meeting' && c.in < 30);
        if (hasTimeConstraint && (task.estimatedTime || 60) <= 20) score += 0.1;
        if (hasTimeConstraint && (task.estimatedTime || 60) > 60) score -= 0.2;

        // Project match
        if (context.project && task.project === context.project) score += 0.1;

        // Urgency match
        if (context.urgency === 'high' && task.priority === 'critical') score += 0.15;

        return Math.max(0, Math.min(1, score));
    }

    _getTaskComplexity(task) {
        const text = `${task.title} ${task.description || ''}`.toLowerCase();

        if (['complex', 'design', 'architect', 'research', 'analyze'].some(w => text.includes(w))) {
            return 'high';
        }
        if (['simple', 'quick', 'update', 'minor'].some(w => text.includes(w))) {
            return 'low';
        }
        return 'medium';
    }

    _getMatchReasons(task, context) {
        const reasons = [];

        if (context.energy === 'high' && this._getTaskComplexity(task) === 'high') {
            reasons.push('Matches your high energy');
        }

        if (context.type === 'deep_work') {
            reasons.push('Good for focused work');
        }

        if (context.project && task.project === context.project) {
            reasons.push('Same project context');
        }

        return reasons;
    }

    // ============================================================
    // CONTEXT STATE
    // ============================================================

    /**
     * Get current context
     * @returns {Object} Current context
     */
    getCurrentContext() {
        return this.currentContext;
    }

    /**
     * Get context preferences
     * @param {string} type - Context type
     * @returns {Object} Context preferences
     */
    getContextPreferences(type) {
        return this.contextTypes[type] || this.contextTypes.deep_work;
    }

    /**
     * Switch context manually
     * @param {string} type - New context type
     */
    switchContext(type) {
        if (!this.contextTypes[type]) return null;

        this.currentContext = {
            ...this.currentContext,
            type,
            ...this.contextTypes[type],
            switchedAt: new Date().toISOString(),
            manual: true
        };

        return this.currentContext;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const contextEngine = new ContextEngine();

export function initContextEngine() {
    console.log('🎭 [Context Engine] Initialized');
    return contextEngine;
}
