// ============================================================
// SEMANTIC-GROUPER.JS - Semantic Task Grouping
// Phase 6: Context Intelligence
// ============================================================

/**
 * Semantic Grouper - Groups related tasks by meaning and context
 */

export class SemanticGrouper {
    constructor() {
        this.groupCache = new Map();
    }

    // ============================================================
    // SEMANTIC GROUPING
    // ============================================================

    /**
     * Group tasks semantically
     * @param {Array} tasks - Tasks to group
     * @returns {Object} Grouped tasks
     */
    groupTasks(tasks) {
        // Extract features from each task
        const taskFeatures = tasks.map(task => ({
            task,
            features: this._extractFeatures(task)
        }));

        // Find groups
        const groups = this._findGroups(taskFeatures);

        return {
            groups,
            stats: {
                totalTasks: tasks.length,
                groupCount: groups.length,
                averageGroupSize: tasks.length / groups.length
            }
        };
    }

    _extractFeatures(task) {
        const text = `${task.title} ${task.description || ''} ${(task.tags || []).join(' ')}`.toLowerCase();

        return {
            keywords: this._extractKeywords(text),
            domain: this._detectDomain(text),
            actionType: this._detectActionType(text),
            complexity: this._detectComplexity(text),
            project: task.project,
            category: task.category
        };
    }

    _extractKeywords(text) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
            'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'this', 'that', 'these', 'those', 'it', 'its'
        ]);

        return text.split(/\W+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 10);
    }

    _detectDomain(text) {
        const domains = {
            frontend: ['ui', 'css', 'react', 'vue', 'angular', 'html', 'component', 'button', 'form'],
            backend: ['api', 'server', 'database', 'sql', 'query', 'endpoint', 'rest', 'graphql'],
            design: ['design', 'mockup', 'wireframe', 'figma', 'sketch', 'prototype', 'layout'],
            devops: ['deploy', 'ci', 'cd', 'pipeline', 'docker', 'kubernetes', 'aws', 'cloud'],
            testing: ['test', 'spec', 'coverage', 'unit', 'integration', 'e2e', 'qa'],
            docs: ['document', 'readme', 'wiki', 'guide', 'tutorial', 'api doc'],
            planning: ['plan', 'roadmap', 'strategy', 'scope', 'requirements', 'spec']
        };

        for (const [domain, keywords] of Object.entries(domains)) {
            if (keywords.some(kw => text.includes(kw))) {
                return domain;
            }
        }

        return 'general';
    }

    _detectActionType(text) {
        const actionTypes = {
            create: ['create', 'add', 'implement', 'build', 'develop', 'make', 'new'],
            fix: ['fix', 'bug', 'resolve', 'debug', 'patch', 'repair'],
            update: ['update', 'modify', 'change', 'edit', 'revise', 'improve'],
            review: ['review', 'check', 'verify', 'validate', 'approve', 'audit'],
            research: ['research', 'investigate', 'explore', 'analyze', 'study'],
            document: ['document', 'write', 'describe', 'explain'],
            refactor: ['refactor', 'optimize', 'clean', 'reorganize'],
            delete: ['delete', 'remove', 'clean up', 'deprecate']
        };

        for (const [action, keywords] of Object.entries(actionTypes)) {
            if (keywords.some(kw => text.includes(kw))) {
                return action;
            }
        }

        return 'general';
    }

    _detectComplexity(text) {
        const highComplexityWords = ['complex', 'architecture', 'system', 'integration', 'migration', 'refactor'];
        const lowComplexityWords = ['simple', 'quick', 'minor', 'small', 'typo', 'update'];

        if (highComplexityWords.some(w => text.includes(w))) return 'high';
        if (lowComplexityWords.some(w => text.includes(w))) return 'low';
        return 'medium';
    }

    _findGroups(taskFeatures) {
        const groups = new Map();

        for (const { task, features } of taskFeatures) {
            // Find matching group
            let bestGroup = null;
            let bestScore = 0;

            for (const [groupId, group] of groups) {
                const score = this._calculateGroupAffinity(features, group.commonFeatures);
                if (score > bestScore && score >= 0.3) {
                    bestGroup = groupId;
                    bestScore = score;
                }
            }

            if (bestGroup) {
                // Add to existing group
                const group = groups.get(bestGroup);
                group.tasks.push(task);
                this._updateGroupFeatures(group, features);
            } else {
                // Create new group
                const groupId = `group_${groups.size + 1}`;
                groups.set(groupId, {
                    id: groupId,
                    name: this._generateGroupName(features),
                    tasks: [task],
                    commonFeatures: { ...features }
                });
            }
        }

        return Array.from(groups.values());
    }

    _calculateGroupAffinity(features, groupFeatures) {
        let score = 0;
        let factors = 0;

        // Domain match
        if (features.domain === groupFeatures.domain) {
            score += 0.3;
        }
        factors++;

        // Action type match
        if (features.actionType === groupFeatures.actionType) {
            score += 0.2;
        }
        factors++;

        // Project match
        if (features.project && features.project === groupFeatures.project) {
            score += 0.3;
        }
        factors++;

        // Keyword overlap
        const keywords1 = new Set(features.keywords);
        const keywords2 = new Set(groupFeatures.keywords);
        const overlap = [...keywords1].filter(k => keywords2.has(k)).length;
        score += Math.min(0.2, overlap * 0.05);
        factors++;

        return score / factors;
    }

    _updateGroupFeatures(group, newFeatures) {
        // Merge keywords
        const allKeywords = [...group.commonFeatures.keywords, ...newFeatures.keywords];
        group.commonFeatures.keywords = [...new Set(allKeywords)].slice(0, 15);
    }

    _generateGroupName(features) {
        const domainNames = {
            frontend: 'Frontend',
            backend: 'Backend',
            design: 'Design',
            devops: 'DevOps',
            testing: 'Testing',
            docs: 'Documentation',
            planning: 'Planning',
            general: 'General'
        };

        const actionNames = {
            create: 'Creation',
            fix: 'Fixes',
            update: 'Updates',
            review: 'Reviews',
            research: 'Research',
            refactor: 'Refactoring',
            general: 'Tasks'
        };

        const domain = domainNames[features.domain] || 'General';
        const action = actionNames[features.actionType] || 'Tasks';

        return `${domain} ${action}`;
    }

    // ============================================================
    // RELATED TASKS
    // ============================================================

    /**
     * Find tasks related to a given task
     * @param {Object} targetTask - Task to find relations for
     * @param {Array} allTasks - All tasks to search
     * @returns {Array} Related tasks
     */
    findRelatedTasks(targetTask, allTasks) {
        const targetFeatures = this._extractFeatures(targetTask);

        const related = allTasks
            .filter(t => t.id !== targetTask.id)
            .map(task => {
                const features = this._extractFeatures(task);
                const similarity = this._calculateSimilarity(targetFeatures, features);
                return { task, similarity };
            })
            .filter(r => r.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);

        return related.map(r => ({
            ...r.task,
            relationStrength: r.similarity,
            relationReason: this._getRelationReason(targetFeatures, this._extractFeatures(r.task))
        }));
    }

    _calculateSimilarity(features1, features2) {
        let similarity = 0;

        if (features1.domain === features2.domain) similarity += 0.25;
        if (features1.actionType === features2.actionType) similarity += 0.2;
        if (features1.project === features2.project) similarity += 0.25;
        if (features1.category === features2.category) similarity += 0.15;

        // Keyword overlap
        const keywords1 = new Set(features1.keywords);
        const keywords2 = new Set(features2.keywords);
        const overlap = [...keywords1].filter(k => keywords2.has(k)).length;
        similarity += Math.min(0.15, overlap * 0.03);

        return similarity;
    }

    _getRelationReason(features1, features2) {
        if (features1.project === features2.project) return 'Same project';
        if (features1.domain === features2.domain) return `Same domain (${features1.domain})`;
        if (features1.actionType === features2.actionType) return `Similar action (${features1.actionType})`;
        return 'Similar keywords';
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const semanticGrouper = new SemanticGrouper();

export function initSemanticGrouper() {
    console.log('🧩 [Semantic Grouper] Initialized');
    return semanticGrouper;
}
