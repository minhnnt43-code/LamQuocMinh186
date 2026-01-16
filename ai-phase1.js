/**
 * ============================================================
 * AI PHASE 1 ES6 MODULE WRAPPER - LifeOS 2026
 * ============================================================
 * Exports all Phase 1 AI modules for ES6 import
 * ============================================================
 */

// Load all Phase 1 scripts dynamically
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

// Phase 1 module paths - ALL 25 features
const PHASE1_MODULES = [
    // Core (Tháng 1)
    'js/ai/ai-memory.js',
    'js/ai/abbreviations.js',
    'js/ai/smart-priority.js',
    'js/ai/templates.js',

    // NLP & Input (Tháng 2)
    'js/ai/date-parser.js',
    'js/ai/voice-ai.js',
    'js/ai/conversational-task.js',
    'js/ai/task-dependencies.js',

    // Decomposition & Actions (Tháng 3)
    'js/ai/task-decomposition.js',
    'js/ai/task-quick-actions.js',

    // Integration (load last)
    'js/ai/phase1-integration.js'
];

/**
 * Initialize Phase 1 AI modules
 * Loads all scripts and waits for them to be ready
 */
export async function initAIPhase1() {
    console.log('🚀 Loading AI Phase 1 modules...');

    try {
        // Load all scripts
        await Promise.all(PHASE1_MODULES.map(src => loadScript(src)));

        // Wait for DOM ready and init
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // Small delay for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 150));

        // Verify modules loaded
        const modules = {
            AIMemory: window.AIMemory,
            Abbreviations: window.Abbreviations,
            DateParser: window.DateParser,
            TaskTemplates: window.TaskTemplates,
            SmartPriority: window.SmartPriority,
            AIPhase1: window.AIPhase1
        };

        const loaded = Object.entries(modules)
            .filter(([_, mod]) => mod)
            .map(([name]) => name);

        console.log(`✅ AI Phase 1 loaded: ${loaded.join(', ')}`);

        // Initialize integration if available
        if (window.AIPhase1 && !window.AIPhase1.isReady) {
            window.AIPhase1.init();
        }

        return modules;

    } catch (error) {
        console.error('❌ Failed to load AI Phase 1:', error);
        throw error;
    }
}

/**
 * Get Phase 1 modules (after init)
 */
export function getAIPhase1Modules() {
    return {
        AIMemory: window.AIMemory,
        Abbreviations: window.Abbreviations,
        DateParser: window.DateParser,
        TaskTemplates: window.TaskTemplates,
        SmartPriority: window.SmartPriority,
        AIPhase1: window.AIPhase1
    };
}

/**
 * Process task input using Phase 1 AI
 * @param {string} input - Natural language input
 * @returns {Object|null} Processed task
 */
export function processTaskWithAI(input) {
    if (window.AIPhase1 && window.AIPhase1.isReady) {
        return window.AIPhase1.processTaskInput(input);
    }
    return null;
}

/**
 * Analyze task using Phase 1 AI
 * @param {Object} task 
 * @returns {Object|null} Analysis
 */
export function analyzeTaskWithAI(task) {
    if (window.AIPhase1 && window.AIPhase1.isReady) {
        return window.AIPhase1.analyzeTask(task);
    }
    return null;
}

/**
 * Hook: Call when task is completed
 * @param {Object} task 
 */
export function onTaskCompleted(task) {
    if (window.AIPhase1) {
        window.AIPhase1.onTaskCompleted(task);
    }
}

/**
 * Get smart suggestions
 * @returns {Object}
 */
export function getSmartSuggestions() {
    if (window.AIPhase1 && window.AIPhase1.isReady) {
        return window.AIPhase1.getSmartSuggestions();
    }
    return { templates: [], focus: [], tags: [] };
}

/**
 * Parse Vietnamese date/time from text
 * @param {string} text 
 * @returns {Object|null}
 */
export function parseDateFromText(text) {
    if (window.DateParser) {
        return window.DateParser.parse(text);
    }
    return null;
}

/**
 * Expand abbreviations in text
 * @param {string} text 
 * @returns {Object}
 */
export function expandAbbreviations(text) {
    if (window.Abbreviations) {
        return window.Abbreviations.expand(text);
    }
    return { expanded: text, replacements: [] };
}

/**
 * Calculate priority score for task
 * @param {Object} task 
 * @returns {Object|null}
 */
export function calculatePriorityScore(task) {
    if (window.SmartPriority) {
        return window.SmartPriority.calculateScore(task);
    }
    return null;
}

/**
 * Get task template by ID
 * @param {string} templateId 
 * @returns {Object|null}
 */
export function getTaskTemplate(templateId) {
    if (window.TaskTemplates) {
        return window.TaskTemplates.get(templateId);
    }
    return null;
}

/**
 * Apply task template
 * @param {string} templateId 
 * @param {Object} overrides 
 * @returns {Object|null}
 */
export function applyTaskTemplate(templateId, overrides = {}) {
    if (window.TaskTemplates) {
        return window.TaskTemplates.apply(templateId, overrides);
    }
    return null;
}
