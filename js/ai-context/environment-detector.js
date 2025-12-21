// ============================================================
// ENVIRONMENT-DETECTOR.JS - Work Environment Detection
// Phase 6: Context Intelligence
// ============================================================

/**
 * Environment Detector - Detects work environment and location context
 */

export class EnvironmentDetector {
    constructor() {
        this.currentEnvironment = null;
        this.environmentHistory = [];

        this.environmentTypes = {
            office: { connectivity: 'high', interruptions: 'medium', equipment: 'full' },
            home: { connectivity: 'variable', interruptions: 'low', equipment: 'basic' },
            remote: { connectivity: 'variable', interruptions: 'low', equipment: 'mobile' },
            meeting: { connectivity: 'high', interruptions: 'blocked', equipment: 'shared' },
            travel: { connectivity: 'low', interruptions: 'high', equipment: 'minimal' }
        };
    }

    // ============================================================
    // ENVIRONMENT DETECTION
    // ============================================================

    /**
     * Detect current environment
     * @param {Object} signals - Environment signals
     * @returns {Object} Detected environment
     */
    detectEnvironment(signals = {}) {
        const {
            networkType = 'unknown',
            deviceType = 'desktop',
            locationHint = null,
            calendarContext = null,
            timeOfDay = new Date().getHours()
        } = signals;

        let environment = 'office'; // Default

        // Infer from signals
        if (calendarContext?.inMeeting) {
            environment = 'meeting';
        } else if (deviceType === 'mobile') {
            environment = networkType === 'cellular' ? 'travel' : 'remote';
        } else if (locationHint === 'home') {
            environment = 'home';
        } else if (timeOfDay < 8 || timeOfDay > 19) {
            environment = 'home'; // After hours likely at home
        }

        this.currentEnvironment = {
            type: environment,
            ...this.environmentTypes[environment],
            detectedAt: new Date().toISOString(),
            signals
        };

        this.environmentHistory.push(this.currentEnvironment);
        if (this.environmentHistory.length > 50) {
            this.environmentHistory.shift();
        }

        return this.currentEnvironment;
    }

    /**
     * Get environment-appropriate recommendations
     * @param {string} envType - Environment type
     * @returns {Object} Recommendations
     */
    getEnvironmentRecommendations(envType = null) {
        const env = envType || this.currentEnvironment?.type || 'office';

        const recommendations = {
            office: {
                bestFor: ['collaborative tasks', 'meetings', 'complex work'],
                avoid: ['sensitive calls', 'highly creative work'],
                tips: ['Use noise-canceling headphones for focus blocks']
            },
            home: {
                bestFor: ['deep work', 'creative tasks', 'focused coding'],
                avoid: ['back-to-back meetings'],
                tips: ['Create clear work/life boundaries']
            },
            remote: {
                bestFor: ['independent work', 'async communication'],
                avoid: ['bandwidth-heavy tasks', 'large file uploads'],
                tips: ['Download materials before disconnecting']
            },
            meeting: {
                bestFor: ['collaboration', 'decisions', 'presentations'],
                avoid: ['individual tasks during meetings'],
                tips: ['Stay engaged, take notes']
            },
            travel: {
                bestFor: ['reading', 'planning', 'offline tasks'],
                avoid: ['urgent deadlines', 'video calls'],
                tips: ['Prepare offline work ahead of time']
            }
        };

        return recommendations[env] || recommendations.office;
    }

    /**
     * Get suitable tasks for environment
     * @param {Array} tasks - Available tasks
     * @returns {Array} Filtered tasks
     */
    getEnvironmentSuitableTasks(tasks) {
        const env = this.currentEnvironment?.type || 'office';

        return tasks.filter(task => {
            const suitability = this._assessTaskSuitability(task, env);
            return suitability >= 0.5;
        }).map(task => ({
            ...task,
            environmentSuitability: this._assessTaskSuitability(task, env)
        })).sort((a, b) => b.environmentSuitability - a.environmentSuitability);
    }

    _assessTaskSuitability(task, environment) {
        let score = 0.5;

        const text = `${task.title} ${task.description || ''}`.toLowerCase();

        // Environment-specific adjustments
        switch (environment) {
            case 'travel':
                // Prefer offline-capable, short tasks
                if (['read', 'plan', 'review', 'write'].some(w => text.includes(w))) score += 0.2;
                if ((task.estimatedTime || 60) <= 30) score += 0.1;
                if (['deploy', 'sync', 'upload'].some(w => text.includes(w))) score -= 0.3;
                break;

            case 'meeting':
                // Only meeting-related tasks suitable
                if (['meeting', 'discuss', 'present', 'demo'].some(w => text.includes(w))) score += 0.3;
                else score -= 0.4;
                break;

            case 'home':
                // Prefer deep work
                if (['complex', 'design', 'develop', 'create'].some(w => text.includes(w))) score += 0.2;
                if (['email', 'admin'].some(w => text.includes(w))) score -= 0.1;
                break;

            case 'office':
                // Good for collaborative and routine tasks
                if (['collaborate', 'discuss', 'review'].some(w => text.includes(w))) score += 0.15;
                break;
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Get current environment
     * @returns {Object} Current environment
     */
    getCurrentEnvironment() {
        return this.currentEnvironment;
    }

    /**
     * Set environment manually
     * @param {string} type - Environment type
     */
    setEnvironment(type) {
        if (!this.environmentTypes[type]) return null;

        this.currentEnvironment = {
            type,
            ...this.environmentTypes[type],
            setAt: new Date().toISOString(),
            manual: true
        };

        return this.currentEnvironment;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const environmentDetector = new EnvironmentDetector();

export function initEnvironmentDetector() {
    console.log('🌍 [Environment Detector] Initialized');
    return environmentDetector;
}
