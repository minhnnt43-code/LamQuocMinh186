// ============================================================
// PROJECT-ORGANIZER.JS - Intelligent Project Organization
// Phase 6: Context Intelligence
// ============================================================

/**
 * Project Organizer - Organizes and manages project structures
 */

export class ProjectOrganizer {
    constructor() {
        this.projects = new Map();
        this.autoCategories = ['development', 'design', 'marketing', 'operations', 'personal'];
    }

    // ============================================================
    // PROJECT MANAGEMENT
    // ============================================================

    /**
     * Auto-organize tasks into projects
     * @param {Array} tasks - Tasks to organize
     * @returns {Object} Organization result
     */
    autoOrganize(tasks) {
        const organized = {
            byProject: {},
            byCategory: {},
            uncategorized: []
        };

        for (const task of tasks) {
            // Detect project
            const project = task.project || this._detectProject(task);

            // Detect category
            const category = task.category || this._detectCategory(task);

            // Group by project
            if (project) {
                if (!organized.byProject[project]) {
                    organized.byProject[project] = [];
                }
                organized.byProject[project].push({ ...task, detectedProject: project });
            }

            // Group by category
            if (category) {
                if (!organized.byCategory[category]) {
                    organized.byCategory[category] = [];
                }
                organized.byCategory[category].push({ ...task, detectedCategory: category });
            }

            // Track uncategorized
            if (!project && !category) {
                organized.uncategorized.push(task);
            }
        }

        return {
            ...organized,
            stats: {
                totalTasks: tasks.length,
                projectCount: Object.keys(organized.byProject).length,
                categoryCount: Object.keys(organized.byCategory).length,
                uncategorizedCount: organized.uncategorized.length
            },
            suggestions: this._generateOrganizationSuggestions(organized)
        };
    }

    _detectProject(task) {
        const text = `${task.title} ${task.description || ''}`.toLowerCase();

        // Look for project patterns
        const projectPatterns = [
            /\[([^\]]+)\]/, // [ProjectName]
            /^([A-Z]{2,5})-\d+/, // PROJ-123 format
            /#(\w+)/, // #project tag
        ];

        for (const pattern of projectPatterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    _detectCategory(task) {
        const text = `${task.title} ${task.description || ''} ${(task.tags || []).join(' ')}`.toLowerCase();

        const categoryKeywords = {
            development: ['code', 'develop', 'implement', 'fix', 'bug', 'feature', 'api', 'database'],
            design: ['design', 'ui', 'ux', 'mockup', 'wireframe', 'figma', 'sketch'],
            marketing: ['marketing', 'campaign', 'social', 'content', 'seo', 'analytics'],
            operations: ['process', 'workflow', 'system', 'admin', 'infrastructure'],
            meeting: ['meeting', 'call', 'sync', 'standup', 'review'],
            documentation: ['document', 'doc', 'write', 'readme', 'wiki'],
            personal: ['personal', 'learning', 'training', 'career']
        };

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(kw => text.includes(kw))) {
                return category;
            }
        }

        return null;
    }

    _generateOrganizationSuggestions(organized) {
        const suggestions = [];

        // Too many uncategorized
        if (organized.uncategorized.length > 5) {
            suggestions.push({
                type: 'categorize',
                message: `${organized.uncategorized.length} tasks need categorization`,
                action: 'Review and assign projects/categories'
            });
        }

        // Large project groups
        for (const [project, tasks] of Object.entries(organized.byProject)) {
            if (tasks.length > 15) {
                suggestions.push({
                    type: 'split',
                    message: `Project "${project}" has ${tasks.length} tasks`,
                    action: 'Consider breaking into sub-projects'
                });
            }
        }

        return suggestions;
    }

    // ============================================================
    // PROJECT HEALTH
    // ============================================================

    /**
     * Analyze project health
     * @param {string} projectId - Project ID
     * @param {Array} projectTasks - Tasks in project
     * @returns {Object} Health analysis
     */
    analyzeProjectHealth(projectId, projectTasks) {
        const completed = projectTasks.filter(t => t.status === 'completed');
        const inProgress = projectTasks.filter(t => t.status === 'in_progress');
        const blocked = projectTasks.filter(t => t.status === 'blocked');
        const pending = projectTasks.filter(t => t.status === 'pending' || !t.status);

        // Calculate health score
        let healthScore = 0.5;

        // Progress factor
        const progressRatio = completed.length / projectTasks.length;
        healthScore += progressRatio * 0.2;

        // Blocked factor (negative)
        const blockedRatio = blocked.length / projectTasks.length;
        healthScore -= blockedRatio * 0.3;

        // Overdue factor (negative)
        const overdue = projectTasks.filter(t =>
            t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'
        );
        healthScore -= (overdue.length / projectTasks.length) * 0.2;

        return {
            projectId,
            healthScore: Math.max(0, Math.min(1, healthScore)),
            status: healthScore >= 0.7 ? 'healthy' : healthScore >= 0.4 ? 'at_risk' : 'critical',
            breakdown: {
                total: projectTasks.length,
                completed: completed.length,
                inProgress: inProgress.length,
                blocked: blocked.length,
                pending: pending.length,
                overdue: overdue.length
            },
            completionRate: Math.round(progressRatio * 100),
            recommendations: this._getProjectRecommendations(healthScore, blocked, overdue)
        };
    }

    _getProjectRecommendations(health, blocked, overdue) {
        const recs = [];

        if (blocked.length > 0) {
            recs.push({
                priority: 'high',
                action: `Unblock ${blocked.length} blocked tasks`,
                tasks: blocked.map(t => t.title)
            });
        }

        if (overdue.length > 0) {
            recs.push({
                priority: 'high',
                action: `Address ${overdue.length} overdue tasks`,
                tasks: overdue.map(t => t.title)
            });
        }

        if (health < 0.4) {
            recs.push({
                priority: 'medium',
                action: 'Consider project scope review'
            });
        }

        return recs;
    }

    // ============================================================
    // PROJECT VIEWS
    // ============================================================

    /**
     * Get project summary
     * @param {Array} allTasks - All tasks
     * @returns {Array} Project summaries
     */
    getProjectSummaries(allTasks) {
        const organized = this.autoOrganize(allTasks);

        return Object.entries(organized.byProject).map(([project, tasks]) => {
            const health = this.analyzeProjectHealth(project, tasks);
            return {
                name: project,
                ...health
            };
        }).sort((a, b) => a.healthScore - b.healthScore); // Show struggling projects first
    }

    /**
     * Create new project
     * @param {Object} projectData - Project definition
     * @returns {Object} Created project
     */
    createProject(projectData) {
        const project = {
            id: projectData.id || `proj_${Date.now()}`,
            name: projectData.name,
            description: projectData.description || '',
            category: projectData.category,
            createdAt: new Date().toISOString(),
            status: 'active',
            goals: projectData.goals || [],
            milestones: projectData.milestones || []
        };

        this.projects.set(project.id, project);
        return project;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const projectOrganizer = new ProjectOrganizer();

export function initProjectOrganizer() {
    console.log('📁 [Project Organizer] Initialized');
    return projectOrganizer;
}
