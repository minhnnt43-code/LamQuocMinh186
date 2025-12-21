// ============================================================
// INSIGHT-ENGINE.JS - AI-Generated Insights
// Phase 5: Analytics & Insights
// ============================================================

/**
 * Insight Engine - Generates actionable insights from data
 */

import { analyticsEngine } from './analytics-engine.js';
import { trendAnalyzer } from './trend-analyzer.js';
import { aiEngine } from '../ai-engine/ai-core.js';

export class InsightEngine {
    constructor() {
        this.insightCache = [];
        this.lastGenerated = null;
    }

    // ============================================================
    // INSIGHT GENERATION
    // ============================================================

    /**
     * Generate all insights
     * @returns {Object} Generated insights
     */
    generateInsights() {
        const productivity = analyticsEngine.getProductivityAnalytics({ period: 'week' });
        const trends = trendAnalyzer.analyzeProductivityTrends({ weeks: 4 });
        const patterns = trendAnalyzer.getPatternInsights();

        const insights = [
            ...this._generateProductivityInsights(productivity),
            ...this._generateTrendInsights(trends),
            ...this._generatePatternInsights(patterns),
            ...this._generateRecommendations(productivity, trends)
        ];

        // Score and sort insights
        const scoredInsights = insights.map(i => ({
            ...i,
            score: this._scoreInsight(i)
        })).sort((a, b) => b.score - a.score);

        this.insightCache = scoredInsights;
        this.lastGenerated = new Date().toISOString();

        return {
            insights: scoredInsights.slice(0, 10),
            total: scoredInsights.length,
            generatedAt: this.lastGenerated
        };
    }

    _generateProductivityInsights(productivity) {
        const insights = [];

        // On-time rate insight
        const onTimeRate = productivity.completionMetrics.onTimeRate;
        if (onTimeRate >= 0.9) {
            insights.push({
                type: 'achievement',
                category: 'productivity',
                title: 'Excellent deadline adherence',
                message: `${Math.round(onTimeRate * 100)}% of tasks completed on time this week!`,
                impact: 'positive'
            });
        } else if (onTimeRate < 0.7) {
            insights.push({
                type: 'warning',
                category: 'productivity',
                title: 'Deadline challenges',
                message: `Only ${Math.round(onTimeRate * 100)}% on-time completion. Consider more realistic estimates.`,
                impact: 'negative',
                action: 'Review task estimation process'
            });
        }

        // Velocity insight
        if (productivity.comparison.change > 20) {
            insights.push({
                type: 'achievement',
                category: 'velocity',
                title: 'Velocity boost!',
                message: `${Math.round(productivity.comparison.change)}% more tasks completed than last week`,
                impact: 'positive'
            });
        } else if (productivity.comparison.change < -20) {
            insights.push({
                type: 'info',
                category: 'velocity',
                title: 'Lower velocity this week',
                message: `${Math.abs(Math.round(productivity.comparison.change))}% fewer tasks than last week`,
                impact: 'neutral',
                action: 'Check for blockers or external factors'
            });
        }

        // Focus insight
        if (productivity.focusMetrics.averageQuality >= 0.8) {
            insights.push({
                type: 'achievement',
                category: 'focus',
                title: 'High focus quality',
                message: 'Maintaining excellent focus during work sessions',
                impact: 'positive'
            });
        }

        // Consistency insight
        if (productivity.velocityMetrics.consistency >= 0.8) {
            insights.push({
                type: 'achievement',
                category: 'consistency',
                title: 'Consistent performance',
                message: 'Great work maintaining steady productivity',
                impact: 'positive'
            });
        }

        return insights;
    }

    _generateTrendInsights(trends) {
        const insights = [];

        // Velocity trend
        if (trends.velocityTrend.trend === 'increasing') {
            insights.push({
                type: 'trend',
                category: 'velocity',
                title: 'Velocity trending up',
                message: `Completing ${trends.velocityTrend.changeRate}% more tasks each week`,
                impact: 'positive'
            });
        } else if (trends.velocityTrend.trend === 'decreasing') {
            insights.push({
                type: 'warning',
                category: 'velocity',
                title: 'Velocity declining',
                message: `${Math.abs(trends.velocityTrend.changeRate)}% fewer tasks each week`,
                impact: 'negative',
                action: 'Identify and address blockers'
            });
        }

        // Quality trend
        if (trends.qualityTrend.trend === 'decreasing') {
            insights.push({
                type: 'warning',
                category: 'quality',
                title: 'Quality metrics declining',
                message: 'On-time completion rate is trending down',
                impact: 'negative',
                action: 'Review deadlines and commitments'
            });
        }

        // Health
        if (trends.overallHealth.status === 'needs_attention') {
            insights.push({
                type: 'warning',
                category: 'health',
                title: 'Productivity health check',
                message: 'Multiple metrics suggest need for adjustment',
                impact: 'negative',
                action: 'Take time to review and optimize workflow'
            });
        }

        return insights;
    }

    _generatePatternInsights(patterns) {
        const insights = [];

        // Best day insight
        if (patterns.bestPerformingDays.best) {
            insights.push({
                type: 'pattern',
                category: 'timing',
                title: `${patterns.bestPerformingDays.best} is your power day`,
                message: 'You complete the most tasks on this day',
                impact: 'positive',
                action: `Schedule important work for ${patterns.bestPerformingDays.best}s`
            });
        }

        // Peak hours insight
        if (patterns.optimalWorkHours.peakHours.length > 0) {
            const peakStr = patterns.optimalWorkHours.peakHours.map(h => `${h}:00`).join(', ');
            insights.push({
                type: 'pattern',
                category: 'timing',
                title: 'Peak productivity hours identified',
                message: `Best focus at: ${peakStr}`,
                impact: 'positive',
                action: 'Protect these hours for deep work'
            });
        }

        // Task type insight
        if (patterns.taskTypePreferences.length > 0) {
            const topType = patterns.taskTypePreferences[0];
            if (topType.successRate >= 0.9) {
                insights.push({
                    type: 'pattern',
                    category: 'skills',
                    title: `Strong in ${topType.type} tasks`,
                    message: `${Math.round(topType.successRate * 100)}% success rate`,
                    impact: 'positive'
                });
            }
        }

        return insights;
    }

    _generateRecommendations(productivity, trends) {
        const recommendations = [];

        // Based on estimation accuracy
        if (productivity.efficiencyMetrics.hasData && productivity.efficiencyMetrics.bias === 'underestimate') {
            recommendations.push({
                type: 'recommendation',
                category: 'estimation',
                title: 'Improve time estimates',
                message: `Tasks take ${Math.round(productivity.efficiencyMetrics.averageOverrun)}% longer than estimated`,
                impact: 'actionable',
                action: 'Add 20-30% buffer to your estimates'
            });
        }

        // Based on workload
        if (trends.workloadTrend.trend === 'increasing' && trends.workloadTrend.changeRate > 15) {
            recommendations.push({
                type: 'recommendation',
                category: 'workload',
                title: 'Workload increasing',
                message: 'Consider if current pace is sustainable',
                impact: 'actionable',
                action: 'Review commitments and priorities'
            });
        }

        // Prediction-based
        if (trends.predictions.hasPrediction) {
            recommendations.push({
                type: 'prediction',
                category: 'planning',
                title: 'Next week forecast',
                message: `Predicted capacity: ${trends.predictions.predictedTasks} tasks`,
                impact: 'informational',
                action: 'Plan accordingly'
            });
        }

        return recommendations;
    }

    _scoreInsight(insight) {
        let score = 0.5;

        // Type scoring
        const typeScores = {
            warning: 0.9,
            recommendation: 0.8,
            achievement: 0.7,
            trend: 0.6,
            pattern: 0.5,
            prediction: 0.4,
            info: 0.3
        };
        score += typeScores[insight.type] || 0;

        // Impact scoring
        if (insight.impact === 'negative') score += 0.3;
        if (insight.impact === 'actionable') score += 0.2;

        // Has action = more valuable
        if (insight.action) score += 0.1;

        return Math.min(2, score);
    }

    // ============================================================
    // PERSONALIZED INSIGHTS
    // ============================================================

    /**
     * Get personalized insight for current context
     * @param {Object} context - Current context
     * @returns {Object} Contextual insight
     */
    getContextualInsight(context = {}) {
        const hour = new Date().getHours();
        const dayOfWeek = new Date().getDay();
        const patterns = trendAnalyzer.getPatternInsights();

        // Morning context
        if (hour >= 8 && hour <= 10) {
            return {
                type: 'contextual',
                title: 'Morning planning',
                message: this._getMorningMessage(patterns),
                action: 'Set your top 3 priorities for today'
            };
        }

        // Afternoon slump
        if (hour >= 14 && hour <= 15) {
            return {
                type: 'contextual',
                title: 'Afternoon energy',
                message: 'Energy typically dips now. Perfect time for a short break or lighter tasks.',
                action: 'Take a 10-minute walk'
            };
        }

        // End of day
        if (hour >= 17 && hour <= 18) {
            return {
                type: 'contextual',
                title: 'Daily wrap-up',
                message: 'Good time to review accomplishments and plan tomorrow.',
                action: 'Capture any incomplete items for tomorrow'
            };
        }

        // Default
        return {
            type: 'contextual',
            title: 'Stay focused',
            message: 'You\'re in your productive hours. Keep going!',
            action: null
        };
    }

    _getMorningMessage(patterns) {
        if (patterns.bestPerformingDays.best === this._getTodayName()) {
            return `It's ${patterns.bestPerformingDays.best} - your best day! Make it count.`;
        }
        return 'Start with your most important task while energy is high.';
    }

    _getTodayName() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date().getDay()];
    }

    // ============================================================
    // CACHED INSIGHTS
    // ============================================================

    /**
     * Get cached insights
     * @param {number} count - Number of insights
     * @returns {Array} Top insights
     */
    getTopInsights(count = 5) {
        if (!this.insightCache.length || this._isStale()) {
            this.generateInsights();
        }
        return this.insightCache.slice(0, count);
    }

    _isStale() {
        if (!this.lastGenerated) return true;
        const hourAgo = Date.now() - 60 * 60 * 1000;
        return new Date(this.lastGenerated).getTime() < hourAgo;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const insightEngine = new InsightEngine();

export function initInsightEngine() {
    console.log('💡 [Insight Engine] Initialized');
    return insightEngine;
}
