// ============================================================
// FILE: js/smart-ai-hub.js
// Các tính năng thông minh cho AI Power Hub (6 nâng cấp)
// ============================================================

import { showNotification, generateID } from './common.js';

// ============================================================
// #39 AUTO KEY ROTATION
// ============================================================
class KeyRotationManager {
    constructor() {
        this.failedKeys = new Set();
        this.keyUsageCount = {};
        this.lastRotation = null;
    }

    markKeyFailed(keyId) {
        this.failedKeys.add(keyId);
        console.log(`🔄 Key ${keyId} marked as failed, will rotate to next key`);
    }

    markKeySuccess(keyId) {
        this.failedKeys.delete(keyId);
        this.keyUsageCount[keyId] = (this.keyUsageCount[keyId] || 0) + 1;
    }

    isKeyAvailable(keyId) {
        return !this.failedKeys.has(keyId);
    }

    selectBestKey(keys, provider) {
        const providerKeys = keys.filter(k => k.provider === provider && this.isKeyAvailable(k.id));

        if (providerKeys.length === 0) {
            // All keys failed, reset and try again
            this.failedKeys.clear();
            console.log('🔄 All keys failed, resetting...');
            return keys.find(k => k.provider === provider);
        }

        // Select least used key for load balancing
        providerKeys.sort((a, b) => {
            const usageA = this.keyUsageCount[a.id] || 0;
            const usageB = this.keyUsageCount[b.id] || 0;
            return usageA - usageB;
        });

        return providerKeys[0];
    }

    resetFailures() {
        this.failedKeys.clear();
        showNotification('🔄 Đã reset trạng thái các API keys', 'info');
    }
}

// ============================================================
// #40 USAGE ANALYTICS
// ============================================================
class UsageAnalytics {
    constructor() {
        this.storageKey = 'ai_usage_analytics';
        this.data = this.load();
    }

    load() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || this.getDefault();
        } catch (e) {
            return this.getDefault();
        }
    }

    getDefault() {
        return {
            totalCalls: 0,
            totalTokens: 0,
            dailyUsage: {},
            providerUsage: {},
            modelUsage: {},
            history: []
        };
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    logCall(provider, model, tokens, success) {
        const today = new Date().toISOString().split('T')[0];

        this.data.totalCalls++;
        this.data.totalTokens += tokens;

        // Daily
        if (!this.data.dailyUsage[today]) {
            this.data.dailyUsage[today] = { calls: 0, tokens: 0 };
        }
        this.data.dailyUsage[today].calls++;
        this.data.dailyUsage[today].tokens += tokens;

        // Provider
        if (!this.data.providerUsage[provider]) {
            this.data.providerUsage[provider] = { calls: 0, tokens: 0 };
        }
        this.data.providerUsage[provider].calls++;
        this.data.providerUsage[provider].tokens += tokens;

        // Model
        if (!this.data.modelUsage[model]) {
            this.data.modelUsage[model] = { calls: 0, tokens: 0 };
        }
        this.data.modelUsage[model].calls++;
        this.data.modelUsage[model].tokens += tokens;

        // History
        this.data.history.push({
            timestamp: new Date().toISOString(),
            provider,
            model,
            tokens,
            success
        });

        // Keep last 500 entries
        if (this.data.history.length > 500) {
            this.data.history = this.data.history.slice(-500);
        }

        this.save();
    }

    getWeeklyData() {
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                dayName: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
                ...this.data.dailyUsage[dateStr] || { calls: 0, tokens: 0 }
            });
        }
        return result;
    }

    render(container) {
        if (!container) return;

        const weeklyData = this.getWeeklyData();
        const maxCalls = Math.max(...weeklyData.map(d => d.calls), 1);

        container.innerHTML = `
            <div class="usage-analytics" style="
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            ">
                <h4 style="margin: 0 0 15px 0;">📊 AI Usage Analytics</h4>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 15px; background: #eff6ff; border-radius: 10px;">
                        <div style="font-size: 1.8rem; font-weight: 700; color: #3b82f6;">${this.data.totalCalls}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">Tổng calls</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #fef3c7; border-radius: 10px;">
                        <div style="font-size: 1.8rem; font-weight: 700; color: #f59e0b;">${Math.round(this.data.totalTokens / 1000)}K</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">Tokens</div>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #dcfce7; border-radius: 10px;">
                        <div style="font-size: 1.8rem; font-weight: 700; color: #10b981;">${Object.keys(this.data.providerUsage).length}</div>
                        <div style="font-size: 0.85rem; color: #6b7280;">Providers</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 10px; font-weight: 600; font-size: 0.9rem;">📈 7 ngày gần nhất:</div>
                <div style="display: flex; justify-content: space-between; height: 80px; align-items: flex-end; gap: 5px;">
                    ${weeklyData.map(d => {
            const height = Math.max((d.calls / maxCalls) * 60, 5);
            return `
                            <div style="flex: 1; text-align: center;">
                                <div style="
                                    height: ${height}px;
                                    background: linear-gradient(180deg, #667eea, #764ba2);
                                    border-radius: 4px;
                                    margin-bottom: 5px;
                                "></div>
                                <div style="font-size: 0.7rem; color: #6b7280;">${d.dayName}</div>
                                <div style="font-size: 0.7rem; color: #374151;">${d.calls}</div>
                            </div>
                        `;
        }).join('')}
                </div>
                
                ${Object.keys(this.data.providerUsage).length > 0 ? `
                    <div style="margin-top: 20px;">
                        <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 10px;">🏢 By Provider:</div>
                        ${Object.entries(this.data.providerUsage).map(([provider, usage]) => `
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-weight: 500;">${provider}</span>
                                <span style="color: #6b7280;">${usage.calls} calls / ${Math.round(usage.tokens / 1000)}K tokens</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// ============================================================
// #41 COST ESTIMATION
// ============================================================
const PRICING = {
    'openai': {
        'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    },
    'anthropic': {
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    },
    'google': {
        'gemini-pro': { input: 0.00025, output: 0.0005 },
        'gemini-1.5-pro': { input: 0.00035, output: 0.0007 }
    }
};

export function estimateCost(provider, model, inputTokens, outputTokens) {
    const pricing = PRICING[provider]?.[model];
    if (!pricing) {
        return { cost: 0, currency: 'USD', note: 'Pricing not available' };
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
        inputCost: inputCost.toFixed(6),
        outputCost: outputCost.toFixed(6),
        totalCost: totalCost.toFixed(6),
        currency: 'USD'
    };
}

export function renderCostEstimator(container, usageData) {
    if (!container) return;

    let totalEstimatedCost = 0;

    Object.entries(usageData.providerUsage || {}).forEach(([provider, usage]) => {
        Object.entries(usageData.modelUsage || {}).forEach(([model, modelUsage]) => {
            const estimate = estimateCost(provider, model, modelUsage.tokens / 2, modelUsage.tokens / 2);
            totalEstimatedCost += parseFloat(estimate.totalCost);
        });
    });

    container.innerHTML = `
        <div class="cost-estimator" style="
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #f59e0b;
        ">
            <h4 style="margin: 0 0 15px 0; color: #92400e;">💰 Chi phí ước tính</h4>
            <div style="font-size: 2rem; font-weight: 700; color: #92400e;">
                $${totalEstimatedCost.toFixed(4)}
            </div>
            <p style="color: #78350f; font-size: 0.85rem; margin: 10px 0 0 0;">
                * Chỉ là ước tính. Bạn đang sử dụng free tier hoặc API keys miễn phí.
            </p>
        </div>
    `;
}

// ============================================================
// #42 PROMPT LIBRARY
// ============================================================
const DEFAULT_PROMPTS = [
    {
        id: 'p1',
        name: 'Tóm tắt văn bản',
        category: 'Văn bản',
        prompt: 'Hãy tóm tắt đoạn văn sau trong 3-5 câu ngắn gọn:\n\n{text}'
    },
    {
        id: 'p2',
        name: 'Viết email chuyên nghiệp',
        category: 'Email',
        prompt: 'Viết email chuyên nghiệp với nội dung sau:\n- Người nhận: {recipient}\n- Chủ đề: {subject}\n- Nội dung chính: {content}'
    },
    {
        id: 'p3',
        name: 'Giải thích code',
        category: 'Lập trình',
        prompt: 'Giải thích đoạn code sau một cách chi tiết, dễ hiểu:\n\n```\n{code}\n```'
    },
    {
        id: 'p4',
        name: 'Brainstorm ý tưởng',
        category: 'Sáng tạo',
        prompt: 'Hãy brainstorm 10 ý tưởng cho chủ đề: {topic}'
    },
    {
        id: 'p5',
        name: 'Dịch sang tiếng Anh',
        category: 'Ngôn ngữ',
        prompt: 'Dịch đoạn văn sau sang tiếng Anh một cách tự nhiên:\n\n{text}'
    },
    {
        id: 'p6',
        name: 'Phân tích SWOT',
        category: 'Business',
        prompt: 'Thực hiện phân tích SWOT cho: {subject}\n\nHãy liệt kê Strengths, Weaknesses, Opportunities, Threats.'
    }
];

class PromptLibrary {
    constructor() {
        this.storageKey = 'ai_prompt_library';
        this.prompts = this.load();
    }

    load() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.storageKey));
            return saved && saved.length > 0 ? saved : [...DEFAULT_PROMPTS];
        } catch (e) {
            return [...DEFAULT_PROMPTS];
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.prompts));
    }

    addPrompt(prompt) {
        prompt.id = generateID('prompt');
        this.prompts.push(prompt);
        this.save();
        return prompt;
    }

    deletePrompt(id) {
        this.prompts = this.prompts.filter(p => p.id !== id);
        this.save();
    }

    getByCategory(category) {
        if (!category) return this.prompts;
        return this.prompts.filter(p => p.category === category);
    }

    getCategories() {
        return [...new Set(this.prompts.map(p => p.category))];
    }

    render(container, onSelect) {
        if (!container) return;

        const categories = this.getCategories();

        container.innerHTML = `
            <div class="prompt-library" style="
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="margin: 0;">📚 Prompt Library</h4>
                    <button id="add-prompt-btn" style="
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.85rem;
                    ">+ Thêm Prompt</button>
                </div>
                
                <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                    <button class="category-filter active" data-category="" style="
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 6px 14px;
                        border-radius: 20px;
                        cursor: pointer;
                        font-size: 0.85rem;
                    ">Tất cả</button>
                    ${categories.map(c => `
                        <button class="category-filter" data-category="${c}" style="
                            background: #f3f4f6;
                            color: #374151;
                            border: none;
                            padding: 6px 14px;
                            border-radius: 20px;
                            cursor: pointer;
                            font-size: 0.85rem;
                        ">${c}</button>
                    `).join('')}
                </div>
                
                <div id="prompts-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto;">
                    ${this.prompts.map(p => `
                        <div class="prompt-item" data-id="${p.id}" style="
                            padding: 12px;
                            background: #f9fafb;
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600;">${p.name}</span>
                                <span style="font-size: 0.75rem; background: #e5e7eb; padding: 2px 8px; border-radius: 10px;">${p.category}</span>
                            </div>
                            <div style="font-size: 0.85rem; color: #6b7280; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${p.prompt.substring(0, 60)}...
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Filter handlers
        container.querySelectorAll('.category-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.category-filter').forEach(b => {
                    b.style.background = '#f3f4f6';
                    b.style.color = '#374151';
                });
                btn.style.background = '#667eea';
                btn.style.color = 'white';

                const category = btn.dataset.category;
                this.renderPromptsList(container.querySelector('#prompts-list'), category, onSelect);
            });
        });

        // Prompt selection handlers
        container.querySelectorAll('.prompt-item').forEach(item => {
            item.addEventListener('click', () => {
                const prompt = this.prompts.find(p => p.id === item.dataset.id);
                if (prompt && onSelect) onSelect(prompt);
            });

            item.addEventListener('mouseenter', () => item.style.background = '#e5e7eb');
            item.addEventListener('mouseleave', () => item.style.background = '#f9fafb');
        });

        // Add prompt handler
        document.getElementById('add-prompt-btn')?.addEventListener('click', () => {
            this.showAddPromptModal(container, onSelect);
        });
    }

    renderPromptsList(container, category, onSelect) {
        const prompts = this.getByCategory(category);

        container.innerHTML = prompts.map(p => `
            <div class="prompt-item" data-id="${p.id}" style="
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600;">${p.name}</span>
                    <span style="font-size: 0.75rem; background: #e5e7eb; padding: 2px 8px; border-radius: 10px;">${p.category}</span>
                </div>
                <div style="font-size: 0.85rem; color: #6b7280; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${p.prompt.substring(0, 60)}...
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.prompt-item').forEach(item => {
            item.addEventListener('click', () => {
                const prompt = this.prompts.find(p => p.id === item.dataset.id);
                if (prompt && onSelect) onSelect(prompt);
            });
        });
    }

    showAddPromptModal(container, onSelect) {
        const modal = document.createElement('div');
        modal.id = 'add-prompt-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    width: 90%;
                    max-width: 500px;
                ">
                    <h3 style="margin: 0 0 20px 0;">➕ Thêm Prompt mới</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Tên prompt:</label>
                        <input type="text" id="new-prompt-name" placeholder="VD: Viết tweet" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                        ">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Danh mục:</label>
                        <input type="text" id="new-prompt-category" placeholder="VD: Social Media" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                        ">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Nội dung prompt:</label>
                        <textarea id="new-prompt-content" rows="5" placeholder="VD: Viết một tweet hấp dẫn về {topic}" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                            resize: vertical;
                        "></textarea>
                        <small style="color: #6b7280;">Dùng {placeholder} cho các biến</small>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancel-add-prompt" style="
                            background: #f3f4f6;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                        ">Hủy</button>
                        <button id="save-new-prompt" style="
                            background: #667eea;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                        ">Lưu</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('cancel-add-prompt')?.addEventListener('click', () => modal.remove());
        document.getElementById('save-new-prompt')?.addEventListener('click', () => {
            const name = document.getElementById('new-prompt-name').value.trim();
            const category = document.getElementById('new-prompt-category').value.trim();
            const prompt = document.getElementById('new-prompt-content').value.trim();

            if (name && category && prompt) {
                this.addPrompt({ name, category, prompt });
                modal.remove();
                this.render(container, onSelect);
                showNotification('✅ Đã lưu prompt mới', 'success');
            } else {
                showNotification('Vui lòng điền đầy đủ thông tin', 'error');
            }
        });
    }
}

// ============================================================
// #43 RESPONSE HISTORY
// ============================================================
class ResponseHistory {
    constructor() {
        this.storageKey = 'ai_response_history';
        this.history = this.load();
    }

    load() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || [];
        } catch (e) {
            return [];
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    }

    addEntry(prompt, response, provider, model) {
        this.history.unshift({
            id: generateID('hist'),
            timestamp: new Date().toISOString(),
            prompt: prompt.substring(0, 500),
            response: response.substring(0, 2000),
            provider,
            model
        });

        // Keep last 100 entries
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }

        this.save();
    }

    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.history.filter(h =>
            h.prompt.toLowerCase().includes(lowerQuery) ||
            h.response.toLowerCase().includes(lowerQuery)
        );
    }

    render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="response-history" style="
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            ">
                <h4 style="margin: 0 0 15px 0;">📜 Lịch sử hỏi-đáp</h4>
                
                <div style="margin-bottom: 15px;">
                    <input type="text" id="history-search" placeholder="🔍 Tìm kiếm..." style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                    ">
                </div>
                
                <div id="history-list" style="max-height: 400px; overflow-y: auto;">
                    ${this.history.length === 0 ?
                '<p style="color: #6b7280; text-align: center;">Chưa có lịch sử</p>' :
                this.history.slice(0, 20).map(h => `
                            <div class="history-item" style="
                                padding: 12px;
                                background: #f9fafb;
                                border-radius: 8px;
                                margin-bottom: 10px;
                                cursor: pointer;
                            ">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-size: 0.8rem; color: #6b7280;">
                                        ${new Date(h.timestamp).toLocaleString('vi-VN')}
                                    </span>
                                    <span style="font-size: 0.75rem; background: #e5e7eb; padding: 2px 8px; border-radius: 10px;">
                                        ${h.provider}
                                    </span>
                                </div>
                                <div style="font-weight: 500; margin-bottom: 5px; font-size: 0.9rem;">
                                    Q: ${h.prompt.substring(0, 80)}...
                                </div>
                                <div style="font-size: 0.85rem; color: #6b7280;">
                                    A: ${h.response.substring(0, 100)}...
                                </div>
                            </div>
                        `).join('')
            }
                </div>
            </div>
        `;

        // Search handler
        document.getElementById('history-search')?.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            const results = query ? this.search(query) : this.history.slice(0, 20);

            const listContainer = document.getElementById('history-list');
            if (results.length === 0) {
                listContainer.innerHTML = '<p style="color: #6b7280; text-align: center;">Không tìm thấy kết quả</p>';
            } else {
                listContainer.innerHTML = results.map(h => `
                    <div class="history-item" style="
                        padding: 12px;
                        background: #f9fafb;
                        border-radius: 8px;
                        margin-bottom: 10px;
                    ">
                        <div style="font-weight: 500; margin-bottom: 5px; font-size: 0.9rem;">
                            Q: ${h.prompt.substring(0, 80)}...
                        </div>
                        <div style="font-size: 0.85rem; color: #6b7280;">
                            A: ${h.response.substring(0, 100)}...
                        </div>
                    </div>
                `).join('');
            }
        });
    }
}

// ============================================================
// #44 MODEL COMPARISON
// ============================================================
export async function compareModels(prompt, models, aiPowerHub) {
    const results = [];

    for (const model of models) {
        try {
            const startTime = Date.now();
            const response = await aiPowerHub.call(prompt, {
                preferredProvider: model.provider,
                preferredModel: model.model
            });
            const duration = Date.now() - startTime;

            results.push({
                model: model.name,
                provider: model.provider,
                response: response.content,
                duration,
                tokens: response.tokens || 0,
                success: true
            });
        } catch (error) {
            results.push({
                model: model.name,
                provider: model.provider,
                error: error.message,
                success: false
            });
        }
    }

    return results;
}

export function renderModelComparison(container, results) {
    if (!container || !results.length) return;

    container.innerHTML = `
        <div class="model-comparison" style="
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        ">
            <h4 style="margin: 0 0 20px 0;">⚖️ So sánh Models</h4>
            <div style="display: grid; gap: 15px;">
                ${results.map(r => `
                    <div style="
                        padding: 15px;
                        background: ${r.success ? '#f0fdf4' : '#fef2f2'};
                        border: 1px solid ${r.success ? '#86efac' : '#fecaca'};
                        border-radius: 10px;
                    ">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="font-weight: 600;">${r.model}</span>
                            <span style="font-size: 0.85rem; color: #6b7280;">
                                ${r.success ? `⏱ ${r.duration}ms` : '❌ Failed'}
                            </span>
                        </div>
                        ${r.success ? `
                            <div style="
                                background: white;
                                padding: 10px;
                                border-radius: 6px;
                                font-size: 0.9rem;
                                max-height: 150px;
                                overflow-y: auto;
                            ">${r.response.substring(0, 300)}...</div>
                        ` : `
                            <div style="color: #dc2626; font-size: 0.9rem;">${r.error}</div>
                        `}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================================
// EXPORTS
// ============================================================
export const keyRotationManager = new KeyRotationManager();
export const usageAnalytics = new UsageAnalytics();
export const promptLibrary = new PromptLibrary();
export const responseHistory = new ResponseHistory();

// ============================================================
// INIT FUNCTION
// ============================================================
export function initSmartAIHub() {
    console.log('✅ Smart AI Hub initialized');

    // Render usage analytics
    const analyticsContainer = document.getElementById('ai-usage-analytics-widget');
    if (analyticsContainer) {
        usageAnalytics.render(analyticsContainer);
    }

    // Render cost estimator
    const costContainer = document.getElementById('ai-cost-estimator-widget');
    if (costContainer) {
        renderCostEstimator(costContainer, usageAnalytics.data);
    }

    // Render prompt library
    const promptContainer = document.getElementById('ai-prompt-library-widget');
    if (promptContainer) {
        promptLibrary.render(promptContainer, (prompt) => {
            console.log('Selected prompt:', prompt);
            showNotification(`📋 Đã chọn: ${prompt.name}`, 'success');
            // Could copy to clipboard or insert into input
        });
    }

    // Render response history
    const historyContainer = document.getElementById('ai-response-history-widget');
    if (historyContainer) {
        responseHistory.render(historyContainer);
    }
}
