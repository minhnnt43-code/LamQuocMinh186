// ============================================================
// SKILL-MATCHER.JS - Skill-Based Task Assignment
// Phase 4: Team Intelligence
// ============================================================

/**
 * Skill Matcher - Matches tasks to team members based on skills
 * Considers availability, workload, and growth opportunities
 */

import { teamIntelligence } from './team-intelligence.js';

export class SkillMatcher {
    constructor() {
        this.config = {
            skillMatchWeight: 0.35,
            availabilityWeight: 0.25,
            workloadWeight: 0.25,
            growthWeight: 0.15,
            minSkillMatch: 0.3  // Minimum skill match to consider
        };
    }

    // ============================================================
    // SKILL-BASED ASSIGNMENT
    // ============================================================

    /**
     * Find best assignee for a task
     * @param {Object} task - Task to assign
     * @param {Object} options - Assignment options
     * @returns {Object} Assignment recommendation
     */
    findBestAssignee(task, options = {}) {
        const {
            excludeMembers = [],
            prioritizeGrowth = false,
            urgentMode = false
        } = options;

        const requiredSkills = this._extractRequiredSkills(task);
        const members = teamIntelligence.getAllMembers()
            .filter(m => !excludeMembers.includes(m.id));

        if (members.length === 0) {
            return { found: false, reason: 'No team members available' };
        }

        // Score each member
        const candidates = members.map(member => {
            const skillScore = this._calculateSkillMatch(member.skills, requiredSkills);
            const availabilityScore = member.availability;
            const workloadScore = 1 - member.workload;
            const growthScore = this._calculateGrowthOpportunity(member, requiredSkills);

            // Adjust weights based on options
            let weights = { ...this.config };
            if (urgentMode) {
                weights.availabilityWeight = 0.4;
                weights.skillMatchWeight = 0.4;
                weights.workloadWeight = 0.15;
                weights.growthWeight = 0.05;
            } else if (prioritizeGrowth) {
                weights.growthWeight = 0.3;
                weights.skillMatchWeight = 0.25;
            }

            const totalScore =
                skillScore * weights.skillMatchWeight +
                availabilityScore * weights.availabilityWeight +
                workloadScore * weights.workloadWeight +
                growthScore * weights.growthWeight;

            return {
                member,
                scores: {
                    skill: skillScore,
                    availability: availabilityScore,
                    workload: workloadScore,
                    growth: growthScore,
                    total: totalScore
                },
                isGrowthOpportunity: growthScore > 0.5 && skillScore < 0.7
            };
        });

        // Filter by minimum skill match
        const qualifiedCandidates = candidates.filter(c =>
            c.scores.skill >= this.config.minSkillMatch || c.isGrowthOpportunity
        );

        if (qualifiedCandidates.length === 0) {
            return {
                found: false,
                reason: 'No qualified team members for required skills',
                requiredSkills,
                suggestion: 'Consider training or external help'
            };
        }

        // Sort by total score
        qualifiedCandidates.sort((a, b) => b.scores.total - a.scores.total);

        const best = qualifiedCandidates[0];
        const alternatives = qualifiedCandidates.slice(1, 4);

        return {
            found: true,
            recommended: {
                memberId: best.member.id,
                name: best.member.name,
                matchScore: best.scores.total,
                reasoning: this._generateReasoning(best, requiredSkills)
            },
            alternatives: alternatives.map(a => ({
                memberId: a.member.id,
                name: a.member.name,
                matchScore: a.scores.total
            })),
            isGrowthAssignment: best.isGrowthOpportunity,
            requiredSkills
        };
    }

    _extractRequiredSkills(task) {
        const skills = new Set();
        const text = `${task.title || ''} ${task.description || ''} ${(task.tags || []).join(' ')}`.toLowerCase();

        // Common skill keywords
        const skillPatterns = {
            'javascript': ['javascript', 'js', 'node', 'react', 'vue', 'angular'],
            'python': ['python', 'django', 'flask', 'pandas'],
            'design': ['design', 'ui', 'ux', 'figma', 'sketch', 'mockup'],
            'backend': ['backend', 'api', 'database', 'server', 'sql'],
            'frontend': ['frontend', 'css', 'html', 'web'],
            'devops': ['devops', 'deploy', 'ci/cd', 'docker', 'kubernetes'],
            'testing': ['test', 'qa', 'quality', 'testing'],
            'documentation': ['document', 'doc', 'write', 'content'],
            'management': ['manage', 'coordinate', 'lead', 'plan'],
            'analysis': ['analyze', 'analysis', 'data', 'research']
        };

        for (const [skill, keywords] of Object.entries(skillPatterns)) {
            if (keywords.some(kw => text.includes(kw))) {
                skills.add(skill);
            }
        }

        // Add explicit skills from task
        if (task.requiredSkills) {
            task.requiredSkills.forEach(s => skills.add(s.toLowerCase()));
        }

        return Array.from(skills);
    }

    _calculateSkillMatch(memberSkills, requiredSkills) {
        if (requiredSkills.length === 0) return 0.5; // No specific skills needed

        const memberSkillsLower = memberSkills.map(s => s.toLowerCase());
        const matches = requiredSkills.filter(skill =>
            memberSkillsLower.some(ms => ms.includes(skill) || skill.includes(ms))
        );

        return matches.length / requiredSkills.length;
    }

    _calculateGrowthOpportunity(member, requiredSkills) {
        if (requiredSkills.length === 0) return 0;

        const memberSkillsLower = member.skills.map(s => s.toLowerCase());

        // Skills that are adjacent to member's skills but not fully mastered
        let growthScore = 0;

        for (const skill of requiredSkills) {
            const hasSkill = memberSkillsLower.some(ms => ms.includes(skill) || skill.includes(ms));
            const hasRelated = this._hasRelatedSkill(memberSkillsLower, skill);

            if (!hasSkill && hasRelated) {
                growthScore += 0.5; // Good growth opportunity
            } else if (!hasSkill && !hasRelated) {
                growthScore += 0.2; // Stretch assignment
            }
        }

        return Math.min(1, growthScore / requiredSkills.length);
    }

    _hasRelatedSkill(memberSkills, targetSkill) {
        const skillRelations = {
            'javascript': ['frontend', 'backend', 'testing'],
            'python': ['backend', 'analysis', 'testing'],
            'design': ['frontend', 'documentation'],
            'frontend': ['design', 'javascript', 'testing'],
            'backend': ['devops', 'database', 'javascript', 'python'],
            'devops': ['backend', 'testing'],
            'testing': ['frontend', 'backend', 'devops'],
            'documentation': ['management', 'analysis'],
            'management': ['documentation', 'analysis'],
            'analysis': ['python', 'documentation', 'management']
        };

        const related = skillRelations[targetSkill] || [];
        return memberSkills.some(ms => related.includes(ms));
    }

    _generateReasoning(candidate, requiredSkills) {
        const reasons = [];

        if (candidate.scores.skill >= 0.8) {
            reasons.push('Strong skill match');
        } else if (candidate.scores.skill >= 0.5) {
            reasons.push('Good skill match');
        }

        if (candidate.scores.availability >= 0.8) {
            reasons.push('Highly available');
        }

        if (candidate.scores.workload <= 0.3) {
            reasons.push('Has capacity');
        }

        if (candidate.isGrowthOpportunity) {
            reasons.push('Growth opportunity');
        }

        return reasons.join(', ') || 'Best available option';
    }

    // ============================================================
    // BULK ASSIGNMENT
    // ============================================================

    /**
     * Assign multiple tasks optimally
     * @param {Array} tasks - Tasks to assign
     * @returns {Array} Assignment recommendations
     */
    bulkAssign(tasks) {
        const assignments = [];
        const memberWorkloads = new Map();

        // Initialize with current workloads
        for (const member of teamIntelligence.getAllMembers()) {
            memberWorkloads.set(member.id, member.workload);
        }

        // Sort tasks by priority (critical first)
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const sortedTasks = [...tasks].sort((a, b) =>
            (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
        );

        for (const task of sortedTasks) {
            // Find best assignee considering already assigned work
            const result = this.findBestAssignee(task, {
                urgentMode: task.priority === 'critical'
            });

            if (result.found) {
                // Update temporary workload
                const currentLoad = memberWorkloads.get(result.recommended.memberId) || 0;
                const taskLoad = (task.estimatedTime || 60) / (8 * 60); // Fraction of a day
                memberWorkloads.set(result.recommended.memberId, currentLoad + taskLoad);

                assignments.push({
                    task: { id: task.id, title: task.title },
                    assignee: result.recommended,
                    isGrowth: result.isGrowthAssignment,
                    alternatives: result.alternatives
                });
            } else {
                assignments.push({
                    task: { id: task.id, title: task.title },
                    assignee: null,
                    reason: result.reason
                });
            }
        }

        return {
            assignments,
            summary: {
                total: tasks.length,
                assigned: assignments.filter(a => a.assignee).length,
                unassigned: assignments.filter(a => !a.assignee).length,
                growthAssignments: assignments.filter(a => a.isGrowth).length
            }
        };
    }

    // ============================================================
    // EXPERTISE GROWTH
    // ============================================================

    /**
     * Suggest skill development assignments
     * @param {string} memberId - Team member ID
     * @param {Array} availableTasks - Available tasks
     * @returns {Array} Growth opportunities
     */
    suggestGrowthTasks(memberId, availableTasks) {
        const member = teamIntelligence.getMember(memberId);
        if (!member) return [];

        const growthTasks = [];

        for (const task of availableTasks) {
            if (task.assignee) continue; // Already assigned

            const requiredSkills = this._extractRequiredSkills(task);
            const growthScore = this._calculateGrowthOpportunity(member, requiredSkills);

            if (growthScore >= 0.3) {
                const newSkills = requiredSkills.filter(skill =>
                    !member.skills.map(s => s.toLowerCase()).includes(skill.toLowerCase())
                );

                growthTasks.push({
                    task: { id: task.id, title: task.title },
                    growthScore,
                    newSkills,
                    recommendation: this._getGrowthRecommendation(growthScore, newSkills)
                });
            }
        }

        return growthTasks.sort((a, b) => b.growthScore - a.growthScore).slice(0, 5);
    }

    _getGrowthRecommendation(score, skills) {
        if (score >= 0.6) {
            return `Great opportunity to learn: ${skills.join(', ')}`;
        } else if (score >= 0.4) {
            return `Stretch assignment with: ${skills.join(', ')}`;
        }
        return `Minor exposure to: ${skills.join(', ')}`;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const skillMatcher = new SkillMatcher();

export function initSkillMatcher() {
    console.log('🎯 [Skill Matcher] Initialized');
    return skillMatcher;
}
