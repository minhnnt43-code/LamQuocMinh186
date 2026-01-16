// ============================================================
// SMART-SCHEDULER.JS - Intelligent Task Scheduling Engine
// Phase 2: Smart Scheduling
// ============================================================

/**
 * Smart Scheduler - AI-powered task scheduling
 * Features: Optimal scheduling, buffer time, parallel task detection
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class SmartScheduler {
    constructor() {
        this.scheduleCache = new Map();

        // Scheduling configuration
        this.config = {
            workDayStart: 9,          // 9 AM
            workDayEnd: 17,           // 5 PM
            defaultBreakDuration: 15, // minutes
            minTaskDuration: 15,      // minimum slot size
            bufferMultiplier: 1.2,    // 20% buffer
            maxDailyTasks: 12,
            focusBlockMinDuration: 90 // minutes
        };

        // Schedule state
        this.currentSchedule = [];
        this.committedBlocks = []; // meetings, etc.
    }

    // ============================================================
    // INTELLIGENT SCHEDULING
    // ============================================================

    /**
     * Generate optimal schedule for tasks
     * @param {Array} tasks - Tasks to schedule
     * @param {Object} options - Scheduling options
     * @returns {Object} Optimized schedule
     */
    generateSchedule(tasks, options = {}) {
        const {
            startDate = new Date(),
            daysAhead = 5,
            includeCommitted = true,
            prioritizeDeadlines = true
        } = options;

        // Get user's energy curve
        const energyCurve = aiEngine?.patternStore?.buildEnergyCurve() || this._getDefaultEnergyCurve();

        // Filter and prepare tasks
        const schedulableTasks = this._prepareTasksForScheduling(tasks);

        // Sort by intelligent priority
        const sortedTasks = this._sortBySchedulingPriority(schedulableTasks, prioritizeDeadlines);

        // Generate schedule
        const schedule = [];
        const taskSlots = new Map(); // taskId -> scheduled slot

        for (let day = 0; day < daysAhead; day++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + day);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const daySchedule = this._scheduleDayOptimally(
                date,
                sortedTasks.filter(t => !taskSlots.has(t.id)),
                energyCurve,
                includeCommitted ? this._getCommittedBlocksForDay(date) : []
            );

            // Record scheduled tasks
            daySchedule.slots.forEach(slot => {
                if (slot.taskId) {
                    taskSlots.set(slot.taskId, slot);
                }
            });

            schedule.push(daySchedule);
        }

        return {
            schedule,
            scheduledCount: taskSlots.size,
            unscheduledTasks: sortedTasks.filter(t => !taskSlots.has(t.id)),
            recommendations: this._getScheduleRecommendations(schedule, sortedTasks)
        };
    }

    _prepareTasksForScheduling(tasks) {
        return tasks
            .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
            .map(t => ({
                ...t,
                estimatedMinutes: t.estimatedTime || this._estimateTaskDuration(t),
                complexity: t.getComplexity?.() || this._getComplexity(t),
                taskType: t.getTaskType?.() || 'general'
            }));
    }

    _estimateTaskDuration(task) {
        // Use AI prediction if available
        const prediction = aiEngine?.predictCompletionTime?.(task);
        if (prediction?.estimatedMinutes) {
            return prediction.estimatedMinutes;
        }

        // Fallback estimation
        const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
        if (text.includes('quick') || text.includes('small')) return 15;
        if (text.includes('meeting') || text.includes('call')) return 60;
        if (text.includes('research') || text.includes('design')) return 120;
        return 30; // default
    }

    _getComplexity(task) {
        const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
        if (['complex', 'difficult', 'research', 'design'].some(w => text.includes(w))) return 'high';
        if (['simple', 'quick', 'easy', 'minor'].some(w => text.includes(w))) return 'low';
        return 'medium';
    }

    _sortBySchedulingPriority(tasks, prioritizeDeadlines) {
        return tasks.sort((a, b) => {
            // First: Overdue tasks
            const aOverdue = a.deadline && new Date(a.deadline) < new Date();
            const bOverdue = b.deadline && new Date(b.deadline) < new Date();
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;

            // Second: Deadline proximity (if enabled)
            if (prioritizeDeadlines && a.deadline && b.deadline) {
                return new Date(a.deadline) - new Date(b.deadline);
            }

            // Third: Priority level
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
            if (priorityDiff !== 0) return priorityDiff;

            // Fourth: AI priority if available
            return (b.aiPriority?.score || 0) - (a.aiPriority?.score || 0);
        });
    }

    _scheduleDayOptimally(date, tasks, energyCurve, committedBlocks) {
        const daySchedule = {
            date: date.toISOString().split('T')[0],
            slots: [],
            totalWorkMinutes: 0,
            focusBlocks: []
        };

        // Create available time slots
        const availableSlots = this._getAvailableSlots(date, committedBlocks);

        // Match tasks to optimal time slots
        for (const task of tasks) {
            if (daySchedule.totalWorkMinutes >= (this.config.workDayEnd - this.config.workDayStart) * 60) {
                break; // Day is full
            }

            const optimalSlot = this._findOptimalSlot(task, availableSlots, energyCurve);

            if (optimalSlot) {
                const scheduledSlot = this._createScheduledSlot(task, optimalSlot, date);
                daySchedule.slots.push(scheduledSlot);
                daySchedule.totalWorkMinutes += scheduledSlot.duration;

                // Remove used time from available slots
                this._consumeSlotTime(availableSlots, optimalSlot, scheduledSlot.duration);
            }
        }

        // Identify focus blocks
        daySchedule.focusBlocks = this._identifyFocusBlocks(daySchedule.slots);

        return daySchedule;
    }

    _getAvailableSlots(date, committedBlocks) {
        const slots = [];
        let currentHour = this.config.workDayStart;

        // Sort committed blocks by start time
        const sortedBlocks = [...committedBlocks].sort((a, b) => a.startHour - b.startHour);

        for (const block of sortedBlocks) {
            if (currentHour < block.startHour) {
                slots.push({
                    startHour: currentHour,
                    endHour: block.startHour,
                    minutes: (block.startHour - currentHour) * 60,
                    type: 'available'
                });
            }
            currentHour = block.endHour;
        }

        // Add remaining time after last committed block
        if (currentHour < this.config.workDayEnd) {
            slots.push({
                startHour: currentHour,
                endHour: this.config.workDayEnd,
                minutes: (this.config.workDayEnd - currentHour) * 60,
                type: 'available'
            });
        }

        return slots;
    }

    _findOptimalSlot(task, availableSlots, energyCurve) {
        const duration = Math.ceil(task.estimatedMinutes * this.config.bufferMultiplier);

        // Filter slots that can fit the task
        const fittingSlots = availableSlots.filter(s => s.minutes >= duration);

        if (fittingSlots.length === 0) return null;

        // Score each slot based on energy curve match
        const scoredSlots = fittingSlots.map(slot => {
            const midHour = Math.floor((slot.startHour + slot.endHour) / 2);
            const energyScore = energyCurve.hourly?.[midHour]?.score || 0.5;

            // Match task complexity with energy level
            let matchScore = 0.5;
            if (task.complexity === 'high' && energyScore >= 0.7) {
                matchScore = 1.0;
            } else if (task.complexity === 'low' && energyScore < 0.5) {
                matchScore = 0.8;
            } else if (task.complexity === 'medium') {
                matchScore = 0.7;
            }

            return {
                slot,
                score: matchScore * energyScore
            };
        });

        // Return best matching slot
        scoredSlots.sort((a, b) => b.score - a.score);
        return scoredSlots[0]?.slot;
    }

    _createScheduledSlot(task, slot, date) {
        const duration = Math.ceil(task.estimatedMinutes * this.config.bufferMultiplier);
        const startTime = new Date(date);
        startTime.setHours(slot.startHour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);

        return {
            taskId: task.id,
            taskTitle: task.title,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration,
            estimatedDuration: task.estimatedMinutes,
            bufferAdded: duration - task.estimatedMinutes,
            complexity: task.complexity,
            priority: task.priority
        };
    }

    _consumeSlotTime(availableSlots, usedSlot, duration) {
        const index = availableSlots.indexOf(usedSlot);
        if (index === -1) return;

        const durationHours = duration / 60;
        usedSlot.startHour += durationHours;
        usedSlot.minutes -= duration;

        if (usedSlot.minutes < this.config.minTaskDuration) {
            availableSlots.splice(index, 1);
        }
    }

    _identifyFocusBlocks(slots) {
        const focusBlocks = [];
        let currentBlock = null;

        for (const slot of slots) {
            if (slot.complexity === 'high' || slot.duration >= 60) {
                if (!currentBlock) {
                    currentBlock = {
                        start: slot.startTime,
                        end: slot.endTime,
                        tasks: [slot.taskId]
                    };
                } else {
                    currentBlock.end = slot.endTime;
                    currentBlock.tasks.push(slot.taskId);
                }
            } else if (currentBlock) {
                if (this._getBlockDuration(currentBlock) >= this.config.focusBlockMinDuration) {
                    focusBlocks.push(currentBlock);
                }
                currentBlock = null;
            }
        }

        if (currentBlock && this._getBlockDuration(currentBlock) >= this.config.focusBlockMinDuration) {
            focusBlocks.push(currentBlock);
        }

        return focusBlocks;
    }

    _getBlockDuration(block) {
        return (new Date(block.end) - new Date(block.start)) / (1000 * 60);
    }

    _getCommittedBlocksForDay(date) {
        // TODO: Integrate with calendar
        return this.committedBlocks.filter(b =>
            new Date(b.date).toDateString() === date.toDateString()
        );
    }

    _getDefaultEnergyCurve() {
        const curve = { hourly: {} };
        const defaultScores = {
            9: 0.7, 10: 0.85, 11: 0.9,
            12: 0.5, 13: 0.4, 14: 0.6,
            15: 0.75, 16: 0.7, 17: 0.5
        };

        for (const [hour, score] of Object.entries(defaultScores)) {
            curve.hourly[hour] = { score, level: score >= 0.7 ? 'high' : 'medium' };
        }

        return curve;
    }

    _getScheduleRecommendations(schedule, allTasks) {
        const recommendations = [];

        // Check for overload days
        for (const day of schedule) {
            if (day.totalWorkMinutes > 420) { // > 7 hours
                recommendations.push({
                    type: 'warning',
                    message: `${day.date} has ${Math.round(day.totalWorkMinutes / 60)}h of tasks scheduled`,
                    action: 'Consider moving some tasks'
                });
            }
        }

        // Check for deadline risks
        const unscheduled = allTasks.filter(t =>
            t.deadline && !schedule.some(d =>
                d.slots.some(s => s.taskId === t.id)
            )
        );

        for (const task of unscheduled) {
            if (task.deadline && new Date(task.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
                recommendations.push({
                    type: 'alert',
                    message: `"${task.title}" has deadline soon but couldn't be scheduled`,
                    action: 'Renegotiate deadline or reduce scope'
                });
            }
        }

        return recommendations;
    }

    // ============================================================
    // BUFFER TIME OPTIMIZATION
    // ============================================================

    /**
     * Calculate optimal buffer time for a task
     * @param {Object} task - Task object
     * @returns {Object} Buffer recommendation
     */
    calculateOptimalBuffer(task) {
        // Get user's estimation accuracy
        const effortAnalysis = aiEngine?.predictor?.getEffortDriftAnalysis?.();

        let bufferMultiplier = 1.2; // Default 20%
        let reason = 'Standard buffer';

        if (effortAnalysis?.hasEnoughData) {
            if (effortAnalysis.bias === 'underestimate') {
                bufferMultiplier = Math.min(1 + (effortAnalysis.averageRatio - 1) * 1.1, 1.5);
                reason = 'Based on your estimation history';
            } else if (effortAnalysis.bias === 'overestimate') {
                bufferMultiplier = 1.1;
                reason = 'You tend to finish faster';
            }
        }

        // Adjust for task complexity
        const complexity = task.getComplexity?.() || this._getComplexity(task);
        if (complexity === 'high') {
            bufferMultiplier *= 1.1;
            reason += ', complexity buffer added';
        }

        // Adjust for dependencies
        if (task.dependencies?.length > 0) {
            bufferMultiplier *= 1 + (task.dependencies.length * 0.05);
            reason += ', dependency buffer added';
        }

        const estimatedTime = task.estimatedTime || 30;
        const bufferMinutes = Math.round(estimatedTime * (bufferMultiplier - 1));

        return {
            originalEstimate: estimatedTime,
            bufferMinutes,
            totalTime: estimatedTime + bufferMinutes,
            multiplier: bufferMultiplier,
            reason
        };
    }

    // ============================================================
    // PARALLEL TASK IDENTIFICATION
    // ============================================================

    /**
     * Identify tasks that can be done in parallel
     * @param {Array} tasks - Array of tasks
     * @returns {Array} Groups of parallel tasks
     */
    identifyParallelTasks(tasks) {
        const parallelGroups = [];
        const assigned = new Set();

        for (const task of tasks) {
            if (assigned.has(task.id)) continue;
            if (task.status === 'completed') continue;

            // Find tasks that can run in parallel with this one
            const parallelCandidates = tasks.filter(t => {
                if (t.id === task.id) return false;
                if (assigned.has(t.id)) return false;
                if (t.status === 'completed') return false;

                return this._canRunInParallel(task, t);
            });

            if (parallelCandidates.length > 0) {
                const group = {
                    tasks: [task, ...parallelCandidates],
                    reason: this._getParallelReason(task, parallelCandidates),
                    potentialTimeSaved: this._calculateParallelTimeSavings([task, ...parallelCandidates])
                };

                parallelGroups.push(group);
                assigned.add(task.id);
                parallelCandidates.forEach(t => assigned.add(t.id));
            }
        }

        return parallelGroups;
    }

    _canRunInParallel(task1, task2) {
        // Not parallel if one depends on the other
        if (task1.dependencies?.includes(task2.id)) return false;
        if (task2.dependencies?.includes(task1.id)) return false;

        // Same project often means parallel work
        if (task1.project && task1.project === task2.project) {
            return true;
        }

        // Same category with no dependencies
        if (task1.category && task1.category === task2.category) {
            return true;
        }

        // Waiting tasks (e.g., waiting for response) can run parallel
        const waitingKeywords = ['wait', 'response', 'review', 'feedback'];
        const task1Waiting = waitingKeywords.some(w =>
            (task1.title || '').toLowerCase().includes(w)
        );
        const task2Waiting = waitingKeywords.some(w =>
            (task2.title || '').toLowerCase().includes(w)
        );

        if (task1Waiting || task2Waiting) return true;

        return false;
    }

    _getParallelReason(mainTask, parallelTasks) {
        if (mainTask.project && parallelTasks.every(t => t.project === mainTask.project)) {
            return 'Same project - can batch work';
        }
        if (mainTask.category && parallelTasks.every(t => t.category === mainTask.category)) {
            return 'Same category - context switching minimized';
        }
        return 'Independent tasks - can interleave';
    }

    _calculateParallelTimeSavings(tasks) {
        // Context switching costs ~15% per switch
        const sequentialTime = tasks.reduce((sum, t) => sum + (t.estimatedTime || 30), 0);
        const switchingCost = (tasks.length - 1) * 0.15 * (sequentialTime / tasks.length);

        // Parallel execution saves switching cost
        return Math.round(switchingCost);
    }

    // ============================================================
    // JUST-IN-TIME PREPARATION
    // ============================================================

    /**
     * Get preparation tasks needed before main tasks
     * @param {Array} tasks - Scheduled tasks
     * @returns {Array} Preparation suggestions
     */
    getPreparationSuggestions(tasks) {
        const suggestions = [];

        for (const task of tasks) {
            const prepTasks = this._identifyPrepNeeded(task);
            if (prepTasks.length > 0) {
                suggestions.push({
                    mainTask: task,
                    prepTasks,
                    suggestedPrepTime: this._calculatePrepTime(task, prepTasks)
                });
            }
        }

        return suggestions;
    }

    _identifyPrepNeeded(task) {
        const prepTasks = [];
        const title = (task.title || '').toLowerCase();
        const desc = (task.description || '').toLowerCase();

        // Meeting preparation
        if (title.includes('meeting') || title.includes('call')) {
            prepTasks.push({
                type: 'prep',
                title: `Review agenda for: ${task.title}`,
                duration: 10,
                timing: 'day_before'
            });
        }

        // Presentation preparation
        if (title.includes('present') || title.includes('demo')) {
            prepTasks.push({
                type: 'prep',
                title: `Prepare slides/demo for: ${task.title}`,
                duration: 30,
                timing: 'day_before'
            });
            prepTasks.push({
                type: 'prep',
                title: `Practice presentation for: ${task.title}`,
                duration: 15,
                timing: 'hour_before'
            });
        }

        // Review/approval tasks
        if (title.includes('review') || title.includes('approve')) {
            prepTasks.push({
                type: 'prep',
                title: `Read materials for: ${task.title}`,
                duration: 20,
                timing: 'day_before'
            });
        }

        // Tasks with attachments/links
        if (desc.includes('http') || desc.includes('document') || desc.includes('file')) {
            prepTasks.push({
                type: 'prep',
                title: `Review attached materials for: ${task.title}`,
                duration: 15,
                timing: 'hour_before'
            });
        }

        return prepTasks;
    }

    _calculatePrepTime(mainTask, prepTasks) {
        const taskStart = mainTask.startTime ? new Date(mainTask.startTime) : new Date();
        const suggestions = {};

        for (const prep of prepTasks) {
            if (prep.timing === 'day_before') {
                const time = new Date(taskStart);
                time.setDate(time.getDate() - 1);
                time.setHours(16, 0, 0, 0); // 4 PM day before
                suggestions[prep.title] = time;
            } else if (prep.timing === 'hour_before') {
                const time = new Date(taskStart);
                time.setMinutes(time.getMinutes() - prep.duration - 15);
                suggestions[prep.title] = time;
            }
        }

        return suggestions;
    }

    // ============================================================
    // WEEKLY RHYTHM DESIGNER
    // ============================================================

    /**
     * Design optimal weekly rhythm based on patterns
     * @returns {Object} Weekly rhythm template
     */
    designWeeklyRhythm() {
        const energyCurve = aiEngine?.patternStore?.buildEnergyCurve() || this._getDefaultEnergyCurve();
        const usagePatterns = aiEngine?.patternStore?.get('app_usage_patterns') || {};

        const rhythm = {
            monday: this._designDayRhythm('Monday', 1, energyCurve, usagePatterns),
            tuesday: this._designDayRhythm('Tuesday', 2, energyCurve, usagePatterns),
            wednesday: this._designDayRhythm('Wednesday', 3, energyCurve, usagePatterns),
            thursday: this._designDayRhythm('Thursday', 4, energyCurve, usagePatterns),
            friday: this._designDayRhythm('Friday', 5, energyCurve, usagePatterns)
        };

        return {
            rhythm,
            recommendations: this._getRhythmRecommendations(rhythm)
        };
    }

    _designDayRhythm(dayName, dayIndex, energyCurve, usagePatterns) {
        const dayUsage = usagePatterns.byDay?.[dayIndex] || 0;
        const peakHours = Object.entries(energyCurve.hourly || {})
            .filter(([_, data]) => data.score >= 0.7)
            .map(([hour, _]) => parseInt(hour));

        return {
            day: dayName,
            theme: this._suggestDayTheme(dayIndex, dayUsage),
            focusBlocks: peakHours.length > 0 ? [{
                start: Math.min(...peakHours),
                end: Math.max(...peakHours) + 1,
                label: 'Deep Work'
            }] : [],
            adminBlocks: this._suggestAdminBlocks(peakHours),
            meetingBlocks: this._suggestMeetingBlocks(dayIndex, peakHours)
        };
    }

    _suggestDayTheme(dayIndex, usage) {
        const themes = {
            1: 'Planning & Strategy',    // Monday
            2: 'Deep Work',              // Tuesday
            3: 'Collaboration',          // Wednesday
            4: 'Execution',              // Thursday
            5: 'Review & Wrap-up'        // Friday
        };
        return themes[dayIndex] || 'General';
    }

    _suggestAdminBlocks(peakHours) {
        // Admin tasks during low-energy hours
        const adminHours = [];
        for (let h = 9; h <= 17; h++) {
            if (!peakHours.includes(h)) {
                adminHours.push(h);
            }
        }

        if (adminHours.length >= 2) {
            return [{
                start: adminHours[0],
                end: adminHours[0] + 1,
                label: 'Admin & Email'
            }];
        }

        return [];
    }

    _suggestMeetingBlocks(dayIndex, peakHours) {
        // Avoid meetings during peak hours, prefer after lunch
        if (dayIndex === 3) { // Wednesday = meeting day
            return [{
                start: 14,
                end: 16,
                label: 'Meeting Block'
            }];
        }

        return [{
            start: 14,
            end: 15,
            label: 'Available for Meetings'
        }];
    }

    _getRhythmRecommendations(rhythm) {
        return [
            'Protect deep work blocks by declining meeting requests',
            'Batch similar tasks together to reduce context switching',
            'Use Friday afternoon for weekly review and next week planning',
            'Keep Monday morning for planning the week ahead'
        ];
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const smartScheduler = new SmartScheduler();

export function initSmartScheduler() {
    console.log('📅 [Smart Scheduler] Initialized');
    return smartScheduler;
}
