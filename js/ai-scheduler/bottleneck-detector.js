// ============================================================
// BOTTLENECK-DETECTOR.JS - Workload Bottleneck Detection
// Phase 2: Smart Scheduling
// ============================================================

/**
 * Bottleneck Detector - Proactive workload bottleneck warning
 * Predicts overload 1-2 weeks ahead
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class BottleneckDetector {
    constructor() {
        this.config = {
            lookAheadDays: 14,
            warningThreshold: 0.8,     // 80% capacity
            criticalThreshold: 1.0,    // 100% capacity
            dailyCapacityHours: 6,     // Effective work hours
            bufferPercentage: 0.2      // 20% buffer
        };

        this.bottleneckCache = null;
        this.lastAnalysis = null;
    }

    // ============================================================
    // BOTTLENECK ANALYSIS
    // ============================================================

    /**
     * Analyze upcoming workload for bottlenecks
     * @param {Array} tasks - All tasks
     * @param {Array} events - Calendar events
     * @returns {Object} Bottleneck analysis
     */
    analyzeBottlenecks(tasks, events = []) {
        const now = new Date();
        const dailyLoad = this._calculateDailyLoad(tasks, events);
        const capacity = this._getUserCapacity();

        const analysis = {
            period: {
                start: now.toISOString().split('T')[0],
                end: new Date(now.getTime() + this.config.lookAheadDays * 24 * 60 * 60 * 1000)
                    .toISOString().split('T')[0]
            },
            dailyAnalysis: [],
            bottlenecks: [],
            riskDays: [],
            overallRisk: 'low',
            recommendations: []
        };

        // Analyze each day
        for (let i = 0; i < this.config.lookAheadDays; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const dayLoad = dailyLoad[dateStr] || { hours: 0, tasks: [], meetings: 0 };
            const utilizationRate = dayLoad.hours / capacity.dailyHours;

            const dayAnalysis = {
                date: dateStr,
                dayOfWeek: this._getDayName(date.getDay()),
                scheduledHours: dayLoad.hours,
                capacity: capacity.dailyHours,
                utilization: utilizationRate,
                status: this._getLoadStatus(utilizationRate),
                taskCount: dayLoad.tasks.length,
                meetingHours: dayLoad.meetings
            };

            analysis.dailyAnalysis.push(dayAnalysis);

            // Flag bottlenecks
            if (utilizationRate >= this.config.criticalThreshold) {
                analysis.bottlenecks.push({
                    date: dateStr,
                    severity: 'critical',
                    overloadHours: dayLoad.hours - capacity.dailyHours,
                    affectedTasks: dayLoad.tasks,
                    suggestion: this._getBottleneckSuggestion('critical', dayAnalysis)
                });
            } else if (utilizationRate >= this.config.warningThreshold) {
                analysis.riskDays.push({
                    date: dateStr,
                    severity: 'warning',
                    remainingCapacity: capacity.dailyHours - dayLoad.hours,
                    buffer: (1 - utilizationRate) * capacity.dailyHours
                });
            }
        }

        // Calculate overall risk
        analysis.overallRisk = this._calculateOverallRisk(analysis);

        // Generate recommendations
        analysis.recommendations = this._generateRecommendations(analysis);

        this.bottleneckCache = analysis;
        this.lastAnalysis = new Date();

        return analysis;
    }

    _calculateDailyLoad(tasks, events) {
        const dailyLoad = {};

        // Add task workload
        for (const task of tasks) {
            if (task.status === 'completed' || task.status === 'cancelled') continue;

            const deadline = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : null;
            const scheduledDate = task.scheduledDate || deadline;

            if (!scheduledDate) continue;

            if (!dailyLoad[scheduledDate]) {
                dailyLoad[scheduledDate] = { hours: 0, tasks: [], meetings: 0 };
            }

            const taskHours = (task.estimatedTime || 30) / 60;
            dailyLoad[scheduledDate].hours += taskHours;
            dailyLoad[scheduledDate].tasks.push({
                id: task.id,
                title: task.title,
                hours: taskHours,
                priority: task.priority
            });
        }

        // Add events/meetings
        for (const event of events) {
            const eventDate = new Date(event.start).toISOString().split('T')[0];
            if (!dailyLoad[eventDate]) {
                dailyLoad[eventDate] = { hours: 0, tasks: [], meetings: 0 };
            }

            const eventHours = event.duration || 1;
            dailyLoad[eventDate].hours += eventHours;
            dailyLoad[eventDate].meetings += eventHours;
        }

        return dailyLoad;
    }

    _getUserCapacity() {
        const profile = aiEngine?.userProfile?.getData() || {};

        return {
            dailyHours: profile.averageWorkHours || this.config.dailyCapacityHours,
            effectiveRate: profile.averageProductivity || 0.8,
            maxTasks: profile.maxConcurrentTasks || 8
        };
    }

    _getLoadStatus(utilization) {
        if (utilization >= this.config.criticalThreshold) return 'overloaded';
        if (utilization >= this.config.warningThreshold) return 'heavy';
        if (utilization >= 0.5) return 'moderate';
        return 'light';
    }

    _getDayName(dayIndex) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayIndex];
    }

    _getBottleneckSuggestion(severity, dayAnalysis) {
        if (severity === 'critical') {
            if (dayAnalysis.meetingHours > dayAnalysis.scheduledHours * 0.5) {
                return 'Consider rescheduling some meetings';
            }
            return 'Move lower-priority tasks to adjacent days';
        }
        return 'Monitor closely and prepare contingency';
    }

    _calculateOverallRisk(analysis) {
        const criticalCount = analysis.bottlenecks.length;
        const warningCount = analysis.riskDays.length;

        if (criticalCount >= 3) return 'critical';
        if (criticalCount >= 1) return 'high';
        if (warningCount >= 5) return 'moderate';
        if (warningCount >= 2) return 'low';
        return 'minimal';
    }

    _generateRecommendations(analysis) {
        const recommendations = [];

        // Critical bottlenecks
        if (analysis.bottlenecks.length > 0) {
            recommendations.push({
                priority: 'high',
                type: 'action',
                message: `${analysis.bottlenecks.length} day(s) are overloaded`,
                action: 'Redistribute tasks or renegotiate deadlines',
                affectedDates: analysis.bottlenecks.map(b => b.date)
            });
        }

        // Consecutive heavy days
        const consecutiveHeavy = this._findConsecutiveHeavyDays(analysis.dailyAnalysis);
        if (consecutiveHeavy.length >= 3) {
            recommendations.push({
                priority: 'medium',
                type: 'warning',
                message: `${consecutiveHeavy.length} consecutive heavy days detected`,
                action: 'Consider scheduling a lighter day to prevent burnout',
                affectedDates: consecutiveHeavy.map(d => d.date)
            });
        }

        // High meeting load
        const highMeetingDays = analysis.dailyAnalysis.filter(d => d.meetingHours > 3);
        if (highMeetingDays.length > 0) {
            recommendations.push({
                priority: 'medium',
                type: 'suggestion',
                message: 'Some days have high meeting load',
                action: 'Protect focus time by batching meetings',
                affectedDates: highMeetingDays.map(d => d.date)
            });
        }

        // Light days that could absorb overflow
        const lightDays = analysis.dailyAnalysis.filter(d => d.utilization < 0.5);
        if (lightDays.length > 0 && analysis.bottlenecks.length > 0) {
            recommendations.push({
                priority: 'low',
                type: 'opportunity',
                message: `${lightDays.length} light day(s) could absorb overflow`,
                action: 'Move tasks from overloaded days',
                affectedDates: lightDays.map(d => d.date)
            });
        }

        return recommendations;
    }

    _findConsecutiveHeavyDays(dailyAnalysis) {
        const heavyDays = [];
        let consecutive = [];

        for (const day of dailyAnalysis) {
            if (day.status === 'heavy' || day.status === 'overloaded') {
                consecutive.push(day);
            } else {
                if (consecutive.length >= 3) {
                    heavyDays.push(...consecutive);
                }
                consecutive = [];
            }
        }

        if (consecutive.length >= 3) {
            heavyDays.push(...consecutive);
        }

        return heavyDays;
    }

    // ============================================================
    // PROACTIVE WARNINGS
    // ============================================================

    /**
     * Get upcoming warnings for the next week
     * @param {Array} tasks
     * @returns {Array} Warnings
     */
    getUpcomingWarnings(tasks) {
        const analysis = this.bottleneckCache || this.analyzeBottlenecks(tasks);
        const warnings = [];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        for (const bottleneck of analysis.bottlenecks) {
            if (new Date(bottleneck.date) <= nextWeek) {
                warnings.push({
                    type: 'bottleneck',
                    severity: bottleneck.severity,
                    date: bottleneck.date,
                    message: `Overloaded by ${bottleneck.overloadHours.toFixed(1)}h`,
                    affectedTaskCount: bottleneck.affectedTasks.length
                });
            }
        }

        for (const riskDay of analysis.riskDays) {
            if (new Date(riskDay.date) <= nextWeek) {
                warnings.push({
                    type: 'risk',
                    severity: riskDay.severity,
                    date: riskDay.date,
                    message: `Only ${riskDay.remainingCapacity.toFixed(1)}h buffer remaining`,
                    buffer: riskDay.buffer
                });
            }
        }

        return warnings.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // ============================================================
    // RESOURCE AVAILABILITY
    // ============================================================

    /**
     * Find available slots in the schedule
     * @param {Array} tasks
     * @param {number} hoursNeeded
     * @returns {Array} Available slots
     */
    findAvailableSlots(tasks, hoursNeeded = 2) {
        const analysis = this.bottleneckCache || this.analyzeBottlenecks(tasks);
        const slots = [];

        for (const day of analysis.dailyAnalysis) {
            const available = day.capacity - day.scheduledHours;
            if (available >= hoursNeeded) {
                slots.push({
                    date: day.date,
                    dayOfWeek: day.dayOfWeek,
                    availableHours: available,
                    status: day.status,
                    recommendation: available > hoursNeeded * 1.5
                        ? 'Good slot for deep work'
                        : 'Fits but limited buffer'
                });
            }
        }

        return slots;
    }

    // ============================================================
    // CAPACITY FORECASTING
    // ============================================================

    /**
     * Forecast capacity for upcoming period
     * @param {number} weeksAhead
     * @returns {Object} Capacity forecast
     */
    forecastCapacity(weeksAhead = 4) {
        const capacity = this._getUserCapacity();
        const weeklyCapacity = capacity.dailyHours * 5; // 5 work days

        const forecast = [];
        const now = new Date();

        for (let week = 0; week < weeksAhead; week++) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() + (week * 7));

            // Account for predicted PTO, holidays, etc.
            const adjustedCapacity = this._adjustForPredictedAbsences(weekStart, weeklyCapacity);

            forecast.push({
                weekNumber: week + 1,
                startDate: weekStart.toISOString().split('T')[0],
                baseCapacity: weeklyCapacity,
                adjustedCapacity,
                predictedLoad: 0, // To be calculated from tasks
                availableCapacity: adjustedCapacity
            });
        }

        return {
            forecast,
            totalCapacity: forecast.reduce((sum, w) => sum + w.adjustedCapacity, 0),
            avgWeeklyCapacity: weeklyCapacity
        };
    }

    _adjustForPredictedAbsences(weekStart, baseCapacity) {
        // TODO: Integrate with calendar for PTO/holidays
        // For now, just return base capacity
        return baseCapacity;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const bottleneckDetector = new BottleneckDetector();

export function initBottleneckDetector() {
    console.log('🚧 [Bottleneck Detector] Initialized');
    return bottleneckDetector;
}
