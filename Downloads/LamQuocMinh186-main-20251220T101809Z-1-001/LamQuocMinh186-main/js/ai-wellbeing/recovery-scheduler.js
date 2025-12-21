// ============================================================
// RECOVERY-SCHEDULER.JS - Recovery Time Management
// Phase 3: Workload & Well-being
// ============================================================

/**
 * Recovery Scheduler - Manages rest and recovery periods
 * Schedules breaks, downtime, and recovery after intense work
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class RecoveryScheduler {
    constructor() {
        this.config = {
            microBreakInterval: 45,      // minutes
            shortBreakDuration: 5,       // minutes
            longBreakDuration: 15,       // minutes
            recoveryAfterIntense: 30,    // minutes after 2+ hours deep work
            minDailyRecovery: 60,        // total recovery minutes per day
            lunchBreakMin: 30            // minimum lunch break
        };

        this.scheduledRecovery = [];
        this.recoveryHistory = [];
        this.lastBreak = null;
    }

    // ============================================================
    // RECOVERY SCHEDULING
    // ============================================================

    /**
     * Schedule recovery time after intense work
     * @param {Object} workSession - Completed work session
     * @returns {Object} Recovery schedule
     */
    scheduleRecovery(workSession) {
        const { duration, intensity, type } = workSession;

        // Calculate needed recovery
        const recoveryNeeded = this._calculateRecoveryNeeded(duration, intensity);

        const recovery = {
            id: `recovery_${Date.now()}`,
            scheduledFor: new Date().toISOString(),
            duration: recoveryNeeded,
            type: this._getRecoveryType(recoveryNeeded, intensity),
            activities: this._suggestRecoveryActivities(intensity, type),
            reason: `After ${Math.round(duration)} min of ${intensity} work`
        };

        this.scheduledRecovery.push(recovery);

        return recovery;
    }

    _calculateRecoveryNeeded(duration, intensity) {
        const intensityMultipliers = {
            low: 0.1,
            medium: 0.15,
            high: 0.25,
            intense: 0.35
        };

        const multiplier = intensityMultipliers[intensity] || 0.15;
        const baseRecovery = duration * multiplier;

        // Minimum 5 minutes, maximum 30 minutes
        return Math.max(5, Math.min(30, Math.round(baseRecovery)));
    }

    _getRecoveryType(duration, intensity) {
        if (intensity === 'intense' || duration >= 20) return 'full_break';
        if (duration >= 10) return 'short_break';
        return 'micro_break';
    }

    _suggestRecoveryActivities(intensity, workType) {
        const activities = {
            intense: [
                'Take a walk outside',
                'Do stretching exercises',
                'Practice deep breathing',
                'Have a healthy snack',
                'Listen to calming music'
            ],
            high: [
                'Stand and stretch',
                'Get some water',
                'Look out the window',
                'Quick walk around'
            ],
            medium: [
                'Stand up and stretch',
                'Eye rest (look away)',
                'Deep breaths'
            ],
            low: [
                'Quick stretch',
                'Drink water'
            ]
        };

        // Work type specific additions
        if (workType === 'creative' || workType === 'technical') {
            return [...activities[intensity] || activities.medium, 'Do something non-screen related'];
        }

        return activities[intensity] || activities.medium;
    }

    // ============================================================
    // BREAK TRACKING
    // ============================================================

    /**
     * Check if break is needed
     * @param {number} minutesSinceLastBreak - Minutes since last break
     * @returns {Object} Break recommendation
     */
    checkBreakNeeded(minutesSinceLastBreak = null) {
        // Calculate from last break if not provided
        if (minutesSinceLastBreak === null && this.lastBreak) {
            minutesSinceLastBreak = (Date.now() - new Date(this.lastBreak).getTime()) / (1000 * 60);
        }

        if (minutesSinceLastBreak === null || minutesSinceLastBreak >= this.config.microBreakInterval * 2) {
            return {
                needed: true,
                urgency: 'required',
                overdue: minutesSinceLastBreak ? minutesSinceLastBreak - this.config.microBreakInterval : 0,
                suggestion: this._getBreakSuggestion('long'),
                duration: this.config.longBreakDuration
            };
        }

        if (minutesSinceLastBreak >= this.config.microBreakInterval) {
            return {
                needed: true,
                urgency: 'suggested',
                overdue: minutesSinceLastBreak - this.config.microBreakInterval,
                suggestion: this._getBreakSuggestion('short'),
                duration: this.config.shortBreakDuration
            };
        }

        return {
            needed: false,
            nextBreakIn: this.config.microBreakInterval - minutesSinceLastBreak,
            message: `Next break in ${Math.round(this.config.microBreakInterval - minutesSinceLastBreak)} min`
        };
    }

    _getBreakSuggestion(type) {
        const suggestions = {
            long: [
                'Step away from your desk completely',
                'Take a proper walk',
                'Have a healthy snack',
                'Do some stretches',
                'Get fresh air if possible'
            ],
            short: [
                'Stand and stretch',
                'Look at something 20 feet away for 20 seconds',
                'Take a few deep breaths',
                'Drink some water',
                'Roll your shoulders and neck'
            ]
        };

        const options = suggestions[type] || suggestions.short;
        return options[Math.floor(Math.random() * options.length)];
    }

    /**
     * Record that a break was taken
     * @param {Object} breakDetails - Break details
     */
    recordBreak(breakDetails = {}) {
        const breakRecord = {
            time: new Date().toISOString(),
            duration: breakDetails.duration || this.config.shortBreakDuration,
            type: breakDetails.type || 'short',
            activity: breakDetails.activity || 'unspecified'
        };

        this.lastBreak = breakRecord.time;
        this.recoveryHistory.push(breakRecord);

        // Keep last 100 records
        if (this.recoveryHistory.length > 100) {
            this.recoveryHistory.shift();
        }

        // Track in AI
        aiEngine?.trackBehavior?.('break_taken', breakRecord);

        return breakRecord;
    }

    // ============================================================
    // DAILY RECOVERY ANALYSIS
    // ============================================================

    /**
     * Get today's recovery status
     * @returns {Object} Recovery status
     */
    getDailyRecoveryStatus() {
        const today = new Date().toISOString().split('T')[0];
        const todayBreaks = this.recoveryHistory.filter(b =>
            b.time.startsWith(today)
        );

        const totalRecoveryMinutes = todayBreaks.reduce((sum, b) => sum + (b.duration || 5), 0);
        const meetsMinimum = totalRecoveryMinutes >= this.config.minDailyRecovery;

        return {
            date: today,
            breakCount: todayBreaks.length,
            totalRecoveryMinutes,
            targetMinutes: this.config.minDailyRecovery,
            meetsTarget: meetsMinimum,
            progress: Math.min(100, Math.round((totalRecoveryMinutes / this.config.minDailyRecovery) * 100)),
            recommendation: this._getDailyRecoveryRecommendation(totalRecoveryMinutes, meetsMinimum)
        };
    }

    _getDailyRecoveryRecommendation(minutes, meetsTarget) {
        if (meetsTarget) {
            return 'Good recovery today! Keep up the healthy breaks.';
        }

        const remaining = this.config.minDailyRecovery - minutes;
        const hour = new Date().getHours();

        if (hour < 12) {
            return `Take ${remaining}+ more minutes of breaks today. You have plenty of time.`;
        }
        if (hour < 16) {
            return `You need ${remaining} more minutes of break time. Schedule breaks now.`;
        }
        return `Only ${minutes} min of breaks today. Take a longer end-of-day break.`;
    }

    // ============================================================
    // PROACTIVE RECOVERY SUGGESTIONS
    // ============================================================

    /**
     * Get proactive recovery suggestions based on context
     * @param {Object} context - Current context
     * @returns {Object} Suggestions
     */
    getProactiveSuggestions(context = {}) {
        const suggestions = [];
        const hour = new Date().getHours();

        // Time-based suggestions
        if (hour >= 14 && hour <= 15) {
            suggestions.push({
                type: 'afternoon_dip',
                message: 'Afternoon energy dip is common. A short walk can help.',
                action: 'Take a 10-minute walk'
            });
        }

        if (hour >= 17) {
            suggestions.push({
                type: 'end_of_day',
                message: 'End of day approaching. Start winding down.',
                action: 'Switch to lighter tasks'
            });
        }

        // Intensity-based
        if (context.recentIntenseWork) {
            suggestions.push({
                type: 'post_intense',
                message: 'After intense work, your brain needs recovery.',
                action: 'Take a proper break before next task'
            });
        }

        // Streak-based
        if (context.minutesWithoutBreak >= 60) {
            suggestions.push({
                type: 'overdue_break',
                message: 'You\'ve been working for over an hour without a break.',
                action: 'Stop now and take 10 minutes',
                urgency: 'high'
            });
        }

        return suggestions;
    }

    // ============================================================
    // RECOVERY REMINDERS
    // ============================================================

    /**
     * Get scheduled reminders
     * @returns {Array} Upcoming reminders
     */
    getScheduledReminders() {
        const now = new Date();
        const reminders = [];

        // Next micro-break
        if (this.lastBreak) {
            const lastBreakTime = new Date(this.lastBreak);
            const nextMicroBreak = new Date(lastBreakTime.getTime() + this.config.microBreakInterval * 60 * 1000);

            if (nextMicroBreak > now) {
                reminders.push({
                    type: 'micro_break',
                    time: nextMicroBreak.toISOString(),
                    message: 'Time for a short stretch break'
                });
            }
        }

        // Scheduled recovery from the list
        for (const recovery of this.scheduledRecovery) {
            if (new Date(recovery.scheduledFor) > now) {
                reminders.push({
                    type: recovery.type,
                    time: recovery.scheduledFor,
                    message: recovery.reason,
                    activities: recovery.activities
                });
            }
        }

        return reminders.sort((a, b) => new Date(a.time) - new Date(b.time));
    }

    // ============================================================
    // RECOVERY QUALITY
    // ============================================================

    /**
     * Rate recovery quality for a break
     * @param {string} breakId - Break ID
     * @param {number} quality - Quality rating 1-5
     */
    rateRecoveryQuality(breakId, quality) {
        const breakRecord = this.recoveryHistory.find(b => b.id === breakId);
        if (breakRecord) {
            breakRecord.qualityRating = quality;
            breakRecord.wasEffective = quality >= 4;
        }

        return { recorded: true, breakId, quality };
    }

    /**
     * Get recovery effectiveness analysis
     * @returns {Object} Effectiveness analysis
     */
    getRecoveryEffectiveness() {
        const ratedBreaks = this.recoveryHistory.filter(b => b.qualityRating);

        if (ratedBreaks.length < 5) {
            return { hasEnoughData: false, message: 'Rate more breaks to see analysis' };
        }

        const avgRating = ratedBreaks.reduce((sum, b) => sum + b.qualityRating, 0) / ratedBreaks.length;
        const effectiveBreaks = ratedBreaks.filter(b => b.wasEffective);

        // Analyze what makes breaks effective
        const effectiveTypes = this._analyzeEffectiveBreaks(effectiveBreaks);

        return {
            hasEnoughData: true,
            averageRating: avgRating,
            effectivenessRate: (effectiveBreaks.length / ratedBreaks.length) * 100,
            mostEffective: effectiveTypes,
            recommendation: this._getEffectivenessRecommendation(effectiveTypes)
        };
    }

    _analyzeEffectiveBreaks(effectiveBreaks) {
        const analysis = {
            byDuration: {},
            byActivity: {},
            byTimeOfDay: {}
        };

        for (const breakRecord of effectiveBreaks) {
            // By duration
            const durationBucket = breakRecord.duration >= 15 ? 'long' : breakRecord.duration >= 10 ? 'medium' : 'short';
            analysis.byDuration[durationBucket] = (analysis.byDuration[durationBucket] || 0) + 1;

            // By activity
            if (breakRecord.activity) {
                analysis.byActivity[breakRecord.activity] = (analysis.byActivity[breakRecord.activity] || 0) + 1;
            }

            // By time of day
            const hour = new Date(breakRecord.time).getHours();
            const timeBucket = hour < 12 ? 'morning' : hour < 15 ? 'early_afternoon' : 'late_afternoon';
            analysis.byTimeOfDay[timeBucket] = (analysis.byTimeOfDay[timeBucket] || 0) + 1;
        }

        return analysis;
    }

    _getEffectivenessRecommendation(analysis) {
        const recommendations = [];

        // Find most effective duration
        const bestDuration = Object.entries(analysis.byDuration)
            .sort((a, b) => b[1] - a[1])[0];
        if (bestDuration) {
            recommendations.push(`${bestDuration[0]} breaks work best for you`);
        }

        // Find most effective activity
        const bestActivity = Object.entries(analysis.byActivity)
            .sort((a, b) => b[1] - a[1])[0];
        if (bestActivity) {
            recommendations.push(`Try "${bestActivity[0]}" more often`);
        }

        return recommendations;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const recoveryScheduler = new RecoveryScheduler();

export function initRecoveryScheduler() {
    console.log('🧘 [Recovery Scheduler] Initialized');
    return recoveryScheduler;
}
