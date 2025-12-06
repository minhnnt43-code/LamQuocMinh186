// --- FILE: js/ai-service.js ---
// Dịch vụ AI chính - Singleton pattern

import { AI_CONFIG, getApiKey, getProvider, isApiConfigured } from './ai-config.js';

class AIService {
    constructor() {
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.conversationHistory = [];
        this.isProcessing = false;
    }

    // ============================================================
    // CORE API METHODS
    // ============================================================

    /**
     * Gọi API AI với prompt
     * @param {string} prompt - Câu hỏi/yêu cầu
     * @param {object} options - Tùy chọn bổ sung
     * @returns {Promise<string>} - Câu trả lời từ AI
     */
    async ask(prompt, options = {}) {
        if (!isApiConfigured()) {
            throw new Error('Chưa cấu hình API Key. Vào Cài đặt > AI để thêm key.');
        }

        // Rate limiting
        const now = Date.now();
        if (now - this.lastRequestTime < AI_CONFIG.requestCooldownMs) {
            await this.sleep(AI_CONFIG.requestCooldownMs);
        }

        this.isProcessing = true;
        this.lastRequestTime = Date.now();

        try {
            const provider = getProvider();

            if (provider === 'google') {
                return await this.callGoogleAI(prompt, options);
            } else if (provider === 'openai') {
                return await this.callOpenAI(prompt, options);
            } else {
                throw new Error('Provider không hợp lệ');
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Gọi Google AI (Gemini)
     */
    async callGoogleAI(prompt, options = {}) {
        const apiKey = getApiKey('google');
        const model = options.model || AI_CONFIG.googleModel;

        // Dùng v1 thay vì v1beta
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
            throw new Error(error.error?.message || 'Lỗi gọi Google AI API');
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        }

        throw new Error('Không nhận được phản hồi từ AI');
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
            throw new Error(error.error?.message || 'Lỗi gọi OpenAI API');
        }

        const data = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
            return data.choices[0].message.content;
        }

        throw new Error('Không nhận được phản hồi từ AI');
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
     * Reset conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    // ============================================================
    // SPECIALIZED AI METHODS (Sẽ mở rộng trong các Phase sau)
    // ============================================================

    /**
     * Phân tích câu tự nhiên thành dữ liệu có cấu trúc
     * VD: "Họp với thầy thứ 5 lúc 2h chiều" -> { type: 'event', title: 'Họp với thầy', day: 'thursday', time: '14:00' }
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
