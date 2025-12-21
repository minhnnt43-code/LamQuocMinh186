// ============================================================
// WELLBEING-MONITOR.JS - Overall Well-being Tracking
// Phase 3: Workload & Well-being
// ============================================================

/**
 * Well-being Monitor - Tracks overall work-life health
 */

import { burnoutDetector } from './burnout-detector.js';
import { workloadManager } from './workload-manager.js';
import { aiEngine } from '../ai-engine/ai-core.js';

export class WellbeingMonitor {
    constructor() {
        this.config = {
            checkInterval: 4 * 60 * 60 * 1000, // 4 hours
            dailyReportTime: '17:00',
            weeklyReviewDay: 5 // Friday
        };

        this.wellbeingHistory = [];
        this.currentState = null;
        this.lastCheck = null;
    }

    // ============================================================
    // COMPREHENSIVE WELL-BEING CHECK
    // ============================================================

    /**
     * Perform comprehensive well-being check
     * @param {Array} activeTasks - Current active tasks
     * @returns {Object} Well-being status
     */
    checkWellbeing(activeTasks = []) {
        const burnout = burnoutDetector.quickCheck();
        const workload = workloadManager.assessWorkload(activeTasks);
        const energy = this._assessEnergy();
        const balance = this._assessWorkLifeBalance();
        const stress = this._assessStressLevel(burnout, workload);

        const overallScore = this._calculateOverallWellbeing({
            burnout: 1 - burnout.score,
            workload: 1 - workload.currentLoad.overall,
            energy: energy.score,
            balance: balance.score,
            stress: 1 - stress.level
        });

        this.currentState = {
            timestamp: new Date().toISOString(),
            overallScore,
            status: this._getWellbeingStatus(overallScore),
            components: {
                burnout: { score: burnout.score, level: burnout.riskLevel },
                workload: { score: workload.currentLoad.overall, status: workload.status },
                energy: energy,
                balance: balance,
                stress: stress
            },
            recommendations: this._generateWellbeingRecommendations({
                burnout, workload, energy, balance, stress
            }),
            needsAttention: overallScore < 0.5
        };

        // Store history
        this.wellbeingHistory.push({
            date: this.currentState.timestamp,
            score: overallScore
        });
        if (this.wellbeingHistory.length > 30) {
            this.wellbeingHistory.shift();
        }

        this.lastCheck = new Date();

        return this.currentState;
    }

    _assessEnergy() {
        const hour = new Date().getHours();
        const energyPatterns = aiEngine?.patternStore?.get('energy_patterns') || {};
        const hourData = energyPatterns[hour];

        // Get current energy from patterns
        let currentEnergy = 0.5;
        if (hourData?.avgLevel) {
            currentEnergy = hourData.avgLevel / 4; // Normalize to 0-1
        } else {
            // Default energy curve
            if (hour >= 9 && hour <= 11) currentEnergy = 0.8;
            else if (hour >= 14 && hour <= 16) currentEnergy = 0.65;
            else if (hour >= 12 && hour <= 13) currentEnergy = 0.4;
            else if (hour >= 17) currentEnergy = 0.5;
        }

        return {
            score: currentEnergy,
            level: this._getEnergyLevel(currentEnergy),
            optimalFor: this._getOptimalTaskTypes(currentEnergy)
        };
    }

    _getEnergyLevel(score) {
        if (score >= 0.8) return 'peak';
        if (score >= 0.6) return 'high';
        if (score >= 0.4) return 'moderate';
        return 'low';
    }

    _getOptimalTaskTypes(score) {
        if (score >= 0.7) return ['deep_work', 'creative', 'complex'];
        if (score >= 0.5) return ['routine', 'meetings', 'review'];
        return ['admin', 'email', 'rest'];
    }

    _assessWorkLifeBalance() {
        const appUsage = aiEngine?.patternStore?.get('app_usage_patterns') || {};
        const sessions = appUsage.sessions || [];
        const recentSessions = sessions.slice(-14);

        // Check for work outside normal hours
        let afterHoursCount = 0;
        let weekendCount = 0;

        for (const session of recentSessions) {
            if (session.hour < 8 || session.hour >= 19) afterHoursCount++;
            if (session.day === 0 || session.day === 6) weekendCount++;
        }

        const afterHoursRatio = recentSessions.length > 0
            ? afterHoursCount / recentSessions.length
            : 0;
        const weekendRatio = recentSessions.length > 0
            ? weekendCount / recentSessions.length
            : 0;

        const balanceScore = 1 - (afterHoursRatio * 0.6 + weekendRatio * 0.4);

        return {
            score: Math.max(0, balanceScore),
            level: balanceScore >= 0.7 ? 'healthy' : balanceScore >= 0.5 ? 'concerning' : 'poor',
            afterHoursWork: afterHoursRatio > 0.3,
            weekendWork: weekendRatio > 0.2
        };
    }

    _assessStressLevel(burnout, workload) {
        // Combine signals into stress assessment
        let stressLevel = 0;

        stressLevel += burnout.score * 0.4;
        stressLevel += workload.currentLoad.overall * 0.3;
        stressLevel += workload.currentLoad.cognitive * 0.3;

        return {
            level: stressLevel,
            category: stressLevel >= 0.7 ? 'high' : stressLevel >= 0.4 ? 'moderate' : 'low',
            triggers: this._identifyStressTriggers(burnout, workload)
        };
    }

    _identifyStressTriggers(burnout, workload) {
        const triggers = [];

        if (burnout.riskLevel === 'warning' || burnout.riskLevel === 'critical') {
            triggers.push('Burnout risk indicators');
        }
        if (workload.status === 'overloaded') {
            triggers.push('Workload exceeds capacity');
        }
        if (workload.currentLoad.cognitive > 0.8) {
            triggers.push('High cognitive demands');
        }

        return triggers;
    }

    _calculateOverallWellbeing(components) {
        const weights = {
            burnout: 0.3,
            workload: 0.25,
            energy: 0.15,
            balance: 0.2,
            stress: 0.1
        };

        let score = 0;
        for (const [component, value] of Object.entries(components)) {
            score += value * weights[component];
        }

        return Math.max(0, Math.min(1, score));
    }

    _getWellbeingStatus(score) {
        if (score >= 0.8) return 'thriving';
        if (score >= 0.6) return 'healthy';
        if (score >= 0.4) return 'stressed';
        if (score >= 0.2) return 'struggling';
        return 'critical';
    }

    _generateWellbeingRecommendations({ burnout, workload, energy, balance, stress }) {
        const recommendations = [];

        // Energy-based
        if (energy.score < 0.4) {
            recommendations.push({
                area: 'energy',
                priority: 'high',
                message: 'Energy is low - consider a break',
                actions: ['Take a 15-minute walk', 'Have a healthy snack', 'Do some stretches']
            });
        }

        // Balance-based
        if (balance.score < 0.5) {
            recommendations.push({
                area: 'balance',
                priority: 'medium',
                message: 'Work-life balance needs attention',
                actions: ['Set firm work hours', 'Protect personal time', 'Schedule offline activities']
            });
        }

        // Stress-based
        if (stress.level >= 0.6) {
            recommendations.push({
                area: 'stress',
                priority: 'high',
                message: 'Stress levels are elevated',
                actions: ['Practice deep breathing', 'Reduce commitments', 'Talk to someone']
            });
        }

        return recommendations;
    }

    // ============================================================
    // MICRO-BREAK REMINDERS
    // ============================================================

    /**
     * Check if a micro-break is needed
     * @param {number} focusMinutes - Minutes of current focus session
     * @returns {Object} Break recommendation
     */
    checkMicroBreakNeeded(focusMinutes) {
        const breakThresholds = {
            suggestion: 45,    // Suggest after 45 min
            encouraged: 60,    // Encourage after 60 min
            required: 90       // Strongly recommend after 90 min
        };

        if (focusMinutes >= breakThresholds.required) {
            return {
                needed: true,
                urgency: 'required',
                message: "You've been focused for 90+ minutes. Take a break now.",
                suggestedDuration: 15,
                activities: this._getBreakActivities('long')
            };
        }

        if (focusMinutes >= breakThresholds.encouraged) {
            return {
                needed: true,
                urgency: 'encouraged',
                message: 'Good focus! A short break would help.',
                suggestedDuration: 10,
                activities: this._getBreakActivities('medium')
            };
        }

        if (focusMinutes >= breakThresholds.suggestion) {
            return {
                needed: false,
                urgency: 'suggestion',
                message: 'Consider a quick break soon.',
                suggestedDuration: 5,
                activities: this._getBreakActivities('short')
            };
        }

        return { needed: false, message: 'Focus on!' };
    }

    _getBreakActivities(duration) {
        const activities = {
            short: ['Stretch at desk', 'Look at something 20 feet away', 'Deep breaths'],
            medium: ['Walk to get water', 'Quick walk', 'Stand and stretch'],
            long: ['Take a real walk outside', 'Mindfulness exercise', 'Have a healthy snack']
        };
        return activities[duration] || activities.short;
    }

    // ============================================================
    // ENERGY PRESERVATION MODE
    // ============================================================

    /**
     * Activate energy preservation mode
     * @returns {Object} Preservation mode settings
     */
    activateEnergyPreservation() {
        return {
            active: true,
            startTime: new Date().toISOString(),
            taskFilter: {
                showOnly: ['low_complexity', 'admin', 'routine'],
                hide: ['complex', 'creative', 'strategic']
            },
            uiChanges: {
                simplifiedView: true,
                reducedNotifications: true,
                focusAssist: true
            },
            suggestions: [
                'Only simple tasks will be shown',
                'Notifications are muted',
                'Focus on quick wins to rebuild momentum'
            ]
        };
    }

    // ============================================================
    // DAILY & WEEKLY SUMMARIES
    // ============================================================

    /**
     * Generate daily wellbeing summary
     * @returns {Object} Daily summary
     */
    getDailySummary() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayHistory = this.wellbeingHistory.filter(h =>
            new Date(h.date) >= todayStart
        );

        const avgScore = todayHistory.length > 0
            ? todayHistory.reduce((sum, h) => sum + h.score, 0) / todayHistory.length
            : (this.currentState?.overallScore || 0.5);

        return {
            date: new Date().toISOString().split('T')[0],
            averageWellbeing: avgScore,
            checksToday: todayHistory.length,
            currentState: this.currentState,
            trend: this._getDailyTrend(todayHistory),
            endOfDayAdvice: this._getEndOfDayAdvice(avgScore)
        };
    }

    _getDailyTrend(history) {
        if (history.length < 2) return 'insufficient_data';

        const first = history.slice(0, Math.ceil(history.length / 2));
        const second = history.slice(Math.ceil(history.length / 2));

        const firstAvg = first.reduce((s, h) => s + h.score, 0) / first.length;
        const secondAvg = second.reduce((s, h) => s + h.score, 0) / second.length;

        if (secondAvg > firstAvg * 1.1) return 'improving';
        if (secondAvg < firstAvg * 0.9) return 'declining';
        return 'stable';
    }

    _getEndOfDayAdvice(avgScore) {
        if (avgScore >= 0.7) {
            return 'Great day! You maintained good wellbeing. Enjoy your evening.';
        }
        if (avgScore >= 0.5) {
            return 'Okay day. Make sure to disconnect and rest tonight.';
        }
        return 'Challenging day. Prioritize self-care tonight. Tomorrow is a fresh start.';
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const wellbeingMonitor = new WellbeingMonitor();

export function initWellbeingMonitor() {
    console.log('💚 [Wellbeing Monitor] Initialized');
    return wellbeingMonitor;
}
