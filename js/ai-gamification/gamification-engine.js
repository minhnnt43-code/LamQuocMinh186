// ============================================================
// GAMIFICATION-ENGINE.JS - Gamification System
// Phase 8: Gamification & Motivation
// ============================================================

/**
 * Gamification Engine - Points, levels, streaks, and rewards
 */

export class GamificationEngine {
    constructor() {
        this.points = 0;
        this.level = 1;
        this.streak = 0;
        this.badges = [];
        this.challenges = [];

        this.config = {
            pointsPerTask: 10,
            bonusOnTime: 5,
            bonusCritical: 15,
            streakBonus: 0.1, // 10% per streak day
            pointsPerLevel: 100
        };
    }

    // ============================================================
    // POINTS SYSTEM
    // ============================================================

    /**
     * Award points for task completion
     * @param {Object} task - Completed task
     * @returns {Object} Points awarded
     */
    awardPoints(task) {
        let base = this.config.pointsPerTask;
        let bonuses = [];

        // Priority bonus
        if (task.priority === 'critical') {
            base += this.config.bonusCritical;
            bonuses.push({ type: 'critical', points: this.config.bonusCritical });
        } else if (task.priority === 'high') {
            base += 8;
            bonuses.push({ type: 'high_priority', points: 8 });
        }

        // On-time bonus
        if (task.deadline && new Date(task.completedAt) <= new Date(task.deadline)) {
            base += this.config.bonusOnTime;
            bonuses.push({ type: 'on_time', points: this.config.bonusOnTime });
        }

        // Streak bonus
        if (this.streak > 0) {
            const streakBonus = Math.round(base * this.streak * this.config.streakBonus);
            base += streakBonus;
            bonuses.push({ type: 'streak', points: streakBonus, streak: this.streak });
        }

        // Early completion bonus
        if (task.deadline) {
            const daysEarly = (new Date(task.deadline) - new Date(task.completedAt)) / (1000 * 60 * 60 * 24);
            if (daysEarly >= 1) {
                const earlyBonus = Math.round(daysEarly * 2);
                base += earlyBonus;
                bonuses.push({ type: 'early', points: earlyBonus, days: Math.round(daysEarly) });
            }
        }

        this.points += base;

        // Check level up
        const newLevel = Math.floor(this.points / this.config.pointsPerLevel) + 1;
        const leveledUp = newLevel > this.level;
        if (leveledUp) {
            this.level = newLevel;
        }

        return {
            awarded: base,
            bonuses,
            totalPoints: this.points,
            level: this.level,
            leveledUp,
            nextLevelAt: this.level * this.config.pointsPerLevel
        };
    }

    // ============================================================
    // STREAK SYSTEM
    // ============================================================

    /**
     * Update streak
     * @param {boolean} productive - Was today productive
     */
    updateStreak(productive) {
        if (productive) {
            this.streak++;
        } else {
            this.streak = 0;
        }

        // Award streak badges
        this._checkStreakBadges();

        return { streak: this.streak, isRecord: this.streak > (this.maxStreak || 0) };
    }

    _checkStreakBadges() {
        const streakBadges = [
            { days: 3, id: 'streak_3', title: '3 Day Streak', icon: '🔥' },
            { days: 7, id: 'streak_7', title: 'Week Warrior', icon: '⚡' },
            { days: 14, id: 'streak_14', title: 'Two Week Champion', icon: '🏆' },
            { days: 30, id: 'streak_30', title: 'Monthly Master', icon: '👑' },
            { days: 60, id: 'streak_60', title: 'Unstoppable', icon: '💎' }
        ];

        for (const badge of streakBadges) {
            if (this.streak >= badge.days && !this.badges.some(b => b.id === badge.id)) {
                this._awardBadge(badge);
            }
        }
    }

    // ============================================================
    // BADGE SYSTEM
    // ============================================================

    _awardBadge(badge) {
        this.badges.push({
            ...badge,
            earnedAt: new Date().toISOString()
        });
        return badge;
    }

    /**
     * Check for achievement badges
     * @param {Object} stats - User statistics
     */
    checkBadges(stats) {
        const newBadges = [];

        const achievementBadges = [
            { condition: s => s.tasksCompleted >= 10, id: 'tasks_10', title: 'Getting Started', icon: '🌱' },
            { condition: s => s.tasksCompleted >= 50, id: 'tasks_50', title: 'Task Master', icon: '📋' },
            { condition: s => s.tasksCompleted >= 100, id: 'tasks_100', title: 'Centurion', icon: '💯' },
            { condition: s => s.focusHours >= 10, id: 'focus_10', title: 'Focus Finder', icon: '🎯' },
            { condition: s => s.focusHours >= 50, id: 'focus_50', title: 'Deep Worker', icon: '🧘' },
            { condition: s => s.onTimeRate >= 0.95, id: 'ontime_95', title: 'Time Keeper', icon: '⏱️' },
            { condition: s => s.earlyCompletions >= 10, id: 'early_10', title: 'Ahead of Schedule', icon: '🚀' }
        ];

        for (const badge of achievementBadges) {
            if (badge.condition(stats) && !this.badges.some(b => b.id === badge.id)) {
                newBadges.push(this._awardBadge(badge));
            }
        }

        return newBadges;
    }

    /**
     * Get all badges
     * @returns {Array} All badges
     */
    getBadges() {
        return this.badges.sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
    }

    // ============================================================
    // CHALLENGES
    // ============================================================

    /**
     * Create a daily challenge
     * @returns {Object} Today's challenge
     */
    getDailyChallenge() {
        const challenges = [
            { id: 'complete_5', title: 'Complete 5 tasks', target: 5, type: 'tasks', reward: 50 },
            { id: 'focus_2h', title: '2 hours of focus time', target: 120, type: 'focus', reward: 40 },
            { id: 'no_overdue', title: 'No overdue tasks today', target: 1, type: 'ontime', reward: 30 },
            { id: 'clear_inbox', title: 'Process all pending tasks', target: 1, type: 'process', reward: 35 },
            { id: 'early_bird', title: 'Complete 2 tasks before lunch', target: 2, type: 'morning', reward: 25 }
        ];

        // Select based on day
        const dayIndex = new Date().getDay();
        const challenge = challenges[dayIndex % challenges.length];

        return {
            ...challenge,
            date: new Date().toISOString().split('T')[0],
            progress: 0,
            completed: false
        };
    }

    /**
     * Update challenge progress
     * @param {string} type - Challenge type
     * @param {number} amount - Progress amount
     */
    updateChallengeProgress(type, amount) {
        const challenge = this.challenges.find(c => c.type === type && !c.completed);
        if (!challenge) return null;

        challenge.progress += amount;

        if (challenge.progress >= challenge.target) {
            challenge.completed = true;
            challenge.completedAt = new Date().toISOString();
            this.points += challenge.reward;
        }

        return challenge;
    }

    // ============================================================
    // LEADERBOARD & STATS
    // ============================================================

    /**
     * Get gamification stats
     * @returns {Object} Stats
     */
    getStats() {
        return {
            points: this.points,
            level: this.level,
            streak: this.streak,
            badgeCount: this.badges.length,
            nextLevel: this.level * this.config.pointsPerLevel,
            progressToNext: this.points % this.config.pointsPerLevel,
            recentBadges: this.badges.slice(-3)
        };
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const gamificationEngine = new GamificationEngine();
export function initGamificationEngine() {
    console.log('🎮 [Gamification Engine] Initialized');
    return gamificationEngine;
}
