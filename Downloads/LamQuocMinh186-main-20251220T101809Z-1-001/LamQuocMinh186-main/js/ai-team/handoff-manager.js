// ============================================================
// HANDOFF-MANAGER.JS - Task Handoff & Continuity
// Phase 4: Team Intelligence
// ============================================================

/**
 * Handoff Manager - Manages task handoffs between team members
 * Ensures context preservation and smooth transitions
 */

import { teamIntelligence } from './team-intelligence.js';

export class HandoffManager {
    constructor() {
        this.handoffHistory = [];
        this.pendingHandoffs = [];
    }

    // ============================================================
    // HANDOFF INITIATION
    // ============================================================

    /**
     * Initiate a task handoff
     * @param {Object} task - Task to hand off
     * @param {string} fromMemberId - Current assignee
     * @param {string} toMemberId - New assignee
     * @param {Object} options - Handoff options
     * @returns {Object} Handoff record
     */
    initiateHandoff(task, fromMemberId, toMemberId, options = {}) {
        const {
            reason = 'reassignment',
            urgent = false,
            preserveContext = true
        } = options;

        const fromMember = teamIntelligence.getMember(fromMemberId);
        const toMember = teamIntelligence.getMember(toMemberId);

        if (!fromMember || !toMember) {
            return { success: false, error: 'Member not found' };
        }

        // Generate context for handoff
        const context = preserveContext ? this._generateHandoffContext(task) : null;

        const handoff = {
            id: `handoff_${Date.now()}`,
            taskId: task.id,
            taskTitle: task.title,
            from: { id: fromMemberId, name: fromMember.name },
            to: { id: toMemberId, name: toMember.name },
            reason,
            urgent,
            status: 'pending',
            context,
            created: new Date().toISOString(),
            checklist: this._generateHandoffChecklist(task),
            acknowledged: false
        };

        this.pendingHandoffs.push(handoff);

        return {
            success: true,
            handoff,
            nextSteps: this._getHandoffNextSteps(handoff)
        };
    }

    _generateHandoffContext(task) {
        return {
            currentProgress: task.progress || 0,
            status: task.status,
            startedAt: task.startedAt,
            timeSpent: task.actualTime || 0,
            notes: task.notes || [],
            blockers: task.blockers || [],
            dependencies: task.dependencies || [],
            relatedTasks: task.relatedTasks || [],
            importantDetails: this._extractImportantDetails(task),
            lastActivity: task.updatedAt
        };
    }

    _extractImportantDetails(task) {
        const details = [];

        if (task.description) {
            details.push({ type: 'description', content: task.description });
        }

        if (task.subtasks?.length > 0) {
            const completed = task.subtasks.filter(s => s.completed).length;
            details.push({
                type: 'subtasks',
                content: `${completed}/${task.subtasks.length} subtasks completed`,
                items: task.subtasks
            });
        }

        if (task.deadline) {
            const daysUntil = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            details.push({
                type: 'deadline',
                content: `Due in ${daysUntil} days`,
                date: task.deadline
            });
        }

        return details;
    }

    _generateHandoffChecklist(task) {
        const checklist = [
            { item: 'Review task description and requirements', done: false },
            { item: 'Understand current progress and work done', done: false }
        ];

        if (task.dependencies?.length > 0) {
            checklist.push({ item: 'Check dependency status', done: false });
        }

        if (task.blockers?.length > 0) {
            checklist.push({ item: 'Review and address blockers', done: false });
        }

        checklist.push(
            { item: 'Ask questions if anything is unclear', done: false },
            { item: 'Update task assignment in system', done: false }
        );

        return checklist;
    }

    _getHandoffNextSteps(handoff) {
        return [
            `Notify ${handoff.from.name} to prepare handoff notes`,
            `Schedule quick sync between ${handoff.from.name} and ${handoff.to.name}`,
            `${handoff.to.name} acknowledges receipt`,
            'Update task assignment'
        ];
    }

    // ============================================================
    // HANDOFF ACKNOWLEDGMENT
    // ============================================================

    /**
     * Acknowledge handoff receipt
     * @param {string} handoffId - Handoff ID
     * @param {string} memberId - Acknowledging member
     * @returns {Object} Updated handoff
     */
    acknowledgeHandoff(handoffId, memberId) {
        const handoff = this.pendingHandoffs.find(h => h.id === handoffId);

        if (!handoff) {
            return { success: false, error: 'Handoff not found' };
        }

        if (handoff.to.id !== memberId) {
            return { success: false, error: 'Only receiving member can acknowledge' };
        }

        handoff.acknowledged = true;
        handoff.acknowledgedAt = new Date().toISOString();
        handoff.status = 'acknowledged';

        return {
            success: true,
            handoff,
            message: `${handoff.to.name} has acknowledged the handoff`
        };
    }

    /**
     * Complete a handoff
     * @param {string} handoffId - Handoff ID
     * @returns {Object} Completed handoff
     */
    completeHandoff(handoffId) {
        const index = this.pendingHandoffs.findIndex(h => h.id === handoffId);

        if (index === -1) {
            return { success: false, error: 'Handoff not found' };
        }

        const handoff = this.pendingHandoffs[index];
        handoff.status = 'completed';
        handoff.completedAt = new Date().toISOString();

        // Move to history
        this.handoffHistory.push(handoff);
        this.pendingHandoffs.splice(index, 1);

        // Keep last 50 in history
        if (this.handoffHistory.length > 50) {
            this.handoffHistory.shift();
        }

        return {
            success: true,
            handoff,
            message: 'Handoff completed successfully'
        };
    }

    // ============================================================
    // HANDOFF CONTEXT SUMMARY
    // ============================================================

    /**
     * Generate AI-powered context summary for handoff
     * @param {Object} task - Task being handed off
     * @param {Array} activityLog - Task activity log
     * @returns {Object} Context summary
     */
    generateContextSummary(task, activityLog = []) {
        const summary = {
            taskId: task.id,
            title: task.title,
            overview: this._generateOverview(task),
            progressSummary: this._summarizeProgress(task),
            keyDecisions: this._extractKeyDecisions(activityLog),
            openQuestions: this._identifyOpenQuestions(task, activityLog),
            recommendations: this._generateRecommendations(task)
        };

        return summary;
    }

    _generateOverview(task) {
        let overview = task.description || 'No description provided.';

        if (task.progress > 0) {
            overview += ` Currently ${task.progress}% complete.`;
        }

        if (task.deadline) {
            const daysUntil = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            overview += ` Due in ${daysUntil} days.`;
        }

        return overview;
    }

    _summarizeProgress(task) {
        const items = [];

        if (task.progress > 0) {
            items.push(`Task is ${task.progress}% complete`);
        }

        if (task.subtasks?.length > 0) {
            const completed = task.subtasks.filter(s => s.completed).length;
            items.push(`${completed} of ${task.subtasks.length} subtasks done`);
        }

        if (task.actualTime) {
            items.push(`${Math.round(task.actualTime / 60)} hours spent so far`);
        }

        return items.length > 0 ? items : ['No tracked progress yet'];
    }

    _extractKeyDecisions(activityLog) {
        // Look for decision-related activities
        const decisions = activityLog
            .filter(a =>
                a.type === 'decision' ||
                a.type === 'comment' && a.content?.toLowerCase().includes('decided')
            )
            .slice(-5)
            .map(a => a.content || a.description);

        return decisions.length > 0 ? decisions : ['No documented decisions'];
    }

    _identifyOpenQuestions(task, activityLog) {
        const questions = [];

        // Check for unresolved blockers
        if (task.blockers?.length > 0) {
            task.blockers.forEach(b => {
                if (!b.resolved) {
                    questions.push(`Blocker: ${b.description}`);
                }
            });
        }

        // Look for questions in activity
        activityLog
            .filter(a => a.content?.includes('?'))
            .slice(-3)
            .forEach(a => questions.push(a.content));

        return questions.length > 0 ? questions : ['No open questions identified'];
    }

    _generateRecommendations(task) {
        const recommendations = [];

        if (task.progress < 25 && task.status === 'in_progress') {
            recommendations.push('Consider reviewing requirements before continuing');
        }

        if (task.blockers?.some(b => !b.resolved)) {
            recommendations.push('Address blockers before resuming work');
        }

        if (task.deadline) {
            const daysUntil = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntil < 3 && task.progress < 70) {
                recommendations.push('Deadline is near - prioritize this task');
            }
        }

        return recommendations.length > 0 ? recommendations : ['Continue with normal workflow'];
    }

    // ============================================================
    // PENDING HANDOFFS
    // ============================================================

    /**
     * Get pending handoffs for a member
     * @param {string} memberId - Member ID
     * @returns {Array} Pending handoffs
     */
    getPendingHandoffs(memberId) {
        return this.pendingHandoffs.filter(h =>
            h.to.id === memberId || h.from.id === memberId
        );
    }

    /**
     * Get all pending handoffs
     * @returns {Array} All pending handoffs
     */
    getAllPendingHandoffs() {
        return this.pendingHandoffs;
    }

    /**
     * Get handoff history
     * @param {Object} filters - Optional filters
     * @returns {Array} Handoff history
     */
    getHandoffHistory(filters = {}) {
        let history = [...this.handoffHistory];

        if (filters.memberId) {
            history = history.filter(h =>
                h.from.id === filters.memberId || h.to.id === filters.memberId
            );
        }

        if (filters.taskId) {
            history = history.filter(h => h.taskId === filters.taskId);
        }

        return history;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const handoffManager = new HandoffManager();

export function initHandoffManager() {
    console.log('🤝 [Handoff Manager] Initialized');
    return handoffManager;
}
