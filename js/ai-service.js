// --- FILE: js/ai-service.js ---
// Dịch vụ AI chính - Singleton pattern với Auto-Fallback

import {
    AI_CONFIG,
    getApiKey,
    getProvider,
    isApiConfigured,
    getNextFallbackProvider,
    isFallbackEnabled,
    SUPPORTED_PROVIDERS
} from './ai-config.js';

class AIService {
    constructor() {
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.conversationHistory = [];
        this.isProcessing = false;
        this.lastUsedProvider = null;
        this.failedProviders = new Set();

        // Token tracking system (#51)
        this.tokenStats = this.loadTokenStats();
    }

    // ============================================================
    // TOKEN TRACKING SYSTEM (#51, #52)
    // ============================================================

    /**
     * Load token stats từ localStorage
     */
    loadTokenStats() {
        const saved = localStorage.getItem('ai_token_stats');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Lỗi load token stats');
            }
        }
        return this.getDefaultTokenStats();
    }

    /**
     * Default token stats structure
     */
    getDefaultTokenStats() {
        return {
            total: 0,
            today: { date: new Date().toDateString(), tokens: 0, requests: 0 },
            byProvider: {
                groq: { tokens: 0, requests: 0, errors: 0 },
                deepseek: { tokens: 0, requests: 0, errors: 0 },
                google: { tokens: 0, requests: 0, errors: 0 },
                openai: { tokens: 0, requests: 0, errors: 0 }
            },
            history: [] // Last 30 days
        };
    }

    /**
     * Lưu token stats
     */
    saveTokenStats() {
        localStorage.setItem('ai_token_stats', JSON.stringify(this.tokenStats));
    }

    /**
     * Ước tính số tokens từ text (rough estimate)
     * ~4 chars = 1 token cho tiếng Anh, ~2-3 chars cho tiếng Việt
     */
    estimateTokens(text) {
        if (!text) return 0;
        // Tiếng Việt có dấu nên cần ít chars hơn per token
        return Math.ceil(text.length / 3);
    }

    /**
     * Ghi nhận token usage
     */
    recordTokenUsage(provider, inputText, outputText, success = true) {
        const inputTokens = this.estimateTokens(inputText);
        const outputTokens = this.estimateTokens(outputText);
        const totalTokens = inputTokens + outputTokens;

        // Reset daily stats nếu sang ngày mới
        const today = new Date().toDateString();
        if (this.tokenStats.today.date !== today) {
            // Lưu ngày cũ vào history
            if (this.tokenStats.today.tokens > 0) {
                this.tokenStats.history.unshift({
                    date: this.tokenStats.today.date,
                    tokens: this.tokenStats.today.tokens,
                    requests: this.tokenStats.today.requests
                });
                // Giữ 30 ngày gần nhất
                if (this.tokenStats.history.length > 30) {
                    this.tokenStats.history.pop();
                }
            }
            this.tokenStats.today = { date: today, tokens: 0, requests: 0 };
        }

        // Cập nhật stats
        this.tokenStats.total += totalTokens;
        this.tokenStats.today.tokens += totalTokens;
        this.tokenStats.today.requests += 1;

        if (this.tokenStats.byProvider[provider]) {
            this.tokenStats.byProvider[provider].tokens += totalTokens;
            this.tokenStats.byProvider[provider].requests += 1;
            if (!success) {
                this.tokenStats.byProvider[provider].errors += 1;
            }
        }

        this.saveTokenStats();

        return { inputTokens, outputTokens, totalTokens };
    }

    /**
     * Lấy thống kê tokens
     */
    getTokenStats() {
        // Đảm bảo today stats hợp lệ
        const today = new Date().toDateString();
        if (this.tokenStats.today.date !== today) {
            if (this.tokenStats.today.tokens > 0) {
                this.tokenStats.history.unshift({
                    date: this.tokenStats.today.date,
                    tokens: this.tokenStats.today.tokens,
                    requests: this.tokenStats.today.requests
                });
            }
            this.tokenStats.today = { date: today, tokens: 0, requests: 0 };
        }

        // Tính tuần và tháng
        const weekTokens = this.tokenStats.history
            .slice(0, 7)
            .reduce((sum, d) => sum + d.tokens, this.tokenStats.today.tokens);
        const monthTokens = this.tokenStats.history
            .slice(0, 30)
            .reduce((sum, d) => sum + d.tokens, this.tokenStats.today.tokens);

        return {
            total: this.tokenStats.total,
            today: this.tokenStats.today.tokens,
            todayRequests: this.tokenStats.today.requests,
            week: weekTokens,
            month: monthTokens,
            byProvider: this.tokenStats.byProvider,
            history: this.tokenStats.history
        };
    }

    /**
     * Reset token stats
     */
    resetTokenStats() {
        this.tokenStats = this.getDefaultTokenStats();
        this.saveTokenStats();
    }

    // ============================================================
    // CORE API METHODS
    // ============================================================

    /**
     * Gọi API AI với prompt - Có auto-fallback
     * @param {string} prompt - Câu hỏi/yêu cầu
     * @param {object} options - Tùy chọn bổ sung
     * @returns {Promise<string>} - Câu trả lời từ AI
     */
    async ask(prompt, options = {}) {
        const startProvider = options.forceProvider || getProvider();

        if (!isApiConfigured(startProvider)) {
            // Nếu provider chính chưa config, thử tìm fallback
            if (isFallbackEnabled()) {
                const fallbackProvider = getNextFallbackProvider(startProvider);
                if (fallbackProvider) {
                    console.log(`[AI] Provider ${startProvider} chưa config, dùng ${fallbackProvider}`);
                    return this.callWithFallback(prompt, options, fallbackProvider);
                }
            }
            throw new Error('Chưa cấu hình API Key. Vào Cài đặt > AI để thêm key.');
        }

        return this.callWithFallback(prompt, options, startProvider);
    }

    /**
     * Gọi API với fallback logic
     */
    async callWithFallback(prompt, options, provider) {
        // Rate limiting
        const now = Date.now();
        if (now - this.lastRequestTime < AI_CONFIG.requestCooldownMs) {
            await this.sleep(AI_CONFIG.requestCooldownMs);
        }

        this.isProcessing = true;
        this.lastRequestTime = Date.now();

        try {
            const result = await this.callProvider(provider, prompt, options);
            this.lastUsedProvider = provider;
            this.failedProviders.delete(provider);

            // Ghi nhận token usage (#51)
            const tokenInfo = this.recordTokenUsage(provider, prompt, result, true);
            console.log(`[AI] ${provider}: ~${tokenInfo.totalTokens} tokens`);

            return result;
        } catch (error) {
            console.error(`[AI] Lỗi từ ${provider}:`, error.message);

            // Thử fallback nếu được bật
            if (isFallbackEnabled() && !options.noFallback) {
                this.failedProviders.add(provider);
                const nextProvider = getNextFallbackProvider(provider);

                if (nextProvider && !this.failedProviders.has(nextProvider)) {
                    console.log(`[AI] Fallback từ ${provider} → ${nextProvider}`);
                    return this.callWithFallback(prompt, options, nextProvider);
                }
            }

            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Gọi provider cụ thể
     */
    async callProvider(provider, prompt, options) {
        switch (provider) {
            case 'groq':
                return await this.callGroq(prompt, options);
            case 'deepseek':
                return await this.callDeepSeek(prompt, options);
            case 'google':
                return await this.callGoogleAI(prompt, options);
            case 'openai':
                return await this.callOpenAI(prompt, options);
            default:
                throw new Error(`Provider không hợp lệ: ${provider}`);
        }
    }

    // ============================================================
    // PROVIDER-SPECIFIC METHODS
    // ============================================================

    /**
     * Gọi Groq API (Miễn phí - Llama 3.3)
     */
    async callGroq(prompt, options = {}) {
        const apiKey = getApiKey('groq');
        const model = options.model || AI_CONFIG.groqModel;

        const systemPrompt = options.systemPrompt ||
            'Bạn là trợ lý AI thông minh, hữu ích, chuyên nghiệp. Trả lời ngắn gọn, rõ ràng bằng tiếng Việt.';

        const body = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            max_tokens: options.maxTokens || AI_CONFIG.maxTokens,
            temperature: options.temperature || AI_CONFIG.temperature
        };

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            const errorMsg = error.error?.message || 'Lỗi gọi Groq API';

            // Check rate limit
            if (response.status === 429) {
                throw new Error(`[RATE_LIMIT] ${errorMsg}`);
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
            return data.choices[0].message.content;
        }

        throw new Error('Không nhận được phản hồi từ Groq');
    }

    /**
     * Gọi DeepSeek API (Gần miễn phí)
     */
    async callDeepSeek(prompt, options = {}) {
        let apiKey = getApiKey('deepseek');
        // Làm sạch API key - loại bỏ ký tự không hợp lệ trong HTTP headers
        apiKey = apiKey.replace(/[^\x00-\x7F]/g, '').trim();
        const model = options.model || AI_CONFIG.deepseekModel;

        const systemPrompt = options.systemPrompt ||
            'Bạn là trợ lý AI thông minh, hữu ích, chuyên nghiệp. Trả lời ngắn gọn, rõ ràng bằng tiếng Việt.';

        const body = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            max_tokens: options.maxTokens || AI_CONFIG.maxTokens,
            temperature: options.temperature || AI_CONFIG.temperature
        };

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            const errorMsg = error.error?.message || 'Lỗi gọi DeepSeek API';

            if (response.status === 429) {
                throw new Error(`[RATE_LIMIT] ${errorMsg}`);
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
            return data.choices[0].message.content;
        }

        throw new Error('Không nhận được phản hồi từ DeepSeek');
    }

    /**
     * Gọi Google AI (Gemini)
     */
    async callGoogleAI(prompt, options = {}) {
        const apiKey = getApiKey('google');
        const model = options.model || AI_CONFIG.googleModel;

        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

        const systemPrompt = options.systemPrompt ||
            'Bạn là trợ lý AI thông minh, hữu ích, chuyên nghiệp. Trả lời ngắn gọn, rõ ràng bằng tiếng Việt.';

        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
                }
            ],
            generationConfig: {
                maxOutputTokens: options.maxTokens || AI_CONFIG.maxTokens,
                temperature: options.temperature || AI_CONFIG.temperature
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            const errorMsg = error.error?.message || 'Lỗi gọi Google AI API';

            if (response.status === 429) {
                throw new Error(`[RATE_LIMIT] ${errorMsg}`);
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        }

        throw new Error('Không nhận được phản hồi từ Google AI');
    }

    /**
     * Gọi OpenAI
     */
    async callOpenAI(prompt, options = {}) {
        const apiKey = getApiKey('openai');
        const model = options.model || AI_CONFIG.openaiModel;

        const systemPrompt = options.systemPrompt ||
            'Bạn là trợ lý AI thông minh, hữu ích, chuyên nghiệp. Trả lời ngắn gọn, rõ ràng bằng tiếng Việt.';

        const body = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            max_tokens: options.maxTokens || AI_CONFIG.maxTokens,
            temperature: options.temperature || AI_CONFIG.temperature
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            const errorMsg = error.error?.message || 'Lỗi gọi OpenAI API';

            if (response.status === 429) {
                throw new Error(`[RATE_LIMIT] ${errorMsg}`);
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
            return data.choices[0].message.content;
        }

        throw new Error('Không nhận được phản hồi từ OpenAI');
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Kiểm tra xem AI có đang xử lý không
     */
    isBusy() {
        return this.isProcessing;
    }

    /**
     * Lấy provider đã dùng lần cuối
     */
    getLastUsedProvider() {
        return this.lastUsedProvider;
    }

    /**
     * Lấy thông tin provider
     */
    getProviderInfo(provider) {
        return SUPPORTED_PROVIDERS[provider] || null;
    }

    /**
     * Reset failed providers (gọi khi user thử lại)
     */
    resetFailedProviders() {
        this.failedProviders.clear();
    }

    /**
     * Reset conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    // ============================================================
    // SPECIALIZED AI METHODS
    // ============================================================

    /**
     * Phân tích câu tự nhiên thành dữ liệu có cấu trúc
     */
    async parseNaturalLanguage(text, context = 'task') {
        const systemPrompt = `Bạn là parser chuyên phân tích câu tiếng Việt thành JSON.
Chỉ trả về JSON thuần, không giải thích.
Context: ${context}

Nếu context là 'task':
- Trả về: { "type": "task", "name": "tên task", "dueDate": "YYYY-MM-DD", "priority": "high/medium/low", "time": "HH:mm" (nếu có) }

Nếu context là 'event':
- Trả về: { "type": "event", "title": "tên sự kiện", "date": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm" }

Nếu không hiểu, trả về: { "type": "unknown", "raw": "câu gốc" }`;

        try {
            const response = await this.ask(text, { systemPrompt, temperature: 0.3 });

            // Trích xuất JSON từ response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { type: 'unknown', raw: text };
        } catch (e) {
            console.error('Parse error:', e);
            return { type: 'unknown', raw: text, error: e.message };
        }
    }

    /**
     * Tóm tắt văn bản
     */
    async summarize(text, maxLength = 200) {
        const systemPrompt = `Tóm tắt văn bản sau trong tối đa ${maxLength} ký tự. Giữ các ý chính.`;
        return await this.ask(text, { systemPrompt });
    }

    /**
     * Gợi ý tiêu đề
     */
    async suggestTitle(content) {
        const systemPrompt = 'Đề xuất 3 tiêu đề ngắn gọn, hấp dẫn cho nội dung sau. Trả về dạng danh sách đánh số.';
        return await this.ask(content, { systemPrompt });
    }

    /**
     * Sửa lỗi ngữ pháp và cải thiện văn phong
     */
    async improveWriting(text, style = 'formal') {
        const systemPrompt = `Sửa lỗi ngữ pháp và cải thiện văn phong theo style: ${style}. 
Giữ nguyên ý nghĩa. Trả về văn bản đã sửa, không giải thích.`;
        return await this.ask(text, { systemPrompt });
    }

    /**
     * Giải thích khái niệm (cho học tập)
     */
    async explainConcept(concept, level = 'simple') {
        const systemPrompt = `Giải thích khái niệm "${concept}" một cách ${level === 'simple' ? 'đơn giản, dễ hiểu' : 'chi tiết, chuyên sâu'}.
Dùng ví dụ minh họa nếu cần.`;
        return await this.ask(concept, { systemPrompt });
    }

    /**
     * Tạo câu hỏi ôn tập từ nội dung
     */
    async generateQuiz(content, count = 5) {
        const systemPrompt = `Tạo ${count} câu hỏi trắc nghiệm từ nội dung sau.
Format mỗi câu:
Q: [câu hỏi]
A) [đáp án 1]
B) [đáp án 2]
C) [đáp án 3]
D) [đáp án 4]
Đáp án đúng: [A/B/C/D]
---`;
        return await this.ask(content, { systemPrompt });
    }

    /**
     * Phân tích ưu tiên task
     */
    async prioritizeTasks(tasks) {
        const systemPrompt = `Phân tích và đề xuất thứ tự ưu tiên cho các công việc sau.
Xem xét: deadline, độ quan trọng, dependencies.
Trả về danh sách đã sắp xếp với lý do ngắn gọn.`;

        const taskList = tasks.map((t, i) => `${i + 1}. ${t.name} - Deadline: ${t.dueDate || 'Không có'} - Ưu tiên hiện tại: ${t.priority}`).join('\n');
        return await this.ask(taskList, { systemPrompt });
    }
}

// Export singleton instance
export const aiService = new AIService();

// Export class cho testing
export { AIService };
