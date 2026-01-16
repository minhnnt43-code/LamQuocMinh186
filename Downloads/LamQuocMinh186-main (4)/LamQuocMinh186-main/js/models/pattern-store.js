// ============================================================
// PATTERN-STORE.JS - Learned Patterns Storage
// Phase 1: Foundation & Core Intelligence
// ============================================================

/**
 * Pattern Store - Stores learned patterns from user behavior
 * Provides fast access for AI predictions
 */

export class PatternStore {
    constructor(userId) {
        this.userId = userId;
        this.loaded = false;

        // Pattern storage
        this.patterns = new Map();

        // Pattern metadata
        this.metadata = {
            lastUpdated: null,
            patternCount: 0,
            version: 1
        };

        // Default patterns structure
        this._initializeDefaultPatterns();
    }

    _initializeDefaultPatterns() {
        // Time-based patterns
        this.patterns.set('completions_by_hour', {});
        this.patterns.set('focus_quality_by_hour', {});
        this.patterns.set('task_start_patterns', {});

        // Performance patterns
        this.patterns.set('estimation_accuracy', []);
        this.patterns.set('completed_tasks', []);
        this.patterns.set('task_type_performance', {});
        this.patterns.set('day_of_week_performance', {});

        // Behavior patterns
        this.patterns.set('procrastination_patterns', []);
        this.patterns.set('completion_velocity', []);
        this.patterns.set('energy_patterns', {});
        this.patterns.set('app_usage_patterns', {});
        this.patterns.set('section_view_patterns', {});

        // Learning data
        this.patterns.set('prediction_outcomes', []);
        this.patterns.set('similar_task_outcomes', []);

        // Raw data (for reprocessing)
        this.patterns.set('raw_events', []);
        this.patterns.set('raw_behaviors', []);
    }

    // ============================================================
    // LOADING & SAVING
    // ============================================================

    /**
     * Load patterns from user data
     * @param {Object} userData
     */
    async load(userData) {
        if (userData?.aiPatterns) {
            for (const [key, value] of Object.entries(userData.aiPatterns)) {
                this.patterns.set(key, value);
            }
            this.metadata = userData.aiPatternsMetadata || this.metadata;
        }

        this.loaded = true;
        this._updateMetadata();
    }

    /**
     * Export patterns for saving
     * @returns {Object}
     */
    export() {
        const exported = {};
        for (const [key, value] of this.patterns) {
            exported[key] = value;
        }
        return exported;
    }

    /**
     * Export metadata
     * @returns {Object}
     */
    exportMetadata() {
        return this.metadata;
    }

    // ============================================================
    // PATTERN ACCESS
    // ============================================================

    /**
     * Get a pattern by key
     * @param {string} key
     * @returns {*}
     */
    get(key) {
        return this.patterns.get(key);
    }

    /**
     * Set a pattern
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
        this.patterns.set(key, value);
        this._updateMetadata();
    }

    /**
     * Add to a pattern array
     * @param {string} key
     * @param {*} item
     * @param {number} maxSize - Maximum array size
     */
    addToArray(key, item, maxSize = 500) {
        let arr = this.patterns.get(key);
        if (!Array.isArray(arr)) {
            arr = [];
            this.patterns.set(key, arr);
        }

        arr.push(item);

        // Trim if too large
        if (arr.length > maxSize) {
            arr.shift();
        }

        this._updateMetadata();
    }

    /**
     * Update a nested pattern value
     * @param {string} key
     * @param {string} nestedKey
     * @param {*} value
     */
    setNested(key, nestedKey, value) {
        let obj = this.patterns.get(key);
        if (typeof obj !== 'object' || Array.isArray(obj)) {
            obj = {};
            this.patterns.set(key, obj);
        }

        obj[nestedKey] = value;
        this._updateMetadata();
    }

    /**
     * Get a nested pattern value
     * @param {string} key
     * @param {string} nestedKey
     * @returns {*}
     */
    getNested(key, nestedKey) {
        const obj = this.patterns.get(key);
        return obj?.[nestedKey];
    }

    /**
     * Add a pattern with automatic key generation
     * @param {string} category
     * @param {Object} pattern
     */
    addPattern(category, pattern) {
        this.addToArray(category, {
            ...pattern,
            id: this._generatePatternId(),
            createdAt: new Date().toISOString()
        });
    }

    // ============================================================
    // PATTERN ANALYSIS
    // ============================================================

    /**
     * Get pattern statistics
     * @returns {Object}
     */
    getStats() {
        const stats = {
            totalPatterns: 0,
            patternsByCategory: {}
        };

        for (const [key, value] of this.patterns) {
            if (Array.isArray(value)) {
                stats.totalPatterns += value.length;
                stats.patternsByCategory[key] = value.length;
            } else if (typeof value === 'object') {
                const count = Object.keys(value).length;
                stats.totalPatterns += count;
                stats.patternsByCategory[key] = count;
            }
        }

        return stats;
    }

    /**
     * Get pattern count
     * @returns {number}
     */
    count() {
        return this.metadata.patternCount;
    }

    /**
     * Find patterns matching criteria
     * @param {string} category
     * @param {Function} predicate
     * @returns {Array}
     */
    find(category, predicate) {
        const patterns = this.patterns.get(category);
        if (!Array.isArray(patterns)) return [];
        return patterns.filter(predicate);
    }

    /**
     * Get recent patterns
     * @param {string} category
     * @param {number} count
     * @returns {Array}
     */
    getRecent(category, count = 10) {
        const patterns = this.patterns.get(category);
        if (!Array.isArray(patterns)) return [];
        return patterns.slice(-count);
    }

    // ============================================================
    // PATTERN MAINTENANCE
    // ============================================================

    /**
     * Clean old patterns
     * @param {number} retentionDays
     */
    cleanOld(retentionDays = 90) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);

        let cleaned = 0;

        for (const [key, value] of this.patterns) {
            if (Array.isArray(value)) {
                const before = value.length;
                const filtered = value.filter(item => {
                    const date = item.createdAt || item.timestamp || item.date;
                    return !date || new Date(date) > cutoff;
                });

                if (filtered.length < before) {
                    this.patterns.set(key, filtered);
                    cleaned += before - filtered.length;
                }
            }
        }

        this._updateMetadata();
        return cleaned;
    }

    /**
     * Compact patterns (remove duplicates, aggregate)
     */
    compact() {
        // Aggregate hourly data
        this._compactHourlyData('completions_by_hour', 50);
        this._compactHourlyData('focus_quality_by_hour', 50);

        // Trim large arrays
        this._trimArray('raw_events', 5000);
        this._trimArray('raw_behaviors', 5000);
        this._trimArray('completed_tasks', 500);
        this._trimArray('estimation_accuracy', 200);

        this._updateMetadata();
    }

    _compactHourlyData(key, maxPerHour) {
        const data = this.patterns.get(key);
        if (!data || typeof data !== 'object') return;

        for (const hour of Object.keys(data)) {
            if (Array.isArray(data[hour]) && data[hour].length > maxPerHour) {
                // Keep most recent
                data[hour] = data[hour].slice(-maxPerHour);
            }
        }
    }

    _trimArray(key, maxSize) {
        const arr = this.patterns.get(key);
        if (Array.isArray(arr) && arr.length > maxSize) {
            this.patterns.set(key, arr.slice(-maxSize));
        }
    }

    /**
     * Reset all patterns
     */
    reset() {
        this._initializeDefaultPatterns();
        this._updateMetadata();
    }

    // ============================================================
    // ENERGY CURVE (Special Methods)
    // ============================================================

    /**
     * Build energy curve from patterns
     * @returns {Object}
     */
    buildEnergyCurve() {
        const completions = this.patterns.get('completions_by_hour') || {};
        const focus = this.patterns.get('focus_quality_by_hour') || {};
        const energy = this.patterns.get('energy_patterns') || {};

        const curve = { hourly: {} };

        for (let hour = 0; hour < 24; hour++) {
            const completionData = completions[hour] || [];
            const focusData = focus[hour] || [];
            const energyData = energy[hour];

            // Calculate composite score
            let score = 0.5;
            let dataPoints = 0;

            if (completionData.length > 0) {
                score += (completionData.reduce((s, c) => s + (c.quality || 0.5), 0) / completionData.length - 0.5) * 0.4;
                dataPoints += completionData.length;
            }

            if (focusData.length > 0) {
                score += (focusData.reduce((s, f) => s + (f.score || 0.5), 0) / focusData.length - 0.5) * 0.4;
                dataPoints += focusData.length;
            }

            if (energyData?.avgLevel) {
                score += ((energyData.avgLevel / 4) - 0.5) * 0.2;
                dataPoints += energyData.levels?.length || 0;
            }

            score = Math.max(0, Math.min(1, score));

            curve.hourly[hour] = {
                score,
                level: this._getEnergyLevel(score),
                dataPoints,
                reliable: dataPoints >= 10
            };
        }

        // Find peaks
        curve.peakHours = Object.entries(curve.hourly)
            .filter(([_, data]) => data.score >= 0.7)
            .map(([hour, _]) => parseInt(hour))
            .sort((a, b) => curve.hourly[b].score - curve.hourly[a].score);

        return curve;
    }

    _getEnergyLevel(score) {
        if (score >= 0.8) return 'peak';
        if (score >= 0.6) return 'high';
        if (score >= 0.4) return 'medium';
        if (score >= 0.2) return 'low';
        return 'very_low';
    }

    // ============================================================
    // HELPERS
    // ============================================================

    _updateMetadata() {
        this.metadata.lastUpdated = new Date().toISOString();
        this.metadata.patternCount = this.getStats().totalPatterns;
    }

    _generatePatternId() {
        return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
}
