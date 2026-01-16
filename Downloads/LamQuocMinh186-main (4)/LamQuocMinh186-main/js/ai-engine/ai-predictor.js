// ============================================================
// AI-PREDICTOR.JS - Task Prediction Engine
// Phase 1: Foundation & Core Intelligence
// ============================================================

/**
 * Task Predictor - Predicts completion times, on-time probability, optimal start times
 */

export class TaskPredictor {
    constructor(userProfile, patternStore) {
        this.userProfile = userProfile;
        this.patternStore = patternStore;

        // Prediction history for accuracy tracking
        this.predictions = [];
        this.accuracyTracker = {
            totalPredictions: 0,
            accuratePredictions: 0
        };
    }

    // ============================================================
    // COMPLETION TIME PREDICTION
    // ============================================================

    /**
     * Predict how long a task will take to complete
     * @param {Object} task - Task object
     * @returns {Object} Prediction with estimated time and confidence
     */
    predictCompletionTime(task) {
        const factors = this._analyzeTaskFactors(task);
        const historicalData = this._getHistoricalData(task);
        const userPatterns = this._getUserPatterns();

        // Base estimate from task properties
        let baseEstimate = task.estimatedTime || this._estimateFromDescription(task);

        // Apply adjustments based on factors
        let adjustment = 1.0;
        let confidenceFactors = [];

        // Factor 1: Historical accuracy
        if (historicalData.count >= 3) {
            const avgActual = historicalData.avgActualTime;
            const avgEstimated = historicalData.avgEstimatedTime;
            if (avgEstimated > 0) {
                adjustment *= avgActual / avgEstimated;
                confidenceFactors.push({ factor: 'historical_accuracy', value: 0.3 });
            }
        }

        // Factor 2: Task complexity
        if (factors.complexity === 'high') {
            adjustment *= 1.3; // Add 30% buffer
            confidenceFactors.push({ factor: 'high_complexity', value: -0.1 });
        } else if (factors.complexity === 'low') {
            adjustment *= 0.9;
            confidenceFactors.push({ factor: 'low_complexity', value: 0.1 });
        }

        // Factor 3: User's current workload
        if (userPatterns.currentWorkload === 'high') {
            adjustment *= 1.2;
            confidenceFactors.push({ factor: 'high_workload', value: -0.1 });
        }

        // Factor 4: Time of day suitability
        const energyCurve = this.patternStore.get('energy_curve');
        if (energyCurve && factors.taskType) {
            const suitability = this._calculateTimeSuitability(factors.taskType, energyCurve);
            if (suitability < 0.5) {
                adjustment *= 1.15;
                confidenceFactors.push({ factor: 'suboptimal_time', value: -0.05 });
            }
        }

        // Factor 5: Dependencies
        if (task.dependencies && task.dependencies.length > 0) {
            adjustment *= 1 + (task.dependencies.length * 0.05);
            confidenceFactors.push({ factor: 'has_dependencies', value: -0.05 * task.dependencies.length });
        }

        // Calculate final estimate
        const predictedTime = Math.round(baseEstimate * adjustment);

        // Calculate confidence
        let confidence = 0.5; // Base confidence
        confidence += confidenceFactors.reduce((sum, f) => sum + f.value, 0);
        confidence = Math.max(0.1, Math.min(0.95, confidence));

        // Add historical accuracy boost
        if (historicalData.count >= 5) {
            confidence += 0.2;
        }

        return {
            estimatedMinutes: predictedTime,
            estimatedHours: Math.round(predictedTime / 60 * 10) / 10,
            confidence: Math.min(confidence, 0.95),
            factors: confidenceFactors,
            range: {
                min: Math.round(predictedTime * 0.7),
                max: Math.round(predictedTime * 1.5)
            },
            basedOn: {
                historicalTasks: historicalData.count,
                adjustment: adjustment.toFixed(2)
            }
        };
    }

    _analyzeTaskFactors(task) {
        const title = (task.title || '').toLowerCase();
        const description = (task.description || '').toLowerCase();
        const text = title + ' ' + description;

        // Complexity indicators
        const complexityIndicators = {
            high: ['complex', 'difficult', 'challenging', 'research', 'design', 'architecture', 'strategic'],
            low: ['simple', 'quick', 'easy', 'update', 'minor', 'small']
        };

        let complexity = 'medium';
        for (const [level, words] of Object.entries(complexityIndicators)) {
            if (words.some(w => text.includes(w))) {
                complexity = level;
                break;
            }
        }

        // Task type detection
        const taskTypes = {
            creative: ['design', 'write', 'create', 'draft', 'compose'],
            technical: ['code', 'develop', 'fix', 'debug', 'implement'],
            admin: ['email', 'call', 'schedule', 'organize', 'file'],
            review: ['review', 'check', 'verify', 'approve', 'assess']
        };

        let taskType = 'general';
        for (const [type, words] of Object.entries(taskTypes)) {
            if (words.some(w => text.includes(w))) {
                taskType = type;
                break;
            }
        }

        return { complexity, taskType };
    }

    _getHistoricalData(task) {
        const similarTasks = this.patternStore.get('completed_tasks') || [];

        // Filter similar tasks
        const similar = similarTasks.filter(t => {
            if (task.category && t.category === task.category) return true;
            if (task.project && t.project === task.project) return true;
            return false;
        });

        if (similar.length === 0) {
            return { count: 0, avgActualTime: 0, avgEstimatedTime: 0 };
        }

        const avgActual = similar.reduce((s, t) => s + (t.actualTime || 0), 0) / similar.length;
        const avgEstimated = similar.reduce((s, t) => s + (t.estimatedTime || 0), 0) / similar.length;

        return {
            count: similar.length,
            avgActualTime: avgActual,
            avgEstimatedTime: avgEstimated
        };
    }

    _getUserPatterns() {
        const profile = this.userProfile?.getData() || {};

        return {
            currentWorkload: profile.currentWorkload || 'medium',
            averageProductivity: profile.averageProductivity || 0.7,
            estimationBias: profile.estimationBias || 'none'
        };
    }

    _estimateFromDescription(task) {
        const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
        const wordCount = text.split(/\s+/).length;

        // Base: 30 minutes
        let estimate = 30;

        // Adjust by keywords
        if (text.includes('quick') || text.includes('small')) estimate = 15;
        if (text.includes('large') || text.includes('big')) estimate = 120;
        if (text.includes('research') || text.includes('analyze')) estimate = 90;
        if (text.includes('meeting') || text.includes('call')) estimate = 60;

        // Adjust by description length
        if (wordCount > 50) estimate *= 1.3;
        if (wordCount > 100) estimate *= 1.5;

        return Math.round(estimate);
    }

    _calculateTimeSuitability(taskType, energyCurve) {
        const now = new Date();
        const currentHour = now.getHours();
        const hourData = energyCurve.hourly?.[currentHour];

        if (!hourData) return 0.5;

        // Match task type with energy level
        const optimalMatch = {
            creative: 'peak',
            technical: 'high',
            admin: 'medium',
            review: 'medium'
        };

        const optimal = optimalMatch[taskType] || 'medium';
        const current = hourData.level;

        if (current === optimal) return 1.0;
        if (current === 'peak' || current === 'high') return 0.8;
        if (current === 'medium') return 0.6;
        return 0.4;
    }

    // ============================================================
    // ON-TIME COMPLETION PREDICTION
    // ============================================================

    /**
     * Predict probability of completing task on time
     * @param {Object} task - Task object
     * @returns {Object} Prediction with probability and risk factors
     */
    predictOnTimeCompletion(task) {
        if (!task.deadline) {
            return { probability: null, reason: 'No deadline set' };
        }

        const deadline = new Date(task.deadline);
        const now = new Date();
        const timeRemaining = (deadline - now) / (1000 * 60); // minutes

        // Get predicted completion time
        const prediction = this.predictCompletionTime(task);
        const estimatedTime = prediction.estimatedMinutes;

        // Calculate base probability
        let probability = 0.5;
        const riskFactors = [];

        // Factor 1: Time remaining vs estimated
        const timeRatio = timeRemaining / estimatedTime;
        if (timeRatio >= 3) {
            probability += 0.3;
        } else if (timeRatio >= 2) {
            probability += 0.2;
        } else if (timeRatio >= 1.5) {
            probability += 0.1;
        } else if (timeRatio >= 1) {
            probability += 0.05;
        } else if (timeRatio < 1) {
            probability -= 0.2;
            riskFactors.push('Not enough time based on estimate');
        }

        // Factor 2: Task progress
        if (task.progress) {
            const remainingWork = (100 - task.progress) / 100;
            const remainingTimeNeeded = estimatedTime * remainingWork;
            if (remainingTimeNeeded < timeRemaining) {
                probability += 0.15;
            } else {
                riskFactors.push('Current progress suggests risk');
            }
        }

        // Factor 3: Dependencies
        if (task.dependencies?.length > 0) {
            const blockedDeps = task.dependencies.filter(d => !d.completed);
            if (blockedDeps.length > 0) {
                probability -= 0.1 * blockedDeps.length;
                riskFactors.push(`${blockedDeps.length} blocking dependencies`);
            }
        }

        // Factor 4: User's on-time history
        const onTimeRate = this.userProfile?.getOnTimeRate() || 0.7;
        probability = probability * 0.7 + onTimeRate * 0.3;

        // Factor 5: Workload
        const workload = this.userProfile?.getCurrentWorkload() || 'medium';
        if (workload === 'high') {
            probability -= 0.1;
            riskFactors.push('High current workload');
        }

        probability = Math.max(0.05, Math.min(0.95, probability));

        return {
            probability,
            status: probability >= 0.7 ? 'likely' : probability >= 0.4 ? 'at_risk' : 'unlikely',
            riskFactors,
            estimatedCompletion: this._calculateEstimatedCompletion(task, prediction),
            bufferTime: timeRemaining - estimatedTime,
            recommendation: this._getOnTimeRecommendation(probability, riskFactors)
        };
    }

    _calculateEstimatedCompletion(task, prediction) {
        const now = new Date();

        // Account for working hours
        const workingMinutes = this._getWorkingMinutesRemaining(now, prediction.estimatedMinutes);

        const estimated = new Date(now.getTime() + workingMinutes * 60 * 1000);
        return estimated;
    }

    _getWorkingMinutesRemaining(startTime, minutes) {
        // Simplified: Assume 8 working hours per day, 9am-5pm
        const workStart = 9;
        const workEnd = 17;
        const workingHoursPerDay = workEnd - workStart;

        let remaining = minutes;
        let current = new Date(startTime);

        // If after work hours, start next day
        if (current.getHours() >= workEnd) {
            current.setDate(current.getDate() + 1);
            current.setHours(workStart, 0, 0, 0);
        } else if (current.getHours() < workStart) {
            current.setHours(workStart, 0, 0, 0);
        }

        let totalMinutes = 0;
        while (remaining > 0) {
            const todayRemaining = (workEnd - current.getHours()) * 60 - current.getMinutes();
            if (remaining <= todayRemaining) {
                totalMinutes += remaining;
                remaining = 0;
            } else {
                totalMinutes += todayRemaining;
                remaining -= todayRemaining;
                current.setDate(current.getDate() + 1);
                current.setHours(workStart, 0, 0, 0);

                // Skip weekends
                while (current.getDay() === 0 || current.getDay() === 6) {
                    current.setDate(current.getDate() + 1);
                }
            }
        }

        return totalMinutes;
    }

    _getOnTimeRecommendation(probability, riskFactors) {
        if (probability >= 0.8) {
            return 'On track - maintain current pace';
        } else if (probability >= 0.6) {
            return 'Monitor closely - consider reducing scope if needed';
        } else if (probability >= 0.4) {
            return 'At risk - take immediate action to reduce blockers';
        } else {
            return 'Unlikely to complete on time - renegotiate deadline or scope';
        }
    }

    // ============================================================
    // OPTIMAL START TIME
    // ============================================================

    /**
     * Predict optimal start time for a task
     * @param {Object} task - Task object
     * @returns {Object} Suggested start time and reasoning
     */
    predictOptimalStartTime(task) {
        const prediction = this.predictCompletionTime(task);
        const factors = this._analyzeTaskFactors(task);
        const energyCurve = this.patternStore.get('energy_curve') || {};

        // Get best hours for this task type
        const optimalHours = this._getOptimalHoursForTaskType(factors.taskType, energyCurve);

        // If has deadline, work backwards
        let suggestedStart = new Date();
        let reasoning = [];

        if (task.deadline) {
            const deadline = new Date(task.deadline);
            const bufferMultiplier = 1.3; // 30% buffer
            const requiredMinutes = prediction.estimatedMinutes * bufferMultiplier;

            // Calculate latest start time
            const latestStart = new Date(deadline.getTime() - requiredMinutes * 60 * 1000);

            // Find optimal hour before latest start
            suggestedStart = this._findBestSlotBefore(latestStart, optimalHours, prediction.estimatedMinutes);
            reasoning.push(`Deadline: ${deadline.toLocaleDateString()}`);
            reasoning.push(`Latest start: ${latestStart.toLocaleString()}`);
        } else {
            // No deadline - suggest next optimal slot
            suggestedStart = this._findNextOptimalSlot(optimalHours, prediction.estimatedMinutes);
            reasoning.push('No deadline - scheduled for next optimal time slot');
        }

        reasoning.push(`Task type: ${factors.taskType}`);
        reasoning.push(`Best productivity hours: ${optimalHours.join(', ')}:00`);

        return {
            suggestedStart,
            suggestedEnd: new Date(suggestedStart.getTime() + prediction.estimatedMinutes * 60 * 1000),
            optimalHours,
            reasoning,
            confidence: prediction.confidence * 0.9,
            alternatives: this._getAlternativeSlots(suggestedStart, optimalHours, prediction.estimatedMinutes)
        };
    }

    _getOptimalHoursForTaskType(taskType, energyCurve) {
        const hourly = energyCurve.hourly || {};

        // Map task types to required energy levels
        const requiredLevel = {
            creative: ['peak', 'high'],
            technical: ['peak', 'high'],
            admin: ['medium', 'low'],
            review: ['high', 'medium'],
            general: ['high', 'medium']
        };

        const levels = requiredLevel[taskType] || ['high', 'medium'];

        // Find hours matching these levels
        const optimalHours = [];
        for (let hour = 8; hour <= 20; hour++) {
            if (hourly[hour] && levels.includes(hourly[hour].level)) {
                optimalHours.push(hour);
            }
        }

        // Default to common productive hours if no data
        if (optimalHours.length === 0) {
            return taskType === 'creative' || taskType === 'technical'
                ? [9, 10, 11] // Morning for complex work
                : [14, 15, 16]; // Afternoon for routine
        }

        return optimalHours;
    }

    _findBestSlotBefore(deadline, optimalHours, duration) {
        const now = new Date();
        let candidate = new Date(deadline);

        // Work backwards day by day
        for (let daysBack = 0; daysBack < 14; daysBack++) {
            const testDate = new Date(deadline);
            testDate.setDate(testDate.getDate() - daysBack);

            // Skip weekends
            if (testDate.getDay() === 0 || testDate.getDay() === 6) continue;

            // Skip if in the past
            if (testDate < now) break;

            // Find optimal hour on this day
            for (const hour of optimalHours.sort((a, b) => a - b)) {
                testDate.setHours(hour, 0, 0, 0);
                const endTime = new Date(testDate.getTime() + duration * 60 * 1000);

                // Check if fits before deadline and not in past
                if (endTime <= deadline && testDate >= now) {
                    return testDate;
                }
            }
        }

        // Fallback to ASAP
        return now;
    }

    _findNextOptimalSlot(optimalHours, duration) {
        const now = new Date();

        // Try today first
        for (const hour of optimalHours) {
            if (hour > now.getHours()) {
                const slot = new Date(now);
                slot.setHours(hour, 0, 0, 0);
                return slot;
            }
        }

        // Try next workday
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Skip weekends
        while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
            tomorrow.setDate(tomorrow.getDate() + 1);
        }

        tomorrow.setHours(optimalHours[0] || 9, 0, 0, 0);
        return tomorrow;
    }

    _getAlternativeSlots(primary, optimalHours, duration) {
        const alternatives = [];
        const now = new Date();

        // Generate 3 alternative slots
        for (let i = 0; i < 7 && alternatives.length < 3; i++) {
            const day = new Date(primary);
            day.setDate(day.getDate() + i);

            if (day.getDay() === 0 || day.getDay() === 6) continue;

            for (const hour of optimalHours) {
                const slot = new Date(day);
                slot.setHours(hour, 0, 0, 0);

                if (slot > now && slot.getTime() !== primary.getTime()) {
                    alternatives.push(slot);
                    if (alternatives.length >= 3) break;
                }
            }
        }

        return alternatives;
    }

    // ============================================================
    // EFFORT DRIFT ANALYSIS
    // ============================================================

    /**
     * Analyze estimation accuracy over time
     * @returns {Object} Analysis of estimation drift
     */
    getEffortDriftAnalysis() {
        const completedTasks = this.patternStore.get('completed_tasks') || [];

        if (completedTasks.length < 5) {
            return {
                hasEnoughData: false,
                message: 'Need at least 5 completed tasks for analysis'
            };
        }

        // Calculate estimation accuracy
        const taskData = completedTasks
            .filter(t => t.estimatedTime && t.actualTime)
            .map(t => ({
                estimated: t.estimatedTime,
                actual: t.actualTime,
                ratio: t.actualTime / t.estimatedTime,
                date: t.completedAt
            }));

        if (taskData.length < 5) {
            return {
                hasEnoughData: false,
                message: 'Need more tasks with both estimated and actual times'
            };
        }

        // Calculate metrics
        const avgRatio = taskData.reduce((s, t) => s + t.ratio, 0) / taskData.length;
        const bias = avgRatio > 1.1 ? 'underestimate' : avgRatio < 0.9 ? 'overestimate' : 'accurate';

        // Calculate trend (are estimates improving?)
        const recent = taskData.slice(-10);
        const older = taskData.slice(0, -10);

        const recentAvg = recent.reduce((s, t) => s + Math.abs(t.ratio - 1), 0) / recent.length;
        const olderAvg = older.length > 0
            ? older.reduce((s, t) => s + Math.abs(t.ratio - 1), 0) / older.length
            : recentAvg;

        const improving = recentAvg < olderAvg;

        return {
            hasEnoughData: true,
            averageRatio: avgRatio,
            bias,
            improving,
            accuracy: 1 - Math.abs(avgRatio - 1),
            recentAccuracy: 1 - recentAvg,
            recommendations: this._getEstimationRecommendations(bias, avgRatio),
            byCategory: this._getEstimationByCategory(taskData)
        };
    }

    _getEstimationRecommendations(bias, ratio) {
        const recommendations = [];

        if (bias === 'underestimate') {
            recommendations.push(`Add ${Math.round((ratio - 1) * 100)}% buffer to your estimates`);
            recommendations.push('Break down complex tasks into smaller pieces');
            recommendations.push('Consider hidden tasks like setup and review time');
        } else if (bias === 'overestimate') {
            recommendations.push(`Reduce estimates by ${Math.round((1 - ratio) * 100)}%`);
            recommendations.push('You may be more efficient than you think');
        } else {
            recommendations.push('Your estimates are generally accurate!');
            recommendations.push('Continue using your current estimation method');
        }

        return recommendations;
    }

    _getEstimationByCategory(taskData) {
        const byCategory = {};

        for (const task of taskData) {
            const category = task.category || 'uncategorized';
            if (!byCategory[category]) {
                byCategory[category] = { total: 0, sumRatio: 0 };
            }
            byCategory[category].total++;
            byCategory[category].sumRatio += task.ratio;
        }

        const result = {};
        for (const [category, data] of Object.entries(byCategory)) {
            result[category] = {
                count: data.total,
                avgRatio: data.sumRatio / data.total,
                bias: data.sumRatio / data.total > 1.1 ? 'underestimate' : 'accurate'
            };
        }

        return result;
    }

    // ============================================================
    // ACCURACY TRACKING
    // ============================================================

    /**
     * Get overall prediction accuracy
     * @returns {number} Accuracy percentage
     */
    getAccuracy() {
        if (this.accuracyTracker.totalPredictions === 0) return 0;
        return this.accuracyTracker.accuratePredictions / this.accuracyTracker.totalPredictions;
    }

    /**
     * Record prediction outcome for learning
     * @param {string} predictionId - ID of prediction
     * @param {Object} actual - Actual outcome
     */
    recordOutcome(predictionId, actual) {
        const prediction = this.predictions.find(p => p.id === predictionId);
        if (!prediction) return;

        // Calculate if prediction was accurate (within 20%)
        const ratio = actual.time / prediction.estimated;
        const accurate = ratio >= 0.8 && ratio <= 1.2;

        this.accuracyTracker.totalPredictions++;
        if (accurate) this.accuracyTracker.accuratePredictions++;

        // Store for learning
        this.patternStore.addPattern('prediction_outcomes', {
            predicted: prediction.estimated,
            actual: actual.time,
            ratio,
            accurate,
            taskType: prediction.taskType,
            date: new Date()
        });
    }
}
