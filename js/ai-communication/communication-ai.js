// ============================================================
// COMMUNICATION-AI.JS - AI-Powered Communication
// Phase 7: AI Communication
// ============================================================

/**
 * Communication AI - Smart messaging and notification management
 */

export class CommunicationAI {
    constructor() {
        this.messageQueue = [];
        this.smartReplies = new Map();
    }

    // ============================================================
    // SMART MESSAGING
    // ============================================================

    /**
     * Generate smart reply suggestions
     * @param {Object} message - Incoming message
     * @returns {Array} Reply suggestions
     */
    generateSmartReplies(message) {
        const text = message.content.toLowerCase();
        const suggestions = [];

        // Question patterns
        if (text.includes('when') || text.includes('deadline')) {
            suggestions.push('I\'ll have it ready by EOD today');
            suggestions.push('Let me check my schedule and get back to you');
            suggestions.push('Can we extend the deadline to Friday?');
        }

        if (text.includes('update') || text.includes('status')) {
            suggestions.push('Currently on track, 75% complete');
            suggestions.push('I\'ll send a detailed update shortly');
            suggestions.push('Making good progress, will share by EOD');
        }

        if (text.includes('help') || text.includes('stuck')) {
            suggestions.push('Happy to help! Can you share more details?');
            suggestions.push('Let\'s schedule a quick sync');
            suggestions.push('I\'ll look into this and get back to you');
        }

        if (text.includes('meeting') || text.includes('call')) {
            suggestions.push('Works for me!');
            suggestions.push('Can we do 30 min earlier?');
            suggestions.push('I\'ll send a calendar invite');
        }

        // Default acknowledgments
        if (suggestions.length === 0) {
            suggestions.push('Got it, thanks!');
            suggestions.push('Acknowledged, I\'ll follow up');
            suggestions.push('Thanks for letting me know');
        }

        return suggestions.slice(0, 3);
    }

    /**
     * Compose status update message
     * @param {Object} task - Task to update about
     * @returns {Object} Composed message
     */
    composeStatusUpdate(task) {
        const progress = task.progress || 0;
        const status = task.status || 'in_progress';

        let message = '';
        let emoji = '📋';

        if (status === 'completed') {
            emoji = '✅';
            message = `Completed: ${task.title}`;
        } else if (status === 'blocked') {
            emoji = '🚧';
            message = `Blocked on ${task.title}. Need help with: ${task.blockers?.[0] || 'dependency'}`;
        } else if (progress >= 75) {
            emoji = '🔜';
            message = `Almost done with ${task.title} (${progress}% complete)`;
        } else if (progress >= 50) {
            emoji = '⏳';
            message = `Halfway through ${task.title} (${progress}% complete)`;
        } else {
            emoji = '🚀';
            message = `Started working on ${task.title}`;
        }

        return {
            emoji,
            message,
            full: `${emoji} ${message}`,
            channels: this._suggestChannels(task)
        };
    }

    _suggestChannels(task) {
        const channels = [];

        if (task.priority === 'critical' || task.status === 'blocked') {
            channels.push('direct_message');
        }
        if (task.project) {
            channels.push('project_channel');
        }
        channels.push('daily_standup');

        return channels;
    }

    // ============================================================
    // NOTIFICATION INTELLIGENCE
    // ============================================================

    /**
     * Prioritize notifications
     * @param {Array} notifications - Pending notifications
     * @returns {Array} Prioritized notifications
     */
    prioritizeNotifications(notifications) {
        return notifications.map(n => ({
            ...n,
            priority: this._calculateNotificationPriority(n),
            shouldBatch: this._shouldBatch(n),
            delayMinutes: this._calculateDelay(n)
        })).sort((a, b) => b.priority - a.priority);
    }

    _calculateNotificationPriority(notification) {
        let priority = 0.5;

        // Type priority
        const typePriorities = {
            urgent: 1.0, mention: 0.9, deadline: 0.8,
            update: 0.5, reminder: 0.4, info: 0.3
        };
        priority = typePriorities[notification.type] || 0.5;

        // Sender priority (if from manager, etc.)
        if (notification.sender?.role === 'manager') priority += 0.1;

        // Time sensitivity
        if (notification.expiresIn && notification.expiresIn < 60) priority += 0.2;

        return Math.min(1, priority);
    }

    _shouldBatch(notification) {
        return ['info', 'reminder', 'update'].includes(notification.type);
    }

    _calculateDelay(notification) {
        if (notification.type === 'urgent') return 0;
        if (notification.type === 'mention') return 2;
        if (['info', 'reminder'].includes(notification.type)) return 30;
        return 5;
    }

    /**
     * Generate digest of notifications
     * @param {Array} notifications - Notifications to digest
     * @returns {Object} Digest
     */
    generateDigest(notifications) {
        const byType = {};
        for (const n of notifications) {
            if (!byType[n.type]) byType[n.type] = [];
            byType[n.type].push(n);
        }

        return {
            summary: `${notifications.length} notifications`,
            breakdown: Object.entries(byType).map(([type, items]) => ({
                type,
                count: items.length,
                preview: items.slice(0, 2).map(i => i.title)
            })),
            actionRequired: notifications.filter(n => n.type === 'urgent' || n.type === 'mention').length
        };
    }

    // ============================================================
    // MEETING SUMMARIES
    // ============================================================

    /**
     * Generate meeting summary template
     * @param {Object} meeting - Meeting info
     * @returns {Object} Summary template
     */
    generateMeetingSummary(meeting) {
        return {
            title: meeting.title,
            date: meeting.date,
            attendees: meeting.attendees || [],
            template: {
                keyDiscussions: [],
                decisions: [],
                actionItems: [],
                nextSteps: [],
                followUpDate: null
            },
            promptQuestions: [
                'What were the main topics discussed?',
                'What decisions were made?',
                'Who is responsible for what action items?',
                'When is the next follow-up?'
            ]
        };
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const communicationAI = new CommunicationAI();
export function initCommunicationAI() {
    console.log('💬 [Communication AI] Initialized');
    return communicationAI;
}
