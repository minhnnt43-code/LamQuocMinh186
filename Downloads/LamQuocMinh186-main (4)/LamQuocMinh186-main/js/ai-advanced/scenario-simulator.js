// ============================================================
// SCENARIO-SIMULATOR.JS - What-If Scenario Simulation
// Phase 9: Advanced AI Features
// ============================================================

/**
 * Scenario Simulator - Run what-if scenarios for planning
 */

export class ScenarioSimulator {
    constructor() {
        this.scenarios = [];
        this.simulations = [];
    }

    // ============================================================
    // SCENARIO SIMULATION
    // ============================================================

    /**
     * Simulate a what-if scenario
     * @param {Object} scenario - Scenario parameters
     * @param {Array} tasks - Current tasks
     * @returns {Object} Simulation result
     */
    simulate(scenario, tasks) {
        const simulation = {
            id: `sim_${Date.now()}`,
            scenario,
            startedAt: new Date().toISOString(),
            results: null
        };

        switch (scenario.type) {
            case 'add_task':
                simulation.results = this._simulateAddTask(scenario.task, tasks);
                break;
            case 'deadline_change':
                simulation.results = this._simulateDeadlineChange(scenario.taskId, scenario.newDeadline, tasks);
                break;
            case 'remove_member':
                simulation.results = this._simulateRemoveMember(scenario.memberId, tasks);
                break;
            case 'priority_shift':
                simulation.results = this._simulatePriorityShift(scenario.taskId, scenario.newPriority, tasks);
                break;
            case 'capacity_change':
                simulation.results = this._simulateCapacityChange(scenario.changePercent, tasks);
                break;
            default:
                simulation.results = { error: 'Unknown scenario type' };
        }

        this.simulations.push(simulation);
        return simulation;
    }

    _simulateAddTask(newTask, existingTasks) {
        const allTasks = [...existingTasks, newTask];

        // Calculate impact
        const currentWorkload = this._calculateWorkload(existingTasks);
        const newWorkload = this._calculateWorkload(allTasks);

        // Find deadlines at risk
        const atRiskDeadlines = this._findAtRiskDeadlines(allTasks);

        // Estimate completion impact
        const impact = {
            workloadIncrease: newWorkload - currentWorkload,
            newTotalTasks: allTasks.length,
            atRiskDeadlines,
            recommendedActions: []
        };

        if (impact.workloadIncrease > 0.2) {
            impact.recommendedActions.push('Consider deferring lower priority tasks');
        }

        if (atRiskDeadlines.length > 0) {
            impact.recommendedActions.push(`${atRiskDeadlines.length} deadline(s) may be affected`);
        }

        return {
            feasible: newWorkload <= 1.2,
            impact,
            recommendation: newWorkload <= 1 ? 'Safe to add' : 'Workload will be high'
        };
    }

    _simulateDeadlineChange(taskId, newDeadline, tasks) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return { error: 'Task not found' };

        const oldDeadline = task.deadline;
        const daysChange = (new Date(newDeadline) - new Date(oldDeadline)) / (1000 * 60 * 60 * 24);

        // Find dependent tasks
        const dependents = tasks.filter(t => t.dependencies?.includes(taskId));

        const impact = {
            originalDeadline: oldDeadline,
            newDeadline,
            daysChange,
            dependentsAffected: dependents.length,
            affectedTasks: dependents.map(d => ({
                id: d.id,
                title: d.title,
                mayNeedAdjustment: d.deadline && new Date(d.deadline) < new Date(newDeadline)
            }))
        };

        return {
            feasible: true,
            impact,
            cascadeEffect: dependents.filter(d =>
                d.deadline && new Date(d.deadline) < new Date(newDeadline)
            ).length
        };
    }

    _simulateRemoveMember(memberId, tasks) {
        const memberTasks = tasks.filter(t => t.assignee === memberId);
        const unassignedLoad = this._calculateWorkload(memberTasks);

        return {
            tasksToReassign: memberTasks.length,
            workloadToRedistribute: unassignedLoad,
            criticalTasks: memberTasks.filter(t => t.priority === 'critical').length,
            impact: memberTasks.length > 5 ? 'high' : 'medium',
            recommendation: memberTasks.length > 0
                ? 'Need to reassign tasks before removal'
                : 'No task impact'
        };
    }

    _simulatePriorityShift(taskId, newPriority, tasks) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return { error: 'Task not found' };

        // Find other tasks that may be bumped
        const samePriorityTasks = tasks.filter(t =>
            t.priority === newPriority && t.id !== taskId
        );

        return {
            task: { id: task.id, title: task.title },
            priorityChange: { from: task.priority, to: newPriority },
            competing: samePriorityTasks.length,
            mayDelay: samePriorityTasks.slice(0, 3).map(t => t.title),
            impact: newPriority === 'critical' ? 'high' : 'low'
        };
    }

    _simulateCapacityChange(changePercent, tasks) {
        const currentWorkload = this._calculateWorkload(tasks);
        const adjustedCapacity = 1 + (changePercent / 100);
        const effectiveWorkload = currentWorkload / adjustedCapacity;

        return {
            capacityChange: changePercent,
            currentWorkload,
            effectiveWorkload,
            status: effectiveWorkload > 1 ? 'overloaded' : effectiveWorkload > 0.8 ? 'high' : 'manageable',
            tasksAtRisk: this._findAtRiskDeadlines(tasks, adjustedCapacity).length
        };
    }

    _calculateWorkload(tasks) {
        const activeTasks = tasks.filter(t => t.status !== 'completed');
        const totalHours = activeTasks.reduce((sum, t) => sum + (t.estimatedTime || 60) / 60, 0);
        return totalHours / 40; // Normalized to 40-hour week
    }

    _findAtRiskDeadlines(tasks, capacityMultiplier = 1) {
        const now = Date.now();
        return tasks.filter(t => {
            if (!t.deadline || t.status === 'completed') return false;
            const daysUntil = (new Date(t.deadline) - now) / (1000 * 60 * 60 * 24);
            const estimatedDays = ((t.estimatedTime || 60) / 60) / (8 * capacityMultiplier);
            return daysUntil < estimatedDays * 1.5;
        });
    }

    // ============================================================
    // SCENARIO COMPARISON
    // ============================================================

    /**
     * Compare multiple scenarios
     * @param {Array} scenarios - Scenarios to compare
     * @param {Array} tasks - Current tasks
     * @returns {Object} Comparison result
     */
    compare(scenarios, tasks) {
        const results = scenarios.map(s => ({
            name: s.name || s.type,
            result: this.simulate(s, tasks).results
        }));

        return {
            scenarios: results,
            recommendation: this._recommendBestScenario(results)
        };
    }

    _recommendBestScenario(results) {
        const scored = results.map(r => ({
            name: r.name,
            score: r.result.feasible !== false ? 1 : 0
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.name || 'No clear winner';
    }

    // ============================================================
    // SAVED SCENARIOS
    // ============================================================

    /**
     * Save a scenario for future use
     * @param {string} name - Scenario name
     * @param {Object} scenario - Scenario parameters
     */
    saveScenario(name, scenario) {
        this.scenarios.push({
            name,
            scenario,
            savedAt: new Date().toISOString()
        });
    }

    /**
     * Get saved scenarios
     * @returns {Array} Saved scenarios
     */
    getSavedScenarios() {
        return this.scenarios;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const scenarioSimulator = new ScenarioSimulator();
export function initScenarioSimulator() {
    console.log('🔮 [Scenario Simulator] Initialized');
    return scenarioSimulator;
}
