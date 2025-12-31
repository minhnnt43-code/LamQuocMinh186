// ============================================================
// GOAL-TRACKER.JS - Goal and Achievement Tracking
// Phase 5: Analytics & Insights
// ============================================================

/**
 * Goal Tracker - Tracks goals, milestones, and achievements
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class GoalTracker {
    constructor() {
        this.goals = [];
        this.achievements = [];
        this.milestones = [];
    }

    // ============================================================
    // GOAL MANAGEMENT
    // ============================================================

    /**
     * Set a new goal
     * @param {Object} goalData - Goal definition
     * @returns {Object} Created goal
     */
    setGoal(goalData) {
        const goal = {
            id: `goal_${Date.now()}`,
            title: goalData.title,
            description: goalData.description || '',
            type: goalData.type || 'custom', // tasks, focus, streak, custom
            target: goalData.target,
            current: 0,
            unit: goalData.unit || 'count',
            period: goalData.period || 'week', // day, week, month
            createdAt: new Date().toISOString(),
            deadline: goalData.deadline,
            status: 'active',
            progress: 0
        };

        this.goals.push(goal);
        return goal;
    }

    /**
     * Update goal progress
     * @param {string} goalId - Goal ID
     * @param {number} value - New value or increment
     * @param {boolean} increment - Whether to increment or set
     */
    updateProgress(goalId, value, increment = true) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return null;

        goal.current = increment ? goal.current + value : value;
        goal.progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
        goal.lastUpdated = new Date().toISOString();

        // Check completion
        if (goal.current >= goal.target && goal.status === 'active') {
            this._completeGoal(goal);
        }

        return goal;
    }

    _completeGoal(goal) {
        goal.status = 'completed';
        goal.completedAt = new Date().toISOString();

        // Create achievement
        this._createAchievement({
            title: `Completed: ${goal.title}`,
            type: 'goal_completion',
            goalId: goal.id
        });
    }

    /**
     * Get active goals
     * @returns {Array} Active goals
     */
    getActiveGoals() {
        return this.goals.filter(g => g.status === 'active');
    }

    /**
     * Get goal status summary
     * @returns {Object} Summary
     */
    getGoalsSummary() {
        const active = this.goals.filter(g => g.status === 'active');
        const completed = this.goals.filter(g => g.status === 'completed');

        return {
            totalActive: active.length,
            totalCompleted: completed.length,
            onTrack: active.filter(g => this._isOnTrack(g)).length,
            atRisk: active.filter(g => !this._isOnTrack(g)).length,
            activeGoals: active.map(g => ({
                id: g.id,
                title: g.title,
                progress: g.progress,
                onTrack: this._isOnTrack(g)
            }))
        };
    }

    _isOnTrack(goal) {
        if (!goal.deadline) return goal.progress >= 50;

        const totalDays = (new Date(goal.deadline) - new Date(goal.createdAt)) / (1000 * 60 * 60 * 24);
        const elapsed = (Date.now() - new Date(goal.createdAt)) / (1000 * 60 * 60 * 24);
        const expectedProgress = (elapsed / totalDays) * 100;

        return goal.progress >= expectedProgress * 0.8; // 80% of expected
    }

    // ============================================================
    // ACHIEVEMENTS
    // ============================================================

    _createAchievement(data) {
        const achievement = {
            id: `ach_${Date.now()}`,
            ...data,
            earnedAt: new Date().toISOString(),
            celebrated: false
        };

        this.achievements.push(achievement);
        return achievement;
    }

    /**
     * Check for automatic achievements
     * @param {Object} stats - Current stats
     */
    checkAchievements(stats) {
        const newAchievements = [];

        // Task milestones
        const taskMilestones = [10, 50, 100, 250, 500, 1000];
        for (const milestone of taskMilestones) {
            if (stats.totalTasksCompleted >= milestone &&
                !this._hasAchievement(`tasks_${milestone}`)) {
                newAchievements.push(this._createAchievement({
                    id: `tasks_${milestone}`,
                    title: `${milestone} Tasks Completed`,
                    type: 'milestone',
                    icon: '🏆'
                }));
            }
        }

        // Streak achievements
        const streakMilestones = [3, 7, 14, 30, 60, 100];
        for (const days of streakMilestones) {
            if (stats.currentStreak >= days &&
                !this._hasAchievement(`streak_${days}`)) {
                newAchievements.push(this._createAchievement({
                    id: `streak_${days}`,
                    title: `${days} Day Streak!`,
                    type: 'streak',
                    icon: '🔥'
                }));
            }
        }

        // Focus achievements
        const focusMilestones = [60, 300, 600, 1200]; // minutes
        for (const minutes of focusMilestones) {
            if (stats.totalFocusMinutes >= minutes &&
                !this._hasAchievement(`focus_${minutes}`)) {
                newAchievements.push(this._createAchievement({
                    id: `focus_${minutes}`,
                    title: `${minutes / 60}h of Focus Time`,
                    type: 'focus',
                    icon: '🎯'
                }));
            }
        }

        // On-time achievement
        if (stats.onTimeRate >= 0.95 && stats.tasksThisWeek >= 10 &&
            !this._hasAchievement('perfect_week')) {
            newAchievements.push(this._createAchievement({
                id: 'perfect_week',
                title: 'Perfect Week!',
                description: '95%+ on-time with 10+ tasks',
                type: 'quality',
                icon: '⭐'
            }));
        }

        return newAchievements;
    }

    _hasAchievement(id) {
        return this.achievements.some(a => a.id === id);
    }

    /**
     * Get recent achievements
     * @param {number} count - Number to return
     * @returns {Array} Recent achievements
     */
    getRecentAchievements(count = 5) {
        return this.achievements
            .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
            .slice(0, count);
    }

    /**
     * Get uncelebrated achievements
     * @returns {Array} Uncelebrated achievements
     */
    getUncelebrated() {
        return this.achievements.filter(a => !a.celebrated);
    }

    /**
     * Mark achievement as celebrated
     * @param {string} achievementId
     */
    celebrate(achievementId) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (achievement) {
            achievement.celebrated = true;
            achievement.celebratedAt = new Date().toISOString();
        }
    }

    // ============================================================
    // SMART GOAL SUGGESTIONS
    // ============================================================

    /**
     * Suggest goals based on user patterns
     * @returns {Array} Goal suggestions
     */
    suggestGoals() {
        const profile = aiEngine?.userProfile?.getData() || {};
        const suggestions = [];

        // Velocity goal
        const avgTasks = profile.averageTasksPerDay || 3;
        suggestions.push({
            title: `Complete ${Math.ceil(avgTasks * 5)} tasks this week`,
            type: 'tasks',
            target: Math.ceil(avgTasks * 5),
            period: 'week',
            reason: 'Based on your average productivity'
        });

        // Focus goal
        suggestions.push({
            title: 'Achieve 4 hours of focus time today',
            type: 'focus',
            target: 240,
            unit: 'minutes',
            period: 'day',
            reason: 'Deep work leads to better results'
        });

        // Streak goal
        if (profile.streakDays < 7) {
            suggestions.push({
                title: 'Build a 7-day productivity streak',
                type: 'streak',
                target: 7,
                period: 'ongoing',
                reason: 'Consistency builds momentum'
            });
        }

        // On-time goal
        if (profile.onTimeRate < 0.9) {
            suggestions.push({
                title: 'Achieve 90% on-time completion',
                type: 'quality',
                target: 90,
                unit: 'percent',
                period: 'week',
                reason: 'Improve deadline reliability'
            });
        }

        return suggestions;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const goalTracker = new GoalTracker();

export function initGoalTracker() {
    console.log('🎯 [Goal Tracker] Initialized');
    return goalTracker;
}
