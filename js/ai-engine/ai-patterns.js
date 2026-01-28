// ============================================================
// AI-PATTERNS.JS - Pattern Recognition for Task Management
// Phase 1: Foundation & Core Intelligence
// ============================================================

/**
 * Pattern Recognizer - Learns and recognizes user behavior patterns
 * Used for: Energy curves, productivity patterns, implicit deadlines
 */

// ============================================================
// PATTERN RECOGNIZER CLASS
// ============================================================

export class PatternRecognizer {
    constructor(patternStore) {
        this.patternStore = patternStore;

        // Pattern thresholds
        this.thresholds = {
            minDataPoints: 5,
            confidenceThreshold: 0.6,
            stagnationDays: 3,
            energyPeakThreshold: 0.7
        };
    }

    // ============================================================
    // ENERGY CURVE ANALYSIS
    // ============================================================

    /**
     * Analyze user's energy/productivity curve throughout the day
     * @returns {Object} Energy pattern by hour
     */
    getEnergyCurve() {
        const completionsByHour = this.patternStore.get('completions_by_hour') || {};
        const focusByHour = this.patternStore.get('focus_quality_by_hour') || {};

        const curve = {};

        for (let hour = 0; hour < 24; hour++) {
            const completions = completionsByHour[hour] || [];
            const focusData = focusByHour[hour] || [];

            // Calculate average productivity score for this hour
            const productivityScore = this._calculateProductivityScore(completions, focusData);

            curve[hour] = {
                score: productivityScore,
                level: this._getEnergyLevel(productivityScore),
                recommendation: this._getHourRecommendation(productivityScore),
                dataPoints: completions.length + focusData.length
            };
        }

        // Find peak hours
        const peakHours = this._findPeakHours(curve);

        return {
            hourly: curve,
            peakHours,
            bestTimeForDeepWork: this._getBestDeepWorkTime(curve),
            bestTimeForMeetings: this._getBestMeetingTime(curve),
            lowEnergyHours: this._getLowEnergyHours(curve)
        };
    }

    _calculateProductivityScore(completions, focusData) {
        if (completions.length === 0 && focusData.length === 0) return 0.5;

        // Weight factors
        const completionWeight = 0.6;
        const focusWeight = 0.4;

        // Average completion quality (0-1)
        const avgCompletion = completions.length > 0
            ? completions.reduce((sum, c) => sum + (c.quality || 0.5), 0) / completions.length
            : 0.5;

        // Average focus quality (0-1)
        const avgFocus = focusData.length > 0
            ? focusData.reduce((sum, f) => sum + (f.score || 0.5), 0) / focusData.length
            : 0.5;

        return (avgCompletion * completionWeight) + (avgFocus * focusWeight);
    }

    _getEnergyLevel(score) {
        if (score >= 0.8) return 'peak';
        if (score >= 0.6) return 'high';
        if (score >= 0.4) return 'medium';
        if (score >= 0.2) return 'low';
        return 'very_low';
    }

    _getHourRecommendation(score) {
        if (score >= 0.8) return 'deep_work';
        if (score >= 0.6) return 'complex_tasks';
        if (score >= 0.4) return 'routine_tasks';
        if (score >= 0.2) return 'admin_tasks';
        return 'break';
    }

    _findPeakHours(curve) {
        return Object.entries(curve)
            .filter(([_, data]) => data.score >= this.thresholds.energyPeakThreshold)
            .map(([hour, _]) => parseInt(hour))
            .sort((a, b) => curve[b].score - curve[a].score);
    }

    _getBestDeepWorkTime(curve) {
        // Find consecutive high-energy hours
        const highHours = Object.entries(curve)
            .filter(([_, data]) => data.score >= 0.7)
            .map(([hour, _]) => parseInt(hour));

        if (highHours.length === 0) return { start: 9, end: 11 }; // Default

        // Find longest consecutive block
        let maxStart = highHours[0];
        let maxLength = 1;
        let currentStart = highHours[0];
        let currentLength = 1;

        for (let i = 1; i < highHours.length; i++) {
            if (highHours[i] === highHours[i - 1] + 1) {
                currentLength++;
            } else {
                if (currentLength > maxLength) {
                    maxLength = currentLength;
                    maxStart = currentStart;
                }
                currentStart = highHours[i];
                currentLength = 1;
            }
        }

        if (currentLength > maxLength) {
            maxLength = currentLength;
            maxStart = currentStart;
        }

        return { start: maxStart, end: maxStart + maxLength };
    }

    _getBestMeetingTime(curve) {
        // Meetings are best in medium energy times (not peak, not low)
        const mediumHours = Object.entries(curve)
            .filter(([_, data]) => data.score >= 0.4 && data.score < 0.7)
            .map(([hour, _]) => parseInt(hour));

        return mediumHours.length > 0 ? mediumHours : [14, 15, 16]; // Default afternoon
    }

    _getLowEnergyHours(curve) {
        return Object.entries(curve)
            .filter(([_, data]) => data.score < 0.4)
            .map(([hour, _]) => parseInt(hour));
    }

    // ============================================================
    // PRODUCTIVITY PATTERNS
    // ============================================================

    /**
     * Get comprehensive productivity patterns
     * @returns {Object} Productivity insights
     */
    getProductivityPatterns() {
        return {
            taskTypePerformance: this._getTaskTypePerformance(),
            dayOfWeekPerformance: this._getDayOfWeekPerformance(),
            procrastinationPatterns: this._getProcrastinationPatterns(),
            completionVelocity: this._getCompletionVelocity(),
            estimationAccuracy: this._getEstimationAccuracy()
        };
    }

    _getTaskTypePerformance() {
        const taskTypeData = this.patternStore.get('task_type_performance') || {};
        const result = {};

        for (const [type, data] of Object.entries(taskTypeData)) {
            result[type] = {
                averageTime: data.totalTime / (data.count || 1),
                completionRate: data.completed / (data.total || 1),
                onTimeRate: data.onTime / (data.completed || 1),
                optimalTimeOfDay: data.bestHour || 'any'
            };
        }

        return result;
    }

    _getDayOfWeekPerformance() {
        const dayData = this.patternStore.get('day_of_week_performance') || {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return days.map((day, index) => ({
            day,
            productivity: dayData[index]?.score || 0.5,
            tasksCompleted: dayData[index]?.completed || 0,
            averageWorkHours: dayData[index]?.workHours || 8
        }));
    }

    _getProcrastinationPatterns() {
        const procrastinationData = this.patternStore.get('procrastination_patterns') || [];

        return {
            frequentlyDelayed: procrastinationData.slice(0, 5),
            commonReasons: this._analyzeDelayReasons(procrastinationData),
            riskIndicators: this._getProcrastinationRiskIndicators()
        };
    }

    _analyzeDelayReasons(data) {
        const reasons = {};
        data.forEach(item => {
            const reason = item.reason || 'unknown';
            reasons[reason] = (reasons[reason] || 0) + 1;
        });
        return Object.entries(reasons)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }

    _getProcrastinationRiskIndicators() {
        return [
            { indicator: 'vague_description', weight: 0.3 },
            { indicator: 'no_deadline', weight: 0.2 },
            { indicator: 'large_scope', weight: 0.25 },
            { indicator: 'unfamiliar_task', weight: 0.15 },
            { indicator: 'dependency_unclear', weight: 0.1 }
        ];
    }

    _getCompletionVelocity() {
        const velocityData = this.patternStore.get('completion_velocity') || [];

        // Calculate weekly velocity trend
        const weeklyVelocity = this._groupByWeek(velocityData);
        const trend = this._calculateTrend(weeklyVelocity);

        return {
            currentWeek: weeklyVelocity[0] || 0,
            lastWeek: weeklyVelocity[1] || 0,
            trend: trend,
            averageTasksPerDay: this._calculateAveragePerDay(velocityData)
        };
    }

    _groupByWeek(data) {
        // Simplified week grouping
        const weeks = [];
        const weekSize = 7;
        for (let i = 0; i < data.length; i += weekSize) {
            weeks.push(data.slice(i, i + weekSize).reduce((sum, d) => sum + d.count, 0));
        }
        return weeks.reverse();
    }

    _calculateTrend(weeklyData) {
        if (weeklyData.length < 2) return 'stable';
        const current = weeklyData[0];
        const previous = weeklyData[1];
        const diff = (current - previous) / (previous || 1);

        if (diff > 0.1) return 'increasing';
        if (diff < -0.1) return 'decreasing';
        return 'stable';
    }

    _calculateAveragePerDay(data) {
        if (data.length === 0) return 0;
        const total = data.reduce((sum, d) => sum + d.count, 0);
        return total / data.length;
    }

    _getEstimationAccuracy() {
        const estimationData = this.patternStore.get('estimation_accuracy') || [];

        if (estimationData.length === 0) {
            return { accuracy: 0.5, bias: 'unknown', improvement: [] };
        }

        const accuracy = estimationData.reduce((sum, e) => sum + e.accuracy, 0) / estimationData.length;
        const bias = this._calculateEstimationBias(estimationData);

        return {
            accuracy,
            bias,
            improvement: this._getEstimationImprovement(estimationData)
        };
    }

    _calculateEstimationBias(data) {
        const totalBias = data.reduce((sum, e) => sum + (e.actual - e.estimated), 0);
        if (totalBias > 0) return 'underestimate';
        if (totalBias < 0) return 'overestimate';
        return 'balanced';
    }

    _getEstimationImprovement(data) {
        // Compare recent vs older estimations
        const recent = data.slice(0, Math.floor(data.length / 2));
        const older = data.slice(Math.floor(data.length / 2));

        const recentAccuracy = recent.reduce((s, e) => s + e.accuracy, 0) / (recent.length || 1);
        const olderAccuracy = older.reduce((s, e) => s + e.accuracy, 0) / (older.length || 1);

        return {
            improving: recentAccuracy > olderAccuracy,
            change: recentAccuracy - olderAccuracy
        };
    }

    // ============================================================
    // IMPLICIT DEADLINE DETECTION
    // ============================================================

    /**
     * Detect implicit deadlines from context
     * @param {Object} task - Task object
     * @param {Object} context - External context
     * @returns {Object} Detected deadline and confidence
     */
    detectImplicitDeadline(task, context = {}) {
        const signals = [];

        // Check task title/description for urgency words
        const urgencySignal = this._detectUrgencyWords(task);
        if (urgencySignal) signals.push(urgencySignal);

        // Check for related calendar events
        if (context.calendarEvents) {
            const eventSignal = this._detectRelatedEvents(task, context.calendarEvents);
            if (eventSignal) signals.push(eventSignal);
        }

        // Check for mentioned dates in description
        const dateSignal = this._detectMentionedDates(task);
        if (dateSignal) signals.push(dateSignal);

        // Check dependency deadlines
        if (context.dependentTasks) {
            const depSignal = this._detectDependencyDeadline(task, context.dependentTasks);
            if (depSignal) signals.push(depSignal);
        }

        // Aggregate signals
        if (signals.length === 0) return null;

        return this._aggregateDeadlineSignals(signals);
    }

    _detectUrgencyWords(task) {
        const urgencyPatterns = [
            { pattern: /asap|as soon as possible/i, weight: 0.9, offset: 1 },
            { pattern: /urgent|urgently/i, weight: 0.85, offset: 1 },
            { pattern: /immediately/i, weight: 0.95, offset: 0 },
            { pattern: /by end of (day|today)/i, weight: 0.9, offset: 0 },
            { pattern: /by end of week/i, weight: 0.8, offset: 5 },
            { pattern: /this week/i, weight: 0.7, offset: 5 },
            { pattern: /next week/i, weight: 0.6, offset: 10 }
        ];

        const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();

        for (const { pattern, weight, offset } of urgencyPatterns) {
            if (pattern.test(text)) {
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + offset);
                return {
                    source: 'urgency_words',
                    deadline,
                    confidence: weight
                };
            }
        }

        return null;
    }

    _detectRelatedEvents(task, events) {
        const taskWords = (task.title || '').toLowerCase().split(/\s+/);

        for (const event of events) {
            const eventWords = (event.title || '').toLowerCase().split(/\s+/);
            const overlap = taskWords.filter(w => eventWords.includes(w) && w.length > 3);

            if (overlap.length >= 2) {
                return {
                    source: 'calendar_event',
                    deadline: new Date(event.start),
                    confidence: 0.7,
                    relatedEvent: event.title
                };
            }
        }

        return null;
    }

    _detectMentionedDates(task) {
        const text = `${task.title || ''} ${task.description || ''}`;

        // Simple date patterns
        const datePatterns = [
            /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
            /(\d{1,2})-(\d{1,2})-(\d{2,4})/,
            /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
            /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                const parsedDate = this._parseDetectedDate(match[0]);
                if (parsedDate) {
                    return {
                        source: 'mentioned_date',
                        deadline: parsedDate,
                        confidence: 0.6
                    };
                }
            }
        }

        return null;
    }

    _parseDetectedDate(dateString) {
        // Try to parse the date string
        const parsed = new Date(dateString);
        if (!isNaN(parsed.getTime())) return parsed;

        // Handle day names
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = days.indexOf(dateString.toLowerCase());
        if (dayIndex >= 0) {
            const today = new Date();
            const diff = (dayIndex - today.getDay() + 7) % 7 || 7;
            const result = new Date(today);
            result.setDate(today.getDate() + diff);
            return result;
        }

        return null;
    }

    _detectDependencyDeadline(task, dependentTasks) {
        // If other tasks depend on this one, their deadlines inform this one
        const dependentDeadlines = dependentTasks
            .filter(t => t.deadline)
            .map(t => new Date(t.deadline));

        if (dependentDeadlines.length === 0) return null;

        // Earliest dependent deadline minus buffer
        const earliest = new Date(Math.min(...dependentDeadlines));
        earliest.setDate(earliest.getDate() - 1); // 1 day buffer

        return {
            source: 'dependency',
            deadline: earliest,
            confidence: 0.75,
            dependentCount: dependentDeadlines.length
        };
    }

    _aggregateDeadlineSignals(signals) {
        // Sort by deadline (earliest first)
        signals.sort((a, b) => a.deadline - b.deadline);

        // Weight by confidence
        const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
        const weightedSum = signals.reduce((sum, s) => sum + s.deadline.getTime() * s.confidence, 0);
        const suggestedDeadline = new Date(weightedSum / totalConfidence);

        return {
            suggestedDeadline,
            confidence: Math.min(totalConfidence / signals.length, 1),
            signals,
            reasoning: signals.map(s => `${s.source}: ${s.confidence.toFixed(2)}`).join(', ')
        };
    }

    // ============================================================
    // STAGNATION DETECTION
    // ============================================================

    /**
     * Detect tasks showing stagnation patterns
     * @param {Array} tasks - Array of tasks
     * @returns {Array} Tasks showing stagnation
     */
    detectStagnation(tasks) {
        const stagnantTasks = [];
        const now = new Date();

        for (const task of tasks) {
            if (task.status === 'completed') continue;

            const stagnationIndicators = [];
            let stagnationScore = 0;

            // Check time since last update
            if (task.updatedAt) {
                const daysSinceUpdate = (now - new Date(task.updatedAt)) / (1000 * 60 * 60 * 24);
                if (daysSinceUpdate > this.thresholds.stagnationDays) {
                    stagnationScore += 0.3;
                    stagnationIndicators.push(`No updates for ${Math.floor(daysSinceUpdate)} days`);
                }
            }

            // Check if marked "in progress" but no completion progress
            if (task.status === 'in_progress' && !task.progress) {
                stagnationScore += 0.2;
                stagnationIndicators.push('Marked as in-progress but no progress recorded');
            }

            // Check if deadline passed without completion
            if (task.deadline && new Date(task.deadline) < now) {
                stagnationScore += 0.3;
                stagnationIndicators.push('Deadline passed');
            }

            // Check historical patterns for this task type
            const historicalStagnation = this._checkHistoricalStagnation(task);
            if (historicalStagnation) {
                stagnationScore += 0.2;
                stagnationIndicators.push(historicalStagnation);
            }

            if (stagnationScore >= 0.3) {
                stagnantTasks.push({
                    task,
                    stagnationScore,
                    indicators: stagnationIndicators,
                    suggestions: this._getStagnationSuggestions(stagnationIndicators)
                });
            }
        }

        return stagnantTasks.sort((a, b) => b.stagnationScore - a.stagnationScore);
    }

    _checkHistoricalStagnation(task) {
        const similarTasks = this.patternStore.get('similar_task_outcomes') || [];
        const similar = similarTasks.filter(t =>
            t.category === task.category || t.type === task.type
        );

        if (similar.length >= 3) {
            const avgCompletionTime = similar.reduce((s, t) => s + t.completionTime, 0) / similar.length;
            const currentTime = (new Date() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);

            if (currentTime > avgCompletionTime * 2) {
                return `Taking ${Math.floor(currentTime / avgCompletionTime)}x longer than similar tasks`;
            }
        }

        return null;
    }

    _getStagnationSuggestions(indicators) {
        const suggestions = [];

        if (indicators.some(i => i.includes('No updates'))) {
            suggestions.push('Consider breaking this task into smaller sub-tasks');
            suggestions.push('Set a specific time block to work on this task');
        }

        if (indicators.some(i => i.includes('in-progress'))) {
            suggestions.push('Update the progress percentage to get a clearer picture');
            suggestions.push('Identify the specific blocker preventing progress');
        }

        if (indicators.some(i => i.includes('Deadline'))) {
            suggestions.push('Renegotiate the deadline if still relevant');
            suggestions.push('Prioritize this task immediately or mark as cancelled');
        }

        return suggestions;
    }
}
