// ============================================================
// VELOCITY-TRACKER.JS - Sprint & Productivity Velocity Tracking
// Phase 2: Smart Scheduling
// ============================================================

/**
 * Velocity Tracker - Track and predict task completion velocity
 * Used for sprint planning and capacity forecasting
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class VelocityTracker {
    constructor() {
        this.config = {
            sprintDurationDays: 7,    // 1 week sprints
            velocityWindow: 4,        // Number of sprints to average
            trendThreshold: 0.1       // 10% change = significant trend
        };

        this.velocityHistory = [];
        this.currentSprint = null;
    }

    // ============================================================
    // VELOCITY CALCULATION
    // ============================================================

    /**
     * Calculate current velocity
     * @param {Array} completedTasks - Recently completed tasks
     * @returns {Object} Velocity metrics
     */
    calculateVelocity(completedTasks) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Filter tasks completed this week
        const thisWeekTasks = completedTasks.filter(t =>
            t.completedAt && new Date(t.completedAt) >= weekAgo
        );

        // Calculate various velocity metrics
        const taskCount = thisWeekTasks.length;
        const totalPoints = thisWeekTasks.reduce((sum, t) => sum + (t.points || this._estimatePoints(t)), 0);
        const totalMinutes = thisWeekTasks.reduce((sum, t) => sum + (t.actualTime || t.estimatedTime || 30), 0);

        // Group by day
        const byDay = this._groupByDay(thisWeekTasks);

        return {
            period: {
                start: weekAgo.toISOString().split('T')[0],
                end: now.toISOString().split('T')[0]
            },
            metrics: {
                tasksCompleted: taskCount,
                totalPoints,
                totalMinutes,
                averageTasksPerDay: taskCount / 7,
                averagePointsPerDay: totalPoints / 7,
                averageMinutesPerDay: totalMinutes / 7
            },
            dailyBreakdown: byDay,
            comparison: this._compareToHistory(),
            trend: this._analyzeTrend()
        };
    }

    _estimatePoints(task) {
        // Estimate story points based on task properties
        const estimated = task.estimatedTime || 30;

        // Complexity adjustment
        const complexity = task.complexity || 'medium';
        const complexityMultiplier = { low: 0.5, medium: 1, high: 2 };

        // Base: 1 point per 30 minutes of work
        return Math.round((estimated / 30) * (complexityMultiplier[complexity] || 1));
    }

    _groupByDay(tasks) {
        const byDay = {};

        for (const task of tasks) {
            const day = new Date(task.completedAt).toISOString().split('T')[0];
            if (!byDay[day]) {
                byDay[day] = { count: 0, points: 0, minutes: 0 };
            }
            byDay[day].count++;
            byDay[day].points += task.points || this._estimatePoints(task);
            byDay[day].minutes += task.actualTime || task.estimatedTime || 30;
        }

        return byDay;
    }

    _compareToHistory() {
        if (this.velocityHistory.length < 2) {
            return { hasPrevious: false, message: 'Not enough history for comparison' };
        }

        const current = this.velocityHistory[this.velocityHistory.length - 1];
        const previous = this.velocityHistory[this.velocityHistory.length - 2];

        const taskChange = ((current.tasksCompleted - previous.tasksCompleted) / previous.tasksCompleted) * 100;
        const pointChange = ((current.totalPoints - previous.totalPoints) / previous.totalPoints) * 100;

        return {
            hasPrevious: true,
            taskChange: Math.round(taskChange),
            pointChange: Math.round(pointChange),
            status: taskChange >= 0 ? 'improved' : 'decreased'
        };
    }

    _analyzeTrend() {
        if (this.velocityHistory.length < 3) {
            return { trend: 'unknown', confidence: 'low' };
        }

        const recent = this.velocityHistory.slice(-4);
        const velocities = recent.map(v => v.totalPoints);

        // Simple linear regression
        const n = velocities.length;
        const sumX = n * (n - 1) / 2;
        const sumY = velocities.reduce((a, b) => a + b, 0);
        const sumXY = velocities.reduce((sum, y, x) => sum + x * y, 0);
        const sumXX = n * (n - 1) * (2 * n - 1) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const avgVelocity = sumY / n;
        const changeRate = slope / avgVelocity;

        let trend = 'stable';
        if (changeRate > this.config.trendThreshold) trend = 'increasing';
        if (changeRate < -this.config.trendThreshold) trend = 'decreasing';

        return {
            trend,
            changeRate: Math.round(changeRate * 100),
            confidence: n >= 4 ? 'high' : 'medium'
        };
    }

    // ============================================================
    // SPRINT MANAGEMENT
    // ============================================================

    /**
     * Start a new sprint
     * @param {Object} options - Sprint options
     * @returns {Object} Sprint info
     */
    startSprint(options = {}) {
        const {
            name = `Sprint ${this.velocityHistory.length + 1}`,
            durationDays = this.config.sprintDurationDays,
            goalPoints = null
        } = options;

        const now = new Date();
        const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // Calculate goal from average velocity if not provided
        const avgVelocity = this._getAverageVelocity();
        const suggestedGoal = Math.round(avgVelocity * 0.9); // 90% of average for safety

        this.currentSprint = {
            id: `sprint_${Date.now()}`,
            name,
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            goalPoints: goalPoints || suggestedGoal,
            suggestedGoal,
            completedPoints: 0,
            completedTasks: 0,
            status: 'active'
        };

        return this.currentSprint;
    }

    /**
     * End current sprint
     * @returns {Object} Sprint summary
     */
    endSprint() {
        if (!this.currentSprint) {
            return { error: 'No active sprint' };
        }

        const sprint = {
            ...this.currentSprint,
            actualEndDate: new Date().toISOString(),
            status: 'completed',
            goalMet: this.currentSprint.completedPoints >= this.currentSprint.goalPoints,
            completionRate: (this.currentSprint.completedPoints / this.currentSprint.goalPoints) * 100
        };

        // Add to history
        this.velocityHistory.push({
            sprintId: sprint.id,
            date: sprint.actualEndDate,
            tasksCompleted: sprint.completedTasks,
            totalPoints: sprint.completedPoints,
            goalPoints: sprint.goalPoints
        });

        if (this.velocityHistory.length > 20) {
            this.velocityHistory.shift();
        }

        this.currentSprint = null;

        return {
            sprint,
            insights: this._generateSprintInsights(sprint)
        };
    }

    /**
     * Record task completion in current sprint
     * @param {Object} task - Completed task
     */
    recordCompletion(task) {
        if (!this.currentSprint) return;

        const points = task.points || this._estimatePoints(task);
        this.currentSprint.completedPoints += points;
        this.currentSprint.completedTasks++;

        return {
            currentPoints: this.currentSprint.completedPoints,
            goalPoints: this.currentSprint.goalPoints,
            progress: Math.round((this.currentSprint.completedPoints / this.currentSprint.goalPoints) * 100)
        };
    }

    _getAverageVelocity() {
        if (this.velocityHistory.length === 0) return 20; // Default

        const recent = this.velocityHistory.slice(-this.config.velocityWindow);
        return recent.reduce((sum, v) => sum + v.totalPoints, 0) / recent.length;
    }

    _generateSprintInsights(sprint) {
        const insights = [];

        if (sprint.goalMet) {
            insights.push({
                type: 'success',
                message: 'Sprint goal achieved!',
                suggestion: 'Consider increasing next sprint goal by 10%'
            });
        } else if (sprint.completionRate >= 80) {
            insights.push({
                type: 'info',
                message: `Almost there - ${Math.round(sprint.completionRate)}% complete`,
                suggestion: 'You were close. Keep the same goal next sprint.'
            });
        } else {
            insights.push({
                type: 'warning',
                message: `Only ${Math.round(sprint.completionRate)}% complete`,
                suggestion: 'Consider reducing sprint scope or identifying blockers'
            });
        }

        return insights;
    }

    // ============================================================
    // PREDICTIONS
    // ============================================================

    /**
     * Predict completion for a set of tasks
     * @param {Array} tasks - Tasks to complete
     * @returns {Object} Prediction
     */
    predictCompletion(tasks) {
        const avgVelocity = this._getAverageVelocity();
        const totalPoints = tasks.reduce((sum, t) => sum + (t.points || this._estimatePoints(t)), 0);

        // Points per day based on 5 working days per sprint
        const pointsPerDay = avgVelocity / 5;
        const daysNeeded = Math.ceil(totalPoints / pointsPerDay);

        const completionDate = new Date();
        let workDaysAdded = 0;
        while (workDaysAdded < daysNeeded) {
            completionDate.setDate(completionDate.getDate() + 1);
            if (completionDate.getDay() !== 0 && completionDate.getDay() !== 6) {
                workDaysAdded++;
            }
        }

        // Calculate confidence based on velocity variance
        const confidence = this._calculateConfidence();

        return {
            totalPoints,
            estimatedDays: daysNeeded,
            estimatedCompletion: completionDate.toISOString().split('T')[0],
            confidence,
            basedOnVelocity: avgVelocity,
            range: {
                optimistic: Math.ceil(daysNeeded * 0.8),
                pessimistic: Math.ceil(daysNeeded * 1.4)
            }
        };
    }

    _calculateConfidence() {
        if (this.velocityHistory.length < 3) return 'low';

        const recent = this.velocityHistory.slice(-4);
        const velocities = recent.map(v => v.totalPoints);

        const avg = velocities.reduce((a, b) => a + b) / velocities.length;
        const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / velocities.length;
        const stdDev = Math.sqrt(variance);
        const coeffOfVariation = stdDev / avg;

        if (coeffOfVariation < 0.15) return 'high';
        if (coeffOfVariation < 0.3) return 'medium';
        return 'low';
    }

    // ============================================================
    // REPORTING
    // ============================================================

    /**
     * Get velocity report
     * @returns {Object} Report
     */
    getVelocityReport() {
        const trend = this._analyzeTrend();
        const avgVelocity = this._getAverageVelocity();

        return {
            currentVelocity: this.velocityHistory[this.velocityHistory.length - 1] || null,
            averageVelocity: avgVelocity,
            trend,
            history: this.velocityHistory.slice(-8),
            currentSprint: this.currentSprint,
            recommendations: this._getVelocityRecommendations(trend, avgVelocity)
        };
    }

    _getVelocityRecommendations(trend, avgVelocity) {
        const recommendations = [];

        if (trend.trend === 'decreasing') {
            recommendations.push({
                priority: 'high',
                message: 'Velocity is declining',
                actions: [
                    'Review for blockers or burnout signs',
                    'Consider reducing sprint scope',
                    'Check for scope creep in tasks'
                ]
            });
        } else if (trend.trend === 'increasing') {
            recommendations.push({
                priority: 'low',
                message: 'Velocity is improving',
                actions: [
                    'Consider a slight increase in sprint goals',
                    'Document what\'s working well'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Get current sprint status
     * @returns {Object} Sprint status
     */
    getSprintStatus() {
        if (!this.currentSprint) {
            return { active: false, message: 'No active sprint' };
        }

        const now = new Date();
        const end = new Date(this.currentSprint.endDate);
        const start = new Date(this.currentSprint.startDate);

        const totalDays = (end - start) / (1000 * 60 * 60 * 24);
        const daysPassed = (now - start) / (1000 * 60 * 60 * 24);
        const daysRemaining = Math.max(0, (end - now) / (1000 * 60 * 60 * 24));

        const timeProgress = (daysPassed / totalDays) * 100;
        const pointProgress = (this.currentSprint.completedPoints / this.currentSprint.goalPoints) * 100;

        const onTrack = pointProgress >= timeProgress * 0.9;

        return {
            active: true,
            sprint: this.currentSprint,
            timeProgress: Math.round(timeProgress),
            pointProgress: Math.round(pointProgress),
            daysRemaining: Math.ceil(daysRemaining),
            onTrack,
            projectedCompletion: this._projectSprintCompletion()
        };
    }

    _projectSprintCompletion() {
        if (!this.currentSprint || this.currentSprint.completedPoints === 0) {
            return null;
        }

        const now = new Date();
        const start = new Date(this.currentSprint.startDate);
        const daysPassed = (now - start) / (1000 * 60 * 60 * 24);

        if (daysPassed < 1) return null;

        const pointsPerDay = this.currentSprint.completedPoints / daysPassed;
        const remainingPoints = this.currentSprint.goalPoints - this.currentSprint.completedPoints;
        const daysNeeded = remainingPoints / pointsPerDay;

        const projectedDate = new Date(now.getTime() + daysNeeded * 24 * 60 * 60 * 1000);

        return {
            date: projectedDate.toISOString().split('T')[0],
            beforeDeadline: projectedDate <= new Date(this.currentSprint.endDate)
        };
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const velocityTracker = new VelocityTracker();

export function initVelocityTracker() {
    console.log('📈 [Velocity Tracker] Initialized');
    return velocityTracker;
}
