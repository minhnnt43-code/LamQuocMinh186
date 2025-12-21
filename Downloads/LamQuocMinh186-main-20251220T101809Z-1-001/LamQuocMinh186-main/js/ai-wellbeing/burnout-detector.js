// ============================================================
// BURNOUT-DETECTOR.JS - Burnout Early Warning System
// Phase 3: Workload & Well-being
// ============================================================

/**
 * Burnout Detector - Detects early signs of burnout
 * Monitors patterns and provides interventions
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class BurnoutDetector {
    constructor() {
        this.config = {
            warningThreshold: 0.5,      // 50% burnout risk = warning
            criticalThreshold: 0.75,    // 75% = critical
            monitoringPeriodDays: 14,   // Look back 2 weeks
            recoveryCheckDays: 3        // Days to confirm recovery
        };

        // Burnout indicators with weights
        this.indicators = {
            workHoursIncrease: { weight: 0.15, threshold: 1.2 },  // 20% increase
            productivityDecline: { weight: 0.15, threshold: 0.8 }, // 20% decline
            missedDeadlines: { weight: 0.12, threshold: 0.3 },     // 30% miss rate
            overtimeFrequency: { weight: 0.12, threshold: 0.4 },   // 40% days with overtime
            weekendWork: { weight: 0.10, threshold: 0.3 },         // 30% weekends
            focusQualityDecline: { weight: 0.10, threshold: 0.7 }, // Below 70%
            taskCompletionSlowdown: { weight: 0.08, threshold: 1.3 }, // 30% slower
            breakSkipping: { weight: 0.08, threshold: 0.5 },       // 50% breaks skipped
            lateNightWork: { weight: 0.05, threshold: 0.2 },       // 20% late night
            velocityTrendDown: { weight: 0.05, threshold: -0.15 }  // 15% decline trend
        };

        this.lastAssessment = null;
        this.interventionHistory = [];
    }

    // ============================================================
    // BURNOUT ASSESSMENT
    // ============================================================

    /**
     * Assess current burnout risk
     * @returns {Object} Burnout assessment
     */
    assessBurnoutRisk() {
        const metrics = this._gatherMetrics();
        const scores = this._calculateIndicatorScores(metrics);
        const overallScore = this._calculateOverallScore(scores);

        const assessment = {
            timestamp: new Date().toISOString(),
            overallScore,
            riskLevel: this._getRiskLevel(overallScore),
            indicatorScores: scores,
            metrics,
            trend: this._analyzeTrend(),
            recommendations: this._generateRecommendations(overallScore, scores),
            interventions: this._suggestInterventions(overallScore, scores)
        };

        this.lastAssessment = assessment;

        // Track for historical analysis
        aiEngine?.trackBehavior?.('burnout_assessment', {
            score: overallScore,
            level: assessment.riskLevel
        });

        return assessment;
    }

    _gatherMetrics() {
        const profile = aiEngine?.userProfile?.getData() || {};
        const patternStore = aiEngine?.patternStore;

        // Get recent work data
        const recentDays = this.config.monitoringPeriodDays;
        const focusSessions = patternStore?.getRecent('focus_quality_by_hour', 100) || [];
        const completedTasks = patternStore?.get('completed_tasks') || [];
        const appUsage = patternStore?.get('app_usage_patterns') || {};

        // Calculate metrics
        const now = new Date();
        const periodStart = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000);

        const recentTasks = completedTasks.filter(t =>
            t.completedAt && new Date(t.completedAt) >= periodStart
        );

        return {
            // Work hours trend
            averageWorkHours: this._calculateAverageWorkHours(appUsage, recentDays),
            baselineWorkHours: profile.averageWorkHours || 8,

            // Productivity metrics
            currentVelocity: this._calculateRecentVelocity(recentTasks),
            baselineVelocity: profile.averageProductivity || 0.7,

            // Deadline performance
            onTimeRate: this._calculateOnTimeRate(recentTasks),

            // Overtime metrics
            overtimeDays: this._countOvertimeDays(appUsage, recentDays),
            weekendWorkDays: this._countWeekendWork(appUsage, recentDays),
            lateNightDays: this._countLateNightWork(appUsage, recentDays),

            // Focus quality
            averageFocusQuality: this._calculateFocusQuality(focusSessions),

            // Task completion speed
            averageCompletionTime: this._calculateAvgCompletionTime(recentTasks),
            baselineCompletionTime: this._getBaselineCompletionTime(completedTasks),

            // Break patterns
            breakComplianceRate: this._calculateBreakCompliance(focusSessions),

            // Velocity trend
            velocityTrend: this._calculateVelocityTrend(completedTasks),

            // Period info
            periodDays: recentDays,
            workDays: this._countWorkDays(recentDays)
        };
    }

    _calculateAverageWorkHours(appUsage, days) {
        const sessions = appUsage.sessions || [];
        const recentSessions = sessions.slice(-days * 2); // Rough estimate

        if (recentSessions.length === 0) return 8; // Default

        // Calculate hours from session patterns
        const hoursByDay = {};
        for (const session of recentSessions) {
            const day = session.start.split('T')[0];
            if (!hoursByDay[day]) hoursByDay[day] = new Set();
            hoursByDay[day].add(session.hour);
        }

        const daysTracked = Object.keys(hoursByDay).length;
        const totalHours = Object.values(hoursByDay).reduce((sum, hours) => sum + hours.size, 0);

        return daysTracked > 0 ? totalHours / daysTracked : 8;
    }

    _calculateRecentVelocity(tasks) {
        if (tasks.length === 0) return 0.7;

        const pointsCompleted = tasks.reduce((sum, t) => {
            const points = t.estimatedTime ? t.estimatedTime / 30 : 1;
            return sum + points;
        }, 0);

        return pointsCompleted / this.config.monitoringPeriodDays;
    }

    _calculateOnTimeRate(tasks) {
        const tasksWithDeadline = tasks.filter(t => t.deadline);
        if (tasksWithDeadline.length === 0) return 0.8;

        const onTime = tasksWithDeadline.filter(t =>
            new Date(t.completedAt) <= new Date(t.deadline)
        ).length;

        return onTime / tasksWithDeadline.length;
    }

    _countOvertimeDays(appUsage, days) {
        const sessions = appUsage.sessions || [];
        const overtimeDays = new Set();

        for (const session of sessions.slice(-days * 2)) {
            if (session.hour >= 18 || session.hour < 8) {
                overtimeDays.add(session.start.split('T')[0]);
            }
        }

        return overtimeDays.size / days;
    }

    _countWeekendWork(appUsage, days) {
        const sessions = appUsage.sessions || [];
        const weekendDays = new Set();

        for (const session of sessions.slice(-days * 2)) {
            if (session.day === 0 || session.day === 6) {
                weekendDays.add(session.start.split('T')[0]);
            }
        }

        // Max possible weekends in period
        const maxWeekends = Math.floor(days / 7) * 2;
        return maxWeekends > 0 ? weekendDays.size / maxWeekends : 0;
    }

    _countLateNightWork(appUsage, days) {
        const sessions = appUsage.sessions || [];
        const lateNightDays = new Set();

        for (const session of sessions.slice(-days * 2)) {
            if (session.hour >= 22 || session.hour < 6) {
                lateNightDays.add(session.start.split('T')[0]);
            }
        }

        return lateNightDays.size / days;
    }

    _calculateFocusQuality(focusSessions) {
        if (!Array.isArray(focusSessions) || focusSessions.length === 0) return 0.7;

        // Flatten hourly data
        let totalScore = 0;
        let count = 0;

        for (const hourData of focusSessions) {
            if (Array.isArray(hourData)) {
                for (const session of hourData) {
                    totalScore += session.score || 0.5;
                    count++;
                }
            }
        }

        return count > 0 ? totalScore / count : 0.7;
    }

    _calculateAvgCompletionTime(tasks) {
        const withTime = tasks.filter(t => t.actualTime && t.estimatedTime);
        if (withTime.length === 0) return 1;

        const ratios = withTime.map(t => t.actualTime / t.estimatedTime);
        return ratios.reduce((a, b) => a + b) / ratios.length;
    }

    _getBaselineCompletionTime(allTasks) {
        // Use older tasks as baseline
        const olderTasks = allTasks.slice(0, Math.floor(allTasks.length / 2));
        return this._calculateAvgCompletionTime(olderTasks);
    }

    _calculateBreakCompliance(focusSessions) {
        // Estimate based on focus session patterns
        // If sessions are consistently 90+ min without breaks, compliance is low
        return 0.7; // Placeholder - would need actual break tracking
    }

    _calculateVelocityTrend(tasks) {
        if (tasks.length < 10) return 0;

        const midpoint = Math.floor(tasks.length / 2);
        const older = tasks.slice(0, midpoint);
        const newer = tasks.slice(midpoint);

        const olderVelocity = older.length / (this.config.monitoringPeriodDays / 2);
        const newerVelocity = newer.length / (this.config.monitoringPeriodDays / 2);

        return olderVelocity > 0 ? (newerVelocity - olderVelocity) / olderVelocity : 0;
    }

    _countWorkDays(totalDays) {
        // Approximate work days (5/7 of total)
        return Math.round(totalDays * 5 / 7);
    }

    _calculateIndicatorScores(metrics) {
        const scores = {};

        // Work hours increase
        const hoursRatio = metrics.averageWorkHours / metrics.baselineWorkHours;
        scores.workHoursIncrease = hoursRatio >= this.indicators.workHoursIncrease.threshold
            ? Math.min((hoursRatio - 1) / 0.5, 1)
            : 0;

        // Productivity decline
        const prodRatio = metrics.currentVelocity / metrics.baselineVelocity;
        scores.productivityDecline = prodRatio <= this.indicators.productivityDecline.threshold
            ? Math.min((1 - prodRatio) / 0.4, 1)
            : 0;

        // Missed deadlines
        const missRate = 1 - metrics.onTimeRate;
        scores.missedDeadlines = missRate >= this.indicators.missedDeadlines.threshold
            ? Math.min(missRate / 0.5, 1)
            : 0;

        // Overtime frequency
        scores.overtimeFrequency = metrics.overtimeDays >= this.indicators.overtimeFrequency.threshold
            ? Math.min(metrics.overtimeDays, 1)
            : 0;

        // Weekend work
        scores.weekendWork = metrics.weekendWorkDays >= this.indicators.weekendWork.threshold
            ? Math.min(metrics.weekendWorkDays / 0.5, 1)
            : 0;

        // Focus quality decline
        scores.focusQualityDecline = metrics.averageFocusQuality < this.indicators.focusQualityDecline.threshold
            ? Math.min((0.7 - metrics.averageFocusQuality) / 0.3, 1)
            : 0;

        // Task completion slowdown
        const slowdownRatio = metrics.averageCompletionTime / metrics.baselineCompletionTime;
        scores.taskCompletionSlowdown = slowdownRatio >= this.indicators.taskCompletionSlowdown.threshold
            ? Math.min((slowdownRatio - 1) / 0.5, 1)
            : 0;

        // Break skipping
        scores.breakSkipping = (1 - metrics.breakComplianceRate) >= this.indicators.breakSkipping.threshold
            ? Math.min(1 - metrics.breakComplianceRate, 1)
            : 0;

        // Late night work
        scores.lateNightWork = metrics.lateNightDays >= this.indicators.lateNightWork.threshold
            ? Math.min(metrics.lateNightDays / 0.4, 1)
            : 0;

        // Velocity trend down
        scores.velocityTrendDown = metrics.velocityTrend <= this.indicators.velocityTrendDown.threshold
            ? Math.min(Math.abs(metrics.velocityTrend) / 0.3, 1)
            : 0;

        return scores;
    }

    _calculateOverallScore(scores) {
        let totalScore = 0;

        for (const [indicator, score] of Object.entries(scores)) {
            totalScore += score * this.indicators[indicator].weight;
        }

        return Math.min(1, totalScore);
    }

    _getRiskLevel(score) {
        if (score >= this.config.criticalThreshold) return 'critical';
        if (score >= this.config.warningThreshold) return 'warning';
        if (score >= 0.3) return 'elevated';
        return 'low';
    }

    _analyzeTrend() {
        // Compare with previous assessments
        const history = this.interventionHistory.slice(-5);
        if (history.length < 2) return { direction: 'unknown', confidence: 'low' };

        const scores = history.map(h => h.score);
        const avg = scores.reduce((a, b) => a + b) / scores.length;
        const latestScore = this.lastAssessment?.overallScore || scores[scores.length - 1];

        if (latestScore > avg * 1.1) return { direction: 'worsening', confidence: 'medium' };
        if (latestScore < avg * 0.9) return { direction: 'improving', confidence: 'medium' };
        return { direction: 'stable', confidence: 'medium' };
    }

    _generateRecommendations(score, indicators) {
        const recommendations = [];

        // Find top contributing factors
        const sortedIndicators = Object.entries(indicators)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        for (const [indicator, value] of sortedIndicators) {
            if (value > 0.3) {
                recommendations.push(this._getRecommendationForIndicator(indicator, value));
            }
        }

        // General recommendations based on overall score
        if (score >= this.config.criticalThreshold) {
            recommendations.unshift({
                priority: 'critical',
                message: 'Take immediate action to reduce workload',
                actions: ['Talk to manager about workload', 'Cancel non-essential commitments', 'Schedule recovery time']
            });
        }

        return recommendations;
    }

    _getRecommendationForIndicator(indicator, value) {
        const recommendations = {
            workHoursIncrease: {
                message: 'Work hours have increased significantly',
                actions: ['Set firm end-of-day boundaries', 'Review task priorities', 'Delegate if possible']
            },
            productivityDecline: {
                message: 'Productivity is declining',
                actions: ['Take a mental health day', 'Focus on fewer tasks', 'Address any blockers']
            },
            missedDeadlines: {
                message: 'Deadline completion rate is dropping',
                actions: ['Renegotiate unrealistic deadlines', 'Break tasks into smaller pieces', 'Ask for help']
            },
            overtimeFrequency: {
                message: 'Working overtime too frequently',
                actions: ['Strict 6pm cutoff', 'Block calendar for personal time', 'Say no to new commitments']
            },
            weekendWork: {
                message: 'Working on weekends too often',
                actions: ['Protect weekends completely', 'Finish Friday reviews early', 'Plan weekend activities']
            },
            focusQualityDecline: {
                message: 'Focus quality is declining',
                actions: ['Take more breaks', 'Reduce context switching', 'Create distraction-free periods']
            },
            lateNightWork: {
                message: 'Working late at night',
                actions: ['Set device curfews', 'Prioritize sleep', 'Finish important work earlier']
            }
        };

        return {
            indicator,
            severity: value >= 0.7 ? 'high' : 'medium',
            ...recommendations[indicator] || { message: 'Review work patterns', actions: ['Take a break'] }
        };
    }

    _suggestInterventions(score, indicators) {
        const interventions = [];

        if (score >= this.config.criticalThreshold) {
            interventions.push({
                type: 'immediate',
                action: 'mandatory_break',
                duration: '1-2 days off',
                urgency: 'now'
            });
        } else if (score >= this.config.warningThreshold) {
            interventions.push({
                type: 'preventive',
                action: 'reduce_workload',
                duration: 'this week',
                urgency: 'soon'
            });
        }

        // Specific interventions based on indicators
        if (indicators.weekendWork > 0.5 || indicators.lateNightWork > 0.5) {
            interventions.push({
                type: 'boundary',
                action: 'enforce_work_hours',
                specifics: 'No work after 7pm or on weekends'
            });
        }

        if (indicators.focusQualityDecline > 0.5) {
            interventions.push({
                type: 'cognitive',
                action: 'reduce_cognitive_load',
                specifics: 'Limit active tasks to 3 per day'
            });
        }

        return interventions;
    }

    // ============================================================
    // QUICK CHECK
    // ============================================================

    /**
     * Quick burnout check without full assessment
     * @returns {Object} Quick status
     */
    quickCheck() {
        if (this.lastAssessment &&
            (new Date() - new Date(this.lastAssessment.timestamp)) < 24 * 60 * 60 * 1000) {
            return {
                cached: true,
                riskLevel: this.lastAssessment.riskLevel,
                score: this.lastAssessment.overallScore,
                lastChecked: this.lastAssessment.timestamp
            };
        }

        return this.assessBurnoutRisk();
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const burnoutDetector = new BurnoutDetector();

export function initBurnoutDetector() {
    console.log('🔥 [Burnout Detector] Initialized');
    return burnoutDetector;
}
