// ============================================================
// DELAY-SIMULATOR.JS - Cascading Delay Simulation
// Phase 2: Smart Scheduling
// ============================================================

/**
 * Delay Simulator - Simulates and visualizes cascade effects of delays
 * Helps understand impact of task delays on dependent tasks
 */

export class DelaySimulator {
    constructor() {
        this.config = {
            maxCascadeDepth: 10,
            defaultBufferDays: 1,
            riskThreshold: 0.3  // 30% chance of delay = high risk
        };
    }

    // ============================================================
    // DELAY SIMULATION
    // ============================================================

    /**
     * Simulate the cascade effect of delaying a task
     * @param {Object} task - The task being delayed
     * @param {number} delayDays - Number of days to delay
     * @param {Array} allTasks - All tasks for dependency checking
     * @returns {Object} Simulation results
     */
    simulateDelay(task, delayDays, allTasks) {
        const affectedTasks = [];
        const visited = new Set();

        // Build dependency graph
        const dependencyGraph = this._buildDependencyGraph(allTasks);

        // Find all tasks that depend on this one (recursively)
        this._findAffectedTasks(task.id, delayDays, dependencyGraph, allTasks, affectedTasks, visited, 0);

        // Calculate total impact
        const totalImpact = this._calculateTotalImpact(affectedTasks);

        // Generate visualization data
        const visualization = this._generateVisualization(task, affectedTasks, delayDays);

        return {
            originalTask: {
                id: task.id,
                title: task.title,
                originalDeadline: task.deadline,
                newDeadline: this._addDays(task.deadline, delayDays),
                delayDays
            },
            affectedTasks: affectedTasks.map(a => ({
                ...a,
                originalDeadline: this._getTaskById(allTasks, a.taskId)?.deadline,
                criticality: this._getCriticality(a)
            })),
            impact: totalImpact,
            visualization,
            recommendations: this._getDelayRecommendations(affectedTasks, totalImpact)
        };
    }

    _buildDependencyGraph(tasks) {
        const graph = {
            dependsOn: {},      // taskId -> [taskIds it depends on]
            dependedBy: {}      // taskId -> [taskIds that depend on it]
        };

        for (const task of tasks) {
            graph.dependsOn[task.id] = task.dependencies || [];

            for (const depId of (task.dependencies || [])) {
                if (!graph.dependedBy[depId]) {
                    graph.dependedBy[depId] = [];
                }
                graph.dependedBy[depId].push(task.id);
            }
        }

        return graph;
    }

    _findAffectedTasks(taskId, delayDays, graph, allTasks, results, visited, depth) {
        if (depth >= this.config.maxCascadeDepth) return;
        if (visited.has(taskId)) return;
        visited.add(taskId);

        const dependentTaskIds = graph.dependedBy[taskId] || [];

        for (const depId of dependentTaskIds) {
            const depTask = this._getTaskById(allTasks, depId);
            if (!depTask || depTask.status === 'completed') continue;

            // Calculate propagated delay
            const propagatedDelay = this._calculatePropagatedDelay(depTask, delayDays);

            if (propagatedDelay > 0) {
                results.push({
                    taskId: depId,
                    title: depTask.title,
                    cascadeLevel: depth + 1,
                    propagatedDelay,
                    newDeadline: this._addDays(depTask.deadline, propagatedDelay),
                    hasBuffer: this._hasBuffer(depTask),
                    bufferDays: this._getBufferDays(depTask)
                });

                // Recursively check tasks that depend on this one
                this._findAffectedTasks(depId, propagatedDelay, graph, allTasks, results, visited, depth + 1);
            }
        }
    }

    _calculatePropagatedDelay(task, upstreamDelay) {
        const buffer = this._getBufferDays(task);

        // If task has enough buffer, no propagation
        if (buffer >= upstreamDelay) {
            return 0;
        }

        // Otherwise, propagate the exceeding delay
        return upstreamDelay - buffer;
    }

    _getBufferDays(task) {
        if (!task.deadline || !task.estimatedTime) return 0;

        const deadline = new Date(task.deadline);
        const now = new Date();
        const estimatedDays = (task.estimatedTime || 0) / 60 / 8; // Assuming 8-hour days

        const daysUntilDeadline = (deadline - now) / (1000 * 60 * 60 * 24);
        return Math.max(0, daysUntilDeadline - estimatedDays);
    }

    _hasBuffer(task) {
        return this._getBufferDays(task) > 0;
    }

    _getTaskById(tasks, id) {
        return tasks.find(t => t.id === id);
    }

    _addDays(dateStr, days) {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    _calculateTotalImpact(affectedTasks) {
        if (affectedTasks.length === 0) {
            return { level: 'none', score: 0, summary: 'No downstream tasks affected' };
        }

        const maxCascade = Math.max(...affectedTasks.map(t => t.cascadeLevel));
        const totalDelayDays = affectedTasks.reduce((sum, t) => sum + t.propagatedDelay, 0);
        const criticalTasks = affectedTasks.filter(t => t.cascadeLevel <= 2 && t.propagatedDelay > 0);

        let score = 0;
        score += affectedTasks.length * 0.1;
        score += maxCascade * 0.2;
        score += totalDelayDays * 0.05;
        score += criticalTasks.length * 0.15;

        let level = 'low';
        if (score >= 0.7) level = 'critical';
        else if (score >= 0.4) level = 'high';
        else if (score >= 0.2) level = 'medium';

        return {
            level,
            score: Math.min(1, score),
            summary: `${affectedTasks.length} tasks affected across ${maxCascade} cascade levels`,
            metrics: {
                affectedTaskCount: affectedTasks.length,
                maxCascadeDepth: maxCascade,
                totalDelayDays,
                criticalTaskCount: criticalTasks.length
            }
        };
    }

    _getCriticality(affected) {
        if (affected.cascadeLevel === 1 && affected.propagatedDelay > 2) return 'critical';
        if (affected.cascadeLevel <= 2 && affected.propagatedDelay > 0) return 'high';
        if (affected.propagatedDelay > 0) return 'medium';
        return 'low';
    }

    _generateVisualization(rootTask, affectedTasks, delayDays) {
        // Generate data for cascade visualization
        const nodes = [
            {
                id: rootTask.id,
                label: rootTask.title,
                level: 0,
                delay: delayDays,
                type: 'root'
            }
        ];

        const edges = [];

        for (const affected of affectedTasks) {
            nodes.push({
                id: affected.taskId,
                label: affected.title,
                level: affected.cascadeLevel,
                delay: affected.propagatedDelay,
                type: affected.propagatedDelay > 0 ? 'affected' : 'buffered'
            });
        }

        // Create edges based on cascade levels
        for (const affected of affectedTasks) {
            // Find parent (previous level tasks that this depends on)
            const parents = affectedTasks.filter(t =>
                t.cascadeLevel === affected.cascadeLevel - 1
            );

            if (parents.length > 0) {
                edges.push({
                    from: parents[0].taskId,
                    to: affected.taskId,
                    propagatedDelay: affected.propagatedDelay
                });
            } else if (affected.cascadeLevel === 1) {
                edges.push({
                    from: rootTask.id,
                    to: affected.taskId,
                    propagatedDelay: affected.propagatedDelay
                });
            }
        }

        return { nodes, edges };
    }

    _getDelayRecommendations(affectedTasks, impact) {
        const recommendations = [];

        if (impact.level === 'critical') {
            recommendations.push({
                priority: 'urgent',
                action: 'Minimize delay',
                message: 'This delay will have severe cascade effects. Consider working overtime or getting help.'
            });
        }

        // Find tasks with no buffer that will be directly affected
        const noBufferTasks = affectedTasks.filter(t => !t.hasBuffer && t.cascadeLevel === 1);
        if (noBufferTasks.length > 0) {
            recommendations.push({
                priority: 'high',
                action: 'Renegotiate deadlines',
                message: `${noBufferTasks.length} immediate dependent task(s) have no buffer. Contact stakeholders now.`,
                affectedTasks: noBufferTasks.map(t => t.title)
            });
        }

        // Find tasks with buffer that can absorb
        const bufferedTasks = affectedTasks.filter(t => t.hasBuffer && t.propagatedDelay === 0);
        if (bufferedTasks.length > 0) {
            recommendations.push({
                priority: 'info',
                action: 'Monitor buffered tasks',
                message: `${bufferedTasks.length} task(s) can absorb the delay with their buffer.`,
                affectedTasks: bufferedTasks.map(t => t.title)
            });
        }

        if (impact.level === 'none') {
            recommendations.push({
                priority: 'low',
                action: 'Proceed with caution',
                message: 'No downstream tasks affected, but update stakeholders on new timeline.'
            });
        }

        return recommendations;
    }

    // ============================================================
    // RESCHEDULE ANALYSIS
    // ============================================================

    /**
     * Analyze the impact of rescheduling a task
     * @param {Object} task - Task to reschedule
     * @param {Date} newDate - New scheduled date
     * @param {Array} allTasks - All tasks
     * @returns {Object} Reschedule analysis
     */
    analyzeReschedule(task, newDate, allTasks) {
        const currentDate = task.deadline ? new Date(task.deadline) : new Date();
        const newDateTime = new Date(newDate);
        const daysDiff = Math.ceil((newDateTime - currentDate) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 0) {
            return {
                safe: true,
                message: 'Moving task earlier - no cascade impact',
                daysMoved: daysDiff
            };
        }

        // Simulate the delay
        const simulation = this.simulateDelay(task, daysDiff, allTasks);

        return {
            safe: simulation.impact.level === 'none' || simulation.impact.level === 'low',
            daysMoved: daysDiff,
            impact: simulation.impact,
            affectedCount: simulation.affectedTasks.length,
            recommendations: simulation.recommendations,
            visualization: simulation.visualization
        };
    }

    // ============================================================
    // RISK ANALYSIS
    // ============================================================

    /**
     * Analyze delay risk for all tasks
     * @param {Array} tasks - All tasks
     * @returns {Array} Tasks with delay risk analysis
     */
    analyzeDelayRisks(tasks) {
        const riskAnalysis = [];

        for (const task of tasks) {
            if (task.status === 'completed' || task.status === 'cancelled') continue;

            // Calculate individual risk factors
            const riskFactors = this._calculateRiskFactors(task, tasks);
            const overallRisk = this._calculateOverallRisk(riskFactors);

            // Simulate potential 1-day delay impact
            const delayImpact = this.simulateDelay(task, 1, tasks);

            riskAnalysis.push({
                taskId: task.id,
                title: task.title,
                deadline: task.deadline,
                riskFactors,
                overallRisk,
                potentialImpact: delayImpact.impact,
                dependentCount: delayImpact.affectedTasks.length,
                recommendation: this._getRiskRecommendation(overallRisk, delayImpact)
            });
        }

        return riskAnalysis.sort((a, b) => b.overallRisk - a.overallRisk);
    }

    _calculateRiskFactors(task, allTasks) {
        const factors = {};

        // 1. Time pressure (deadline proximity)
        if (task.deadline) {
            const daysUntil = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24);
            factors.timePressure = daysUntil < 3 ? 0.9 : daysUntil < 7 ? 0.5 : 0.2;
        } else {
            factors.timePressure = 0.3;
        }

        // 2. Dependency count (tasks depending on this)
        const dependentCount = allTasks.filter(t =>
            t.dependencies?.includes(task.id)
        ).length;
        factors.dependencyRisk = Math.min(dependentCount * 0.2, 0.8);

        // 3. Complexity
        const complexity = task.complexity || 'medium';
        factors.complexityRisk = { low: 0.2, medium: 0.4, high: 0.7 }[complexity];

        // 4. Buffer available
        const buffer = this._getBufferDays(task);
        factors.bufferRisk = buffer < 1 ? 0.8 : buffer < 3 ? 0.4 : 0.1;

        // 5. Progress (if started but slow)
        if (task.status === 'in_progress' && task.progress < 50) {
            factors.progressRisk = 0.6;
        } else {
            factors.progressRisk = 0.2;
        }

        return factors;
    }

    _calculateOverallRisk(factors) {
        const weights = {
            timePressure: 0.3,
            dependencyRisk: 0.25,
            complexityRisk: 0.15,
            bufferRisk: 0.2,
            progressRisk: 0.1
        };

        let risk = 0;
        for (const [factor, value] of Object.entries(factors)) {
            risk += (value || 0) * (weights[factor] || 0.1);
        }

        return Math.min(1, risk);
    }

    _getRiskRecommendation(risk, impact) {
        if (risk >= 0.7) {
            return 'High priority - add buffer or get help immediately';
        }
        if (risk >= 0.4 && impact.metrics?.affectedTaskCount > 2) {
            return 'Monitor closely - delay would affect multiple tasks';
        }
        if (risk >= 0.4) {
            return 'Medium risk - ensure no blockers';
        }
        return 'Low risk - continue as planned';
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const delaySimulator = new DelaySimulator();

export function initDelaySimulator() {
    console.log('⏰ [Delay Simulator] Initialized');
    return delaySimulator;
}
