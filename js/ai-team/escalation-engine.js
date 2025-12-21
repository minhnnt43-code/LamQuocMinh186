// ============================================================
// ESCALATION-ENGINE.JS - Smart Issue Escalation
// Phase 4: Team Intelligence
// ============================================================

/**
 * Escalation Engine - Automatically detects and routes escalations
 * Identifies issues that need management attention
 */

import { teamIntelligence } from './team-intelligence.js';

export class EscalationEngine {
    constructor() {
        this.config = {
            staleDays: 5,               // Days without progress
            overdueThreshold: 1,        // Days overdue before escalation
            blockerThreshold: 2,        // Days blocked before escalation
            workloadEscalation: 1.3     // 130% workload triggers escalation
        };

        this.escalations = [];
        this.escalationRules = this._initializeRules();
    }

    _initializeRules() {
        return [
            {
                id: 'overdue_critical',
                name: 'Overdue Critical Task',
                severity: 'critical',
                condition: (task) =>
                    task.priority === 'critical' &&
                    task.deadline &&
                    new Date(task.deadline) < new Date(),
                action: 'Immediate manager notification'
            },
            {
                id: 'blocked_too_long',
                name: 'Prolonged Blocker',
                severity: 'high',
                condition: (task, context) => {
                    if (!context.blockedSince) return false;
                    const blockedDays = (Date.now() - new Date(context.blockedSince)) / (1000 * 60 * 60 * 24);
                    return blockedDays >= this.config.blockerThreshold;
                },
                action: 'Escalate to remove blocker'
            },
            {
                id: 'stale_high_priority',
                name: 'Stale High Priority Task',
                severity: 'high',
                condition: (task) => {
                    if (task.priority !== 'high' && task.priority !== 'critical') return false;
                    if (task.status === 'completed') return false;
                    const daysSinceUpdate = (Date.now() - new Date(task.updatedAt || task.createdAt)) / (1000 * 60 * 60 * 24);
                    return daysSinceUpdate >= this.config.staleDays;
                },
                action: 'Check for blockers or reassign'
            },
            {
                id: 'dependency_chain_risk',
                name: 'Dependency Chain at Risk',
                severity: 'medium',
                condition: (task, context) =>
                    context.isOnCriticalPath &&
                    task.progress < context.expectedProgress,
                action: 'Monitor closely, consider adding resources'
            },
            {
                id: 'member_overloaded',
                name: 'Team Member Overloaded',
                severity: 'high',
                condition: (task, context) =>
                    context.assigneeWorkload >= this.config.workloadEscalation,
                action: 'Redistribute work or extend deadlines'
            }
        ];
    }

    // ============================================================
    // ESCALATION DETECTION
    // ============================================================

    /**
     * Scan tasks for escalation needs
     * @param {Array} tasks - Tasks to scan
     * @param {Object} context - Additional context
     * @returns {Array} Escalations needed
     */
    scanForEscalations(tasks, context = {}) {
        const newEscalations = [];

        for (const task of tasks) {
            if (task.status === 'completed' || task.status === 'cancelled') continue;

            const taskContext = this._buildTaskContext(task, tasks, context);

            for (const rule of this.escalationRules) {
                if (rule.condition(task, taskContext)) {
                    // Check if already escalated
                    const existingEscalation = this.escalations.find(e =>
                        e.taskId === task.id && e.ruleId === rule.id && e.status === 'active'
                    );

                    if (!existingEscalation) {
                        const escalation = this._createEscalation(task, rule, taskContext);
                        newEscalations.push(escalation);
                        this.escalations.push(escalation);
                    }
                }
            }
        }

        return {
            newEscalations,
            totalActive: this.escalations.filter(e => e.status === 'active').length,
            bySeverity: this._groupBySeverity(this.escalations.filter(e => e.status === 'active'))
        };
    }

    _buildTaskContext(task, allTasks, globalContext) {
        const member = task.assignee ? teamIntelligence.getMember(task.assignee) : null;

        // Calculate expected progress based on deadline
        let expectedProgress = 0;
        if (task.deadline && task.createdAt) {
            const totalDays = (new Date(task.deadline) - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);
            const elapsed = (Date.now() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);
            expectedProgress = Math.min(100, (elapsed / totalDays) * 100);
        }

        return {
            ...globalContext,
            assigneeWorkload: member?.workload || 0,
            blockedSince: task.blockedSince || null,
            isOnCriticalPath: globalContext.criticalPath?.includes(task.id) || false,
            expectedProgress,
            daysSinceUpdate: (Date.now() - new Date(task.updatedAt || task.createdAt)) / (1000 * 60 * 60 * 24)
        };
    }

    _createEscalation(task, rule, context) {
        return {
            id: `esc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            taskId: task.id,
            taskTitle: task.title,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            suggestedAction: rule.action,
            context: {
                assignee: task.assignee,
                deadline: task.deadline,
                progress: task.progress,
                workload: context.assigneeWorkload
            },
            status: 'active',
            createdAt: new Date().toISOString(),
            acknowledgements: [],
            resolution: null
        };
    }

    _groupBySeverity(escalations) {
        return {
            critical: escalations.filter(e => e.severity === 'critical').length,
            high: escalations.filter(e => e.severity === 'high').length,
            medium: escalations.filter(e => e.severity === 'medium').length,
            low: escalations.filter(e => e.severity === 'low').length
        };
    }

    // ============================================================
    // ESCALATION MANAGEMENT
    // ============================================================

    /**
     * Acknowledge an escalation
     * @param {string} escalationId - Escalation ID
     * @param {string} acknowledgedBy - Person acknowledging
     */
    acknowledgeEscalation(escalationId, acknowledgedBy) {
        const escalation = this.escalations.find(e => e.id === escalationId);
        if (!escalation) return { success: false, error: 'Escalation not found' };

        escalation.acknowledgements.push({
            by: acknowledgedBy,
            at: new Date().toISOString()
        });

        return { success: true, escalation };
    }

    /**
     * Resolve an escalation
     * @param {string} escalationId - Escalation ID
     * @param {Object} resolution - Resolution details
     */
    resolveEscalation(escalationId, resolution) {
        const escalation = this.escalations.find(e => e.id === escalationId);
        if (!escalation) return { success: false, error: 'Escalation not found' };

        escalation.status = 'resolved';
        escalation.resolution = {
            ...resolution,
            resolvedAt: new Date().toISOString()
        };

        return { success: true, escalation };
    }

    /**
     * Get active escalations
     * @param {Object} filters - Optional filters
     * @returns {Array} Active escalations
     */
    getActiveEscalations(filters = {}) {
        let active = this.escalations.filter(e => e.status === 'active');

        if (filters.severity) {
            active = active.filter(e => e.severity === filters.severity);
        }

        if (filters.assignee) {
            active = active.filter(e => e.context.assignee === filters.assignee);
        }

        // Sort by severity
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return active.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }

    // ============================================================
    // ESCALATION ROUTING
    // ============================================================

    /**
     * Determine escalation recipients
     * @param {Object} escalation - Escalation to route
     * @returns {Object} Routing recommendation
     */
    routeEscalation(escalation) {
        const routing = {
            primary: null,
            cc: [],
            channel: 'default',
            urgency: 'normal'
        };

        switch (escalation.severity) {
            case 'critical':
                routing.primary = 'manager';
                routing.cc = ['team_lead', 'stakeholder'];
                routing.channel = 'urgent';
                routing.urgency = 'immediate';
                break;
            case 'high':
                routing.primary = 'team_lead';
                routing.cc = ['manager'];
                routing.channel = 'priority';
                routing.urgency = 'same_day';
                break;
            case 'medium':
                routing.primary = 'team_lead';
                routing.channel = 'normal';
                routing.urgency = 'next_standup';
                break;
            case 'low':
            default:
                routing.primary = 'assignee';
                routing.channel = 'normal';
                routing.urgency = 'weekly_review';
        }

        // Special routing based on context
        if (escalation.context.workload >= this.config.workloadEscalation) {
            routing.cc.push('hr');
            routing.notes = 'Workload concern - HR notified';
        }

        return routing;
    }

    // ============================================================
    // ESCALATION PREVENTION
    // ============================================================

    /**
     * Identify potential escalations before they happen
     * @param {Array} tasks - Tasks to analyze
     * @returns {Array} Prevention recommendations
     */
    predictEscalations(tasks) {
        const predictions = [];

        for (const task of tasks) {
            if (task.status === 'completed') continue;

            const risks = [];

            // Deadline risk
            if (task.deadline) {
                const daysUntil = (new Date(task.deadline) - Date.now()) / (1000 * 60 * 60 * 24);
                const expectedProgress = 100 - (daysUntil / 7 * 30); // Rough estimate

                if (task.progress < expectedProgress * 0.7) {
                    risks.push({
                        type: 'deadline',
                        probability: Math.min(0.9, (expectedProgress - task.progress) / 50),
                        message: 'Progress behind schedule'
                    });
                }
            }

            // Stale risk
            const daysSinceUpdate = (Date.now() - new Date(task.updatedAt || task.createdAt)) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate >= this.config.staleDays * 0.7) {
                risks.push({
                    type: 'stale',
                    probability: Math.min(0.8, daysSinceUpdate / this.config.staleDays),
                    message: 'Task becoming stale'
                });
            }

            // Blocker risk
            if (task.dependencies?.length > 0) {
                const blockedDeps = task.dependencies.filter(d => {
                    const dep = tasks.find(t => t.id === d);
                    return dep && dep.status !== 'completed';
                });

                if (blockedDeps.length > 0) {
                    risks.push({
                        type: 'blocker',
                        probability: 0.6,
                        message: `Waiting on ${blockedDeps.length} dependencies`
                    });
                }
            }

            if (risks.length > 0) {
                const maxRisk = Math.max(...risks.map(r => r.probability));
                predictions.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    risks,
                    overallRisk: maxRisk,
                    preventiveActions: this._suggestPreventiveActions(risks)
                });
            }
        }

        return predictions.sort((a, b) => b.overallRisk - a.overallRisk);
    }

    _suggestPreventiveActions(risks) {
        const actions = [];

        for (const risk of risks) {
            switch (risk.type) {
                case 'deadline':
                    actions.push('Review scope and reduce if needed');
                    actions.push('Add resources or get help');
                    break;
                case 'stale':
                    actions.push('Check for unstated blockers');
                    actions.push('Reconnect with assignee');
                    break;
                case 'blocker':
                    actions.push('Escalate blocker to get unblocked');
                    actions.push('Find workaround or alternative approach');
                    break;
            }
        }

        return [...new Set(actions)]; // Remove duplicates
    }

    // ============================================================
    // CUSTOM RULES
    // ============================================================

    /**
     * Add a custom escalation rule
     * @param {Object} rule - Rule definition
     */
    addCustomRule(rule) {
        if (!rule.id || !rule.condition) {
            return { success: false, error: 'Rule must have id and condition' };
        }

        this.escalationRules.push({
            ...rule,
            severity: rule.severity || 'medium',
            action: rule.action || 'Review and take action'
        });

        return { success: true, ruleCount: this.escalationRules.length };
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const escalationEngine = new EscalationEngine();

export function initEscalationEngine() {
    console.log('🚨 [Escalation Engine] Initialized');
    return escalationEngine;
}
