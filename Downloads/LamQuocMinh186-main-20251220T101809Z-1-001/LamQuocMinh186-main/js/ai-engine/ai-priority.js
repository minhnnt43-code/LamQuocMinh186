// ============================================================
// AI-PRIORITY.JS - Intelligent Priority Engine
// Phase 1: Foundation & Core Intelligence
// ============================================================

/**
 * Priority Engine - Calculates intelligent task priorities
 * Context-aware, learns from user behavior
 */

export class PriorityEngine {
    constructor(userProfile) {
        this.userProfile = userProfile;

        // Priority weights (configurable)
        this.weights = {
            deadline: 0.25,
            importance: 0.20,
            effort: 0.10,
            dependencies: 0.15,
            energy_match: 0.10,
            context: 0.10,
            staleness: 0.10
        };
    }

    // ============================================================
    // PRIORITY CALCULATION
    // ============================================================

    /**
     * Calculate intelligent priority for a task
     * @param {Object} task - Task object
     * @param {Object} context - Current context
     * @returns {Object} Priority score and factors
     */
    calculate(task, context = {}) {
        const factors = {};
        let totalScore = 0;

        // Factor 1: Deadline urgency
        factors.deadline = this._calculateDeadlineUrgency(task);
        totalScore += factors.deadline.score * this.weights.deadline;

        // Factor 2: Importance/Impact
        factors.importance = this._calculateImportance(task);
        totalScore += factors.importance.score * this.weights.importance;

        // Factor 3: Effort (prefer quick wins when energy low)
        factors.effort = this._calculateEffortScore(task, context);
        totalScore += factors.effort.score * this.weights.effort;

        // Factor 4: Dependencies (blocking others = higher priority)
        factors.dependencies = this._calculateDependencyScore(task, context);
        totalScore += factors.dependencies.score * this.weights.dependencies;

        // Factor 5: Energy match (current energy level vs task requirement)
        factors.energyMatch = this._calculateEnergyMatch(task, context);
        totalScore += factors.energyMatch.score * this.weights.energy_match;

        // Factor 6: Context relevance
        factors.context = this._calculateContextRelevance(task, context);
        totalScore += factors.context.score * this.weights.context;

        // Factor 7: Staleness (how long has it been waiting)
        factors.staleness = this._calculateStaleness(task);
        totalScore += factors.staleness.score * this.weights.staleness;

        // Normalize to 0-100
        const priorityScore = Math.round(totalScore * 100);

        return {
            score: priorityScore,
            level: this._getPriorityLevel(priorityScore),
            factors,
            reasoning: this._generateReasoning(factors),
            suggestedAction: this._getSuggestedAction(priorityScore, factors)
        };
    }

    _calculateDeadlineUrgency(task) {
        if (!task.deadline) {
            return { score: 0.3, reason: 'No deadline set' };
        }

        const now = new Date();
        const deadline = new Date(task.deadline);
        const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);

        let score = 0;
        let reason = '';

        if (hoursUntilDeadline < 0) {
            score = 1.0;
            reason = 'Overdue!';
        } else if (hoursUntilDeadline < 4) {
            score = 0.95;
            reason = 'Due in less than 4 hours';
        } else if (hoursUntilDeadline < 24) {
            score = 0.85;
            reason = 'Due today';
        } else if (hoursUntilDeadline < 48) {
            score = 0.7;
            reason = 'Due tomorrow';
        } else if (hoursUntilDeadline < 168) { // 1 week
            score = 0.5;
            reason = 'Due this week';
        } else if (hoursUntilDeadline < 336) { // 2 weeks
            score = 0.3;
            reason = 'Due next week';
        } else {
            score = 0.2;
            reason = 'Due later';
        }

        return { score, reason, hoursUntilDeadline };
    }

    _calculateImportance(task) {
        // From explicit priority or derived
        const priorityMap = {
            'critical': 1.0,
            'high': 0.8,
            'medium': 0.5,
            'low': 0.3
        };

        let score = priorityMap[task.priority] || 0.5;
        let reasons = [];

        // Boost for tags
        if (task.tags?.includes('important')) {
            score = Math.min(score + 0.1, 1);
            reasons.push('Tagged as important');
        }

        if (task.tags?.includes('strategic')) {
            score = Math.min(score + 0.15, 1);
            reasons.push('Strategic task');
        }

        // Boost for project association
        if (task.project) {
            score = Math.min(score + 0.05, 1);
            reasons.push('Part of project');
        }

        return {
            score,
            reason: reasons.length > 0 ? reasons.join(', ') : `Priority: ${task.priority || 'medium'}`
        };
    }

    _calculateEffortScore(task, context) {
        const estimatedMinutes = task.estimatedTime || 30;
        const currentEnergy = context.energyLevel || 'medium';

        let score = 0.5;
        let reason = '';

        // Quick win preference when energy is low
        if (currentEnergy === 'low' && estimatedMinutes <= 15) {
            score = 0.9;
            reason = 'Quick win for low energy';
        } else if (currentEnergy === 'high' && estimatedMinutes >= 60) {
            score = 0.8;
            reason = 'Good time for deep work';
        } else if (estimatedMinutes <= 30) {
            score = 0.6;
            reason = 'Short task, easy to complete';
        } else {
            score = 0.4;
            reason = 'Longer task';
        }

        return { score, reason, estimatedMinutes };
    }

    _calculateDependencyScore(task, context) {
        // How many tasks are blocked by this one?
        const dependentTasks = context.allTasks?.filter(t =>
            t.dependencies?.includes(task.id)
        ) || [];

        let score = 0.3;
        let reason = 'No blocking dependencies';

        if (dependentTasks.length > 0) {
            score = Math.min(0.3 + (dependentTasks.length * 0.2), 1);
            reason = `Blocking ${dependentTasks.length} other task(s)`;
        }

        // Check if this task is blocked
        if (task.dependencies?.length > 0) {
            const blockedBy = task.dependencies.filter(depId => {
                const dep = context.allTasks?.find(t => t.id === depId);
                return dep && dep.status !== 'completed';
            });

            if (blockedBy.length > 0) {
                score = 0.1;
                reason = `Blocked by ${blockedBy.length} task(s)`;
            }
        }

        return { score, reason, dependentCount: dependentTasks.length };
    }

    _calculateEnergyMatch(task, context) {
        const taskComplexity = this._getTaskComplexity(task);
        const currentEnergy = context.energyLevel || 'medium';
        const currentHour = new Date().getHours();

        // Energy level mapping
        const energyLevels = { peak: 4, high: 3, medium: 2, low: 1 };
        const complexityLevels = { high: 4, medium: 2, low: 1 };

        const energyNum = energyLevels[currentEnergy] || 2;
        const complexityNum = complexityLevels[taskComplexity] || 2;

        // Good match: high energy + complex task OR low energy + simple task
        const diff = Math.abs(energyNum - complexityNum);

        let score = 0;
        let reason = '';

        if (diff <= 1) {
            score = 0.9;
            reason = 'Good energy match';
        } else if (diff === 2) {
            score = 0.5;
            reason = 'Moderate energy match';
        } else {
            score = 0.2;
            reason = 'Poor energy match';
        }

        return { score, reason, taskComplexity, currentEnergy };
    }

    _getTaskComplexity(task) {
        const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();

        const complexIndicators = ['complex', 'difficult', 'research', 'design', 'architecture', 'strategic', 'analyze'];
        const simpleIndicators = ['simple', 'quick', 'easy', 'update', 'minor', 'small', 'reply'];

        if (complexIndicators.some(w => text.includes(w))) return 'high';
        if (simpleIndicators.some(w => text.includes(w))) return 'low';

        // Estimate from time
        if (task.estimatedTime) {
            if (task.estimatedTime >= 120) return 'high';
            if (task.estimatedTime <= 30) return 'low';
        }

        return 'medium';
    }

    _calculateContextRelevance(task, context) {
        let score = 0.5;
        let reasons = [];

        // Currently active project
        if (context.activeProject && task.project === context.activeProject) {
            score += 0.2;
            reasons.push('Active project');
        }

        // Recently viewed category
        if (context.recentCategory && task.category === context.recentCategory) {
            score += 0.1;
            reasons.push('Recent focus area');
        }

        // Time-based context
        const hour = new Date().getHours();
        if (hour < 12 && task.tags?.includes('morning')) {
            score += 0.15;
            reasons.push('Morning task');
        } else if (hour >= 12 && hour < 17 && task.tags?.includes('afternoon')) {
            score += 0.15;
            reasons.push('Afternoon task');
        }

        // Day of week context
        const dayOfWeek = new Date().getDay();
        if (task.scheduledDay === dayOfWeek) {
            score += 0.1;
            reasons.push('Scheduled for today');
        }

        return {
            score: Math.min(score, 1),
            reason: reasons.length > 0 ? reasons.join(', ') : 'General task'
        };
    }

    _calculateStaleness(task) {
        if (!task.createdAt) {
            return { score: 0.3, reason: 'Unknown age' };
        }

        const now = new Date();
        const created = new Date(task.createdAt);
        const daysOld = (now - created) / (1000 * 60 * 60 * 24);

        let score = 0;
        let reason = '';

        // Tasks get higher priority as they age (to prevent permanent backlog)
        if (daysOld >= 14) {
            score = 0.9;
            reason = `Task is ${Math.floor(daysOld)} days old`;
        } else if (daysOld >= 7) {
            score = 0.7;
            reason = 'Over a week old';
        } else if (daysOld >= 3) {
            score = 0.5;
            reason = 'Few days old';
        } else {
            score = 0.3;
            reason = 'Recently created';
        }

        return { score, reason, daysOld: Math.floor(daysOld) };
    }

    _getPriorityLevel(score) {
        if (score >= 85) return 'critical';
        if (score >= 70) return 'high';
        if (score >= 50) return 'medium';
        if (score >= 30) return 'low';
        return 'minimal';
    }

    _generateReasoning(factors) {
        const topFactors = Object.entries(factors)
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, 3)
            .map(([name, data]) => `${name}: ${data.reason}`);

        return topFactors;
    }

    _getSuggestedAction(score, factors) {
        if (score >= 85) {
            return 'Do it now - this is your highest priority';
        }

        if (factors.deadline.score >= 0.85) {
            return 'Focus on this - deadline approaching';
        }

        if (factors.dependencies.score >= 0.8) {
            return 'Complete soon - others are waiting';
        }

        if (factors.staleness.score >= 0.7) {
            return 'Been waiting too long - tackle or delegate';
        }

        if (factors.energyMatch.score >= 0.8) {
            return 'Good time to work on this';
        }

        if (score >= 50) {
            return 'Schedule for later today';
        }

        return 'Can wait - focus on higher priorities';
    }

    // ============================================================
    // INTELLIGENT SORTING
    // ============================================================

    /**
     * Sort tasks by intelligent priority
     * @param {Array} tasks - Array of tasks
     * @param {Object} context - Current context
     * @returns {Array} Sorted tasks with priority info
     */
    sortByIntelligentPriority(tasks, context = {}) {
        return tasks
            .filter(t => t.status !== 'completed')
            .map(task => ({
                task,
                priority: this.calculate(task, { ...context, allTasks: tasks })
            }))
            .sort((a, b) => b.priority.score - a.priority.score)
            .map(item => ({
                ...item.task,
                aiPriority: item.priority
            }));
    }

    // ============================================================
    // PRIORITY SHIFT DETECTION
    // ============================================================

    /**
     * Detect when priorities should shift based on new context
     * @param {Object} newContext - New context information
     * @returns {Array} Tasks with suggested priority changes
     */
    detectShifts(newContext) {
        const shifts = [];
        const tasks = newContext.allTasks || [];

        for (const task of tasks) {
            if (task.status === 'completed') continue;

            // Recalculate priority with new context
            const newPriority = this.calculate(task, newContext);
            const oldScore = task.aiPriority?.score || 50;
            const scoreDiff = newPriority.score - oldScore;

            // Significant shift (more than 15 points)
            if (Math.abs(scoreDiff) >= 15) {
                shifts.push({
                    task,
                    oldScore,
                    newScore: newPriority.score,
                    change: scoreDiff > 0 ? 'increased' : 'decreased',
                    reason: this._explainShift(task, newContext, scoreDiff),
                    newPriority
                });
            }
        }

        return shifts.sort((a, b) => Math.abs(b.newScore - b.oldScore) - Math.abs(a.newScore - a.oldScore));
    }

    _explainShift(task, context, scoreDiff) {
        const reasons = [];

        // Check what changed
        if (context.newEmail && context.newEmail.mentions(task)) {
            reasons.push('Mentioned in new email');
        }

        if (context.newMeeting && context.newMeeting.relatedTo(task)) {
            reasons.push('Related meeting scheduled');
        }

        if (context.energyChange) {
            reasons.push(`Energy level changed to ${context.energyLevel}`);
        }

        if (context.timeOfDay && this._isTimeShift(context.timeOfDay)) {
            reasons.push('Time of day shift');
        }

        if (reasons.length === 0) {
            reasons.push(scoreDiff > 0 ? 'General priority increase' : 'General priority decrease');
        }

        return reasons.join('; ');
    }

    _isTimeShift(timeOfDay) {
        const transitions = {
            morning: [8, 9],
            midday: [12, 13],
            afternoon: [14, 15],
            evening: [17, 18]
        };

        const hour = new Date().getHours();
        return Object.values(transitions).some(range =>
            hour >= range[0] && hour <= range[1]
        );
    }
}
