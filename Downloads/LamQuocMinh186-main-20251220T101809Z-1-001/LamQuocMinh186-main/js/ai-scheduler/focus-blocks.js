// ============================================================
// FOCUS-BLOCKS.JS - Focus Time Management
// Phase 2: Smart Scheduling
// ============================================================

/**
 * Focus Blocks - Protect and optimize deep work time
 * Creates, protects, and manages focused work sessions
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class FocusBlockManager {
    constructor() {
        this.config = {
            defaultBlockDuration: 90,     // minutes (Pomodoro style)
            minBlockDuration: 45,         // minimum useful focus block
            maxBlockDuration: 180,        // maximum before break needed
            breakRatio: 0.2,              // 20% break time after focus
            protectionLevel: 'high',      // low, medium, high
            notificationMode: 'silent'    // silent, urgent_only, all
        };

        this.activeFocusBlock = null;
        this.scheduledBlocks = [];
        this.focusHistory = [];
    }

    // ============================================================
    // FOCUS BLOCK OPTIMIZATION
    // ============================================================

    /**
     * Find optimal focus blocks for the day
     * @param {Date} date - Target date
     * @param {Array} commitments - Existing commitments (meetings, etc.)
     * @returns {Array} Optimal focus block suggestions
     */
    findOptimalFocusBlocks(date = new Date(), commitments = []) {
        const energyCurve = aiEngine?.patternStore?.buildEnergyCurve() || this._getDefaultEnergyCurve();
        const focusHistory = aiEngine?.patternStore?.get('focus_quality_by_hour') || {};

        // Find high-energy windows
        const highEnergyHours = this._findHighEnergyWindows(energyCurve);

        // Remove committed time
        const availableWindows = this._subtractCommitments(highEnergyHours, commitments, date);

        // Create focus block suggestions
        const suggestions = this._createFocusBlockSuggestions(availableWindows, date, focusHistory);

        return suggestions;
    }

    _findHighEnergyWindows(energyCurve) {
        const windows = [];
        let currentWindow = null;

        for (let hour = 8; hour <= 18; hour++) {
            const hourData = energyCurve.hourly?.[hour];
            const isHighEnergy = hourData?.score >= 0.65;

            if (isHighEnergy) {
                if (!currentWindow) {
                    currentWindow = { start: hour, end: hour + 1, avgScore: hourData.score };
                } else {
                    currentWindow.end = hour + 1;
                    currentWindow.avgScore = (currentWindow.avgScore + hourData.score) / 2;
                }
            } else if (currentWindow) {
                if (currentWindow.end - currentWindow.start >= 1) {
                    windows.push(currentWindow);
                }
                currentWindow = null;
            }
        }

        if (currentWindow && currentWindow.end - currentWindow.start >= 1) {
            windows.push(currentWindow);
        }

        return windows;
    }

    _subtractCommitments(windows, commitments, date) {
        const dateStr = date.toISOString().split('T')[0];
        const dayCommitments = commitments.filter(c => {
            const cDate = new Date(c.start).toISOString().split('T')[0];
            return cDate === dateStr;
        });

        let availableWindows = [...windows];

        for (const commitment of dayCommitments) {
            const cStart = new Date(commitment.start).getHours();
            const cEnd = new Date(commitment.end).getHours();

            availableWindows = availableWindows.flatMap(window => {
                // No overlap
                if (window.end <= cStart || window.start >= cEnd) {
                    return [window];
                }

                // Split window around commitment
                const result = [];
                if (window.start < cStart) {
                    result.push({ ...window, end: cStart });
                }
                if (window.end > cEnd) {
                    result.push({ ...window, start: cEnd });
                }
                return result;
            });
        }

        // Filter out windows that are too short
        return availableWindows.filter(w =>
            (w.end - w.start) * 60 >= this.config.minBlockDuration
        );
    }

    _createFocusBlockSuggestions(windows, date, focusHistory) {
        return windows.map(window => {
            const durationMinutes = (window.end - window.start) * 60;
            const optimalDuration = Math.min(durationMinutes, this.config.maxBlockDuration);

            // Get historical focus quality for this time
            const historicalQuality = this._getHistoricalQuality(window.start, focusHistory);

            const startTime = new Date(date);
            startTime.setHours(window.start, 0, 0, 0);

            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + optimalDuration);

            return {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                durationMinutes: optimalDuration,
                energyScore: window.avgScore,
                historicalQuality,
                recommendation: this._getFocusRecommendation(window.avgScore, historicalQuality),
                suggestedTaskTypes: this._getSuggestedTaskTypes(window.avgScore),
                breakAfter: Math.round(optimalDuration * this.config.breakRatio)
            };
        });
    }

    _getHistoricalQuality(hour, focusHistory) {
        const hourData = focusHistory[hour];
        if (!hourData || hourData.length === 0) return 0.5;

        return hourData.reduce((sum, f) => sum + (f.score || 0.5), 0) / hourData.length;
    }

    _getFocusRecommendation(energyScore, historicalQuality) {
        const combined = (energyScore + historicalQuality) / 2;

        if (combined >= 0.8) return 'Excellent time for deep, complex work';
        if (combined >= 0.65) return 'Good for focused work';
        if (combined >= 0.5) return 'Suitable for moderate concentration tasks';
        return 'Consider lighter tasks during this time';
    }

    _getSuggestedTaskTypes(energyScore) {
        if (energyScore >= 0.8) {
            return ['creative', 'technical', 'strategic'];
        } else if (energyScore >= 0.65) {
            return ['technical', 'review', 'analysis'];
        } else if (energyScore >= 0.5) {
            return ['admin', 'communication', 'routine'];
        }
        return ['admin', 'email', 'filing'];
    }

    _getDefaultEnergyCurve() {
        return {
            hourly: {
                9: { score: 0.7 }, 10: { score: 0.85 }, 11: { score: 0.9 },
                12: { score: 0.5 }, 13: { score: 0.4 }, 14: { score: 0.6 },
                15: { score: 0.75 }, 16: { score: 0.7 }, 17: { score: 0.5 }
            }
        };
    }

    // ============================================================
    // FOCUS SESSION MANAGEMENT
    // ============================================================

    /**
     * Start a focus session
     * @param {Object} options - Session options
     * @returns {Object} Active session info
     */
    startFocusSession(options = {}) {
        const {
            duration = this.config.defaultBlockDuration,
            taskIds = [],
            goal = null
        } = options;

        if (this.activeFocusBlock) {
            return { error: 'A focus session is already active' };
        }

        this.activeFocusBlock = {
            id: `focus_${Date.now()}`,
            startTime: new Date().toISOString(),
            plannedDuration: duration,
            taskIds,
            goal,
            interruptions: 0,
            actualEndTime: null,
            status: 'active'
        };

        // Track event
        aiEngine?.trackEvent?.('focus_session_start', null, {
            duration,
            taskCount: taskIds.length
        });

        return {
            session: this.activeFocusBlock,
            protectionMode: this.config.protectionLevel,
            endTime: new Date(Date.now() + duration * 60 * 1000).toISOString()
        };
    }

    /**
     * End the current focus session
     * @param {Object} results - Session results
     * @returns {Object} Session summary
     */
    endFocusSession(results = {}) {
        if (!this.activeFocusBlock) {
            return { error: 'No active focus session' };
        }

        const endTime = new Date();
        const startTime = new Date(this.activeFocusBlock.startTime);
        const actualDuration = Math.round((endTime - startTime) / (1000 * 60));

        const session = {
            ...this.activeFocusBlock,
            actualEndTime: endTime.toISOString(),
            actualDuration,
            tasksCompleted: results.tasksCompleted || 0,
            interruptions: results.interruptions || this.activeFocusBlock.interruptions,
            quality: this._calculateSessionQuality(actualDuration, results, this.activeFocusBlock.plannedDuration),
            status: 'completed'
        };

        // Store in history
        this.focusHistory.push(session);
        if (this.focusHistory.length > 100) {
            this.focusHistory.shift();
        }

        // Track event
        aiEngine?.trackEvent?.('focus_session_end', null, {
            duration: actualDuration,
            tasksCompleted: results.tasksCompleted || 0,
            interruptions: session.interruptions,
            quality: session.quality
        });

        // Update user profile
        aiEngine?.userProfile?.recordFocusSession?.(actualDuration, results.tasksCompleted || 0);

        this.activeFocusBlock = null;

        return {
            session,
            suggestedBreak: Math.round(actualDuration * this.config.breakRatio)
        };
    }

    /**
     * Record an interruption during focus
     * @param {string} type - Type of interruption
     */
    recordInterruption(type = 'unknown') {
        if (!this.activeFocusBlock) return;

        this.activeFocusBlock.interruptions++;

        // Store interruption details
        if (!this.activeFocusBlock.interruptionLog) {
            this.activeFocusBlock.interruptionLog = [];
        }

        this.activeFocusBlock.interruptionLog.push({
            time: new Date().toISOString(),
            type
        });
    }

    _calculateSessionQuality(actualDuration, results, plannedDuration) {
        let quality = 0.5;

        // Duration completion (up to 0.3)
        const durationRatio = actualDuration / plannedDuration;
        if (durationRatio >= 0.9) quality += 0.3;
        else if (durationRatio >= 0.7) quality += 0.2;
        else quality += durationRatio * 0.2;

        // Task completion (up to 0.3)
        if (results.tasksCompleted >= 2) quality += 0.3;
        else if (results.tasksCompleted === 1) quality += 0.2;

        // Interruption penalty
        const interruptions = results.interruptions || 0;
        quality -= Math.min(interruptions * 0.1, 0.3);

        return Math.max(0, Math.min(1, quality));
    }

    // ============================================================
    // FOCUS PROTECTION
    // ============================================================

    /**
     * Check if a notification should be shown during focus
     * @param {Object} notification - Notification object
     * @returns {Object} Decision
     */
    shouldShowNotification(notification) {
        if (!this.activeFocusBlock) {
            return { show: true, reason: 'No active focus session' };
        }

        const { priority, type, from } = notification;

        switch (this.config.protectionLevel) {
            case 'high':
                // Only show critical from VIP contacts
                if (priority === 'critical') {
                    return { show: true, reason: 'Critical notification' };
                }
                return { show: false, reason: 'Focus protection enabled', queued: true };

            case 'medium':
                // Show high priority and above
                if (priority === 'critical' || priority === 'high') {
                    return { show: true, reason: 'High priority' };
                }
                return { show: false, reason: 'Focus protection enabled', queued: true };

            case 'low':
            default:
                return { show: true, reason: 'Low protection mode' };
        }
    }

    /**
     * Get focus session statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        const recentSessions = this.focusHistory.slice(-20);

        if (recentSessions.length === 0) {
            return { hasData: false, message: 'No focus sessions recorded yet' };
        }

        const totalMinutes = recentSessions.reduce((sum, s) => sum + s.actualDuration, 0);
        const avgDuration = totalMinutes / recentSessions.length;
        const avgQuality = recentSessions.reduce((sum, s) => sum + s.quality, 0) / recentSessions.length;
        const avgInterruptions = recentSessions.reduce((sum, s) => sum + s.interruptions, 0) / recentSessions.length;

        // Best time analysis
        const byHour = {};
        for (const session of recentSessions) {
            const hour = new Date(session.startTime).getHours();
            if (!byHour[hour]) {
                byHour[hour] = { sessions: 0, totalQuality: 0 };
            }
            byHour[hour].sessions++;
            byHour[hour].totalQuality += session.quality;
        }

        const bestHour = Object.entries(byHour)
            .map(([hour, data]) => ({ hour: parseInt(hour), avgQuality: data.totalQuality / data.sessions }))
            .sort((a, b) => b.avgQuality - a.avgQuality)[0];

        return {
            hasData: true,
            totalSessions: recentSessions.length,
            totalFocusMinutes: totalMinutes,
            averageDuration: Math.round(avgDuration),
            averageQuality: avgQuality,
            averageInterruptions: avgInterruptions,
            bestHour: bestHour?.hour,
            recommendation: this._getImprovementRecommendation(avgQuality, avgInterruptions)
        };
    }

    _getImprovementRecommendation(avgQuality, avgInterruptions) {
        if (avgInterruptions > 2) {
            return 'Consider silencing notifications and closing unnecessary tabs';
        }
        if (avgQuality < 0.5) {
            return 'Try shorter focus blocks (45-60 min) to build momentum';
        }
        if (avgQuality >= 0.7) {
            return 'Great focus! Consider extending your blocks to 90 minutes';
        }
        return 'Keep practicing focused work sessions';
    }

    // ============================================================
    // CONFIGURATION
    // ============================================================

    /**
     * Update focus block configuration
     * @param {Object} newConfig
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
    }

    /**
     * Get current active session
     * @returns {Object|null}
     */
    getActiveSession() {
        return this.activeFocusBlock;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const focusBlockManager = new FocusBlockManager();

export function initFocusBlocks() {
    console.log('🎯 [Focus Blocks] Initialized');
    return focusBlockManager;
}
