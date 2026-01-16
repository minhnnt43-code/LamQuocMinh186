// ============================================================
// BOUNDARY-GUARDIAN.JS - Work-Life Boundary Protection
// Phase 3: Workload & Well-being
// ============================================================

/**
 * Boundary Guardian - Protects work-life boundaries
 * Manages after-hours work, meeting overload, and time shields
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class BoundaryGuardian {
    constructor() {
        this.config = {
            workHours: { start: 9, end: 18 },
            lunchBreak: { start: 12, end: 13 },
            maxMeetingsPerDay: 4,
            maxMeetingHoursPerDay: 4,
            weekendWorkAllowed: false,
            notificationSilenceOutsideHours: true
        };

        this.boundaryViolations = [];
        this.protectedBlocks = [];
    }

    // ============================================================
    // BOUNDARY STATUS
    // ============================================================

    /**
     * Check current boundary status
     * @returns {Object} Boundary status
     */
    checkBoundaryStatus() {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();

        const isWorkHours = this._isWithinWorkHours(hour);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isLunchTime = hour >= this.config.lunchBreak.start && hour < this.config.lunchBreak.end;

        let status = 'work_time';
        let shouldWork = true;

        if (isWeekend && !this.config.weekendWorkAllowed) {
            status = 'weekend';
            shouldWork = false;
        } else if (!isWorkHours) {
            status = 'after_hours';
            shouldWork = false;
        } else if (isLunchTime) {
            status = 'lunch_break';
            shouldWork = false;
        }

        return {
            currentTime: now.toISOString(),
            hour,
            dayOfWeek,
            status,
            shouldWork,
            message: this._getBoundaryMessage(status),
            nextTransition: this._getNextTransition(now),
            violations: this._getRecentViolations()
        };
    }

    _isWithinWorkHours(hour) {
        return hour >= this.config.workHours.start && hour < this.config.workHours.end;
    }

    _getBoundaryMessage(status) {
        const messages = {
            work_time: "You're in work hours. Focus on what matters.",
            after_hours: "It's after hours. Time to disconnect and rest.",
            weekend: "It's the weekend. Take time for yourself.",
            lunch_break: "Lunch time! Step away and recharge."
        };
        return messages[status] || 'Status unknown';
    }

    _getNextTransition(now) {
        const hour = now.getHours();
        const today = new Date(now);

        if (hour < this.config.workHours.start) {
            today.setHours(this.config.workHours.start, 0, 0, 0);
            return { time: today.toISOString(), event: 'work_start' };
        }

        if (hour < this.config.lunchBreak.start) {
            today.setHours(this.config.lunchBreak.start, 0, 0, 0);
            return { time: today.toISOString(), event: 'lunch_start' };
        }

        if (hour < this.config.lunchBreak.end) {
            today.setHours(this.config.lunchBreak.end, 0, 0, 0);
            return { time: today.toISOString(), event: 'lunch_end' };
        }

        if (hour < this.config.workHours.end) {
            today.setHours(this.config.workHours.end, 0, 0, 0);
            return { time: today.toISOString(), event: 'work_end' };
        }

        // Next day
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(this.config.workHours.start, 0, 0, 0);
        return { time: tomorrow.toISOString(), event: 'work_start' };
    }

    _getRecentViolations() {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return this.boundaryViolations.filter(v => new Date(v.time) >= weekAgo);
    }

    // ============================================================
    // BOUNDARY VIOLATION TRACKING
    // ============================================================

    /**
     * Record a boundary violation
     * @param {string} type - Type of violation
     * @param {Object} details - Violation details
     */
    recordViolation(type, details = {}) {
        const violation = {
            time: new Date().toISOString(),
            type,
            details,
            severity: this._assessViolationSeverity(type)
        };

        this.boundaryViolations.push(violation);

        // Keep last 100 violations
        if (this.boundaryViolations.length > 100) {
            this.boundaryViolations.shift();
        }

        // Track in AI
        aiEngine?.trackBehavior?.('boundary_violation', violation);

        return violation;
    }

    _assessViolationSeverity(type) {
        const severities = {
            after_hours_work: 'warning',
            weekend_work: 'high',
            late_night_work: 'critical',
            skipped_lunch: 'low',
            overtime: 'warning'
        };
        return severities[type] || 'low';
    }

    /**
     * Check if current work is a violation
     * @returns {Object} Violation check result
     */
    checkForViolation() {
        const status = this.checkBoundaryStatus();

        if (!status.shouldWork) {
            return {
                isViolation: true,
                type: this._getViolationType(status.status),
                urgency: this._getViolationUrgency(status.status),
                message: this._getViolationWarning(status.status),
                actions: this._getSuggestedActions(status.status)
            };
        }

        return { isViolation: false };
    }

    _getViolationType(status) {
        const types = {
            after_hours: 'after_hours_work',
            weekend: 'weekend_work',
            lunch_break: 'skipped_lunch'
        };
        return types[status] || 'unknown';
    }

    _getViolationUrgency(status) {
        if (status === 'weekend') return 'high';
        if (status === 'after_hours') {
            const hour = new Date().getHours();
            if (hour >= 22 || hour < 6) return 'critical';
            return 'medium';
        }
        return 'low';
    }

    _getViolationWarning(status) {
        const warnings = {
            after_hours: '⚠️ Working after hours. Consider stopping for the day.',
            weekend: '🛑 Working on weekend. Your rest is important!',
            lunch_break: '🍽️ Working through lunch. Take a break!'
        };
        return warnings[status] || 'Working outside normal hours';
    }

    _getSuggestedActions(status) {
        const actions = {
            after_hours: ['Save your work', 'Set a reminder for tomorrow', 'Close laptop now'],
            weekend: ['This can wait till Monday', 'Log off and enjoy your weekend'],
            lunch_break: ['Take 30 min off', 'Eat away from desk', 'Short walk']
        };
        return actions[status] || ['Take a break'];
    }

    // ============================================================
    // MEETING OVERLOAD PROTECTION
    // ============================================================

    /**
     * Analyze meeting load
     * @param {Array} meetings - Today's meetings
     * @returns {Object} Meeting analysis
     */
    analyzeMeetingLoad(meetings = []) {
        const totalMeetings = meetings.length;
        const totalHours = meetings.reduce((sum, m) => sum + (m.duration || 1), 0);

        const overloaded = totalMeetings > this.config.maxMeetingsPerDay ||
            totalHours > this.config.maxMeetingHoursPerDay;

        // Check for back-to-back meetings
        const hasBreaks = this._checkMeetingBreaks(meetings);

        // Find focus time available
        const focusTime = this._calculateFocusTimeAvailable(meetings);

        return {
            totalMeetings,
            totalHours,
            overloaded,
            hasAdequateBreaks: hasBreaks,
            focusTimeAvailable: focusTime,
            status: overloaded ? 'overloaded' : totalMeetings > 3 ? 'heavy' : 'manageable',
            recommendations: this._getMeetingRecommendations(totalMeetings, totalHours, hasBreaks, focusTime)
        };
    }

    _checkMeetingBreaks(meetings) {
        if (meetings.length < 2) return true;

        // Sort by start time
        const sorted = [...meetings].sort((a, b) =>
            new Date(a.start) - new Date(b.start)
        );

        for (let i = 1; i < sorted.length; i++) {
            const prevEnd = new Date(sorted[i - 1].end || sorted[i - 1].start);
            const currStart = new Date(sorted[i].start);

            // Less than 15 min between meetings = no break
            if ((currStart - prevEnd) < 15 * 60 * 1000) {
                return false;
            }
        }

        return true;
    }

    _calculateFocusTimeAvailable(meetings) {
        const workHours = this.config.workHours.end - this.config.workHours.start;
        const lunchHours = this.config.lunchBreak.end - this.config.lunchBreak.start;
        const availableHours = workHours - lunchHours;

        const meetingHours = meetings.reduce((sum, m) => sum + (m.duration || 1), 0);

        return Math.max(0, availableHours - meetingHours);
    }

    _getMeetingRecommendations(count, hours, hasBreaks, focusTime) {
        const recommendations = [];

        if (count > this.config.maxMeetingsPerDay) {
            recommendations.push({
                priority: 'high',
                message: `Too many meetings (${count}). Consider declining or rescheduling.`,
                action: 'Decline or reschedule low-priority meetings'
            });
        }

        if (hours > this.config.maxMeetingHoursPerDay) {
            recommendations.push({
                priority: 'high',
                message: `${hours}h of meetings. Too much time in meetings.`,
                action: 'Request shorter meetings or async updates'
            });
        }

        if (!hasBreaks) {
            recommendations.push({
                priority: 'medium',
                message: 'Back-to-back meetings detected.',
                action: 'Add 15-min buffers between meetings'
            });
        }

        if (focusTime < 2) {
            recommendations.push({
                priority: 'medium',
                message: `Only ${focusTime}h of focus time available.`,
                action: 'Block focus time on calendar'
            });
        }

        return recommendations;
    }

    /**
     * Shield time from meetings
     * @param {number} hours - Hours to protect
     * @param {string} preference - 'morning' or 'afternoon'
     * @returns {Object} Protected blocks
     */
    shieldFocusTime(hours = 2, preference = 'morning') {
        const startHour = preference === 'morning'
            ? this.config.workHours.start
            : this.config.lunchBreak.end;

        const block = {
            id: `focus_shield_${Date.now()}`,
            start: startHour,
            end: startHour + hours,
            type: 'focus_shield',
            protected: true,
            autoDecline: true
        };

        this.protectedBlocks.push(block);

        return {
            block,
            message: `Protected ${hours}h of focus time from ${startHour}:00 to ${startHour + hours}:00`,
            calendarAction: 'Block meets during this time will be auto-declined'
        };
    }

    // ============================================================
    // NOTIFICATION FILTERING
    // ============================================================

    /**
     * Decide if notification should be shown
     * @param {Object} notification - Notification object
     * @returns {Object} Decision
     */
    filterNotification(notification) {
        const status = this.checkBoundaryStatus();

        // Outside work hours
        if (!status.shouldWork && this.config.notificationSilenceOutsideHours) {
            // Only allow critical
            if (notification.priority === 'critical') {
                return { show: true, reason: 'Critical notification' };
            }
            return {
                show: false,
                reason: 'Outside work hours',
                queued: true,
                willShowAt: status.nextTransition.time
            };
        }

        // During protected focus time
        const inProtectedBlock = this._isInProtectedBlock();
        if (inProtectedBlock) {
            if (notification.priority === 'critical' || notification.priority === 'high') {
                return { show: true, reason: 'High priority during focus' };
            }
            return { show: false, reason: 'Focus time', queued: true };
        }

        return { show: true, reason: 'Normal hours' };
    }

    _isInProtectedBlock() {
        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;

        return this.protectedBlocks.some(block =>
            currentHour >= block.start && currentHour < block.end
        );
    }

    // ============================================================
    // AFTER-HOURS TRACKING
    // ============================================================

    /**
     * Get after-hours work summary
     * @returns {Object} After-hours summary
     */
    getAfterHoursSummary() {
        const violations = this._getRecentViolations();

        const afterHoursViolations = violations.filter(v =>
            v.type === 'after_hours_work' || v.type === 'weekend_work' || v.type === 'late_night_work'
        );

        const totalHours = afterHoursViolations.length * 0.5; // Estimate

        return {
            violationCount: afterHoursViolations.length,
            estimatedExtraHours: totalHours,
            weekendDays: violations.filter(v => v.type === 'weekend_work').length,
            lateNights: violations.filter(v => v.type === 'late_night_work').length,
            trend: this._getAfterHoursTrend(violations),
            message: this._getAfterHoursMessage(afterHoursViolations.length)
        };
    }

    _getAfterHoursTrend(violations) {
        if (violations.length < 5) return 'insufficient_data';

        const midpoint = Math.floor(violations.length / 2);
        const olderCount = violations.slice(0, midpoint).length;
        const newerCount = violations.slice(midpoint).length;

        if (newerCount > olderCount * 1.2) return 'increasing';
        if (newerCount < olderCount * 0.8) return 'decreasing';
        return 'stable';
    }

    _getAfterHoursMessage(count) {
        if (count === 0) return 'Great job maintaining work-life boundaries!';
        if (count <= 2) return 'Occasional after-hours work. Keep boundaries in mind.';
        if (count <= 5) return 'Frequent after-hours work detected. Consider setting firmer limits.';
        return 'Significant after-hours work. This is unsustainable.';
    }

    // ============================================================
    // CONFIGURATION
    // ============================================================

    /**
     * Update boundary configuration
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const boundaryGuardian = new BoundaryGuardian();

export function initBoundaryGuardian() {
    console.log('🛡️ [Boundary Guardian] Initialized');
    return boundaryGuardian;
}
