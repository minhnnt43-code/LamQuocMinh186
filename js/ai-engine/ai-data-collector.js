// ============================================================
// AI-DATA-COLLECTOR.JS - Behavior Data Collection
// Phase 1: Foundation & Core Intelligence
// ============================================================

/**
 * Data Collector - Collects and stores user behavior data for AI learning
 */

export class DataCollector {
    constructor(userProfile, patternStore) {
        this.userProfile = userProfile;
        this.patternStore = patternStore;

        // Collection settings
        this.settings = {
            enabled: true,
            maxDataPoints: 10000,
            retentionDays: 90,
            batchSize: 10,
            flushInterval: 60000 // 1 minute
        };

        // Pending data to be saved
        this.pendingEvents = [];
        this.pendingBehaviors = [];

        // Session tracking
        this.sessionStart = new Date();
        this.sessionId = this._generateSessionId();

        // Start auto-flush
        this._startAutoFlush();
    }

    // ============================================================
    // EVENT TRACKING
    // ============================================================

    /**
     * Track a task event
     * @param {string} eventType - Type of event
     * @param {Object} task - Task object
     * @param {Object} metadata - Additional metadata
     */
    trackEvent(eventType, task, metadata = {}) {
        if (!this.settings.enabled) return;

        const event = {
            type: eventType,
            taskId: task?.id,
            taskTitle: task?.title?.substring(0, 100), // Truncate for privacy
            taskCategory: task?.category,
            taskPriority: task?.priority,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            ...this._enrichEventData(eventType, task, metadata)
        };

        this.pendingEvents.push(event);

        // Process immediately for important events
        if (this._isImportantEvent(eventType)) {
            this._processEvent(event);
        }

        // Check if batch is full
        if (this.pendingEvents.length >= this.settings.batchSize) {
            this._flushEvents();
        }
    }

    _enrichEventData(eventType, task, metadata) {
        const enriched = { ...metadata };
        const now = new Date();

        // Add time context
        enriched.dayOfWeek = now.getDay();
        enriched.hourOfDay = now.getHours();
        enriched.isWeekend = now.getDay() === 0 || now.getDay() === 6;

        // Event-specific enrichment
        switch (eventType) {
            case 'task_completed':
                if (task.createdAt) {
                    enriched.completionDays = (now - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);
                }
                if (task.estimatedTime && metadata.actualTime) {
                    enriched.estimationAccuracy = metadata.actualTime / task.estimatedTime;
                }
                if (task.deadline) {
                    enriched.completedOnTime = now <= new Date(task.deadline);
                }
                break;

            case 'task_started':
                if (task.createdAt) {
                    enriched.waitDays = (now - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);
                }
                break;

            case 'focus_session_end':
                enriched.sessionDuration = metadata.duration || 0;
                enriched.interruptions = metadata.interruptions || 0;
                enriched.productivity = metadata.tasksCompleted || 0;
                break;
        }

        return enriched;
    }

    _isImportantEvent(eventType) {
        return ['task_completed', 'focus_session_end'].includes(eventType);
    }

    _processEvent(event) {
        // Update real-time patterns
        switch (event.type) {
            case 'task_completed':
                this._updateCompletionPatterns(event);
                break;
            case 'task_started':
                this._updateStartPatterns(event);
                break;
            case 'focus_session_end':
                this._updateFocusPatterns(event);
                break;
        }
    }

    _updateCompletionPatterns(event) {
        // Update completions by hour
        const hourData = this.patternStore.get('completions_by_hour') || {};
        const hour = event.hourOfDay;
        if (!hourData[hour]) hourData[hour] = [];
        hourData[hour].push({
            quality: event.completedOnTime ? 1 : 0.5,
            category: event.taskCategory,
            timestamp: event.timestamp
        });
        // Keep last 100 per hour
        if (hourData[hour].length > 100) hourData[hour].shift();
        this.patternStore.set('completions_by_hour', hourData);

        // Update estimation accuracy
        if (event.estimationAccuracy) {
            const accuracyData = this.patternStore.get('estimation_accuracy') || [];
            accuracyData.push({
                accuracy: 1 - Math.abs(event.estimationAccuracy - 1),
                ratio: event.estimationAccuracy,
                category: event.taskCategory,
                timestamp: event.timestamp
            });
            // Keep last 500
            if (accuracyData.length > 500) accuracyData.shift();
            this.patternStore.set('estimation_accuracy', accuracyData);
        }

        // Update completed tasks log
        const completedTasks = this.patternStore.get('completed_tasks') || [];
        completedTasks.push({
            category: event.taskCategory,
            priority: event.taskPriority,
            estimatedTime: event.estimatedTime,
            actualTime: event.actualTime,
            completionDays: event.completionDays,
            completedAt: event.timestamp
        });
        if (completedTasks.length > 1000) completedTasks.shift();
        this.patternStore.set('completed_tasks', completedTasks);
    }

    _updateStartPatterns(event) {
        // Track when tasks are started
        const startPatterns = this.patternStore.get('task_start_patterns') || {};
        const hour = event.hourOfDay;
        if (!startPatterns[hour]) startPatterns[hour] = 0;
        startPatterns[hour]++;
        this.patternStore.set('task_start_patterns', startPatterns);
    }

    _updateFocusPatterns(event) {
        // Update focus quality by hour
        const focusData = this.patternStore.get('focus_quality_by_hour') || {};
        const hour = event.hourOfDay;
        if (!focusData[hour]) focusData[hour] = [];

        const focusScore = event.interruptions > 0
            ? Math.max(0, 1 - (event.interruptions * 0.1))
            : 1;

        focusData[hour].push({
            score: focusScore,
            duration: event.sessionDuration,
            productivity: event.productivity,
            timestamp: event.timestamp
        });

        if (focusData[hour].length > 100) focusData[hour].shift();
        this.patternStore.set('focus_quality_by_hour', focusData);
    }

    // ============================================================
    // BEHAVIOR TRACKING
    // ============================================================

    /**
     * Track user behavior
     * @param {string} behaviorType - Type of behavior
     * @param {Object} data - Behavior data
     */
    trackBehavior(behaviorType, data = {}) {
        if (!this.settings.enabled) return;

        const behavior = {
            type: behaviorType,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            dayOfWeek: new Date().getDay(),
            hourOfDay: new Date().getHours(),
            ...data
        };

        this.pendingBehaviors.push(behavior);

        // Process specific behaviors immediately
        this._processBehavior(behavior);

        if (this.pendingBehaviors.length >= this.settings.batchSize) {
            this._flushBehaviors();
        }
    }

    _processBehavior(behavior) {
        switch (behavior.type) {
            case 'section_view':
                this._updateSectionViewPatterns(behavior);
                break;
            case 'app_open':
                this._updateAppUsagePatterns(behavior);
                break;
            case 'energy_level':
                this._updateEnergyPatterns(behavior);
                break;
        }
    }

    _updateSectionViewPatterns(behavior) {
        const viewPatterns = this.patternStore.get('section_view_patterns') || {};
        const section = behavior.section;
        if (!viewPatterns[section]) {
            viewPatterns[section] = { count: 0, byHour: {} };
        }
        viewPatterns[section].count++;
        const hour = behavior.hourOfDay;
        viewPatterns[section].byHour[hour] = (viewPatterns[section].byHour[hour] || 0) + 1;
        this.patternStore.set('section_view_patterns', viewPatterns);
    }

    _updateAppUsagePatterns(behavior) {
        const usagePatterns = this.patternStore.get('app_usage_patterns') || {
            byHour: {},
            byDay: {},
            sessions: []
        };

        const hour = behavior.hourOfDay;
        const day = behavior.dayOfWeek;

        usagePatterns.byHour[hour] = (usagePatterns.byHour[hour] || 0) + 1;
        usagePatterns.byDay[day] = (usagePatterns.byDay[day] || 0) + 1;
        usagePatterns.sessions.push({
            start: behavior.timestamp,
            hour,
            day
        });

        if (usagePatterns.sessions.length > 500) usagePatterns.sessions.shift();
        this.patternStore.set('app_usage_patterns', usagePatterns);
    }

    _updateEnergyPatterns(behavior) {
        const energyPatterns = this.patternStore.get('energy_patterns') || {};
        const hour = behavior.hourOfDay;

        if (!energyPatterns[hour]) {
            energyPatterns[hour] = { levels: [], avgLevel: 0 };
        }

        const levelNum = { peak: 4, high: 3, medium: 2, low: 1 }[behavior.level] || 2;
        energyPatterns[hour].levels.push(levelNum);

        if (energyPatterns[hour].levels.length > 50) {
            energyPatterns[hour].levels.shift();
        }

        // Recalculate average
        energyPatterns[hour].avgLevel =
            energyPatterns[hour].levels.reduce((a, b) => a + b, 0) /
            energyPatterns[hour].levels.length;

        this.patternStore.set('energy_patterns', energyPatterns);
    }

    // ============================================================
    // SESSION MANAGEMENT
    // ============================================================

    /**
     * End current session and save data
     */
    endSession() {
        const sessionDuration = (new Date() - this.sessionStart) / 1000 / 60; // minutes

        this.trackBehavior('session_end', {
            duration: sessionDuration,
            eventsCount: this.pendingEvents.length,
            behaviorsCount: this.pendingBehaviors.length
        });

        this._flushAll();
    }

    // ============================================================
    // DATA MANAGEMENT
    // ============================================================

    _flushEvents() {
        if (this.pendingEvents.length === 0) return;

        // Store events
        const allEvents = this.patternStore.get('raw_events') || [];
        allEvents.push(...this.pendingEvents);

        // Trim to max size
        while (allEvents.length > this.settings.maxDataPoints) {
            allEvents.shift();
        }

        this.patternStore.set('raw_events', allEvents);
        this.pendingEvents = [];
    }

    _flushBehaviors() {
        if (this.pendingBehaviors.length === 0) return;

        const allBehaviors = this.patternStore.get('raw_behaviors') || [];
        allBehaviors.push(...this.pendingBehaviors);

        while (allBehaviors.length > this.settings.maxDataPoints) {
            allBehaviors.shift();
        }

        this.patternStore.set('raw_behaviors', allBehaviors);
        this.pendingBehaviors = [];
    }

    _flushAll() {
        this._flushEvents();
        this._flushBehaviors();
    }

    _startAutoFlush() {
        this.flushInterval = setInterval(() => {
            this._flushAll();
        }, this.settings.flushInterval);
    }

    _stopAutoFlush() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
    }

    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get total data points collected
     * @returns {number}
     */
    getCount() {
        const events = this.patternStore.get('raw_events') || [];
        const behaviors = this.patternStore.get('raw_behaviors') || [];
        return events.length + behaviors.length;
    }

    /**
     * Clean old data
     */
    cleanOldData() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.settings.retentionDays);

        // Clean events
        const events = this.patternStore.get('raw_events') || [];
        const filteredEvents = events.filter(e => new Date(e.timestamp) > cutoff);
        this.patternStore.set('raw_events', filteredEvents);

        // Clean behaviors
        const behaviors = this.patternStore.get('raw_behaviors') || [];
        const filteredBehaviors = behaviors.filter(b => new Date(b.timestamp) > cutoff);
        this.patternStore.set('raw_behaviors', filteredBehaviors);

        console.log(`[DataCollector] Cleaned ${events.length - filteredEvents.length} events, ${behaviors.length - filteredBehaviors.length} behaviors`);
    }

    /**
     * Export collected data for analysis
     * @returns {Object}
     */
    exportData() {
        return {
            events: this.patternStore.get('raw_events') || [],
            behaviors: this.patternStore.get('raw_behaviors') || [],
            patterns: {
                completionsByHour: this.patternStore.get('completions_by_hour'),
                focusByHour: this.patternStore.get('focus_quality_by_hour'),
                estimationAccuracy: this.patternStore.get('estimation_accuracy'),
                energyPatterns: this.patternStore.get('energy_patterns'),
                appUsage: this.patternStore.get('app_usage_patterns')
            }
        };
    }
}
