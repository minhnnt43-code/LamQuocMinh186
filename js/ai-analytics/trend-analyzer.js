// ============================================================
// TREND-ANALYZER.JS - Trend and Pattern Analysis
// Phase 5: Analytics & Insights
// ============================================================

/**
 * Trend Analyzer - Identifies trends and patterns in productivity data
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class TrendAnalyzer {
    constructor() {
        this.config = {
            minDataPoints: 7,
            trendThreshold: 0.1
        };
    }

    // ============================================================
    // TREND DETECTION
    // ============================================================

    /**
     * Analyze productivity trends
     * @param {Object} options - Analysis options
     * @returns {Object} Trend analysis
     */
    analyzeProductivityTrends(options = {}) {
        const { weeks = 4 } = options;
        const weeklyData = this._getWeeklyData(weeks);

        return {
            velocityTrend: this._analyzeVelocityTrend(weeklyData),
            qualityTrend: this._analyzeQualityTrend(weeklyData),
            focusTrend: this._analyzeFocusTrend(weeklyData),
            workloadTrend: this._analyzeWorkloadTrend(weeklyData),
            overallHealth: this._calculateOverallHealth(weeklyData),
            predictions: this._predictNextWeek(weeklyData)
        };
    }

    _getWeeklyData(weeks) {
        const data = [];
        const completedTasks = aiEngine?.patternStore?.get('completed_tasks') || [];

        for (let w = weeks - 1; w >= 0; w--) {
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - w * 7);
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekStart.getDate() - 7);

            const weekTasks = completedTasks.filter(t => {
                const date = new Date(t.completedAt);
                return date >= weekStart && date < weekEnd;
            });

            data.push({
                week: weeks - w,
                startDate: weekStart.toISOString().split('T')[0],
                tasksCompleted: weekTasks.length,
                onTimeRate: this._calcOnTimeRate(weekTasks),
                avgEstimation: this._calcAvgEstimation(weekTasks),
                totalHours: weekTasks.reduce((s, t) => s + (t.actualTime || 30) / 60, 0)
            });
        }

        return data;
    }

    _calcOnTimeRate(tasks) {
        const withDeadline = tasks.filter(t => t.deadline);
        if (withDeadline.length === 0) return 1;

        const onTime = withDeadline.filter(t =>
            new Date(t.completedAt) <= new Date(t.deadline)
        ).length;
        return onTime / withDeadline.length;
    }

    _calcAvgEstimation(tasks) {
        const withBoth = tasks.filter(t => t.estimatedTime && t.actualTime);
        if (withBoth.length === 0) return 1;

        const ratios = withBoth.map(t => t.actualTime / t.estimatedTime);
        return ratios.reduce((a, b) => a + b) / ratios.length;
    }

    _analyzeVelocityTrend(weeklyData) {
        const velocities = weeklyData.map(w => w.tasksCompleted);
        return this._analyzeTrend(velocities, 'Velocity');
    }

    _analyzeQualityTrend(weeklyData) {
        const quality = weeklyData.map(w => w.onTimeRate);
        return this._analyzeTrend(quality, 'Quality');
    }

    _analyzeFocusTrend(weeklyData) {
        const focus = weeklyData.map(w => w.totalHours);
        return this._analyzeTrend(focus, 'Focus Hours');
    }

    _analyzeWorkloadTrend(weeklyData) {
        const workload = weeklyData.map(w => w.totalHours);
        return this._analyzeTrend(workload, 'Workload');
    }

    _analyzeTrend(values, name) {
        if (values.length < 2) {
            return { trend: 'unknown', confidence: 'low', message: 'Not enough data' };
        }

        // Calculate linear regression
        const n = values.length;
        const sumX = n * (n - 1) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
        const sumXX = n * (n - 1) * (2 * n - 1) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const avgValue = sumY / n;
        const changeRate = avgValue !== 0 ? slope / avgValue : 0;

        let trend = 'stable';
        if (changeRate > this.config.trendThreshold) trend = 'increasing';
        if (changeRate < -this.config.trendThreshold) trend = 'decreasing';

        return {
            name,
            trend,
            changeRate: Math.round(changeRate * 100),
            values,
            average: avgValue,
            latest: values[values.length - 1],
            confidence: n >= 4 ? 'high' : 'medium'
        };
    }

    _calculateOverallHealth(weeklyData) {
        if (weeklyData.length === 0) return { score: 0.5, status: 'unknown' };

        const latest = weeklyData[weeklyData.length - 1];
        const prev = weeklyData.length >= 2 ? weeklyData[weeklyData.length - 2] : latest;

        let healthScore = 0.5;

        // Velocity factor
        if (latest.tasksCompleted >= prev.tasksCompleted) healthScore += 0.15;
        else healthScore -= 0.1;

        // Quality factor
        healthScore += latest.onTimeRate * 0.2;

        // Estimation accuracy factor
        const estAccuracy = 1 - Math.abs(latest.avgEstimation - 1);
        healthScore += estAccuracy * 0.15;

        return {
            score: Math.max(0, Math.min(1, healthScore)),
            status: healthScore >= 0.7 ? 'healthy' : healthScore >= 0.4 ? 'moderate' : 'needs_attention',
            factors: {
                velocity: latest.tasksCompleted >= prev.tasksCompleted ? 'positive' : 'negative',
                quality: latest.onTimeRate >= 0.8 ? 'positive' : 'neutral',
                estimation: Math.abs(latest.avgEstimation - 1) <= 0.2 ? 'positive' : 'needs_work'
            }
        };
    }

    _predictNextWeek(weeklyData) {
        if (weeklyData.length < 3) {
            return { hasPrediction: false, message: 'Need more historical data' };
        }

        const velocities = weeklyData.map(w => w.tasksCompleted);
        const avgVelocity = velocities.reduce((a, b) => a + b) / velocities.length;

        // Simple weighted prediction (recent weeks matter more)
        const weights = [0.1, 0.2, 0.3, 0.4].slice(-velocities.length);
        const weightSum = weights.reduce((a, b) => a + b);
        const weightedAvg = velocities.reduce((sum, v, i) => sum + v * weights[i], 0) / weightSum;

        return {
            hasPrediction: true,
            predictedTasks: Math.round(weightedAvg),
            confidence: 'medium',
            range: {
                min: Math.round(weightedAvg * 0.8),
                max: Math.round(weightedAvg * 1.2)
            }
        };
    }

    // ============================================================
    // PATTERN INSIGHTS
    // ============================================================

    /**
     * Get pattern-based insights
     * @returns {Object} Pattern insights
     */
    getPatternInsights() {
        return {
            bestPerformingDays: this._findBestDays(),
            optimalWorkHours: this._findOptimalHours(),
            taskTypePreferences: this._analyzeTaskTypes(),
            seasonalPatterns: this._detectSeasonalPatterns()
        };
    }

    _findBestDays() {
        const completedTasks = aiEngine?.patternStore?.get('completed_tasks') || [];
        const byDay = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

        for (const task of completedTasks) {
            const day = new Date(task.completedAt).getDay();
            byDay[day]++;
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const sorted = Object.entries(byDay)
            .sort((a, b) => b[1] - a[1])
            .map(([day, count]) => ({ day: dayNames[day], count }));

        return {
            best: sorted[0]?.day,
            ranking: sorted
        };
    }

    _findOptimalHours() {
        const completionsByHour = aiEngine?.patternStore?.get('completions_by_hour') || {};
        const hourlyScores = {};

        for (const [hour, data] of Object.entries(completionsByHour)) {
            if (Array.isArray(data) && data.length > 0) {
                const avgQuality = data.reduce((s, c) => s + (c.quality || 0.5), 0) / data.length;
                hourlyScores[hour] = { count: data.length, quality: avgQuality };
            }
        }

        const sorted = Object.entries(hourlyScores)
            .sort((a, b) => b[1].quality - a[1].quality);

        return {
            peakHours: sorted.slice(0, 3).map(([h]) => parseInt(h)),
            scores: hourlyScores
        };
    }

    _analyzeTaskTypes() {
        const completedTasks = aiEngine?.patternStore?.get('completed_tasks') || [];
        const byType = {};

        for (const task of completedTasks) {
            const type = task.category || 'general';
            if (!byType[type]) {
                byType[type] = { count: 0, totalTime: 0, onTime: 0 };
            }
            byType[type].count++;
            byType[type].totalTime += task.actualTime || 30;
            if (!task.deadline || new Date(task.completedAt) <= new Date(task.deadline)) {
                byType[type].onTime++;
            }
        }

        return Object.entries(byType).map(([type, data]) => ({
            type,
            count: data.count,
            avgTime: data.totalTime / data.count,
            successRate: data.onTime / data.count
        })).sort((a, b) => b.count - a.count);
    }

    _detectSeasonalPatterns() {
        // Simplified - would need more data for real seasonal analysis
        return {
            hasPattern: false,
            message: 'Collecting more data for seasonal analysis'
        };
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const trendAnalyzer = new TrendAnalyzer();

export function initTrendAnalyzer() {
    console.log('📈 [Trend Analyzer] Initialized');
    return trendAnalyzer;
}
