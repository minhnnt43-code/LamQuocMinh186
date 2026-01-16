// ============================================================
// ANALYTICS-ENGINE.JS - Core Analytics Processing
// Phase 5: Analytics & Insights
// ============================================================

/**
 * Analytics Engine - Central hub for all analytics processing
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class AnalyticsEngine {
    constructor() {
        this.config = {
            retentionDays: 90,
            aggregationIntervals: ['daily', 'weekly', 'monthly'],
            realTimeWindow: 300000 // 5 minutes
        };

        this.cache = new Map();
        this.realTimeMetrics = [];
    }

    // ============================================================
    // PRODUCTIVITY ANALYTICS
    // ============================================================

    /**
     * Get comprehensive productivity analytics
     * @param {Object} options - Analysis options
     * @returns {Object} Productivity metrics
     */
    getProductivityAnalytics(options = {}) {
        const { period = 'week', userId = null } = options;
        const tasks = this._getTasksForPeriod(period);

        return {
            period,
            completionMetrics: this._calculateCompletionMetrics(tasks),
            velocityMetrics: this._calculateVelocityMetrics(tasks),
            efficiencyMetrics: this._calculateEfficiencyMetrics(tasks),
            focusMetrics: this._calculateFocusMetrics(period),
            timeDistribution: this._analyzeTimeDistribution(tasks),
            peakPerformance: this._identifyPeakPerformance(tasks),
            comparison: this._compareToPrevious(tasks, period)
        };
    }

    _getTasksForPeriod(period) {
        const patternStore = aiEngine?.patternStore;
        const completedTasks = patternStore?.get('completed_tasks') || [];

        const now = new Date();
        let startDate;

        switch (period) {
            case 'day':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        return completedTasks.filter(t =>
            t.completedAt && new Date(t.completedAt) >= startDate
        );
    }

    _calculateCompletionMetrics(tasks) {
        const total = tasks.length;
        const onTime = tasks.filter(t =>
            !t.deadline || new Date(t.completedAt) <= new Date(t.deadline)
        ).length;

        const byPriority = {
            critical: tasks.filter(t => t.priority === 'critical').length,
            high: tasks.filter(t => t.priority === 'high').length,
            medium: tasks.filter(t => t.priority === 'medium').length,
            low: tasks.filter(t => t.priority === 'low').length
        };

        return {
            total,
            onTimeRate: total > 0 ? onTime / total : 1,
            byPriority,
            averagePerDay: total / 7
        };
    }

    _calculateVelocityMetrics(tasks) {
        const totalPoints = tasks.reduce((sum, t) => {
            const points = t.estimatedTime ? t.estimatedTime / 30 : 1;
            return sum + points;
        }, 0);

        // Group by day
        const byDay = {};
        for (const task of tasks) {
            const day = new Date(task.completedAt).toISOString().split('T')[0];
            byDay[day] = (byDay[day] || 0) + 1;
        }

        const dailyValues = Object.values(byDay);
        const avgDaily = dailyValues.length > 0
            ? dailyValues.reduce((a, b) => a + b) / dailyValues.length
            : 0;

        return {
            totalPoints,
            averageDaily: avgDaily,
            peakDay: Math.max(...dailyValues, 0),
            consistency: this._calculateConsistency(dailyValues)
        };
    }

    _calculateConsistency(values) {
        if (values.length < 2) return 1;

        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Coefficient of variation (lower is more consistent)
        return mean > 0 ? 1 - Math.min(stdDev / mean, 1) : 0;
    }

    _calculateEfficiencyMetrics(tasks) {
        const withEstimates = tasks.filter(t => t.estimatedTime && t.actualTime);

        if (withEstimates.length === 0) {
            return { hasData: false, message: 'No estimation data available' };
        }

        const ratios = withEstimates.map(t => t.actualTime / t.estimatedTime);
        const avgRatio = ratios.reduce((a, b) => a + b) / ratios.length;

        return {
            hasData: true,
            estimationAccuracy: Math.min(1, 1 / Math.abs(avgRatio - 1 + 1)),
            averageOverrun: avgRatio > 1 ? (avgRatio - 1) * 100 : 0,
            averageUnderrun: avgRatio < 1 ? (1 - avgRatio) * 100 : 0,
            bias: avgRatio > 1.1 ? 'underestimate' : avgRatio < 0.9 ? 'overestimate' : 'accurate'
        };
    }

    _calculateFocusMetrics(period) {
        const focusData = aiEngine?.patternStore?.get('focus_quality_by_hour') || {};

        let totalSessions = 0;
        let totalQuality = 0;
        let totalMinutes = 0;

        for (const hourData of Object.values(focusData)) {
            if (Array.isArray(hourData)) {
                totalSessions += hourData.length;
                totalQuality += hourData.reduce((s, f) => s + (f.score || 0.5), 0);
                totalMinutes += hourData.reduce((s, f) => s + (f.duration || 0), 0);
            }
        }

        return {
            totalFocusSessions: totalSessions,
            totalFocusMinutes: totalMinutes,
            averageQuality: totalSessions > 0 ? totalQuality / totalSessions : 0.5,
            focusHoursPerDay: totalMinutes / 60 / 7
        };
    }

    _analyzeTimeDistribution(tasks) {
        const distribution = {};

        for (const task of tasks) {
            const category = task.category || 'uncategorized';
            if (!distribution[category]) {
                distribution[category] = { count: 0, totalTime: 0 };
            }
            distribution[category].count++;
            distribution[category].totalTime += task.actualTime || task.estimatedTime || 30;
        }

        return distribution;
    }

    _identifyPeakPerformance(tasks) {
        const byHour = {};

        for (const task of tasks) {
            if (!task.completedAt) continue;
            const hour = new Date(task.completedAt).getHours();
            byHour[hour] = (byHour[hour] || 0) + 1;
        }

        const peakHour = Object.entries(byHour)
            .sort((a, b) => b[1] - a[1])[0];

        return {
            peakHour: peakHour ? parseInt(peakHour[0]) : null,
            productivityByHour: byHour
        };
    }

    _compareToPrevious(currentTasks, period) {
        // Get previous period tasks
        const now = new Date();
        let periodDays = period === 'month' ? 30 : period === 'week' ? 7 : 1;

        const prevStart = new Date(now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000);
        const prevEnd = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

        const completedTasks = aiEngine?.patternStore?.get('completed_tasks') || [];
        const prevTasks = completedTasks.filter(t => {
            const date = new Date(t.completedAt);
            return date >= prevStart && date < prevEnd;
        });

        const currentCount = currentTasks.length;
        const prevCount = prevTasks.length;

        return {
            current: currentCount,
            previous: prevCount,
            change: prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0,
            trend: currentCount > prevCount ? 'up' : currentCount < prevCount ? 'down' : 'stable'
        };
    }

    // ============================================================
    // REAL-TIME METRICS
    // ============================================================

    /**
     * Record a real-time metric
     * @param {string} metric - Metric name
     * @param {number} value - Metric value
     */
    recordMetric(metric, value) {
        this.realTimeMetrics.push({
            metric,
            value,
            timestamp: Date.now()
        });

        // Clean old metrics
        const cutoff = Date.now() - this.config.realTimeWindow;
        this.realTimeMetrics = this.realTimeMetrics.filter(m => m.timestamp >= cutoff);
    }

    /**
     * Get real-time metrics
     * @returns {Object} Current metrics
     */
    getRealTimeMetrics() {
        const metrics = {};

        for (const record of this.realTimeMetrics) {
            if (!metrics[record.metric]) {
                metrics[record.metric] = { values: [], count: 0, sum: 0 };
            }
            metrics[record.metric].values.push(record.value);
            metrics[record.metric].count++;
            metrics[record.metric].sum += record.value;
        }

        // Calculate averages
        for (const key of Object.keys(metrics)) {
            metrics[key].average = metrics[key].sum / metrics[key].count;
            metrics[key].latest = metrics[key].values[metrics[key].values.length - 1];
        }

        return metrics;
    }

    // ============================================================
    // DASHBOARD DATA
    // ============================================================

    /**
     * Get dashboard overview data
     * @returns {Object} Dashboard data
     */
    getDashboardData() {
        const productivity = this.getProductivityAnalytics({ period: 'week' });

        return {
            summary: {
                tasksCompleted: productivity.completionMetrics.total,
                onTimeRate: Math.round(productivity.completionMetrics.onTimeRate * 100),
                focusHours: Math.round(productivity.focusMetrics.totalFocusMinutes / 60),
                velocityTrend: productivity.comparison.trend
            },
            charts: {
                completionByDay: this._getCompletionByDay(),
                productivityByHour: productivity.peakPerformance.productivityByHour,
                categoryBreakdown: productivity.timeDistribution
            },
            highlights: this._generateHighlights(productivity)
        };
    }

    _getCompletionByDay() {
        const tasks = this._getTasksForPeriod('week');
        const byDay = {};

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            byDay[dateStr] = 0;
        }

        for (const task of tasks) {
            const day = new Date(task.completedAt).toISOString().split('T')[0];
            if (byDay.hasOwnProperty(day)) {
                byDay[day]++;
            }
        }

        return byDay;
    }

    _generateHighlights(productivity) {
        const highlights = [];

        if (productivity.comparison.trend === 'up') {
            highlights.push({
                type: 'positive',
                message: `${Math.round(productivity.comparison.change)}% more tasks completed vs last week`
            });
        }

        if (productivity.completionMetrics.onTimeRate >= 0.9) {
            highlights.push({
                type: 'positive',
                message: 'Excellent on-time completion rate!'
            });
        }

        if (productivity.velocityMetrics.consistency >= 0.8) {
            highlights.push({
                type: 'positive',
                message: 'Very consistent productivity'
            });
        }

        return highlights;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const analyticsEngine = new AnalyticsEngine();

export function initAnalyticsEngine() {
    console.log('📊 [Analytics Engine] Initialized');
    return analyticsEngine;
}
