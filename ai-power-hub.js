// ============================================================
// FILE: js/ai-power-hub.js
// Mục đích: AI Power Hub - Multi-Provider Manager
// Logic: Dùng model thông minh nhất trước, auto-fallback khi hết quota
// ============================================================

import { showNotification } from './common.js';

// ============================================================
// PROVIDER CONFIGURATIONS
// 2 AI Providers: Groq + Google Gemini
// Tối đa 100 keys/provider
// ============================================================
const MAX_KEYS_PER_PROVIDER = 100;

const PROVIDERS = {
    groq: {
        name: 'Groq',
        model: 'llama-3.3-70b-versatile',
        intelligence: 5,
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        freeQuota: { tokens: 300000, period: 'day' },
        icon: '⚡',
        color: '#F55036',
        category: 'backbone',
        description: 'Inference nhanh nhất, realtime',
        browserSupport: true
    },
    gemini: {
        name: 'Google Gemini',
        model: 'gemini-1.5-flash',
        intelligence: 4,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        freeQuota: { tokens: 50000, period: 'day' },
        icon: '🔮',
        color: '#4285F4',
        category: 'backbone',
        description: 'Văn bản dài, tóm tắt, đa ngôn ngữ',
        browserSupport: true
    }
};

// ============================================================
// KEY STORAGE & MANAGEMENT
// ============================================================
class KeyManager {
    constructor() {
        this.storageKey = 'ai_power_hub_keys';
        this.usageKey = 'ai_power_hub_usage';
        this.keys = this.loadKeys();
        this.usage = this.loadUsage();
    }

    loadKeys() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            const defaultKeys = {
                groq: [],
                gemini: []
            };
            if (saved) {
                const parsed = JSON.parse(saved);
                // Chỉ lấy keys của providers hiện tại (groq, gemini)
                return {
                    groq: parsed.groq || [],
                    gemini: parsed.gemini || []
                };
            }
            return defaultKeys;
        } catch (e) {
            console.error('Lỗi load keys:', e);
            return { groq: [], gemini: [] };
        }
    }

    saveKeys() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.keys));
    }

    loadUsage() {
        try {
            const saved = localStorage.getItem(this.usageKey);
            const usage = saved ? JSON.parse(saved) : {};

            // Reset usage nếu đã qua ngày mới
            const today = new Date().toDateString();
            if (usage.lastReset !== today) {
                return {
                    lastReset: today,
                    providers: {}
                };
            }
            return usage;
        } catch (e) {
            return { lastReset: new Date().toDateString(), providers: {} };
        }
    }

    saveUsage() {
        localStorage.setItem(this.usageKey, JSON.stringify(this.usage));
    }

    addKey(provider, key, name = '') {
        if (!PROVIDERS[provider]) return { error: 'Provider không tồn tại' };

        // Kiểm tra giới hạn 30 keys
        if (!this.keys[provider]) this.keys[provider] = [];
        if (this.keys[provider].length >= MAX_KEYS_PER_PROVIDER) {
            return { error: `Đã đạt giới hạn ${MAX_KEYS_PER_PROVIDER} keys cho ${PROVIDERS[provider].name}` };
        }

        // Kiểm tra key trùng
        if (this.keys[provider].some(k => k.key === key)) {
            return { error: 'Key này đã tồn tại' };
        }

        const keyObj = {
            id: Date.now().toString(),
            key: key,
            name: name || `Key ${this.keys[provider].length + 1}`,
            addedAt: new Date().toISOString(),
            lastUsed: null,
            requestCount: 0,
            tokenCount: 0,
            errorCount: 0,
            status: 'active' // active, rate_limited, error
        };

        this.keys[provider].push(keyObj);
        this.saveKeys();
        return keyObj;
    }

    removeKey(provider, keyId) {
        if (!this.keys[provider]) return false;
        this.keys[provider] = this.keys[provider].filter(k => k.id !== keyId);
        this.saveKeys();
        return true;
    }

    getActiveKey(provider) {
        if (!this.keys[provider]) return null;

        // Tìm key active, ưu tiên key ít dùng nhất
        const activeKeys = this.keys[provider]
            .filter(k => k.status === 'active')
            .sort((a, b) => a.requestCount - b.requestCount);

        return activeKeys[0] || null;
    }

    markKeyUsed(provider, keyId, success = true) {
        const key = this.keys[provider]?.find(k => k.id === keyId);
        if (!key) return;

        key.lastUsed = new Date().toISOString();
        key.requestCount++;

        if (!success) {
            key.errorCount++;
            if (key.errorCount >= 3) {
                key.status = 'error';
            }
        }

        // Track usage
        if (!this.usage.providers[provider]) {
            this.usage.providers[provider] = { requests: 0, tokens: 0 };
        }
        this.usage.providers[provider].requests++;

        this.saveKeys();
        this.saveUsage();
    }

    markKeyRateLimited(provider, keyId) {
        const key = this.keys[provider]?.find(k => k.id === keyId);
        if (key) {
            key.status = 'rate_limited';
            key.rateLimitedAt = new Date().toISOString();
            this.saveKeys();
        }
    }

    resetRateLimits() {
        for (const provider of Object.keys(this.keys)) {
            for (const key of this.keys[provider]) {
                if (key.status === 'rate_limited') {
                    key.status = 'active';
                }
            }
        }
        this.saveKeys();
    }

    getStats() {
        const stats = {
            totalKeys: 0,
            activeKeys: 0,
            providers: {},
            totalRequests: 0,
            totalTokens: 0
        };

        for (const [provider, keys] of Object.entries(this.keys)) {
            stats.providers[provider] = {
                total: keys.length,
                active: keys.filter(k => k.status === 'active').length,
                rateLimited: keys.filter(k => k.status === 'rate_limited').length,
                requests: this.usage.providers[provider]?.requests || 0,
                tokens: this.usage.providers[provider]?.tokens || 0,
                ...PROVIDERS[provider]
            };
            stats.totalKeys += keys.length;
            stats.activeKeys += keys.filter(k => k.status === 'active').length;
            stats.totalRequests += this.usage.providers[provider]?.requests || 0;
            stats.totalTokens += this.usage.providers[provider]?.tokens || 0;
        }

        return stats;
    }

    // Tính toán quota còn lại
    getQuotaRemaining() {
        const quotas = {};

        for (const [provider, config] of Object.entries(PROVIDERS)) {
            const keys = this.keys[provider]?.filter(k => k.status === 'active') || [];
            const usage = this.usage.providers[provider]?.requests || 0;

            if (config.freeQuota.requests) {
                const totalQuota = keys.length * config.freeQuota.requests;
                quotas[provider] = {
                    total: totalQuota,
                    used: usage,
                    remaining: Math.max(0, totalQuota - usage),
                    percent: totalQuota > 0 ? Math.round((1 - usage / totalQuota) * 100) : 0
                };
            } else {
                quotas[provider] = { total: 0, used: 0, remaining: 0, percent: 0 };
            }
        }

        return quotas;
    }
}

// ============================================================
// SMART ROUTER - Chọn provider thông minh nhất còn quota
// ============================================================
class SmartRouter {
    constructor(keyManager) {
        this.keyManager = keyManager;
    }

    // Lấy provider tốt nhất theo thứ tự intelligence
    getBestProvider() {
        const sortedProviders = Object.entries(PROVIDERS)
            .sort((a, b) => b[1].intelligence - a[1].intelligence);

        for (const [providerId, config] of sortedProviders) {
            const key = this.keyManager.getActiveKey(providerId);
            if (key) {
                return { providerId, config, key };
            }
        }

        return null;
    }

    // Lấy tất cả providers còn hoạt động
    getAvailableProviders() {
        const available = [];

        for (const [providerId, config] of Object.entries(PROVIDERS)) {
            const key = this.keyManager.getActiveKey(providerId);
            if (key) {
                available.push({ providerId, config, key });
            }
        }

        return available.sort((a, b) => b.config.intelligence - a.config.intelligence);
    }
}

// ============================================================
// API CALLERS - Wrapper cho từng provider
// ============================================================
async function callGemini(apiKey, prompt, options = {}) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 2000
            }
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0
        }
    };
}

async function callGroq(apiKey, prompt, options = {}) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: options.systemPrompt || 'Bạn là trợ lý AI thông minh.' },
                { role: 'user', content: prompt }
            ],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2000
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
        content: data.choices?.[0]?.message?.content || '',
        usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0
        }
    };
}





// ============================================================
// MAIN AI POWER HUB CLASS
// ============================================================
class AIPowerHub {
    constructor() {
        this.keyManager = new KeyManager();
        this.router = new SmartRouter(this.keyManager);
        this.callHistory = [];
    }

    // Main call method with auto-fallback
    async call(prompt, options = {}) {
        const providers = this.router.getAvailableProviders();

        if (providers.length === 0) {
            throw new Error('Không có API key nào khả dụng. Vui lòng thêm keys.');
        }

        let lastError = null;

        for (const { providerId, config, key } of providers) {
            try {
                console.log(`[AI Power Hub] Trying ${config.name}...`);

                const startTime = Date.now();
                let result;

                switch (providerId) {
                    case 'groq':
                        result = await callGroq(key.key, prompt, options);
                        break;
                    case 'gemini':
                        result = await callGemini(key.key, prompt, options);
                        break;
                    default:
                        throw new Error(`Provider ${providerId} chưa được hỗ trợ`);
                }

                const duration = Date.now() - startTime;

                // Track success
                this.keyManager.markKeyUsed(providerId, key.id, true);
                this.logCall(providerId, config.name, true, duration, result.usage);

                // Update usage tokens
                if (result.usage) {
                    if (!this.keyManager.usage.providers[providerId]) {
                        this.keyManager.usage.providers[providerId] = { requests: 0, tokens: 0 };
                    }
                    this.keyManager.usage.providers[providerId].tokens +=
                        (result.usage.promptTokens || 0) + (result.usage.completionTokens || 0);
                    this.keyManager.saveUsage();
                }

                return {
                    content: result.content,
                    provider: config.name,
                    providerId,
                    model: config.model,
                    usage: result.usage,
                    duration
                };

            } catch (error) {
                console.warn(`[AI Power Hub] ${config.name} failed:`, error.message);
                lastError = error;

                // Mark as rate limited if 429
                if (error.message.includes('429') || error.message.toLowerCase().includes('rate')) {
                    this.keyManager.markKeyRateLimited(providerId, key.id);
                } else {
                    this.keyManager.markKeyUsed(providerId, key.id, false);
                }

                this.logCall(providerId, config.name, false, 0, null, error.message);

                // Continue to next provider
            }
        }

        throw new Error(`Tất cả providers đều thất bại. Lỗi cuối: ${lastError?.message}`);
    }

    logCall(providerId, providerName, success, duration, usage, error = null) {
        this.callHistory.unshift({
            timestamp: new Date().toISOString(),
            providerId,
            providerName,
            success,
            duration,
            usage,
            error
        });

        // Keep last 100
        if (this.callHistory.length > 100) {
            this.callHistory.pop();
        }
    }

    getStats() {
        return {
            keys: this.keyManager.getStats(),
            quotas: this.keyManager.getQuotaRemaining(),
            recentCalls: this.callHistory.slice(0, 20),
            successRate: this.calculateSuccessRate()
        };
    }

    calculateSuccessRate() {
        if (this.callHistory.length === 0) return 100;
        const successful = this.callHistory.filter(c => c.success).length;
        return Math.round((successful / this.callHistory.length) * 100);
    }

    // Quick access methods
    addKey(provider, key, name) {
        return this.keyManager.addKey(provider, key, name);
    }

    removeKey(provider, keyId) {
        return this.keyManager.removeKey(provider, keyId);
    }

    getProviders() {
        return PROVIDERS;
    }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================
export const aiPowerHub = new AIPowerHub();

// ============================================================
// UI RENDER FUNCTIONS
// ============================================================
export function renderPowerHubDashboard() {
    const container = document.getElementById('power-hub-dashboard');
    if (!container) return;

    const stats = aiPowerHub.getStats();
    const quotas = stats.quotas;

    // Header stats
    let totalRemaining = 0;
    let totalUsed = 0;
    for (const q of Object.values(quotas)) {
        totalRemaining += q.remaining;
        totalUsed += q.used;
    }

    container.innerHTML = `
        <div class="power-hub-header">
            <div class="power-hub-stat-card">
                <span class="stat-icon">🔑</span>
                <div class="stat-content">
                    <span class="stat-value">${stats.keys.totalKeys}</span>
                    <span class="stat-label">Total Keys</span>
                </div>
            </div>
            <div class="power-hub-stat-card">
                <span class="stat-icon">✅</span>
                <div class="stat-content">
                    <span class="stat-value">${stats.keys.activeKeys}</span>
                    <span class="stat-label">Active Keys</span>
                </div>
            </div>
            <div class="power-hub-stat-card">
                <span class="stat-icon">📊</span>
                <div class="stat-content">
                    <span class="stat-value">${totalUsed.toLocaleString()}</span>
                    <span class="stat-label">Requests Today</span>
                </div>
            </div>
            <div class="power-hub-stat-card">
                <span class="stat-icon">⚡</span>
                <div class="stat-content">
                    <span class="stat-value">${stats.keys.totalTokens.toLocaleString()}</span>
                    <span class="stat-label">Total Tokens</span>
                </div>
            </div>
            <div class="power-hub-stat-card">
                <span class="stat-icon">🎯</span>
                <div class="stat-content">
                    <span class="stat-value">${stats.successRate}%</span>
                    <span class="stat-label">Success Rate</span>
                </div>
            </div>
            <div class="power-hub-stat-card" id="btn-sync-cloud" style="cursor: pointer; background: linear-gradient(135deg, #667eea, #764ba2); transition: transform 0.2s, box-shadow 0.2s;" onclick="window.firebaseSync?.forceSync()" title="Đồng bộ API keys lên Cloud">
                <span class="stat-icon" style="color: white;">☁️</span>
                <div class="stat-content">
                    <span class="stat-value" style="color: white; font-size: 1rem;">Sync</span>
                    <span class="stat-label" style="color: rgba(255,255,255,0.85);">to Cloud</span>
                </div>
            </div>
        </div>

        <div class="power-hub-providers">
            <h3>🤖 Providers (Sorted by Intelligence)</h3>
            <div class="provider-grid">
                ${Object.entries(PROVIDERS)
            .sort((a, b) => b[1].intelligence - a[1].intelligence)
            .map(([id, config]) => {
                const providerStats = stats.keys.providers[id];
                const quota = quotas[id];
                return `
                            <div class="provider-card" style="border-left: 4px solid ${config.color}">
                                <div class="provider-header">
                                    <span class="provider-icon">${config.icon}</span>
                                    <span class="provider-name">${config.name}</span>
                                    <span class="provider-category" style="background: ${config.color}20; color: ${config.color}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem;">${config.category}</span>
                                </div>
                                <div class="provider-model">${config.model}</div>
                                <div class="provider-description" style="font-size: 0.8rem; color: #888; margin: 5px 0;">${config.description}</div>
                                <div class="provider-stats">
                                    <div class="provider-keys">
                                        <span class="key-count">${providerStats?.active || 0}/${providerStats?.total || 0}</span>
                                        <span class="key-label">keys (max ${MAX_KEYS_PER_PROVIDER})</span>
                                    </div>
                                    <div class="provider-quota">
                                        <div class="quota-bar">
                                            <div class="quota-fill" style="width: ${quota?.percent || 0}%; background: ${config.color}"></div>
                                        </div>
                                        <span class="quota-text">${(config.freeQuota.tokens || 0).toLocaleString()} tokens/${config.freeQuota.period}</span>
                                    </div>
                                </div>
                                <button class="btn-add-key" data-provider="${id}" style="background: ${config.color}">+ Add Key</button>
                            </div>
                        `;
            }).join('')}
            </div>
        </div>

        <div class="power-hub-keys">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0;">🔑 API Keys</h3>
                <button id="btn-test-all-keys" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
                    🧪 Test All Keys
                </button>
            </div>
            <div class="keys-list">
                ${Object.entries(aiPowerHub.keyManager.keys)
            .filter(([_, keys]) => keys.length > 0)
            .map(([provider, keys]) => `
                        <div class="keys-provider-group">
                            <h4>${PROVIDERS[provider]?.icon} ${PROVIDERS[provider]?.name}</h4>
                            ${keys.map(key => `
                                <div class="key-item ${key.status}" data-provider="${provider}" data-key-id="${key.id}">
                                    <div class="key-main-info">
                                        <span class="key-name">${key.name}</span>
                                        <span class="key-value" style="font-family: monospace; font-size: 0.85rem;">${key.key.substring(0, 12)}...${key.key.slice(-4)}</span>
                                    </div>
                                    <div class="key-status-info">
                                        <span class="key-status-badge" style="
                                            padding: 4px 10px; 
                                            border-radius: 12px; 
                                            font-size: 0.75rem; 
                                            font-weight: 600;
                                            background: ${key.status === 'active' ? '#dcfce7' : key.status === 'rate_limited' ? '#fef3c7' : '#fee2e2'};
                                            color: ${key.status === 'active' ? '#16a34a' : key.status === 'rate_limited' ? '#ca8a04' : '#dc2626'};
                                        ">
                                            ${key.status === 'active' ? '✅ Active' : key.status === 'rate_limited' ? '⏳ Rate Limited' : '❌ Error'}
                                        </span>
                                        ${key.lastError ? `<span class="key-error" style="color: #dc2626; font-size: 0.75rem; display: block; margin-top: 4px;">⚠️ ${key.lastError}</span>` : ''}
                                    </div>
                                    <div class="key-stats" style="font-size: 0.8rem; color: #64748b;">
                                        ${key.requestCount} requests
                                    </div>
                                    <div class="key-actions" style="display: flex; gap: 5px;">
                                        <button class="btn-test-key" data-provider="${provider}" data-key-id="${key.id}" title="Test API" style="background: #e0f2fe; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer;">🧪</button>
                                        <button class="btn-edit-key" data-provider="${provider}" data-key-id="${key.id}" title="Sửa Key" style="background: #fef3c7; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer;">✏️</button>
                                        <button class="btn-remove-key" data-provider="${provider}" data-key-id="${key.id}" title="Xóa" style="background: #fee2e2; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer;">🗑️</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('') || '<p class="no-keys">Chưa có API key nào. Thêm key để bắt đầu!</p>'}
            </div>
        </div>

        <!-- TOKEN USAGE TABLE -->
        <div class="power-hub-token-table" style="margin-bottom: 30px;">
            <h3>📊 Token Usage (Đã dùng / Còn lại)</h3>
            <div style="overflow-x: auto;">
                <table class="token-usage-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white;">
                            <th style="padding: 12px 15px; text-align: left;">Provider</th>
                            <th style="padding: 12px 15px; text-align: center;">Keys</th>
                            <th style="padding: 12px 15px; text-align: right;">Quota/ngày</th>
                            <th style="padding: 12px 15px; text-align: right;">Đã dùng</th>
                            <th style="padding: 12px 15px; text-align: right;">Còn lại</th>
                            <th style="padding: 12px 15px; text-align: center;">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(PROVIDERS).map(([id, config]) => {
                const providerStats = stats.keys.providers[id];
                const keyCount = providerStats?.total || 0;
                const dailyQuota = (config.freeQuota.tokens || 0) * keyCount;
                const used = aiPowerHub.keyManager.usage.providers[id]?.tokens || 0;
                const remaining = Math.max(0, dailyQuota - used);
                const percent = dailyQuota > 0 ? Math.round((used / dailyQuota) * 100) : 0;
                const barColor = percent < 50 ? '#4CAF50' : percent < 80 ? '#FF9800' : '#F44336';

                return `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 12px 15px;">
                                        <span style="font-size: 1.2rem; margin-right: 8px;">${config.icon}</span>
                                        <strong>${config.name}</strong>
                                    </td>
                                    <td style="padding: 12px 15px; text-align: center;">
                                        <span style="background: ${config.color}20; color: ${config.color}; padding: 4px 10px; border-radius: 12px; font-weight: 600;">
                                            ${keyCount}
                                        </span>
                                    </td>
                                    <td style="padding: 12px 15px; text-align: right; font-weight: 500;">
                                        ${dailyQuota.toLocaleString()}
                                    </td>
                                    <td style="padding: 12px 15px; text-align: right; color: ${barColor}; font-weight: 600;">
                                        ${used.toLocaleString()}
                                    </td>
                                    <td style="padding: 12px 15px; text-align: right; color: #4CAF50; font-weight: 600;">
                                        ${remaining.toLocaleString()}
                                    </td>
                                    <td style="padding: 12px 15px; text-align: center;">
                                        <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                                            <div style="width: 60px; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                                <div style="width: ${percent}%; height: 100%; background: ${barColor}; border-radius: 4px;"></div>
                                            </div>
                                            <span style="font-size: 0.85rem; color: ${barColor};">${percent}%</span>
                                        </div>
                                    </td>
                                </tr>
                            `;
            }).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8f9fa; font-weight: 600;">
                            <td style="padding: 12px 15px;" colspan="2">📈 TỔNG CỘNG</td>
                            <td style="padding: 12px 15px; text-align: right;">
                                ${Object.entries(PROVIDERS).reduce((sum, [id, config]) => {
                const keyCount = stats.keys.providers[id]?.total || 0;
                return sum + ((config.freeQuota.tokens || 0) * keyCount);
            }, 0).toLocaleString()}
                            </td>
                            <td style="padding: 12px 15px; text-align: right; color: #FF9800;">
                                ${stats.keys.totalTokens.toLocaleString()}
                            </td>
                            <td style="padding: 12px 15px; text-align: right; color: #4CAF50;">
                                ${(Object.entries(PROVIDERS).reduce((sum, [id, config]) => {
                const keyCount = stats.keys.providers[id]?.total || 0;
                return sum + ((config.freeQuota.tokens || 0) * keyCount);
            }, 0) - stats.keys.totalTokens).toLocaleString()}
                            </td>
                            <td style="padding: 12px 15px;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div class="power-hub-history">
            <h3>📜 Recent Calls</h3>
            <div class="history-list">
                ${stats.recentCalls.slice(0, 10).map(call => `
                    <div class="history-item ${call.success ? 'success' : 'error'}">
                        <span class="history-time">${new Date(call.timestamp).toLocaleTimeString('vi-VN')}</span>
                        <span class="history-provider">${call.providerName}</span>
                        <span class="history-status">${call.success ? '✅' : '❌'}</span>
                        <span class="history-duration">${call.duration}ms</span>
                        ${call.usage ? `<span class="history-tokens">${(call.usage.promptTokens || 0) + (call.usage.completionTokens || 0)} tokens</span>` : ''}
                    </div>
                `).join('') || '<p>Chưa có lịch sử gọi API</p>'}
            </div>
        </div>
    `;

    // Setup event listeners
    setupPowerHubEvents();
}

function setupPowerHubEvents() {
    // Add key buttons
    document.querySelectorAll('.btn-add-key').forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.dataset.provider;
            showAddKeyModal(provider);
        });
    });

    // Test key buttons
    document.querySelectorAll('.btn-test-key').forEach(btn => {
        btn.addEventListener('click', async () => {
            const provider = btn.dataset.provider;
            const keyId = btn.dataset.keyId;
            await testApiKey(provider, keyId, btn);
        });
    });

    // Edit key buttons
    document.querySelectorAll('.btn-edit-key').forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.dataset.provider;
            const keyId = btn.dataset.keyId;
            showEditKeyModal(provider, keyId);
        });
    });

    // Remove key buttons
    document.querySelectorAll('.btn-remove-key').forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.dataset.provider;
            const keyId = btn.dataset.keyId;
            if (confirm('Xóa API key này?')) {
                aiPowerHub.removeKey(provider, keyId);
                renderPowerHubDashboard();
                showNotification('Đã xóa API key', 'success');
            }
        });
    });

    // Test All Keys button
    const testAllBtn = document.getElementById('btn-test-all-keys');
    if (testAllBtn) {
        testAllBtn.addEventListener('click', testAllKeys);
    }
}

// ============================================================
// TEST API KEY FUNCTION
// ============================================================
async function testApiKey(provider, keyId, btn) {
    const key = aiPowerHub.keyManager.keys[provider]?.find(k => k.id === keyId);
    if (!key) {
        showNotification('Không tìm thấy key', 'error');
        return;
    }

    const originalText = btn.textContent;
    btn.textContent = '⏳';
    btn.disabled = true;

    try {
        let result;
        const testPrompt = 'Say "Hello! API is working!" in 5 words or less.';
        const options = { maxTokens: 50, temperature: 0.1 };

        switch (provider) {
            case 'groq':
                result = await callGroq(key.key, testPrompt, options);
                break;
            case 'gemini':
                result = await callGemini(key.key, testPrompt, options);
                break;
            default:
                throw new Error('Provider không được hỗ trợ');
        }

        if (result.content) {
            showNotification(`✅ ${PROVIDERS[provider].name} hoạt động! Response: "${result.content.substring(0, 50)}..."`, 'success');
            btn.textContent = '✅';
            key.status = 'active';
            key.errorCount = 0;
        } else {
            throw new Error('Không có response');
        }
    } catch (error) {
        console.error('Test API failed:', error);
        showNotification(`❌ ${PROVIDERS[provider].name} lỗi: ${error.message}`, 'error');
        btn.textContent = '❌';
        key.errorCount = (key.errorCount || 0) + 1;
        if (error.message.includes('429') || error.message.toLowerCase().includes('rate')) {
            key.status = 'rate_limited';
        }
    }

    aiPowerHub.keyManager.saveKeys();

    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    }, 2000);
}

// ============================================================
// TEST ALL KEYS - Chạy thử tất cả keys
// ============================================================
async function testAllKeys() {
    const btn = document.getElementById('btn-test-all-keys');
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Đang test...';
    btn.disabled = true;

    let totalKeys = 0;
    let successKeys = 0;
    let failedKeys = 0;
    const results = [];

    // Lấy tất cả keys
    for (const [provider, keys] of Object.entries(aiPowerHub.keyManager.keys)) {
        for (const key of keys) {
            totalKeys++;
            const testPrompt = 'Reply with: OK';
            const options = { maxTokens: 20, temperature: 0.1 };

            try {
                let result;
                switch (provider) {
                    case 'groq': result = await callGroq(key.key, testPrompt, options); break;
                    case 'gemini': result = await callGemini(key.key, testPrompt, options); break;
                    default: continue;
                }

                if (result?.content) {
                    successKeys++;
                    key.status = 'active';
                    key.lastError = null;
                    results.push({ provider, name: key.name, success: true });
                } else {
                    throw new Error('No response');
                }
            } catch (error) {
                failedKeys++;
                key.status = 'error';
                key.lastError = error.message.substring(0, 50);
                results.push({ provider, name: key.name, success: false, error: error.message });
            }
        }
    }

    aiPowerHub.keyManager.saveKeys();
    renderPowerHubDashboard();

    // Hiển thị kết quả
    if (totalKeys === 0) {
        showNotification('Chưa có API key nào để test!', 'error');
    } else {
        showNotification(`✅ Test xong: ${successKeys}/${totalKeys} keys hoạt động, ${failedKeys} lỗi`, successKeys > 0 ? 'success' : 'error');
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// ============================================================
// EDIT KEY MODAL
// ============================================================
function showEditKeyModal(provider, keyId) {
    const key = aiPowerHub.keyManager.keys[provider]?.find(k => k.id === keyId);
    if (!key) {
        showNotification('Không tìm thấy key', 'error');
        return;
    }

    const providerConfig = PROVIDERS[provider];
    const modal = document.createElement('div');
    modal.className = 'power-hub-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content" style="z-index: 10001;">
            <h3>${providerConfig.icon} Sửa ${providerConfig.name} API Key</h3>
            <div class="form-group">
                <label>Tên Key</label>
                <input type="text" id="edit-key-name" value="${key.name || ''}" placeholder="VD: Account 1">
            </div>
            <div class="form-group">
                <label>API Key</label>
                <input type="text" id="edit-key-value" value="${key.key}" style="font-family: monospace;">
            </div>
            ${key.lastError ? `
                <div style="background: #fee2e2; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <strong style="color: #dc2626;">⚠️ Lỗi gần nhất:</strong>
                    <p style="margin: 5px 0 0; color: #dc2626; font-size: 0.9rem;">${key.lastError}</p>
                </div>
            ` : ''}
            <div style="background: #f0f9ff; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                <small style="color: #0369a1;">
                    📊 Status: ${key.status} | Requests: ${key.requestCount || 0}
                </small>
            </div>
            <div class="modal-actions">
                <button class="btn-cancel">Hủy</button>
                <button class="btn-save" style="background: linear-gradient(135deg, #22c55e, #16a34a);">💾 Lưu</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-save').addEventListener('click', () => {
        const newName = document.getElementById('edit-key-name').value.trim();
        const newKey = document.getElementById('edit-key-value').value.trim();

        if (!newKey) {
            showNotification('Vui lòng nhập API key', 'error');
            return;
        }

        // Cập nhật key
        key.name = newName || `Key ${Date.now()}`;
        key.key = newKey;
        key.status = 'active'; // Reset status
        key.lastError = null;

        aiPowerHub.keyManager.saveKeys();
        modal.remove();
        renderPowerHubDashboard();
        showNotification(`Đã cập nhật ${providerConfig.name} API key`, 'success');
    });
}

function showAddKeyModal(provider) {
    const providerConfig = PROVIDERS[provider];
    const currentKeys = aiPowerHub.keyManager.keys[provider]?.length || 0;
    const remaining = MAX_KEYS_PER_PROVIDER - currentKeys;

    const modal = document.createElement('div');
    modal.className = 'power-hub-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <h3>${providerConfig.icon} Thêm ${providerConfig.name} API Key</h3>
            <p style="color: #888; font-size: 0.9rem; margin-bottom: 15px;">
                ${providerConfig.description} • Keys: ${currentKeys}/${MAX_KEYS_PER_PROVIDER} (còn ${remaining})
            </p>
            <div class="form-group">
                <label>Tên Key (tùy chọn)</label>
                <input type="text" id="key-name" placeholder="VD: Account 1, Email chính...">
            </div>
            <div class="form-group">
                <label>API Key</label>
                <input type="text" id="key-value" placeholder="Paste API key here..." style="font-family: monospace;">
            </div>
            <div class="modal-actions">
                <button class="btn-cancel">Hủy</button>
                <button class="btn-save" ${remaining <= 0 ? 'disabled style="opacity:0.5"' : ''}>
                    ${remaining > 0 ? 'Lưu' : 'Đã đạt giới hạn'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-save').addEventListener('click', () => {
        if (remaining <= 0) return;

        const name = document.getElementById('key-name').value;
        const key = document.getElementById('key-value').value.trim();

        if (!key) {
            showNotification('Vui lòng nhập API key', 'error');
            return;
        }

        const result = aiPowerHub.addKey(provider, key, name);

        if (result.error) {
            showNotification(result.error, 'error');
            return;
        }

        modal.remove();
        renderPowerHubDashboard();
        showNotification(`Đã thêm ${providerConfig.name} API key`, 'success');
    });
}

// ============================================================
// INIT FUNCTION
// ============================================================
export function initAIPowerHub() {
    console.log('✅ AI Power Hub đã sẵn sàng');

    // Render dashboard ngay lập tức
    renderPowerHubDashboard();

    // Lắng nghe khi user click vào menu AI Power Hub
    const menuBtn = document.querySelector('[data-target="ai-power-hub"]');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            setTimeout(() => {
                renderPowerHubDashboard();
            }, 100);
        });
    }

    // Lắng nghe sự kiện navigation change (nếu có)
    document.addEventListener('sectionChange', (e) => {
        if (e.detail === 'ai-power-hub') {
            renderPowerHubDashboard();
        }
    });
}

// Export
export { PROVIDERS, KeyManager, SmartRouter, MAX_KEYS_PER_PROVIDER };
