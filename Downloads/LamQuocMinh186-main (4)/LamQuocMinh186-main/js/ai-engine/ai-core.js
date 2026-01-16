// ============================================================
// AI-CORE.JS - Core AI Engine for Task Management
// Phase 1: Foundation & Core Intelligence
// ============================================================

/**
 * Core AI Engine - Central hub for all AI operations
 * Manages ML models, inference, and AI state
 */

import { PatternRecognizer } from './ai-patterns.js';
import { TaskPredictor } from './ai-predictor.js';
import { PriorityEngine } from './ai-priority.js';
import { DataCollector } from './ai-data-collector.js';
import { UserProfile } from '../models/user-profile.js';
import { PatternStore } from '../models/pattern-store.js';

// ============================================================
// AI ENGINE CLASS
// ============================================================

export class AIEngine {
    constructor() {
        this.initialized = false;
        this.userProfile = null;
        this.patternStore = null;

        // Sub-engines
        this.patternRecognizer = null;
        this.predictor = null;
        this.priorityEngine = null;
        this.dataCollector = null;

        // Configuration
        this.config = {
            learningEnabled: true,
            predictionConfidenceThreshold: 0.7,
            patternMinOccurrences: 3,
            maxPatternsStored: 1000,
            dataRetentionDays: 90
        };
    }

    /**
     * Initialize AI Engine with user data
     * @param {Object} userData - User data from Firebase
     * @param {Object} user - Firebase user object
     */
    async initialize(userData, user) {
        console.log('🤖 [AI Engine] Initializing...');

        try {
            // Load or create user profile
            this.userProfile = new UserProfile(user.uid);
            await this.userProfile.load(userData);

            // Load or create pattern store
            this.patternStore = new PatternStore(user.uid);
            await this.patternStore.load(userData);

            // Initialize sub-engines
            this.patternRecognizer = new PatternRecognizer(this.patternStore);
            this.predictor = new TaskPredictor(this.userProfile, this.patternStore);
            this.priorityEngine = new PriorityEngine(this.userProfile);
            this.dataCollector = new DataCollector(this.userProfile, this.patternStore);

            this.initialized = true;
            console.log('🤖 [AI Engine] Initialized successfully');

            return true;
        } catch (error) {
            console.error('🤖 [AI Engine] Initialization failed:', error);
            return false;
        }
    }

    // ============================================================
    // PREDICTION METHODS
    // ============================================================

    /**
     * Predict completion time for a task
     * @param {Object} task - Task object
     * @returns {Object} Prediction with estimated time and confidence
     */
    predictCompletionTime(task) {
        if (!this.initialized) return null;
        return this.predictor.predictCompletionTime(task);
    }

    /**
     * Predict if a task will be completed on time
     * @param {Object} task - Task object
     * @returns {Object} Prediction with probability and risk factors
     */
    predictOnTimeCompletion(task) {
        if (!this.initialized) return null;
        return this.predictor.predictOnTimeCompletion(task);
    }

    /**
     * Predict optimal start time for a task
     * @param {Object} task - Task object
     * @returns {Object} Suggested start time and reasoning
     */
    predictOptimalStartTime(task) {
        if (!this.initialized) return null;
        return this.predictor.predictOptimalStartTime(task);
    }

    // ============================================================
    // PRIORITY METHODS
    // ============================================================

    /**
     * Calculate intelligent priority for a task
     * @param {Object} task - Task object
     * @param {Object} context - Current context (time, workload, etc.)
     * @returns {Object} Priority score and factors
     */
    calculatePriority(task, context = {}) {
        if (!this.initialized) return null;
        return this.priorityEngine.calculate(task, context);
    }

    /**
     * Get suggested task order based on multiple factors
     * @param {Array} tasks - Array of tasks
     * @returns {Array} Sorted tasks with priority reasoning
     */
    getSuggestedOrder(tasks) {
        if (!this.initialized) return tasks;
        return this.priorityEngine.sortByIntelligentPriority(tasks);
    }

    /**
     * Detect and handle priority shifts
     * @param {Object} newContext - New context that might affect priorities
     * @returns {Array} Tasks with updated priorities
     */
    handlePriorityShift(newContext) {
        if (!this.initialized) return [];
        return this.priorityEngine.detectShifts(newContext);
    }

    // ============================================================
    // PATTERN METHODS
    // ============================================================

    /**
     * Analyze user's energy curve throughout the day
     * @returns {Object} Energy pattern by hour
     */
    getEnergyCurve() {
        if (!this.initialized) return null;
        return this.patternRecognizer.getEnergyCurve();
    }

    /**
     * Get productivity patterns
     * @returns {Object} Productivity insights
     */
    getProductivityPatterns() {
        if (!this.initialized) return null;
        return this.patternRecognizer.getProductivityPatterns();
    }

    /**
     * Detect implicit deadlines from context
     * @param {Object} task - Task object
     * @param {Object} context - External context (emails, calendar, etc.)
     * @returns {Object} Detected deadline and confidence
     */
    detectImplicitDeadline(task, context = {}) {
        if (!this.initialized) return null;
        return this.patternRecognizer.detectImplicitDeadline(task, context);
    }

    // ============================================================
    // DATA COLLECTION METHODS
    // ============================================================

    /**
     * Track task event for learning
     * @param {string} eventType - Type of event (started, completed, etc.)
     * @param {Object} task - Task object
     * @param {Object} metadata - Additional metadata
     */
    trackEvent(eventType, task, metadata = {}) {
        if (!this.initialized || !this.config.learningEnabled) return;
        this.dataCollector.trackEvent(eventType, task, metadata);
    }

    /**
     * Track user behavior
     * @param {string} behaviorType - Type of behavior
     * @param {Object} data - Behavior data
     */
    trackBehavior(behaviorType, data = {}) {
        if (!this.initialized || !this.config.learningEnabled) return;
        this.dataCollector.trackBehavior(behaviorType, data);
    }

    // ============================================================
    // INSIGHTS METHODS
    // ============================================================

    /**
     * Get stagnation warning for tasks
     * @param {Array} tasks - Array of tasks
     * @returns {Array} Tasks showing stagnation patterns
     */
    detectStagnation(tasks) {
        if (!this.initialized) return [];
        return this.patternRecognizer.detectStagnation(tasks);
    }

    /**
     * Get effort drift analysis
     * @returns {Object} Analysis of estimation accuracy
     */
    getEffortDriftAnalysis() {
        if (!this.initialized) return null;
        return this.predictor.getEffortDriftAnalysis();
    }

    /**
     * Get personal capacity insights
     * @returns {Object} Capacity analysis and recommendations
     */
    getCapacityInsights() {
        if (!this.initialized) return null;
        return this.userProfile.getCapacityInsights();
    }

    // ============================================================
    // SAVE & SYNC
    // ============================================================

    /**
     * Save AI state to Firebase
     * @returns {Object} Data to save
     */
    async save() {
        if (!this.initialized) return null;

        return {
            aiProfile: this.userProfile.export(),
            aiPatterns: this.patternStore.export(),
            aiConfig: this.config
        };
    }

    /**
     * Get AI statistics
     * @returns {Object} AI engine statistics
     */
    getStats() {
        return {
            initialized: this.initialized,
            patternsLearned: this.patternStore?.count() || 0,
            predictionsAccuracy: this.predictor?.getAccuracy() || 0,
            dataPointsCollected: this.dataCollector?.getCount() || 0
        };
    }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const aiEngine = new AIEngine();

// ============================================================
// INITIALIZATION FUNCTION
// ============================================================

export async function initAIEngine(userData, user) {
    return await aiEngine.initialize(userData, user);
}

// ============================================================
// EVENT TYPES
// ============================================================

export const AI_EVENTS = {
    TASK_CREATED: 'task_created',
    TASK_STARTED: 'task_started',
    TASK_COMPLETED: 'task_completed',
    TASK_DELAYED: 'task_delayed',
    TASK_RESCHEDULED: 'task_rescheduled',
    PRIORITY_CHANGED: 'priority_changed',
    FOCUS_SESSION_START: 'focus_session_start',
    FOCUS_SESSION_END: 'focus_session_end',
    BREAK_TAKEN: 'break_taken'
};

export const BEHAVIOR_TYPES = {
    APP_OPEN: 'app_open',
    SECTION_VIEW: 'section_view',
    TASK_INTERACTION: 'task_interaction',
    SCHEDULE_VIEW: 'schedule_view',
    ENERGY_LEVEL: 'energy_level'
};
