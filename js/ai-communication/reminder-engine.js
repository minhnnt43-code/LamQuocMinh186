// ============================================================
// REMINDER-ENGINE.JS - Intelligent Reminder System
// Phase 7: AI Communication
// ============================================================

/**
 * Reminder Engine - Context-aware reminder management
 */

export class ReminderEngine {
    constructor() {
        this.reminders = [];
        this.snoozedReminders = [];
    }

    // ============================================================
    // REMINDER CREATION
    // ============================================================

    /**
     * Create a smart reminder
     * @param {Object} options - Reminder options
     * @returns {Object} Created reminder
     */
    createReminder(options) {
        const reminder = {
            id: `rem_${Date.now()}`,
            title: options.title,
            task: options.task || null,
            type: options.type || 'custom', // deadline, followup, habit, custom
            triggerAt: options.triggerAt || this._calculateOptimalTime(options),
            createdAt: new Date().toISOString(),
            recurring: options.recurring || null,
            priority: options.priority || 'normal',
            status: 'active',
            contextual: options.contextual || false
        };

        this.reminders.push(reminder);
        return reminder;
    }

    _calculateOptimalTime(options) {
        const now = new Date();

        if (options.type === 'deadline' && options.task?.deadline) {
            // Remind 1 day before deadline
            const deadline = new Date(options.task.deadline);
            deadline.setDate(deadline.getDate() - 1);
            deadline.setHours(9, 0, 0, 0);
            return deadline.toISOString();
        }

        if (options.type === 'followup') {
            // Tomorrow at 10 AM
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);
            return tomorrow.toISOString();
        }

        // Default: 1 hour from now
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }

    /**
     * Auto-generate reminders from tasks
     * @param {Array} tasks - Tasks to analyze
     * @returns {Array} Generated reminders
     */
    autoGenerateReminders(tasks) {
        const generated = [];

        for (const task of tasks) {
            // Deadline reminders
            if (task.deadline && task.status !== 'completed') {
                const daysUntil = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24);

                if (daysUntil > 0 && daysUntil <= 7) {
                    // Check if reminder already exists
                    const exists = this.reminders.some(r =>
                        r.task?.id === task.id && r.type === 'deadline'
                    );

                    if (!exists) {
                        generated.push(this.createReminder({
                            title: `Deadline approaching: ${task.title}`,
                            task,
                            type: 'deadline',
                            priority: task.priority === 'critical' ? 'high' : 'normal'
                        }));
                    }
                }
            }

            // Stale task reminders
            if (task.status === 'in_progress' && task.updatedAt) {
                const daysSinceUpdate = (Date.now() - new Date(task.updatedAt)) / (1000 * 60 * 60 * 24);

                if (daysSinceUpdate >= 3) {
                    const exists = this.reminders.some(r =>
                        r.task?.id === task.id && r.type === 'stale'
                    );

                    if (!exists) {
                        generated.push(this.createReminder({
                            title: `Check on stale task: ${task.title}`,
                            task,
                            type: 'stale',
                            priority: 'low'
                        }));
                    }
                }
            }
        }

        return generated;
    }

    // ============================================================
    // REMINDER MANAGEMENT
    // ============================================================

    /**
     * Get due reminders
     * @returns {Array} Due reminders
     */
    getDueReminders() {
        const now = Date.now();
        return this.reminders.filter(r =>
            r.status === 'active' && new Date(r.triggerAt).getTime() <= now
        );
    }

    /**
     * Snooze a reminder
     * @param {string} reminderId - Reminder ID
     * @param {number} minutes - Minutes to snooze
     */
    snoozeReminder(reminderId, minutes = 30) {
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (!reminder) return null;

        reminder.triggerAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
        reminder.snoozedCount = (reminder.snoozedCount || 0) + 1;

        this.snoozedReminders.push({
            reminderId,
            snoozedAt: new Date().toISOString(),
            duration: minutes
        });

        return reminder;
    }

    /**
     * Dismiss a reminder
     * @param {string} reminderId - Reminder ID
     */
    dismissReminder(reminderId) {
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (reminder) {
            reminder.status = 'dismissed';
            reminder.dismissedAt = new Date().toISOString();
        }
        return reminder;
    }

    /**
     * Complete a reminder
     * @param {string} reminderId - Reminder ID
     */
    completeReminder(reminderId) {
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (reminder) {
            reminder.status = 'completed';
            reminder.completedAt = new Date().toISOString();

            // Handle recurring
            if (reminder.recurring) {
                this._scheduleNextOccurrence(reminder);
            }
        }
        return reminder;
    }

    _scheduleNextOccurrence(reminder) {
        const intervals = {
            daily: 1,
            weekly: 7,
            monthly: 30
        };

        const days = intervals[reminder.recurring] || 1;
        const nextTrigger = new Date(reminder.triggerAt);
        nextTrigger.setDate(nextTrigger.getDate() + days);

        this.createReminder({
            ...reminder,
            triggerAt: nextTrigger.toISOString()
        });
    }

    // ============================================================
    // CONTEXTUAL REMINDERS
    // ============================================================

    /**
     * Get contextual reminders
     * @param {Object} context - Current context
     * @returns {Array} Relevant reminders
     */
    getContextualReminders(context) {
        return this.reminders.filter(r => {
            if (r.status !== 'active') return false;

            // Location-based
            if (r.contextual && r.location && context.location) {
                if (r.location !== context.location) return false;
            }

            // Project-based
            if (r.task?.project && context.project) {
                if (r.task.project === context.project) return true;
            }

            return new Date(r.triggerAt) <= new Date();
        });
    }

    /**
     * Get reminder statistics
     * @returns {Object} Statistics
     */
    getStats() {
        const active = this.reminders.filter(r => r.status === 'active');
        const completed = this.reminders.filter(r => r.status === 'completed');
        const dismissed = this.reminders.filter(r => r.status === 'dismissed');

        return {
            active: active.length,
            completed: completed.length,
            dismissed: dismissed.length,
            snoozedTotal: this.snoozedReminders.length,
            completionRate: this.reminders.length > 0
                ? Math.round(completed.length / this.reminders.length * 100)
                : 0
        };
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const reminderEngine = new ReminderEngine();
export function initReminderEngine() {
    console.log('⏰ [Reminder Engine] Initialized');
    return reminderEngine;
}
