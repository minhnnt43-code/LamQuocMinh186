/**
 * ============================================================
 * CONVERSATIONAL TASK - LifeOS 2026
 * ============================================================
 * Feature #10: Conversational Task Creation
 * - Multi-turn dialogue để tạo task chi tiết
 * - Context-aware follow-up questions
 * ============================================================
 */

const ConversationalTask = (function () {
    'use strict';

    // ========== STATE ==========
    let conversationState = null;

    // ========== CONVERSATION FLOW ==========

    const FIELDS = ['name', 'dueDate', 'priority', 'category', 'subtasks', 'notes'];

    const PROMPTS = {
        name: {
            question: '📝 Bạn muốn làm gì?',
            placeholder: 'Mô tả công việc...',
            required: true
        },
        dueDate: {
            question: '📅 Khi nào cần hoàn thành?',
            placeholder: 'VD: thứ 5 tuần sau, cuối tháng...',
            required: false,
            suggestions: ['Hôm nay', 'Ngày mai', 'Cuối tuần', 'Cuối tháng', 'Không có deadline']
        },
        priority: {
            question: '🎯 Mức độ quan trọng?',
            placeholder: 'Chọn một...',
            required: false,
            suggestions: ['🔥 Cao - Rất quan trọng', '⭐ Trung bình', '💤 Thấp - Từ từ làm']
        },
        category: {
            question: '📁 Phân loại vào đâu?',
            placeholder: 'Chọn hoặc nhập mới...',
            required: false,
            suggestions: ['Công việc', 'Học tập', 'Cá nhân', 'Sức khỏe', 'Tài chính']
        },
        subtasks: {
            question: '✂️ Có muốn chia nhỏ thành các bước không?',
            placeholder: 'Mỗi dòng là một bước...',
            required: false,
            suggestions: ['Có, chia nhỏ giúp tôi', 'Không cần', 'AI đề xuất']
        },
        notes: {
            question: '📝 Ghi chú thêm?',
            placeholder: 'Thông tin bổ sung...',
            required: false,
            suggestions: ['Bỏ qua']
        }
    };

    // ========== CONVERSATION MANAGEMENT ==========

    /**
     * Bắt đầu cuộc hội thoại tạo task mới
     * @returns {Object} First question
     */
    function start() {
        conversationState = {
            currentField: 'name',
            fieldIndex: 0,
            task: {
                id: 'task_' + Date.now(),
                createdAt: new Date().toISOString(),
                status: 'pending'
            },
            history: [],
            isComplete: false
        };

        return getNextQuestion();
    }

    /**
     * Xử lý input từ user
     * @param {string} userInput - Input của user
     * @returns {Object} Response với câu hỏi tiếp theo hoặc kết quả
     */
    function processInput(userInput) {
        if (!conversationState) {
            return start();
        }

        const input = (userInput || '').trim();
        const currentField = conversationState.currentField;

        // Add to history
        conversationState.history.push({
            field: currentField,
            input: input,
            timestamp: new Date().toISOString()
        });

        // Process based on current field
        const processed = processFieldInput(currentField, input);

        // Update task
        if (processed.value !== null && processed.value !== undefined) {
            conversationState.task[currentField] = processed.value;
        }

        // Move to next field or complete
        if (processed.skip || processed.value !== null) {
            conversationState.fieldIndex++;

            if (conversationState.fieldIndex >= FIELDS.length) {
                // Conversation complete
                conversationState.isComplete = true;
                return complete();
            }

            conversationState.currentField = FIELDS[conversationState.fieldIndex];

            // Skip fields that are already filled (from AI detection)
            while (shouldSkipField(conversationState.currentField)) {
                conversationState.fieldIndex++;
                if (conversationState.fieldIndex >= FIELDS.length) {
                    conversationState.isComplete = true;
                    return complete();
                }
                conversationState.currentField = FIELDS[conversationState.fieldIndex];
            }
        }

        return getNextQuestion();
    }

    /**
     * Xử lý input cho từng field
     */
    function processFieldInput(field, input) {
        const result = { value: null, skip: false };

        if (!input || input.toLowerCase() === 'bỏ qua' || input.toLowerCase() === 'skip') {
            result.skip = true;
            return result;
        }

        switch (field) {
            case 'name':
                // Use AI processing if available
                if (window.AIPhase1 && window.AIPhase1.isReady) {
                    const aiResult = window.AIPhase1.processTaskInput(input);
                    result.value = aiResult.task.name;

                    // Pre-fill other fields from AI
                    if (aiResult.task.dueDate) {
                        conversationState.task.dueDate = aiResult.task.dueDate;
                    }
                    if (aiResult.task.priority) {
                        conversationState.task.priority = aiResult.task.priority;
                    }
                    if (aiResult.task.category) {
                        conversationState.task.category = aiResult.task.category;
                    }
                    if (aiResult.task.tags) {
                        conversationState.task.tags = aiResult.task.tags;
                    }
                } else {
                    result.value = input;
                }
                break;

            case 'dueDate':
                if (input.toLowerCase() === 'không có deadline' ||
                    input.toLowerCase() === 'không') {
                    result.value = null;
                    result.skip = true;
                } else if (window.DateParser) {
                    const parsed = window.DateParser.parse(input);
                    if (parsed && parsed.date) {
                        const yyyy = parsed.date.getFullYear();
                        const mm = String(parsed.date.getMonth() + 1).padStart(2, '0');
                        const dd = String(parsed.date.getDate()).padStart(2, '0');
                        result.value = `${yyyy}-${mm}-${dd}`;
                    } else {
                        result.value = input;
                    }
                } else {
                    result.value = input;
                }
                break;

            case 'priority':
                const priorityMap = {
                    'cao': 'high', 'high': 'high', '🔥': 'high', 'rất quan trọng': 'high',
                    'trung bình': 'medium', 'medium': 'medium', '⭐': 'medium', 'tb': 'medium',
                    'thấp': 'low', 'low': 'low', '💤': 'low', 'từ từ': 'low'
                };

                const lowerInput = input.toLowerCase();
                for (const [key, value] of Object.entries(priorityMap)) {
                    if (lowerInput.includes(key)) {
                        result.value = value;
                        break;
                    }
                }
                if (!result.value) {
                    result.value = 'medium';
                }
                break;

            case 'category':
                const categoryMap = {
                    'công việc': 'work', 'work': 'work', 'việc': 'work',
                    'học': 'study', 'study': 'study', 'học tập': 'study',
                    'cá nhân': 'personal', 'personal': 'personal',
                    'sức khỏe': 'health', 'health': 'health',
                    'tài chính': 'finance', 'finance': 'finance'
                };

                const lowerCat = input.toLowerCase();
                result.value = categoryMap[lowerCat] || input;
                break;

            case 'subtasks':
                if (input.toLowerCase() === 'có' ||
                    input.toLowerCase().includes('chia nhỏ') ||
                    input.toLowerCase().includes('ai đề xuất')) {
                    // Auto-generate subtasks
                    if (window.TaskDecomposition) {
                        const decomposed = window.TaskDecomposition.decompose(conversationState.task);
                        result.value = decomposed.subtasks;
                    } else {
                        result.value = [];
                    }
                } else if (input.toLowerCase() === 'không' ||
                    input.toLowerCase() === 'không cần') {
                    result.value = [];
                    result.skip = true;
                } else {
                    // Parse multiline input as subtasks
                    const lines = input.split('\n').filter(l => l.trim());
                    result.value = lines.map((line, idx) => ({
                        id: 'st_' + Date.now() + idx,
                        name: line.trim(),
                        done: false
                    }));
                }
                break;

            case 'notes':
                result.value = input;
                break;

            default:
                result.value = input;
        }

        return result;
    }

    /**
     * Kiểm tra có nên skip field không
     */
    function shouldSkipField(field) {
        const task = conversationState.task;

        // Skip if already has valid value from AI
        if (field === 'dueDate' && task.dueDate) return true;
        if (field === 'priority' && task.priority) return true;
        if (field === 'category' && task.category) return true;

        return false;
    }

    /**
     * Lấy câu hỏi tiếp theo
     */
    function getNextQuestion() {
        const field = conversationState.currentField;
        const prompt = PROMPTS[field];
        const task = conversationState.task;

        // Personalize question based on task context
        let question = prompt.question;

        if (field === 'subtasks' && task.name) {
            question = `✂️ Task "${task.name}" có muốn chia nhỏ không?`;
        }

        return {
            type: 'question',
            field: field,
            question: question,
            placeholder: prompt.placeholder,
            suggestions: prompt.suggestions || [],
            required: prompt.required,
            currentTask: { ...task },
            progress: {
                current: conversationState.fieldIndex + 1,
                total: FIELDS.length,
                percent: Math.round(((conversationState.fieldIndex) / FIELDS.length) * 100)
            }
        };
    }

    /**
     * Hoàn thành cuộc hội thoại
     */
    function complete() {
        const task = conversationState.task;

        // Final processing
        if (!task.priority) task.priority = 'medium';
        if (!task.subtasks) task.subtasks = [];
        if (!task.tags) task.tags = [];

        // Calculate priority score if available
        if (window.SmartPriority) {
            const scoreResult = window.SmartPriority.calculateScore(task);
            task.priorityScore = scoreResult.score;
        }

        // Add to memory context
        if (window.AIMemory) {
            window.AIMemory.addContext('task_created', {
                id: task.id,
                name: task.name
            });
        }

        const result = {
            type: 'complete',
            task: task,
            summary: generateSummary(task),
            history: conversationState.history
        };

        // Reset state
        conversationState = null;

        return result;
    }

    /**
     * Tạo summary cho task
     */
    function generateSummary(task) {
        const parts = [`📌 **${task.name}**`];

        if (task.dueDate) {
            if (window.DateParser) {
                parts.push(`📅 ${window.DateParser.getRelativeDescription(new Date(task.dueDate))}`);
            } else {
                parts.push(`📅 ${task.dueDate}`);
            }
        }

        const priorityLabels = { high: '🔥 Cao', medium: '⭐ Trung bình', low: '💤 Thấp' };
        parts.push(`🎯 ${priorityLabels[task.priority] || task.priority}`);

        if (task.category) {
            parts.push(`📁 ${task.category}`);
        }

        if (task.subtasks && task.subtasks.length > 0) {
            parts.push(`✂️ ${task.subtasks.length} subtasks`);
        }

        return parts.join('\n');
    }

    /**
     * Hủy cuộc hội thoại
     */
    function cancel() {
        const history = conversationState?.history || [];
        conversationState = null;
        return {
            type: 'cancelled',
            history
        };
    }

    /**
     * Quay lại câu hỏi trước
     */
    function goBack() {
        if (!conversationState || conversationState.fieldIndex === 0) {
            return null;
        }

        conversationState.fieldIndex--;
        conversationState.currentField = FIELDS[conversationState.fieldIndex];

        // Remove last value
        delete conversationState.task[conversationState.currentField];

        return getNextQuestion();
    }

    /**
     * Lấy trạng thái hiện tại
     */
    function getState() {
        if (!conversationState) return null;

        return {
            currentField: conversationState.currentField,
            task: { ...conversationState.task },
            isComplete: conversationState.isComplete,
            progress: {
                current: conversationState.fieldIndex + 1,
                total: FIELDS.length
            }
        };
    }

    // ========== UI HELPER ==========

    /**
     * Render conversation UI
     * @param {HTMLElement} container - Container element
     * @param {Function} onComplete - Callback khi hoàn thành
     */
    function renderUI(container, onComplete) {
        if (!container) return;

        const response = start();

        function render(response) {
            if (response.type === 'complete') {
                container.innerHTML = `
                    <div class="conv-complete">
                        <h3>✅ Đã tạo task!</h3>
                        <div class="conv-summary">${response.summary.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
                if (onComplete) onComplete(response.task);
                return;
            }

            const suggestionsHTML = response.suggestions.length > 0
                ? `<div class="conv-suggestions">${response.suggestions.map(s =>
                    `<button class="conv-suggest-btn" data-value="${s}">${s}</button>`
                ).join('')}</div>`
                : '';

            container.innerHTML = `
                <div class="conv-question">
                    <div class="conv-progress">
                        <div class="conv-progress-bar" style="width: ${response.progress.percent}%"></div>
                    </div>
                    <h3>${response.question}</h3>
                    ${suggestionsHTML}
                    <div class="conv-input-row">
                        <input type="text" class="conv-input" placeholder="${response.placeholder}" autofocus>
                        <button class="conv-submit-btn">→</button>
                    </div>
                    <div class="conv-actions">
                        ${response.progress.current > 1 ? '<button class="conv-back-btn">← Quay lại</button>' : ''}
                        ${!response.required ? '<button class="conv-skip-btn">Bỏ qua</button>' : ''}
                        <button class="conv-cancel-btn">Hủy</button>
                    </div>
                </div>
            `;

            // Event handlers
            const input = container.querySelector('.conv-input');
            const submitBtn = container.querySelector('.conv-submit-btn');

            const submit = () => {
                const nextResponse = processInput(input.value);
                render(nextResponse);
            };

            submitBtn.addEventListener('click', submit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submit();
            });

            container.querySelectorAll('.conv-suggest-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    input.value = btn.dataset.value;
                    submit();
                });
            });

            const skipBtn = container.querySelector('.conv-skip-btn');
            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    const nextResponse = processInput('bỏ qua');
                    render(nextResponse);
                });
            }

            const backBtn = container.querySelector('.conv-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    const prevResponse = goBack();
                    if (prevResponse) render(prevResponse);
                });
            }

            const cancelBtn = container.querySelector('.conv-cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    cancel();
                    container.innerHTML = '<p>Đã hủy tạo task.</p>';
                });
            }
        }

        render(response);
    }

    // ========== PUBLIC API ==========
    return {
        start,
        processInput,
        complete,
        cancel,
        goBack,
        getState,
        renderUI
    };
})();

// Export
if (typeof window !== 'undefined') {
    window.ConversationalTask = ConversationalTask;
}
