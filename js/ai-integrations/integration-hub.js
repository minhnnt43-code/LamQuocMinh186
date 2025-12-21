// ============================================================
// INTEGRATION-HUB.JS - External Integration Hub
// Phase 10: Integrations
// ============================================================

/**
 * Integration Hub - Manages all external integrations
 */

export class IntegrationHub {
    constructor() {
        this.integrations = new Map();
        this.syncQueue = [];
        this.lastSync = {};
    }

    // ============================================================
    // INTEGRATION MANAGEMENT
    // ============================================================

    /**
     * Register an integration
     * @param {Object} integration - Integration config
     */
    registerIntegration(integration) {
        this.integrations.set(integration.id, {
            ...integration,
            status: 'disconnected',
            registeredAt: new Date().toISOString()
        });
    }

    /**
     * Connect an integration
     * @param {string} integrationId - Integration ID
     * @param {Object} credentials - Connection credentials
     */
    async connect(integrationId, credentials) {
        const integration = this.integrations.get(integrationId);
        if (!integration) return { success: false, error: 'Integration not found' };

        // Simulate connection
        integration.status = 'connecting';

        // In real implementation, would authenticate with external service
        await new Promise(r => setTimeout(r, 100));

        integration.status = 'connected';
        integration.connectedAt = new Date().toISOString();
        integration.credentials = credentials; // Would be encrypted in production

        return { success: true, integration };
    }

    /**
     * Disconnect an integration
     * @param {string} integrationId - Integration ID
     */
    disconnect(integrationId) {
        const integration = this.integrations.get(integrationId);
        if (integration) {
            integration.status = 'disconnected';
            integration.credentials = null;
        }
        return { success: true };
    }

    /**
     * Get integration status
     * @param {string} integrationId - Integration ID
     * @returns {Object} Status
     */
    getStatus(integrationId) {
        const integration = this.integrations.get(integrationId);
        if (!integration) return null;

        return {
            id: integration.id,
            name: integration.name,
            status: integration.status,
            lastSync: this.lastSync[integrationId],
            health: integration.status === 'connected' ? 'good' : 'disconnected'
        };
    }

    /**
     * Get all integrations
     * @returns {Array} All integrations
     */
    getAllIntegrations() {
        return Array.from(this.integrations.values()).map(i => ({
            id: i.id,
            name: i.name,
            type: i.type,
            status: i.status
        }));
    }

    // ============================================================
    // CALENDAR SYNC
    // ============================================================

    /**
     * Sync with calendar
     * @param {string} calendarId - Calendar integration ID
     * @returns {Object} Sync result
     */
    async syncCalendar(calendarId = 'google_calendar') {
        const integration = this.integrations.get(calendarId);
        if (!integration || integration.status !== 'connected') {
            return { success: false, error: 'Calendar not connected' };
        }

        // Simulate calendar fetch
        const events = this._getMockCalendarEvents();

        this.lastSync[calendarId] = new Date().toISOString();

        return {
            success: true,
            events,
            summary: {
                total: events.length,
                today: events.filter(e => this._isToday(e.start)).length,
                thisWeek: events.length
            }
        };
    }

    _getMockCalendarEvents() {
        const now = new Date();
        return [
            { id: 'cal_1', title: 'Team Standup', start: this._addHours(now, 1), duration: 30 },
            { id: 'cal_2', title: '1:1 Meeting', start: this._addHours(now, 3), duration: 60 },
            { id: 'cal_3', title: 'Sprint Planning', start: this._addDays(now, 1), duration: 120 }
        ];
    }

    _addHours(date, hours) {
        return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
    }

    _addDays(date, days) {
        return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    _isToday(dateStr) {
        const today = new Date().toISOString().split('T')[0];
        return dateStr.startsWith(today);
    }

    // ============================================================
    // TASK SYNC
    // ============================================================

    /**
     * Import tasks from external source
     * @param {string} sourceId - Source integration ID
     * @returns {Object} Import result
     */
    async importTasks(sourceId) {
        const integration = this.integrations.get(sourceId);
        if (!integration || integration.status !== 'connected') {
            return { success: false, error: 'Source not connected' };
        }

        // Simulate import
        const imported = this._getMockImportedTasks(sourceId);

        return {
            success: true,
            imported: imported.length,
            tasks: imported,
            duplicatesSkipped: 0
        };
    }

    _getMockImportedTasks(sourceId) {
        return [
            { externalId: `${sourceId}_1`, title: 'Imported Task 1', source: sourceId },
            { externalId: `${sourceId}_2`, title: 'Imported Task 2', source: sourceId }
        ];
    }

    /**
     * Export tasks to external destination
     * @param {string} destId - Destination integration ID
     * @param {Array} tasks - Tasks to export
     * @returns {Object} Export result
     */
    async exportTasks(destId, tasks) {
        const integration = this.integrations.get(destId);
        if (!integration || integration.status !== 'connected') {
            return { success: false, error: 'Destination not connected' };
        }

        // Simulate export
        return {
            success: true,
            exported: tasks.length,
            destination: destId
        };
    }

    // ============================================================
    // WEBHOOK HANDLING
    // ============================================================

    /**
     * Register webhook handler
     * @param {string} integrationId - Integration ID
     * @param {string} event - Event type
     * @param {Function} handler - Handler function
     */
    registerWebhook(integrationId, event, handler) {
        const integration = this.integrations.get(integrationId);
        if (!integration) return;

        if (!integration.webhooks) integration.webhooks = {};
        if (!integration.webhooks[event]) integration.webhooks[event] = [];

        integration.webhooks[event].push(handler);
    }

    /**
     * Process incoming webhook
     * @param {string} integrationId - Integration ID
     * @param {string} event - Event type
     * @param {Object} payload - Event payload
     */
    processWebhook(integrationId, event, payload) {
        const integration = this.integrations.get(integrationId);
        if (!integration?.webhooks?.[event]) return;

        for (const handler of integration.webhooks[event]) {
            try {
                handler(payload);
            } catch (e) {
                console.error('Webhook handler error:', e);
            }
        }
    }

    // ============================================================
    // DATA MAPPING
    // ============================================================

    /**
     * Map external task to internal format
     * @param {Object} externalTask - External task
     * @param {string} sourceId - Source integration
     * @returns {Object} Mapped task
     */
    mapTask(externalTask, sourceId) {
        // Generic mapping - would be customized per integration
        return {
            title: externalTask.name || externalTask.title || externalTask.summary,
            description: externalTask.description || externalTask.body || '',
            deadline: externalTask.dueDate || externalTask.due || externalTask.deadline,
            priority: this._mapPriority(externalTask.priority, sourceId),
            externalId: externalTask.id,
            source: sourceId
        };
    }

    _mapPriority(externalPriority, sourceId) {
        // Source-specific priority mapping
        const mappings = {
            'jira': { 'Highest': 'critical', 'High': 'high', 'Medium': 'medium', 'Low': 'low' },
            'asana': { 'high': 'high', 'medium': 'medium', 'low': 'low' },
            'trello': { 'red': 'critical', 'orange': 'high', 'yellow': 'medium', 'green': 'low' }
        };

        const sourceMapping = mappings[sourceId] || {};
        return sourceMapping[externalPriority] || 'medium';
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const integrationHub = new IntegrationHub();

// Pre-register common integrations
['google_calendar', 'outlook', 'slack', 'jira', 'asana', 'trello', 'github'].forEach(id => {
    integrationHub.registerIntegration({
        id,
        name: id.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: id.includes('calendar') || id === 'outlook' ? 'calendar' : 'task_management'
    });
});

export function initIntegrationHub() {
    console.log('🔌 [Integration Hub] Initialized');
    return integrationHub;
}
