// ============================================================
// USER-PROFILE.JS - User Behavior Profile
// Phase 1: Foundation & Core Intelligence
// ============================================================

/**
 * User Profile - Stores and analyzes user behavior patterns
 * Used for personalized AI predictions and recommendations
 */

export class UserProfile {
    constructor(userId) {
        this.userId = userId;
        this.loaded = false;

        // Profile data
        this.data = {
            // Capacity metrics
            averageTasksPerDay: 0,
            averageWorkHours: 8,
            maxConcurrentTasks: 5,
            currentWorkload: 'medium',

            // Performance metrics
            onTimeRate: 0.8,
            averageProductivity: 0.7,
            estimationBias: 'none', // underestimate, overestimate, none

            // Preferences
            preferredWorkHours: { start: 9, end: 17 },
            focusTimePreference: 'morning',
            breakFrequency: 90, // minutes

            // Statistics
            totalTasksCompleted: 0,
            totalFocusMinutes: 0,
            streakDays: 0,

            // Timestamps
            firstActivity: null,
            lastActivity: null
        };

        // Historical data
        this.history = {
            dailyTaskCounts: [], // Last 30 days
            weeklyVelocity: [],  // Last 12 weeks
            focusSessions: [],   // Last 100 sessions
            completionTimes: []  // Last 200 tasks
        };
    }

    // ============================================================
    // LOADING & SAVING
    // ============================================================

    /**
     * Load profile from user data
     * @param {Object} userData - User data from Firebase
     */
    async load(userData) {
        if (userData?.aiProfile) {
            Object.assign(this.data, userData.aiProfile);
        }
        if (userData?.aiHistory) {
            Object.assign(this.history, userData.aiHistory);
        }

        this.loaded = true;
        this._updateLastActivity();

        // Calculate derived metrics
        this._calculateDerivedMetrics();
    }

    /**
     * Export profile for saving
     * @returns {Object}
     */
    export() {
        return {
            ...this.data,
            history: this.history
        };
    }

    /**
     * Get raw data
     * @returns {Object}
     */
    getData() {
        return this.data;
    }

    // ============================================================
    // CAPACITY ANALYSIS
    // ============================================================

    /**
     * Get capacity insights
     * @returns {Object}
     */
    getCapacityInsights() {
        return {
            dailyCapacity: this._calculateDailyCapacity(),
            currentLoad: this._calculateCurrentLoad(),
            burnoutRisk: this._assessBurnoutRisk(),
            recommendations: this._getCapacityRecommendations()
        };
    }

    _calculateDailyCapacity() {
        // Based on historical data
        const recentDays = this.history.dailyTaskCounts.slice(-14);
        if (recentDays.length === 0) {
            return { average: 5, min: 3, max: 8 };
        }

        const counts = recentDays.map(d => d.count);
        return {
            average: Math.round(counts.reduce((a, b) => a + b, 0) / counts.length),
            min: Math.min(...counts),
            max: Math.max(...counts),
            sustainable: Math.round(counts.reduce((a, b) => a + b, 0) / counts.length * 0.8)
        };
    }

    _calculateCurrentLoad() {
        const workload = this.data.currentWorkload;
        const levels = { low: 0.3, medium: 0.6, high: 0.85, overloaded: 1.0 };
        return {
            level: workload,
            percentage: levels[workload] || 0.6,
            canTakeMore: workload === 'low' || workload === 'medium'
        };
    }

    _assessBurnoutRisk() {
        let riskScore = 0;
        const factors = [];

        // High workload for extended period
        if (this.data.currentWorkload === 'high') {
            riskScore += 0.3;
            factors.push('High current workload');
        }

        // Long work hours
        if (this.data.averageWorkHours > 10) {
            riskScore += 0.25;
            factors.push('Working more than 10 hours');
        }

        // Low on-time rate (stress indicator)
        if (this.data.onTimeRate < 0.6) {
            riskScore += 0.2;
            factors.push('Missing many deadlines');
        }

        // Declining velocity
        if (this.history.weeklyVelocity.length >= 2) {
            const recent = this.history.weeklyVelocity[0];
            const previous = this.history.weeklyVelocity[1];
            if (recent < previous * 0.8) {
                riskScore += 0.15;
                factors.push('Productivity declining');
            }
        }

        // Few focus sessions
        const recentFocus = this.history.focusSessions.filter(s => {
            const date = new Date(s.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date >= weekAgo;
        });

        if (recentFocus.length < 5) {
            riskScore += 0.1;
            factors.push('Few dedicated focus sessions');
        }

        return {
            score: riskScore,
            level: riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'moderate' : 'low',
            factors
        };
    }

    _getCapacityRecommendations() {
        const recommendations = [];
        const capacity = this._calculateDailyCapacity();
        const load = this._calculateCurrentLoad();
        const burnout = this._assessBurnoutRisk();

        if (burnout.level === 'high') {
            recommendations.push({
                type: 'warning',
                message: 'Consider reducing workload - burnout risk detected',
                action: 'review_commitments'
            });
        }

        if (!load.canTakeMore) {
            recommendations.push({
                type: 'info',
                message: `Focus on completing current tasks before adding new ones`,
                action: 'focus_current'
            });
        }

        if (this.data.estimationBias === 'underestimate') {
            recommendations.push({
                type: 'tip',
                message: 'You tend to underestimate - add 20% buffer to estimates',
                action: 'adjust_estimates'
            });
        }

        return recommendations;
    }

    // ============================================================
    // PERFORMANCE METRICS
    // ============================================================

    /**
     * Get on-time completion rate
     * @returns {number}
     */
    getOnTimeRate() {
        return this.data.onTimeRate;
    }

    /**
     * Get current workload level
     * @returns {string}
     */
    getCurrentWorkload() {
        return this.data.currentWorkload;
    }

    /**
     * Update on-time rate from task completion
     * @param {boolean} onTime
     */
    recordCompletion(onTime) {
        // Exponential moving average
        const alpha = 0.1;
        this.data.onTimeRate = alpha * (onTime ? 1 : 0) + (1 - alpha) * this.data.onTimeRate;
        this.data.totalTasksCompleted++;
        this._updateLastActivity();
    }

    /**
     * Record focus session
     * @param {number} minutes
     * @param {number} tasksCompleted
     */
    recordFocusSession(minutes, tasksCompleted) {
        this.history.focusSessions.push({
            date: new Date().toISOString(),
            minutes,
            tasksCompleted
        });

        // Keep last 100
        if (this.history.focusSessions.length > 100) {
            this.history.focusSessions.shift();
        }

        this.data.totalFocusMinutes += minutes;
        this._updateLastActivity();
    }

    /**
     * Record task completion time
     * @param {number} estimated
     * @param {number} actual
     */
    recordCompletionTime(estimated, actual) {
        this.history.completionTimes.push({
            date: new Date().toISOString(),
            estimated,
            actual,
            ratio: actual / estimated
        });

        if (this.history.completionTimes.length > 200) {
            this.history.completionTimes.shift();
        }

        // Update estimation bias
        this._updateEstimationBias();
    }

    _updateEstimationBias() {
        const recent = this.history.completionTimes.slice(-20);
        if (recent.length < 5) return;

        const avgRatio = recent.reduce((s, t) => s + t.ratio, 0) / recent.length;

        if (avgRatio > 1.2) {
            this.data.estimationBias = 'underestimate';
        } else if (avgRatio < 0.8) {
            this.data.estimationBias = 'overestimate';
        } else {
            this.data.estimationBias = 'none';
        }
    }

    // ============================================================
    // WORKLOAD MANAGEMENT
    // ============================================================

    /**
     * Update current workload level
     * @param {string} level
     */
    setWorkload(level) {
        this.data.currentWorkload = level;
        this._updateLastActivity();
    }

    /**
     * Calculate workload from active tasks
     * @param {Array} activeTasks
     */
    calculateWorkloadFromTasks(activeTasks) {
        const count = activeTasks.length;
        const capacity = this._calculateDailyCapacity();

        const ratio = count / (capacity.average || 5);

        if (ratio > 1.2) {
            this.data.currentWorkload = 'overloaded';
        } else if (ratio > 0.9) {
            this.data.currentWorkload = 'high';
        } else if (ratio > 0.5) {
            this.data.currentWorkload = 'medium';
        } else {
            this.data.currentWorkload = 'low';
        }

        return this.data.currentWorkload;
    }

    // ============================================================
    // DAILY TRACKING
    // ============================================================

    /**
     * Record daily task count
     * @param {number} count
     */
    recordDailyTasks(count) {
        const today = new Date().toDateString();
        const existing = this.history.dailyTaskCounts.find(d => d.date === today);

        if (existing) {
            existing.count = count;
        } else {
            this.history.dailyTaskCounts.push({
                date: today,
                count
            });
        }

        // Keep last 30 days
        if (this.history.dailyTaskCounts.length > 30) {
            this.history.dailyTaskCounts.shift();
        }

        // Update average
        const counts = this.history.dailyTaskCounts.map(d => d.count);
        this.data.averageTasksPerDay = Math.round(
            counts.reduce((a, b) => a + b, 0) / counts.length
        );

        // Update streak
        this._updateStreak();
    }

    _updateStreak() {
        const today = new Date().toDateString();
        const todayCompleted = this.history.dailyTaskCounts.find(d => d.date === today);

        if (todayCompleted && todayCompleted.count > 0) {
            // Check if yesterday also has completions
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayCompleted = this.history.dailyTaskCounts.find(
                d => d.date === yesterday.toDateString()
            );

            if (yesterdayCompleted && yesterdayCompleted.count > 0) {
                this.data.streakDays++;
            } else {
                this.data.streakDays = 1;
            }
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================

    _updateLastActivity() {
        this.data.lastActivity = new Date().toISOString();
        if (!this.data.firstActivity) {
            this.data.firstActivity = new Date().toISOString();
        }
    }

    _calculateDerivedMetrics() {
        // Calculate average productivity from focus sessions
        if (this.history.focusSessions.length > 0) {
            const sessions = this.history.focusSessions.slice(-20);
            const avgTasksPerSession = sessions.reduce((s, f) => s + f.tasksCompleted, 0) / sessions.length;
            const avgMinutesPerSession = sessions.reduce((s, f) => s + f.minutes, 0) / sessions.length;

            // Productivity = tasks per hour of focus
            this.data.averageProductivity = (avgTasksPerSession / (avgMinutesPerSession / 60)) || 0.7;
        }
    }
}
