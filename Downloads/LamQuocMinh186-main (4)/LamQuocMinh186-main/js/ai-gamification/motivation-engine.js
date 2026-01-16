// ============================================================
// MOTIVATION-ENGINE.JS - Motivation & Encouragement
// Phase 8: Gamification & Motivation
// ============================================================

/**
 * Motivation Engine - Personalized motivation and encouragement
 */

export class MotivationEngine {
    constructor() {
        this.motivationHistory = [];
    }

    // ============================================================
    // MOTIVATIONAL MESSAGES
    // ============================================================

    /**
     * Get contextual motivation
     * @param {Object} context - Current context
     * @returns {Object} Motivation message
     */
    getMotivation(context = {}) {
        const hour = new Date().getHours();
        const category = this._determineCategory(context);
        const message = this._selectMessage(category, context);

        return {
            message: message.text,
            type: category,
            emoji: message.emoji,
            action: message.action
        };
    }

    _determineCategory(context) {
        if (context.justCompletedTask) return 'completion';
        if (context.streak >= 3) return 'streak';
        if (context.struggling) return 'encouragement';
        if (context.overloaded) return 'relief';
        if (context.beforeDeadline) return 'deadline';
        if (context.lowEnergy) return 'energy';
        return 'general';
    }

    _selectMessage(category, context) {
        const messages = {
            completion: [
                { text: 'Great job! You\'re making excellent progress.', emoji: '🎉', action: 'Keep going!' },
                { text: 'Another task done! You\'re on fire today.', emoji: '🔥', action: 'What\'s next?' },
                { text: 'Well done! Each completion brings you closer to your goals.', emoji: '✨', action: 'Celebrate!' }
            ],
            streak: [
                { text: `${context.streak} days strong! Your consistency is inspiring.`, emoji: '⚡', action: 'Keep the streak alive!' },
                { text: 'You\'re building unstoppable momentum!', emoji: '🚀', action: 'Don\'t stop now!' },
                { text: 'Day after day, you show up. That\'s what champions do.', emoji: '🏆', action: 'You got this!' }
            ],
            encouragement: [
                { text: 'Every expert was once a beginner. Keep going!', emoji: '💪', action: 'Take one small step' },
                { text: 'Tough days build tough people. You\'ve got this!', emoji: '🌟', action: 'Start with something easy' },
                { text: 'Progress, not perfection. You\'re doing better than you think.', emoji: '❤️', action: 'Be kind to yourself' }
            ],
            relief: [
                { text: 'It\'s okay to take a break. Rest is productive too.', emoji: '🧘', action: 'Step away for 10 min' },
                { text: 'You don\'t have to do everything today.', emoji: '🌸', action: 'Prioritize ruthlessly' },
                { text: 'Breathe. You\'re handling more than you realize.', emoji: '💫', action: 'What can you let go?' }
            ],
            deadline: [
                { text: 'You work best under pressure. Channel that energy!', emoji: '⏰', action: 'Focus on what matters most' },
                { text: 'The finish line is in sight. Sprint!', emoji: '🏃', action: 'Block distractions' },
                { text: 'You\'ve done this before. You\'ll do it again.', emoji: '💪', action: 'Get it done!' }
            ],
            energy: [
                { text: 'Low energy? That\'s okay. Do what you can.', emoji: '🔋', action: 'Try a quick walk' },
                { text: 'Rest now so you can perform later.', emoji: '😴', action: 'Take a power nap' },
                { text: 'Save deep work for when you have energy.', emoji: '🌱', action: 'Do admin tasks instead' }
            ],
            general: [
                { text: 'You\'re capable of amazing things.', emoji: '⭐', action: 'Believe in yourself' },
                { text: 'Small steps lead to big changes.', emoji: '👣', action: 'Take the first step' },
                { text: 'Focus on progress, not perfection.', emoji: '📈', action: 'Keep moving forward' }
            ]
        };

        const categoryMessages = messages[category] || messages.general;
        return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
    }

    // ============================================================
    // CELEBRATION
    // ============================================================

    /**
     * Generate celebration for achievement
     * @param {Object} achievement - Achievement to celebrate
     * @returns {Object} Celebration content
     */
    celebrate(achievement) {
        const celebrations = {
            task_complete: {
                small: ['Nice!', 'Done!', '✓'],
                medium: ['Great work!', 'You did it!', 'Another one down!'],
                large: ['Amazing job!', 'Incredible!', 'You\'re crushing it!']
            },
            streak: {
                message: `🔥 ${achievement.streak} day streak! Keep it going!`,
                confetti: achievement.streak >= 7
            },
            level_up: {
                message: `🎉 Level up! You're now level ${achievement.level}!`,
                confetti: true,
                badge: true
            },
            badge: {
                message: `🏆 New badge earned: ${achievement.badge.title}!`,
                confetti: true
            },
            goal_complete: {
                message: `🎯 Goal completed: ${achievement.goal.title}!`,
                confetti: true,
                special: true
            }
        };

        const type = achievement.type;
        const config = celebrations[type];

        if (!config) return { message: 'Congratulations!', confetti: false };

        if (type === 'task_complete') {
            const size = achievement.priority === 'critical' ? 'large' :
                achievement.priority === 'high' ? 'medium' : 'small';
            return {
                message: config[size][Math.floor(Math.random() * config[size].length)],
                confetti: size === 'large'
            };
        }

        return config;
    }

    // ============================================================
    // PROGRESS ENCOURAGEMENT
    // ============================================================

    /**
     * Get progress-based encouragement
     * @param {Object} progress - Progress data
     * @returns {Object} Encouragement
     */
    getProgressEncouragement(progress) {
        const { completed, total, percentComplete } = progress;

        if (percentComplete >= 100) {
            return { message: 'All done! Time to celebrate! 🎉', phase: 'complete' };
        }
        if (percentComplete >= 75) {
            return { message: 'Almost there! The finish line is in sight!', phase: 'final_push' };
        }
        if (percentComplete >= 50) {
            return { message: 'Halfway there! Great momentum!', phase: 'midpoint' };
        }
        if (percentComplete >= 25) {
            return { message: 'Nice progress! Keep building momentum.', phase: 'building' };
        }
        if (completed > 0) {
            return { message: 'You\'ve started! That\'s the hardest part.', phase: 'started' };
        }
        return { message: 'Ready to begin? Take that first step!', phase: 'ready' };
    }

    // ============================================================
    // AFFIRMATIONS
    // ============================================================

    /**
     * Get daily affirmation
     * @returns {string} Affirmation
     */
    getDailyAffirmation() {
        const affirmations = [
            'I am capable of achieving my goals.',
            'I handle challenges with grace and determination.',
            'Every day I am becoming more productive.',
            'I prioritize what matters and let go of the rest.',
            'I am in control of my time and energy.',
            'I celebrate progress, not just perfection.',
            'I am worthy of success and happiness.',
            'I focus on solutions, not problems.',
            'I am resilient and can adapt to change.',
            'I trust myself to make good decisions.'
        ];

        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        return affirmations[dayOfYear % affirmations.length];
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const motivationEngine = new MotivationEngine();
export function initMotivationEngine() {
    console.log('💪 [Motivation Engine] Initialized');
    return motivationEngine;
}
