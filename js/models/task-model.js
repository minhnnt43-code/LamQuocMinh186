// ============================================================
// TASK-MODEL.JS - Enhanced Task Data Model
// Phase 1: Foundation & Core Intelligence
// ============================================================

/**
 * Enhanced Task Model with AI-ready properties
 */

// ============================================================
// TASK CLASS
// ============================================================

export class Task {
    constructor(data = {}) {
        // Core properties
        this.id = data.id || this._generateId();
        this.title = data.title || '';
        this.description = data.description || '';
        this.status = data.status || 'pending'; // pending, in_progress, completed, cancelled

        // Time properties
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.startedAt = data.startedAt || null;
        this.completedAt = data.completedAt || null;
        this.deadline = data.deadline || null;

        // Estimation
        this.estimatedTime = data.estimatedTime || null; // minutes
        this.actualTime = data.actualTime || null; // minutes

        // Classification
        this.priority = data.priority || 'medium'; // low, medium, high, critical
        this.category = data.category || null;
        this.project = data.project || null;
        this.tags = data.tags || [];

        // Progress
        this.progress = data.progress || 0; // 0-100
        this.subtasks = data.subtasks || [];

        // Dependencies
        this.dependencies = data.dependencies || []; // task IDs this depends on
        this.blockedBy = data.blockedBy || []; // resolved dependencies

        // AI Properties
        this.aiPriority = data.aiPriority || null; // AI-calculated priority
        this.aiPrediction = data.aiPrediction || null; // AI predictions
        this.aiSuggestions = data.aiSuggestions || []; // AI suggestions

        // Context
        this.context = data.context || {};
        this.source = data.source || 'manual'; // manual, email, meeting, ai

        // Recurrence
        this.recurring = data.recurring || null;
        this.parentTaskId = data.parentTaskId || null;
    }

    _generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ============================================================
    // STATUS METHODS
    // ============================================================

    start() {
        this.status = 'in_progress';
        this.startedAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        return this;
    }

    complete(actualTime = null) {
        this.status = 'completed';
        this.completedAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        this.progress = 100;

        if (actualTime) {
            this.actualTime = actualTime;
        } else if (this.startedAt) {
            // Calculate from start time
            const start = new Date(this.startedAt);
            const end = new Date();
            this.actualTime = Math.round((end - start) / (1000 * 60)); // minutes
        }

        return this;
    }

    cancel() {
        this.status = 'cancelled';
        this.updatedAt = new Date().toISOString();
        return this;
    }

    updateProgress(progress) {
        this.progress = Math.max(0, Math.min(100, progress));
        this.updatedAt = new Date().toISOString();
        return this;
    }

    // ============================================================
    // VALIDATION
    // ============================================================

    isValid() {
        return this.title && this.title.trim().length > 0;
    }

    isOverdue() {
        if (!this.deadline) return false;
        if (this.status === 'completed' || this.status === 'cancelled') return false;
        return new Date() > new Date(this.deadline);
    }

    isBlocked() {
        return this.dependencies.length > 0 &&
            this.dependencies.some(depId => !this.blockedBy.includes(depId));
    }

    isStale() {
        const daysSinceUpdate = (new Date() - new Date(this.updatedAt)) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate > 7 && this.status !== 'completed';
    }

    // ============================================================
    // AI HELPERS
    // ============================================================

    /**
     * Get task complexity estimation
     * @returns {string} low, medium, high
     */
    getComplexity() {
        const text = `${this.title} ${this.description}`.toLowerCase();

        const complexIndicators = ['complex', 'difficult', 'research', 'design', 'architecture'];
        const simpleIndicators = ['simple', 'quick', 'easy', 'update', 'minor'];

        if (complexIndicators.some(w => text.includes(w))) return 'high';
        if (simpleIndicators.some(w => text.includes(w))) return 'low';
        if (this.estimatedTime && this.estimatedTime >= 120) return 'high';
        if (this.estimatedTime && this.estimatedTime <= 15) return 'low';

        return 'medium';
    }

    /**
     * Get task type for AI categorization
     * @returns {string}
     */
    getTaskType() {
        const text = `${this.title} ${this.description}`.toLowerCase();

        const typePatterns = {
            creative: ['design', 'write', 'create', 'draft', 'compose'],
            technical: ['code', 'develop', 'fix', 'debug', 'implement', 'build'],
            admin: ['email', 'call', 'schedule', 'organize', 'file'],
            review: ['review', 'check', 'verify', 'approve', 'assess'],
            planning: ['plan', 'strategy', 'research', 'analyze']
        };

        for (const [type, words] of Object.entries(typePatterns)) {
            if (words.some(w => text.includes(w))) return type;
        }

        return 'general';
    }

    /**
     * Get time until deadline
     * @returns {Object|null}
     */
    getTimeUntilDeadline() {
        if (!this.deadline) return null;

        const now = new Date();
        const deadline = new Date(this.deadline);
        const diff = deadline - now;

        if (diff < 0) {
            return {
                overdue: true,
                hours: Math.abs(Math.floor(diff / (1000 * 60 * 60))),
                days: Math.abs(Math.floor(diff / (1000 * 60 * 60 * 24)))
            };
        }

        return {
            overdue: false,
            hours: Math.floor(diff / (1000 * 60 * 60)),
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            urgent: diff < (24 * 60 * 60 * 1000) // Less than 24 hours
        };
    }

    /**
     * Get AI-ready data object
     * @returns {Object}
     */
    toAIData() {
        return {
            id: this.id,
            title: this.title,
            complexity: this.getComplexity(),
            taskType: this.getTaskType(),
            priority: this.priority,
            status: this.status,
            progress: this.progress,
            estimatedTime: this.estimatedTime,
            hasDeadline: !!this.deadline,
            isOverdue: this.isOverdue(),
            isBlocked: this.isBlocked(),
            isStale: this.isStale(),
            dependencyCount: this.dependencies.length,
            subtaskCount: this.subtasks.length,
            category: this.category,
            tags: this.tags,
            timeUntilDeadline: this.getTimeUntilDeadline()
        };
    }

    // ============================================================
    // SERIALIZATION
    // ============================================================

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            deadline: this.deadline,
            estimatedTime: this.estimatedTime,
            actualTime: this.actualTime,
            priority: this.priority,
            category: this.category,
            project: this.project,
            tags: this.tags,
            progress: this.progress,
            subtasks: this.subtasks,
            dependencies: this.dependencies,
            blockedBy: this.blockedBy,
            aiPriority: this.aiPriority,
            aiPrediction: this.aiPrediction,
            aiSuggestions: this.aiSuggestions,
            context: this.context,
            source: this.source,
            recurring: this.recurring,
            parentTaskId: this.parentTaskId
        };
    }

    static fromJSON(json) {
        return new Task(json);
    }
}

// ============================================================
// TASK COLLECTION HELPERS
// ============================================================

export const TaskFilters = {
    pending: (t) => t.status === 'pending',
    inProgress: (t) => t.status === 'in_progress',
    completed: (t) => t.status === 'completed',
    overdue: (t) => t.isOverdue(),
    blocked: (t) => t.isBlocked(),
    stale: (t) => t.isStale(),
    highPriority: (t) => t.priority === 'high' || t.priority === 'critical',
    dueToday: (t) => {
        if (!t.deadline) return false;
        const today = new Date().toDateString();
        return new Date(t.deadline).toDateString() === today;
    },
    dueThisWeek: (t) => {
        if (!t.deadline) return false;
        const deadline = new Date(t.deadline);
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + (7 - now.getDay()));
        return deadline <= weekEnd && deadline >= now;
    }
};

export const TaskSorters = {
    byDeadline: (a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
    },
    byPriority: (a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    },
    byCreatedAt: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    byUpdatedAt: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    byAIPriority: (a, b) => (b.aiPriority?.score || 0) - (a.aiPriority?.score || 0)
};
