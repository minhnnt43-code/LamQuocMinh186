// ============================================================
// ADVANCED-AI.JS - Advanced AI Capabilities
// Phase 9: Advanced AI Features
// ============================================================

/**
 * Advanced AI - Machine learning and predictive capabilities
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class AdvancedAI {
    constructor() {
        this.models = {
            estimation: null,
            priority: null,
            completion: null
        };
        this.trainingData = [];
    }

    // ============================================================
    // LEARNING FROM BEHAVIOR
    // ============================================================

    /**
     * Learn from task completion
     * @param {Object} task - Completed task
     */
    learnFromCompletion(task) {
        const features = this._extractFeatures(task);
        const outcome = {
            actualTime: task.actualTime,
            wasOnTime: task.deadline ? new Date(task.completedAt) <= new Date(task.deadline) : true,
            quality: task.quality || 0.8,
            difficulty: this._assessDifficulty(task)
        };

        this.trainingData.push({ features, outcome, timestamp: Date.now() });

        // Keep last 500 samples
        if (this.trainingData.length > 500) {
            this.trainingData.shift();
        }

        // Update models periodically
        if (this.trainingData.length % 20 === 0) {
            this._updateModels();
        }
    }

    _extractFeatures(task) {
        const text = `${task.title} ${task.description || ''}`.toLowerCase();

        return {
            hasComplexWords: ['complex', 'design', 'architect', 'research'].some(w => text.includes(w)),
            hasSimpleWords: ['simple', 'quick', 'update', 'minor'].some(w => text.includes(w)),
            wordCount: text.split(/\s+/).length,
            estimatedTime: task.estimatedTime || 60,
            priority: task.priority || 'medium',
            hasDeadline: !!task.deadline,
            hasDependencies: (task.dependencies || []).length > 0,
            hour: new Date(task.startedAt || task.createdAt).getHours(),
            dayOfWeek: new Date(task.startedAt || task.createdAt).getDay()
        };
    }

    _assessDifficulty(task) {
        if (!task.estimatedTime || !task.actualTime) return 0.5;
        const ratio = task.actualTime / task.estimatedTime;
        if (ratio > 1.5) return 0.8; // Harder than expected
        if (ratio < 0.7) return 0.3; // Easier than expected
        return 0.5;
    }

    _updateModels() {
        // Simplified model update - in production would use ML
        this._updateEstimationModel();
    }

    _updateEstimationModel() {
        if (this.trainingData.length < 10) return;

        // Calculate average estimation accuracy by complexity
        const byComplexity = { simple: [], complex: [] };

        for (const sample of this.trainingData) {
            if (sample.features.hasSimpleWords) {
                byComplexity.simple.push(sample.outcome.actualTime / sample.features.estimatedTime);
            }
            if (sample.features.hasComplexWords) {
                byComplexity.complex.push(sample.outcome.actualTime / sample.features.estimatedTime);
            }
        }

        this.models.estimation = {
            simpleMultiplier: this._average(byComplexity.simple) || 1,
            complexMultiplier: this._average(byComplexity.complex) || 1.3,
            updatedAt: new Date().toISOString()
        };
    }

    _average(arr) {
        if (arr.length === 0) return null;
        return arr.reduce((a, b) => a + b) / arr.length;
    }

    // ============================================================
    // PREDICTIONS
    // ============================================================

    /**
     * Predict task completion time
     * @param {Object} task - Task to predict
     * @returns {Object} Prediction
     */
    predictCompletionTime(task) {
        const features = this._extractFeatures(task);
        let prediction = features.estimatedTime;

        if (this.models.estimation) {
            if (features.hasComplexWords) {
                prediction *= this.models.estimation.complexMultiplier;
            } else if (features.hasSimpleWords) {
                prediction *= this.models.estimation.simpleMultiplier;
            }
        }

        // Time of day adjustment
        const productivityByHour = { 9: 1.2, 10: 1.3, 11: 1.2, 14: 0.9, 15: 0.95, 16: 1.0 };
        const hourFactor = productivityByHour[features.hour] || 1;
        prediction /= hourFactor;

        return {
            estimated: task.estimatedTime,
            predicted: Math.round(prediction),
            confidence: this.trainingData.length > 50 ? 'high' : this.trainingData.length > 20 ? 'medium' : 'low',
            factors: this._explainPrediction(features, prediction)
        };
    }

    _explainPrediction(features, prediction) {
        const factors = [];
        if (features.hasComplexWords) factors.push('Complex task type');
        if (features.hasSimpleWords) factors.push('Simple task type');
        if (features.hasDependencies) factors.push('Has dependencies');
        return factors;
    }

    /**
     * Predict on-time probability
     * @param {Object} task - Task to predict
     * @returns {Object} Probability
     */
    predictOnTimeProbability(task) {
        if (!task.deadline) return { probability: 1, reason: 'No deadline' };

        const completionPrediction = this.predictCompletionTime(task);
        const now = Date.now();
        const deadline = new Date(task.deadline).getTime();
        const availableTime = (deadline - now) / (1000 * 60); // minutes

        const buffer = availableTime - completionPrediction.predicted;
        let probability = 0.5;

        if (buffer > completionPrediction.predicted * 0.5) probability = 0.9;
        else if (buffer > 0) probability = 0.7;
        else if (buffer > -completionPrediction.predicted * 0.2) probability = 0.4;
        else probability = 0.2;

        return {
            probability,
            buffer: Math.round(buffer),
            recommendation: probability < 0.5 ? 'Start immediately or renegotiate deadline' : 'On track'
        };
    }

    // ============================================================
    // ANOMALY DETECTION
    // ============================================================

    /**
     * Detect anomalies in behavior
     * @param {Array} recentTasks - Recent tasks
     * @returns {Array} Anomalies
     */
    detectAnomalies(recentTasks) {
        const anomalies = [];

        // Get baseline statistics
        const allRatios = this.trainingData.map(d =>
            d.outcome.actualTime / d.features.estimatedTime
        ).filter(r => !isNaN(r));

        if (allRatios.length < 10) return anomalies;

        const avg = this._average(allRatios);
        const stdDev = Math.sqrt(
            allRatios.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / allRatios.length
        );

        // Check recent tasks
        for (const task of recentTasks) {
            if (!task.estimatedTime || !task.actualTime) continue;

            const ratio = task.actualTime / task.estimatedTime;
            const zscore = Math.abs(ratio - avg) / stdDev;

            if (zscore > 2) {
                anomalies.push({
                    taskId: task.id,
                    title: task.title,
                    expected: Math.round(task.estimatedTime * avg),
                    actual: task.actualTime,
                    severity: zscore > 3 ? 'high' : 'medium',
                    type: ratio > avg ? 'took_longer' : 'finished_early',
                    suggestion: ratio > avg
                        ? 'This type of task may need larger estimates'
                        : 'You may be overestimating this task type'
                });
            }
        }

        return anomalies;
    }

    // ============================================================
    // NATURAL LANGUAGE UNDERSTANDING
    // ============================================================

    /**
     * Parse natural language task input
     * @param {string} text - Natural language input
     * @returns {Object} Parsed task
     */
    parseNaturalLanguage(text) {
        const parsed = {
            title: text,
            deadline: null,
            priority: 'medium',
            estimatedTime: 60,
            tags: []
        };

        // Extract deadline
        const deadlinePatterns = [
            { regex: /by (today|eod)/i, value: this._getToday() },
            { regex: /by (tomorrow|eob tomorrow)/i, value: this._getTomorrow() },
            { regex: /by (friday|monday|tuesday|wednesday|thursday)/i, handler: (m) => this._getNextDay(m[1]) },
            { regex: /due (\d{1,2}\/\d{1,2})/i, handler: (m) => this._parseDate(m[1]) }
        ];

        for (const pattern of deadlinePatterns) {
            const match = text.match(pattern.regex);
            if (match) {
                parsed.deadline = pattern.value || pattern.handler(match);
                parsed.title = text.replace(pattern.regex, '').trim();
            }
        }

        // Extract priority
        if (/urgent|asap|critical/i.test(text)) {
            parsed.priority = 'critical';
            parsed.title = text.replace(/urgent|asap|critical/gi, '').trim();
        } else if (/important|high priority/i.test(text)) {
            parsed.priority = 'high';
        }

        // Extract time estimate
        const timeMatch = text.match(/(\d+)\s*(min|hour|h|m)/i);
        if (timeMatch) {
            const amount = parseInt(timeMatch[1]);
            parsed.estimatedTime = timeMatch[2].startsWith('h') ? amount * 60 : amount;
        }

        // Extract tags
        const tagMatches = text.match(/#(\w+)/g);
        if (tagMatches) {
            parsed.tags = tagMatches.map(t => t.slice(1));
        }

        return parsed;
    }

    _getToday() {
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        return d.toISOString();
    }

    _getTomorrow() {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(18, 0, 0, 0);
        return d.toISOString();
    }

    _getNextDay(dayName) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayName.toLowerCase());
        const today = new Date().getDay();
        let daysUntil = targetDay - today;
        if (daysUntil <= 0) daysUntil += 7;

        const d = new Date();
        d.setDate(d.getDate() + daysUntil);
        d.setHours(18, 0, 0, 0);
        return d.toISOString();
    }

    _parseDate(dateStr) {
        const [month, day] = dateStr.split('/').map(Number);
        const d = new Date();
        d.setMonth(month - 1, day);
        d.setHours(18, 0, 0, 0);
        return d.toISOString();
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const advancedAI = new AdvancedAI();
export function initAdvancedAI() {
    console.log('🧠 [Advanced AI] Initialized');
    return advancedAI;
}
