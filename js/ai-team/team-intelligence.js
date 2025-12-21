// ============================================================
// TEAM-INTELLIGENCE.JS - Team AI Coordination Hub
// Phase 4: Team Intelligence
// ============================================================

/**
 * Team Intelligence - Central hub for team AI features
 * Coordinates skill matching, workload equity, and collaboration
 */

import { aiEngine } from '../ai-engine/ai-core.js';

export class TeamIntelligence {
    constructor() {
        this.config = {
            maxTeamSize: 50,
            skillMatchThreshold: 0.7,
            workloadEquityTolerance: 0.2  // 20% variance allowed
        };

        this.teamMembers = new Map();
        this.teamMetrics = null;
    }

    // ============================================================
    // TEAM SETUP
    // ============================================================

    /**
     * Initialize team data
     * @param {Array} members - Team member objects
     */
    initializeTeam(members) {
        this.teamMembers.clear();

        for (const member of members) {
            this.teamMembers.set(member.id, {
                id: member.id,
                name: member.name,
                role: member.role,
                skills: member.skills || [],
                workload: member.workload || 0,
                availability: member.availability || 1.0,
                preferences: member.preferences || {},
                performance: member.performance || {},
                timezone: member.timezone || 'local'
            });
        }

        this._updateTeamMetrics();
        return { membersLoaded: this.teamMembers.size };
    }

    /**
     * Add or update team member
     * @param {Object} member - Member data
     */
    updateMember(member) {
        const existing = this.teamMembers.get(member.id) || {};
        this.teamMembers.set(member.id, { ...existing, ...member });
        this._updateTeamMetrics();
    }

    _updateTeamMetrics() {
        const members = Array.from(this.teamMembers.values());

        if (members.length === 0) {
            this.teamMetrics = null;
            return;
        }

        // Calculate aggregate metrics
        const totalWorkload = members.reduce((sum, m) => sum + m.workload, 0);
        const avgWorkload = totalWorkload / members.length;

        // Skill coverage
        const allSkills = new Set();
        members.forEach(m => m.skills.forEach(s => allSkills.add(s)));

        // Availability
        const avgAvailability = members.reduce((sum, m) => sum + m.availability, 0) / members.length;

        this.teamMetrics = {
            memberCount: members.length,
            totalWorkload,
            avgWorkload,
            workloadVariance: this._calculateVariance(members.map(m => m.workload), avgWorkload),
            skillCoverage: Array.from(allSkills),
            avgAvailability,
            lastUpdated: new Date().toISOString()
        };
    }

    _calculateVariance(values, mean) {
        if (values.length === 0) return 0;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / values.length) / mean;
    }

    // ============================================================
    // TEAM OVERVIEW
    // ============================================================

    /**
     * Get team overview
     * @returns {Object} Team overview
     */
    getTeamOverview() {
        if (!this.teamMetrics) {
            return { hasTeam: false, message: 'No team data loaded' };
        }

        const members = Array.from(this.teamMembers.values());

        return {
            hasTeam: true,
            metrics: this.teamMetrics,
            workloadDistribution: this._getWorkloadDistribution(members),
            skillMatrix: this._buildSkillMatrix(members),
            availabilityStatus: this._getAvailabilityStatus(members),
            alerts: this._getTeamAlerts(members)
        };
    }

    _getWorkloadDistribution(members) {
        const distribution = {
            overloaded: [],
            high: [],
            balanced: [],
            light: [],
            available: []
        };

        for (const member of members) {
            if (member.workload >= 1.0) {
                distribution.overloaded.push(member.name);
            } else if (member.workload >= 0.8) {
                distribution.high.push(member.name);
            } else if (member.workload >= 0.5) {
                distribution.balanced.push(member.name);
            } else if (member.workload >= 0.2) {
                distribution.light.push(member.name);
            } else {
                distribution.available.push(member.name);
            }
        }

        return distribution;
    }

    _buildSkillMatrix(members) {
        const matrix = {};

        for (const member of members) {
            for (const skill of member.skills) {
                if (!matrix[skill]) {
                    matrix[skill] = [];
                }
                matrix[skill].push({
                    memberId: member.id,
                    name: member.name,
                    availability: member.availability,
                    workload: member.workload
                });
            }
        }

        return matrix;
    }

    _getAvailabilityStatus(members) {
        return members.map(m => ({
            name: m.name,
            availability: m.availability,
            status: m.availability >= 0.8 ? 'available' : m.availability >= 0.4 ? 'partial' : 'busy'
        }));
    }

    _getTeamAlerts(members) {
        const alerts = [];

        // Check for overloaded members
        const overloaded = members.filter(m => m.workload >= 1.0);
        if (overloaded.length > 0) {
            alerts.push({
                type: 'workload',
                severity: 'high',
                message: `${overloaded.length} team member(s) overloaded`,
                affected: overloaded.map(m => m.name)
            });
        }

        // Check for workload imbalance
        if (this.teamMetrics.workloadVariance > this.config.workloadEquityTolerance) {
            alerts.push({
                type: 'equity',
                severity: 'medium',
                message: 'Workload distribution is uneven',
                variance: this.teamMetrics.workloadVariance
            });
        }

        // Check for skill gaps
        const skillGaps = this._identifySkillGaps(members);
        if (skillGaps.length > 0) {
            alerts.push({
                type: 'skills',
                severity: 'info',
                message: 'Single points of failure in skills',
                skills: skillGaps
            });
        }

        return alerts;
    }

    _identifySkillGaps(members) {
        const skillCount = {};
        members.forEach(m => {
            m.skills.forEach(s => {
                skillCount[s] = (skillCount[s] || 0) + 1;
            });
        });

        // Skills with only 1 person = risk
        return Object.entries(skillCount)
            .filter(([_, count]) => count === 1)
            .map(([skill, _]) => skill);
    }

    // ============================================================
    // TEAM CAPACITY
    // ============================================================

    /**
     * Calculate team capacity for a period
     * @param {number} days - Period in days
     * @returns {Object} Capacity analysis
     */
    calculateTeamCapacity(days = 7) {
        const members = Array.from(this.teamMembers.values());

        const capacity = members.map(m => ({
            memberId: m.id,
            name: m.name,
            dailyHours: 8 * m.availability,
            periodHours: 8 * m.availability * days * 5 / 7, // Work days only
            currentLoad: m.workload,
            remainingCapacity: Math.max(0, (1 - m.workload) * 8 * m.availability * days * 5 / 7)
        }));

        const totalCapacity = capacity.reduce((sum, c) => sum + c.periodHours, 0);
        const availableCapacity = capacity.reduce((sum, c) => sum + c.remainingCapacity, 0);

        return {
            period: `${days} days`,
            memberCapacity: capacity,
            totalCapacityHours: totalCapacity,
            availableCapacityHours: availableCapacity,
            utilizationRate: 1 - (availableCapacity / totalCapacity),
            canTakeNewWork: availableCapacity > 20 // More than 20 hours available
        };
    }

    // ============================================================
    // DUPLICATE WORK DETECTION
    // ============================================================

    /**
     * Detect potential duplicate work
     * @param {Array} allTasks - All team tasks
     * @returns {Array} Potential duplicates
     */
    detectDuplicateWork(allTasks) {
        const duplicates = [];
        const tasksByWords = new Map();

        // Build word index
        for (const task of allTasks) {
            const words = this._extractKeywords(task.title + ' ' + (task.description || ''));
            for (const word of words) {
                if (!tasksByWords.has(word)) {
                    tasksByWords.set(word, []);
                }
                tasksByWords.get(word).push(task);
            }
        }

        // Find tasks with high keyword overlap
        const checked = new Set();

        for (const task of allTasks) {
            if (task.status === 'completed') continue;

            const keywords = this._extractKeywords(task.title + ' ' + (task.description || ''));
            const candidates = new Map();

            for (const word of keywords) {
                const matches = tasksByWords.get(word) || [];
                for (const match of matches) {
                    if (match.id === task.id) continue;
                    if (match.status === 'completed') continue;
                    if (match.assignee === task.assignee) continue; // Same person is OK

                    const pairKey = [task.id, match.id].sort().join('-');
                    if (checked.has(pairKey)) continue;

                    candidates.set(match.id, (candidates.get(match.id) || 0) + 1);
                }
            }

            // Check candidates with high overlap
            for (const [matchId, overlapCount] of candidates) {
                if (overlapCount >= 3) { // At least 3 keywords in common
                    const matchTask = allTasks.find(t => t.id === matchId);
                    const similarity = this._calculateSimilarity(task, matchTask);

                    if (similarity >= 0.6) {
                        const pairKey = [task.id, matchId].sort().join('-');
                        checked.add(pairKey);

                        duplicates.push({
                            task1: { id: task.id, title: task.title, assignee: task.assignee },
                            task2: { id: matchTask.id, title: matchTask.title, assignee: matchTask.assignee },
                            similarity,
                            suggestion: 'These tasks may overlap. Consider consolidating or clarifying scope.'
                        });
                    }
                }
            }
        }

        return duplicates;
    }

    _extractKeywords(text) {
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        return text.toLowerCase()
            .split(/\W+/)
            .filter(w => w.length > 3 && !stopWords.has(w));
    }

    _calculateSimilarity(task1, task2) {
        const words1 = new Set(this._extractKeywords(task1.title + ' ' + (task1.description || '')));
        const words2 = new Set(this._extractKeywords(task2.title + ' ' + (task2.description || '')));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size; // Jaccard similarity
    }

    // ============================================================
    // TEAM MOMENTUM
    // ============================================================

    /**
     * Track team momentum
     * @param {Array} recentTasks - Recently completed tasks
     * @returns {Object} Momentum analysis
     */
    trackTeamMomentum(recentTasks) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

        const thisWeek = recentTasks.filter(t =>
            t.completedAt && new Date(t.completedAt) >= weekAgo
        );
        const lastWeek = recentTasks.filter(t =>
            t.completedAt && new Date(t.completedAt) >= twoWeeksAgo && new Date(t.completedAt) < weekAgo
        );

        const thisWeekVelocity = thisWeek.length;
        const lastWeekVelocity = lastWeek.length;

        let momentum = 'stable';
        let momentumScore = 0.5;

        if (lastWeekVelocity > 0) {
            const change = (thisWeekVelocity - lastWeekVelocity) / lastWeekVelocity;

            if (change > 0.2) {
                momentum = 'accelerating';
                momentumScore = Math.min(1, 0.5 + change);
            } else if (change < -0.2) {
                momentum = 'slowing';
                momentumScore = Math.max(0, 0.5 + change);
            }
        }

        return {
            thisWeek: thisWeekVelocity,
            lastWeek: lastWeekVelocity,
            momentum,
            momentumScore,
            byMember: this._getMomentumByMember(thisWeek, lastWeek),
            alerts: momentum === 'slowing' ? ['Team velocity is declining. Check for blockers.'] : []
        };
    }

    _getMomentumByMember(thisWeek, lastWeek) {
        const memberMomentum = {};

        for (const task of thisWeek) {
            if (!task.assignee) continue;
            memberMomentum[task.assignee] = (memberMomentum[task.assignee] || 0) + 1;
        }

        const lastWeekByMember = {};
        for (const task of lastWeek) {
            if (!task.assignee) continue;
            lastWeekByMember[task.assignee] = (lastWeekByMember[task.assignee] || 0) + 1;
        }

        return Object.entries(memberMomentum).map(([member, count]) => ({
            member,
            thisWeek: count,
            lastWeek: lastWeekByMember[member] || 0,
            trend: count > (lastWeekByMember[member] || 0) ? 'up' : count < (lastWeekByMember[member] || 0) ? 'down' : 'stable'
        }));
    }

    // ============================================================
    // GETTERS
    // ============================================================

    getMember(id) {
        return this.teamMembers.get(id);
    }

    getAllMembers() {
        return Array.from(this.teamMembers.values());
    }

    getMetrics() {
        return this.teamMetrics;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const teamIntelligence = new TeamIntelligence();

export function initTeamIntelligence() {
    console.log('👥 [Team Intelligence] Initialized');
    return teamIntelligence;
}
