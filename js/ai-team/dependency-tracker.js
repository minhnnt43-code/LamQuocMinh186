// ============================================================
// DEPENDENCY-TRACKER.JS - Cross-Team Dependency Tracking
// Phase 4: Team Intelligence
// ============================================================

/**
 * Dependency Tracker - Tracks dependencies across team members
 * Identifies blockers and coordination needs
 */

import { teamIntelligence } from './team-intelligence.js';

export class DependencyTracker {
    constructor() {
        this.dependencies = new Map(); // taskId -> dependency info
        this.blockedTasks = new Map(); // taskId -> blocker info
    }

    // ============================================================
    // DEPENDENCY REGISTRATION
    // ============================================================

    /**
     * Register a dependency between tasks
     * @param {string} taskId - Dependent task
     * @param {string} dependsOnId - Task it depends on
     * @param {Object} options - Dependency options
     */
    registerDependency(taskId, dependsOnId, options = {}) {
        const {
            type = 'blocks',        // blocks, informs, enables
            critical = false,
            description = ''
        } = options;

        if (!this.dependencies.has(taskId)) {
            this.dependencies.set(taskId, []);
        }

        this.dependencies.get(taskId).push({
            dependsOn: dependsOnId,
            type,
            critical,
            description,
            status: 'pending',
            registeredAt: new Date().toISOString()
        });
    }

    /**
     * Mark a dependency as resolved
     * @param {string} taskId - Task ID
     * @param {string} dependsOnId - Resolved dependency
     */
    resolveDependency(taskId, dependsOnId) {
        const deps = this.dependencies.get(taskId);
        if (!deps) return false;

        const dep = deps.find(d => d.dependsOn === dependsOnId);
        if (dep) {
            dep.status = 'resolved';
            dep.resolvedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    // ============================================================
    // DEPENDENCY ANALYSIS
    // ============================================================

    /**
     * Analyze dependencies for a set of tasks
     * @param {Array} tasks - Tasks to analyze
     * @returns {Object} Dependency analysis
     */
    analyzeDependencies(tasks) {
        const graph = this._buildDependencyGraph(tasks);
        const chains = this._findDependencyChains(graph, tasks);
        const crossTeam = this._identifyCrossTeamDependencies(tasks);
        const criticalPath = this._findCriticalPath(graph, tasks);

        return {
            totalDependencies: this._countDependencies(tasks),
            blockedTasks: this._getBlockedTasks(tasks),
            dependencyChains: chains,
            crossTeamDependencies: crossTeam,
            criticalPath,
            risks: this._identifyDependencyRisks(tasks, chains, crossTeam),
            recommendations: this._generateDependencyRecommendations(tasks, chains)
        };
    }

    _buildDependencyGraph(tasks) {
        const graph = {
            nodes: new Map(),
            edges: []
        };

        for (const task of tasks) {
            graph.nodes.set(task.id, {
                id: task.id,
                title: task.title,
                status: task.status,
                assignee: task.assignee
            });

            for (const depId of (task.dependencies || [])) {
                graph.edges.push({
                    from: depId,
                    to: task.id,
                    type: 'blocks'
                });
            }
        }

        return graph;
    }

    _findDependencyChains(graph, tasks) {
        const chains = [];
        const visited = new Set();

        // Find root tasks (no dependencies)
        const roots = tasks.filter(t =>
            !t.dependencies || t.dependencies.length === 0
        );

        for (const root of roots) {
            const chain = this._traverseChain(root.id, graph, visited, tasks);
            if (chain.length > 1) {
                chains.push(chain);
            }
        }

        return chains;
    }

    _traverseChain(taskId, graph, visited, tasks) {
        if (visited.has(taskId)) return [];
        visited.add(taskId);

        const chain = [taskId];

        // Find tasks that depend on this one
        const dependents = graph.edges
            .filter(e => e.from === taskId)
            .map(e => e.to);

        if (dependents.length > 0) {
            // Follow the longest chain
            let longestSubChain = [];
            for (const depId of dependents) {
                const subChain = this._traverseChain(depId, graph, visited, tasks);
                if (subChain.length > longestSubChain.length) {
                    longestSubChain = subChain;
                }
            }
            chain.push(...longestSubChain);
        }

        return chain;
    }

    _identifyCrossTeamDependencies(tasks) {
        const crossTeam = [];

        for (const task of tasks) {
            if (!task.dependencies) continue;

            for (const depId of task.dependencies) {
                const depTask = tasks.find(t => t.id === depId);
                if (depTask && task.assignee !== depTask.assignee) {
                    crossTeam.push({
                        waiting: { id: task.id, title: task.title, assignee: task.assignee },
                        waitingOn: { id: depTask.id, title: depTask.title, assignee: depTask.assignee },
                        status: depTask.status,
                        isBlocking: depTask.status !== 'completed'
                    });
                }
            }
        }

        return crossTeam;
    }

    _findCriticalPath(graph, tasks) {
        // Critical path = longest dependency chain with deadlines
        const tasksWithDeadlines = tasks.filter(t => t.deadline);
        if (tasksWithDeadlines.length === 0) return null;

        // Find the chain ending at the task with earliest deadline
        const sorted = [...tasksWithDeadlines].sort((a, b) =>
            new Date(a.deadline) - new Date(b.deadline)
        );

        const criticalTask = sorted[0];
        const path = this._traceDependencyPath(criticalTask.id, graph, tasks);

        return {
            endTask: criticalTask.id,
            deadline: criticalTask.deadline,
            path: path.reverse(),
            length: path.length
        };
    }

    _traceDependencyPath(taskId, graph, tasks) {
        const path = [taskId];
        const task = tasks.find(t => t.id === taskId);

        if (task?.dependencies?.length > 0) {
            // Get the blocking dependency with highest priority
            const deps = task.dependencies
                .map(d => tasks.find(t => t.id === d))
                .filter(Boolean)
                .sort((a, b) => {
                    const order = { critical: 0, high: 1, medium: 2, low: 3 };
                    return (order[a.priority] || 2) - (order[b.priority] || 2);
                });

            if (deps.length > 0) {
                path.push(...this._traceDependencyPath(deps[0].id, graph, tasks));
            }
        }

        return path;
    }

    _countDependencies(tasks) {
        return tasks.reduce((sum, t) => sum + (t.dependencies?.length || 0), 0);
    }

    _getBlockedTasks(tasks) {
        return tasks
            .filter(task => {
                if (!task.dependencies?.length) return false;

                return task.dependencies.some(depId => {
                    const dep = tasks.find(t => t.id === depId);
                    return dep && dep.status !== 'completed';
                });
            })
            .map(task => ({
                id: task.id,
                title: task.title,
                blockedBy: task.dependencies.filter(depId => {
                    const dep = tasks.find(t => t.id === depId);
                    return dep && dep.status !== 'completed';
                })
            }));
    }

    _identifyDependencyRisks(tasks, chains, crossTeam) {
        const risks = [];

        // Long chains
        for (const chain of chains) {
            if (chain.length >= 4) {
                risks.push({
                    type: 'long_chain',
                    severity: 'medium',
                    message: `Long dependency chain of ${chain.length} tasks`,
                    tasks: chain
                });
            }
        }

        // Blocked cross-team dependencies
        const blocked = crossTeam.filter(ct => ct.isBlocking);
        if (blocked.length > 0) {
            risks.push({
                type: 'cross_team_block',
                severity: 'high',
                message: `${blocked.length} cross-team dependency blocks`,
                items: blocked
            });
        }

        // Single point of failure
        const assigneeCounts = {};
        for (const ct of crossTeam) {
            const key = ct.waitingOn.assignee;
            assigneeCounts[key] = (assigneeCounts[key] || 0) + 1;
        }

        for (const [assignee, count] of Object.entries(assigneeCounts)) {
            if (count >= 3) {
                risks.push({
                    type: 'bottleneck',
                    severity: 'high',
                    message: `${assignee || 'Unassigned'} is blocking ${count} cross-team tasks`,
                    assignee
                });
            }
        }

        return risks;
    }

    _generateDependencyRecommendations(tasks, chains) {
        const recommendations = [];

        // Check for circular dependencies
        if (this._hasCircularDependency(tasks)) {
            recommendations.push({
                priority: 'critical',
                message: 'Circular dependency detected',
                action: 'Review and break the dependency cycle'
            });
        }

        // Recommend parallel work
        const parallelizable = this._findParallelizableWork(tasks);
        if (parallelizable.length > 0) {
            recommendations.push({
                priority: 'info',
                message: 'Some blocked tasks could be partially worked on',
                tasks: parallelizable
            });
        }

        return recommendations;
    }

    _hasCircularDependency(tasks) {
        const visiting = new Set();
        const visited = new Set();

        const hasCycle = (taskId) => {
            if (visiting.has(taskId)) return true;
            if (visited.has(taskId)) return false;

            visiting.add(taskId);

            const task = tasks.find(t => t.id === taskId);
            for (const depId of (task?.dependencies || [])) {
                if (hasCycle(depId)) return true;
            }

            visiting.delete(taskId);
            visited.add(taskId);
            return false;
        };

        return tasks.some(t => hasCycle(t.id));
    }

    _findParallelizableWork(tasks) {
        // Find blocked tasks that have some work that can be done
        return tasks
            .filter(t => {
                // Blocked but has subtasks or prep work possible
                const isBlocked = t.dependencies?.some(d => {
                    const dep = tasks.find(dt => dt.id === d);
                    return dep && dep.status !== 'completed';
                });

                return isBlocked && (t.subtasks?.length > 0 || t.progress === 0);
            })
            .map(t => ({
                id: t.id,
                title: t.title,
                suggestion: t.subtasks?.length > 0
                    ? 'Work on independent subtasks'
                    : 'Start research/preparation'
            }));
    }

    // ============================================================
    // COORDINATION NEEDS
    // ============================================================

    /**
     * Identify coordination needs
     * @param {Array} tasks - Tasks to analyze
     * @returns {Array} Coordination recommendations
     */
    identifyCoordinationNeeds(tasks) {
        const needs = [];

        // Group by cross-team pairs
        const pairs = {};
        for (const task of tasks) {
            if (!task.dependencies) continue;

            for (const depId of task.dependencies) {
                const dep = tasks.find(t => t.id === depId);
                if (dep && task.assignee && dep.assignee && task.assignee !== dep.assignee) {
                    const key = [task.assignee, dep.assignee].sort().join('-');
                    if (!pairs[key]) pairs[key] = [];
                    pairs[key].push({ task, dep });
                }
            }
        }

        // Generate coordination needs
        for (const [pairKey, dependencies] of Object.entries(pairs)) {
            if (dependencies.length >= 2) {
                const [member1, member2] = pairKey.split('-');
                needs.push({
                    type: 'recurring_sync',
                    members: [member1, member2],
                    dependencyCount: dependencies.length,
                    recommendation: 'Schedule regular sync to coordinate handoffs'
                });
            }
        }

        return needs;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const dependencyTracker = new DependencyTracker();

export function initDependencyTracker() {
    console.log('🔗 [Dependency Tracker] Initialized');
    return dependencyTracker;
}
