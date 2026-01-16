// ============================================================
// WORKLOAD-EQUITY.JS - Team Workload Equity Analyzer
// Phase 4: Team Intelligence
// ============================================================

/**
 * Workload Equity - Ensures fair workload distribution across team
 */

import { teamIntelligence } from './team-intelligence.js';

export class WorkloadEquity {
    constructor() {
        this.config = {
            equityThreshold: 0.15,     // 15% variance is acceptable
            rebalanceThreshold: 0.3,   // Trigger rebalance at 30% variance
            maxOverload: 1.2           // 120% workload = overloaded
        };

        this.equityHistory = [];
    }

    // ============================================================
    // EQUITY ANALYSIS
    // ============================================================

    /**
     * Analyze workload equity across team
     * @returns {Object} Equity analysis
     */
    analyzeEquity() {
        const members = teamIntelligence.getAllMembers();

        if (members.length < 2) {
            return { hasTeam: false, message: 'Need at least 2 team members' };
        }

        const workloads = members.map(m => ({
            memberId: m.id,
            name: m.name,
            workload: m.workload,
            adjustedWorkload: m.workload / m.availability // Adjusted for availability
        }));

        const avgWorkload = workloads.reduce((sum, w) => sum + w.adjustedWorkload, 0) / workloads.length;

        // Calculate variance
        const variance = this._calculateVariance(workloads.map(w => w.adjustedWorkload), avgWorkload);

        // Identify outliers
        const overloaded = workloads.filter(w => w.adjustedWorkload > avgWorkload * (1 + this.config.rebalanceThreshold));
        const underloaded = workloads.filter(w => w.adjustedWorkload < avgWorkload * (1 - this.config.rebalanceThreshold));

        const equityScore = Math.max(0, 1 - variance);

        return {
            hasTeam: true,
            equityScore,
            status: this._getEquityStatus(variance),
            metrics: {
                avgWorkload,
                variance,
                minWorkload: Math.min(...workloads.map(w => w.workload)),
                maxWorkload: Math.max(...workloads.map(w => w.workload))
            },
            distribution: workloads.map(w => ({
                ...w,
                deviation: ((w.adjustedWorkload - avgWorkload) / avgWorkload) * 100,
                status: this._getMemberStatus(w.adjustedWorkload, avgWorkload)
            })),
            imbalances: {
                overloaded: overloaded.map(w => w.name),
                underloaded: underloaded.map(w => w.name)
            },
            needsRebalancing: variance > this.config.rebalanceThreshold,
            recommendations: this._generateEquityRecommendations(overloaded, underloaded, variance)
        };
    }

    _calculateVariance(values, mean) {
        if (values.length === 0 || mean === 0) return 0;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / values.length) / mean;
    }

    _getEquityStatus(variance) {
        if (variance <= this.config.equityThreshold) return 'balanced';
        if (variance <= this.config.rebalanceThreshold) return 'acceptable';
        if (variance <= 0.5) return 'uneven';
        return 'critical';
    }

    _getMemberStatus(workload, avgWorkload) {
        const ratio = workload / avgWorkload;
        if (ratio > 1.3) return 'overloaded';
        if (ratio > 1.1) return 'high';
        if (ratio < 0.7) return 'underutilized';
        if (ratio < 0.9) return 'light';
        return 'balanced';
    }

    _generateEquityRecommendations(overloaded, underloaded, variance) {
        const recommendations = [];

        if (overloaded.length > 0 && underloaded.length > 0) {
            recommendations.push({
                priority: 'high',
                action: 'redistribute',
                message: `Move tasks from ${overloaded.map(o => o.name).join(', ')} to ${underloaded.map(u => u.name).join(', ')}`,
                type: 'rebalance'
            });
        }

        if (overloaded.length > 0 && underloaded.length === 0) {
            recommendations.push({
                priority: 'high',
                action: 'reduce_scope',
                message: `${overloaded.map(o => o.name).join(', ')} are overloaded. Consider reducing scope or deadlines.`,
                type: 'capacity'
            });
        }

        if (variance > this.config.rebalanceThreshold) {
            recommendations.push({
                priority: 'medium',
                action: 'review_assignment',
                message: 'Review task assignment process to prevent future imbalances',
                type: 'process'
            });
        }

        return recommendations;
    }

    // ============================================================
    // REBALANCING SUGGESTIONS
    // ============================================================

    /**
     * Suggest task reassignments to improve equity
     * @param {Array} tasks - All team tasks
     * @returns {Object} Rebalancing suggestions
     */
    suggestRebalancing(tasks) {
        const equity = this.analyzeEquity();

        if (!equity.needsRebalancing) {
            return { needed: false, message: 'Workload is balanced' };
        }

        const suggestions = [];
        const overloadedMembers = equity.distribution.filter(d => d.status === 'overloaded');
        const underloadedMembers = equity.distribution.filter(d => d.status === 'underutilized' || d.status === 'light');

        for (const overloaded of overloadedMembers) {
            // Find reassignable tasks
            const memberTasks = tasks.filter(t =>
                t.assignee === overloaded.memberId &&
                t.status !== 'completed' &&
                t.progress < 50 // Less than 50% done
            );

            // Sort by priority (prefer moving lower priority)
            memberTasks.sort((a, b) => {
                const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
                return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
            });

            // Suggest moving tasks
            const tasksToMove = memberTasks.slice(0, 2); // Move up to 2 tasks

            for (const task of tasksToMove) {
                // Find best recipient
                const recipient = this._findBestRecipient(task, underloadedMembers);

                if (recipient) {
                    suggestions.push({
                        task: { id: task.id, title: task.title },
                        from: { id: overloaded.memberId, name: overloaded.name },
                        to: { id: recipient.memberId, name: recipient.name },
                        reason: `${overloaded.name} is overloaded, ${recipient.name} has capacity`,
                        expectedImpact: this._calculateRebalanceImpact(overloaded, recipient, task)
                    });
                }
            }
        }

        return {
            needed: true,
            currentVariance: equity.metrics.variance,
            targetVariance: this.config.equityThreshold,
            suggestions,
            summary: `${suggestions.length} task reassignment(s) recommended`
        };
    }

    _findBestRecipient(task, candidates) {
        // Simple matching - in real implementation, would check skills
        const withCapacity = candidates.filter(c => c.adjustedWorkload < 0.7);
        if (withCapacity.length === 0) return candidates[0];

        // Return the one with lowest workload
        return withCapacity.sort((a, b) => a.workload - b.workload)[0];
    }

    _calculateRebalanceImpact(from, to, task) {
        const taskLoad = (task.estimatedTime || 60) / (8 * 60); // Fraction of day

        return {
            fromNewLoad: from.workload - taskLoad,
            toNewLoad: to.workload + taskLoad,
            varianceReduction: 'estimated 5-10%'
        };
    }

    // ============================================================
    // FAIRNESS INDEX
    // ============================================================

    /**
     * Calculate fairness index over time
     * @param {Array} historicalData - Historical workload data
     * @returns {Object} Fairness analysis
     */
    calculateFairnessIndex(historicalData = []) {
        // Use internal history if none provided
        const data = historicalData.length > 0 ? historicalData : this.equityHistory;

        if (data.length < 5) {
            return { hasEnoughData: false, message: 'Need more historical data' };
        }

        // Calculate cumulative workload per member
        const cumulativeWorkload = {};

        for (const snapshot of data) {
            for (const member of snapshot.members || []) {
                if (!cumulativeWorkload[member.id]) {
                    cumulativeWorkload[member.id] = { name: member.name, total: 0, count: 0 };
                }
                cumulativeWorkload[member.id].total += member.workload;
                cumulativeWorkload[member.id].count++;
            }
        }

        // Calculate average workload per member
        const averages = Object.values(cumulativeWorkload).map(m => ({
            name: m.name,
            avgWorkload: m.total / m.count
        }));

        const overallAvg = averages.reduce((s, a) => s + a.avgWorkload, 0) / averages.length;
        const fairnessIndex = 1 - this._calculateVariance(averages.map(a => a.avgWorkload), overallAvg);

        return {
            hasEnoughData: true,
            fairnessIndex,
            status: fairnessIndex >= 0.85 ? 'fair' : fairnessIndex >= 0.7 ? 'acceptable' : 'unfair',
            memberAverages: averages,
            overallAverage: overallAvg,
            recommendation: fairnessIndex < 0.7
                ? 'Workload distribution has been consistently uneven. Review assignment practices.'
                : 'Workload distribution is reasonably fair over time.'
        };
    }

    /**
     * Record current equity snapshot
     */
    recordSnapshot() {
        const members = teamIntelligence.getAllMembers();

        this.equityHistory.push({
            timestamp: new Date().toISOString(),
            members: members.map(m => ({
                id: m.id,
                name: m.name,
                workload: m.workload
            }))
        });

        // Keep last 30 snapshots
        if (this.equityHistory.length > 30) {
            this.equityHistory.shift();
        }
    }

    // ============================================================
    // WORKLOAD IMPACT PREDICTION
    // ============================================================

    /**
     * Predict impact of assigning task to a member
     * @param {Object} task - Task to assign
     * @param {string} memberId - Member ID
     * @returns {Object} Impact prediction
     */
    predictAssignmentImpact(task, memberId) {
        const member = teamIntelligence.getMember(memberId);
        if (!member) return { error: 'Member not found' };

        const taskLoad = (task.estimatedTime || 60) / (8 * 60);
        const newWorkload = member.workload + taskLoad;

        const equity = this.analyzeEquity();

        // Calculate new variance with this assignment
        const otherWorkloads = equity.distribution
            .filter(d => d.memberId !== memberId)
            .map(d => d.adjustedWorkload);
        const newAdjusted = newWorkload / member.availability;

        const newAvg = ([...otherWorkloads, newAdjusted].reduce((a, b) => a + b, 0)) / (otherWorkloads.length + 1);
        const newVariance = this._calculateVariance([...otherWorkloads, newAdjusted], newAvg);

        return {
            currentWorkload: member.workload,
            newWorkload,
            workloadIncrease: taskLoad,
            willBeOverloaded: newWorkload > this.config.maxOverload,
            currentVariance: equity.metrics.variance,
            newVariance,
            equityImpact: newVariance > equity.metrics.variance ? 'worsens' : 'improves',
            recommendation: newWorkload > this.config.maxOverload
                ? 'Consider assigning to someone else'
                : newVariance > this.config.rebalanceThreshold
                    ? 'Acceptable but increases imbalance'
                    : 'Good assignment'
        };
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const workloadEquity = new WorkloadEquity();

export function initWorkloadEquity() {
    console.log('⚖️ [Workload Equity] Initialized');
    return workloadEquity;
}
