// ============================================================
// AI-ORCHESTRATOR.JS - Central AI Orchestration
// Phase 10: Core Integration
// ============================================================

/**
 * AI Orchestrator - Coordinates all AI modules
 */

// Import all AI modules
import { aiEngine } from '../ai-engine/ai-core.js';
import { smartScheduler } from '../ai-scheduler/smart-scheduler.js';
import { burnoutDetector } from '../ai-wellbeing/burnout-detector.js';
import { workloadManager } from '../ai-wellbeing/workload-manager.js';
import { teamIntelligence } from '../ai-team/team-intelligence.js';
import { analyticsEngine } from '../ai-analytics/analytics-engine.js';
import { contextEngine } from '../ai-context/context-engine.js';
import { gamificationEngine } from '../ai-gamification/gamification-engine.js';
import { integrationHub } from './integration-hub.js';

export class AIOrchestrator {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
        this.eventHandlers = new Map();
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    /**
     * Initialize all AI modules
     * @param {Object} config - Initialization config
     */
    async initialize(config = {}) {
        console.log('🤖 [AI Orchestrator] Starting initialization...');

        // Register all modules
        this.modules.set('core', aiEngine);
        this.modules.set('scheduler', smartScheduler);
        this.modules.set('burnout', burnoutDetector);
        this.modules.set('workload', workloadManager);
        this.modules.set('team', teamIntelligence);
        this.modules.set('analytics', analyticsEngine);
        this.modules.set('context', contextEngine);
        this.modules.set('gamification', gamificationEngine);
        this.modules.set('integrations', integrationHub);

        // Initialize core engine first
        if (config.userData) {
            await aiEngine.initialize?.(config.userData, config.user);
        }

        this.initialized = true;
        console.log('🤖 [AI Orchestrator] All modules initialized');

        return { success: true, modules: Array.from(this.modules.keys()) };
    }

    // ============================================================
    // AI RECOMMENDATION ENGINE
    // ============================================================

    /**
     * Get comprehensive AI recommendations
     * @param {Object} context - Current context
     * @returns {Object} Recommendations
     */
    getRecommendations(context = {}) {
        const { tasks = [], user = {}, activeTasks = [] } = context;

        // Gather insights from all modules
        const contextData = contextEngine.detectContext?.(context) || {};
        const burnoutCheck = burnoutDetector.quickCheck?.() || {};
        const workload = workloadManager.assessWorkload?.(activeTasks) || {};
        const schedule = smartScheduler.generateSchedule?.(tasks) || {};

        // Combine into unified recommendations
        return {
            timestamp: new Date().toISOString(),
            context: contextData,
            health: {
                burnout: burnoutCheck,
                workload
            },
            suggestions: {
                nextTask: schedule.scheduled?.[0] || null,
                focusRecommendation: this._getFocusRecommendation(contextData, burnoutCheck),
                breaks: this._getBreakRecommendations(burnoutCheck, workload)
            },
            alerts: this._compileAlerts(burnoutCheck, workload),
            motivation: gamificationEngine.getStats?.() || {}
        };
    }

    _getFocusRecommendation(context, burnout) {
        if (burnout.riskLevel === 'critical') {
            return { action: 'rest', message: 'Take a break before continuing' };
        }
        if (context.energy === 'high') {
            return { action: 'deep_work', message: 'Perfect time for complex tasks' };
        }
        if (context.energy === 'low') {
            return { action: 'light_work', message: 'Stick to routine tasks' };
        }
        return { action: 'normal', message: 'Proceed with planned work' };
    }

    _getBreakRecommendations(burnout, workload) {
        const recommendations = [];

        if (burnout.score >= 0.5) {
            recommendations.push({ type: 'immediate', duration: 15, reason: 'Burnout prevention' });
        }

        if (workload.currentLoad?.overall >= 0.8) {
            recommendations.push({ type: 'scheduled', duration: 10, reason: 'High workload' });
        }

        return recommendations;
    }

    _compileAlerts(burnout, workload) {
        const alerts = [];

        if (burnout.riskLevel === 'warning' || burnout.riskLevel === 'critical') {
            alerts.push({ type: 'burnout', severity: burnout.riskLevel, message: 'Burnout risk detected' });
        }

        if (workload.status === 'overloaded') {
            alerts.push({ type: 'workload', severity: 'high', message: 'Workload exceeds capacity' });
        }

        return alerts;
    }

    // ============================================================
    // EVENT HANDLING
    // ============================================================

    /**
     * Handle task completed event
     * @param {Object} task - Completed task
     */
    onTaskCompleted(task) {
        // Update multiple modules
        aiEngine?.trackEvent?.('task_complete', task);
        gamificationEngine.awardPoints?.(task);
        analyticsEngine.recordMetric?.('task_complete', 1);

        // Trigger event handlers
        this._emit('taskCompleted', task);
    }

    /**
     * Handle focus session ended
     * @param {Object} session - Ended session
     */
    onFocusSessionEnded(session) {
        aiEngine?.trackEvent?.('focus_end', null, session);
        analyticsEngine.recordMetric?.('focus_minutes', session.duration);

        this._emit('focusEnded', session);
    }

    /**
     * Register event handler
     * @param {string} event - Event name
     * @param {Function} handler - Handler function
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    _emit(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(h => {
            try { h(data); } catch (e) { console.error('Event handler error:', e); }
        });
    }

    // ============================================================
    // MODULE ACCESS
    // ============================================================

    /**
     * Get a specific module
     * @param {string} moduleId - Module ID
     * @returns {Object} Module instance
     */
    getModule(moduleId) {
        return this.modules.get(moduleId);
    }

    /**
     * Get system status
     * @returns {Object} Status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            modules: Array.from(this.modules.entries()).map(([id, mod]) => ({
                id,
                status: mod ? 'loaded' : 'error'
            })),
            timestamp: new Date().toISOString()
        };
    }

    // ============================================================
    // DAILY BRIEFING
    // ============================================================

    /**
     * Generate daily briefing
     * @returns {Object} Daily briefing
     */
    getDailyBriefing() {
        const productivity = analyticsEngine.getProductivityAnalytics?.({ period: 'day' }) || {};
        const schedule = smartScheduler.generateSchedule?.([]) || {};
        const context = contextEngine.getCurrentContext?.() || {};
        const stats = gamificationEngine.getStats?.() || {};

        return {
            greeting: this._getGreeting(),
            date: new Date().toLocaleDateString(),
            summary: {
                tasksYesterday: productivity.completionMetrics?.total || 0,
                focusHours: Math.round((productivity.focusMetrics?.totalFocusMinutes || 0) / 60),
                streak: stats.streak || 0,
                level: stats.level || 1
            },
            todayFocus: {
                energy: context.energy || 'unknown',
                suggestion: context.type === 'deep_work'
                    ? 'Good conditions for deep work'
                    : 'Start with your most important task'
            },
            motivationalQuote: this._getQuote()
        };
    }

    _getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    _getQuote() {
        const quotes = [
            'The secret of getting ahead is getting started.',
            'Progress, not perfection.',
            'Small steps lead to big changes.',
            'Focus on what matters most.',
            'You\'re capable of amazing things.'
        ];
        return quotes[new Date().getDay() % quotes.length];
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const aiOrchestrator = new AIOrchestrator();

export async function initAIOrchestrator(config) {
    await aiOrchestrator.initialize(config);
    console.log('🤖 [AI Orchestrator] Ready');
    return aiOrchestrator;
}
